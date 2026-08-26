import type { EntityId, HexCoord } from "@TBS/game-core";

export const DEFAULT_MOVE_DURATION_MS = 260;

export type MoveEntityCue = Readonly<{
  type: "move-entity";
  id: string;
  revision: number;
  entityId: EntityId;
  from: HexCoord;
  to: HexCoord;
  durationMs: number;
}>;

export type AnimationCue = MoveEntityCue;

export type AnimationPlayback = Readonly<{
  cancel: () => void;
}>;

export type AnimationDriver = Readonly<{
  play: (cue: AnimationCue, onSettled: () => void) => AnimationPlayback;
  settleToCanonical: () => void;
}>;
