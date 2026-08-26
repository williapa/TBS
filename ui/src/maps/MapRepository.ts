import type { MapGrid, SaveMapInput } from "@TBS/game-setup";
import { CURRENT_MAP_SCHEMA_VERSION } from "@TBS/game-setup";

export { CURRENT_MAP_SCHEMA_VERSION };
export type { SaveMapInput };

export type SavedMap = {
  schemaVersion: typeof CURRENT_MAP_SCHEMA_VERSION;
  id: string;
  name: string;
  map: MapGrid;
  readOnly: boolean;
};

export interface MapRepository {
  list(): Promise<SavedMap[]>;
  get(id: string): Promise<SavedMap | undefined>;
  save(input: SaveMapInput): Promise<SavedMap>;
  update(id: string, input: SaveMapInput): Promise<SavedMap>;
  delete(id: string): Promise<void>;
}

export class MapRepositoryError extends Error {
  constructor(readonly code: "invalid-map" | "unsupported-version" | "map-not-found" | "read-only" | "map-too-large", message: string) {
    super(message);
    this.name = "MapRepositoryError";
  }
}
