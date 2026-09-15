import {
  NORMALIZED_GAME_SCHEMA_VERSION,
  contentVersion,
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
  STANDARD_CONTENT_VERSION,
  STANDARD_ACTION_CANDIDATE_VERSION,
  STANDARD_RULESET_VERSION,
  enumerateStandardActions,
  type StandardActionCandidate,
} from "@TBS/game-rules";
import { describe, expect, it } from "vitest";

import {
  STANDARD_CANDIDATE_FEATURE_NAMES,
  STANDARD_CELL_FEATURE_NAMES,
  STANDARD_ENTITY_FEATURE_NAMES,
  STANDARD_GLOBAL_FEATURE_NAMES,
  encodeStandardObservation,
  type StandardObservationLimits,
} from "./standard-observation";

const purple = teamId("purple");
const orange = teamId("orange");
const limits: StandardObservationLimits = { cellCount: 5, maxEntities: 10, maxCandidates: 1_000 };

const entity = (
  id: string,
  unit: string,
  owner: ReturnType<typeof teamId>,
  q: number | undefined,
  r: number | undefined,
): EntityState => ({
  id: entityId(id),
  unitTypeId: unitTypeId(unit),
  ownerTeamId: owner,
  ...(q === undefined || r === undefined ? {} : { position: hexCoord(q, r) }),
  health: { current: 100, maximum: 100 },
  actionBudget: { moved: false, acted: false },
  statuses: [],
});

const fixture = (): GameState => {
  const purpleCapital = { ...entity("purple-capital", "capital", purple, 0, 0) };
  const purpleTruck = {
    ...entity("purple-truck", "truck", purple, 0, 1),
    cargo: { capacity: 1, entityIds: [entityId("purple-cargo")] },
  };
  const purpleCargo = entity("purple-cargo", "soldier", purple, undefined, undefined);
  const orangeCapital = entity("orange-capital", "capital", orange, 2, 0);
  return {
    schemaVersion: NORMALIZED_GAME_SCHEMA_VERSION,
    rulesetVersion: STANDARD_RULESET_VERSION,
    contentVersion: STANDARD_CONTENT_VERSION,
    revision: 7,
    lifecycle: { phase: "active", activeTeamId: purple },
    board: {
      cells: Object.fromEntries([
        { position: hexCoord(0, 0), terrainTypeId: terrainTypeId("plains"), occupantEntityId: purpleCapital.id },
        { position: hexCoord(1, 0), terrainTypeId: terrainTypeId("road") },
        { position: hexCoord(2, 0), terrainTypeId: terrainTypeId("plains"), occupantEntityId: orangeCapital.id },
        { position: hexCoord(0, 1), terrainTypeId: terrainTypeId("road"), occupantEntityId: purpleTruck.id },
        { position: hexCoord(1, 1), terrainTypeId: terrainTypeId("forest") },
      ].map((cell) => [hexKey(cell.position), cell])),
    },
    entities: {
      [orangeCapital.id]: orangeCapital,
      [purpleCargo.id]: purpleCargo,
      [purpleTruck.id]: purpleTruck,
      [purpleCapital.id]: purpleCapital,
    },
    teams: {
      [orange]: { id: orange, money: 500 },
      [purple]: { id: purple, money: 2_000 },
    },
    objectives: [
      { type: "capital", position: hexCoord(0, 0), controllingTeamId: purple },
      { type: "capital", position: hexCoord(2, 0), controllingTeamId: orange },
      { type: "elimination", teamId: orange },
      { type: "elimination", teamId: purple },
    ],
    turn: { number: 60 },
  };
};

const encode = (state = fixture()) => encodeStandardObservation({
  state,
  observerTeamId: purple,
  candidateSet: enumerateStandardActions(state, purple),
  limits,
});

