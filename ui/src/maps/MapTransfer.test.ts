import {
  createDefaultBattlefield,
  MAX_MAP_COLUMNS,
  MAX_MAP_ROWS,
  MAX_SERIALIZED_MAP_BYTES,
  validateMap,
  type MapGrid,
} from "@TBS/game-setup";
import { LocalStorageMapRepository } from "./LocalStorageMapRepository";
import { exportMap, importMap } from "./MapTransfer";
import type { SavedMap } from "./MapRepository";
import { CURRENT_MAP_SCHEMA_VERSION } from "./MapRepository";

const map = (): MapGrid => validateMap(structuredClone(createDefaultBattlefield().map));

const rectangularMap = (rows: number, columns: number): MapGrid => {
  const template = map()[0][0];
  let index = 0;
  return Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => ({
    ...template,
    row,
    column,
    index: index++,
    neighbors: undefined,
  })));
};

describe("map import/export", () => {
  test("round trips the versioned name and map without data loss", () => {
    const saved: SavedMap = {
      schemaVersion: CURRENT_MAP_SCHEMA_VERSION,
      id: "local-1",
      name: "Crossing",
      map: map(),
      readOnly: false,
    };
    const serialized = exportMap(saved);
    expect(JSON.parse(serialized)).toMatchObject({ schemaVersion: 1, name: "Crossing" });
    expect(importMap(serialized)).toEqual({ name: saved.name, map: saved.map });
  });

  test.each([
    ["rows", rectangularMap(MAX_MAP_ROWS + 1, 1), `limit is ${MAX_MAP_ROWS}`],
    ["columns", rectangularMap(1, MAX_MAP_COLUMNS + 1), `limit is ${MAX_MAP_COLUMNS}`],
  ])("rejects maps exceeding the %s limit with a useful error", (_dimension, oversizedMap, message) => {
    const serialized = JSON.stringify({ schemaVersion: 1, name: "Too big", map: oversizedMap });
    expect(() => importMap(serialized)).toThrow(message);
  });

  test("rejects oversized files before parsing", () => {
    expect(() => importMap(" ".repeat(MAX_SERIALIZED_MAP_BYTES + 1))).toThrow(
      `the limit is ${MAX_SERIALIZED_MAP_BYTES.toLocaleString()} bytes`
    );
  });

  test.each([
    ["malformed JSON", "{", "not valid JSON"],
    ["unsupported version", JSON.stringify({ schemaVersion: 2, name: "Future", map: map() }), "Unsupported map schema version 2"],
    ["missing name", JSON.stringify({ schemaVersion: 1, map: map() }), "Map name is required"],
  ])("rejects %s with a useful validation error", (_case, serialized, message) => {
    expect(() => importMap(serialized)).toThrow(message);
  });

  test("applies the same limits to local repository writes", async () => {
    window.localStorage.clear();
    const repository = new LocalStorageMapRepository(window.localStorage, () => "oversized");
    await expect(repository.save({ name: "Too wide", map: rectangularMap(1, MAX_MAP_COLUMNS + 1) }))
      .rejects.toMatchObject({ code: "map-too-large" });
    expect(window.localStorage.getItem("TBS.maps.v1")).toBeNull();
  });
});
