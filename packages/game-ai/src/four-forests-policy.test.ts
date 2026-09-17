import {
  NORMALIZED_GAME_SCHEMA_VERSION,
  entityId,
  hexCoord,
  hexKey,
  teamId,
  terrainTypeId,
  unitTypeId,
  type EntityState,
  type GameState,
} from "@TBS/game-core";
import {
  STANDARD_ACTION_CANDIDATE_VERSION,
  STANDARD_CONTENT_VERSION,
  STANDARD_RULESET_VERSION,
  type StandardActionCandidate,
  type StandardActionCandidateSet,
} from "@TBS/game-rules";
import { describe, expect, it } from "vitest";

import { selectFourForestsCandidateIndex } from "./four-forests-policy";

const orange = teamId("orange");
const purple = teamId("purple");

const entity = (id: string, unit: string, owner: typeof orange, q: number, r: number): EntityState => ({
  id: entityId(id),
  unitTypeId: unitTypeId(unit),
  ownerTeamId: owner,
  position: hexCoord(q, r),
  health: { current: 100, maximum: 100 },
  actionBudget: { acted: false, moved: false },
  statuses: [],
});

const fixture = (): GameState => {
  const entities = [
    entity("orange-capital", "capital", orange, -2, 1),
    entity("purple-capital", "capital", purple, 2, -1),
  ];
  const cells = [];
  for (let q = -2; q <= 2; q += 1) {
    for (let r = -1; r <= 1; r += 1) {
      const occupant = entities.find(({ position }) => position?.q === q && position.r === r);
      cells.push({
        position: hexCoord(q, r),
        terrainTypeId: terrainTypeId("forest"),
        ...(occupant ? { occupantEntityId: occupant.id } : {}),
      });
    }
  }
  return {
    schemaVersion: NORMALIZED_GAME_SCHEMA_VERSION,
    rulesetVersion: STANDARD_RULESET_VERSION,
    contentVersion: STANDARD_CONTENT_VERSION,
    revision: 4,
    lifecycle: { phase: "active", activeTeamId: orange },
    board: { cells: Object.fromEntries(cells.map((cell) => [hexKey(cell.position), cell])) },
    entities: Object.fromEntries(entities.map((value) => [value.id, value])),
    teams: {
      [orange]: { id: orange, money: 1_000 },
      [purple]: { id: purple, money: 900 },
    },
    objectives: [
      { type: "capital", position: hexCoord(-2, 1), controllingTeamId: orange },
      { type: "capital", position: hexCoord(2, -1), controllingTeamId: purple },
      { type: "elimination", teamId: orange },
      { type: "elimination", teamId: purple },
    ],
    turn: { number: 5 },
  };
};

const candidateSet = (
  state: GameState,
  candidates: readonly StandardActionCandidate[],
): StandardActionCandidateSet => ({
  version: STANDARD_ACTION_CANDIDATE_VERSION,
  stateRevision: state.revision,
  actorTeamId: orange,
  candidates,
});

describe("Four Forests objective policy", () => {
  it("recovers the canonical construction-worker opening outside the model top five", () => {
    const state = fixture();
    const candidates: readonly StandardActionCandidate[] = [
      { key: "end", action: { type: "end-turn" } },
      {
        key: "leader",
        action: {
          type: "spawn",
          actorId: entityId("orange-capital"),
          destination: hexCoord(-1, 1),
          spawnedEntityId: entityId("leader"),
          unitTypeId: unitTypeId("leader"),
        },
      },
      {
        key: "worker",
        action: {
          type: "spawn",
          actorId: entityId("orange-capital"),
          destination: hexCoord(-1, 1),
          spawnedEntityId: entityId("worker"),
          unitTypeId: unitTypeId("constructionWorker"),
        },
      },
    ];

    expect(selectFourForestsCandidateIndex({
      state,
      candidateSet: candidateSet(state, candidates),
      policyLogits: [10, 9, 1],
    })).toBe(2);
  });

  it("considers every objective-attacker move and avoids a recent position", () => {
    const base = fixture();
    const additions = [
      entity("orange-office", "office", orange, -2, 0),
      entity("orange-church", "church", orange, -1, -1),
      entity("orange-michael", "michaelJackson", orange, -1, 0),
    ];
    const state: GameState = {
      ...base,
      entities: {
        ...base.entities,
        ...Object.fromEntries(additions.map((value) => [value.id, value])),
      },
      board: {
        cells: {
          ...base.board.cells,
          [hexKey(hexCoord(-2, 0))]: {
            ...base.board.cells[hexKey(hexCoord(-2, 0))],
            occupantEntityId: entityId("orange-office"),
          },
          [hexKey(hexCoord(-1, -1))]: {
            ...base.board.cells[hexKey(hexCoord(-1, -1))],
            occupantEntityId: entityId("orange-church"),
          },
          [hexKey(hexCoord(-1, 0))]: {
            ...base.board.cells[hexKey(hexCoord(-1, 0))],
            occupantEntityId: entityId("orange-michael"),
          },
        },
      },
    };
    const candidates: readonly StandardActionCandidate[] = [
      ...Array.from({ length: 5 }, (_, index) => ({
        key: `end-${index}`,
        action: { type: "end-turn" as const },
      })),
      {
        key: "direct",
        action: { type: "move", actorId: entityId("orange-michael"), destination: hexCoord(0, 0) },
      },
      {
        key: "alternate",
        action: { type: "move", actorId: entityId("orange-michael"), destination: hexCoord(0, 1) },
      },
    ];
    const set = candidateSet(state, candidates);
    expect(selectFourForestsCandidateIndex({
      state,
      candidateSet: set,
      policyLogits: [10, 9, 8, 7, 6, 1, 0.5],
    })).toBe(5);
    expect(selectFourForestsCandidateIndex({
      state,
      candidateSet: set,
      policyLogits: [10, 9, 8, 7, 6, 1, 0.5],
      recentPositions: new Map([[entityId("orange-michael"), new Set([hexKey(hexCoord(0, 0))])]]),
    })).toBe(6);
  });
});
