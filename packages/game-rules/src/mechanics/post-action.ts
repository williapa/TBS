import type { EntityState, GameState, TeamId } from "@TBS/game-core";

import type { StandardAction, StandardEvent, StandardRuleServices } from "../actions/types";
import { getProductionOptions } from "../content/production";

const teamIds = (state: GameState): readonly TeamId[] => Object.values(state.teams).map(({ id }) => id);

const teamHasMovableCombatUnit = (
  state: GameState,
  teamId: TeamId,
  services: StandardRuleServices,
) => Object.values(state.entities).some((entity) => {
  if (entity.ownerTeamId !== teamId || !entity.position) return false;
  const definition = services.getUnit(entity.unitTypeId);
  return Boolean(definition?.capabilities.includes("move") && definition.capabilities.includes("attack"));
});

const winnerWhenExactlyOneTeamIsMissing = (
  state: GameState,
  missingTeamIds: readonly TeamId[],
): TeamId | undefined => {
  if (missingTeamIds.length !== 1) return undefined;
  return teamIds(state).find((candidate) => candidate !== missingTeamIds[0]);
};

export const getWinningTeam = (state: GameState, services: StandardRuleServices): TeamId | undefined => {
  const eliminationTeams = state.objectives
    .filter((objective) => objective.type === "elimination")
    .map(({ teamId }) => teamId);
  const missingCombatTeams = eliminationTeams.filter(
    (candidate) => !teamHasMovableCombatUnit(state, candidate, services),
  );
  const eliminationWinner = winnerWhenExactlyOneTeamIsMissing(state, missingCombatTeams);
  if (eliminationWinner) return eliminationWinner;

  if (!state.objectives.some((objective) => objective.type === "capital")) return undefined;
  const teamsWithCapitals = new Set(
    Object.values(state.entities)
      .filter((entity) => entity.position && entity.unitTypeId === "capital" && entity.ownerTeamId)
      .map((entity) => entity.ownerTeamId),
  );
  return winnerWhenExactlyOneTeamIsMissing(
    state,
    teamIds(state).filter((candidate) => !teamsWithCapitals.has(candidate)),
  );
};

const entityCanStillAct = (
  state: GameState,
  entity: EntityState,
  services: StandardRuleServices,
): boolean => {
  if (!entity.position || entity.actionBudget?.moved || entity.actionBudget?.acted) return false;
  const definition = services.getUnit(entity.unitTypeId);
  if (!definition) return false;
  if (definition.capabilities.includes("move")) return true;
  if (!definition.capabilities.includes("spawn") || !entity.ownerTeamId) return false;
  const availableMoney = state.teams[entity.ownerTeamId]?.money ?? 0;
  return getProductionOptions(entity.unitTypeId).some(({ cost }) => cost <= availableMoney);
};

export const shouldEndTurn = (
  state: GameState,
  actorTeamId: TeamId,
  action: StandardAction,
  services: StandardRuleServices,
): boolean => action.type === "end-turn" || !Object.values(state.entities).some(
  (entity) => entity.ownerTeamId === actorTeamId && entityCanStillAct(state, entity, services),
);

const nextTeamAfter = (state: GameState, currentTeamId: TeamId): TeamId => {
  const teams = teamIds(state);
  const currentIndex = teams.indexOf(currentTeamId);
  if (teams.length < 2 || currentIndex < 0) throw new Error("turn progression requires at least two registered teams");
  return teams[(currentIndex + 1) % teams.length];
};

export const advanceTurn = (
  state: GameState,
  actorTeamId: TeamId,
  services: StandardRuleServices,
): Readonly<{ state: GameState; event: StandardEvent }> => {
  const nextTeamId = nextTeamAfter(state, actorTeamId);
  const entities = Object.fromEntries(Object.entries(state.entities).map(([id, entity]) => [
    id,
    entity.actionBudget
      ? { ...entity, actionBudget: { moved: false, acted: false } }
      : entity,
  ]));
  const income = Object.values(entities).reduce((total, entity) => {
    if (entity.ownerTeamId !== nextTeamId || !entity.position) return total;
    return total + (services.getUnit(entity.unitTypeId)?.income ?? 0);
  }, 0);
  const nextTeam = state.teams[nextTeamId];
  if (!nextTeam) throw new Error(`next team is missing: ${nextTeamId}`);
  const teams: GameState["teams"] = {
    ...state.teams,
    [nextTeamId]: { ...nextTeam, money: nextTeam.money + income },
  };
  const nextState: GameState = {
    ...state,
    lifecycle: { phase: "active", activeTeamId: nextTeamId },
    entities,
    teams,
    turn: { number: state.turn.number + 1 },
  };
  return {
    state: nextState,
    event: {
      type: "turn-ended",
      actorTeamId,
      nextTeamId,
      income,
      money: Object.fromEntries(Object.values(teams).map((team) => [team.id, team.money])),
    },
  };
};
