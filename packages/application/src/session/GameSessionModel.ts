import { applyStandardAction } from "@TBS/game-rules";

import type {
  CreatedGame,
  CreateGameInput,
  GameInvitePreview,
  GameSession,
  GatewayError,
  GatewayErrorCode,
  JoinIntent,
  PresenceState,
  SessionRole,
  StandardActionEnvelope,
  StandardAppliedAction,
  StandardGameSnapshot,
  SubmitActionResult,
} from "../contracts";
import { MAX_ACTION_HISTORY } from "../limits";
import type { ClockPort } from "../ports/clock";
import type { GameClient } from "../ports/game-client";
import { GameRevisionReconciler } from "./GameRevisionReconciler";
import type { ReconciliationSource } from "./GameRevisionReconciler";

export type GameConnectionState = "idle" | "loading" | "connected" | "error";
export type GameSubmitState = "idle" | "submitting";

export type OptimisticGameTransition = Readonly<{
  actionId: StandardActionEnvelope["actionId"];
  expectedRevision: number;
  snapshot: StandardGameSnapshot;
  events: StandardAppliedAction["events"];
}>;

export type GameSessionState = Readonly<{
  session: GameSession | null;
  role: SessionRole | null;
  snapshot: StandardGameSnapshot | null;
  optimisticTransition: OptimisticGameTransition | null;
  actions: readonly StandardAppliedAction[];
  presence: readonly PresenceState[];
  connectionState: GameConnectionState;
  submitState: GameSubmitState;
  error: GatewayError | null;
}>;

type StateListener = () => void;

const INITIAL_STATE: GameSessionState = {
  session: null,
  role: null,
  snapshot: null,
  optimisticTransition: null,
  actions: [],
  presence: [],
  connectionState: "idle",
  submitState: "idle",
  error: null,
};

const GATEWAY_ERROR_CODES = new Set<GatewayErrorCode>([
  "auth-unavailable",
  "game-not-found",
  "invalid-invite",
  "not-a-member",
  "spectator-read-only",
  "spectator-limit",
  "wrong-team",
  "stale-revision",
  "duplicate-action",
  "incompatible-data",
  "invalid-action",
  "network",
  "unknown",
]);

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

export const normalizeGatewayError = (value: unknown): GatewayError => {
  if (
    isRecord(value)
    && typeof value.code === "string"
    && GATEWAY_ERROR_CODES.has(value.code as GatewayErrorCode)
    && typeof value.message === "string"
    && typeof value.retryable === "boolean"
  ) {
    return {
      code: value.code as GatewayErrorCode,
      message: value.message,
      retryable: value.retryable,
    };
  }
  return {
    code: "unknown",
    message: value instanceof Error ? value.message : "The game session request failed",
    retryable: false,
  };
};

const mergeActions = (
  current: readonly StandardAppliedAction[],
  incoming: readonly StandardAppliedAction[],
): readonly StandardAppliedAction[] => {
  const actionIds = new Set(current.map((action) => action.actionId));
  const revisions = new Set(current.map((action) => action.revision));
  const merged = [...current];
  for (const action of incoming) {
    if (actionIds.has(action.actionId) || revisions.has(action.revision)) continue;
    actionIds.add(action.actionId);
    revisions.add(action.revision);
    merged.push(action);
  }
  return merged
    .sort((left, right) => left.revision - right.revision)
    .slice(-MAX_ACTION_HISTORY);
};

export class GameSessionModel {
  private state: GameSessionState = INITIAL_STATE;
  private readonly listeners = new Set<StateListener>();
  private readonly reconciler: GameRevisionReconciler;
  private operation = 0;
  private active = true;

  constructor(
    private readonly client: GameClient,
    private readonly clock: ClockPort,
  ) {
    this.reconciler = new GameRevisionReconciler(client, {
      onAction: (action) => this.publishActions([action]),
      onPresence: (presence) => this.update({ presence: [...presence] }),
      onError: (error) => this.update({
        error: normalizeGatewayError(error),
        connectionState: "error",
      }),
    });
  }

