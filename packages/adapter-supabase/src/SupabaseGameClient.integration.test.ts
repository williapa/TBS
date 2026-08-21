import { currentStandardProtocolCodec } from "@TBS/application";
import { actionId, CURRENT_PROTOCOL_VERSION } from "@TBS/protocol";
import {
  createWaitingGameStateFixture,
  runGameClientActionFamiliesContract,
  runGameClientReadContract,
  runGameClientWriteContract,
} from "@TBS/test-kit";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, test } from "vitest";

import { SupabaseIdentityAdapter } from "./identity/SupabaseIdentityAdapter";
import { SupabaseGameClient } from "./SupabaseGameClient";

const integrationConfig = () => {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("Supabase integration configuration is missing");
  return { publishableKey, url };
};

const enabled = process.env.RUN_SUPABASE_INTEGRATION === "true";
const integrationDescribe = enabled ? describe : describe.skip;

const rawClient = (storageKey: string) => {
  const { url, publishableKey } = integrationConfig();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, storageKey },
  });
};

const harness = (storagePrefix: string) => {
  const clients: SupabaseClient[] = [];
  return {
    createClient() {
      const client = rawClient(`${storagePrefix}-${clients.length}`);
      clients.push(client);
      return new SupabaseGameClient(
        client,
        currentStandardProtocolCodec,
        new SupabaseIdentityAdapter(client.auth),
      );
    },
    async cleanup() {
      await Promise.all(clients.map(async (client) => {
        await client.removeAllChannels();
        await client.auth.signOut();
      }));
    },
  };
};

runGameClientReadContract("SupabaseGameClient", () => harness("supabase-read"), enabled);
runGameClientWriteContract("SupabaseGameClient", () => harness("supabase-write"), enabled);
runGameClientActionFamiliesContract("SupabaseGameClient", () => harness("supabase-actions"), enabled);

integrationDescribe("submit-action authority", () => {
  test("rejects client candidate state without mutating canonical state", async () => {
    const orangeRaw = rawClient("authority-orange");
    const purpleRaw = rawClient("authority-purple");
    const orange = new SupabaseGameClient(
      orangeRaw,
      currentStandardProtocolCodec,
      new SupabaseIdentityAdapter(orangeRaw.auth),
    );
    const purple = new SupabaseGameClient(
      purpleRaw,
      currentStandardProtocolCodec,
      new SupabaseIdentityAdapter(purpleRaw.auth),
    );
    try {
      const initialState = createWaitingGameStateFixture();
      const created = await orange.createGame({
        displayName: "Authority orange",
        initialState,
      });
      await purple.joinGame(created.inviteToken, "player", "Authority purple");

      const attempt = await purpleRaw.functions.invoke("submit-action", {
        body: {
          gameId: created.gameId,
          envelope: {
            protocolVersion: CURRENT_PROTOCOL_VERSION,
            actionId: actionId("32000000-0000-4000-8000-000000000001"),
            expectedRevision: 0,
            rulesetVersion: initialState.rulesetVersion,
            action: { type: "end-turn" },
          },
          candidateState: { revision: 999 },
        },
      });

      expect(attempt.error).toBeNull();
      expect(attempt.data).toMatchObject({
        ok: false,
        error: { code: "invalid-action", retryable: false },
      });
      expect((await purple.getSnapshot(created.gameId)).state.revision).toBe(0);
      expect(await purple.getActions(created.gameId, 0)).toEqual([]);
    } finally {
      await Promise.all([
        orange.leave(),
        purple.leave(),
        orangeRaw.auth.signOut(),
        purpleRaw.auth.signOut(),
      ]);
    }
  });
});
