import type {
  CreatedGame,
  CreateGameInput,
  GameCommandPort,
  GameQueryPort,
  GameSession,
  GameSessionPort,
  IdentityPort,
  JoinIntent,
  StandardProtocolCodec,
  SubmitActionInput,
  SubmitActionResult,
} from "@TBS/application";
import { ProtocolValidationError } from "@TBS/protocol";
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
    private readonly codec: StandardProtocolCodec,
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
      const response = await this.client.rpc("create_game", {
        display_name: input.displayName,
        initial_state: input.initialState,
      });
      if (response.error) this.fail(response.error);
      const row = firstRow(response.data, "createGame.rows");
      const gameId = nonEmptyString(row.game_id, "createGame.gameId");
      const memberId = nonEmptyString(row.member_id, "createGame.memberId");
      const role = sessionRole(this.codec, row.role, "createGame.role");
      const inviteToken = nonEmptyString(row.invite_token, "createGame.inviteToken");
      const snapshot = await this.getSnapshot(gameId);
      if (memberId !== identity.userId) {
        throw new ProtocolValidationError([{
          path: "createGame.memberId",
          message: "did not match the authenticated identity",
        }]);
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
      const role = sessionRole(this.codec, row.role, "joinGame.role");
      const snapshot = await this.getSnapshot(gameId);
      if (memberId !== identity.userId) {
        throw new ProtocolValidationError([{
          path: "joinGame.memberId",
          message: "did not match the authenticated identity",
        }]);
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
      return snapshotFromRow(this.codec, firstRow(response.data, "getSnapshot.rows"));
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
      return rows(response.data, "getActions.rows").map((row) => this.codec.parseAppliedAction({
        protocolVersion: nonNegativeInteger(row.protocol_version, "getActions.protocolVersion"),
        actionId: row.action_id,
        revision: row.revision,
        actorTeamId: row.actor_team_id,
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
      const envelope = this.codec.parseActionEnvelope(input.envelope);
      const response = await this.client.functions.invoke("submit-action", {
        body: {
          gameId: input.gameId,
          envelope,
        },
      });
      if (response.error) this.fail(response.error);
      return parseSubmitActionResult(this.codec, response.data);
    } catch (value) {
      return { ok: false, error: normalizeSupabaseGatewayError(value) };
    }
  }
}
