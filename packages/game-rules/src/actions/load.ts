import { hexKey, unitTypeId, type ActionHandler, type GameState, type RuleContext, type RuleViolation, type TeamId } from "@TBS/game-core";
import { z } from "zod";

import { areAdjacent, planActorMovement } from "../mechanics/movement";
import { entityIdSchema, hexCoordSchema } from "./shared-schemas";
import type { LoadAction, StandardEvent, StandardRuleServices } from "./types";

export const loadActionSchema = z.object({
  type: z.literal("load"),
  actorId: entityIdSchema,
  destination: hexCoordSchema,
  vehicleId: entityIdSchema,
}).strict();
export const parseLoadAction = (value: unknown): LoadAction => loadActionSchema.parse(value);

const movementFor = (context: RuleContext<GameState, TeamId, StandardRuleServices>, action: LoadAction) =>
  planActorMovement(context, action.actorId, action.destination, {
    allowSamePosition: true,
    collectibleObjectTypeIds: [unitTypeId("money")],
  });

export const loadActionHandler: ActionHandler<GameState, TeamId, LoadAction, StandardEvent, StandardRuleServices> = {
  type: "load",
  validate: (context, action): readonly RuleViolation[] => {
    const movement = movementFor(context, action);
    if (!movement.ok) return [movement.violation];
    if (context.services.getUnit(movement.plan.actorBefore.unitTypeId)?.category !== "person") {
      return [{ code: "cannot-load", message: "only people units can load into vehicles" }];
    }
    const vehicle = movement.plan.state.entities[action.vehicleId];
    if (!vehicle?.position || vehicle.ownerTeamId !== context.actor || context.services.getUnit(vehicle.unitTypeId)?.category !== "vehicle") {
      return [{ code: "invalid-vehicle", message: "load destination must be a friendly vehicle" }];
    }
    if (!areAdjacent(action.destination, vehicle.position)) return [{ code: "load-not-adjacent", message: "vehicle must be adjacent" }];
    if ((vehicle.cargo?.entityIds.length ?? 0) >= (vehicle.cargo?.capacity ?? 1)) {
      return [{ code: "vehicle-full", message: "vehicle is already carrying a unit" }];
    }
    return [];
  },
  apply: (context, action) => {
    const movement = movementFor(context, action);
    if (!movement.ok) throw new Error("validated load movement became invalid");
    const vehicle = movement.plan.state.entities[action.vehicleId];
    const loading = movement.plan.state.entities[action.actorId];
    const loadingCell = movement.plan.state.board.cells[hexKey(action.destination)];
    if (!vehicle || !loading || !loadingCell) throw new Error("validated load dependencies are missing");
    const loaded = { ...loading, position: undefined, actionBudget: { moved: true, acted: true } };
    const state: GameState = {
      ...movement.plan.state,
      revision: movement.plan.state.revision + 1,
      board: {
        cells: {
          ...movement.plan.state.board.cells,
          [hexKey(action.destination)]: { ...loadingCell, occupantEntityId: undefined },
        },
      },
      entities: {
        ...movement.plan.state.entities,
        [loaded.id]: loaded,
        [vehicle.id]: {
          ...vehicle,
          cargo: {
            capacity: vehicle.cargo?.capacity ?? 1,
            entityIds: [...(vehicle.cargo?.entityIds ?? []), loaded.id],
          },
        },
      },
    };
    return {
      state,
      events: [{
        type: "unit-loaded",
        actorTeamId: context.actor,
        entityId: loaded.id,
        vehicleId: vehicle.id,
        start: movement.plan.start,
        end: movement.plan.end,
        ...(movement.plan.consumedObject ? { consumedObjectTypeId: movement.plan.consumedObject.unitTypeId } : {}),
        ...(movement.plan.moneyAward ? { moneyAward: movement.plan.moneyAward } : {}),
      }],
    };
  },
};
