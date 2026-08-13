import type { EntityId, HexCoord } from "@TBS/game-core";
import type { GameMenuActionId } from "./contracts";

export type BoardActionType = GameMenuActionId;

export type BoardIntent =
  | Readonly<{ type: "select-cell"; cell: HexCoord }>
  | Readonly<{ type: "select-entity"; entityId: EntityId }>
  | Readonly<{ type: "choose-action"; actionType: BoardActionType }>
  | Readonly<{ type: "cancel" }>
  | Readonly<{ type: "confirm" }>;

export type BoardIntentHandler = (intent: BoardIntent) => void;
