import type { TerrainTypeId, UnitTypeId } from "@TBS/game-core";
import {
  getMovementCost,
  getUnitCost,
  getUnitDefinition,
  getUnitsByCategory,
  standardTerrainTypeIds,
  unitCategories,
  type UnitCapability,
  type UnitCategory,
} from "@TBS/game-rules";

import { presentUnitActions, type UnitPanelActionViewModel } from "./action-details";
import { identityAssetManifest } from "./assets/manifest";
import type { PresentationAssetManifest } from "./board/contracts";

export type UnitTypeDetailsViewModel = Readonly<{
  unitTypeId: UnitTypeId;
  label: string;
  category: UnitCategory;
  income: number;
  cost: number | null;
  attack: number;
  defense: number;
  movement: number;
  movementCosts: readonly Readonly<{
    terrainTypeId: TerrainTypeId;
    terrainLabel: string;
    cost: number;
  }>[];
  capabilities: readonly UnitCapability[];
  abilities: readonly string[];
  actions: readonly UnitPanelActionViewModel[];
}>;

export type UnitDictionaryGroupViewModel = Readonly<{
  category: UnitCategory;
  label: string;
  units: readonly Readonly<{
    unitTypeId: UnitTypeId;
    label: string;
  }>[];
}>;

export const presentUnitTypeDetails = (
  unitTypeId: UnitTypeId,
  assets: PresentationAssetManifest = identityAssetManifest,
): UnitTypeDetailsViewModel | null => {
  const definition = getUnitDefinition(unitTypeId);
  if (!definition) return null;
  return {
    unitTypeId,
    label: assets.unit(unitTypeId).label,
    category: definition.category,
    income: definition.income,
    cost: getUnitCost(unitTypeId) ?? null,
    attack: definition.base.attack,
    defense: definition.base.defense,
    movement: definition.base.movement,
    movementCosts: definition.capabilities.includes("move")
      ? standardTerrainTypeIds.flatMap((terrainTypeId) => {
          const cost = getMovementCost(definition, terrainTypeId);
          return Number.isFinite(cost)
            ? [{ terrainTypeId, terrainLabel: assets.terrain(terrainTypeId).label, cost }]
            : [];
        })
      : [],
    capabilities: definition.capabilities,
    abilities: definition.abilities,
    actions: presentUnitActions(unitTypeId, assets),
  };
};

export const presentUnitDictionary = (
  assets: PresentationAssetManifest = identityAssetManifest,
): readonly UnitDictionaryGroupViewModel[] => unitCategories.map((category) => ({
  category,
  label: category,
  units: getUnitsByCategory(category).map(({ id }) => ({
    unitTypeId: id,
    label: assets.unit(id).label,
  })),
}));
