import {
  applyGameAction,
  ContractValidationError,
  CURRENT_GAME_SCHEMA_VERSION,
  parseAppliedAction,
  parseActionEnvelope,
  parseGameSnapshot,
  parsePersistedGamePayload,
} from "@TBS/common";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import {
  CreatedGame,
  CreateGameInput,
  GameSession,
  GameRevisionNotice,
  GatewayError,
  JoinIntent,
  PresenceInput,
  PresenceState,
  SessionRole,
  SubmitActionInput,
  SubmitActionResult,
  Unsubscribe,
} from "../GameSessionGateway";
import { GameSessionIdentityProvider } from "../GameSessionIdentity";
import { createSupabaseBrowserClient } from "./createSupabaseBrowserClient";
import {
  getSupabaseAnonymousIdentityProvider,
  SupabaseAnonymousIdentityProvider,
} from "./SupabaseAnonymousIdentityProvider";
import { normalizeSupabaseGatewayError } from "./SupabaseGatewayErrors";
import { MAX_ACTION_HISTORY } from "../../productLimits";

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown, path: string): UnknownRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ContractValidationError(path, "expected an object");
  }
  return value as UnknownRecord;
};

const rows = (value: unknown, path: string): UnknownRecord[] => {
  if (!Array.isArray(value)) throw new ContractValidationError(path, "expected an array");
  return value.map((row, index) => record(row, `${path}[${index}]`));
};

const string = (value: unknown, path: string) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new ContractValidationError(path, "expected a non-empty string");
  }
  return value;
};

const number = (value: unknown, path: string) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ContractValidationError(path, "expected a non-negative integer");
  }
  return value;
};

const role = (value: unknown, path: string): SessionRole => {
  if (value !== "orange" && value !== "purple" && value !== "spectator") {
    throw new ContractValidationError(path, "expected orange, purple, or spectator");
  }
  return value;
};

const firstRow = (value: unknown, path: string) => {
  const parsed = rows(value, path);
  if (parsed.length !== 1) throw new ContractValidationError(path, "expected exactly one row");
  return parsed[0];
};

const snapshotFromRow = (row: UnknownRecord) => {
  const payload = record(row.gameplay_payload, "snapshot.gameplayPayload");
  const activeTeam = row.active_team === null ? undefined : row.active_team;
  const winner = row.winner_team === null ? undefined : row.winner_team;
  return parseGameSnapshot({
    gameId: row.game_id,
    players: row.players,
    spectatorCount: row.spectator_count,
    state: {
      ...payload,
      schemaVersion: row.schema_version,
      revision: row.revision,
      status: row.status,
      activeTeam,
      winner,
      winCondition: row.win_condition,
    },
  });
};

export class SupabaseGameSessionGateway {
  private readonly client: SupabaseClient;
  private readonly identityProvider: GameSessionIdentityProvider;
  private readonly subscriptions = new Set<Unsubscribe>();
  private readonly presenceChannels = new Map<string, RealtimeChannel>();
  private readonly gameSubscriptions = new Map<string, Unsubscribe>();

  constructor(client?: SupabaseClient, identityProvider?: GameSessionIdentityProvider) {
    this.client = client ?? createSupabaseBrowserClient();
    this.identityProvider = identityProvider ?? (client
      ? new SupabaseAnonymousIdentityProvider(client.auth)
      : getSupabaseAnonymousIdentityProvider());
  }

  private async ready() {
    return this.identityProvider.getIdentity();
  }

  private fail(error: unknown): never {
    throw normalizeSupabaseGatewayError(error);
  }

  async createGame(input: CreateGameInput): Promise<CreatedGame> {
    try {
      const identity = await this.ready();
      const initialPayload = parsePersistedGamePayload(input.initialPayload, CURRENT_GAME_SCHEMA_VERSION);
      const response = await this.client.rpc("create_game", {
        requested_schema_version: CURRENT_GAME_SCHEMA_VERSION,
        display_name: input.displayName,
        requested_win_condition: input.winCondition,
        initial_gameplay_payload: initialPayload,
      });
      if (response.error) this.fail(response.error);
      const row = firstRow(response.data, "createGame.rows");
      const gameId = string(row.game_id, "createGame.gameId");
      const memberId = string(row.member_id, "createGame.memberId");
      const sessionRole = role(row.role, "createGame.role");
      const inviteToken = string(row.invite_token, "createGame.inviteToken");
      const snapshot = await this.getSnapshot(gameId);
      if (memberId !== identity.userId) {
        throw new ContractValidationError("createGame.memberId", "did not match the authenticated identity");
      }
      return { gameId, memberId, role: sessionRole, inviteToken, snapshot };
    } catch (error) {
      this.fail(error);
    }
  }

