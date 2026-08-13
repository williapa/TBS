import type { AppliedAction, GameSnapshot } from "@TBS/common";

export interface GameQueryPort {
  getSnapshot(gameId: string): Promise<GameSnapshot>;
  getActions(gameId: string, afterRevision: number): Promise<readonly AppliedAction[]>;
}
