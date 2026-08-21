import type {
  EntityId,
  GameState,
  HexCoord,
  HexKey,
  TeamId,
  UnitTypeId,
} from "@TBS/game-core";
import type {
  ConstructAction,
  SpawnAction,
  StandardAction,
} from "@TBS/game-rules";

export type MenuPosition = Readonly<{ top: number; left: number }>;
export type InteractiveActionType = Exclude<StandardAction["type"], "end-turn">;

export type GameInteractionMode =
  | "idle"
  | "unit-selected"
  | "action-menu"
  | "targeting";

export type GameMenuActionId =
  | InteractiveActionType
  | "cancel"
  | "confirm"
  | `construct:${string}`
  | `spawn:${string}`;

export type GameMenuOption = Readonly<{
  disabled?: boolean;
  id: GameMenuActionId;
  label: string;
  unitTypeId?: UnitTypeId;
}>;

export type GameActionMenuState = Readonly<{
  cellId: HexKey;
  kind: "origin" | "destination" | "confirm" | "construct-selection" | "spawn-selection";
  options: readonly GameMenuOption[];
  position: MenuPosition;
}>;

export type GameInteractionTarget = Readonly<{
  cellId: HexKey;
  type: InteractiveActionType;
  entityId?: EntityId;
}>;

export type GameInteractionState = Readonly<{
  mode: GameInteractionMode;
  selectedEntityId: EntityId | null;
  destination: HexCoord | null;
  pendingAction: InteractiveActionType | null;
  selectedTargetEntityId: EntityId | null;
  selectedTargetCellId: HexKey | null;
  selectedUnitTypeId: UnitTypeId | null;
  legalTargets: readonly GameInteractionTarget[];
  menu: GameActionMenuState | null;
}>;

export type GameInteractionPreview = Readonly<{
  actionableEntityIds: readonly EntityId[];
}>;

export type GameInteractionContext = Readonly<{
  active: boolean;
  state: GameState;
  menuPosition: MenuPosition;
  perspective: TeamId;
  preview?: GameInteractionPreview;
}>;

export type ConstructActionDraft = Omit<ConstructAction, "buildingEntityId">;
export type SpawnActionDraft = Omit<SpawnAction, "spawnedEntityId">;
export type StandardActionDraft =
  | Exclude<StandardAction, ConstructAction | SpawnAction>
  | ConstructActionDraft
  | SpawnActionDraft;
