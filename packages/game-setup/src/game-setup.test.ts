import { entityId, hexKey, teamId, terrainTypeId, unitTypeId, validateGameState } from "@TBS/game-core";
import { applyStandardAction } from "@TBS/game-rules";
import { describe, expect, test } from "vitest";

import {
  createDefaultBattlefield,
  createHexMap,
  createInitialGameSetup,
  CURRENT_MAP_SCHEMA_VERSION,
  axialToMapIndex,
  axialToMapOffset,
  exportMapDocument,
  generateHexagonalIndexGrid,
  importMapDocument,
  mapIndexToAxial,
  mapOffsetToAxial,
  MAX_MAP_COLUMNS,
  MAX_SERIALIZED_MAP_BYTES,
  type MapGrid,
  updateMapCell,
  validatePlayableMap,
  validateSaveMapInput,
} from "./index";

const playableMap = (): MapGrid => {
  const map = createHexMap(2, terrainTypeId("plains"));
  map[0][0] = { ...map[0][0], team: teamId("orange"), unit: unitTypeId("soldier") };
  map[2][1] = { ...map[2][1], team: teamId("purple"), unit: unitTypeId("soldier") };
  return map;
};

const rectangularMap = (rows: number, columns: number): MapGrid => {
  let index = 0;
  return Array.from({ length: rows }, (_, row) => Array.from(
    { length: columns },
    (_, column) => ({
      row,
      column,
      index: index++,
      terrain: terrainTypeId("plains"),
      unit: column === 0 && row === 0 ? unitTypeId("soldier") : "none" as const,
      team: column === 0 && row === 0 ? teamId("orange") : "gray" as const,
    }),
  )).map((row, rowIndex) => row.map((cell, columnIndex) => {
    if (rowIndex === 0 && columnIndex === 1) {
      return { ...cell, unit: unitTypeId("soldier"), team: teamId("purple") };
    }
    return cell;
  }));
};

describe("map generation", () => {
  test("preserves the map-document index shape through axial geometry", () => {
    expect(generateHexagonalIndexGrid(5)).toEqual([
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9, 10],
      [11, 12, 13, 14, 15, 16, 17],
      [18, 19, 20, 21, 22, 23, 24, 25],
      [26, 27, 28, 29, 30, 31, 32, 33, 34],
      [35, 36, 37, 38, 39, 40, 41, 42],
      [43, 44, 45, 46, 47, 48, 49],
      [50, 51, 52, 53, 54, 55],
      [56, 57, 58, 59, 60],
    ]);
  });

  test("creates deterministic reciprocal neighbor relationships", () => {
    const map = createHexMap(2, terrainTypeId("forest"));
    expect(map.flat()).toHaveLength(7);
    expect(map[1][1].neighbors).toEqual([0, 1, 2, 4, 5, 6]);
    for (const cell of map.flat()) {
      for (const neighbor of cell.neighbors ?? []) {
        expect(map.flat().find(({ index }) => index === neighbor)?.neighbors)
          .toContain(cell.index);
      }
    }
  });

  test("keeps offset/index conversion at the map-document boundary", () => {
    for (let index = 0; index < 19; index += 1) {
      expect(axialToMapIndex(mapIndexToAxial(index, 3), 3)).toBe(index);
    }
    expect(mapOffsetToAxial(0, 0, 3)).toEqual({ q: 0, r: -2 });
    expect(axialToMapOffset({ q: -2, r: 2 }, 3)).toEqual({ row: 4, column: 0 });
    expect(() => mapOffsetToAxial(0, 3, 3)).toThrow("outside");
  });
});

