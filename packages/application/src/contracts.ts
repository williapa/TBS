import type { GameState, TeamId } from "@TBS/game-core";
import type { StandardAction, StandardEvent } from "@TBS/game-rules";
import type {
  ActionEnvelope,
  AppliedAction,
  CurrentProtocolCodec,
  GameSnapshot,
  RevisionNotice,
} from "@TBS/protocol";

export { STANDARD_RULESET_VERSION } from "@TBS/game-rules";
export { CURRENT_PROTOCOL_VERSION } from "@TBS/protocol";

export type StandardActionEnvelope = ActionEnvelope<StandardAction>;
export type StandardAppliedAction = AppliedAction<StandardAction, StandardEvent>;
export type StandardGameSnapshot = GameSnapshot<GameState>;
export type StandardProtocolCodec = CurrentProtocolCodec<
  GameState,
  StandardAction,
  StandardEvent
>;

export type SessionRole = TeamId | "spectator";
export type JoinIntent = "player" | "spectator";
export type Unsubscribe = () => void | Promise<void>;

export type GatewayErrorCode =
  | "auth-unavailable"
  | "game-not-found"
  | "invalid-invite"
  | "not-a-member"
  | "spectator-read-only"
  | "spectator-limit"
  | "wrong-team"
  | "stale-revision"
  | "duplicate-action"
  | "incompatible-data"
  | "invalid-action"
  | "network"
  | "unknown";

export type GatewayError = Readonly<{
  code: GatewayErrorCode;
  message: string;
  retryable: boolean;
}>;

export type GameSession = Readonly<{
  gameId: string;
  memberId: string;
  role: SessionRole;
  snapshot: StandardGameSnapshot;
}>;

export type CreatedGame = GameSession & Readonly<{ inviteToken: string }>;
export type CreateGameInput = Readonly<{
  displayName: string;
  initialState: GameState;
}>;

export type SubmitActionInput = Readonly<{
  gameId: string;
  envelope: StandardActionEnvelope;
}>;

export type SubmitActionResult =
  | Readonly<{
    ok: true;
    appliedAction: StandardAppliedAction;
    snapshot: StandardGameSnapshot;
  }>
  | Readonly<{ ok: false; error: GatewayError; snapshot?: StandardGameSnapshot }>;

export type GameRevisionNotice = RevisionNotice;

export type PresenceInput = Readonly<{
  gameId: string;
  displayName: string;
  role: SessionRole;
  onlineAt: string;
}>;

export type PresenceState = PresenceInput & Readonly<{ memberId: string }>;
