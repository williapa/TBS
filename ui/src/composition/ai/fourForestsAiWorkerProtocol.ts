import type { GameState } from "@TBS/game-core";
import type { StandardAction } from "@TBS/game-rules";

export type FourForestsAiWorkerRequest = Readonly<{
  type: "choose";
  requestId: number;
  state: GameState;
}>;

export type FourForestsAiWorkerResponse =
  | Readonly<{
      type: "selection";
      requestId: number;
      stateRevision: number;
      candidateKey: string;
      action: StandardAction;
    }>
  | Readonly<{
      type: "error";
      requestId: number;
      message: string;
    }>;

export type FourForestsAiSelection = Extract<FourForestsAiWorkerResponse, { type: "selection" }>;
