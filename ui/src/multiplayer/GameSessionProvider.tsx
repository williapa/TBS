import { ActionEnvelope, AppliedAction, GameSnapshot } from "@TBS/common";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GameRevisionReconciler, ReconciliationSource } from "./GameRevisionReconciler";
import {
  CreatedGame,
  CreateGameInput,
  GameSession,
  GatewayError,
  JoinIntent,
  PresenceState,
  SessionRole,
  SubmitActionResult,
} from "./GameSessionGateway";
import { useGameSessionGateway } from "./GameSessionGatewayContext";
import { MAX_ACTION_HISTORY } from "../productLimits";

export type GameConnectionState = "idle" | "loading" | "connected" | "error";
export type GameSubmitState = "idle" | "submitting";

export type GameSessionContextValue = {
  session: GameSession | null;
  role: SessionRole | null;
  snapshot: GameSnapshot | null;
  actions: AppliedAction[];
  presence: PresenceState[];
  connectionState: GameConnectionState;
  submitState: GameSubmitState;
  error: GatewayError | null;
  createGame(input: CreateGameInput): Promise<CreatedGame>;
  joinGame(inviteToken: string, intent: JoinIntent, displayName: string): Promise<GameSession>;
  submitAction(envelope: ActionEnvelope): Promise<SubmitActionResult>;
  clearError(): void;
  leave(): Promise<void>;
};

const unknownError = (value: unknown): GatewayError => {
  if (typeof value === "object" && value !== null) {
    const candidate = value as Partial<GatewayError>;
    if (typeof candidate.code === "string" && typeof candidate.message === "string" && typeof candidate.retryable === "boolean") {
      return candidate as GatewayError;
    }
  }
  return {
    code: "unknown",
    message: value instanceof Error ? value.message : "The game session request failed",
    retryable: false,
  };
};

const GameSessionContext = createContext<GameSessionContextValue | null>(null);
const mergeActions = (current: AppliedAction[], incoming: AppliedAction[]) => {
  const actionIds = new Set(current.map((action) => action.actionId));
  const revisions = new Set(current.map((action) => action.revision));
  const merged = [...current];
  incoming.forEach((action) => {
    if (actionIds.has(action.actionId) || revisions.has(action.revision)) return;
    actionIds.add(action.actionId);
    revisions.add(action.revision);
    merged.push(action);
  });
  return merged
    .sort((left, right) => left.revision - right.revision)
    .slice(-MAX_ACTION_HISTORY);
};

export const useGameSession = () => {
  const value = useContext(GameSessionContext);
  if (!value) throw new Error("GameSessionProvider is missing");
  return value;
};

