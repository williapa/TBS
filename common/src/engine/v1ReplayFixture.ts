import type { DomainEvent, GameState } from "../contracts/types";
import type { GameAction, TeamOption } from "../types";

export type ReplayStep = Readonly<{
  actor: TeamOption;
  action: GameAction;
}>;

export const createV1ReplayState = (): GameState => ({
  schemaVersion: 1,
  revision: 0,
  status: "active",
  activeTeam: "purple",
  money: { orange: 2_000, purple: 2_000 },
  map: [
    [
      { row: 0, column: 0, index: 0, neighbors: [1, 2], terrain: "plains", unit: "soldier", team: "purple" },
      { row: 0, column: 1, index: 1, neighbors: [0, 2, 3], terrain: "plains", unit: "none", team: "gray" },
    ],
    [
      { row: 1, column: 0, index: 2, neighbors: [0, 1, 3, 5], terrain: "plains", unit: "soldier", team: "orange" },
      { row: 1, column: 1, index: 3, neighbors: [1, 2, 4, 5, 6], terrain: "plains", unit: "soldier", team: "orange" },
      { row: 1, column: 2, index: 4, neighbors: [3, 6], terrain: "plains", unit: "soldier", team: "orange" },
    ],
    [
      { row: 2, column: 0, index: 5, neighbors: [2, 3, 6], terrain: "plains", unit: "none", team: "gray" },
      { row: 2, column: 1, index: 6, neighbors: [3, 4, 5], terrain: "plains", unit: "soldier", team: "purple" },
    ],
  ],
});

export const V1_REPLAY_STEPS: readonly ReplayStep[] = [
  { actor: "purple", action: { action: "move", start: { x: 0, y: 0 }, end: { x: 0, y: 1 } } },
  { actor: "purple", action: { action: "end" } },
  { actor: "orange", action: { action: "move", start: { x: 1, y: 0 }, end: { x: 2, y: 0 } } },
  { actor: "orange", action: { action: "end" } },
  { actor: "purple", action: { action: "attack", attacker: { x: 0, y: 1 }, end: { x: 0, y: 1 }, defender: { x: 1, y: 1 } } },
];

export const V1_REPLAY_EVENTS: readonly DomainEvent[] = [
  { type: "move", actorTeam: "purple", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, unit: "soldier" },
  { type: "endTurn", actorTeam: "purple", nextTeam: "orange", income: 0, money: { orange: 2_000, purple: 2_000 } },
  { type: "move", actorTeam: "orange", start: { x: 1, y: 0 }, end: { x: 2, y: 0 }, unit: "soldier" },
  { type: "endTurn", actorTeam: "orange", nextTeam: "purple", income: 0, money: { orange: 2_000, purple: 2_000 } },
  {
    type: "attack",
    actorTeam: "purple",
    start: { x: 0, y: 1 },
    end: { x: 0, y: 1 },
    defender: { x: 1, y: 1 },
    unit: "soldier",
    defendingUnit: "soldier",
    attackDamage: 15,
    defenseDamage: 10,
    deaths: [],
  },
];

export const V1_REPLAY_SHA256 = "3c1239b93f861722e5b0def42460b89c122cdf84d582ca33b476fe6969d4f642";
