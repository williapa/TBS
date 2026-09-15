import {
  entityId,
  getHexNeighbors,
  hexKey,
  rulesetVersion,
  teamId,
  unitTypeId,
  type EntityState,
  type GameState,
} from "@TBS/game-core";
import { applyStandardAction, validateStandardAction } from "@TBS/game-rules";
import { describe, expect, it } from "vitest";

import {
  PRODUCTION_AI_PRESET_IDS,
  StandardTrainingEnvironment,
  type CandidateSelection,
  type TrainingObservation,
  type TrainingSnapshot,
} from "./environment";

const orange = teamId("orange");
const purple = teamId("purple");

const selectionFor = (
  observation: TrainingObservation,
  predicate: (action: TrainingObservation["candidates"][number]["action"]) => boolean,
): CandidateSelection => {
  const candidateIndex = observation.candidates.findIndex(({ action }) => predicate(action));
  const candidate = observation.candidates[candidateIndex];
  if (!candidate || candidateIndex < 0) throw new Error("test candidate is unavailable");
  return {
    candidateVersion: observation.candidateVersion,
    stateRevision: observation.stateRevision,
    candidateIndex,
    candidateKey: candidate.key,
  };
};

const withState = (snapshot: TrainingSnapshot, state: GameState): TrainingSnapshot => ({
  ...snapshot,
  state,
});

const finalTurnDuel = (state: GameState): GameState => {
  const firstCell = Object.values(state.board.cells)[0];
  const secondPosition = firstCell
    ? getHexNeighbors(firstCell.position).find((position) => Boolean(state.board.cells[hexKey(position)]))
    : undefined;
  if (!firstCell || !secondPosition) throw new Error("test map lacks adjacent cells");
  const secondKey = hexKey(secondPosition);
  const attackerId = entityId("final-turn-attacker");
  const defenderId = entityId("final-turn-defender");
  const attacker: EntityState = {
    id: attackerId,
    unitTypeId: unitTypeId("soldier"),
    ownerTeamId: orange,
    position: firstCell.position,
    health: { current: 100, maximum: 100 },
    actionBudget: { moved: false, acted: false },
    statuses: [],
  };
  const defender: EntityState = {
    id: defenderId,
    unitTypeId: unitTypeId("soldier"),
    ownerTeamId: purple,
    position: secondPosition,
    health: { current: 1, maximum: 100 },
    actionBudget: { moved: false, acted: false },
    statuses: [],
  };
  return {
    ...state,
    revision: 0,
    lifecycle: { phase: "active", activeTeamId: orange },
    turn: { number: 60 },
    board: {
      cells: Object.fromEntries(Object.entries(state.board.cells).map(([key, cell]) => [
        key,
        {
          ...cell,
          ...(key === hexKey(firstCell.position)
            ? { occupantEntityId: attackerId }
            : key === secondKey
              ? { occupantEntityId: defenderId }
              : { occupantEntityId: undefined }),
        },
      ])),
    },
    entities: { [attackerId]: attacker, [defenderId]: defender },
    objectives: [
      { type: "elimination", teamId: orange },
      { type: "elimination", teamId: purple },
    ],
  };
};

