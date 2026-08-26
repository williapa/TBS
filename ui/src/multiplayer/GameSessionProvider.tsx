import type {
  CreatedGame,
  CreateGameInput,
  GameConnectionState,
  GameInvitePreview,
  GameSession,
  GameSubmitState,
  GatewayError,
  JoinIntent,
  PresenceState,
  SessionRole,
  StandardActionEnvelope,
  StandardAppliedAction,
  StandardGameSnapshot,
  SubmitActionResult,
} from "@TBS/application";
import { GameSessionModel } from "@TBS/application";
import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import { useGameSessionGateway } from "./GameSessionGatewayContext";

export type GameSessionContextValue = {
  session: GameSession | null;
  role: SessionRole | null;
  snapshot: StandardGameSnapshot | null;
  actions: readonly StandardAppliedAction[];
  presence: readonly PresenceState[];
  connectionState: GameConnectionState;
  submitState: GameSubmitState;
  error: GatewayError | null;
  createGame(input: CreateGameInput): Promise<CreatedGame>;
  getInvitePreview(inviteToken: string): Promise<GameInvitePreview>;
  joinGame(inviteToken: string, intent: JoinIntent, displayName: string): Promise<GameSession>;
  submitAction(envelope: StandardActionEnvelope): Promise<SubmitActionResult>;
  clearError(): void;
  leave(): Promise<void>;
};

const GameSessionContext = createContext<GameSessionContextValue | null>(null);

export const useGameSession = () => {
  const value = useContext(GameSessionContext);
  if (!value) throw new Error("GameSessionProvider is missing");
  return value;
};

export const GameSessionProvider = ({ children }: { children: ReactNode }) => {
  const gateway = useGameSessionGateway();
  const model = useMemo(
    () => new GameSessionModel(gateway, { nowIso: () => new Date().toISOString() }),
    [gateway],
  );
  const state = useSyncExternalStore(model.subscribe, model.getState, model.getState);

  useEffect(() => () => {
    void model.dispose();
  }, [model]);

  const value = useMemo<GameSessionContextValue>(() => ({
    ...state,
    createGame: model.createGame,
    getInvitePreview: model.getInvitePreview,
    joinGame: model.joinGame,
    submitAction: model.submitAction,
    clearError: model.clearError,
    leave: model.leave,
  }), [model, state]);

  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
};
