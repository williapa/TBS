import {
  ActionEnvelope,
  AppliedAction,
  GameSnapshot,
  GameState,
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

export type GatewayError = { code: GatewayErrorCode; message: string; retryable: boolean };
export type GameSession = { gameId: string; memberId: string; role: SessionRole; snapshot: GameSnapshot };
export type CreatedGame = GameSession & { inviteToken: string };
export type CreateGameInput = { displayName: string; initialPayload: PersistedGamePayload; winCondition: WinCondition };
export type SubmitActionInput = { gameId: string; envelope: ActionEnvelope; candidateState?: GameState };
export type SubmitActionResult =
  | { ok: true; appliedAction: AppliedAction; snapshot: GameSnapshot }
  | { ok: false; error: GatewayError; snapshot?: GameSnapshot };
export type GameRevisionNotice = { gameId: string; revision: number; actionId: string };
export type PresenceInput = { gameId: string; displayName: string; role: SessionRole; onlineAt: string };
export type PresenceState = PresenceInput & { memberId: string };

export interface GameSessionGateway {
  createGame(input: CreateGameInput): Promise<CreatedGame>;
  joinGame(inviteToken: string, intent: JoinIntent, displayName: string): Promise<GameSession>;
  getSnapshot(gameId: string): Promise<GameSnapshot>;
  getActions(gameId: string, afterRevision: number): Promise<AppliedAction[]>;
  subscribe(gameId: string, listener: (notice: GameRevisionNotice) => void, presenceListener?: (presence: PresenceState[]) => void): Promise<Unsubscribe>;
  submitAction(input: SubmitActionInput): Promise<SubmitActionResult>;
  updatePresence(input: PresenceInput): Promise<void>;
  leave(): Promise<void>;
}

export type GameSessionGatewayFactory = () => GameSessionGateway;
