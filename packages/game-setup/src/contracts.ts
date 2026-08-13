import type { MapItem } from "@TBS/common";

export const CURRENT_MAP_SCHEMA_VERSION = 1 as const;
export const MIN_MAP_SIDE = 2;
export const MAX_MAP_SIDE = 25;
export const MAX_MAP_ROWS = 49;
export const MAX_MAP_COLUMNS = 49;
export const MAX_SERIALIZED_MAP_BYTES = 1_048_576;

export type MapDocument = Readonly<{
  schemaVersion: typeof CURRENT_MAP_SCHEMA_VERSION;
  name: string;
  map: MapItem[][];
}>;

export type SaveMapInput = Readonly<{
  name: string;
  map: MapItem[][];
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
