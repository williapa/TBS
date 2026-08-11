import { MapItem } from "@TBS/common";

export const CURRENT_MAP_SCHEMA_VERSION = 1 as const;

export type SavedMap = {
  schemaVersion: typeof CURRENT_MAP_SCHEMA_VERSION;
  id: string;
  name: string;
  map: MapItem[][];
  readOnly: boolean;
};

export type SaveMapInput = { name: string; map: MapItem[][] };

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
