import {
  applyGameAction,
  createActiveGameSnapshot,
  type MapItem,
} from "@TBS/common";
import { describe, expect, test } from "vitest";

import {
  createDefaultBattlefield,
  createHexMap,
  createInitialGameSetup,
  CURRENT_MAP_SCHEMA_VERSION,
  exportMapDocument,
  generateHexagonalIndexGrid,
  importMapDocument,
  MAX_MAP_COLUMNS,
  MAX_SERIALIZED_MAP_BYTES,
  updateMapCell,
  validatePlayableMap,
  validateSaveMapInput,
} from "./index";

const playableMap = (): MapItem[][] => structuredClone(
  createActiveGameSnapshot().state.map,
);

const rectangularMap = (rows: number, columns: number): MapItem[][] => {
  let index = 0;
  return Array.from({ length: rows }, (_, row) => Array.from(
    { length: columns },
    (_, column) => ({
      row,
      column,
      index: index++,
      terrain: "plains" as const,
      unit: column === 0 && row === 0 ? "soldier" as const : "none" as const,
      team: column === 0 && row === 0 ? "orange" as const : "gray" as const,
    }),
  )).map((row, rowIndex) => row.map((cell, columnIndex) => {
    if (rowIndex === 0 && columnIndex === 1) {
      return { ...cell, unit: "soldier" as const, team: "purple" as const };
    }
    return cell;
  }));
};

describe("map generation", () => {
  test("preserves the legacy hexagonal index shape through axial geometry", () => {
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
    const map = createHexMap(2, "forest");
    expect(map.flat()).toHaveLength(7);
    expect(map[1][1].neighbors).toEqual([0, 1, 2, 4, 5, 6]);
    for (const cell of map.flat()) {
      for (const neighbor of cell.neighbors ?? []) {
        expect(map.flat().find(({ index }) => index === neighbor)?.neighbors)
          .toContain(cell.index);
      }
    }
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
    invalid[0][1] = { ...invalid[0][1], team: "gray", unit: "none" };
    expect(() => validatePlayableMap(invalid)).toThrow(
      "movable combat unit for purple",
    );
  });

  test("derives pinned initial state and the capital objective deterministically", () => {
    const map = createHexMap(2, "plains");
    map[0][0] = { ...map[0][0], team: "orange", unit: "soldier" };
    map[0][1] = { ...map[0][1], team: "purple", unit: "soldier" };
    map[1][0] = { ...map[1][0], team: "orange", unit: "capital" };
    map[1][1] = { ...map[1][1], team: "purple", unit: "capital" };
    const setup = createInitialGameSetup(map);
    expect(setup).toMatchObject({
      protocolVersion: 1,
      rulesetVersion: "standard@1",
      contentVersion: "standard@1",
      initialPayload: { money: { orange: 1_000, purple: 1_000 } },
      winCondition: "capital-or-combat-elimination",
    });
    expect(setup.initialPayload.map[0][0].entityId).toBe("initial-cell-0");
    expect(setup.initialPayload.map[0][1].entityId).toBe("initial-cell-1");
  });

  test("preserves assigned entity identity through deterministic movement", () => {
    const map = createHexMap(2, "plains");
    map[0][0] = { ...map[0][0], team: "orange", unit: "soldier" };
    map[2][1] = { ...map[2][1], team: "purple", unit: "soldier" };
    const setup = createInitialGameSetup(map);
    const result = applyGameAction({
      schemaVersion: 1,
      revision: 0,
      status: "active",
      activeTeam: "orange",
      ...setup.initialPayload,
    }, "orange", {
      action: "move",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    });
    if (!result.ok) throw new Error(result.message);
    expect(result.state.map[0][0].entityId).toBeUndefined();
    expect(result.state.map[0][1].entityId).toBe("initial-cell-0");
  });

  test("owns the bundled default preset without depending on test fixtures", () => {
    expect(validatePlayableMap(createDefaultBattlefield().map)).toHaveLength(1);
  });
});

describe("editor operations", () => {
  test("updates one cell without mutating the source map", () => {
    const map = playableMap();
    const updated = updateMapCell(map, 0, 0, {
      terrain: "forest",
      team: "orange",
      unit: "soldier",
    });
    expect(updated).not.toBe(map);
    expect(updated[0]).not.toBe(map[0]);
    expect(updated[0][1]).toBe(map[0][1]);
    expect(updated[0][0].terrain).toBe("forest");
    expect(map[0][0].terrain).toBe("plains");
  });
});
