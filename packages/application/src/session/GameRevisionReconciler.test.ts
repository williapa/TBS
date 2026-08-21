import { applyStandardAction } from "@TBS/game-rules";
import { actionId, CURRENT_PROTOCOL_VERSION } from "@TBS/protocol";
import { describe, expect, it } from "vitest";

import { createGameSnapshotFixture } from "../canonical-test-fixture";
import type {
  GameRevisionNotice,
  StandardAppliedAction,
  StandardGameSnapshot,
} from "../contracts";
import { GameRevisionReconciler } from "./GameRevisionReconciler";

const gameId = "application-reconciliation-game";
const initialSnapshot = (): StandardGameSnapshot => ({ ...createGameSnapshotFixture(), gameId });
const actionIdFor = (revision: number) => actionId(
  `00000000-0000-4000-8000-${revision.toString().padStart(12, "0")}`,
);

const buildHistory = (count: number) => {
  const actions: StandardAppliedAction[] = [];
  let snapshot = initialSnapshot();
  for (let index = 1; index <= count; index += 1) {
    if (snapshot.state.lifecycle.phase !== "active") throw new Error("fixture game should be active");
    const actorTeamId = snapshot.state.lifecycle.activeTeamId;
    const result = applyStandardAction(snapshot.state, actorTeamId, { type: "end-turn" });
    if (!result.ok) throw new Error("fixture action should be valid");
    actions.push({
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      actionId: actionIdFor(index),
      revision: index,
      actorTeamId,
      action: { type: "end-turn" },
      events: result.events,
    });
    snapshot = { ...snapshot, state: result.state };
  }
  return { actions, snapshot };
};

class ReconciliationPort {
  listener?: (notice: GameRevisionNotice) => void;
  actions: readonly StandardAppliedAction[] = [];
  snapshotCalls = 0;
  unsubscribeCalls = 0;

  constructor(
    readonly initial: StandardGameSnapshot,
    readonly canonical: StandardGameSnapshot,
    readonly onSubscribe?: () => void,
  ) {}

  async getSnapshot() {
    this.snapshotCalls += 1;
    return this.snapshotCalls === 1 ? this.initial : this.canonical;
  }

  async getActions(_gameId: string, afterRevision: number) {
    return this.actions.filter(({ revision }) => revision > afterRevision);
  }

  async subscribe(_gameId: string, listener: (notice: GameRevisionNotice) => void) {
    this.listener = listener;
    this.onSubscribe?.();
    return () => {
      this.unsubscribeCalls += 1;
      this.listener = undefined;
    };
  }

  notice(revision: number) {
    this.listener?.({ gameId, revision, actionId: actionIdFor(revision) });
  }
}

describe("GameRevisionReconciler", () => {
  it("recovers dropped and out-of-order notices and ignores delayed duplicates", async () => {
    const history = buildHistory(3);
    const port = new ReconciliationPort(initialSnapshot(), history.snapshot);
    const revisions: number[] = [];
    const reconciler = new GameRevisionReconciler(port);
    const stop = await reconciler.start(gameId, ({ state }) => revisions.push(state.revision));

    port.actions = history.actions;
    port.notice(3);
    port.notice(2);
    port.notice(1);
    port.notice(3);
    await reconciler.reconcile();

    expect(revisions).toEqual([0, 1, 2, 3]);
    expect(reconciler.snapshot).toEqual(history.snapshot);
    await stop();
    await stop();
    expect(port.unsubscribeCalls).toBe(1);
  });

  it("closes the initial snapshot/subscription race from durable history", async () => {
    const history = buildHistory(2);
    const port = new ReconciliationPort(
      initialSnapshot(),
      history.snapshot,
      () => { port.actions = history.actions; },
    );
    const reconciler = new GameRevisionReconciler(port);

    await reconciler.start(gameId, () => undefined);

    expect(reconciler.snapshot).toEqual(history.snapshot);
    await reconciler.stop();
  });

  it("starts a returning client from its canonical revision", async () => {
    const history = buildHistory(3);
    const port = new ReconciliationPort(history.snapshot, history.snapshot);
    port.actions = history.actions;
    const revisions: number[] = [];
    const reconciler = new GameRevisionReconciler(port);

    await reconciler.start(gameId, ({ state }) => revisions.push(state.revision));

    expect(revisions).toEqual([3]);
    expect(reconciler.snapshot).toEqual(history.snapshot);
    await reconciler.stop();
  });

  it("skips replay and falls back for an oversized revision gap", async () => {
    const history = buildHistory(3);
    const port = new ReconciliationPort(initialSnapshot(), history.snapshot);
    const reconciler = new GameRevisionReconciler(port, { maxReplayGap: 2 });
    await reconciler.start(gameId, () => undefined);

    port.notice(3);
    await reconciler.reconcile();

    expect(reconciler.snapshot).toEqual(history.snapshot);
    expect(port.snapshotCalls).toBe(2);
    await reconciler.stop();
  });

  it("falls back to canonical state when replayed events do not match", async () => {
    const history = buildHistory(1);
    const port = new ReconciliationPort(initialSnapshot(), history.snapshot);
    port.actions = [{ ...history.actions[0], events: [] }];
    const sources: string[] = [];
    const reconciler = new GameRevisionReconciler(port);

    await reconciler.start(gameId, (_snapshot, source) => sources.push(source));

    expect(reconciler.snapshot).toEqual(history.snapshot);
    expect(sources).toEqual(["initial", "snapshot"]);
    expect(port.snapshotCalls).toBe(2);
    await reconciler.stop();
  });

  it("rejects invalid replay limits at construction", () => {
    const snapshot = initialSnapshot();
    expect(() => new GameRevisionReconciler(
      new ReconciliationPort(snapshot, snapshot),
      { maxReplayGap: 0 },
    )).toThrow("positive integer");
  });
});
