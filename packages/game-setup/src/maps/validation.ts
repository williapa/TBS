import { teamId, terrainTypeId, unitTypeId } from "@TBS/game-core";
import { standardTeamIds, standardTerrainTypeIds, standardUnits } from "@TBS/game-rules";
import { z } from "zod";

import {
  CURRENT_MAP_SCHEMA_VERSION,
  MAX_MAP_COLUMNS,
  MAX_MAP_ROWS,
  MapSetupError,
  type MapCell,
  type MapGrid,
  type SaveMapInput,
} from "../contracts";

const invalid = (message: string): never => {
  throw new MapSetupError("invalid-map", message);
};

const identifierSchema = z.string().trim().min(1);
const standardTeamValues = new Set(standardTeamIds.map(String));
const standardTerrainValues = new Set(standardTerrainTypeIds.map(String));

const teamSchema = z.union([
  z.literal("gray"),
  identifierSchema.refine((value) => standardTeamValues.has(value), "unknown team").transform(teamId),
]);
const terrainSchema = identifierSchema
  .refine((value) => standardTerrainValues.has(value), "unknown terrain")
  .transform(terrainTypeId);
const unitSchema = z.union([
  z.literal("none"),
  identifierSchema.refine((value) => standardUnits.has(unitTypeId(value)), "unknown unit").transform(unitTypeId),
]);

const loadedUnitSchema = z.object({
  team: teamSchema,
  unit: unitSchema,
}).strict().superRefine((unit, context) => {
  if (unit.unit === "none") context.addIssue({ code: "custom", path: ["unit"], message: "cargo unit cannot be empty" });
  if (unit.team === "gray") context.addIssue({ code: "custom", path: ["team"], message: "cargo unit must have a team" });
});

export const mapCellSchema = z.object({
  row: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
  index: z.number().int().nonnegative(),
  neighbors: z.array(z.number().int().nonnegative()).max(6).optional(),
  terrain: terrainSchema,
  unit: unitSchema,
  team: teamSchema,
  loadedUnit: loadedUnitSchema.optional(),
}).strict().superRefine((cell, context) => {
  if (cell.unit === "none" && cell.team !== "gray") {
    context.addIssue({ code: "custom", path: ["team"], message: "empty cells must be neutral" });
  }
  if (cell.unit === "none" && cell.loadedUnit) {
    context.addIssue({ code: "custom", path: ["unit"], message: "empty cells cannot contain unit state" });
  }
  if (cell.loadedUnit && cell.unit !== "none" && standardUnits.get(cell.unit)?.category !== "vehicle") {
    context.addIssue({ code: "custom", path: ["loadedUnit"], message: "only vehicles can begin with cargo" });
  }
  if (cell.loadedUnit && cell.loadedUnit.unit !== "none"
    && standardUnits.get(cell.loadedUnit.unit)?.category !== "person") {
    context.addIssue({ code: "custom", path: ["loadedUnit", "unit"], message: "initial cargo must be a person" });
  }
  if (cell.loadedUnit && cell.loadedUnit.team !== cell.team) {
    context.addIssue({ code: "custom", path: ["loadedUnit", "team"], message: "initial cargo must share its vehicle team" });
  }
}).transform((cell): MapCell => cell);

export const mapGridSchema = z.array(z.array(mapCellSchema).min(1)).min(1);
export const saveMapInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  map: mapGridSchema,
}).strict();
export const mapDocumentSchema = saveMapInputSchema.extend({
  schemaVersion: z.literal(CURRENT_MAP_SCHEMA_VERSION),
}).strict();

const assertMapBounds: (value: unknown) => asserts value is readonly unknown[][] = (value) => {
  if (!Array.isArray(value) || value.length === 0) throw new MapSetupError("invalid-map", "Map must contain at least one row");
  if (value.length > MAX_MAP_ROWS) {
    throw new MapSetupError("map-too-large", `Map has ${value.length} rows; the limit is ${MAX_MAP_ROWS}`);
  }
  for (const row of value) {
    if (!Array.isArray(row) || row.length === 0) throw new MapSetupError("invalid-map", "Map rows must not be empty");
    if (row.length > MAX_MAP_COLUMNS) {
      throw new MapSetupError(
        "map-too-large",
        `Map has ${row.length} columns in a row; the limit is ${MAX_MAP_COLUMNS}`,
      );
    }
  }
};

export const validateMap = (
  value: unknown,
  schemaVersion: number = CURRENT_MAP_SCHEMA_VERSION,
): MapGrid => {
  if (schemaVersion !== CURRENT_MAP_SCHEMA_VERSION) {
    throw new MapSetupError("unsupported-version", `Unsupported map schema version ${schemaVersion}`);
  }
  assertMapBounds(value);
  let map: MapGrid;
  try {
    map = mapGridSchema.parse(value);
  } catch (error) {
    throw new MapSetupError("invalid-map", error instanceof Error ? error.message : "Invalid map data");
  }

  const indexes = new Set<number>();
  for (const [rowIndex, row] of map.entries()) {
    for (const [columnIndex, cell] of row.entries()) {
      if (cell.row !== rowIndex || cell.column !== columnIndex) invalid("Map cell coordinates do not match their position");
      if (indexes.has(cell.index)) invalid("Map cell indexes must be unique");
      indexes.add(cell.index);
    }
  }

  const cellsByIndex = new Map(map.flat().map((cell) => [cell.index, cell]));
  for (const cell of map.flat()) {
    const neighbors = cell.neighbors ?? [];
    if (new Set(neighbors).size !== neighbors.length) invalid("Map cell neighbor indexes must be unique");
    for (const neighbor of neighbors) {
      const adjacent = cellsByIndex.get(neighbor);
      if (!adjacent) throw new MapSetupError("invalid-map", "Map cell neighbors must reference existing indexes");
      if (neighbor === cell.index) invalid("Map cells cannot reference themselves as neighbors");
      if (adjacent.neighbors && !adjacent.neighbors.includes(cell.index)) {
        invalid("Map cell neighbor relationships must be reciprocal");
      }
    }
  }
  return map;
};

const hasMovableCombatUnit = (map: MapGrid, team: string): boolean =>
  map.flat().some((cell) => {
    if (cell.team !== team || cell.unit === "none") return false;
    const definition = standardUnits.get(cell.unit);
    return Boolean(definition?.capabilities.includes("move") && definition.capabilities.includes("attack"));
  });

export const validatePlayableMap = (
  value: unknown,
  schemaVersion: number = CURRENT_MAP_SCHEMA_VERSION,
): MapGrid => {
  const map = validateMap(value, schemaVersion);
  const missingTeams = standardTeamIds.filter((team) => !hasMovableCombatUnit(map, team));
  if (missingTeams.length > 0) {
    invalid(`Map must contain at least one movable combat unit for ${missingTeams.join(" and ")}`);
  }
  return map;
};

export const validateSaveMapInput = (
  value: unknown,
  schemaVersion: number = CURRENT_MAP_SCHEMA_VERSION,
): SaveMapInput => {
  if (schemaVersion !== CURRENT_MAP_SCHEMA_VERSION) {
    throw new MapSetupError("unsupported-version", `Unsupported map schema version ${schemaVersion}`);
  }
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("map" in value)) {
    invalid("Map file must contain an object");
  }
  const candidate = value as Readonly<{ name?: unknown; map: unknown }>;
  const map = validatePlayableMap(candidate.map, schemaVersion);
  const name = candidate.name;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120) {
    throw new MapSetupError("invalid-map", "Map name is required and must not exceed 120 characters");
  }
  return { name: name.trim(), map };
};
