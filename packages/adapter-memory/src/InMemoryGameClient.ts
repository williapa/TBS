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
  StandardActionEvaluator,
  StandardAppliedAction,
  StandardGameSnapshot,
  SubmitActionInput,
  SubmitActionResult,
  Unsubscribe,
} from "@TBS/application";
import type { PlayerSeat } from "@TBS/protocol";

const DEFAULT_MAX_SPECTATORS = 20;

type Member = PlayerSeat & { role: SessionRole };
type RecordState = {
  actions: StandardAppliedAction[];
  inviteToken: string;
  listeners: Set<(notice: GameRevisionNotice) => void>;
  presenceListeners: Set<(presence: readonly PresenceState[]) => void>;
  members: Map<string, Member>;
  presence: Map<string, PresenceState>;
  state: StandardGameSnapshot["state"];
  teamOrder: readonly Exclude<SessionRole, "spectator">[];
};

const gatewayError = (
  code: GatewayError["code"],
  message: string,
  retryable = false,
): GatewayError => ({ code, message, retryable });

const rejectionMessage = (
  result: Exclude<ReturnType<StandardActionEvaluator>, { ok: true }>,
): string => result.violations.map(({ message }) => message).join("; ") || "The action is invalid";

export class InMemoryGameSessionStore {
  readonly games = new Map<string, RecordState>();
  private nextGame = 1;

  constructor(readonly evaluateAction: StandardActionEvaluator) {}

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

  private snapshot(gameId: string, game: RecordState): StandardGameSnapshot {
    const players: Partial<Record<Exclude<SessionRole, "spectator">, PlayerSeat>> = {};
    let spectatorCount = 0;
    for (const member of game.members.values()) {
      if (member.role === "spectator") {
        spectatorCount += 1;
      } else {
        players[member.role] = {
          memberId: member.memberId,
          displayName: member.displayName,
        };
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
    if (input.initialState.revision !== 0 || input.initialState.lifecycle.phase !== "waiting") {
      throw gatewayError(
        "invalid-action",
        "new games require a waiting revision-zero initial state",
      );
    }
    const teamOrder = Object.values(input.initialState.teams).map(({ id }) => id);
    const creatorTeamId = teamOrder[0];
    if (!creatorTeamId || teamOrder.length < 2) {
      throw gatewayError("invalid-action", "new games require at least two teams");
    }
    const { gameId, inviteToken } = this.store.createIds();
    const member: Member = {
      memberId: this.userId,
      displayName: input.displayName,
      role: creatorTeamId,
    };
    const game: RecordState = {
      actions: [],
      inviteToken,
      listeners: new Set(),
      presenceListeners: new Set(),
      members: new Map([[this.userId, member]]),
      presence: new Map(),
      state: structuredClone(input.initialState),
      teamOrder,
    };
    this.store.games.set(gameId, game);
    return { ...this.session(gameId, game), inviteToken };
  }

  async joinGame(
    inviteToken: string,
    intent: JoinIntent,
    displayName: string,
  ): Promise<GameSession> {
    const found = this.store.findByInvite(inviteToken);
    if (!found) throw gatewayError("invalid-invite", "invite token is invalid");
    const existing = found.game.members.get(this.userId);
    if (!existing) {
      const occupiedTeams = new Set(
        [...found.game.members.values()].flatMap(({ role }) =>
          role === "spectator" ? [] : [role]),
      );
      const availableTeam = found.game.teamOrder.find((team) => !occupiedTeams.has(team));
      const role: SessionRole = intent === "player" && availableTeam
        ? availableTeam
        : "spectator";
      const spectatorCount = [...found.game.members.values()]
        .filter((member) => member.role === "spectator").length;
      if (role === "spectator" && spectatorCount >= this.maxSpectators) {
        throw gatewayError(
          "spectator-limit",
          `spectator limit reached (maximum ${this.maxSpectators})`,
        );
      }
      found.game.members.set(this.userId, {
        memberId: this.userId,
        displayName,
        role,
      });
      if (role !== "spectator" && found.game.state.lifecycle.phase === "waiting") {
        found.game.state = {
          ...found.game.state,
          lifecycle: { phase: "active", activeTeamId: role },
          turn: { number: 1 },
        };
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
      return {
        ok: true,
        appliedAction: duplicate,
        snapshot: this.snapshot(input.gameId, game),
      };
    }
    if (input.envelope.expectedRevision !== game.state.revision) {
      return {
        ok: false,
        error: gatewayError("stale-revision", "expected revision does not match", true),
        snapshot: this.snapshot(input.gameId, game),
      };
    }
    if (input.envelope.rulesetVersion !== game.state.rulesetVersion) {
      return {
        ok: false,
        error: gatewayError("incompatible-data", "envelope ruleset does not match the game"),
      };
    }
    const result = this.store.evaluateAction(game.state, member.role, input.envelope.action);
    if (!result.ok) {
      return {
        ok: false,
        error: gatewayError(
          result.violations.some(({ code }) => code === "wrong-team")
            ? "wrong-team"
            : "invalid-action",
          rejectionMessage(result),
        ),
      };
    }
    game.state = result.state;
    const appliedAction: StandardAppliedAction = {
      protocolVersion: input.envelope.protocolVersion,
      actionId: input.envelope.actionId,
      revision: game.state.revision,
      actorTeamId: member.role,
      action: input.envelope.action,
      events: result.events,
    };
    game.actions.push(appliedAction);
    const notice: GameRevisionNotice = {
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
    game.presence.set(this.userId, {
      ...input,
      role: member.role,
      memberId: this.userId,
    });
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
