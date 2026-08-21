import {
  getHexNeighbors,
  hexKey,
  type EntityState,
  type GameState,
  type HexCoord,
} from "@TBS/game-core";
import {
  getEntityCapabilities,
  type StandardEvent,
} from "@TBS/game-rules";

import { createAnimationCues } from "../animation/cues";
import { identityAssetManifest } from "../assets/manifest";
import type {
  BoardCameraBounds,
  BoardEntityStatus,
  BoardInteractionView,
  BoardViewModel,
  PresentationAssetManifest,
} from "./contracts";

export type PresentBoardInput = Readonly<{
  state: GameState;
  interaction?: BoardInteractionView;
  events?: readonly StandardEvent[];
  assets?: PresentationAssetManifest;
}>;

const boundsFor = (coordinates: readonly HexCoord[]): BoardCameraBounds => {
  if (coordinates.length === 0) throw new Error("Cannot present an empty board");
  const q = coordinates.map(({ q: value }) => value);
  const r = coordinates.map(({ r: value }) => value);
  const minimum = { q: Math.min(...q), r: Math.min(...r) };
  const maximum = { q: Math.max(...q), r: Math.max(...r) };
  return {
    minimum,
    maximum,
    center: { q: (minimum.q + maximum.q) / 2, r: (minimum.r + maximum.r) / 2 },
  };
};

const statusesFor = (
  entity: EntityState,
): readonly BoardEntityStatus[] => [
  ...(entity.statuses.some(({ type }) => type === "boosted") ? ["boosted" as const] : []),
  ...(entity.actionBudget?.moved ? ["moved" as const] : []),
];

export const presentBoard = ({
  state,
  interaction = {},
  events = [],
  assets = identityAssetManifest,
}: PresentBoardInput): BoardViewModel => {
  const cells = Object.values(state.board.cells)
    .sort((left, right) => hexKey(left.position).localeCompare(hexKey(right.position)));
  const targets = new Map(
    (interaction.legalTargets ?? []).map(({ cellId, type }) => [cellId, type]),
  );
  const actionable = new Set(interaction.actionableEntityIds ?? []);

  const cellViews = cells.map((cell) => {
    const id = hexKey(cell.position);
    const terrain = assets.terrain(cell.terrainTypeId);
    return {
      id,
      coordinate: cell.position,
      neighborIds: getHexNeighbors(cell.position)
        .map(hexKey)
        .filter((candidate) => Boolean(state.board.cells[candidate]))
        .sort((left, right) => left.localeCompare(right)),
      terrainAssetId: terrain.assetId,
      selection: interaction.focusedCellId === id
        ? "focused" as const
        : interaction.selectedEntityId && cell.occupantEntityId === interaction.selectedEntityId
          ? "selected" as const
          : "none" as const,
      target: targets.get(id) ?? null,
      accessibleDescription: `${terrain.label} cell at q ${cell.position.q}, r ${cell.position.r}`,
    };
  });

  const entities = Object.values(state.entities)
    .filter((entity) => Boolean(entity.position))
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((entity) => {
      if (!entity.position) throw new Error(`Presented entity ${entity.id} has no position`);
      const unit = assets.unit(entity.unitTypeId);
      const statuses = statusesFor(entity);
      const health = entity.health ?? null;
      const statusText = statuses.length > 0 ? `, ${statuses.join(", ")}` : "";
      const teamText = entity.ownerTeamId ? `${entity.ownerTeamId} team` : "neutral";
      const healthText = health ? `, ${health.current} of ${health.maximum} health` : "";
      return {
        id: entity.id,
        unitTypeId: entity.unitTypeId,
        assetId: unit.assetId,
        cellId: hexKey(entity.position),
        coordinate: entity.position,
        orientation: 0 as const,
        teamId: entity.ownerTeamId ?? null,
        health,
        statuses,
        capabilities: getEntityCapabilities(state, entity.id),
        selected: interaction.selectedEntityId === entity.id,
        actionable: actionable.has(entity.id),
        cargo: (entity.cargo?.entityIds ?? []).flatMap((cargoId) => {
          const cargoEntity = state.entities[cargoId];
          if (!cargoEntity) return [];
          const cargoUnit = assets.unit(cargoEntity.unitTypeId);
          return [{
            id: cargoEntity.id,
            unitTypeId: cargoEntity.unitTypeId,
            assetId: cargoUnit.assetId,
            label: cargoUnit.label,
            statuses: statusesFor(cargoEntity),
          }];
        }),
        label: unit.label,
        accessibleDescription: `${unit.label}, ${teamText}${healthText}${statusText}`,
      };
    });

  return {
    revision: state.revision,
    cells: cellViews,
    entities,
    cameraBounds: boundsFor(cells.map(({ position }) => position)),
    focusRequest: interaction.focusRequest ?? null,
    animationCues: createAnimationCues(state.revision, events),
  };
};