describe("map documents and setup", () => {
  test("round trips a validated versioned map document", () => {
    const document = {
      schemaVersion: CURRENT_MAP_SCHEMA_VERSION,
      name: "Crossing",
      map: playableMap(),
    };
    expect(importMapDocument(exportMapDocument(document))).toEqual({
      name: document.name,
      map: document.map,
    });
  });

  test("rejects oversized files and structurally oversized maps", () => {
    expect(() => importMapDocument(" ".repeat(MAX_SERIALIZED_MAP_BYTES + 1)))
      .toThrow("the limit is");
    expect(() => validateSaveMapInput({
      name: "Too wide",
      map: rectangularMap(1, MAX_MAP_COLUMNS + 1),
    })).toThrow(`limit is ${MAX_MAP_COLUMNS}`);
  });

  test("requires a movable combat unit for each player team", () => {
    const invalid = playableMap();
    invalid[2][1] = { ...invalid[2][1], team: "gray", unit: "none" };
    expect(() => validatePlayableMap(invalid)).toThrow(
      "movable combat unit for purple",
    );
  });

  test("derives pinned initial state and the capital objective deterministically", () => {
    const map = playableMap();
    map[1][0] = { ...map[1][0], team: teamId("orange"), unit: unitTypeId("capital") };
    map[1][1] = { ...map[1][1], team: teamId("purple"), unit: unitTypeId("capital") };
    const state = createInitialGameSetup(map);
    expect(state).toMatchObject({
      schemaVersion: 2,
      revision: 0,
      lifecycle: { phase: "waiting" },
      rulesetVersion: "standard@1",
      contentVersion: "standard@1",
      teams: { orange: { money: 1_000 }, purple: { money: 1_000 } },
      turn: { number: 0 },
    });
    expect(state.entities[entityId("initial-cell-0")]?.id).toBe("initial-cell-0");
    expect(state.objectives.filter(({ type }) => type === "capital")).toHaveLength(2);
    expect(validateGameState(state)).toEqual([]);
  });

  test("assigns deterministic stable cargo IDs without leaking editor sentinels", () => {
    const map = playableMap();
    map[1][1] = {
      ...map[1][1],
      team: teamId("orange"),
      unit: unitTypeId("truck"),
      loadedUnit: { team: teamId("orange"), unit: unitTypeId("worker") },
    };
    const state = createInitialGameSetup(map);
    const vehicle = state.entities[entityId("initial-cell-3")];
    expect(vehicle?.cargo?.entityIds).toEqual([entityId("initial-cargo-3-0")]);
    expect(state.entities[entityId("initial-cargo-3-0")]?.position).toBeUndefined();
    expect(JSON.stringify(state)).not.toContain('"none"');
    expect(JSON.stringify(state)).not.toContain('"gray"');
  });

  test("rejects incompatible prototype documents instead of retaining another reader", () => {
    const map = playableMap();
    expect(() => validatePlayableMap(map.map((row) => row.map((cell) =>
      cell.index === 0 ? { ...cell, entityId: "unsupported-id" } : cell))))
      .toThrow();
  });

  test("preserves assigned entity identity through deterministic movement", () => {
    const state = createInitialGameSetup(playableMap());
    const active = { ...state, lifecycle: { phase: "active" as const, activeTeamId: teamId("orange") } };
    const destination = mapOffsetToAxial(0, 1, 2);
    const result = applyStandardAction(active, teamId("orange"), {
      type: "move",
      actorId: entityId("initial-cell-0"),
      destination,
    });
    if (!result.ok) throw new Error(result.violations[0]?.message);
    expect(result.state.board.cells[hexKey(destination)]?.occupantEntityId).toBe("initial-cell-0");
    expect(result.state.entities[entityId("initial-cell-0")]?.id).toBe("initial-cell-0");
  });

  test("owns the bundled default preset without depending on test fixtures", () => {
    expect(validatePlayableMap(createDefaultBattlefield().map)).toHaveLength(1);
  });
});

describe("editor operations", () => {
  test("updates one cell without mutating the source map", () => {
    const map = playableMap();
    const updated = updateMapCell(map, 0, 0, {
      terrain: terrainTypeId("forest"),
      team: teamId("orange"),
      unit: unitTypeId("soldier"),
    });
    expect(updated).not.toBe(map);
    expect(updated[0]).not.toBe(map[0]);
    expect(updated[0][1]).toBe(map[0][1]);
    expect(updated[0][0].terrain).toBe("forest");
    expect(map[0][0].terrain).toBe("plains");
  });
});
