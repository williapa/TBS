import type {
  EntityId,
  HexCoord,
  HexKey,
  TeamId,
  TerrainTypeId,
  UnitTypeId,
} from "@TBS/game-core";
import type { UnitCapability } from "@TBS/game-rules";

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
  neighborIds: readonly HexKey[];
  terrainAssetId: string;
  selection: BoardSelectionState;
  target: BoardTargetType | null;
  accessibleDescription: string;
}>;

export type BoardEntityStatus = "boosted" | "moved";

export type BoardEntityViewModel = Readonly<{
  id: EntityId;
  unitTypeId: UnitTypeId;
  assetId: string;
  cellId: HexKey;
  coordinate: HexCoord;
  orientation: 0 | 1 | 2 | 3 | 4 | 5;
  teamId: TeamId | null;
  health: Readonly<{ current: number; maximum: number }> | null;
  statuses: readonly BoardEntityStatus[];
  capabilities: readonly UnitCapability[];
  selected: boolean;
  actionable: boolean;
  cargo: readonly Readonly<{
    id: EntityId;
    unitTypeId: UnitTypeId;
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
  legalTargets?: readonly Readonly<{ cellId: HexKey; type: BoardTargetType }>[];
  focusRequest?: BoardFocusRequest;
}>;

export type PresentationAssetManifest = Readonly<{
  terrain: (terrainTypeId: TerrainTypeId) => Readonly<{ assetId: string; label: string }>;
  unit: (unitTypeId: UnitTypeId) => Readonly<{ assetId: string; label: string }>;
}>;
