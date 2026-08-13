import type {
  CreatedGame,
  CreateGameInput,
  GameCommandPort,
  GameQueryPort,
  GameSession,
  GameSessionPort,
  IdentityPort,
  JoinIntent,
  SubmitActionInput,
  SubmitActionResult,
} from "@TBS/application";
import {
  ContractValidationError,
  CURRENT_GAME_SCHEMA_VERSION,
  parseActionEnvelope,
  parseAppliedAction,
  parsePersistedGamePayload,
} from "@TBS/common";
import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeSupabaseGatewayError } from "../mapping/errors";
import {
  firstRow,
  nonEmptyString,
  nonNegativeInteger,
  parseSubmitActionResult,
  rows,
  sessionRole,
  snapshotFromRow,
} from "../mapping/values";

const MAX_ACTION_HISTORY = 100;

export class SupabaseGameSessionAdapter
  implements GameSessionPort, GameQueryPort, GameCommandPort {
  constructor(
    private readonly client: SupabaseClient,
    private readonly identity: IdentityPort,
  ) {}

  private async ready() {
    return this.identity.getIdentity();
  }

  private fail(error: unknown): never {
    throw normalizeSupabaseGatewayError(error);
  }

  async createGame(input: CreateGameInput): Promise<CreatedGame> {
    try {
      const identity = await this.ready();
      const initialPayload = parsePersistedGamePayload(
        input.initialPayload,
        CURRENT_GAME_SCHEMA_VERSION,
      );
      const response = await this.client.rpc("create_game", {
        requested_schema_version: CURRENT_GAME_SCHEMA_VERSION,
        display_name: input.displayName,
        requested_win_condition: input.winCondition,
        initial_gameplay_payload: initialPayload,
      });
      if (response.error) this.fail(response.error);
      const row = firstRow(response.data, "createGame.rows");
      const gameId = nonEmptyString(row.game_id, "createGame.gameId");
      const memberId = nonEmptyString(row.member_id, "createGame.memberId");
      const role = sessionRole(row.role, "createGame.role");
      const inviteToken = nonEmptyString(row.invite_token, "createGame.inviteToken");
      const snapshot = await this.getSnapshot(gameId);
      if (memberId !== identity.userId) {
        throw new ContractValidationError(
          "createGame.memberId",
          "did not match the authenticated identity",
        );
      }
      return { gameId, memberId, role, inviteToken, snapshot };
    } catch (error) {
      this.fail(error);
    }
  }

  async joinGame(
    inviteToken: string,
    intent: JoinIntent,
    displayName: string,
  ): Promise<GameSession> {
    try {
      const identity = await this.ready();
      const response = await this.client.rpc("join_game", {
        invite_token: inviteToken,
        join_intent: intent,
        requested_display_name: displayName,
      });
      if (response.error) this.fail(response.error);
      const row = firstRow(response.data, "joinGame.rows");
      const gameId = nonEmptyString(row.game_id, "joinGame.gameId");
      const memberId = nonEmptyString(row.member_id, "joinGame.memberId");
      const role = sessionRole(row.role, "joinGame.role");
      const snapshot = await this.getSnapshot(gameId);
      if (memberId !== identity.userId) {
        throw new ContractValidationError(
          "joinGame.memberId",
          "did not match the authenticated identity",
        );
      }
      return { gameId, memberId, role, snapshot };
    } catch (error) {
      this.fail(error);
    }
  }

  async getSnapshot(gameId: string) {
    try {
      await this.ready();
      const response = await this.client.rpc("get_game_snapshot", {
        requested_game_id: gameId,
      });
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
        protocolVersion: nonNegativeInteger(row.protocol_version, "getActions.protocolVersion"),
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

  async submitAction(input: SubmitActionInput): Promise<SubmitActionResult> {
    try {
      await this.ready();
      const envelope = parseActionEnvelope(input.envelope);
      const response = await this.client.functions.invoke("submit-action", {
        body: {
          gameId: input.gameId,
          envelope,
        },
      });
      if (response.error) this.fail(response.error);
      return parseSubmitActionResult(response.data);
    } catch (value) {
      return { ok: false, error: normalizeSupabaseGatewayError(value) };
    }
  }
}
