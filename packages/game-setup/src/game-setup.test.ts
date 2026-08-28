import { entityId, hexKey, teamId, terrainTypeId, unitTypeId, validateGameState } from "@TBS/game-core";
import { applyStandardAction } from "@TBS/game-rules";
import { describe, expect, test } from "vitest";

import {
  createDefaultBattlefield,
  createHexMap,
  createInitialGameSetup,
  CURRENT_MAP_SCHEMA_VERSION,
  deriveInitialObjectives,
  getMapReflectionCellRole,
  axialToMapIndex,
  axialToMapOffset,
  exportMapDocument,
  generateHexagonalIndexGrid,
  importMapDocument,
  mapIndexToAxial,
  mapOffsetToAxial,
  MAX_MAP_COLUMNS,
  MAX_SERIALIZED_MAP_BYTES,
  reflectMap,
  type MapGrid,
  updateMapCell,
  validateMap,
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

  test("derives capital victory only when every team starts with a capital", () => {
    const eliminationOnly = playableMap();
    eliminationOnly[1][0] = {
      ...eliminationOnly[1][0],
      team: teamId("orange"),
      unit: unitTypeId("capital"),
    };
    expect(deriveInitialObjectives(eliminationOnly).filter(({ type }) => type === "capital"))
      .toEqual([]);

    const capitalMap = playableMap();
    capitalMap[1][0] = {
      ...capitalMap[1][0],
      team: teamId("orange"),
      unit: unitTypeId("capital"),
    };
    capitalMap[1][1] = {
      ...capitalMap[1][1],
      team: teamId("purple"),
      unit: unitTypeId("capital"),
    };
    capitalMap[0][1] = {
      ...capitalMap[0][1],
      team: teamId("orange"),
      unit: unitTypeId("capital"),
    };
    expect(deriveInitialObjectives(capitalMap).filter(({ type }) => type === "capital"))
      .toHaveLength(3);
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

  test("defaults placed units to orange and keeps objects neutral", () => {
    const map = createHexMap(2, terrainTypeId("plains"));
    const soldier = updateMapCell(map, 0, 0, {
      terrain: terrainTypeId("plains"),
      team: "gray",
      unit: unitTypeId("soldier"),
    });
    const money = updateMapCell(soldier, 0, 1, {
      terrain: terrainTypeId("plains"),
      team: teamId("purple"),
      unit: unitTypeId("money"),
    });

    expect(money[0][0].team).toBe("orange");
    expect(money[0][1].team).toBe("gray");
  });

  test.each(["vertical", "diagonal"] as const)(
    "partitions every supported editor map around the %s reflection axis",
    (axis) => {
      for (let width = 2; width <= 10; width += 1) {
        const map = createHexMap(width, terrainTypeId("plains"));
        const roles = map.flat().map((cell) =>
          getMapReflectionCellRole(cell.row, cell.column, width, axis));
        expect(roles.filter((role) => role === "source")).toHaveLength(
          roles.filter((role) => role === "destination").length,
        );
        expect(roles).toContain("axis");
      }
    },
  );

  test("reflects the left half vertically while preserving destination topology", () => {
    const map = createHexMap(3, terrainTypeId("plains"));
    map[2][0] = {
      ...map[2][0],
      terrain: terrainTypeId("forest"),
      team: teamId("orange"),
      unit: unitTypeId("truck"),
      loadedUnit: { team: teamId("orange"), unit: unitTypeId("worker") },
    };
    map[2][2] = {
      ...map[2][2],
      terrain: terrainTypeId("water"),
    };
    const destinationBefore = map[2][4];

    const reflected = reflectMap(map, "vertical");

    expect(reflected).not.toBe(map);
    expect(reflected[2][0]).toEqual(map[2][0]);
    expect(reflected[2][2]).toEqual(map[2][2]);
    expect(reflected[2][4]).toEqual({
      ...destinationBefore,
      terrain: "forest",
      team: "purple",
      unit: "truck",
      loadedUnit: { team: "purple", unit: "worker" },
    });
    expect(map[2][4]).toBe(destinationBefore);
  });

  test("reflects the upper-right half diagonally and leaves objects neutral", () => {
    const map = createHexMap(3, terrainTypeId("plains"));
    map[1][3] = {
      ...map[1][3],
      terrain: terrainTypeId("desert"),
      team: teamId("orange"),
      unit: unitTypeId("money"),
    };
    const destinationBefore = map[3][0];

    const reflected = reflectMap(map, "diagonal");

    expect(reflected[1][3].team).toBe("gray");
    expect(reflected[3][0]).toEqual({
      ...destinationBefore,
      terrain: "desert",
      team: "gray",
      unit: "money",
    });
  });

  test.each([
    ["vertical", { source: [1, 0], mirrored: [1, 3], flipped: [3, 3] }],
    ["diagonal", { source: [2, 3], mirrored: [3, 1], flipped: [2, 1] }],
  ] as const)("flips the reflected %s half vertically within its destination side", (axis, cells) => {
    const map = createHexMap(3, terrainTypeId("plains"));
    const [sourceRow, sourceColumn] = cells.source;
    map[sourceRow][sourceColumn] = {
      ...map[sourceRow][sourceColumn],
      terrain: terrainTypeId("forest"),
      team: teamId("orange"),
      unit: unitTypeId("soldier"),
    };

    const reflected = reflectMap(map, axis, { flipVertically: true });
    const [flippedRow, flippedColumn] = cells.flipped;
    const [mirroredRow, mirroredColumn] = cells.mirrored;

    expect(reflected[flippedRow][flippedColumn]).toMatchObject({
      terrain: "forest",
      team: "purple",
      unit: "soldier",
    });
    expect(reflected[mirroredRow][mirroredColumn]).toMatchObject({
      terrain: "plains",
      team: "gray",
      unit: "none",
    });
  });

  test("normalizes colored objects from compatible maps and creates them without owners", () => {
    const map = playableMap();
    map[1][1] = {
      ...map[1][1],
      team: teamId("orange"),
      unit: unitTypeId("nuke"),
    };

    const validated = validateMap(map);
    expect(validated[1][1].team).toBe("gray");
    expect(createInitialGameSetup(map).entities[entityId("initial-cell-3")]?.ownerTeamId)
      .toBeUndefined();
  });
});
