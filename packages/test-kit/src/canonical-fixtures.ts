import {
  teamId,
  terrainTypeId,
  unitTypeId,
  type GameState,
} from "@TBS/game-core";
import { createHexMap, createInitialGameState } from "@TBS/game-setup";
import type { GameSnapshot } from "@TBS/protocol";

export const FIXTURE_ACTION_ID = "00000000-0000-4000-8000-000000000001" as const;

export const createWaitingGameStateFixture = (): GameState => {
  const map = createHexMap(2, terrainTypeId("plains"));
  map[0][0] = { ...map[0][0], team: teamId("orange"), unit: unitTypeId("soldier") };
  map[2][1] = { ...map[2][1], team: teamId("purple"), unit: unitTypeId("soldier") };
  return createInitialGameState(map);
};

export const createActiveGameStateFixture = (): GameState => ({
  ...createWaitingGameStateFixture(),
  lifecycle: { phase: "active", activeTeamId: teamId("orange") },
  turn: { number: 1 },
});

export const createGameSnapshotFixture = (): GameSnapshot<GameState> => ({
  gameId: "game-1",
  players: {
    [teamId("orange")]: { memberId: "member-orange", displayName: "Orange" },
    [teamId("purple")]: { memberId: "member-purple", displayName: "Purple" },
  },
  spectatorCount: 0,
  state: createActiveGameStateFixture(),
});
