import type {
  CreatedGame,
  CreateGameInput,
  GameClient,
  GameRevisionNotice,
  GameSession,
  GatewayError,
  JoinIntent,
  PresenceInput,
  PresenceState,
  SessionRole,
  SubmitActionInput,
  SubmitActionResult,
  Unsubscribe,
} from "@TBS/application";
import {
  applyGameAction,
  CURRENT_GAME_PROTOCOL_VERSION,
  CURRENT_GAME_SCHEMA_VERSION,
} from "@TBS/common";
import type { AppliedAction, GameSnapshot, GameState, PlayerSeat } from "@TBS/common";

const DEFAULT_MAX_SPECTATORS = 20;

type Member = PlayerSeat & { role: SessionRole };
type RecordState = {
  actions: AppliedAction[];
  inviteToken: string;
  listeners: Set<(notice: GameRevisionNotice) => void>;
  presenceListeners: Set<(presence: readonly PresenceState[]) => void>;
  members: Map<string, Member>;
  presence: Map<string, PresenceState>;
  state: GameState;
};

const gatewayError = (
  code: GatewayError["code"],
  message: string,
  retryable = false,
): GatewayError => ({ code, message, retryable });

export class InMemoryGameSessionStore {
  readonly games = new Map<string, RecordState>();
  private nextGame = 1;

  createIds() {
    const value = this.nextGame++;
    return { gameId: `game-${value}`, inviteToken: `invite-${value}` };
  }

  findByInvite(inviteToken: string) {
    for (const [gameId, game] of this.games) {
      if (game.inviteToken === inviteToken) return { gameId, game };
    }
    return undefined;
  }
}

export class InMemoryGameSessionGateway implements GameClient {
  private readonly subscriptions = new Set<Unsubscribe>();
  private currentGameId?: string;

  constructor(
    private readonly store: InMemoryGameSessionStore,
    private readonly userId: string,
    private readonly maxSpectators = DEFAULT_MAX_SPECTATORS,
  ) {}

  private getGame(gameId: string) {
    const game = this.store.games.get(gameId);
    if (!game) throw gatewayError("game-not-found", "game not found");
    if (!game.members.has(this.userId)) {
      throw gatewayError("not-a-member", "user has not joined this game");
    }
    return game;
  }

  private snapshot(gameId: string, game: RecordState): GameSnapshot {
    const players: GameSnapshot["players"] = {};
    let spectatorCount = 0;
    for (const member of game.members.values()) {
      if (member.role === "orange" || member.role === "purple") {
        players[member.role] = { memberId: member.memberId, displayName: member.displayName };
      } else {
        spectatorCount += 1;
      }
    }
    return { gameId, players, spectatorCount, state: game.state };
  }

  private member(game: RecordState) {
    const member = game.members.get(this.userId);
    if (!member) throw gatewayError("not-a-member", "user has not joined this game");
    return member;
  }

  private session(gameId: string, game: RecordState): GameSession {
    const member = this.member(game);
    this.currentGameId = gameId;
    return {
      gameId,
      memberId: member.memberId,
      role: member.role,
      snapshot: this.snapshot(gameId, game),
    };
  }

  async createGame(input: CreateGameInput): Promise<CreatedGame> {
    const { gameId, inviteToken } = this.store.createIds();
    const member: Member = {
      memberId: this.userId,
      displayName: input.displayName,
      role: "orange",
    };
    const game: RecordState = {
      actions: [],
      inviteToken,
      listeners: new Set(),
      presenceListeners: new Set(),
      members: new Map([[this.userId, member]]),
      presence: new Map(),
      state: {
        ...input.initialPayload,
        schemaVersion: CURRENT_GAME_SCHEMA_VERSION,
        revision: 0,
        status: "waiting",
        winCondition: input.winCondition,
      },
    };
    this.store.games.set(gameId, game);
    return { ...this.session(gameId, game), inviteToken };
  }

