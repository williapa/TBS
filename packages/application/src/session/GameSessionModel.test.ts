import {
  applyGameAction,
  createActiveGameSnapshot,
  CURRENT_GAME_PROTOCOL_VERSION,
} from "@TBS/common";
import type { AppliedAction, GameSnapshot } from "@TBS/common";
import { describe, expect, it, vi } from "vitest";

import type { GameClient } from "../ports/game-client";
import { GameSessionModel } from "./GameSessionModel";

const envelope = {
  protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
  actionId: "action-1",
  expectedRevision: 0,
  action: { action: "end" as const },
};

const sessionFor = (snapshot: GameSnapshot) => ({
  gameId: snapshot.gameId,
  memberId: "purple-member",
  role: "purple" as const,
  snapshot,
});

const clientFor = (
  snapshot: GameSnapshot,
  actions: readonly AppliedAction[] = [],
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
    const first = createActiveGameSnapshot();
    const firstResult = applyGameAction(first.state, "purple", envelope.action);
    if (!firstResult.ok) throw new Error("fixture action should be valid");
    const action: AppliedAction = {
      protocolVersion: envelope.protocolVersion,
      actionId: envelope.actionId,
      revision: firstResult.state.revision,
      actorTeam: "purple",
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
    expect(model.getState().actions.map(({ actionId }) => actionId)).toEqual(["action-1"]);
    expect(client.updatePresence).toHaveBeenCalledWith({
      gameId: snapshot.gameId,
      displayName: "Purple",
      role: "purple",
      onlineAt: "2026-08-11T12:00:00.000Z",
    });
    expect(listener).toHaveBeenCalled();
  });

  it("publishes canonical successful submissions and returns to idle", async () => {
    const snapshot = createActiveGameSnapshot();
    const reduced = applyGameAction(snapshot.state, "purple", envelope.action);
    if (!reduced.ok) throw new Error("fixture action should be valid");
    const appliedAction: AppliedAction = {
      protocolVersion: envelope.protocolVersion,
      actionId: envelope.actionId,
      revision: reduced.state.revision,
      actorTeam: "purple",
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
    const client = clientFor(createActiveGameSnapshot());
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
