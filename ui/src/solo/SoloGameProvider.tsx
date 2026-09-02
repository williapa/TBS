import type {
  SoloActionResult,
  SoloGameState,
  StandardActionEnvelope,
  StartSoloGameInput,
} from "@TBS/application";
import { SoloGameModel } from "@TBS/application";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

export type SoloGameContextValue = SoloGameState & Readonly<{
  startGame(input: StartSoloGameInput): void;
  submitAction(envelope: StandardActionEnvelope): SoloActionResult;
}>;

const SoloGameContext = createContext<SoloGameContextValue | null>(null);

export const useSoloGame = (): SoloGameContextValue => {
  const value = useContext(SoloGameContext);
  if (!value) throw new Error("SoloGameProvider is missing");
  return value;
};

export const SoloGameProvider = ({ children }: { children: ReactNode }) => {
  const model = useMemo(() => new SoloGameModel(), []);
  const state = useSyncExternalStore(model.subscribe, model.getState, model.getState);
  const value = useMemo<SoloGameContextValue>(() => ({
    ...state,
    startGame: model.startGame,
    submitAction: model.submitAction,
  }), [model, state]);

  return <SoloGameContext.Provider value={value}>{children}</SoloGameContext.Provider>;
};
