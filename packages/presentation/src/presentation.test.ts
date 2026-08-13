import { createActiveGameSnapshot } from "@TBS/common";
import type { DomainEvent, GameState } from "@TBS/common";
import { entityId, hexKey, legacyOffsetToAxial } from "@TBS/game-core";
import { describe, expect, test } from "vitest";

import {
  advanceGameInteraction,
  AnimationDirector,
  createInitialGameInteractionState,
  DEFAULT_MOVE_DURATION_MS,
  presentBoard,
  type AnimationCue,
  type AnimationDriver,
} from "./index";

const movedState = (): GameState => {
  const state = structuredClone(createActiveGameSnapshot().state);
  state.revision = 1;
  state.map[0][0] = {
    ...state.map[0][0],
    entityId: undefined,
    unit: "none",
    team: "gray",
  };
  state.map[0][1] = {
    ...state.map[0][1],
    damage: 20,
    entityId: entityId("purple-soldier-1"),
    moved: true,
    unit: "soldier",
    team: "purple",
  };
  return state;
};

describe("board presenter", () => {
  test("maps canonical state to renderer-neutral cells, entities, semantics, and cues", () => {
    const state = movedState();
    const selected = entityId("purple-soldier-1");
    const focusedCellId = hexKey(legacyOffsetToAxial(0, 0, 2));
    const events: readonly DomainEvent[] = [{
      type: "move",
      actorTeam: "purple",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      unit: "soldier",
    }];

    const board = presentBoard({
      state,
      events,
      interaction: {
        selectedEntityId: selected,
        actionableEntityIds: [selected],
        focusedCellId,
        legalTargets: [{ cellIndex: 0, type: "move" }],
      },
    });

    expect(board.revision).toBe(1);
    expect(board.cells).toHaveLength(2);
    expect(board.cells[0]).toMatchObject({
      id: focusedCellId,
      selection: "focused",
      target: "move",
      terrainAssetId: "terrain:plains",
    });
    expect(board.entities).toEqual([
      expect.objectContaining({
        id: selected,
        assetId: "unit:soldier",
        health: { current: 80, maximum: 100 },
        statuses: ["moved"],
        selected: true,
        actionable: true,
      }),
    ]);
    expect(board.animationCues).toEqual([{
      type: "move-entity",
      id: `1:0:${selected}`,
      revision: 1,
      entityId: selected,
      from: legacyOffsetToAxial(0, 0, 2),
      to: legacyOffsetToAxial(0, 1, 2),
      durationMs: DEFAULT_MOVE_DURATION_MS,
    }]);
    expect(board.entities[0].accessibleDescription).toContain("purple team");
  });

  test("provides deterministic compatibility identities for old id-less states", () => {
    const board = presentBoard({ state: createActiveGameSnapshot().state });
    expect(board.entities.map(({ id }) => id)).toEqual(["legacy-cell-0", "legacy-cell-1"]);
  });
});

describe("animation director", () => {
  const cue = (revision: number, suffix: string): AnimationCue => ({
    type: "move-entity",
    id: `${revision}-${suffix}`,
    revision,
    entityId: entityId(`unit-${suffix}`),
    from: { q: 0, r: 0 },
    to: { q: 1, r: 0 },
    durationMs: 260,
  });

  const controlledDriver = () => {
    const callbacks: Array<() => void> = [];
    const played: string[] = [];
    let settled = 0;
    const driver: AnimationDriver = {
      play: (item, onSettled) => {
        played.push(item.id);
        callbacks.push(onSettled);
        return { cancel: () => undefined };
      },
      settleToCanonical: () => { settled += 1; },
    };
    return { callbacks, driver, played, settled: () => settled };
  };

  test("plays adjacent cues in order without blocking canonical revisions", () => {
    const harness = controlledDriver();
    const director = new AnimationDirector();
    director.reconcile(1, [cue(1, "a"), cue(1, "b")], false, harness.driver);
    expect(harness.played).toEqual(["1-a"]);
    expect(director.snapshot()).toEqual({
      activeCueId: "1-a",
      queuedCueIds: ["1-b"],
      revision: 1,
    });
    harness.callbacks.shift()?.();
    expect(harness.played).toEqual(["1-a", "1-b"]);
  });

  test("settles immediately for replay gaps, reduced motion, and queue overflow", () => {
    const harness = controlledDriver();
    const director = new AnimationDirector({ maximumQueuedCues: 1 });
    director.reconcile(2, [cue(2, "gap")], false, harness.driver);
    director.reconcile(3, [cue(3, "reduced")], true, harness.driver);
    director.reconcile(4, [cue(4, "a"), cue(4, "b")], false, harness.driver);
    expect(harness.played).toEqual([]);
    expect(harness.settled()).toBe(3);
    expect(director.snapshot()).toEqual({ queuedCueIds: [], revision: 4 });
  });
});

describe("semantic interaction controller", () => {
  test("turns renderer intents into selection state and emits a command only on confirmation", () => {
    const map = [[
      { row: 0, column: 0, index: 0, neighbors: [1], terrain: "plains" as const, unit: "soldier" as const, team: "orange" as const },
      { row: 0, column: 1, index: 1, neighbors: [0, 2], terrain: "plains" as const, unit: "none" as const, team: "gray" as const },
      { row: 0, column: 2, index: 2, neighbors: [1], terrain: "plains" as const, unit: "soldier" as const, team: "purple" as const },
    ]];
    const context = {
      active: true,
      availableFunds: 0,
      map,
      menuPosition: { left: 10, top: 20 },
      perspective: "orange" as const,
    };
    const selected = advanceGameInteraction(
      createInitialGameInteractionState(),
      { type: "select-entity", entityId: entityId("legacy-cell-0") },
      context,
    );
    expect(selected.command).toBeUndefined();
    expect(selected.state.mode).toBe("unitSelected");

    const targeted = advanceGameInteraction(
      selected.state,
      { type: "select-cell", cell: legacyOffsetToAxial(0, 1, 3) },
      context,
    );
    expect(targeted.command).toBeUndefined();
    expect(targeted.state.menu?.kind).toBe("move");

    const confirmed = advanceGameInteraction(targeted.state, { type: "confirm" }, context);
    expect(confirmed.command).toEqual({
      action: "move",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    });
    expect(confirmed.state).toEqual(createInitialGameInteractionState());
  });
});
