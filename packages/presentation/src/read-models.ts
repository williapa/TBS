import type {
  EntityId,
  GameState,
  TeamId,
  TerrainTypeId,
  UnitTypeId,
} from "@TBS/game-core";
import {
  getEntityCapabilities,
  getDefaultCombatStats,
  getTeamIncome,
  standardRuleServices,
  type UnitCapability,
} from "@TBS/game-rules";

import { identityAssetManifest } from "./assets/manifest";
import type { UnitPanelActionViewModel } from "./action-details";
import type { PresentationAssetManifest } from "./board/contracts";
import { presentUnitTypeDetails } from "./unit-dictionary";

export type UnitPanelViewModel = Readonly<{
  entityId: EntityId;
  unitTypeId: UnitTypeId;
  label: string;
  teamId: TeamId | null;
  health: Readonly<{ current: number; maximum: number }> | null;
  attack: number;
  defense: number;
  boosted: boolean;
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
  const details = presentUnitTypeDetails(entity.unitTypeId, assets);
  if (!details) return null;
  const combatStats = getDefaultCombatStats(entity, standardRuleServices);
  if (!combatStats) return null;
  const boosted = entity.statuses.some(({ type }) => type === "boosted");
  return {
    entityId,
    unitTypeId: entity.unitTypeId,
    label: details.label,
    teamId: entity.ownerTeamId ?? null,
    health: entity.health ?? null,
    attack: combatStats.attack,
    defense: combatStats.defense,
    boosted,
    movement: details.movement,
    movementCosts: details.movementCosts,
    income: details.income,
    capabilities: getEntityCapabilities(state, entityId),
    abilities: details.abilities,
    actions: details.actions,
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
