import { CURRENT_MAP_SCHEMA_VERSION, MapRepositoryError, SavedMap, SaveMapInput } from "./MapRepository";
import { assertSerializedMapSize, validateSaveMapInput } from "./MapValidation";

export type MapTransfer = {
  schemaVersion: typeof CURRENT_MAP_SCHEMA_VERSION;
  name: string;
  map: SavedMap["map"];
};

export const exportMap = (savedMap: SavedMap): string => {
  const input = validateSaveMapInput(savedMap, savedMap.schemaVersion);
  const serialized = JSON.stringify({ schemaVersion: CURRENT_MAP_SCHEMA_VERSION, ...input }, null, 2);
  assertSerializedMapSize(serialized);
  return serialized;
};

export const importMap = (serialized: string): SaveMapInput => {
  assertSerializedMapSize(serialized);
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new MapRepositoryError("invalid-map", "Map file is not valid JSON");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new MapRepositoryError("invalid-map", "Map file must contain an object");
  }
  const transfer = value as Record<string, unknown>;
  if (transfer.schemaVersion !== CURRENT_MAP_SCHEMA_VERSION) {
    throw new MapRepositoryError(
      "unsupported-version",
      `Unsupported map schema version ${String(transfer.schemaVersion)}`
    );
  }
  return validateSaveMapInput(transfer, CURRENT_MAP_SCHEMA_VERSION);
};
