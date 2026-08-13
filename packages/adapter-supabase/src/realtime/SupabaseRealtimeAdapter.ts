import type {
  GameQueryPort,
  GameRealtimePort,
  GameRevisionNotice,
  IdentityPort,
  PresenceInput,
  PresenceState,
  Unsubscribe,
} from "@TBS/application";
import { ContractValidationError } from "@TBS/common";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { normalizeSupabaseGatewayError } from "../mapping/errors";
import {
  nonEmptyString,
  nonNegativeInteger,
  record,
  sessionRole,
} from "../mapping/values";

export class SupabaseRealtimeAdapter implements GameRealtimePort {
  private readonly subscriptions = new Set<Unsubscribe>();
  private readonly presenceChannels = new Map<string, RealtimeChannel>();
  private readonly gameSubscriptions = new Map<string, Unsubscribe>();

  constructor(
    private readonly client: SupabaseClient,
    private readonly identity: IdentityPort,
    private readonly queries: GameQueryPort,
  ) {}

  private fail(error: unknown): never {
    throw normalizeSupabaseGatewayError(error);
  }

  private parseRevisionNotice(value: unknown, expectedGameId: string): GameRevisionNotice {
    const envelope = record(value, "revisionBroadcast");
    const payload = record(envelope.payload, "revisionBroadcast.payload");
    const gameId = nonEmptyString(payload.gameId, "revisionBroadcast.payload.gameId");
    if (gameId !== expectedGameId) {
      throw new ContractValidationError(
        "revisionBroadcast.payload.gameId",
        "did not match the subscribed game",
      );
    }
    return {
      gameId,
      revision: nonNegativeInteger(payload.revision, "revisionBroadcast.payload.revision"),
      actionId: nonEmptyString(payload.actionId, "revisionBroadcast.payload.actionId"),
    };
  }

  private parsePresence(channel: RealtimeChannel, expectedGameId: string): PresenceState[] {
    const state = record(channel.presenceState(), "presenceState");
    const parsed: PresenceState[] = [];
    for (const [memberId, values] of Object.entries(state)) {
      if (!Array.isArray(values)) {
        throw new ContractValidationError(`presenceState.${memberId}`, "expected an array");
      }
      for (const [index, value] of values.entries()) {
        const item = record(value, `presenceState.${memberId}[${index}]`);
        const gameId = nonEmptyString(item.gameId, `presenceState.${memberId}[${index}].gameId`);
        if (gameId !== expectedGameId) {
          throw new ContractValidationError("presenceState.gameId", "did not match the subscribed game");
        }
        const onlineAt = nonEmptyString(item.onlineAt, `presenceState.${memberId}[${index}].onlineAt`);
        if (Number.isNaN(Date.parse(onlineAt))) {
          throw new ContractValidationError("presenceState.onlineAt", "expected an ISO timestamp");
        }
        parsed.push({
          memberId: nonEmptyString(memberId, "presenceState.memberId"),
          gameId,
          displayName: nonEmptyString(
            item.displayName,
            `presenceState.${memberId}[${index}].displayName`,
          ),
          role: sessionRole(item.role, `presenceState.${memberId}[${index}].role`),
          onlineAt,
        });
      }
    }
    return parsed;
  }

  async subscribe(
    gameId: string,
    listener: (notice: GameRevisionNotice) => void,
    presenceListener?: (presence: readonly PresenceState[]) => void,
  ): Promise<Unsubscribe> {
    await this.gameSubscriptions.get(gameId)?.();
    const identity = await this.identity.getIdentity();
    await this.queries.getSnapshot(gameId);
    await this.client.realtime.setAuth();
    const channel: RealtimeChannel = this.client.channel(`game:${gameId}`, {
      config: {
        private: true,
        presence: { key: identity.userId, enabled: Boolean(presenceListener) },
      },
    });
    channel.on("broadcast", { event: "revision" }, (payload) => {
      try {
        listener(this.parseRevisionNotice(payload, gameId));
      } catch {
        // Durable reconciliation recovers malformed or missed notices.
      }
    });
    if (presenceListener) {
      channel.on("presence", { event: "sync" }, () => {
        try {
          presenceListener(this.parsePresence(channel, gameId));
        } catch {
          // A later Presence sync can recover ephemeral state.
        }
      });
    }

    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reject({
            code: "network",
            message: `Realtime subscription failed: ${status}`,
            retryable: true,
          });
        }
      });
    }).catch(async (error: unknown) => {
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
      const identity = await this.identity.getIdentity();
      const snapshot = await this.queries.getSnapshot(input.gameId);
      const role = snapshot.players.orange?.memberId === identity.userId
        ? "orange"
        : snapshot.players.purple?.memberId === identity.userId
          ? "purple"
          : "spectator";
      const channel = this.presenceChannels.get(input.gameId);
      if (!channel) {
        throw { code: "network", message: "Presence channel is not subscribed", retryable: true };
      }
      const response = await channel.track({
        gameId: input.gameId,
        displayName: nonEmptyString(input.displayName, "presence.displayName"),
        role,
        onlineAt: nonEmptyString(input.onlineAt, "presence.onlineAt"),
      });
      if (response !== "ok") {
        throw { code: "network", message: `Presence update failed: ${response}`, retryable: true };
      }
    } catch (error) {
      this.fail(error);
    }
  }

  async leave() {
    for (const unsubscribe of [...this.subscriptions]) await unsubscribe();
  }
}
