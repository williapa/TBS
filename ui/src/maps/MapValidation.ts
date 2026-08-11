import { MapItem, parsePersistedGamePayload } from "@TBS/common";
import { CURRENT_MAP_SCHEMA_VERSION, MapRepositoryError, SaveMapInput } from "./MapRepository";
import { MAX_MAP_COLUMNS, MAX_MAP_ROWS, MAX_SERIALIZED_MAP_BYTES } from "../productLimits";

export { MAX_MAP_COLUMNS, MAX_MAP_ROWS, MAX_SERIALIZED_MAP_BYTES } from "../productLimits";

const invalid = (message: string): never => { throw new MapRepositoryError("invalid-map", message); };

export const serializedByteLength = (value: string) => new Blob([value]).size;

export const assertSerializedMapSize = (serialized: string) => {
  const bytes = serializedByteLength(serialized);
  if (bytes > MAX_SERIALIZED_MAP_BYTES) {
    throw new MapRepositoryError(
      "map-too-large",
      `Map file is ${bytes.toLocaleString()} bytes; the limit is ${MAX_SERIALIZED_MAP_BYTES.toLocaleString()} bytes`
    );
  }
};

export const validateMap = (value: unknown, schemaVersion: number): MapItem[][] => {
  let map: MapItem[][];
  try {
    map = parsePersistedGamePayload({ map: value, money: { orange: 0, purple: 0 } }, schemaVersion).map;
  } catch (error) {
    if (String(error).includes("unsupported schema version")) {
      throw new MapRepositoryError("unsupported-version", `Unsupported map schema version ${schemaVersion}`);
    }
    throw new MapRepositoryError("invalid-map", error instanceof Error ? error.message : "Invalid map data");
  }
  if (map.length > MAX_MAP_ROWS) {
    throw new MapRepositoryError("map-too-large", `Map has ${map.length} rows; the limit is ${MAX_MAP_ROWS}`);
  }
  const widestRow = Math.max(...map.map((row) => row.length));
  if (widestRow > MAX_MAP_COLUMNS) {
    throw new MapRepositoryError("map-too-large", `Map has ${widestRow} columns in a row; the limit is ${MAX_MAP_COLUMNS}`);
  }
  const indexes = new Set<number>();
  map.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    if (cell.row !== rowIndex || cell.column !== columnIndex) invalid("Map cell coordinates do not match their position");
    if (indexes.has(cell.index)) invalid("Map cell indexes must be unique");
    indexes.add(cell.index);
  }));
  map.flat().forEach((cell) => cell.neighbors?.forEach((neighbor) => {
    if (!indexes.has(neighbor)) invalid("Map cell neighbors must reference existing indexes");
  }));
  return map;
};

export const validateSaveMapInput = (value: unknown, schemaVersion = CURRENT_MAP_SCHEMA_VERSION): SaveMapInput => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid("Map file must contain an object");
  const item = value as Record<string, unknown>;
  const name = item.name;
  if (typeof name !== "string" || !name.trim()) throw new MapRepositoryError("invalid-map", "Map name is required");
  return { name: name.trim(), map: validateMap(item.map, schemaVersion) };
};
