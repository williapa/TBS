import {
  parsePersistedGamePayload,
  teamOptions,
} from "@TBS/common";
import type { MapItem, TeamOption } from "@TBS/common";
import { unitTypeId } from "@TBS/game-core";
import { standardUnits } from "@TBS/game-rules";

import {
  CURRENT_MAP_SCHEMA_VERSION,
  MAX_MAP_COLUMNS,
  MAX_MAP_ROWS,
  MapSetupError,
} from "../contracts";
import type { SaveMapInput } from "../contracts";

const invalid = (message: string): never => {
  throw new MapSetupError("invalid-map", message);
};

const record = (value: unknown): Readonly<Record<string, unknown>> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid("Map file must contain an object");
  }
  return value as Readonly<Record<string, unknown>>;
};

export const validateMap = (
  value: unknown,
  schemaVersion: number = CURRENT_MAP_SCHEMA_VERSION,
): MapItem[][] => {
  let map: MapItem[][];
  try {
    map = parsePersistedGamePayload(
      { map: value, money: { orange: 0, purple: 0 } },
      schemaVersion,
    ).map;
  } catch (error) {
    if (String(error).includes("unsupported schema version")) {
      throw new MapSetupError(
        "unsupported-version",
        `Unsupported map schema version ${schemaVersion}`,
      );
    }
    throw new MapSetupError(
      "invalid-map",
      error instanceof Error ? error.message : "Invalid map data",
    );
  }

  if (map.length === 0) invalid("Map must contain at least one row");
  if (map.length > MAX_MAP_ROWS) {
    throw new MapSetupError(
      "map-too-large",
      `Map has ${map.length} rows; the limit is ${MAX_MAP_ROWS}`,
    );
  }
  const widestRow = Math.max(...map.map((row) => row.length));
  if (widestRow > MAX_MAP_COLUMNS) {
    throw new MapSetupError(
      "map-too-large",
      `Map has ${widestRow} columns in a row; the limit is ${MAX_MAP_COLUMNS}`,
    );
  }

  const indexes = new Set<number>();
  for (const [rowIndex, row] of map.entries()) {
    if (row.length === 0) invalid("Map rows must not be empty");
    for (const [columnIndex, cell] of row.entries()) {
      if (cell.row !== rowIndex || cell.column !== columnIndex) {
        invalid("Map cell coordinates do not match their position");
      }
      if (indexes.has(cell.index)) invalid("Map cell indexes must be unique");
      indexes.add(cell.index);
    }
  }

  const cellsByIndex = new Map(map.flat().map((cell) => [cell.index, cell]));
  for (const cell of map.flat()) {
    const neighbors = cell.neighbors ?? [];
    if (neighbors.length > 6) invalid("Map cells cannot have more than six neighbors");
    if (new Set(neighbors).size !== neighbors.length) {
      invalid("Map cell neighbor indexes must be unique");
    }
    for (const neighbor of neighbors) {
      const adjacent = cellsByIndex.get(neighbor);
      if (adjacent === undefined) {
        throw new MapSetupError(
          "invalid-map",
          "Map cell neighbors must reference existing indexes",
        );
      }
      if (neighbor === cell.index) invalid("Map cells cannot reference themselves as neighbors");
      if (adjacent.neighbors && !adjacent.neighbors.includes(cell.index)) {
        invalid("Map cell neighbor relationships must be reciprocal");
      }
    }
  }
  return map;
};

const hasMovableCombatUnit = (map: MapItem[][], team: TeamOption): boolean =>
  map.flat().some((cell) => {
    if (cell.team !== team || cell.unit === "none") return false;
    const definition = standardUnits.get(unitTypeId(cell.unit));
    return Boolean(
      definition?.capabilities.includes("move")
      && definition.capabilities.includes("attack"),
    );
  });

export const validatePlayableMap = (
  value: unknown,
  schemaVersion: number = CURRENT_MAP_SCHEMA_VERSION,
): MapItem[][] => {
  const map = validateMap(value, schemaVersion);
  const missingTeams = teamOptions.filter((team) => !hasMovableCombatUnit(map, team));
  if (missingTeams.length > 0) {
    invalid(
      `Map must contain at least one movable combat unit for ${missingTeams.join(" and ")}`,
    );
  }
  return map;
};

export const validateSaveMapInput = (
  value: unknown,
  schemaVersion: number = CURRENT_MAP_SCHEMA_VERSION,
): SaveMapInput => {
  const item = record(value);
  const name = item.name;
  if (typeof name !== "string" || !name.trim()) {
    throw new MapSetupError("invalid-map", "Map name is required");
  }
  return {
    name: name.trim(),
    map: validatePlayableMap(item.map, schemaVersion),
  };
};