  async joinGame(inviteToken: string, intent: JoinIntent, displayName: string): Promise<GameSession> {
    try {
      const identity = await this.ready();
      const response = await this.client.rpc("join_game", {
        invite_token: inviteToken,
        join_intent: intent,
        requested_display_name: displayName,
      });
      if (response.error) this.fail(response.error);
      const row = firstRow(response.data, "joinGame.rows");
      const gameId = string(row.game_id, "joinGame.gameId");
      const memberId = string(row.member_id, "joinGame.memberId");
      const sessionRole = role(row.role, "joinGame.role");
      const snapshot = await this.getSnapshot(gameId);
      if (memberId !== identity.userId) {
        throw new ContractValidationError("joinGame.memberId", "did not match the authenticated identity");
      }
      return { gameId, memberId, role: sessionRole, snapshot };
    } catch (error) {
      this.fail(error);
    }
  }

  async getSnapshot(gameId: string) {
    try {
      await this.ready();
      const response = await this.client.rpc("get_game_snapshot", { requested_game_id: gameId });
      if (response.error) this.fail(response.error);
      return snapshotFromRow(firstRow(response.data, "getSnapshot.rows"));
    } catch (error) {
      this.fail(error);
    }
  }

  async getActions(gameId: string, afterRevision: number) {
    try {
      await this.ready();
      const response = await this.client.rpc("get_game_actions", {
        requested_game_id: gameId,
        after_revision: afterRevision,
        requested_limit: MAX_ACTION_HISTORY,
      });
      if (response.error) this.fail(response.error);
      return rows(response.data, "getActions.rows").map((row) => parseAppliedAction({
        protocolVersion: number(row.protocol_version, "getActions.protocolVersion"),
        actionId: row.action_id,
        revision: row.revision,
        actorTeam: row.actor_team,
        action: row.action,
        events: row.events,
      }));
    } catch (error) {
      this.fail(error);
    }
  }

  private roleForSnapshot(identityId: string, snapshot: Awaited<ReturnType<SupabaseGameSessionGateway["getSnapshot"]>>): SessionRole {
    if (snapshot.players.orange?.memberId === identityId) return "orange";
    if (snapshot.players.purple?.memberId === identityId) return "purple";
    return "spectator";
  }

  async submitAction(input: SubmitActionInput): Promise<SubmitActionResult> {
    let canonicalSnapshot: Awaited<ReturnType<SupabaseGameSessionGateway["getSnapshot"]>> | undefined;
    try {
      const identity = await this.ready();
      const envelope = parseActionEnvelope(input.envelope);
      canonicalSnapshot = await this.getSnapshot(input.gameId);
      const actorRole = this.roleForSnapshot(identity.userId, canonicalSnapshot);
      if (actorRole === "spectator") {
        return {
          ok: false,
          error: { code: "spectator-read-only", message: "spectators cannot submit actions", retryable: false },
          snapshot: canonicalSnapshot,
        };
      }

      if (canonicalSnapshot.state.revision !== envelope.expectedRevision) {
        const laterActions = await this.getActions(input.gameId, envelope.expectedRevision);
        const duplicate = laterActions.find((action) => action.actionId === envelope.actionId);
        if (duplicate) {
          const sameRequest = duplicate.revision === envelope.expectedRevision + 1
            && duplicate.protocolVersion === envelope.protocolVersion
            && duplicate.actorTeam === actorRole
            && JSON.stringify(duplicate.action) === JSON.stringify(envelope.action);
          if (sameRequest) return { ok: true, appliedAction: duplicate, snapshot: canonicalSnapshot };
          return {
            ok: false,
            error: { code: "duplicate-action", message: "action ID conflicts with a committed action", retryable: false },
            snapshot: canonicalSnapshot,
          };
        }
        return {
          ok: false,
          error: { code: "stale-revision", message: "expected revision does not match canonical state", retryable: true },
          snapshot: canonicalSnapshot,
        };
      }

      const reduced = applyGameAction(canonicalSnapshot.state, actorRole, envelope.action);
      if (!reduced.ok) {
        const error: GatewayError = {
          code: reduced.code === "wrong-team" ? "wrong-team" : "invalid-action",
          message: reduced.message,
          retryable: false,
        };
        return { ok: false, error, snapshot: canonicalSnapshot };
      }

      const response = await this.client.rpc("submit_game_action", {
        requested_game_id: input.gameId,
        submitted_action_id: envelope.actionId,
        submitted_protocol_version: envelope.protocolVersion,
        expected_revision: envelope.expectedRevision,
        submitted_action: envelope.action,
        submitted_events: reduced.events,
        candidate_gameplay_payload: { map: reduced.state.map, money: reduced.state.money },
        proposed_status: reduced.state.status,
        proposed_active_team: reduced.state.activeTeam ?? null,
        proposed_winner_team: reduced.state.winner ?? null,
      });
      if (response.error) this.fail(response.error);
      const row = firstRow(response.data, "submitAction.rows");
      const appliedAction = parseAppliedAction({
        protocolVersion: row.protocol_version,
        actionId: row.action_id,
        revision: row.committed_action_revision,
        actorTeam: row.actor_team,
        action: row.action,
        events: row.events,
      });
      canonicalSnapshot = await this.getSnapshot(input.gameId);
      return { ok: true, appliedAction, snapshot: canonicalSnapshot };
    } catch (value) {
      const error = normalizeSupabaseGatewayError(value);
      if (error.code === "stale-revision") {
        try { canonicalSnapshot = await this.getSnapshot(input.gameId); } catch { /* preserve the submission error */ }
      }
      return { ok: false, error, snapshot: canonicalSnapshot };
    }
  }

