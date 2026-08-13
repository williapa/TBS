import { buildMechanicPipeline, type GameState, type MechanicHook, type TeamId } from "@TBS/game-core";

import type { StandardAction, StandardEvent, StandardRuleServices } from "../actions/types";
import { advanceTurn, getWinningTeam, shouldEndTurn } from "./post-action";

export type StandardMechanicContext = Readonly<{
  actorTeamId: TeamId;
  action: StandardAction;
  services: StandardRuleServices;
}>;

type StandardHook = MechanicHook<GameState, StandardEvent, StandardMechanicContext>;

const objectiveHook: StandardHook = {
  id: "standard.evaluate-objectives",
  phase: "evaluateObjectives",
  apply: ({ state, events, context }) => {
    const winnerTeamId = getWinningTeam(state, context.services);
    return winnerTeamId
      ? {
          state: { ...state, lifecycle: { phase: "finished", winnerTeamId } },
          events: [...events, { type: "game-over", winnerTeamId }],
        }
      : { state, events };
  },
};

const turnHook: StandardHook = {
  id: "standard.evaluate-turn-end",
  phase: "evaluateTurnEnd",
  after: [objectiveHook.id],
  apply: ({ state, events, context }) => {
    if (state.lifecycle.phase === "finished" || !shouldEndTurn(state, context.actorTeamId, context.action, context.services)) {
      return { state, events };
    }
    const turn = advanceTurn(state, context.actorTeamId, context.services);
    return { state: turn.state, events: [...events, turn.event] };
  },
};

export const standardPostActionPipeline = buildMechanicPipeline([objectiveHook, turnHook]);
