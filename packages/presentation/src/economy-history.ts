import type { GameState, TeamId, UnitTypeId } from "@TBS/game-core";
import {
  getTeamIncome,
  standardRuleServices,
  type StandardEvent,
} from "@TBS/game-rules";

export type EconomyHistoryAction = Readonly<{
  actorTeamId: TeamId;
  events: readonly StandardEvent[];
}>;

export type EconomyHistoryPoint = Readonly<{
  turn: number;
  value: number;
}>;

export type TeamEconomyHistory = Readonly<{
  income: readonly EconomyHistoryPoint[];
  money: readonly EconomyHistoryPoint[];
}>;

const unitIncome = (unitTypeId: UnitTypeId): number =>
  standardRuleServices.getUnit(unitTypeId)?.income ?? 0;

const moneyAward = (event: StandardEvent): number =>
  "moneyAward" in event ? event.moneyAward ?? 0 : 0;

const cost = (event: StandardEvent): number =>
  event.type === "unit-constructed" || event.type === "unit-spawned" ? event.cost : 0;

const opposingTeam = (
  teamIds: readonly TeamId[],
  actorTeamId: TeamId,
): TeamId | undefined => teamIds.find((teamId) => teamId !== actorTeamId);

const incomeChanges = (
  event: StandardEvent,
  teamIds: readonly TeamId[],
): readonly Readonly<{ teamId: TeamId; amount: number }>[] => {
  if (event.type === "unit-constructed") {
    return [{ teamId: event.actorTeamId, amount: unitIncome(event.unitTypeId) }];
  }
  if (event.type === "unit-attacked") {
    const changes: Readonly<{ teamId: TeamId; amount: number }>[] = [];
    if (event.deaths.includes(event.attackerId)) {
      changes.push({ teamId: event.actorTeamId, amount: -unitIncome(event.attackerUnitTypeId) });
    }
    if (event.deaths.includes(event.defenderId)) {
      const defenderTeamId = opposingTeam(teamIds, event.actorTeamId);
      if (defenderTeamId) {
        changes.push({ teamId: defenderTeamId, amount: -unitIncome(event.defenderUnitTypeId) });
      }
    }
    return changes;
  }
  if (event.type !== "unit-moved") return [];
  const targetTeamId = opposingTeam(teamIds, event.actorTeamId);
  return (event.objectDamage ?? []).flatMap((damage) => (
    damage.killed
      && targetTeamId
      && event.objectTarget?.q === damage.position.q
      && event.objectTarget.r === damage.position.r
      ? [{ teamId: targetTeamId, amount: -unitIncome(damage.unitTypeId) }]
      : []
  ));
};

const appendPoint = (
  points: EconomyHistoryPoint[],
  point: EconomyHistoryPoint,
): void => {
  const previous = points[points.length - 1];
  if (previous?.turn === point.turn && previous.value === point.value) return;
  points.push(point);
};

export const presentEconomyHistory = (
  state: GameState,
  actions: readonly EconomyHistoryAction[],
): Readonly<Record<TeamId, TeamEconomyHistory>> => {
  const teamIds = Object.values(state.teams).map(({ id }) => id);
  const events = actions.flatMap(({ events: actionEvents }) => actionEvents);
  const endedTurns = events.filter(({ type }) => type === "turn-ended").length;
  const firstTurn = Math.max(1, state.turn.number - endedTurns);
  const money: Record<string, number> = Object.fromEntries(
    teamIds.map((teamId) => [teamId, state.teams[teamId]?.money ?? 0]),
  );
  const income: Record<string, number> = Object.fromEntries(
    teamIds.map((teamId) => [teamId, getTeamIncome(state, teamId)]),
  );

  for (const event of [...events].reverse()) {
    if (event.type === "turn-ended") {
      for (const teamId of teamIds) money[teamId] = event.money[teamId] ?? money[teamId] ?? 0;
      money[event.nextTeamId] = Math.max(0, (money[event.nextTeamId] ?? 0) - event.income);
      continue;
    }
    if (!("actorTeamId" in event)) continue;
    money[event.actorTeamId] = (money[event.actorTeamId] ?? 0) + cost(event) - moneyAward(event);
    for (const change of incomeChanges(event, teamIds)) {
      income[change.teamId] = (income[change.teamId] ?? 0) - change.amount;
    }
  }

  const mutableHistory: Record<string, { income: EconomyHistoryPoint[]; money: EconomyHistoryPoint[] }> =
    Object.fromEntries(teamIds.map((teamId) => [teamId, {
      income: [{ turn: firstTurn, value: income[teamId] ?? 0 }],
      money: [{ turn: firstTurn, value: money[teamId] ?? 0 }],
    }]));
  let turn = firstTurn;

  for (const event of events) {
    if (event.type !== "turn-ended") {
      if (!("actorTeamId" in event)) continue;
      money[event.actorTeamId] = (money[event.actorTeamId] ?? 0) - cost(event) + moneyAward(event);
      for (const change of incomeChanges(event, teamIds)) {
        income[change.teamId] = (income[change.teamId] ?? 0) + change.amount;
      }
      continue;
    }

    turn += 1;
    for (const teamId of teamIds) {
      money[teamId] = event.money[teamId] ?? money[teamId] ?? 0;
    }
    money[event.nextTeamId] = Math.max(0, (money[event.nextTeamId] ?? 0) - event.income);
    income[event.nextTeamId] = event.income;
    for (const teamId of teamIds) {
      appendPoint(mutableHistory[teamId]?.money ?? [], { turn, value: money[teamId] ?? 0 });
      appendPoint(mutableHistory[teamId]?.income ?? [], { turn, value: income[teamId] ?? 0 });
    }
    for (const teamId of teamIds) money[teamId] = event.money[teamId] ?? money[teamId] ?? 0;
    appendPoint(mutableHistory[event.nextTeamId]?.money ?? [], {
      turn,
      value: money[event.nextTeamId] ?? 0,
    });
  }

  return mutableHistory;
};
