import { applyStandardAction } from "@TBS/game-rules";

import type {
  GameRevisionNotice,
  PresenceState,
  StandardAppliedAction,
  StandardGameSnapshot,
  Unsubscribe,
} from "../contracts";
import { MAX_REPLAY_GAP } from "../limits";
import type { GameQueryPort } from "../ports/query";
import type { GameRealtimePort } from "../ports/realtime";

type ReconciliationPort = Pick<GameQueryPort, "getActions" | "getSnapshot">
  & Pick<GameRealtimePort, "subscribe">;

export type ReconciliationSource = "initial" | "replay" | "snapshot";
export type ReconciliationListener = (
  snapshot: StandardGameSnapshot,
  source: ReconciliationSource,
) => void;
export type GameRevisionReconcilerOptions = Readonly<{
  maxReplayGap?: number;
  onAction?: (action: StandardAppliedAction) => void;
  onPresence?: (presence: readonly PresenceState[]) => void;
  onError?: (error: unknown) => void;
}>;

const sameValue = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

export class GameRevisionReconciler {
  private readonly maxReplayGap: number;
  private readonly onAction?: (action: StandardAppliedAction) => void;
  private readonly onPresence?: (presence: readonly PresenceState[]) => void;
  private readonly onError?: (error: unknown) => void;
  private current?: StandardGameSnapshot;
  private gameId?: string;
  private listener?: ReconciliationListener;
  private unsubscribe?: Unsubscribe;
  private queue: Promise<void> = Promise.resolve();
  private generation = 0;

  constructor(private readonly port: ReconciliationPort, options: GameRevisionReconcilerOptions = {}) {
    this.maxReplayGap = options.maxReplayGap ?? MAX_REPLAY_GAP;
    this.onAction = options.onAction;
    this.onPresence = options.onPresence;
    this.onError = options.onError;
    if (!Number.isInteger(this.maxReplayGap) || this.maxReplayGap < 1) {
      throw new Error("maxReplayGap must be a positive integer");
    }
  }

  get snapshot() { return this.current; }

  async start(gameId: string, listener: ReconciliationListener): Promise<Unsubscribe> {
    await this.stop();
    const generation = ++this.generation;
    const initial = await this.port.getSnapshot(gameId);
    if (initial.gameId !== gameId) throw new Error("snapshot game ID did not match the requested game");
    if (generation !== this.generation) return async () => undefined;

    this.gameId = gameId;
    this.current = initial;
    this.listener = listener;
    this.unsubscribe = await this.port.subscribe(gameId, (notice) => {
      if (generation !== this.generation || notice.gameId !== gameId) return;
      this.enqueue(() => this.reconcileNotice(notice, generation));
    }, (presence) => {
      if (generation === this.generation) this.onPresence?.(presence);
    });
    if (generation !== this.generation) {
      await this.unsubscribe();
      return async () => undefined;
    }

    listener(initial, "initial");
    await this.enqueue(() => this.reconcileFromHistory(undefined, generation));
    let active = true;
    return async () => {
      if (!active) return;
      active = false;
      await this.stop();
    };
  }

  async reconcile(): Promise<void> {
    const generation = this.generation;
    await this.enqueue(() => this.reconcileFromHistory(undefined, generation));
  }

  async stop(): Promise<void> {
    this.generation += 1;
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = undefined;
    this.gameId = undefined;
    this.current = undefined;
    this.listener = undefined;
    this.queue = Promise.resolve();
    if (unsubscribe) await unsubscribe();
  }

  private enqueue(work: () => Promise<void>) {
    const next = this.queue.then(work);
    this.queue = next.catch((error: unknown) => { this.onError?.(error); });
    return next;
  }

  private async reconcileNotice(notice: GameRevisionNotice, generation: number) {
    if (!this.current || notice.revision <= this.current.state.revision) return;
    await this.reconcileFromHistory(notice.revision, generation);
  }

  private async reconcileFromHistory(targetRevision: number | undefined, generation: number) {
    const current = this.current;
    const gameId = this.gameId;
    if (!current || !gameId || generation !== this.generation) return;
    if (targetRevision !== undefined && targetRevision <= current.state.revision) return;
    if (targetRevision !== undefined && targetRevision - current.state.revision > this.maxReplayGap) {
      await this.fallbackToSnapshot(generation);
      return;
    }

    let actions: readonly StandardAppliedAction[];
    try {
      actions = await this.port.getActions(gameId, current.state.revision);
    } catch {
      await this.fallbackToSnapshot(generation);
      return;
    }
    if (generation !== this.generation) return;
    if (actions.length > this.maxReplayGap) {
      await this.fallbackToSnapshot(generation);
      return;
    }

    for (const action of actions) {
      if (!this.current || generation !== this.generation) return;
      if (action.revision <= this.current.state.revision) continue;
      if (action.revision !== this.current.state.revision + 1 || !this.replay(action)) {
        await this.fallbackToSnapshot(generation);
        return;
      }
    }
    if (targetRevision !== undefined && (!this.current || this.current.state.revision < targetRevision)) {
      await this.fallbackToSnapshot(generation);
    }
  }

  private replay(action: StandardAppliedAction) {
    if (!this.current) return false;
    const result = applyStandardAction(this.current.state, action.actorTeamId, action.action);
    if (!result.ok || result.state.revision !== action.revision || !sameValue(result.events, action.events)) return false;
    this.current = { ...this.current, state: result.state };
    this.onAction?.(action);
    this.listener?.(this.current, "replay");
    return true;
  }

  private async fallbackToSnapshot(generation: number) {
    const gameId = this.gameId;
    if (!gameId) return;
    const snapshot = await this.port.getSnapshot(gameId);
    if (generation !== this.generation) return;
    if (snapshot.gameId !== gameId) throw new Error("snapshot game ID did not match the reconciled game");
    if (!this.current || snapshot.state.revision >= this.current.state.revision) {
      this.current = snapshot;
      this.listener?.(snapshot, "snapshot");
    }
  }
}