  private parseRevisionNotice(value: unknown, expectedGameId: string): GameRevisionNotice {
    const envelope = record(value, "revisionBroadcast");
    const payload = record(envelope.payload, "revisionBroadcast.payload");
    const gameId = string(payload.gameId, "revisionBroadcast.payload.gameId");
    if (gameId !== expectedGameId) {
      throw new ContractValidationError("revisionBroadcast.payload.gameId", "did not match the subscribed game");
    }
    return {
      gameId,
      revision: number(payload.revision, "revisionBroadcast.payload.revision"),
      actionId: string(payload.actionId, "revisionBroadcast.payload.actionId"),
    };
  }

  private parsePresence(channel: RealtimeChannel, expectedGameId: string): PresenceState[] {
    const state = record(channel.presenceState(), "presenceState");
    const parsed: PresenceState[] = [];
    Object.entries(state).forEach(([memberId, values]) => {
      if (!Array.isArray(values)) throw new ContractValidationError(`presenceState.${memberId}`, "expected an array");
      values.forEach((value, index) => {
        const item = record(value, `presenceState.${memberId}[${index}]`);
        const gameId = string(item.gameId, `presenceState.${memberId}[${index}].gameId`);
        if (gameId !== expectedGameId) throw new ContractValidationError("presenceState.gameId", "did not match the subscribed game");
        const onlineAt = string(item.onlineAt, `presenceState.${memberId}[${index}].onlineAt`);
        if (Number.isNaN(Date.parse(onlineAt))) throw new ContractValidationError("presenceState.onlineAt", "expected an ISO timestamp");
        parsed.push({
          memberId: string(memberId, "presenceState.memberId"),
          gameId,
          displayName: string(item.displayName, `presenceState.${memberId}[${index}].displayName`),
          role: role(item.role, `presenceState.${memberId}[${index}].role`),
          onlineAt,
        });
      });
    });
    return parsed;
  }

  async subscribe(gameId: string, listener: (notice: GameRevisionNotice) => void, presenceListener?: (presence: PresenceState[]) => void): Promise<Unsubscribe> {
    await this.gameSubscriptions.get(gameId)?.();
    const identity = await this.ready();
    await this.getSnapshot(gameId);
    await this.client.realtime.setAuth();
    const channel: RealtimeChannel = this.client.channel(`game:${gameId}`, {
      config: { private: true, presence: { key: identity.userId, enabled: Boolean(presenceListener) } },
    });
    channel.on("broadcast", { event: "revision" }, (payload) => {
      try { listener(this.parseRevisionNotice(payload, gameId)); } catch { /* reconciliation will recover malformed/missed notices */ }
    });
    if (presenceListener) {
      channel.on("presence", { event: "sync" }, () => {
        try { presenceListener(this.parsePresence(channel, gameId)); } catch { /* the next Presence sync can recover */ }
      });
    }

    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reject({ code: "network", message: `Realtime subscription failed: ${status}`, retryable: true });
        }
      });
    }).catch(async (error) => {
      await this.client.removeChannel(channel);
      this.fail(error);
    });

    let active = true;
    this.presenceChannels.set(gameId, channel);
    const unsubscribe: Unsubscribe = async () => {
      if (!active) return;
      active = false;
      this.subscriptions.delete(unsubscribe);
      if (this.gameSubscriptions.get(gameId) === unsubscribe) this.gameSubscriptions.delete(gameId);
      if (this.presenceChannels.get(gameId) === channel) this.presenceChannels.delete(gameId);
      await channel.untrack();
      await this.client.removeChannel(channel);
    };
    this.subscriptions.add(unsubscribe);
    this.gameSubscriptions.set(gameId, unsubscribe);
    return unsubscribe;
  }

  async updatePresence(input: PresenceInput) {
    try {
      const identity = await this.ready();
      const snapshot = await this.getSnapshot(input.gameId);
      const persistentRole = this.roleForSnapshot(identity.userId, snapshot);
      const channel = this.presenceChannels.get(input.gameId);
      if (!channel) throw { code: "network", message: "Presence channel is not subscribed", retryable: true };
      const response = await channel.track({
        gameId: input.gameId,
        displayName: string(input.displayName, "presence.displayName"),
        role: persistentRole,
        onlineAt: string(input.onlineAt, "presence.onlineAt"),
      });
      if (response !== "ok") throw { code: "network", message: `Presence update failed: ${response}`, retryable: true };
    } catch (error) {
      this.fail(error);
    }
  }

  async leave() {
    for (const unsubscribe of Array.from(this.subscriptions)) await unsubscribe();
  }
}
