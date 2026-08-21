import type { StandardAppliedAction, StandardGameSnapshot } from "../contracts";

export interface GameQueryPort {
  getSnapshot(gameId: string): Promise<StandardGameSnapshot>;
  getActions(gameId: string, afterRevision: number): Promise<readonly StandardAppliedAction[]>;
}
