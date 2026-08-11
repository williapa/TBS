import { MapItem } from "../types";
import { CURRENT_GAME_SCHEMA_VERSION, GameSnapshot } from "./types";

const fixtureMap = (): MapItem[][] => [[
  { row: 0, column: 0, index: 0, neighbors: [1], terrain: "plains", unit: "soldier", team: "orange" },
  { row: 0, column: 1, index: 1, neighbors: [0], terrain: "plains", unit: "soldier", team: "purple" },
]];

export const createWaitingGameSnapshot = (): GameSnapshot => ({
  gameId: "waiting-game",
  players: {
    orange: { memberId: "orange-member", displayName: "Orange" },
  },
  spectatorCount: 0,
  state: {
    schemaVersion: CURRENT_GAME_SCHEMA_VERSION,
    revision: 0,
    status: "waiting",
    map: fixtureMap(),
    money: { orange: 2_000, purple: 2_000 },
  },
});

export const createActiveGameSnapshot = (): GameSnapshot => ({
  ...createWaitingGameSnapshot(),
  gameId: "active-game",
  players: {
    orange: { memberId: "orange-member", displayName: "Orange" },
    purple: { memberId: "purple-member", displayName: "Purple" },
  },
  state: {
    ...createWaitingGameSnapshot().state,
    status: "active",
    activeTeam: "purple",
  },
});
