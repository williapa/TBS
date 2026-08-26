import { hexKey, unitTypeId, type ActionHandler, type GameState, type RuleContext, type RuleViolation, type TeamId } from "@TBS/game-core";
import { z } from "zod";

import { areAdjacent, markEntityActed, planActorMovement } from "../mechanics/movement";
import { entityIdSchema, hexCoordSchema } from "./shared-schemas";
import type { StandardEvent, StandardRuleServices, UnloadAction } from "./types";

export const unloadActionSchema = z.object({
  type: z.literal("unload"),
  actorId: entityIdSchema,
  destination: hexCoordSchema,
  unloadPosition: hexCoordSchema,
}).strict();
export const parseUnloadAction = (value: unknown): UnloadAction => unloadActionSchema.parse(value);

const movementFor = (context: RuleContext<GameState, TeamId, StandardRuleServices>, action: UnloadAction) =>
  planActorMovement(context, action.actorId, action.destination, {
    allowSamePosition: true,
    collectibleObjectTypeIds: [unitTypeId("money")],
  });

export const unloadActionHandler: ActionHandler<GameState, TeamId, UnloadAction, StandardEvent, StandardRuleServices> = {
  type: "unload",
  validate: (context, action): readonly RuleViolation[] => {
    const movement = movementFor(context, action);
    if (!movement.ok) return [movement.violation];
    if (context.services.getUnit(movement.plan.actorBefore.unitTypeId)?.category !== "vehicle") {
      return [{ code: "cannot-unload", message: "only vehicles can unload units" }];
    }
    const cargoId = movement.plan.actorAfter.cargo?.entityIds[0];
    if (!cargoId || !movement.plan.state.entities[cargoId]) return [{ code: "missing-cargo", message: "vehicle is not carrying a unit" }];
    const cell = movement.plan.state.board.cells[hexKey(action.unloadPosition)];
    if (!cell || cell.occupantEntityId || cell.terrainTypeId === "water") {
      return [{ code: "invalid-unload-position", message: "unload position must be empty non-water terrain" }];
    }
    if (!areAdjacent(action.destination, action.unloadPosition)) return [{ code: "unload-not-adjacent", message: "unload position must be adjacent" }];
    return [];
  },
  apply: (context, action) => {
    const movement = movementFor(context, action);
    if (!movement.ok) throw new Error("validated unload movement became invalid");
    const vehicle = movement.plan.state.entities[action.actorId];
    const cargoId = vehicle?.cargo?.entityIds[0];
    const cargo = cargoId ? movement.plan.state.entities[cargoId] : undefined;
    const cellKey = hexKey(action.unloadPosition);
    const cell = movement.plan.state.board.cells[cellKey];
    if (!vehicle || !cargo || !cell) throw new Error("validated unload dependencies are missing");
    const unloaded = { ...cargo, position: action.unloadPosition };
    let state = markEntityActed(movement.plan.state, vehicle.id);
    state = {
      ...state,
      revision: state.revision + 1,
      board: { cells: { ...state.board.cells, [cellKey]: { ...cell, occupantEntityId: unloaded.id } } },
      entities: {
        ...state.entities,
        [unloaded.id]: unloaded,
        [vehicle.id]: {
          ...state.entities[vehicle.id],
          cargo: { capacity: vehicle.cargo?.capacity ?? 1, entityIds: vehicle.cargo?.entityIds.slice(1) ?? [] },
        },
      },
    };
    return {
      state,
      events: [{
        type: "unit-unloaded",
        actorTeamId: context.actor,
        entityId: unloaded.id,
        vehicleId: vehicle.id,
        start: movement.plan.start,
        end: movement.plan.end,
        unloadPosition: action.unloadPosition,
        ...(movement.plan.consumedObject ? { consumedObjectTypeId: movement.plan.consumedObject.unitTypeId } : {}),
        ...(movement.plan.moneyAward ? { moneyAward: movement.plan.moneyAward } : {}),
      }],
    };
  },
};
