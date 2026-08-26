import { hexKey, type ActionHandler, type EntityState, type GameState, type RuleViolation, type TeamId } from "@TBS/game-core";
import { z } from "zod";

import { getProductionOption } from "../content/production";
import { areAdjacent, markEntityActed } from "../mechanics/movement";
import { entityIdSchema, hexCoordSchema, unitTypeIdSchema } from "./shared-schemas";
import type { SpawnAction, StandardEvent, StandardRuleServices } from "./types";

export const spawnActionSchema = z.object({
  type: z.literal("spawn"),
  actorId: entityIdSchema,
  destination: hexCoordSchema,
  spawnedEntityId: entityIdSchema,
  unitTypeId: unitTypeIdSchema,
}).strict();
export const parseSpawnAction = (value: unknown): SpawnAction => spawnActionSchema.parse(value);

export const spawnActionHandler: ActionHandler<GameState, TeamId, SpawnAction, StandardEvent, StandardRuleServices> = {
  type: "spawn",
  validate: (context, action): readonly RuleViolation[] => {
    const building = context.state.entities[action.actorId];
    if (!building) return [{ code: "missing-actor", message: "spawning building does not exist" }];
    if (building.ownerTeamId !== context.actor) return [{ code: "wrong-owner", message: "building is not owned by the acting team" }];
    if (!building.position) return [{ code: "actor-not-on-board", message: "building is not on the board" }];
    if (building.actionBudget?.moved || building.actionBudget?.acted) return [{ code: "action-budget-spent", message: "building has already acted" }];
    if (!context.services.getUnit(building.unitTypeId)?.capabilities.includes("spawn")) return [{ code: "cannot-spawn", message: "entity cannot spawn units" }];
    if (context.state.entities[action.spawnedEntityId]) return [{ code: "duplicate-entity-id", message: "spawned entity ID already exists" }];
    const option = getProductionOption(building.unitTypeId, action.unitTypeId);
    const team = context.state.teams[context.actor];
    if (!option || !team || team.money < option.cost) return [{ code: "unaffordable-spawn", message: "unit cannot be spawned with current funds" }];
    const cell = context.state.board.cells[hexKey(action.destination)];
    if (!cell || cell.occupantEntityId || option.invalidTerrainTypeIds.includes(cell.terrainTypeId)) {
      return [{ code: "invalid-spawn-position", message: "spawn position must be empty and valid terrain" }];
    }
    if (!areAdjacent(building.position, action.destination)) return [{ code: "spawn-not-adjacent", message: "spawn position must be adjacent" }];
    return [];
  },
  apply: (context, action) => {
    const building = context.state.entities[action.actorId];
    const definition = context.services.getUnit(action.unitTypeId);
    const option = building ? getProductionOption(building.unitTypeId, action.unitTypeId) : undefined;
    const team = context.state.teams[context.actor];
    const cellKey = hexKey(action.destination);
    const cell = context.state.board.cells[cellKey];
    if (!building || !definition || !option || !team || !cell) throw new Error("validated spawn dependencies are missing");
    const spawned: EntityState = {
      id: action.spawnedEntityId,
      unitTypeId: action.unitTypeId,
      ownerTeamId: context.actor,
      position: action.destination,
      ...(definition.base.maximumHealth ? { health: { current: definition.base.maximumHealth, maximum: definition.base.maximumHealth } } : {}),
      actionBudget: { moved: true, acted: true },
      statuses: [],
    };
    let state = markEntityActed(context.state, building.id);
    state = {
      ...state,
      revision: state.revision + 1,
      board: { cells: { ...state.board.cells, [cellKey]: { ...cell, occupantEntityId: spawned.id } } },
      entities: { ...state.entities, [spawned.id]: spawned },
      teams: { ...state.teams, [context.actor]: { ...team, money: team.money - option.cost } },
    };
    return {
      state,
      events: [{
        type: "unit-spawned",
        actorTeamId: context.actor,
        buildingId: building.id,
        entityId: spawned.id,
        unitTypeId: spawned.unitTypeId,
        position: action.destination,
        cost: option.cost,
      }],
    };
  },
};
