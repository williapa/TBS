import type { TerrainTypeId, UnitTypeId } from "@TBS/game-core";
import {
  getUnitsByCategory,
  standardTeamIds,
  standardTerrainTypeIds,
  unitCategories,
  type UnitCategory,
} from "@TBS/game-rules";

import type { MapTeamId, MapUnitTypeId } from "../contracts";

export const mapTerrainOptions: readonly TerrainTypeId[] = standardTerrainTypeIds;
export const mapTeamOptions: readonly MapTeamId[] = [
  standardTeamIds[0],
  "gray",
  standardTeamIds[1],
].filter((value): value is MapTeamId => value !== undefined);

export type MapUnitOptionGroup = readonly [UnitCategory, readonly UnitTypeId[]];

export const mapUnitOptionGroups: readonly MapUnitOptionGroup[] = unitCategories.map(
  (category) => [category, getUnitsByCategory(category).map(({ id }) => id)] as const,
);

export const mapUnitOptions: readonly MapUnitTypeId[] = [
  "none",
  ...mapUnitOptionGroups.flatMap(([, units]) => units),
];
