import type { TeamColor } from "@TBS/common";
import type { EntityId, HexCoord, HexKey } from "@TBS/game-core";

import type { AnimationCue } from "../animation/contracts";

export type BoardTargetType =
  | "attack"
  | "boost"
  | "construct"
  | "heal"
  | "load"
  | "move"
  | "spawn"
  | "unload";

export type BoardSelectionState = "focused" | "none" | "selected";

export type BoardCellViewModel = Readonly<{
  id: HexKey;
  coordinate: HexCoord;
  legacyIndex: number;
  neighborIds: readonly HexKey[];
  terrainAssetId: string;
  selection: BoardSelectionState;
  target: BoardTargetType | null;
  accessibleDescription: string;
}>;

export type BoardEntityStatus = "boosted" | "moved";

export type BoardEntityViewModel = Readonly<{
  id: EntityId;
  assetId: string;
  cellId: HexKey;
  coordinate: HexCoord;
  orientation: 0 | 1 | 2 | 3 | 4 | 5;
  team: TeamColor;
  health: Readonly<{ current: number; maximum: number }>;
  statuses: readonly BoardEntityStatus[];
  selected: boolean;
  actionable: boolean;
  cargo: readonly Readonly<{
    id: EntityId;
    assetId: string;
    label: string;
    statuses: readonly BoardEntityStatus[];
  }>[];
  label: string;
  accessibleDescription: string;
}>;

export type BoardCameraBounds = Readonly<{
  minimum: HexCoord;
  maximum: HexCoord;
  center: Readonly<{ q: number; r: number }>;
}>;

export type BoardFocusRequest =
  | Readonly<{ type: "cell"; cellId: HexKey }>
  | Readonly<{ type: "entity"; entityId: EntityId }>;

export type BoardViewModel = Readonly<{
  revision: number;
  cells: readonly BoardCellViewModel[];
  entities: readonly BoardEntityViewModel[];
  cameraBounds: BoardCameraBounds;
  focusRequest: BoardFocusRequest | null;
  animationCues: readonly AnimationCue[];
}>;

export type BoardInteractionView = Readonly<{
  selectedEntityId?: EntityId;
  focusedCellId?: HexKey;
  actionableEntityIds?: readonly EntityId[];
  legalTargets?: readonly Readonly<{ cellIndex: number; type: BoardTargetType }>[];
  focusRequest?: BoardFocusRequest;
}>;

export type PresentationAssetManifest = Readonly<{
  terrain: (terrainTypeId: string) => Readonly<{ assetId: string; label: string }>;
  unit: (unitTypeId: string) => Readonly<{ assetId: string; label: string }>;
}>;
