import { describe, expect, it } from "vitest";

import { contentVersion, entityId, rulesetVersion, teamId, terrainTypeId, unitTypeId } from "./ids";
import { hexCoord, hexKey } from "./hex";
import { NORMALIZED_GAME_SCHEMA_VERSION, type GameState, validateGameState } from "./model";

const orange = teamId("orange");
const soldier = entityId("unit-1");
const position = hexCoord(0, 0);

const validState = (): GameState => ({
  schemaVersion: NORMALIZED_GAME_SCHEMA_VERSION,
  rulesetVersion: rulesetVersion("standard@1"),
  contentVersion: contentVersion("standard@1"),
  revision: 0,
  lifecycle: { phase: "active", activeTeamId: orange },
  board: {
    cells: {
      [hexKey(position)]: {
        position,
        terrainTypeId: terrainTypeId("plains"),
        occupantEntityId: soldier,
      },
    },
  },
  entities: {
    [soldier]: {
      id: soldier,
      unitTypeId: unitTypeId("soldier"),
      ownerTeamId: orange,
      position,
      health: { current: 100, maximum: 100 },
      actionBudget: { moved: false, acted: false },
      statuses: [],
    },
  },
  teams: { [orange]: { id: orange, money: 100 } },
  objectives: [{ type: "elimination", teamId: orange }],
  turn: { number: 1 },
});

describe("normalized game-state invariants", () => {
  it("accepts a consistent normalized state", () => {
    expect(validateGameState(validState())).toEqual([]);
  });

  it("reports entity/occupancy, health, money, and lifecycle violations", () => {
    const state = validState();
    const invalid: GameState = {
      ...state,
      lifecycle: { phase: "active", activeTeamId: teamId("missing") },
      teams: { [orange]: { id: orange, money: -1 } },
      entities: {
        [soldier]: {
          ...state.entities[soldier],
          position: hexCoord(1, 0),
          health: { current: 101, maximum: 100 },
        },
      },
    };

    expect(validateGameState(invalid).map(({ code }) => code)).toEqual([
      "missing-active-team",
      "invalid-money",
      "invalid-health",
      "occupancy-mismatch",
      "occupancy-mismatch",
    ]);
  });
});
