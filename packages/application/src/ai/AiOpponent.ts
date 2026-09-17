import type { GameState } from "@TBS/game-core";
import type { StandardAction } from "@TBS/game-rules";

export type AiActionSelection = Readonly<{
  stateRevision: number;
  candidateKey: string;
  action: StandardAction;
}>;

export interface AiOpponent {
  choose(state: GameState): Promise<AiActionSelection>;
  dispose(): void;
}

export type CreateAiOpponent = () => AiOpponent;
