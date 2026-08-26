import {
  NORMALIZED_GAME_SCHEMA_VERSION,
  buildMechanicPipeline,
  contentVersion,
  entityId,
  hexCoord,
  hexKey,
  rulesetVersion,
  teamId,
  terrainTypeId,
  type GameState,
} from "@TBS/game-core";
import { describe, expect, it } from "vitest";

import type { StandardMechanicContext } from "../mechanics/standard-pipeline";
import {
  FOREST_CONCEALMENT_ABILITY,
  forestConcealmentHook,
  pathfinderUnit,
  pathfinderUnits,
  type PathfinderEvent,
} from "./pathfinder";

const orange = teamId("orange");
const pathfinder = entityId("pathfinder-1");
const forest = hexCoord(1, 0);

const stateFixture = (): GameState => ({
  schemaVersion: NORMALIZED_GAME_SCHEMA_VERSION,
  rulesetVersion: rulesetVersion("pathfinder-example@1"),
  contentVersion: contentVersion("pathfinder-example@1"),
  revision: 1,
  lifecycle: { phase: "active", activeTeamId: orange },
  board: {
    cells: {
      [hexKey(forest)]: {
        position: forest,
        terrainTypeId: terrainTypeId("forest"),
        occupantEntityId: pathfinder,
      },
    },
  },
  entities: {
    [pathfinder]: {
      id: pathfinder,
      unitTypeId: pathfinderUnit.id,
      ownerTeamId: orange,
      position: forest,
      health: { current: 100, maximum: 100 },
      actionBudget: { moved: true, acted: true },
      statuses: [],
    },
  },
  teams: { [orange]: { id: orange, money: 0 } },
  objectives: [],
  turn: { number: 1 },
});

describe("pathfinder extension acceptance example", () => {
  it("composes one new unit from the existing content vocabulary", () => {
    expect(pathfinderUnits.size).toBe(37);
    expect(pathfinderUnits.get(pathfinderUnit.id)).toMatchObject({
      capabilities: ["move", "attack", "collect-object", "loadable"],
      abilities: [FOREST_CONCEALMENT_ABILITY],
    });
  });

  it("adds an ordered mechanic without changing the standard dispatcher", () => {
    const state = stateFixture();
    const context: StandardMechanicContext = {
      actorTeamId: orange,
      action: { type: "move", actorId: pathfinder, destination: forest },
      services: { getUnit: (id) => pathfinderUnits.get(id) },
    };
    const result = buildMechanicPipeline<GameState, PathfinderEvent, StandardMechanicContext>([
      forestConcealmentHook,
    ]).run(state, context);

    expect(result.state).not.toBe(state);
    expect(state.entities[pathfinder]?.statuses).toEqual([]);
    expect(result.state.entities[pathfinder]?.statuses).toEqual([
      { type: FOREST_CONCEALMENT_ABILITY, remainingTurns: 1 },
    ]);
    expect(result.events).toEqual([{ type: "forest-concealment-applied", entityId: pathfinder }]);
  });
});
