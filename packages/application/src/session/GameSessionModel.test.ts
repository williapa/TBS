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
  memberId: "orange-member",
  role: orangeTeamId,
  snapshot,
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
};

const clientFor = (
  snapshot: StandardGameSnapshot,
  actions: readonly StandardAppliedAction[] = [],
): GameClient => ({
  createGame: vi.fn(async () => ({
    ...sessionFor(snapshot),
    inviteToken: "invite-token",
  })),
  joinGame: vi.fn(async () => sessionFor(snapshot)),
  getInvitePreview: vi.fn(async () => ({
    creatorDisplayName: "Orange",
    gameId: snapshot.gameId,
    mapName: "Model battlefield",
    state: snapshot.state,
  })),
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
  it("loads an invite preview without connecting a session", async () => {
    const snapshot = createGameSnapshotFixture();
    const client = clientFor(snapshot);
    const model = new GameSessionModel(client, { nowIso: () => "ignored" });

    await expect(model.getInvitePreview("invite-token")).resolves.toEqual({
      creatorDisplayName: "Orange",
      gameId: snapshot.gameId,
      mapName: "Model battlefield",
      state: snapshot.state,
    });
    expect(model.getState()).toMatchObject({
      connectionState: "idle",
      session: null,
    });
  });

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

    await model.joinGame("invite-token", "player", "Orange");

    expect(model.getState()).toMatchObject({
      role: "orange",
      connectionState: "connected",
      submitState: "idle",
    });
    expect(model.getState().actions.map(({ actionId: id }) => id)).toEqual([envelope.actionId]);
    expect(client.updatePresence).toHaveBeenCalledWith({
      gameId: snapshot.gameId,
      displayName: "Orange",
      role: "orange",
      onlineAt: "2026-08-11T12:00:00.000Z",
    });
    expect(listener).toHaveBeenCalled();
  });

  it("publishes an optimistic transition immediately and settles it after acceptance", async () => {
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
    const submission = deferred<Awaited<ReturnType<GameClient["submitAction"]>>>();
    client.submitAction = vi.fn(() => submission.promise);
    const model = new GameSessionModel(client, { nowIso: () => "ignored" });
    await model.joinGame("invite-token", "player", "Orange");

    const resultPromise = model.submitAction(envelope);

    expect(model.getState().snapshot?.state.revision).toBe(0);
    expect(model.getState().optimisticTransition).toMatchObject({
      actionId: envelope.actionId,
      expectedRevision: 0,
      snapshot: { state: { revision: 1 } },
      events: reduced.events,
    });
    expect(model.getState().submitState).toBe("submitting");

    submission.resolve({
      ok: true as const,
      appliedAction,
      snapshot: nextSnapshot,
    });
    const result = await resultPromise;

    expect(result.ok).toBe(true);
    expect(model.getState().snapshot?.state.revision).toBe(1);
    expect(model.getState().optimisticTransition).toBeNull();
    expect(model.getState().actions).toEqual([appliedAction]);
    expect(model.getState().submitState).toBe("idle");
  });

  it("rolls back the optimistic transition when the server rejects the action", async () => {
    const snapshot = createGameSnapshotFixture();
    const reduced = applyStandardAction(snapshot.state, orangeTeamId, envelope.action);
    if (!reduced.ok) throw new Error("fixture action should be valid");
    const client = clientFor(snapshot);
    const submission = deferred<Awaited<ReturnType<GameClient["submitAction"]>>>();
    client.submitAction = vi.fn(() => submission.promise);
    const model = new GameSessionModel(client, { nowIso: () => "ignored" });
    await model.joinGame("invite-token", "player", "Orange");

    const resultPromise = model.submitAction(envelope);
    expect(model.getState().optimisticTransition?.snapshot.state).toEqual(reduced.state);

    submission.resolve({
      ok: false,
      error: {
        code: "invalid-action",
        message: "The server rejected the move",
        retryable: false,
      },
      snapshot,
    });
    const result = await resultPromise;

    expect(result.ok).toBe(false);
    expect(model.getState()).toMatchObject({
      snapshot: { state: { revision: 0 } },
      optimisticTransition: null,
      submitState: "idle",
      error: { code: "invalid-action", message: "The server rejected the move" },
    });
    expect(model.getState().actions).toEqual([]);
  });

  it("reconciles an accepted action when the submission response is lost", async () => {
    const initial = createGameSnapshotFixture();
    const reduced = applyStandardAction(initial.state, orangeTeamId, envelope.action);
    if (!reduced.ok) throw new Error("fixture action should be valid");
    const appliedAction: StandardAppliedAction = {
      protocolVersion: envelope.protocolVersion,
      actionId: envelope.actionId,
      revision: reduced.state.revision,
      actorTeamId: orangeTeamId,
      action: envelope.action,
      events: reduced.events,
    };
    let history: readonly StandardAppliedAction[] = [];
    const client = clientFor(initial);
    client.getActions = vi.fn(async (_gameId, afterRevision) =>
      history.filter(({ revision }) => revision > afterRevision));
    client.submitAction = vi.fn(async () => ({
      ok: false as const,
      error: {
        code: "network" as const,
        message: "The response was lost",
        retryable: true,
      },
    }));
    const model = new GameSessionModel(client, { nowIso: () => "ignored" });
    await model.joinGame("invite-token", "player", "Orange");
    history = [appliedAction];

    const result = await model.submitAction(envelope);

    expect(result.ok).toBe(false);
    expect(model.getState().snapshot?.state.revision).toBe(1);
    expect(model.getState().optimisticTransition).toBeNull();
    expect(model.getState().actions).toEqual([appliedAction]);
    expect(model.getState().error).toBeNull();
    expect(model.getState().submitState).toBe("idle");
  });

  it("does not let a delayed submission response regress newer reconciled state", async () => {
    const initial = createGameSnapshotFixture();
    const firstResult = applyStandardAction(initial.state, orangeTeamId, envelope.action);
    if (!firstResult.ok) throw new Error("first fixture action should be valid");
    const firstAction: StandardAppliedAction = {
      protocolVersion: envelope.protocolVersion,
      actionId: envelope.actionId,
      revision: 1,
      actorTeamId: orangeTeamId,
      action: envelope.action,
      events: firstResult.events,
    };
    const secondEnvelope = {
      ...envelope,
      actionId: actionId("00000000-0000-4000-8000-000000000002"),
      expectedRevision: 1,
    };
    const secondResult = applyStandardAction(firstResult.state, purpleTeamId, secondEnvelope.action);
    if (!secondResult.ok) throw new Error("second fixture action should be valid");
    const secondAction: StandardAppliedAction = {
      protocolVersion: secondEnvelope.protocolVersion,
      actionId: secondEnvelope.actionId,
      revision: 2,
      actorTeamId: purpleTeamId,
      action: secondEnvelope.action,
      events: secondResult.events,
    };
    const client = clientFor(initial);
    let revisionListener: ((notice: Parameters<Parameters<GameClient["subscribe"]>[1]>[0]) => void) | undefined;
    let history: readonly StandardAppliedAction[] = [];
    client.getActions = vi.fn(async (_gameId, afterRevision) =>
      history.filter(({ revision }) => revision > afterRevision));
    client.subscribe = vi.fn(async (_gameId, listener) => {
      revisionListener = listener;
      return () => undefined;
    });
    const submission = deferred<Awaited<ReturnType<GameClient["submitAction"]>>>();
    client.submitAction = vi.fn(() => submission.promise);
    const model = new GameSessionModel(client, { nowIso: () => "ignored" });
    await model.joinGame("invite-token", "player", "Orange");

    const resultPromise = model.submitAction(envelope);
    history = [firstAction, secondAction];
    revisionListener?.({
      gameId: initial.gameId,
      revision: 2,
      actionId: secondAction.actionId,
    });
    await vi.waitFor(() => expect(model.getState().snapshot?.state.revision).toBe(2));

    submission.resolve({
      ok: true,
      appliedAction: firstAction,
      snapshot: { ...initial, state: firstResult.state },
    });
    await resultPromise;

    expect(model.getState().snapshot?.state.revision).toBe(2);
    expect(model.getState().optimisticTransition).toBeNull();
    expect(model.getState().actions.map(({ revision }) => revision)).toEqual([1, 2]);
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
      optimisticTransition: null,
      actions: [],
      presence: [],
      connectionState: "idle",
      submitState: "idle",
      error: null,
    });
  });
});