  async joinGame(inviteToken: string, intent: JoinIntent, displayName: string): Promise<GameSession> {
    const found = this.store.findByInvite(inviteToken);
    if (!found) throw gatewayError("invalid-invite", "invite token is invalid");
    const existing = found.game.members.get(this.userId);
    if (!existing) {
      const purpleTaken = [...found.game.members.values()].some(({ role }) => role === "purple");
      const role: SessionRole = intent === "player" && !purpleTaken ? "purple" : "spectator";
      const spectatorCount = [...found.game.members.values()]
        .filter((member) => member.role === "spectator").length;
      if (role === "spectator" && spectatorCount >= this.maxSpectators) {
        throw gatewayError(
          "spectator-limit",
          `spectator limit reached (maximum ${this.maxSpectators})`,
        );
      }
      found.game.members.set(this.userId, { memberId: this.userId, displayName, role });
      if (role === "purple") {
        found.game.state = { ...found.game.state, status: "active", activeTeam: "purple" };
      }
    }
    return this.session(found.gameId, found.game);
  }

  async getSnapshot(gameId: string) {
    return this.snapshot(gameId, this.getGame(gameId));
  }

  async getActions(gameId: string, afterRevision: number) {
    return this.getGame(gameId).actions.filter(({ revision }) => revision > afterRevision);
  }

  async subscribe(
    gameId: string,
    listener: (notice: GameRevisionNotice) => void,
    presenceListener?: (presence: readonly PresenceState[]) => void,
  ): Promise<Unsubscribe> {
    const game = this.getGame(gameId);
    game.listeners.add(listener);
    if (presenceListener) {
      game.presenceListeners.add(presenceListener);
      presenceListener([...game.presence.values()]);
    }
    let active = true;
    const unsubscribe = () => {
      if (active) {
        game.listeners.delete(listener);
        if (presenceListener) game.presenceListeners.delete(presenceListener);
      }
      active = false;
      this.subscriptions.delete(unsubscribe);
    };
    this.subscriptions.add(unsubscribe);
    return unsubscribe;
  }

  async submitAction(input: SubmitActionInput): Promise<SubmitActionResult> {
    const game = this.getGame(input.gameId);
    const member = this.member(game);
    if (member.role === "spectator") {
      return {
        ok: false,
        error: gatewayError("spectator-read-only", "spectators cannot submit actions"),
      };
    }
    const duplicate = game.actions.find(({ actionId }) => actionId === input.envelope.actionId);
    if (duplicate) {
      return { ok: true, appliedAction: duplicate, snapshot: this.snapshot(input.gameId, game) };
    }
    if (input.envelope.expectedRevision !== game.state.revision) {
      return {
        ok: false,
        error: gatewayError("stale-revision", "expected revision does not match", true),
        snapshot: this.snapshot(input.gameId, game),
      };
    }
    const result = applyGameAction(game.state, member.role, input.envelope.action);
    if (!result.ok) {
      return {
        ok: false,
        error: gatewayError(
          result.code === "wrong-team" ? "wrong-team" : "invalid-action",
          result.message,
        ),
      };
    }
    game.state = result.state;
    const appliedAction: AppliedAction = {
      protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
      actionId: input.envelope.actionId,
      revision: game.state.revision,
      actorTeam: member.role,
      action: input.envelope.action,
      events: result.events,
    };
    game.actions.push(appliedAction);
    const notice = {
      gameId: input.gameId,
      revision: appliedAction.revision,
      actionId: appliedAction.actionId,
    };
    for (const listener of game.listeners) listener(notice);
    return { ok: true, appliedAction, snapshot: this.snapshot(input.gameId, game) };
  }

  async updatePresence(input: PresenceInput) {
    const game = this.getGame(input.gameId);
    const member = this.member(game);
    game.presence.set(this.userId, { ...input, role: member.role, memberId: this.userId });
    const presence = [...game.presence.values()];
    for (const listener of game.presenceListeners) listener(presence);
  }

  async leave() {
    const game = this.currentGameId ? this.store.games.get(this.currentGameId) : undefined;
    if (game) {
      game.presence.delete(this.userId);
      const presence = [...game.presence.values()];
      for (const listener of game.presenceListeners) listener(presence);
    }
    for (const unsubscribe of [...this.subscriptions]) await unsubscribe();
    this.currentGameId = undefined;
  }
}
