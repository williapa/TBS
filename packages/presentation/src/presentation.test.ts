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
  applyStandardAction,
  STANDARD_CONTENT_VERSION,
  STANDARD_RULESET_VERSION,
} from "@TBS/game-rules";
import { describe, expect, test } from "vitest";

import {
  advanceGameInteraction,
  AnimationDirector,
  createBoardInteractionView,
  createInitialGameInteractionState,
  DEFAULT_MOVE_DURATION_MS,
  presentBoard,
  presentTeamPanel,
  presentUnitActions,
  presentUnitPanel,
  type AnimationCue,
  type AnimationDriver,
} from "./index";

const orange = teamId("orange");
const purple = teamId("purple");
const orangeSoldier = entityId("orange-soldier");
const orangeTruck = entityId("orange-truck");
const purpleSoldier = entityId("purple-soldier");
const origin = hexCoord(0, 0);
const destination = hexCoord(1, 0);
const enemyPosition = hexCoord(2, 0);
const truckPosition = hexCoord(1, -1);

const createState = (): GameState => ({
  schemaVersion: 2,
  rulesetVersion: STANDARD_RULESET_VERSION,
  contentVersion: STANDARD_CONTENT_VERSION,
  revision: 0,
  lifecycle: { phase: "active", activeTeamId: orange },
  board: {
    cells: {
      [hexKey(origin)]: {
        position: origin,
        terrainTypeId: terrainTypeId("plains"),
        occupantEntityId: orangeSoldier,
      },
      [hexKey(destination)]: {
        position: destination,
        terrainTypeId: terrainTypeId("plains"),
      },
      [hexKey(enemyPosition)]: {
        position: enemyPosition,
        terrainTypeId: terrainTypeId("plains"),
        occupantEntityId: purpleSoldier,
      },
    },
  },
  entities: {
    [orangeSoldier]: {
      id: orangeSoldier,
      unitTypeId: unitTypeId("soldier"),
      ownerTeamId: orange,
      position: origin,
      health: { current: 100, maximum: 100 },
      actionBudget: { moved: false, acted: false },
      statuses: [],
    },
    [purpleSoldier]: {
      id: purpleSoldier,
      unitTypeId: unitTypeId("soldier"),
      ownerTeamId: purple,
      position: enemyPosition,
      health: { current: 80, maximum: 100 },
      actionBudget: { moved: false, acted: false },
      statuses: [],
    },
  },
  teams: {
    [orange]: { id: orange, money: 1_000 },
    [purple]: { id: purple, money: 1_000 },
  },
  objectives: [
    { type: "elimination", teamId: orange },
    { type: "elimination", teamId: purple },
  ],
  turn: { number: 1 },
});