export const GameSessionProvider = ({ children }: { children: ReactNode }) => {
  const gateway = useGameSessionGateway();
  const [session, setSession] = useState<GameSession | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [actions, setActions] = useState<AppliedAction[]>([]);
  const [presence, setPresence] = useState<PresenceState[]>([]);
  const [connectionState, setConnectionState] = useState<GameConnectionState>("idle");
  const [submitState, setSubmitState] = useState<GameSubmitState>("idle");
  const [error, setError] = useState<GatewayError | null>(null);
  const mounted = useRef(true);
  const operation = useRef(0);
  const publishAction = useCallback((action: AppliedAction) => {
    if (mounted.current) setActions((current) => mergeActions(current, [action]));
  }, []);
  const reconciler = useMemo(() => new GameRevisionReconciler(gateway, {
    onAction: publishAction,
    onPresence: (next) => { if (mounted.current) setPresence(next); },
    onError: (value) => {
      if (!mounted.current) return;
      setError(unknownError(value));
      setConnectionState("error");
    },
  }), [gateway, publishAction]);

  const publishSnapshot = useCallback((next: GameSnapshot, source: ReconciliationSource = "snapshot") => {
    if (!mounted.current) return;
    setSnapshot(next);
    setSession((current) => current ? { ...current, snapshot: next } : current);
    if (source === "replay" || next.state.revision === 0) return;

    // Snapshot fallback/initialization can advance the board without replaying
    // each action. Backfill the bounded canonical history so event rows advance
    // with the board even when a Realtime notice was missed or raced startup.
    const afterRevision = Math.max(0, next.state.revision - MAX_ACTION_HISTORY);
    void gateway.getActions(next.gameId, afterRevision).then((history) => {
      if (mounted.current) setActions((current) => mergeActions(current, history));
    }).catch((value) => {
      if (mounted.current) setError(unknownError(value));
    });
  }, [gateway]);

  const connect = useCallback(async <T extends GameSession>(displayName: string, request: () => Promise<T>): Promise<T> => {
    const currentOperation = ++operation.current;
    setConnectionState("loading");
    setError(null);
    try {
      const joined = await request();
      if (!mounted.current || currentOperation !== operation.current) return joined;
      setSession(joined);
      setSnapshot(joined.snapshot);
      const afterRevision = Math.max(0, joined.snapshot.state.revision - MAX_ACTION_HISTORY);
      const history = await gateway.getActions(joined.gameId, afterRevision);
      if (!mounted.current || currentOperation !== operation.current) return joined;
      setActions(mergeActions([], history));
      await reconciler.start(joined.gameId, publishSnapshot);
      await gateway.updatePresence({
        gameId: joined.gameId,
        displayName,
        role: joined.role,
        onlineAt: new Date().toISOString(),
      });
      if (mounted.current && currentOperation === operation.current) setConnectionState("connected");
      return joined;
    } catch (value) {
      const normalized = unknownError(value);
      if (mounted.current && currentOperation === operation.current) {
        setError(normalized);
        setConnectionState("error");
      }
      throw normalized;
    }
  }, [publishSnapshot, reconciler]);

  const createGame = useCallback(
    (input: CreateGameInput) => connect(input.displayName, () => gateway.createGame(input)),
    [connect, gateway]
  );
  const joinGame = useCallback(
    (inviteToken: string, intent: JoinIntent, displayName: string) =>
      connect(displayName, () => gateway.joinGame(inviteToken, intent, displayName)),
    [connect, gateway]
  );

  const submitAction = useCallback(async (envelope: ActionEnvelope): Promise<SubmitActionResult> => {
    if (!session) {
      const result: SubmitActionResult = { ok: false, error: { code: "not-a-member", message: "No game session is connected", retryable: false } };
      setError(result.error);
      return result;
    }
    setSubmitState("submitting");
    setError(null);
    try {
      const result = await gateway.submitAction({ gameId: session.gameId, envelope });
      if (!mounted.current) return result;
      if (result.snapshot) publishSnapshot(result.snapshot);
      if (result.ok) publishAction(result.appliedAction);
      if (!result.ok) setError(result.error);
      return result;
    } catch (value) {
      const normalized = unknownError(value);
      if (mounted.current) setError(normalized);
      return { ok: false, error: normalized };
    } finally {
      if (mounted.current) setSubmitState("idle");
    }
  }, [gateway, publishAction, publishSnapshot, session]);

  const leave = useCallback(async () => {
    operation.current += 1;
    await reconciler.stop();
    await gateway.leave();
    if (!mounted.current) return;
    setSession(null);
    setSnapshot(null);
    setActions([]);
    setPresence([]);
    setConnectionState("idle");
    setSubmitState("idle");
    setError(null);
  }, [gateway, reconciler]);

  useEffect(() => () => {
    mounted.current = false;
    operation.current += 1;
    void reconciler.stop();
    void gateway.leave();
  }, [gateway, reconciler]);

  const value = useMemo<GameSessionContextValue>(() => ({
    session,
    role: session?.role ?? null,
    snapshot,
    actions,
    presence,
    connectionState,
    submitState,
    error,
    createGame,
    joinGame,
    submitAction,
    clearError: () => setError(null),
    leave,
  }), [actions, connectionState, createGame, error, joinGame, leave, presence, session, snapshot, submitAction, submitState]);

  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
};
