import type {
  ActionEnvelope,
  AppliedAction,
  GameSnapshot,
  PersistedGamePayload,
  TeamOption,
  WinCondition,
} from "@TBS/common";

export type SessionRole = TeamOption | "spectator";
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
  snapshot: GameSnapshot;
}>;

export type CreatedGame = GameSession & Readonly<{ inviteToken: string }>;
export type CreateGameInput = Readonly<{
  displayName: string;
  initialPayload: PersistedGamePayload;
  winCondition: WinCondition;
}>;

export type SubmitActionInput = Readonly<{
  gameId: string;
  envelope: ActionEnvelope;
}>;

export type SubmitActionResult =
  | Readonly<{ ok: true; appliedAction: AppliedAction; snapshot: GameSnapshot }>
  | Readonly<{ ok: false; error: GatewayError; snapshot?: GameSnapshot }>;

export type GameRevisionNotice = Readonly<{
  gameId: string;
  revision: number;
  actionId: string;
}>;

export type PresenceInput = Readonly<{
  gameId: string;
  displayName: string;
  role: SessionRole;
  onlineAt: string;
}>;

export type PresenceState = PresenceInput & Readonly<{ memberId: string }>;