describe("board presenter", () => {
  test("maps normalized cells and entities directly to renderer-neutral semantics", () => {
    const state = createState();
    const focusedCellId = hexKey(destination);
    const interaction = {
      selectedEntityId: purpleSoldier,
      actionableEntityIds: [orangeSoldier],
      focusedCellId,
      legalTargets: [{ cellId: focusedCellId, type: "move" as const }],
    };

    const board = presentBoard({ state, interaction });

    expect(board.revision).toBe(0);
    expect(board.cells).toHaveLength(3);
    expect(board.cells.find(({ id }) => id === focusedCellId)).toMatchObject({
      selection: "focused",
      target: "move",
      terrainAssetId: "terrain:plains",
      neighborIds: [hexKey(origin), hexKey(enemyPosition)],
    });
    expect(board.entities.find(({ id }) => id === purpleSoldier)).toMatchObject({
      id: purpleSoldier,
      assetId: "unit:soldier",
      health: { current: 80, maximum: 100 },
      selected: true,
      actionable: false,
      teamId: purple,
    });
    expect(board.entities.find(({ id }) => id === purpleSoldier)?.accessibleDescription)
      .toContain("purple team");
  });

  test("derives animation cues from standard event entity IDs and axial positions", () => {
    const result = applyStandardAction(createState(), orange, {
      type: "move",
      actorId: orangeSoldier,
      destination,
    });
    if (!result.ok) throw new Error("fixture move should be legal");

    const board = presentBoard({ state: result.state, events: result.events });

    expect(board.animationCues).toEqual([{
      type: "move-entity",
      id: `1:0:${orangeSoldier}`,
      revision: 1,
      entityId: orangeSoldier,
      from: origin,
      to: destination,
      durationMs: DEFAULT_MOVE_DURATION_MS,
    }]);
    expect(board.entities.find(({ id }) => id === orangeSoldier)?.coordinate).toEqual(destination);
  });

  test("derives unit and team panels from authoritative content and rules read models", () => {
    expect(presentUnitPanel(createState(), orangeSoldier)).toMatchObject({
      label: "Soldier",
      attack: 30,
      defense: 15,
      movement: 2,
      movementCosts: [
        { terrainTypeId: "beach", terrainLabel: "Beach", cost: 1 },
        { terrainTypeId: "forest", terrainLabel: "Forest", cost: 1 },
        { terrainTypeId: "mountain", terrainLabel: "Mountain", cost: 3 },
        { terrainTypeId: "road", terrainLabel: "Road", cost: 1 },
        { terrainTypeId: "plains", terrainLabel: "Plains", cost: 1 },
        { terrainTypeId: "desert", terrainLabel: "Desert", cost: 2 },
      ],
      capabilities: expect.arrayContaining(["move", "attack", "loadable"]),
      actions: expect.arrayContaining([
        {
          id: "attack",
          label: "Attack",
          description: "Initiate combat with an adjacent unit, dealing damage first. If enemy is not killed, it will deal retaliatory damage.",
        },
        {
          id: "load",
          label: "Load",
          description: "occupy an allied vehicle unit, moving wherever it goes until unloaded.",
        },
      ]),
    });
    expect(presentTeamPanel(createState(), orange)).toEqual({
      teamId: orange,
      money: 1_000,
      income: 0,
      active: true,
    });
  });

  test("presents detailed action copy and unit-specific valid targets", () => {
    expect(presentUnitActions(unitTypeId("scientist"))).toContainEqual({
      id: "boost",
      label: "Boost",
      description: "Boost the combat stats of an allied unit. Valid targets: adjacent allied buildings that are not already boosted.",
    });
    expect(presentUnitActions(unitTypeId("worker"))).toContainEqual({
      id: "heal",
      label: "Heal",
      description: "Increase the health of a damaged unit Valid targets: adjacent allied damaged ground vehicles.",
    });
  });

  test("omits movement costs for units that cannot move", () => {
    const state = createState();
    const bankState: GameState = {
      ...state,
      entities: {
        ...state.entities,
        [orangeSoldier]: {
          ...state.entities[orangeSoldier],
          unitTypeId: unitTypeId("bank"),
        },
      },
    };
    expect(presentUnitPanel(bankState, orangeSoldier)?.movementCosts).toEqual([]);
  });

  test("preserves healthless objects without inventing zero health", () => {
    const money = entityId("money");
    const state = createState();
    const objectState: GameState = {
      ...state,
      board: {
        cells: {
          ...state.board.cells,
          [hexKey(destination)]: {
            ...state.board.cells[hexKey(destination)],
            occupantEntityId: money,
          },
        },
      },
      entities: {
        ...state.entities,
        [money]: {
          id: money,
          unitTypeId: unitTypeId("money"),
          position: destination,
          statuses: [],
        },
      },
    };

    const presented = presentBoard({ state: objectState }).entities
      .find(({ id }) => id === money);

    expect(presented).toMatchObject({
      accessibleDescription: "Money, neutral",
      health: null,
    });
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
  const context = () => ({
    active: true,
    state: createState(),
    menuPosition: { left: 10, top: 20 },
    perspective: orange,
  });

  test("uses shared legality selectors and treats choosing an ordinary move as confirmation", () => {
    const selected = advanceGameInteraction(
      createInitialGameInteractionState(),
      { type: "select-entity", entityId: orangeSoldier },
      context(),
    );
    expect(selected.command).toBeUndefined();
    expect(selected.state.mode).toBe("unit-selected");
    expect(selected.state.legalTargets.map(({ cellId }) => cellId)).toContain(hexKey(destination));

    const targeted = advanceGameInteraction(
      selected.state,
      { type: "select-cell", cell: destination },
      context(),
    );
    expect(targeted.state.menu?.options.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["move", "attack", "cancel"]),
    );

    const move = advanceGameInteraction(
      targeted.state,
      { type: "choose-action", actionType: "move" },
      context(),
    );
    expect(move.command).toEqual({
      type: "move",
      actorId: orangeSoldier,
      destination,
    });
    expect(move.state).toEqual(createInitialGameInteractionState());
  });

  test("keeps projectile-collection moves in targeting until the object target is confirmed", () => {
    const missile = entityId("missile");
    const state = createState();
    const projectileState: GameState = {
      ...state,
      board: {
        cells: {
          ...state.board.cells,
          [hexKey(destination)]: {
            ...state.board.cells[hexKey(destination)],
            occupantEntityId: missile,
          },
        },
      },
      entities: {
        ...state.entities,
        [missile]: {
          id: missile,
          unitTypeId: unitTypeId("missile"),
          position: destination,
          statuses: [],
        },
      },
    };
    const projectileContext = { ...context(), state: projectileState };
    const selected = advanceGameInteraction(
      createInitialGameInteractionState(),
      { type: "select-entity", entityId: orangeSoldier },
      projectileContext,
    );
    const destinationSelected = advanceGameInteraction(
      selected.state,
      { type: "select-cell", cell: destination },
      projectileContext,
    );
    const targeting = advanceGameInteraction(
      destinationSelected.state,
      { type: "choose-action", actionType: "move" },
      projectileContext,
    );

    expect(targeting.command).toBeUndefined();
    expect(targeting.state.mode).toBe("targeting");
    expect(targeting.state.legalTargets).toEqual([{
      cellId: hexKey(enemyPosition),
      type: "move",
      entityId: purpleSoldier,
    }]);

    const targetSelected = advanceGameInteraction(
      targeting.state,
      { type: "select-entity", entityId: purpleSoldier },
      projectileContext,
    );
    expect(targetSelected.state.menu?.options.map(({ id }) => id)).toEqual(["confirm", "cancel"]);

    const confirmed = advanceGameInteraction(targetSelected.state, { type: "confirm" }, projectileContext);
    expect(confirmed.command).toEqual({
      type: "move",
      actorId: orangeSoldier,
      destination,
      objectTarget: enemyPosition,
    });
  });

  test("lists every production option and disables choices the team cannot afford", () => {
    const state = createState();
    const capitalState: GameState = {
      ...state,
      entities: {
        ...state.entities,
        [orangeSoldier]: {
          ...state.entities[orangeSoldier],
          unitTypeId: unitTypeId("capital"),
        },
      },
      teams: {
        ...state.teams,
        [orange]: { id: orange, money: 100 },
      },
    };
    const capitalContext = { ...context(), state: capitalState };
    const selected = advanceGameInteraction(
      createInitialGameInteractionState(),
      { type: "select-entity", entityId: orangeSoldier },
      capitalContext,
    );
    const spawnMenu = advanceGameInteraction(
      selected.state,
      { type: "choose-action", actionType: "spawn" },
      capitalContext,
    );

    expect(spawnMenu.state.menu?.options).toEqual([
      {
        disabled: true,
        id: "spawn:soldier",
        label: "Soldier ($200)",
        unitTypeId: "soldier",
      },
      {
        disabled: true,
        id: "spawn:leader",
        label: "Leader ($1000)",
        unitTypeId: "leader",
      },
      {
        disabled: false,
        id: "spawn:constructionWorker",
        label: "Construction Worker ($100)",
        unitTypeId: "constructionWorker",
      },
      { id: "cancel", label: "Cancel" },
    ]);
  });

  test("targets entities by stable ID and exposes one board interaction view", () => {
    const selected = advanceGameInteraction(
      createInitialGameInteractionState(),
      { type: "select-entity", entityId: orangeSoldier },
      context(),
    );
    const moved = advanceGameInteraction(selected.state, { type: "select-cell", cell: destination }, context());
    const attacking = advanceGameInteraction(
      moved.state,
      { type: "choose-action", actionType: "attack" },
      context(),
    );
    expect(attacking.state.legalTargets).toEqual([{
      cellId: hexKey(enemyPosition),
      type: "attack",
      entityId: purpleSoldier,
    }]);
    const chosen = advanceGameInteraction(
      attacking.state,
      { type: "select-entity", entityId: purpleSoldier },
      context(),
    );
    const confirmed = advanceGameInteraction(chosen.state, { type: "confirm" }, context());
    expect(confirmed.command).toEqual({
      type: "attack",
      actorId: orangeSoldier,
      destination,
      defenderId: purpleSoldier,
    });

    expect(createBoardInteractionView(attacking.state, context(), hexKey(destination)))
      .toMatchObject({
        selectedEntityId: orangeSoldier,
        focusedCellId: hexKey(destination),
        legalTargets: [{ cellId: hexKey(enemyPosition), type: "attack" }],
      });
  });

  test("reuses a snapshot interaction preview for rendering and entity selection", () => {
    const initial = createInitialGameInteractionState();
    const preview = { actionableEntityIds: [] };

    expect(createBoardInteractionView(initial, context(), null, preview).actionableEntityIds)
      .toBe(preview.actionableEntityIds);
    expect(advanceGameInteraction(
      initial,
      { type: "select-entity", entityId: orangeSoldier },
      { ...context(), preview },
    ).state).toEqual(initial);
  });

  test("keeps a friendly load target selected until confirm emits the load draft", () => {
    const state = createState();
    const transportState: GameState = {
      ...state,
      board: {
        cells: {
          ...state.board.cells,
          [hexKey(truckPosition)]: {
            position: truckPosition,
            terrainTypeId: terrainTypeId("plains"),
            occupantEntityId: orangeTruck,
          },
        },
      },
      entities: {
        ...state.entities,
        [orangeTruck]: {
          id: orangeTruck,
          unitTypeId: unitTypeId("truck"),
          ownerTeamId: orange,
          position: truckPosition,
          health: { current: 100, maximum: 100 },
          actionBudget: { moved: false, acted: false },
          statuses: [],
        },
      },
    };
    const transportContext = { ...context(), state: transportState };
    const selected = advanceGameInteraction(
      createInitialGameInteractionState(),
      { type: "select-entity", entityId: orangeSoldier },
      transportContext,
    );
    const moved = advanceGameInteraction(
      selected.state,
      { type: "select-cell", cell: destination },
      transportContext,
    );
    const targeting = advanceGameInteraction(
      moved.state,
      { type: "choose-action", actionType: "load" },
      transportContext,
    );

    const targetSelected = advanceGameInteraction(
      targeting.state,
      { type: "select-entity", entityId: orangeTruck },
      transportContext,
    );

    expect(targetSelected.command).toBeUndefined();
    expect(targetSelected.state).toMatchObject({
      mode: "action-menu",
      selectedEntityId: orangeSoldier,
      selectedTargetEntityId: orangeTruck,
    });
    expect(targetSelected.state.menu?.options).toEqual([
      { id: "confirm", label: "Confirm Load" },
      { id: "cancel", label: "Cancel" },
    ]);

    const confirmed = advanceGameInteraction(
      targetSelected.state,
      { type: "confirm" },
      transportContext,
    );
    expect(confirmed.command).toEqual({
      type: "load",
      actorId: orangeSoldier,
      destination,
      vehicleId: orangeTruck,
    });
    expect(confirmed.state).toEqual(createInitialGameInteractionState());
  });

  test("does not emit drafts or selection state for an inactive perspective", () => {
    const inactiveContext = { ...context(), active: false };
    const result = advanceGameInteraction(
      createInitialGameInteractionState(),
      { type: "select-entity", entityId: orangeSoldier },
      inactiveContext,
    );
    expect(result.state).toEqual(createInitialGameInteractionState());
    expect(result.command).toBeUndefined();
    expect(result.inspectedCellId).toBe(hexKey(origin));
  });
});