describe("standard observation encoding", () => {
  it("encodes graph, cargo, economy, objectives, horizon, and all candidate relations", () => {
    const encoded = encode();
    const { tensors } = encoded;

    expect(tensors.cellFeatures).toHaveLength(5);
    expect(tensors.cellFeatures.every((features) => features.length === STANDARD_CELL_FEATURE_NAMES.length)).toBe(true);
    expect(tensors.cellNeighbors.every((neighbors) => neighbors.length === 6)).toBe(true);
    expect(tensors.entityFeatures.every((features) => features.length === STANDARD_ENTITY_FEATURE_NAMES.length)).toBe(true);
    expect(tensors.candidateFeatures.every((features) => features.length === STANDARD_CANDIDATE_FEATURE_NAMES.length)).toBe(true);
    expect(tensors.globalFeatures).toHaveLength(STANDARD_GLOBAL_FEATURE_NAMES.length);
    expect(tensors.globalFeatures[2]).toBeCloseTo(1 / 60);
    expect(tensors.globalFeatures[5]).toBeCloseTo(0.2);
    expect(tensors.globalFeatures[6]).toBeCloseTo(0.05);
    expect(tensors.entityCarriers.filter((index) => index >= 0)).toHaveLength(1);
    expect(encoded.candidateKeys.some((key) => key.includes("spawn"))).toBe(true);
    expect(encoded.candidateKeys.some((key) => key.includes("unload"))).toBe(true);
    expect(JSON.stringify(tensors)).not.toContain("purple-capital");
  });

  it("is independent of entity and cell record insertion order", () => {
    const state = fixture();
    const reordered: GameState = {
      ...state,
      board: { cells: Object.fromEntries(Object.entries(state.board.cells).reverse()) },
      entities: Object.fromEntries(Object.entries(state.entities).reverse()),
    };

    expect(encode(reordered).tensors).toEqual(encode(state).tensors);
  });

  it("expresses ownership and economy relative to the observing team", () => {
    const state = fixture();
    const candidateSet = enumerateStandardActions(state, purple);
    const purpleView = encodeStandardObservation({ state, observerTeamId: purple, candidateSet, limits });
    const orangeView = encodeStandardObservation({ state, observerTeamId: orange, candidateSet, limits });

    expect(purpleView.tensors.entityFeatures[0]?.slice(0, 3)).toEqual([1, 0, 0]);
    expect(orangeView.tensors.entityFeatures[0]?.slice(0, 3)).toEqual([0, 1, 0]);
    expect(purpleView.tensors.globalFeatures.slice(0, 9)).toEqual([
      1, 1, 1 / 60, 0.2, 0.2, 0.2, 0.05, 0.02, 0.02,
    ]);
    expect(orangeView.tensors.globalFeatures.slice(0, 9)).toEqual([
      0, 1, 1 / 60, 0, 0.2, 0.05, 0.2, 0.02, 0.02,
    ]);
  });

  it("keeps candidate rows and relational indices aligned when candidates are reordered", () => {
    const state = fixture();
    const candidateSet = enumerateStandardActions(state, purple);
    const original = encodeStandardObservation({ state, observerTeamId: purple, candidateSet, limits });
    const reversed = encodeStandardObservation({
      state,
      observerTeamId: purple,
      candidateSet: { ...candidateSet, candidates: [...candidateSet.candidates].reverse() },
      limits,
    });

    expect(reversed.candidateKeys).toEqual([...original.candidateKeys].reverse());
    expect(reversed.tensors.candidateFeatures).toEqual([...original.tensors.candidateFeatures].reverse());
    expect(reversed.tensors.candidateActors).toEqual([...original.tensors.candidateActors].reverse());
    expect(reversed.tensors.candidateDestinations).toEqual([...original.tensors.candidateDestinations].reverse());
    expect(reversed.tensors.candidateTargetEntities).toEqual([...original.tensors.candidateTargetEntities].reverse());
    expect(reversed.tensors.candidateTargetCells).toEqual([...original.tensors.candidateTargetCells].reverse());
  });

  it("represents every standard action family without learning candidate indices", () => {
    const state = fixture();
    const candidates: readonly StandardActionCandidate[] = [
      { key: "attack", action: { type: "attack", actorId: entityId("purple-truck"), destination: hexCoord(0, 1), defenderId: entityId("orange-capital") } },
      { key: "boost", action: { type: "boost", actorId: entityId("purple-truck"), destination: hexCoord(0, 1), targetId: entityId("purple-capital") } },
      { key: "construct", action: { type: "construct", actorId: entityId("purple-cargo"), destination: hexCoord(1, 0), constructionPosition: hexCoord(1, 1), buildingEntityId: entityId("new-building"), buildingUnitTypeId: unitTypeId("office") } },
      { key: "end-turn", action: { type: "end-turn" } },
      { key: "heal", action: { type: "heal", actorId: entityId("purple-cargo"), destination: hexCoord(1, 0), targetId: entityId("purple-capital") } },
      { key: "load", action: { type: "load", actorId: entityId("purple-cargo"), destination: hexCoord(1, 0), vehicleId: entityId("purple-truck") } },
      { key: "move", action: { type: "move", actorId: entityId("purple-truck"), destination: hexCoord(1, 1), objectTarget: hexCoord(2, 0) } },
      { key: "spawn", action: { type: "spawn", actorId: entityId("purple-capital"), destination: hexCoord(1, 0), spawnedEntityId: entityId("new-unit"), unitTypeId: unitTypeId("soldier") } },
      { key: "unload", action: { type: "unload", actorId: entityId("purple-truck"), destination: hexCoord(0, 1), unloadPosition: hexCoord(1, 1) } },
    ];
    const encoded = encodeStandardObservation({
      state,
      observerTeamId: purple,
      candidateSet: {
        version: STANDARD_ACTION_CANDIDATE_VERSION,
        stateRevision: state.revision,
        actorTeamId: purple,
        candidates,
      },
      limits,
    });

    for (const [index, features] of encoded.tensors.candidateFeatures.entries()) {
      expect(features.slice(0, candidates.length)).toEqual(
        candidates.map((_, candidateIndex) => Number(candidateIndex === index)),
      );
    }
  });

  it("rejects incompatible versions, stale candidates, and exceeded model bounds", () => {
    const state = fixture();
    const candidateSet = enumerateStandardActions(state, purple);
    expect(() => encodeStandardObservation({
      state: { ...state, contentVersion: contentVersion("future@1") },
      observerTeamId: purple,
      candidateSet,
      limits,
    })).toThrow("requires content");
    expect(() => encodeStandardObservation({
      state,
      observerTeamId: purple,
      candidateSet: { ...candidateSet, stateRevision: state.revision - 1 },
      limits,
    })).toThrow("stale");
    expect(() => encodeStandardObservation({
      state,
      observerTeamId: purple,
      candidateSet,
      limits: { ...limits, maxEntities: 3 },
    })).toThrow("entity limit");
    expect(() => encodeStandardObservation({
      state,
      observerTeamId: purple,
      candidateSet,
      limits: { ...limits, maxCandidates: 1 },
    })).toThrow("candidate limit");
  });
});
