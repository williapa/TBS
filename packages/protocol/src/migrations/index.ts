import { NORMALIZED_GAME_SCHEMA_VERSION, type GameState } from "@TBS/game-core";

import { migrateV1GameState } from "./v1-to-v2";
import { parseNormalizedGameState } from "../schemas/normalized-v2";

const schemaVersionOf = (value: unknown): unknown =>
  typeof value === "object" && value !== null && "schemaVersion" in value
    ? value.schemaVersion
    : undefined;

export const migratePersistedGameState = (value: unknown): GameState => {
  const version = schemaVersionOf(value);
  if (version === 1) return migrateV1GameState(value);
  if (version === NORMALIZED_GAME_SCHEMA_VERSION) return parseNormalizedGameState(value);
  throw new Error(`Unsupported game schema version: ${String(version)}`);
};

export { migrateV1GameState } from "./v1-to-v2";