  readonly getState = (): GameSessionState => this.state;

  readonly subscribe = (listener: StateListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly createGame = (input: CreateGameInput): Promise<CreatedGame> =>
    this.connect(input.displayName, () => this.client.createGame(input));

  readonly joinGame = (
    inviteToken: string,
    intent: JoinIntent,
    displayName: string,
  ): Promise<GameSession> => this.connect(
    displayName,
    () => this.client.joinGame(inviteToken, intent, displayName),
  );

  readonly getInvitePreview = (inviteToken: string): Promise<GameInvitePreview> =>
    this.client.getInvitePreview(inviteToken);

  readonly submitAction = async (
    envelope: StandardActionEnvelope,
  ): Promise<SubmitActionResult> => {
    const session = this.state.session;
    if (!session) {
      const result: SubmitActionResult = {
        ok: false,
        error: {
          code: "not-a-member",
          message: "No game session is connected",
          retryable: false,
        },
      };
      this.update({ error: result.error });
      return result;
    }

    if (this.state.submitState === "submitting") {
      const result: SubmitActionResult = {
        ok: false,
        error: {
          code: "invalid-action",
          message: "Another action is still being submitted",
          retryable: true,
        },
      };
      this.update({ error: result.error });
      return result;
    }

    const currentOperation = this.operation;
    this.update({
      submitState: "submitting",
      error: null,
      optimisticTransition: this.createOptimisticTransition(envelope),
    });
    try {
      const result = await this.client.submitAction({ gameId: session.gameId, envelope });
      if (!this.isCurrent(currentOperation)) return result;
      if (result.ok) {
        this.settleSubmission(result.snapshot, [result.appliedAction], null);
      } else {
        this.settleSubmission(result.snapshot, [], result.error);
        if (result.error.retryable) {
          await this.reconcileRetryableSubmission(envelope.actionId, currentOperation);
        }
      }
      return result;
    } catch (error) {
      const normalized = normalizeGatewayError(error);
      if (this.isCurrent(currentOperation)) {
        this.settleSubmission(undefined, [], normalized);
        if (normalized.retryable) {
          await this.reconcileRetryableSubmission(envelope.actionId, currentOperation);
        }
      }
      return { ok: false, error: normalized };
    } finally {
      if (this.isCurrent(currentOperation)) this.update({ submitState: "idle" });
    }
  };

  readonly clearError = (): void => this.update({ error: null });

  readonly leave = async (): Promise<void> => {
    this.operation += 1;
    await this.reconciler.stop();
    await this.client.leave();
    if (this.active) this.replaceState(INITIAL_STATE);
  };

  readonly dispose = async (): Promise<void> => {
    if (!this.active) return;
    this.active = false;
    this.operation += 1;
    this.listeners.clear();
    await this.reconciler.stop();
    await this.client.leave();
  };

  private async connect<T extends GameSession>(
    displayName: string,
    request: () => Promise<T>,
  ): Promise<T> {
    const currentOperation = ++this.operation;
    this.update({ connectionState: "loading", error: null });
    try {
      const joined = await request();
      if (!this.isCurrent(currentOperation)) return joined;
      this.update({
        session: joined,
        role: joined.role,
        snapshot: joined.snapshot,
        optimisticTransition: null,
      });
      const afterRevision = Math.max(
        0,
        joined.snapshot.state.revision - MAX_ACTION_HISTORY,
      );
      const history = await this.client.getActions(joined.gameId, afterRevision);
      if (!this.isCurrent(currentOperation)) return joined;
      this.update({ actions: mergeActions([], history) });
      await this.reconciler.start(
        joined.gameId,
        (snapshot, source) => this.publishSnapshot(snapshot, source),
      );
      await this.client.updatePresence({
        gameId: joined.gameId,
        displayName,
        role: joined.role,
        onlineAt: this.clock.nowIso(),
      });
      if (this.isCurrent(currentOperation)) this.update({ connectionState: "connected" });
      return joined;
    } catch (error) {
      const normalized = normalizeGatewayError(error);
      if (this.isCurrent(currentOperation)) {
        this.update({ error: normalized, connectionState: "error" });
      }
      throw normalized;
    }
  }

  private publishSnapshot(
    snapshot: StandardGameSnapshot,
    source: ReconciliationSource = "snapshot",
  ): void {
    if (!this.active) return;
    const currentRevision = this.state.snapshot?.state.revision;
    if (currentRevision !== undefined && snapshot.state.revision < currentRevision) return;
    const optimisticTransition = this.state.optimisticTransition;
    this.update({
      snapshot,
      optimisticTransition: optimisticTransition
        && snapshot.state.revision < optimisticTransition.snapshot.state.revision
        ? optimisticTransition
        : null,
      session: this.state.session
        ? { ...this.state.session, snapshot }
        : this.state.session,
    });
    this.refreshHistory(snapshot, source);
  }

  private createOptimisticTransition(
    envelope: StandardActionEnvelope,
  ): OptimisticGameTransition | null {
    const { role, snapshot } = this.state;
    if (
      !snapshot
      || !role
      || role === "spectator"
      || envelope.expectedRevision !== snapshot.state.revision
    ) {
      return null;
    }
    const result = applyStandardAction(snapshot.state, role, envelope.action);
    if (!result.ok) return null;
    return {
      actionId: envelope.actionId,
      expectedRevision: envelope.expectedRevision,
      snapshot: { ...snapshot, state: result.state },
      events: result.events,
    };
  }

  private settleSubmission(
    snapshot: StandardGameSnapshot | undefined,
    actions: readonly StandardAppliedAction[],
    error: GatewayError | null,
  ): void {
    const currentSnapshot = this.state.snapshot;
    const acceptsSnapshot = Boolean(
      snapshot
      && (!currentSnapshot || snapshot.state.revision >= currentSnapshot.state.revision),
    );
    const canonicalSnapshot = acceptsSnapshot ? snapshot ?? null : currentSnapshot;
    this.replaceState({
      ...this.state,
      snapshot: canonicalSnapshot,
      session: this.state.session && canonicalSnapshot
        ? { ...this.state.session, snapshot: canonicalSnapshot }
        : this.state.session,
      optimisticTransition: null,
      actions: mergeActions(this.state.actions, actions),
      error,
    });
    if (acceptsSnapshot && snapshot) this.refreshHistory(snapshot, "snapshot");
  }

  private refreshHistory(
    snapshot: StandardGameSnapshot,
    source: ReconciliationSource,
  ): void {
    if (source === "replay" || snapshot.state.revision === 0) return;

    const afterRevision = Math.max(
      0,
      snapshot.state.revision - MAX_ACTION_HISTORY,
    );
    void this.client.getActions(snapshot.gameId, afterRevision).then(
      (history) => this.publishActions(history),
      (error: unknown) => this.update({ error: normalizeGatewayError(error) }),
    );
  }

  private async reconcileRetryableSubmission(
    actionId: StandardActionEnvelope["actionId"],
    operation: number,
  ): Promise<void> {
    await this.reconciler.reconcile().catch(() => undefined);
    if (
      this.isCurrent(operation)
      && this.state.actions.some((action) => action.actionId === actionId)
    ) {
      this.update({ error: null });
    }
  }

  private publishActions(actions: readonly StandardAppliedAction[]): void {
    if (this.active) this.update({ actions: mergeActions(this.state.actions, actions) });
  }

  private isCurrent(operation: number): boolean {
    return this.active && operation === this.operation;
  }

  private update(change: Partial<GameSessionState>): void {
    if (!this.active) return;
    this.replaceState({ ...this.state, ...change });
  }

  private replaceState(state: GameSessionState): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}
