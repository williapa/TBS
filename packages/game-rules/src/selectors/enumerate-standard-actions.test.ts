import {
  NORMALIZED_GAME_SCHEMA_VERSION,
  contentVersion,
  entityId,
  hexCoord,
  hexKey,
  rulesetVersion,
  teamId,
  terrainTypeId,
  type BoardCellState,
  type EntityId,
  type EntityState,
  type GameState,
  type TeamId,
  type UnitTypeId,
} from "@TBS/game-core";
import { describe, expect, it } from "vitest";

import type { StandardAction } from "../actions/types";
import { standardUnits } from "../content/units";
import { applyStandardAction, validateStandardAction } from "../rulesets/standard";
import { enumerateStandardActions } from "./enumerate-standard-actions";

const orange = teamId("orange");
const purple = teamId("purple");

type Placement = Readonly<{
  index: number;
  unit: UnitTypeId;
  team: TeamId | "gray";
  loadedUnit?: Readonly<{ unit: UnitTypeId; team: TeamId | "gray" }>;
}>;

const positions = [
  hexCoord(0, -1),
  hexCoord(1, -1),
  hexCoord(-1, 0),
  hexCoord(0, 0),
  hexCoord(1, 0),
  hexCoord(-1, 1),
  hexCoord(0, 1),
] as const;

const activeState = (placements: readonly Placement[], money = 0): GameState => {
  const cells: Record<string, BoardCellState> = Object.fromEntries(positions.map((position) => [
    hexKey(position),
    { position, terrainTypeId: terrainTypeId("plains") },
  ]));
  const entities: Record<string, EntityState> = {};
  for (const placement of placements) {
    const position = positions[placement.index];
    const definition = standardUnits.get(placement.unit);
    if (!position || !definition) throw new Error(`invalid test placement ${placement.index}`);
    const id = entityId(`entity-${placement.index}`);
    const ownerTeamId = placement.team === "gray" ? undefined : placement.team;
    const cargoId = placement.loadedUnit ? entityId(`cargo-${placement.index}`) : undefined;
    cells[hexKey(position)] = { ...cells[hexKey(position)], occupantEntityId: id };
    entities[id] = {
      id,
      unitTypeId: placement.unit,
      ...(ownerTeamId ? { ownerTeamId } : {}),
      position,
      ...(definition.base.maximumHealth
        ? { health: { current: definition.base.maximumHealth, maximum: definition.base.maximumHealth } }
        : {}),
      ...(ownerTeamId ? { actionBudget: { moved: false, acted: false } } : {}),
      ...(cargoId ? { cargo: { capacity: 1, entityIds: [cargoId] } } : {}),
      statuses: [],
    };
    if (placement.loadedUnit && cargoId) {
      const cargoDefinition = standardUnits.get(placement.loadedUnit.unit);
      if (!cargoDefinition) throw new Error("invalid test cargo");
      const cargoOwner = placement.loadedUnit.team === "gray" ? undefined : placement.loadedUnit.team;
      entities[cargoId] = {
        id: cargoId,
        unitTypeId: placement.loadedUnit.unit,
        ...(cargoOwner ? { ownerTeamId: cargoOwner } : {}),
        ...(cargoDefinition.base.maximumHealth
          ? { health: { current: cargoDefinition.base.maximumHealth, maximum: cargoDefinition.base.maximumHealth } }
          : {}),
        ...(cargoOwner ? { actionBudget: { moved: false, acted: false } } : {}),
        statuses: [],
      };
    }
  }
  return {
    schemaVersion: NORMALIZED_GAME_SCHEMA_VERSION,
    rulesetVersion: rulesetVersion("standard@2"),
    contentVersion: contentVersion("standard@1"),
    revision: 0,
    lifecycle: { phase: "active", activeTeamId: orange },
    board: { cells },
    entities,
    teams: {
      [orange]: { id: orange, money },
      [purple]: { id: purple, money: 0 },
    },
    objectives: [],
    turn: { number: 1 },
  };
};

const findEntity = (state: GameState, unitTypeId: UnitTypeId, ownerTeamId: TeamId): EntityId => {
  const entity = Object.values(state.entities).find((candidate) =>
    candidate.unitTypeId === unitTypeId && candidate.ownerTeamId === ownerTeamId);
  if (!entity) throw new Error(`missing ${ownerTeamId} ${unitTypeId}`);
  return entity.id;
};

const semanticAction = (action: StandardAction): string => {
  if (action.type === "construct") {
    const { buildingEntityId: ignored, ...semantic } = action;
    void ignored;
    return JSON.stringify(semantic);
  }
  if (action.type === "spawn") {
    const { spawnedEntityId: ignored, ...semantic } = action;
    void ignored;
    return JSON.stringify(semantic);
  }
  return JSON.stringify(action);
};

