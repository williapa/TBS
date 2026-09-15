import type { TeamId, TerrainTypeId, UnitTypeId } from "@TBS/game-core";
import { STANDARD_STARTING_MONEY } from "@TBS/game-rules";

export const CURRENT_MAP_SCHEMA_VERSION = 2 as const;
export const MIN_MAP_SIDE = 2;
export const MAX_MAP_SIDE = 25;
export const MAX_MAP_ROWS = 49;
export const MAX_MAP_COLUMNS = 49;
export const MAX_SERIALIZED_MAP_BYTES = 1_048_576;

export type MapTeamId = TeamId | "gray";
export type MapUnitTypeId = UnitTypeId | "none";

export type MapLoadedUnit = Readonly<{
  team: MapTeamId;
  unit: MapUnitTypeId;
}>;

export type MapCell = Readonly<{
  row: number;
  column: number;
  index: number;
  neighbors?: readonly number[];
  terrain: TerrainTypeId;
  unit: MapUnitTypeId;
  team: MapTeamId;
  loadedUnit?: MapLoadedUnit;
}>;

export type MapGrid = MapCell[][];

export type MapStartingMoney = Readonly<{
  orange: number;
  purple: number;
}>;

export const DEFAULT_MAP_STARTING_MONEY: MapStartingMoney = Object.freeze({
  orange: STANDARD_STARTING_MONEY,
  purple: STANDARD_STARTING_MONEY,
});

export type MapDocument = Readonly<{
  schemaVersion: typeof CURRENT_MAP_SCHEMA_VERSION;
  name: string;
  map: MapGrid;
  startingMoney: MapStartingMoney;
}>;

export type BundledMapPreset = MapDocument & Readonly<{
  id: string;
}>;

export type SaveMapInput = Readonly<{
  name: string;
  map: MapGrid;
  startingMoney: MapStartingMoney;
}>;

export type MapSetupErrorCode =
  | "invalid-map"
  | "map-too-large"
  | "unsupported-version";

export class MapSetupError extends Error {
  constructor(
    readonly code: MapSetupErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MapSetupError";
  }
}
