import type {
  CreateGameInput,
  GameClient,
  GameRevisionNotice,
  IdentityPort,
  JoinIntent,
  PresenceInput,
  PresenceState,
  StandardProtocolCodec,
  SubmitActionInput,
  Unsubscribe,
} from "@TBS/application";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SupabaseIdentityAdapter } from "./identity/SupabaseIdentityAdapter";
import { SupabaseRealtimeAdapter } from "./realtime/SupabaseRealtimeAdapter";
import { SupabaseGameSessionAdapter } from "./sessions/SupabaseGameSessionAdapter";

export class SupabaseGameClient implements GameClient {
  readonly sessions: SupabaseGameSessionAdapter;
  readonly realtime: SupabaseRealtimeAdapter;

  constructor(
    client: SupabaseClient,
    codec: StandardProtocolCodec,
    identity: IdentityPort = new SupabaseIdentityAdapter(client.auth),
  ) {
    this.sessions = new SupabaseGameSessionAdapter(client, identity, codec);
    this.realtime = new SupabaseRealtimeAdapter(client, identity, this.sessions, codec);
  }

  createGame(input: CreateGameInput) {
    return this.sessions.createGame(input);
  }

  joinGame(inviteToken: string, intent: JoinIntent, displayName: string) {
    return this.sessions.joinGame(inviteToken, intent, displayName);
  }

  getInvitePreview(inviteToken: string) {
    return this.sessions.getInvitePreview(inviteToken);
  }

  getSnapshot(gameId: string) {
    return this.sessions.getSnapshot(gameId);
  }

  getActions(gameId: string, afterRevision: number) {
    return this.sessions.getActions(gameId, afterRevision);
  }

  submitAction(input: SubmitActionInput) {
    return this.sessions.submitAction(input);
  }

  subscribe(
    gameId: string,
    listener: (notice: GameRevisionNotice) => void,
    presenceListener?: (presence: readonly PresenceState[]) => void,
  ): Promise<Unsubscribe> {
    return this.realtime.subscribe(gameId, listener, presenceListener);
  }

  updatePresence(input: PresenceInput) {
    return this.realtime.updatePresence(input);
  }

  leave() {
    return this.realtime.leave();
  }
}
