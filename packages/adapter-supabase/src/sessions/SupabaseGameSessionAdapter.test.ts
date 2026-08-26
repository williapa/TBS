import { currentStandardProtocolCodec } from "@TBS/application";
import { applyStandardAction, STANDARD_RULESET_VERSION } from "@TBS/game-rules";
import { actionId, CURRENT_PROTOCOL_VERSION } from "@TBS/protocol";
import {
  createGameSnapshotFixture,
} from "@TBS/test-kit";
import { describe, expect, test, vi } from "vitest";

import { SupabaseGameSessionAdapter } from "./SupabaseGameSessionAdapter";

const gameId = "active-game";
const envelope = {
  protocolVersion: CURRENT_PROTOCOL_VERSION,
  actionId: actionId("26000000-0000-4000-8000-000000000001"),
  expectedRevision: 0,
  rulesetVersion: STANDARD_RULESET_VERSION,
  action: { type: "end-turn" as const },
};

const successResponse = () => {
  const snapshot = createGameSnapshotFixture();
  if (snapshot.state.lifecycle.phase !== "active") throw new Error("fixture game must be active");
  const actorTeamId = snapshot.state.lifecycle.activeTeamId;
  const reduced = applyStandardAction(snapshot.state, actorTeamId, envelope.action);
  if (!reduced.ok) throw new Error("test fixture action must be valid");
  return {
    ok: true as const,
    appliedAction: {
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      actionId: envelope.actionId,
      revision: reduced.state.revision,
      actorTeamId,
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
      { getIdentity: vi.fn().mockResolvedValue({ userId: "member-orange" }) },
      currentStandardProtocolCodec,
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
      { getIdentity: vi.fn().mockResolvedValue({ userId: "member-orange" }) },
      currentStandardProtocolCodec,
    );

    await expect(adapter.submitAction({ gameId, envelope })).resolves.toMatchObject({
      ok: false,
      error: { code: "incompatible-data", retryable: false },
    });
  });
});

describe("SupabaseGameSessionAdapter.getInvitePreview", () => {
  test("parses bounded canonical state without requesting membership data", async () => {
    const snapshot = createGameSnapshotFixture();
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        creator_display_name: "Orange",
        game_id: snapshot.gameId,
        map_name: "Forest crossing",
        state: snapshot.state,
      }],
      error: null,
    });
    const adapter = new SupabaseGameSessionAdapter(
      { rpc } as never,
      { getIdentity: vi.fn().mockResolvedValue({ userId: "preview-visitor" }) },
      currentStandardProtocolCodec,
    );

    await expect(adapter.getInvitePreview("invite-token")).resolves.toEqual({
      creatorDisplayName: "Orange",
      gameId: snapshot.gameId,
      mapName: "Forest crossing",
      state: snapshot.state,
    });
    expect(rpc).toHaveBeenCalledWith("get_game_invite_preview", {
      invite_token: "invite-token",
    });
  });

  test("rejects malformed preview state at the adapter boundary", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        creator_display_name: "Orange",
        game_id: "preview-game",
        map_name: "Forest crossing",
        state: { revision: "invalid" },
      }],
      error: null,
    });
    const adapter = new SupabaseGameSessionAdapter(
      { rpc } as never,
      { getIdentity: vi.fn().mockResolvedValue({ userId: "preview-visitor" }) },
      currentStandardProtocolCodec,
    );

    await expect(adapter.getInvitePreview("invite-token")).rejects.toMatchObject({
      code: "incompatible-data",
    });
  });
});
