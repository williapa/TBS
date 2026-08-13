import {
  applyGameAction,
  createActiveGameSnapshot,
  CURRENT_GAME_PROTOCOL_VERSION,
} from "@TBS/common";
import { describe, expect, test, vi } from "vitest";

import { SupabaseGameSessionAdapter } from "./SupabaseGameSessionAdapter";

const gameId = "active-game";
const actionId = "26000000-0000-4000-8000-000000000001";
const envelope = {
  protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
  actionId,
  expectedRevision: 0,
  action: { action: "end" as const },
};

const successResponse = () => {
  const snapshot = createActiveGameSnapshot();
  const reduced = applyGameAction(snapshot.state, "purple", envelope.action);
  if (!reduced.ok) throw new Error("test fixture action must be valid");
  return {
    ok: true as const,
    appliedAction: {
      protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
      actionId,
      revision: reduced.state.revision,
      actorTeam: "purple",
      action: envelope.action,
      events: reduced.events,
    },
    snapshot: { ...snapshot, state: reduced.state },
  };
};

describe("SupabaseGameSessionAdapter.submitAction", () => {
  test("sends intent fields only and parses the trusted result", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: successResponse(), error: null });
    const adapter = new SupabaseGameSessionAdapter(
      { functions: { invoke } } as never,
      { getIdentity: vi.fn().mockResolvedValue({ userId: "purple-member" }) },
    );

    const result = await adapter.submitAction({ gameId, envelope });

    expect(result).toMatchObject({ ok: true, snapshot: { state: { revision: 1 } } });
    expect(invoke).toHaveBeenCalledWith("submit-action", {
      body: { gameId, envelope },
    });
    expect(JSON.stringify(invoke.mock.calls[0])).not.toContain("candidate");
  });

  test("rejects malformed trusted endpoint data at the adapter boundary", async () => {
    const adapter = new SupabaseGameSessionAdapter(
      {
        functions: {
          invoke: vi.fn().mockResolvedValue({ data: { ok: true }, error: null }),
        },
      } as never,
      { getIdentity: vi.fn().mockResolvedValue({ userId: "purple-member" }) },
    );

    await expect(adapter.submitAction({ gameId, envelope })).resolves.toMatchObject({
      ok: false,
      error: { code: "incompatible-data", retryable: false },
    });
  });
});
