import type { BundledMapPreset, MapCell, MapDocument } from "../contracts";
import { CURRENT_MAP_SCHEMA_VERSION } from "../contracts";
import { importMapDocument } from "../maps/transfer";
import { createDefaultBattlefield } from "./defaultBattlefield";
import fourForestsSource from "./four-forests.json";
import lakeAffectionSource from "./lake-affection.json";
import moneyMountainSource from "./money-mountain.json";

const importBundledMap = (source: unknown): MapDocument => ({
  schemaVersion: CURRENT_MAP_SCHEMA_VERSION,
  ...importMapDocument(JSON.stringify(source)),
});

const cloneCell = (cell: MapCell): MapCell => ({
  ...cell,
  ...(cell.neighbors ? { neighbors: [...cell.neighbors] } : {}),
  ...(cell.loadedUnit ? { loadedUnit: { ...cell.loadedUnit } } : {}),
});

const clonePreset = (preset: BundledMapPreset): BundledMapPreset => ({
  ...preset,
  map: preset.map.map((row) => row.map(cloneCell)),
});

const presets: readonly BundledMapPreset[] = [
  { id: "default-battlefield", ...createDefaultBattlefield() },
  { id: "four-forests", ...importBundledMap(fourForestsSource) },
  { id: "lake-affection", ...importBundledMap(lakeAffectionSource) },
  { id: "money-mountain", ...importBundledMap(moneyMountainSource) },
];

export const createBundledMapPresets = (): readonly BundledMapPreset[] =>
  presets.map(clonePreset);
