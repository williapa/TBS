import {
  applyStandardAction,
  STANDARD_RULESET_VERSION,
} from "@TBS/game-rules";
import { actionId, CURRENT_PROTOCOL_VERSION } from "@TBS/protocol";
import { describe, expect, it, vi } from "vitest";

import {
  createGameSnapshotFixture,
  orangeTeamId,
  purpleTeamId,
} from "../canonical-test-fixture";
import type {
  StandardAppliedAction,
  StandardGameSnapshot,
} from "../contracts";
import type { GameClient } from "../ports/game-client";
import { GameSessionModel } from "./GameSessionModel";

const envelope = {
  protocolVersion: CURRENT_PROTOCOL_VERSION,
  actionId: actionId("00000000-0000-4000-8000-000000000001"),
  expectedRevision: 0,
  rulesetVersion: STANDARD_RULESET_VERSION,
  action: { type: "end-turn" as const },
};

const sessionFor = (snapshot: StandardGameSnapshot) => ({
  gameId: snapshot.gameId,
  memberId: "purple-member",
  role: purpleTeamId,
  snapshot,
});

const clientFor = (
  snapshot: StandardGameSnapshot,
  actions: readonly StandardAppliedAction[] = [],
): GameClient => ({
  createGame: vi.fn(async () => ({
    ...sessionFor(snapshot),
    inviteToken: "invite-token",
  })),
  joinGame: vi.fn(async () => sessionFor(snapshot)),
  getSnapshot: vi.fn(async () => snapshot),
  getActions: vi.fn(async (_gameId, afterRevision) =>
    actions.filter((action) => action.revision > afterRevision)),
  submitAction: vi.fn(async () => ({
    ok: false as const,
    error: {
      code: "invalid-action" as const,
      message: "not configured",
      retryable: false,
    },
    snapshot,
  })),
  subscribe: vi.fn(async () => () => undefined),
  updatePresence: vi.fn(async () => undefined),
  leave: vi.fn(async () => undefined),
});

describe("GameSessionModel", () => {
  it("owns connection state, bounded history, and presence publication", async () => {
    const first = createGameSnapshotFixture();
    const firstResult = applyStandardAction(first.state, orangeTeamId, envelope.action);
    if (!firstResult.ok) throw new Error("fixture action should be valid");
    const action: StandardAppliedAction = {
      protocolVersion: envelope.protocolVersion,
      actionId: envelope.actionId,
      revision: firstResult.state.revision,
      actorTeamId: orangeTeamId,
      action: envelope.action,
      events: firstResult.events,
    };
    const snapshot = { ...first, state: firstResult.state };
    const client = clientFor(snapshot, [action, action]);
    const model = new GameSessionModel(client, {
      nowIso: () => "2026-08-11T12:00:00.000Z",
    });
    const listener = vi.fn();
    model.subscribe(listener);

    await model.joinGame("invite-token", "player", "Purple");

    expect(model.getState()).toMatchObject({
      role: "purple",
      connectionState: "connected",
      submitState: "idle",
    });
    expect(model.getState().actions.map(({ actionId: id }) => id)).toEqual([envelope.actionId]);
    expect(client.updatePresence).toHaveBeenCalledWith({
      gameId: snapshot.gameId,
      displayName: "Purple",
      role: "purple",
      onlineAt: "2026-08-11T12:00:00.000Z",
    });
    expect(listener).toHaveBeenCalled();
  });

  it("publishes canonical successful submissions and returns to idle", async () => {
    const snapshot = createGameSnapshotFixture();
    const reduced = applyStandardAction(snapshot.state, orangeTeamId, envelope.action);
    if (!reduced.ok) throw new Error("fixture action should be valid");
    const appliedAction: StandardAppliedAction = {
      protocolVersion: envelope.protocolVersion,
      actionId: envelope.actionId,
      revision: reduced.state.revision,
      actorTeamId: orangeTeamId,
      action: envelope.action,
      events: reduced.events,
    };
    const nextSnapshot = { ...snapshot, state: reduced.state };
    const client = clientFor(snapshot);
    client.submitAction = vi.fn(async () => ({
      ok: true as const,
      appliedAction,
      snapshot: nextSnapshot,
    }));
    const model = new GameSessionModel(client, { nowIso: () => "ignored" });
    await model.joinGame("invite-token", "player", "Purple");

    const result = await model.submitAction(envelope);

    expect(result.ok).toBe(true);
    expect(model.getState().snapshot?.state.revision).toBe(1);
    expect(model.getState().actions).toEqual([appliedAction]);
    expect(model.getState().submitState).toBe("idle");
  });

  it("normalizes connection failures and clears or resets owned state", async () => {
    const client = clientFor(createGameSnapshotFixture());
    client.joinGame = vi.fn(async () => {
      throw {
        code: "invalid-invite",
        message: "Invite not found",
        retryable: false,
      };
    });
    const model = new GameSessionModel(client, { nowIso: () => "ignored" });

    await expect(model.joinGame("bad", "player", "Purple")).rejects.toEqual({
      code: "invalid-invite",
      message: "Invite not found",
      retryable: false,
    });
    expect(model.getState().connectionState).toBe("error");
    model.clearError();
    expect(model.getState().error).toBeNull();
    await model.leave();
    expect(model.getState()).toEqual({
      session: null,
      role: null,
      snapshot: null,
      actions: [],
      presence: [],
      connectionState: "idle",
      submitState: "idle",
      error: null,
    });
  });
});
