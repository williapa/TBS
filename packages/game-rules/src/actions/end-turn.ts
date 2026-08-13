import type { ActionHandler, GameState, TeamId } from "@TBS/game-core";
import { z } from "zod";

import type { EndTurnAction, StandardEvent, StandardRuleServices } from "./types";

export const endTurnActionSchema = z.object({ type: z.literal("end-turn") }).strict();
export const parseEndTurnAction = (value: unknown): EndTurnAction => endTurnActionSchema.parse(value);

export const endTurnActionHandler: ActionHandler<GameState, TeamId, EndTurnAction, StandardEvent, StandardRuleServices> = {
  type: "end-turn",
  validate: () => [],
  apply: (context) => ({
    state: { ...context.state, revision: context.state.revision + 1 },
    events: [],
  }),
};
