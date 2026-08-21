import {
  NORMALIZED_GAME_SCHEMA_VERSION,
  contentVersion,
  entityId,
  hexCoord,
  hexKey,
  teamId,
  terrainTypeId,
  unitTypeId,
  type BoardCellState,
  type EntityState,
  type GameState,
} from "@TBS/game-core";
import { describe, expect, it } from "vitest";

import { parseMoveAction } from "../actions/move";
import { calculateCombatDamage, getEffectiveCombatStats } from "../content/combat";
import {
  getActionableEntityIds,
  getAttackTargetIds,
  getAvailableActionTypes,
  getEntityCapabilities,
  getLegalMoveOptions,
  getLegalMovePositions,
  getLegalProductionOptions,
  getTeamIncome,
  hasAnyLegalAction,
  isSelectableEntity,
} from "../selectors/standard-legality";
import {
  applyStandardAction,
  STANDARD_RULESET_VERSION,
  standardActionTypes,
  standardRuleServices,
  validateStandardAction,
} from "./standard";

const orange = teamId("orange");
const purple = teamId("purple");
const soldier = entityId("soldier-1");
const orangeReserve = entityId("orange-reserve");
const purpleGuard = entityId("purple-guard");

const stateFixture = (): GameState => {
  const positions = [hexCoord(0, 0), hexCoord(1, 0), hexCoord(2, 0), hexCoord(1, -1), hexCoord(0, 1)];
  const cells: Record<string, BoardCellState> = Object.fromEntries(positions.map((position) => [
    hexKey(position),
    { position, terrainTypeId: terrainTypeId("plains") },
  ]));
  cells[hexKey(positions[0])] = { ...cells[hexKey(positions[0])], occupantEntityId: soldier };
  cells[hexKey(positions[3])] = { ...cells[hexKey(positions[3])], occupantEntityId: purpleGuard };
  cells[hexKey(positions[4])] = { ...cells[hexKey(positions[4])], occupantEntityId: orangeReserve };

  return {
    schemaVersion: NORMALIZED_GAME_SCHEMA_VERSION,
    rulesetVersion: STANDARD_RULESET_VERSION,
    contentVersion: contentVersion("standard@1"),
    revision: 0,
    lifecycle: { phase: "active", activeTeamId: orange },
    board: { cells },
    entities: {
      [soldier]: {
        id: soldier,
        unitTypeId: unitTypeId("soldier"),
        ownerTeamId: orange,
        position: positions[0],
        health: { current: 100, maximum: 100 },
        actionBudget: { moved: false, acted: false },
        statuses: [],
      },
      [orangeReserve]: {
        id: orangeReserve,
        unitTypeId: unitTypeId("soldier"),
        ownerTeamId: orange,
        position: positions[4],
        health: { current: 100, maximum: 100 },
        actionBudget: { moved: false, acted: false },
        statuses: [],
      },
      [purpleGuard]: {
        id: purpleGuard,
        unitTypeId: unitTypeId("soldier"),
        ownerTeamId: purple,
        position: positions[3],
        health: { current: 100, maximum: 100 },
        actionBudget: { moved: false, acted: false },
        statuses: [],
      },
    },
    teams: {
      [orange]: { id: orange, money: 0 },
      [purple]: { id: purple, money: 0 },
    },
    objectives: [],
    turn: { number: 1 },
  };
};

const placeEntity = (state: GameState, entity: EntityState): GameState => {
  if (!entity.position) throw new Error("test entity must have a position");
  const key = hexKey(entity.position);
  const cell = state.board.cells[key];
  if (!cell) throw new Error(`test position is missing: ${key}`);
  return {
    ...state,
    board: { cells: { ...state.board.cells, [key]: { ...cell, occupantEntityId: entity.id } } },
    entities: { ...state.entities, [entity.id]: entity },
  };
};

