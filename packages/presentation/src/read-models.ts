import type {
  EntityId,
  GameState,
  TeamId,
  TerrainTypeId,
  UnitTypeId,
} from "@TBS/game-core";
import {
  getEntityCapabilities,
  getMovementCost,
  getTeamIncome,
  getUnitDefinition,
  standardTerrainTypeIds,
  type UnitCapability,
} from "@TBS/game-rules";

import { identityAssetManifest } from "./assets/manifest";
import { presentUnitActions, type UnitPanelActionViewModel } from "./action-details";
import type { PresentationAssetManifest } from "./board/contracts";

export type UnitPanelViewModel = Readonly<{
  entityId: EntityId;
  unitTypeId: UnitTypeId;
  label: string;
  teamId: TeamId | null;
  health: Readonly<{ current: number; maximum: number }> | null;
  attack: number;
  defense: number;
  movement: number;
  movementCosts: readonly Readonly<{
    terrainTypeId: TerrainTypeId;
    terrainLabel: string;
    cost: number;
  }>[];
  income: number;
  capabilities: readonly UnitCapability[];
  abilities: readonly string[];
  actions: readonly UnitPanelActionViewModel[];
  cargo: readonly Readonly<{
    entityId: EntityId;
    unitTypeId: UnitTypeId;
    label: string;
  }>[];
}>;

export type TeamPanelViewModel = Readonly<{
  teamId: TeamId;
  money: number;
  income: number;
  active: boolean;
  winner: boolean;
}>;

export const presentUnitPanel = (
  state: GameState,
  entityId: EntityId,
  assets: PresentationAssetManifest = identityAssetManifest,
): UnitPanelViewModel | null => {
  const entity = state.entities[entityId];
  if (!entity) return null;
  const definition = getUnitDefinition(entity.unitTypeId);
  if (!definition) return null;
  return {
    entityId,
    unitTypeId: entity.unitTypeId,
    label: assets.unit(entity.unitTypeId).label,
    teamId: entity.ownerTeamId ?? null,
    health: entity.health ?? null,
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
    income: definition.income,
    capabilities: getEntityCapabilities(state, entityId),
    abilities: definition.abilities,
    actions: presentUnitActions(entity.unitTypeId),
    cargo: (entity.cargo?.entityIds ?? []).flatMap((cargoId) => {
      const cargo = state.entities[cargoId];
      return cargo
        ? [{
            entityId: cargo.id,
            unitTypeId: cargo.unitTypeId,
            label: assets.unit(cargo.unitTypeId).label,
          }]
        : [];
    }),
  };
};

export const presentTeamPanel = (
  state: GameState,
  teamId: TeamId,
): TeamPanelViewModel | null => {
  const team = state.teams[teamId];
  if (!team) return null;
  return {
    teamId,
    money: team.money,
    income: getTeamIncome(state, teamId),
    active: state.lifecycle.phase === "active" && state.lifecycle.activeTeamId === teamId,
    winner: state.lifecycle.phase === "finished" && state.lifecycle.winnerTeamId === teamId,
  };
};