const exhaustiveLegalActions = (
  state: GameState,
  actorTeamId: TeamId,
  families: readonly StandardAction["type"][],
): readonly StandardAction[] => {
  const actions: StandardAction[] = [];
  const actorIds = Object.keys(state.entities).map(entityId);
  const targetIds = actorIds;
  const positions = Object.values(state.board.cells).map(({ position }) => position);
  const unitTypeIds = [...standardUnits.keys()];
  const freshId = entityId("exhaustive-fresh-entity");
  const includes = (type: StandardAction["type"]) => families.includes(type);

  if (includes("end-turn")) actions.push({ type: "end-turn" });
  for (const actorId of actorIds) {
    for (const destination of positions) {
      if (includes("move")) {
        actions.push({ type: "move", actorId, destination });
        for (const objectTarget of positions) actions.push({ type: "move", actorId, destination, objectTarget });
      }
      for (const targetId of targetIds) {
        if (includes("attack")) actions.push({ type: "attack", actorId, destination, defenderId: targetId });
        if (includes("boost")) actions.push({ type: "boost", actorId, destination, targetId });
        if (includes("heal")) actions.push({ type: "heal", actorId, destination, targetId });
        if (includes("load")) actions.push({ type: "load", actorId, destination, vehicleId: targetId });
      }
      for (const secondPosition of positions) {
        if (includes("unload")) actions.push({
          type: "unload",
          actorId,
          destination,
          unloadPosition: secondPosition,
        });
        if (includes("construct")) {
          for (const buildingUnitTypeId of unitTypeIds) actions.push({
            type: "construct",
            actorId,
            destination,
            constructionPosition: secondPosition,
            buildingEntityId: freshId,
            buildingUnitTypeId,
          });
        }
      }
      if (includes("spawn")) {
        for (const unitTypeId of unitTypeIds) actions.push({
          type: "spawn",
          actorId,
          destination,
          spawnedEntityId: freshId,
          unitTypeId,
        });
      }
    }
  }
  return actions.filter((action) => validateStandardAction(state, actorTeamId, action).ok);
};

const expectComplete = (
  state: GameState,
  families: readonly StandardAction["type"][],
): void => {
  const enumerated = enumerateStandardActions(state, orange).candidates
    .map(({ action }) => action)
    .filter(({ type }) => families.includes(type))
    .map(semanticAction)
    .sort();
  const exhaustive = exhaustiveLegalActions(state, orange, families).map(semanticAction).sort();
  expect(enumerated).toEqual(exhaustive);
};

