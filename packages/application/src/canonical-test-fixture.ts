import {
  entityId,
  hexCoord,
  hexKey,
  teamId,
  terrainTypeId,
  unitTypeId,
  type GameState,
} from "@TBS/game-core";
import {
  STANDARD_CONTENT_VERSION,
  STANDARD_RULESET_VERSION,
} from "@TBS/game-rules";

import type { StandardGameSnapshot } from "./contracts";

export const orangeTeamId = teamId("orange");
export const purpleTeamId = teamId("purple");

export const createActiveGameStateFixture = (): GameState => {
  const orangePosition = hexCoord(0, 0);
  const purplePosition = hexCoord(1, 0);
  const orangeEntityId = entityId("orange-soldier");
  const purpleEntityId = entityId("purple-soldier");
  return {
    schemaVersion: 2,
    rulesetVersion: STANDARD_RULESET_VERSION,
    contentVersion: STANDARD_CONTENT_VERSION,
    revision: 0,
    lifecycle: { phase: "active", activeTeamId: orangeTeamId },
    board: {
      cells: {
        [hexKey(orangePosition)]: {
          position: orangePosition,
          terrainTypeId: terrainTypeId("plains"),
          occupantEntityId: orangeEntityId,
        },
        [hexKey(purplePosition)]: {
          position: purplePosition,
          terrainTypeId: terrainTypeId("plains"),
          occupantEntityId: purpleEntityId,
        },
      },
    },
    entities: {
      [orangeEntityId]: {
        id: orangeEntityId,
        unitTypeId: unitTypeId("soldier"),
        ownerTeamId: orangeTeamId,
        position: orangePosition,
        health: { current: 100, maximum: 100 },
        actionBudget: { moved: false, acted: false },
        statuses: [],
      },
      [purpleEntityId]: {
        id: purpleEntityId,
        unitTypeId: unitTypeId("soldier"),
        ownerTeamId: purpleTeamId,
        position: purplePosition,
        health: { current: 100, maximum: 100 },
        actionBudget: { moved: false, acted: false },
        statuses: [],
      },
    },
    teams: {
      [orangeTeamId]: { id: orangeTeamId, money: 1_000 },
      [purpleTeamId]: { id: purpleTeamId, money: 1_000 },
    },
    objectives: [
      { type: "elimination", teamId: orangeTeamId },
      { type: "elimination", teamId: purpleTeamId },
    ],
    turn: { number: 1 },
  };
};

export const createGameSnapshotFixture = (): StandardGameSnapshot => ({
  gameId: "application-game",
  players: {
    [orangeTeamId]: { memberId: "orange-member", displayName: "Orange" },
    [purpleTeamId]: { memberId: "purple-member", displayName: "Purple" },
  },
  spectatorCount: 0,
  state: createActiveGameStateFixture(),
});
