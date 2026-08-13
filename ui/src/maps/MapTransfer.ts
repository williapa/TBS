import {
  exportMapDocument,
  importMapDocument,
} from "@TBS/game-setup";
import type { CURRENT_MAP_SCHEMA_VERSION } from "@TBS/game-setup";
import type { SavedMap, SaveMapInput } from "./MapRepository";

export type MapTransfer = {
  schemaVersion: typeof CURRENT_MAP_SCHEMA_VERSION;
  name: string;
  map: SavedMap["map"];
};

export const exportMap = (savedMap: SavedMap): string => {
  return exportMapDocument(savedMap);
};

export const importMap = (serialized: string): SaveMapInput => importMapDocument(serialized);
