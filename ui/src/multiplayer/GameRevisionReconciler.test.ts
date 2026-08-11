import {
  applyGameAction,
  AppliedAction,
  createActiveGameSnapshot,
  CURRENT_GAME_PROTOCOL_VERSION,
  GameSnapshot,
  TeamOption,
} from "@TBS/common";
import { GameRevisionReconciler, ReconciliationSource } from "./GameRevisionReconciler";
import { GameRevisionNotice } from "./GameSessionGateway";

const gameId = "reconciliation-game";
const initialSnapshot = (): GameSnapshot => ({ ...createActiveGameSnapshot(), gameId });

const buildHistory = (count: number) => {
  const actions: AppliedAction[] = [];
  let snapshot = initialSnapshot();
  for (let index = 1; index <= count; index += 1) {
    const actorTeam = snapshot.state.activeTeam as TeamOption;
    const result = applyGameAction(snapshot.state, actorTeam, { action: "end" });
    if (!result.ok) throw new Error(result.message);
    const applied: AppliedAction = {
      protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
      actionId: `action-${index}`,
      revision: index,
      actorTeam,
      action: { action: "end" },
      events: result.events,
    };
    actions.push(applied);
    snapshot = { ...snapshot, state: result.state };
  }
  return { actions, snapshot };
};

class ReconciliationGateway {
  listener?: (notice: GameRevisionNotice) => void;
  snapshotCalls = 0;
  actionCalls = 0;
  unsubscribed = 0;

  constructor(
    readonly initial: GameSnapshot,
    public canonical: GameSnapshot,
    public actions: AppliedAction[],
    readonly onSubscribe?: () => void
  ) {}

  async getSnapshot() {
    this.snapshotCalls += 1;
    return this.snapshotCalls === 1 ? this.initial : this.canonical;
  }

  async getActions(_gameId: string, afterRevision: number) {
    this.actionCalls += 1;
    return this.actions.filter((action) => action.revision > afterRevision);
  }

  async subscribe(_gameId: string, listener: (notice: GameRevisionNotice) => void) {
    this.listener = listener;
    this.onSubscribe?.();
    return () => { this.unsubscribed += 1; this.listener = undefined; };
  }

  notice(revision: number) {
    this.listener?.({ gameId, revision, actionId: `action-${revision}` });
  }
}

const waitForRevision = async (reconciler: GameRevisionReconciler, revision: number) => {
  const deadline = Date.now() + 1_000;
  while (reconciler.snapshot?.state.revision !== revision) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for revision ${revision}`);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

describe("GameRevisionReconciler", () => {
  test("recovers dropped and out-of-order notices, then ignores delayed duplicates", async () => {
    const history = buildHistory(3);
    const gateway = new ReconciliationGateway(initialSnapshot(), history.snapshot, []);
    const updates: Array<[number, ReconciliationSource]> = [];
    const reconciler = new GameRevisionReconciler(gateway);
    const stop = await reconciler.start(gameId, (snapshot, source) => updates.push([snapshot.state.revision, source]));

    gateway.actions = history.actions;
    gateway.notice(3); // notices 1 and 2 were dropped
    gateway.notice(2); // out of order
    await waitForRevision(reconciler, 3);
    gateway.notice(1); // delayed duplicate
    gateway.notice(3); // duplicate
    await reconciler.reconcile();

    expect(updates).toEqual([[0, "initial"], [1, "replay"], [2, "replay"], [3, "replay"]]);
    expect(reconciler.snapshot).toEqual(history.snapshot);
    await stop();
    await stop();
    expect(gateway.unsubscribed).toBe(1);
  });

  test("closes the initial snapshot/subscription race without needing a notice", async () => {
    const history = buildHistory(2);
    let gateway: ReconciliationGateway;
    gateway = new ReconciliationGateway(initialSnapshot(), history.snapshot, [], () => {
      gateway.actions = history.actions;
    });
    const reconciler = new GameRevisionReconciler(gateway);
    await reconciler.start(gameId, () => {});

    expect(reconciler.snapshot).toEqual(history.snapshot);
    expect(gateway.actionCalls).toBe(1);
    await reconciler.stop();
  });

  test("starts a returning tab from the canonical snapshot before subscribing", async () => {
    const history = buildHistory(3);
    const gateway = new ReconciliationGateway(history.snapshot, history.snapshot, history.actions);
    const updates: number[] = [];
    const reconciler = new GameRevisionReconciler(gateway);
    await reconciler.start(gameId, (snapshot) => updates.push(snapshot.state.revision));

    expect(updates).toEqual([3]);
    expect(reconciler.snapshot).toEqual(history.snapshot);
    await reconciler.stop();
  });

  test("falls back to canonical snapshots for corrupt replay and oversized gaps", async () => {
    const history = buildHistory(3);
    const corrupt = history.actions.map((action, index) => index === 0 ? { ...action, events: [] } : action);
    const corruptGateway = new ReconciliationGateway(initialSnapshot(), history.snapshot, corrupt);
    const corruptSources: ReconciliationSource[] = [];
    const corruptReconciler = new GameRevisionReconciler(corruptGateway);
    await corruptReconciler.start(gameId, (_snapshot, source) => corruptSources.push(source));
    corruptGateway.notice(3);
    await waitForRevision(corruptReconciler, 3);
    expect(corruptSources).toEqual(["initial", "snapshot"]);
    expect(corruptGateway.snapshotCalls).toBe(2);
    await corruptReconciler.stop();

    const gapGateway = new ReconciliationGateway(initialSnapshot(), history.snapshot, []);
    const gapReconciler = new GameRevisionReconciler(gapGateway, { maxReplayGap: 2 });
    await gapReconciler.start(gameId, () => {});
    gapGateway.notice(3);
    await waitForRevision(gapReconciler, 3);
    expect(gapGateway.actionCalls).toBe(1); // initial race check only; the large notice gap skips replay
    expect(gapGateway.snapshotCalls).toBe(2);
    await gapReconciler.stop();
  });
});
