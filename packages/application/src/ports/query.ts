import type {
  GameInvitePreview,
  StandardAppliedAction,
  StandardGameSnapshot,
} from "../contracts";

export interface GameQueryPort {
  getInvitePreview(inviteToken: string): Promise<GameInvitePreview>;
  getSnapshot(gameId: string): Promise<StandardGameSnapshot>;
  getActions(gameId: string, afterRevision: number): Promise<readonly StandardAppliedAction[]>;
}