describe("enumerateStandardActions", () => {
  it("matches separately assembled exhaustive legal domains on tiny fixtures", () => {
    const moveAndAttack = activeState([
      { index: 0, unit: "soldier" as UnitTypeId, team: orange },
      { index: 1, unit: "missile" as UnitTypeId, team: "gray" },
      { index: 3, unit: "soldier" as UnitTypeId, team: purple },
      { index: 6, unit: "soldier" as UnitTypeId, team: orange },
    ]);
    expectComplete(moveAndAttack, ["move", "attack", "end-turn"]);

    const supportAndLoad = activeState([
      { index: 0, unit: "bluesMusician" as UnitTypeId, team: orange },
      { index: 1, unit: "soldier" as UnitTypeId, team: orange },
      { index: 2, unit: "truck" as UnitTypeId, team: orange },
      { index: 6, unit: "soldier" as UnitTypeId, team: purple },
    ]);
    expectComplete(supportAndLoad, ["boost", "load"]);

    const healing = activeState([
      { index: 0, unit: "doctor" as UnitTypeId, team: orange },
      { index: 1, unit: "soldier" as UnitTypeId, team: orange },
      { index: 6, unit: "soldier" as UnitTypeId, team: purple },
    ]);
    const patientId = findEntity(healing, "soldier" as UnitTypeId, orange);
    const damaged: GameState = {
      ...healing,
      entities: {
        ...healing.entities,
        [patientId]: { ...healing.entities[patientId], health: { current: 50, maximum: 100 } },
      },
    };
    expectComplete(damaged, ["heal"]);

    const construction = activeState([
      { index: 0, unit: "constructionWorker" as UnitTypeId, team: orange },
      { index: 1, unit: "money" as UnitTypeId, team: "gray" },
      { index: 5, unit: "soldier" as UnitTypeId, team: orange },
      { index: 6, unit: "soldier" as UnitTypeId, team: purple },
    ]);
    expectComplete(construction, ["construct"]);
    expect(enumerateStandardActions(construction, orange).candidates).toContainEqual(expect.objectContaining({
      action: expect.objectContaining({ type: "construct", destination: positions[1] }),
    }));

    const spawning = activeState([
      { index: 0, unit: "capital" as UnitTypeId, team: orange },
      { index: 5, unit: "soldier" as UnitTypeId, team: orange },
      { index: 6, unit: "soldier" as UnitTypeId, team: purple },
    ], 1_000);
    expectComplete(spawning, ["spawn"]);

    const unloading = activeState([
      {
        index: 0,
        unit: "truck" as UnitTypeId,
        team: orange,
        loadedUnit: { unit: "soldier" as UnitTypeId, team: orange },
      },
      { index: 5, unit: "soldier" as UnitTypeId, team: orange },
      { index: 6, unit: "soldier" as UnitTypeId, team: purple },
    ]);
    expectComplete(unloading, ["unload"]);
  });

  it("covers all action families with stable keys and no choices outside the active team", () => {
    const healing = activeState([
      { index: 0, unit: "doctor" as UnitTypeId, team: orange },
      { index: 1, unit: "soldier" as UnitTypeId, team: orange },
      { index: 6, unit: "soldier" as UnitTypeId, team: purple },
    ]);
    const patientId = findEntity(healing, "soldier" as UnitTypeId, orange);
    const damagedHealing: GameState = {
      ...healing,
      entities: {
        ...healing.entities,
        [patientId]: { ...healing.entities[patientId], health: { current: 50, maximum: 100 } },
      },
    };
    const states = [
      activeState([
        { index: 0, unit: "soldier" as UnitTypeId, team: orange },
        { index: 1, unit: "soldier" as UnitTypeId, team: purple },
        { index: 6, unit: "soldier" as UnitTypeId, team: orange },
      ]),
      activeState([
        { index: 0, unit: "bluesMusician" as UnitTypeId, team: orange },
        { index: 1, unit: "soldier" as UnitTypeId, team: orange },
        { index: 2, unit: "truck" as UnitTypeId, team: orange },
        { index: 6, unit: "soldier" as UnitTypeId, team: purple },
      ]),
      damagedHealing,
      activeState([
        { index: 0, unit: "constructionWorker" as UnitTypeId, team: orange },
        { index: 5, unit: "soldier" as UnitTypeId, team: orange },
        { index: 6, unit: "soldier" as UnitTypeId, team: purple },
      ], 1_000),
      activeState([
        { index: 0, unit: "capital" as UnitTypeId, team: orange },
        { index: 5, unit: "soldier" as UnitTypeId, team: orange },
        { index: 6, unit: "soldier" as UnitTypeId, team: purple },
      ], 1_000),
      activeState([
        {
          index: 0,
          unit: "truck" as UnitTypeId,
          team: orange,
          loadedUnit: { unit: "soldier" as UnitTypeId, team: orange },
        },
        { index: 5, unit: "soldier" as UnitTypeId, team: orange },
        { index: 6, unit: "soldier" as UnitTypeId, team: purple },
      ]),
    ];
    const types = new Set(states.flatMap((state) =>
      enumerateStandardActions(state, orange).candidates.map(({ action }) => action.type)));
    expect([...types].sort()).toEqual([
      "attack", "boost", "construct", "end-turn", "heal", "load", "move", "spawn", "unload",
    ]);

    const state = states[0];
    const first = enumerateStandardActions(state, orange);
    const second = enumerateStandardActions({
      ...state,
      entities: Object.fromEntries(Object.entries(state.entities).reverse()),
      board: { cells: Object.fromEntries(Object.entries(state.board.cells).reverse()) },
    }, orange);
    expect(second.candidates.map(({ key }) => key)).toEqual(first.candidates.map(({ key }) => key));
    expect(first.candidates.map(({ key }) => key)).toEqual([...first.candidates.map(({ key }) => key)].sort());
    expect(enumerateStandardActions(state, purple).candidates).toEqual([]);
    expect(enumerateStandardActions({ ...state, lifecycle: { phase: "waiting" } }, orange).candidates).toEqual([]);
    expect(enumerateStandardActions({ ...state, lifecycle: { phase: "finished", result: "draw" } }, orange).candidates).toEqual([]);

    for (const candidateState of states) {
      for (const { action } of enumerateStandardActions(candidateState, orange).candidates) {
        expect(validateStandardAction(candidateState, orange, action).ok).toBe(true);
        expect(applyStandardAction(candidateState, orange, action).ok).toBe(true);
      }
    }
  });
});
