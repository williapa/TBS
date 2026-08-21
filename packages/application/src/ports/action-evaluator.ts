import type { GameState, TeamId } from "@TBS/game-core";
import type {
  StandardAction,
  StandardActionResult,
} from "@TBS/game-rules";

export type StandardActionEvaluator = (
  state: GameState,
  actorTeamId: TeamId,
  action: StandardAction,
) => StandardActionResult;
