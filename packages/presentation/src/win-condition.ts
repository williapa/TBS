import type { ObjectiveState } from "@TBS/game-core";

export type WinConditionViewModel = Readonly<{
  description: string;
  includesCapitalVictory: boolean;
  includesEliminationVictory: boolean;
}>;

export const presentWinCondition = (
  objectives: readonly ObjectiveState[],
): WinConditionViewModel => {
  const includesCapitalVictory = objectives.some(({ type }) => type === "capital");
  const includesEliminationVictory = objectives.some(({ type }) => type === "elimination");
  const description = includesEliminationVictory
    ? includesCapitalVictory
      ? "Eliminate every enemy unit that can move and attack, or destroy every enemy capital."
      : "Eliminate every enemy unit that can move and attack."
    : includesCapitalVictory
      ? "Destroy every enemy capital."
      : "No win condition is configured.";

  return {
    description,
    includesCapitalVictory,
    includesEliminationVictory,
  };
};
