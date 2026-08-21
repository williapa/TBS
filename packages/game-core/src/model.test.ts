import { describe, expect, it } from "vitest";

import { contentVersion, entityId, rulesetVersion, teamId, terrainTypeId, unitTypeId } from "./ids";
import { hexCoord, hexKey } from "./hex";
import { NORMALIZED_GAME_SCHEMA_VERSION, type GameState, validateGameState } from "./model";

const orange = teamId("orange");
const purple = teamId("purple");
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

  it("reports invalid versions, winner, ownership, status, objective, and board references", () => {
    const state = validState();
    const invalid: GameState = {
      ...state,
      rulesetVersion: " " as GameState["rulesetVersion"],
      contentVersion: "" as GameState["contentVersion"],
      lifecycle: { phase: "finished", winnerTeamId: purple },
      entities: {
        [soldier]: {
          ...state.entities[soldier],
          ownerTeamId: purple,
          statuses: [{ type: "", remainingTurns: 0 }],
        },
      },
      objectives: [
        { type: "elimination", teamId: purple },
        { type: "capital", position: hexCoord(4, 4), controllingTeamId: purple },
      ],
    };

    expect(validateGameState(invalid).map(({ code }) => code)).toEqual([
      "invalid-ruleset-version",
      "invalid-content-version",
      "missing-winner-team",
      "missing-entity-team",
      "invalid-status",
      "missing-objective-team",
      "missing-objective-cell",
      "missing-objective-team",
    ]);
  });

  it("reports invalid cargo, duplicate placement, orphan entities, and board keys", () => {
    const state = validState();
    const cargoId = entityId("cargo-1");
    const orphanId = entityId("orphan-1");
    const invalid: GameState = {
      ...state,
      board: {
        cells: {
          [hexKey(hexCoord(3, 3))]: state.board.cells[hexKey(position)],
        },
      },
      entities: {
        [soldier]: {
          ...state.entities[soldier],
          cargo: { capacity: 0, entityIds: [cargoId] },
        },
        [cargoId]: {
          id: cargoId,
          unitTypeId: unitTypeId("worker"),
          ownerTeamId: orange,
          position,
          statuses: [],
        },
        [orphanId]: {
          id: orphanId,
          unitTypeId: unitTypeId("worker"),
          ownerTeamId: orange,
          statuses: [],
        },
      },
    };

    expect(validateGameState(invalid).map(({ code }) => code)).toEqual([
      "invalid-cargo",
      "cargo-position-mismatch",
      "occupancy-mismatch",
      "occupancy-mismatch",
      "invalid-board-key",
      "occupancy-mismatch",
      "orphaned-entity",
    ]);
  });
});