describe("standard ruleset action registry", () => {
  it("constructs an explicit stable registry", () => {
    expect(standardActionTypes).toEqual([
      "move",
      "attack",
      "boost",
      "heal",
      "construct",
      "spawn",
      "load",
      "unload",
      "end-turn",
    ]);
  });

  it("moves by stable entity ID without mutating the input", () => {
    const state = stateFixture();
    const result = applyStandardAction(state, orange, {
      type: "move",
      actorId: soldier,
      destination: hexCoord(2, 0),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).not.toBe(state);
    expect(state.entities[soldier]?.position).toEqual({ q: 0, r: 0 });
    expect(result.state.entities[soldier]?.position).toEqual({ q: 2, r: 0 });
    expect(result.state.entities[soldier]?.actionBudget).toEqual({ moved: true, acted: true });
    expect(result.state.board.cells[hexKey(hexCoord(0, 0))]?.occupantEntityId).toBeUndefined();
    expect(result.events).toEqual([expect.objectContaining({
      type: "unit-moved",
      entityId: soldier,
      start: { q: 0, r: 0 },
      end: { q: 2, r: 0 },
    })]);
  });

  it("returns typed rejections without mutation", () => {
    const state = stateFixture();
    const result = applyStandardAction(state, purple, {
      type: "move",
      actorId: soldier,
      destination: hexCoord(1, 0),
    });
    expect(result).toMatchObject({ ok: false, violations: [{ code: "wrong-team" }] });
    expect(validateStandardAction(state, purple, {
      type: "move",
      actorId: soldier,
      destination: hexCoord(1, 0),
    })).toEqual(result.ok ? { ok: true } : {
      ok: false,
      code: result.code,
      violations: result.violations,
    });
    expect(state).toEqual(stateFixture());
  });

  it("collects money through the same move handler", () => {
    const money = entityId("money-1");
    const position = hexCoord(1, 0);
    const state = placeEntity(stateFixture(), {
      id: money,
      unitTypeId: unitTypeId("money"),
      position,
      statuses: [],
    });
    const result = applyStandardAction(state, orange, { type: "move", actorId: soldier, destination: position });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.entities[money]).toBeUndefined();
    expect(result.state.teams[orange]?.money).toBe(1000);
    expect(result.events).toEqual([expect.objectContaining({
      type: "unit-moved",
      consumedObjectTypeId: "money",
      moneyAward: 1000,
    })]);
  });

  it("applies deterministic projectile damage and records its ordered outcome", () => {
    const missile = entityId("missile-1");
    const enemy = entityId("enemy-1");
    const missilePosition = hexCoord(1, 0);
    const targetPosition = hexCoord(2, 0);
    let state = placeEntity(stateFixture(), {
      id: missile,
      unitTypeId: unitTypeId("missile"),
      position: missilePosition,
      statuses: [],
    });
    state = placeEntity(state, {
      id: enemy,
      unitTypeId: unitTypeId("soldier"),
      ownerTeamId: purple,
      position: targetPosition,
      health: { current: 100, maximum: 100 },
      actionBudget: { moved: false, acted: false },
      statuses: [],
    });
    expect(getLegalMoveOptions(state, orange, soldier)).toContainEqual({
      type: "move",
      actorId: soldier,
      destination: missilePosition,
      objectTarget: targetPosition,
    });
    const result = applyStandardAction(state, orange, {
      type: "move",
      actorId: soldier,
      destination: missilePosition,
      objectTarget: targetPosition,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.entities[enemy]?.health?.current).toBe(70);
    expect(result.events).toEqual([expect.objectContaining({
      type: "unit-moved",
      consumedObjectTypeId: "missile",
      objectPreventedByPriest: false,
      objectDamage: [{
        entityId: enemy,
        position: targetPosition,
        unitTypeId: "soldier",
        damage: 30,
        killed: false,
      }],
    })]);
  });

  it("runtime-validates command payloads", () => {
    expect(parseMoveAction({ type: "move", actorId: "soldier-1", destination: { q: 1, r: 0 } })).toEqual({
      type: "move",
      actorId: soldier,
      destination: { q: 1, r: 0 },
    });
    expect(() => parseMoveAction({ type: "move", actorId: "", destination: { q: 1.5, r: 0 } })).toThrow();
  });

  it("boosts and heals through focused capability handlers", () => {
    const targetId = entityId("target-1");
    const targetPosition = hexCoord(1, 0);
    const base = stateFixture();
    const actor = base.entities[soldier];
    if (!actor) throw new Error("missing test actor");
    let boostState = placeEntity({
      ...base,
      entities: { ...base.entities, [soldier]: { ...actor, unitTypeId: unitTypeId("bluesMusician") } },
    }, {
      id: targetId,
      unitTypeId: unitTypeId("soldier"),
      ownerTeamId: orange,
      position: targetPosition,
      health: { current: 80, maximum: 100 },
      actionBudget: { moved: false, acted: false },
      statuses: [],
    });
    const boosted = applyStandardAction(boostState, orange, {
      type: "boost",
      actorId: soldier,
      destination: hexCoord(0, 0),
      targetId,
    });
    expect(boosted.ok && boosted.state.entities[targetId]?.statuses).toContainEqual({ type: "boosted" });

    boostState = {
      ...boostState,
      entities: { ...boostState.entities, [soldier]: { ...actor, unitTypeId: unitTypeId("doctor") } },
    };
    const healed = applyStandardAction(boostState, orange, {
      type: "heal",
      actorId: soldier,
      destination: hexCoord(0, 0),
      targetId,
    });
    expect(healed.ok && healed.state.entities[targetId]?.health?.current).toBe(90);
    expect(healed.ok && healed.events).toEqual([expect.objectContaining({ type: "unit-healed", amount: 10 })]);
  });

  it("constructs and spawns with explicit stable IDs and configured costs", () => {
    const base = stateFixture();
    const actor = base.entities[soldier];
    if (!actor) throw new Error("missing test actor");
    const funded = {
      ...base,
      teams: { ...base.teams, [orange]: { id: orange, money: 1000 } },
    };
    const buildingId = entityId("building-1");
    const constructed = applyStandardAction({
      ...funded,
      entities: { ...funded.entities, [soldier]: { ...actor, unitTypeId: unitTypeId("constructionWorker") } },
    }, orange, {
      type: "construct",
      actorId: soldier,
      destination: hexCoord(0, 0),
      constructionPosition: hexCoord(1, 0),
      buildingEntityId: buildingId,
      buildingUnitTypeId: unitTypeId("house"),
    });
    expect(constructed.ok && constructed.state.entities[buildingId]).toMatchObject({
      id: buildingId,
      unitTypeId: "house",
      ownerTeamId: orange,
    });
    expect(constructed.ok && constructed.state.teams[orange]?.money).toBe(300);

    const spawnedId = entityId("spawned-1");
    const spawned = applyStandardAction({
      ...funded,
      entities: { ...funded.entities, [soldier]: { ...actor, unitTypeId: unitTypeId("capital") } },
    }, orange, {
      type: "spawn",
      actorId: soldier,
      destination: hexCoord(1, 0),
      spawnedEntityId: spawnedId,
      unitTypeId: unitTypeId("soldier"),
    });
    expect(spawned.ok && spawned.state.entities[spawnedId]).toMatchObject({ unitTypeId: "soldier", ownerTeamId: orange });
    expect(spawned.ok && spawned.state.teams[orange]?.money).toBe(800);
  });

  it("resolves strike and counterattack damage deterministically", () => {
    const defenderId = entityId("defender-1");
    const state = placeEntity(stateFixture(), {
      id: defenderId,
      unitTypeId: unitTypeId("soldier"),
      ownerTeamId: purple,
      position: hexCoord(1, 0),
      health: { current: 100, maximum: 100 },
      actionBudget: { moved: false, acted: false },
      statuses: [],
    });
    const result = applyStandardAction(state, orange, {
      type: "attack",
      actorId: soldier,
      destination: hexCoord(0, 0),
      defenderId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.entities[defenderId]?.health?.current).toBe(85);
    expect(result.state.entities[soldier]?.health?.current).toBe(90);
    expect(result.events).toEqual([expect.objectContaining({
      type: "unit-attacked",
      attackDamage: 15,
      counterattackDamage: 10,
      deaths: [],
    })]);
  });

  it("preserves a passenger's action budget when unloading", () => {
    const vehicleId = entityId("vehicle-1");
    const vehiclePosition = hexCoord(1, 0);
    const loaded = applyStandardAction(placeEntity(stateFixture(), {
      id: vehicleId,
      unitTypeId: unitTypeId("truck"),
      ownerTeamId: orange,
      position: vehiclePosition,
      health: { current: 100, maximum: 100 },
      actionBudget: { moved: false, acted: false },
      statuses: [],
    }), orange, {
      type: "load",
      actorId: soldier,
      destination: hexCoord(0, 0),
      vehicleId,
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.entities[soldier]?.position).toBeUndefined();
    expect(loaded.state.entities[soldier]?.actionBudget).toEqual({ moved: true, acted: true });
    expect(loaded.state.entities[vehicleId]?.cargo?.entityIds).toEqual([soldier]);
    expect(loaded.state.board.cells[hexKey(hexCoord(0, 0))]?.occupantEntityId).toBeUndefined();

    const unloadedSameTurn = applyStandardAction(loaded.state, orange, {
      type: "unload",
      actorId: vehicleId,
      destination: vehiclePosition,
      unloadPosition: hexCoord(2, 0),
    });
    expect(unloadedSameTurn.ok).toBe(true);
    if (!unloadedSameTurn.ok) return;
    expect(unloadedSameTurn.state.entities[soldier]?.position).toEqual({ q: 2, r: 0 });
    expect(unloadedSameTurn.state.entities[soldier]?.actionBudget).toEqual({ moved: true, acted: true });
    expect(unloadedSameTurn.state.entities[vehicleId]?.cargo?.entityIds).toEqual([]);
    expect(unloadedSameTurn.events).toEqual([expect.objectContaining({ type: "unit-unloaded", entityId: soldier })]);

    const purpleTurn = applyStandardAction(loaded.state, orange, { type: "end-turn" });
    expect(purpleTurn.ok).toBe(true);
    if (!purpleTurn.ok) return;
    const nextOrangeTurn = applyStandardAction(purpleTurn.state, purple, { type: "end-turn" });
    expect(nextOrangeTurn.ok).toBe(true);
    if (!nextOrangeTurn.ok) return;
    expect(nextOrangeTurn.state.entities[soldier]?.actionBudget).toEqual({ moved: false, acted: false });

    const unloadedLater = applyStandardAction(nextOrangeTurn.state, orange, {
      type: "unload",
      actorId: vehicleId,
      destination: vehiclePosition,
      unloadPosition: hexCoord(2, 0),
    });
    expect(unloadedLater.ok).toBe(true);
    if (!unloadedLater.ok) return;
    expect(unloadedLater.state.entities[soldier]?.position).toEqual({ q: 2, r: 0 });
    expect(unloadedLater.state.entities[soldier]?.actionBudget).toEqual({ moved: false, acted: false });
  });

  it("runs ordered turn-completion and income mechanics after the action", () => {
    const bankId = entityId("purple-bank");
    const state = placeEntity(stateFixture(), {
      id: bankId,
      unitTypeId: unitTypeId("bank"),
      ownerTeamId: purple,
      position: hexCoord(2, 0),
      health: { current: 100, maximum: 100 },
      actionBudget: { moved: true, acted: true },
      statuses: [],
    });
    const result = applyStandardAction(state, orange, { type: "end-turn" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.lifecycle).toEqual({ phase: "active", activeTeamId: purple });
    expect(result.state.turn.number).toBe(2);
    expect(result.state.teams[purple]?.money).toBe(1000);
    expect(result.state.entities[bankId]?.actionBudget).toEqual({ moved: false, acted: false });
    expect(result.events).toEqual([{
      type: "turn-ended",
      actorTeamId: orange,
      nextTeamId: purple,
      income: 1000,
      money: { orange: 0, purple: 1000 },
    }]);
  });

  it("emits game-over after the action and before any turn transition", () => {
    const base = stateFixture();
    const entities = Object.fromEntries(Object.entries(base.entities).filter(([id]) => id !== purpleGuard));
    const guardKey = hexKey(hexCoord(1, -1));
    const state: GameState = {
      ...base,
      entities,
      board: {
        cells: {
          ...base.board.cells,
          [guardKey]: { ...base.board.cells[guardKey], occupantEntityId: undefined },
        },
      },
      objectives: [
        { type: "elimination", teamId: orange },
        { type: "elimination", teamId: purple },
      ],
    };
    const result = applyStandardAction(state, orange, {
      type: "move",
      actorId: soldier,
      destination: hexCoord(1, 0),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.lifecycle).toEqual({ phase: "finished", winnerTeamId: orange });
    expect(result.events.map(({ type }) => type)).toEqual(["unit-moved", "game-over"]);
  });

  it("uses registered handler policies for read-only legality and availability selectors", () => {
    const state = stateFixture();
    expect(getLegalMovePositions(state, orange, soldier)).toEqual([
      hexCoord(1, 0),
      hexCoord(2, 0),
    ]);
    expect(getAttackTargetIds(state, orange, soldier, hexCoord(0, 0))).toEqual([purpleGuard]);
    expect(isSelectableEntity(state, orange, soldier)).toBe(true);
    expect(getActionableEntityIds(state, orange)).toContain(soldier);
    expect(getAvailableActionTypes(state, orange, soldier)).toEqual(["move", "attack"]);
    expect(Object.values(state.entities).map(({ id }) => hasAnyLegalAction(state, orange, id)))
      .toEqual(Object.values(state.entities).map(({ id }) =>
        getAvailableActionTypes(state, orange, id).length > 0));
    expect(getEntityCapabilities(state, soldier)).toContain("attack");
    expect(getLegalMovePositions(state, purple, soldier)).toEqual([]);

    const selectedAction = {
      type: "attack" as const,
      actorId: soldier,
      destination: hexCoord(0, 0),
      defenderId: purpleGuard,
    };
    expect(validateStandardAction(state, orange, selectedAction)).toEqual({ ok: true });
    expect(applyStandardAction(state, orange, selectedAction).ok).toBe(true);
  });

  it("derives production, income, and combat read models from authoritative rule content", () => {
    const base = stateFixture();
    const actor = base.entities[soldier];
    const defender = base.entities[purpleGuard];
    if (!actor || !defender) throw new Error("missing test combatants");
    expect(getEffectiveCombatStats(actor, defender, standardRuleServices)).toEqual({ attack: 30, defense: 15 });
    expect(calculateCombatDamage(actor, defender, standardRuleServices)).toBe(15);

    const bankId = entityId("bank-income");
    const withBank = placeEntity(base, {
      id: bankId,
      unitTypeId: unitTypeId("bank"),
      ownerTeamId: orange,
      position: hexCoord(2, 0),
      health: { current: 100, maximum: 100 },
      actionBudget: { moved: false, acted: false },
      statuses: [],
    });
    expect(getTeamIncome(withBank, orange)).toBe(1000);

    const capitalState: GameState = {
      ...base,
      teams: { ...base.teams, [orange]: { id: orange, money: 1000 } },
      entities: {
        ...base.entities,
        [soldier]: { ...actor, unitTypeId: unitTypeId("capital") },
      },
    };
    expect(getLegalProductionOptions(capitalState, orange, soldier, hexCoord(1, 0))
      .map(({ unitTypeId: id }) => id)).toEqual(["soldier", "leader", "constructionWorker"]);
  });
});
