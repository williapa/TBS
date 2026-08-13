import type { DomainEvent, GameState } from "@TBS/common";
import { entityId, hexKey, legacyIndexToAxial, legacyOffsetToAxial } from "@TBS/game-core";
import type { HexCoord } from "@TBS/game-core";

import { createAnimationCues, entityIdForMapItem } from "../animation/cues";
import { identityAssetManifest } from "../assets/manifest";
import type {
  BoardCameraBounds,
  BoardInteractionView,
  BoardViewModel,
  PresentationAssetManifest,
} from "./contracts";

export type PresentBoardInput = Readonly<{
  state: GameState;
  perspective?: string;
  interaction?: BoardInteractionView;
  events?: readonly DomainEvent[];
  assets?: PresentationAssetManifest;
}>;

const boundsFor = (coordinates: readonly HexCoord[]): BoardCameraBounds => {
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

export const presentBoard = ({
  state,
  interaction = {},
  events = [],
  assets = identityAssetManifest,
}: PresentBoardInput): BoardViewModel => {
  const width = state.map[0]?.length;
  if (!width) throw new Error("Cannot present an empty board");
  const cells = state.map.flat();
  const coordinates = new Map(cells.map((cell) => [
    cell.index,
    legacyOffsetToAxial(cell.row, cell.column, width),
  ]));
  const targets = new Map(
    (interaction.legalTargets ?? []).map(({ cellIndex, type }) => [cellIndex, type]),
  );
  const actionable = new Set(interaction.actionableEntityIds ?? []);

  const cellViews = cells.map((cell) => {
    const coordinate = coordinates.get(cell.index);
    if (!coordinate) throw new Error(`Missing coordinate for cell ${cell.index}`);
    const id = hexKey(coordinate);
    const terrain = assets.terrain(cell.terrain);
    return {
      id,
      coordinate,
      legacyIndex: cell.index,
      neighborIds: (cell.neighbors ?? []).map((index) => hexKey(
        coordinates.get(index) ?? legacyIndexToAxial(index, width),
      )),
      terrainAssetId: terrain.assetId,
      selection: interaction.focusedCellId === id ? "focused" as const : "none" as const,
      target: targets.get(cell.index) ?? null,
      accessibleDescription: `${terrain.label} cell at q ${coordinate.q}, r ${coordinate.r}`,
    };
  });

  const entities = cells.flatMap((cell) => {
    const id = entityIdForMapItem(cell);
    const coordinate = coordinates.get(cell.index);
    if (!id || !coordinate) return [];
    const unit = assets.unit(cell.unit);
    const statuses = [
      ...(cell.boosted ? ["boosted" as const] : []),
      ...(cell.moved ? ["moved" as const] : []),
    ];
    const health = { current: 100 - (cell.damage ?? 0), maximum: 100 };
    const statusText = statuses.length > 0 ? `, ${statuses.join(", ")}` : "";
    return [{
      id,
      assetId: unit.assetId,
      cellId: hexKey(coordinate),
      coordinate,
      orientation: 0 as const,
      team: cell.team,
      health,
      statuses,
      selected: interaction.selectedEntityId === id,
      actionable: actionable.has(id),
      cargo: cell.loadedUnit
        ? [{
            id: cell.loadedUnit.entityId ?? entityId(`legacy-cargo-${cell.index}-0`),
            assetId: assets.unit(cell.loadedUnit.unit).assetId,
            label: assets.unit(cell.loadedUnit.unit).label,
            statuses: [
              ...(cell.loadedUnit.boosted ? ["boosted" as const] : []),
              ...(cell.loadedUnit.moved ? ["moved" as const] : []),
            ],
          }]
        : [],
      label: unit.label,
      accessibleDescription: `${unit.label}, ${cell.team} team, ${health.current} health${statusText}`,
    }];
  });

  return {
    revision: state.revision,
    cells: cellViews,
    entities,
    cameraBounds: boundsFor([...coordinates.values()]),
    focusRequest: interaction.focusRequest ?? null,
    animationCues: createAnimationCues(state, events),
  };
};
