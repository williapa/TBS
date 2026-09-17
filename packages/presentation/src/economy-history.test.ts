import {
  entityId,
  hexCoord,
  teamId,
  unitTypeId,
  type GameState,
} from "@TBS/game-core";
import {
  STANDARD_CONTENT_VERSION,
  STANDARD_RULESET_VERSION,
  type StandardEvent,
} from "@TBS/game-rules";
import { describe, expect, test } from "vitest";

import { presentEconomyHistory, type EconomyHistoryAction } from "./economy-history";

const orange = teamId("orange");
const purple = teamId("purple");
const position = hexCoord(0, 0);

const action = (
  actorTeamId: typeof orange | typeof purple,
  events: readonly StandardEvent[],
): EconomyHistoryAction => ({ actorTeamId, events });

const currentState = (): GameState => ({
  schemaVersion: 2,
  rulesetVersion: STANDARD_RULESET_VERSION,
  contentVersion: STANDARD_CONTENT_VERSION,
  revision: 6,
  lifecycle: { phase: "active", activeTeamId: purple },
  board: { cells: {} },
  entities: {},
  teams: {
    [orange]: { id: orange, money: 2_100 },
    [purple]: { id: purple, money: 1_100 },
  },
  objectives: [],
  turn: { number: 3 },
});

describe("economy history presenter", () => {
  test("shows turn income as a vertical money increase and other changes across the turn", () => {
    const history = presentEconomyHistory(currentState(), [
      action(purple, [{
        type: "unit-spawned",
        actorTeamId: purple,
        buildingId: entityId("factory"),
        entityId: entityId("soldier"),
        unitTypeId: unitTypeId("soldier"),
        position,
        cost: 200,
      }]),
      action(purple, [{
        type: "turn-ended",
        actorTeamId: purple,
        nextTeamId: orange,
        income: 100,
        money: { [orange]: 1_100, [purple]: 800 },
      }]),
      action(orange, [{
        type: "unit-moved",
        actorTeamId: orange,
        entityId: entityId("collector"),
        unitTypeId: unitTypeId("soldier"),
        start: position,
        end: position,
        consumedObjectTypeId: unitTypeId("money"),
        moneyAward: 1_000,
      }]),
      action(orange, [{
        type: "turn-ended",
        actorTeamId: orange,
        nextTeamId: purple,
        income: 300,
        money: { [orange]: 2_100, [purple]: 1_100 },
      }]),
    ]);

    expect(history[purple]?.money).toEqual([
      { turn: 1, value: 1_000 },
      { turn: 2, value: 800 },
      { turn: 3, value: 800 },
      { turn: 3, value: 1_100 },
    ]);
    expect(history[orange]?.money).toEqual([
      { turn: 1, value: 1_000 },
      { turn: 2, value: 1_000 },
      { turn: 2, value: 1_100 },
      { turn: 3, value: 2_100 },
    ]);
  });

  test("reconstructs progressive income changes from construction and destruction", () => {
    const house = entityId("purple-house");
    const history = presentEconomyHistory(currentState(), [
      action(purple, [{
        type: "unit-constructed",
        actorTeamId: purple,
        actorId: entityId("worker"),
        entityId: house,
        unitTypeId: unitTypeId("house"),
        position,
        start: position,
        end: position,
        cost: 700,
      }, {
        type: "turn-ended",
        actorTeamId: purple,
        nextTeamId: orange,
        income: 0,
        money: { [orange]: 2_100, [purple]: 400 },
      }]),
      action(orange, [{
        type: "unit-attacked",
        actorTeamId: orange,
        attackerId: entityId("attacker"),
        defenderId: house,
        attackerUnitTypeId: unitTypeId("soldier"),
        defenderUnitTypeId: unitTypeId("house"),
        start: position,
        end: position,
        defenderPosition: position,
        attackDamage: 100,
        counterattackDamage: 0,
        deaths: [house],
      }, {
        type: "turn-ended",
        actorTeamId: orange,
        nextTeamId: purple,
        income: 0,
        money: { [orange]: 2_100, [purple]: 400 },
      }]),
    ]);

    expect(history[purple]?.income).toEqual([
      { turn: 1, value: 0 },
      { turn: 2, value: 100 },
      { turn: 3, value: 0 },
    ]);
  });

  test("attributes a destroyed projectile target to the opposing team", () => {
    const target = hexCoord(1, 0);
    const state = currentState();
    const history = presentEconomyHistory(state, [
      action(orange, [{
        type: "unit-moved",
        actorTeamId: orange,
        entityId: entityId("collector"),
        unitTypeId: unitTypeId("soldier"),
        start: position,
        end: position,
        consumedObjectTypeId: unitTypeId("missile"),
        objectTarget: target,
        objectDamage: [{
          entityId: entityId("purple-bank"),
          position: target,
          unitTypeId: unitTypeId("bank"),
          damage: 100,
          killed: true,
        }],
      }, {
        type: "turn-ended",
        actorTeamId: orange,
        nextTeamId: purple,
        income: 0,
        money: { [orange]: 2_100, [purple]: 1_100 },
      }]),
    ]);

    expect(history[purple]?.income).toEqual([
      { turn: 2, value: 1_000 },
      { turn: 3, value: 0 },
    ]);
  });

  test("uses the available suffix of history without requiring turn one", () => {
    const state = { ...currentState(), turn: { number: 9 } };
    const history = presentEconomyHistory(state, [
      action(orange, [{
        type: "unit-moved",
        actorTeamId: orange,
        entityId: entityId("collector"),
        unitTypeId: unitTypeId("soldier"),
        start: position,
        end: position,
        moneyAward: 1_000,
      }]),
    ]);

    expect(history[orange]?.money).toEqual([{ turn: 9, value: 1_100 }]);
  });
});
