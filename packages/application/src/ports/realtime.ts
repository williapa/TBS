import type {
  GameRevisionNotice,
  PresenceInput,
  PresenceState,
  Unsubscribe,
} from "../contracts";

export interface GameRealtimePort {
  subscribe(
    gameId: string,
    revisionListener: (notice: GameRevisionNotice) => void,
    presenceListener?: (presence: readonly PresenceState[]) => void,
  ): Promise<Unsubscribe>;
  updatePresence(input: PresenceInput): Promise<void>;
  leave(): Promise<void>;
}
