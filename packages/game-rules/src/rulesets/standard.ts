import {
  ActionRegistryBuilder,
  contentVersion,
  rulesetVersion,
  type GameState,
  type RegistryExecutionResult,
  type RegistryValidationResult,
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
export const STANDARD_CONTENT_VERSION = contentVersion("standard@1");

export const standardRuleServices: StandardRuleServices = { getUnit: getUnitDefinition };

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

const validateStandardContext = (
  state: GameState,
  actorTeamId: TeamId,
): RuleViolation | undefined => {
  if (state.rulesetVersion !== STANDARD_RULESET_VERSION) {
    return {
      code: "incompatible-ruleset",
      message: `Expected ${STANDARD_RULESET_VERSION}, received ${state.rulesetVersion}`,
    };
  }
  if (state.lifecycle.phase === "finished") return { code: "finished-game", message: "the game has already finished" };
  if (state.lifecycle.phase !== "active") return { code: "inactive-game", message: "the game is not active" };
  if (state.lifecycle.activeTeamId !== actorTeamId) return { code: "wrong-team", message: "it is not this team's turn" };
  if (!state.teams[actorTeamId]) return { code: "missing-team", message: "the acting team does not exist" };
  return undefined;
};

export const validateStandardAction = (
  state: GameState,
  actorTeamId: TeamId,
  action: StandardAction,
): RegistryValidationResult => {
  const violation = validateStandardContext(state, actorTeamId);
  return violation
    ? { ok: false, code: "invalid-action", violations: [violation] }
    : registry.validate({ state, actor: actorTeamId, services: standardRuleServices }, action);
};

export const applyStandardAction = (
  state: GameState,
  actorTeamId: TeamId,
  action: StandardAction,
): StandardActionResult => {
  const violation = validateStandardContext(state, actorTeamId);
  if (violation) return reject(violation.code, violation.message);
  const result = registry.execute({ state, actor: actorTeamId, services: standardRuleServices }, action);
  if (!result.ok) return result;

  const postAction = standardPostActionPipeline.run(
    result.state,
    { actorTeamId, action, services: standardRuleServices },
    result.events,
  );
  return { ok: true, ...postAction };
};

export const standardActionTypes = registry.actionTypes;