describe("StandardTrainingEnvironment", () => {
  it("resets each production preset with purple first and only accepted candidates", () => {
    for (const presetId of PRODUCTION_AI_PRESET_IDS) {
      const environment = new StandardTrainingEnvironment();
      const observation = environment.reset(presetId, 123);
      expect(observation.presetId).toBe(presetId);
      expect(observation.state.lifecycle).toEqual({ phase: "active", activeTeamId: purple });
      expect(observation.state.turn.number).toBe(1);
      expect(observation.candidates.length).toBeGreaterThan(1);
      const encoded = environment.encode();
      expect(encoded.tensors.cellFeatures).toHaveLength(encoded.limits.cellCount);
      expect(encoded.candidateKeys).toEqual(observation.candidates.map(({ key }) => key));
      for (const { action } of observation.candidates) {
        expect(validateStandardAction(observation.state, purple, action).ok).toBe(true);
        expect(applyStandardAction(observation.state, purple, action).ok).toBe(true);
      }
    }
  });

  it("binds selections to candidate version, revision, index, and semantic key", () => {
    const environment = new StandardTrainingEnvironment();
    const before = environment.reset("four-forests", 1);
    const selection = selectionFor(before, ({ type }) => type === "end-turn");
    environment.step(selection);
    expect(() => environment.step(selection)).toThrow(/revision is stale/);
    expect(() => environment.step({
      ...selection,
      stateRevision: environment.observe().stateRevision,
      candidateKey: `${selection.candidateKey}-stale`,
    }))
      .toThrow(/mapping is stale/);
  });

  it("preserves immutable state and exact replay across same-team command sequences", () => {
    const environment = new StandardTrainingEnvironment();
    const first = environment.reset("four-forests", 42);
    const originalState = structuredClone(first.state);
    const firstTransition = environment.step(selectionFor(first, ({ type }) => type !== "end-turn"));
    expect(first.state).toEqual(originalState);
    expect(firstTransition.observation.actorTeamId).toBe(purple);
    const second = firstTransition.observation;
    environment.step(selectionFor(second, ({ type }) => type !== "end-turn"));
    const expected = environment.observe();
    const replay = environment.createReplay();

    const replayed = new StandardTrainingEnvironment().replay(replay);
    expect(replayed).toEqual(expected);
  });

  it("marks a command budget cutoff as truncation rather than a canonical draw", () => {
    const environment = new StandardTrainingEnvironment();
    const before = environment.reset("four-forests", 7, 1);
    const result = environment.step(selectionFor(before, ({ type }) => type === "end-turn"));
    expect(result.observation.status).toBe("truncated");
    expect(result.observation.state.lifecycle.phase).toBe("active");
    expect(result.observation.candidates).toEqual([]);
    expect(result.observation.rewards).toEqual({ orange: 0, purple: 0 });
    expect(result.observation.bootstrapAllowed).toBe(true);
  });

  it("treats manual and automatic turn-60 completion as terminal draws for both teams", () => {
    const manual = new StandardTrainingEnvironment();
    manual.reset("four-forests", 9);
    const manualSnapshot = manual.snapshot();
    const manualState: GameState = {
      ...manualSnapshot.state,
      lifecycle: { phase: "active", activeTeamId: orange },
      turn: { number: 60 },
    };
    const beforeManual = manual.restore(withState(manualSnapshot, manualState));
    const manualResult = manual.step(selectionFor(beforeManual, ({ type }) => type === "end-turn"));
    expect(manualResult.observation.state.lifecycle).toEqual({ phase: "finished", result: "draw" });
    expect(manualResult.observation.state.turn.number).toBe(61);
    expect(manualResult.observation.status).toBe("terminated");
    expect(manualResult.observation.rewards).toEqual({ orange: 0, purple: 0 });
    expect(manualResult.observation.bootstrapAllowed).toBe(false);
    expect(manualResult.observation.candidates).toEqual([]);
    expect(() => manual.step(selectionFor(beforeManual, ({ type }) => type === "end-turn"))).toThrow(/terminated/);
    expect(new StandardTrainingEnvironment().replay(manual.createReplay())).toEqual(manualResult.observation);

    const automatic = new StandardTrainingEnvironment();
    automatic.reset("four-forests", 10);
    const automaticSnapshot = automatic.snapshot();
    const purpleEntities = Object.values(automaticSnapshot.state.entities)
      .filter((entity) => entity.ownerTeamId === purple && Boolean(entity.position));
    const acting = purpleEntities.find((entity) =>
      automaticSnapshot.state.entities[entity.id]?.actionBudget && entity.unitTypeId !== "capital");
    if (!acting) throw new Error("test preset has no purple actor");
    const automaticState: GameState = {
      ...automaticSnapshot.state,
      lifecycle: { phase: "active", activeTeamId: purple },
      turn: { number: 60 },
      entities: Object.fromEntries(Object.entries(automaticSnapshot.state.entities).map(([id, entity]) => [
        id,
        entity.ownerTeamId === purple && entity.id !== acting.id && entity.actionBudget
          ? { ...entity, actionBudget: { moved: true, acted: true } }
          : entity,
      ])),
    };
    const beforeAutomatic = automatic.restore(withState(automaticSnapshot, automaticState));
    const automaticResult = automatic.step(selectionFor(beforeAutomatic, (action) =>
      action.type !== "end-turn" && "actorId" in action && action.actorId === acting.id));
    expect(automaticResult.observation.state.lifecycle).toEqual({ phase: "finished", result: "draw" });
  });

  it("preserves final-turn victory precedence and terminal rewards", () => {
    const environment = new StandardTrainingEnvironment();
    environment.reset("four-forests", 11);
    const snapshot = environment.snapshot();
    const before = environment.restore(withState(snapshot, finalTurnDuel(snapshot.state)));
    const result = environment.step(selectionFor(before, ({ type }) => type === "attack"));
    expect(result.observation.state.lifecycle).toEqual({ phase: "finished", winnerTeamId: orange });
    expect(result.observation.rewards).toEqual({ orange: 1, purple: -1 });
    expect(result.observation.bootstrapAllowed).toBe(false);
    expect(result.observation.state.turn.number).toBe(60);
  });

  it("round-trips snapshots and rejects legacy standard@1 state", () => {
    const environment = new StandardTrainingEnvironment();
    const before = environment.reset("money-mountain", 17);
    environment.step(selectionFor(before, ({ type }) => type === "end-turn"));
    const snapshot = structuredClone(environment.snapshot());
    expect(new StandardTrainingEnvironment().restore(snapshot)).toEqual(environment.observe());

    const legacy = withState(snapshot, { ...snapshot.state, rulesetVersion: rulesetVersion("standard@1") });
    expect(() => new StandardTrainingEnvironment().restore(legacy)).toThrow(/legacy games are not accepted/);
  });
});
