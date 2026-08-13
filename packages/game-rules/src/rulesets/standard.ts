import {
  ActionRegistryBuilder,
  rulesetVersion,
  type GameState,
  type RegistryExecutionResult,
  type RuleViolation,
  type TeamId,
} from "@TBS/game-core";

import { attackActionHandler } from "../actions/attack";
import { endTurnActionHandler } from "../actions/end-turn";
import { boostActionHandler } from "../actions/boost";
import { constructActionHandler } from "../actions/construct";
import { healActionHandler } from "../actions/heal";
import { loadActionHandler } from "../actions/load";
import { moveActionHandler } from "../actions/move";
import { spawnActionHandler } from "../actions/spawn";
import { unloadActionHandler } from "../actions/unload";
import type { StandardAction, StandardEvent, StandardRuleServices } from "../actions/types";
import { getUnitDefinition } from "../content/units";
import { standardPostActionPipeline } from "../mechanics/standard-pipeline";

export const STANDARD_RULESET_VERSION = rulesetVersion("standard@1");
export const STANDARD_CONTENT_VERSION = "standard@1" as const;

const services: StandardRuleServices = { getUnit: getUnitDefinition };

const registry = new ActionRegistryBuilder<GameState, TeamId, StandardAction, StandardEvent, StandardRuleServices>()
  .register(moveActionHandler)
  .register(attackActionHandler)
  .register(boostActionHandler)
  .register(healActionHandler)
  .register(constructActionHandler)
  .register(spawnActionHandler)
  .register(loadActionHandler)
  .register(unloadActionHandler)
  .register(endTurnActionHandler)
  .build();

export type StandardActionResult = RegistryExecutionResult<GameState, StandardEvent>;

const reject = (code: string, message: string): StandardActionResult => ({
  ok: false,
  code: "invalid-action",
  violations: [{ code, message } satisfies RuleViolation],
});

export const applyStandardAction = (
  state: GameState,
  actorTeamId: TeamId,
  action: StandardAction,
): StandardActionResult => {
  if (state.rulesetVersion !== STANDARD_RULESET_VERSION) {
    return reject("incompatible-ruleset", `Expected ${STANDARD_RULESET_VERSION}, received ${state.rulesetVersion}`);
  }
  if (state.lifecycle.phase === "finished") return reject("finished-game", "the game has already finished");
  if (state.lifecycle.phase !== "active") return reject("inactive-game", "the game is not active");
  if (state.lifecycle.activeTeamId !== actorTeamId) return reject("wrong-team", "it is not this team's turn");
  if (!state.teams[actorTeamId]) return reject("missing-team", "the acting team does not exist");
  const result = registry.execute({ state, actor: actorTeamId, services }, action);
  if (!result.ok) return result;

  const postAction = standardPostActionPipeline.run(
    result.state,
    { actorTeamId, action, services },
    result.events,
  );
  return { ok: true, ...postAction };
};

export const standardActionTypes = registry.actionTypes;
