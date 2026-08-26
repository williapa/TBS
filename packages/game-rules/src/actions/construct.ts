import { hexKey, unitTypeId, type ActionHandler, type EntityState, type GameState, type RuleContext, type RuleViolation, type TeamId } from "@TBS/game-core";
import { z } from "zod";

import { getConstructionOption } from "../content/production";
import { areAdjacent, markEntityActed, planActorMovement } from "../mechanics/movement";
import { entityIdSchema, hexCoordSchema, unitTypeIdSchema } from "./shared-schemas";
import type { ConstructAction, StandardEvent, StandardRuleServices } from "./types";

export const constructActionSchema = z.object({
  type: z.literal("construct"),
  actorId: entityIdSchema,
  destination: hexCoordSchema,
  constructionPosition: hexCoordSchema,
  buildingEntityId: entityIdSchema,
  buildingUnitTypeId: unitTypeIdSchema,
}).strict();
export const parseConstructAction = (value: unknown): ConstructAction => constructActionSchema.parse(value);

const movementFor = (
  context: RuleContext<GameState, TeamId, StandardRuleServices>,
  action: ConstructAction,
) => planActorMovement(context, action.actorId, action.destination, {
  allowSamePosition: true,
  collectibleObjectTypeIds: [unitTypeId("money")],
});

const validate = (
  context: RuleContext<GameState, TeamId, StandardRuleServices>,
  action: ConstructAction,
): readonly RuleViolation[] => {
  const movement = movementFor(context, action);
  if (!movement.ok) return [movement.violation];
  if (movement.plan.actorBefore.unitTypeId !== "constructionWorker") {
    return [{ code: "cannot-construct", message: "only construction workers can construct" }];
  }
  if (context.state.entities[action.buildingEntityId]) return [{ code: "duplicate-entity-id", message: "building entity ID already exists" }];
  const option = getConstructionOption(action.buildingUnitTypeId);
  const team = movement.plan.state.teams[context.actor];
  if (!option || !team || team.money < option.cost) return [{ code: "unaffordable-construction", message: "building cannot be constructed with current funds" }];
  const cell = movement.plan.state.board.cells[hexKey(action.constructionPosition)];
  if (!cell || cell.occupantEntityId || option.invalidTerrainTypeIds.includes(cell.terrainTypeId)) {
    return [{ code: "invalid-construction-position", message: "construction position must be empty and valid terrain" }];
  }
  if (!areAdjacent(action.destination, action.constructionPosition)) {
    return [{ code: "construction-not-adjacent", message: "construction position must be adjacent" }];
  }
  return [];
};

export const constructActionHandler: ActionHandler<GameState, TeamId, ConstructAction, StandardEvent, StandardRuleServices> = {
  type: "construct",
  validate,
  apply: (context, action) => {
    const movement = movementFor(context, action);
    if (!movement.ok) throw new Error("validated construction movement became invalid");
    const option = getConstructionOption(action.buildingUnitTypeId);
    const definition = context.services.getUnit(action.buildingUnitTypeId);
    const team = movement.plan.state.teams[context.actor];
    const cellKey = hexKey(action.constructionPosition);
    const cell = movement.plan.state.board.cells[cellKey];
    if (!option || !definition || !team || !cell) throw new Error("validated construction dependencies are missing");
    const building: EntityState = {
      id: action.buildingEntityId,
      unitTypeId: action.buildingUnitTypeId,
      ownerTeamId: context.actor,
      position: action.constructionPosition,
      ...(definition.base.maximumHealth ? { health: { current: definition.base.maximumHealth, maximum: definition.base.maximumHealth } } : {}),
      actionBudget: { moved: true, acted: true },
      statuses: [],
    };
    let state = markEntityActed(movement.plan.state, action.actorId);
    state = {
      ...state,
      revision: state.revision + 1,
      board: { cells: { ...state.board.cells, [cellKey]: { ...cell, occupantEntityId: building.id } } },
      entities: { ...state.entities, [building.id]: building },
      teams: { ...state.teams, [context.actor]: { ...team, money: team.money - option.cost } },
    };
    return {
      state,
      events: [{
        type: "unit-constructed",
        actorTeamId: context.actor,
        actorId: action.actorId,
        entityId: building.id,
        unitTypeId: building.unitTypeId,
        position: action.constructionPosition,
        start: movement.plan.start,
        end: movement.plan.end,
        cost: option.cost,
        ...(movement.plan.consumedObject ? { consumedObjectTypeId: movement.plan.consumedObject.unitTypeId } : {}),
        ...(movement.plan.moneyAward ? { moneyAward: movement.plan.moneyAward } : {}),
      }],
    };
  },
};
