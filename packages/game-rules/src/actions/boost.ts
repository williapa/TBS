import { unitTypeId, type ActionHandler, type GameState, type RuleContext, type RuleViolation, type TeamId } from "@TBS/game-core";
import { z } from "zod";

import { areAdjacent, markEntityActed, planActorMovement } from "../mechanics/movement";
import { entityIdSchema, hexCoordSchema } from "./shared-schemas";
import type { BoostAction, StandardEvent, StandardRuleServices } from "./types";

export const boostActionSchema = z.object({
  type: z.literal("boost"),
  actorId: entityIdSchema,
  destination: hexCoordSchema,
  targetId: entityIdSchema,
}).strict();
export const parseBoostAction = (value: unknown): BoostAction => boostActionSchema.parse(value);

const canBoost = (actorType: string, targetCategory: string) =>
  (actorType === "bluesMusician" && targetCategory === "person") ||
  (actorType === "scientist" && targetCategory === "building") ||
  (actorType === "zookeeper" && targetCategory === "animal");

const validate = (
  context: RuleContext<GameState, TeamId, StandardRuleServices>,
  action: BoostAction,
): readonly RuleViolation[] => {
  const movement = planActorMovement(context, action.actorId, action.destination, {
    allowSamePosition: true,
    collectibleObjectTypeIds: [unitTypeId("money")],
  });
  if (!movement.ok) return [movement.violation];
  const actorDefinition = context.services.getUnit(movement.plan.actorBefore.unitTypeId);
  if (!actorDefinition?.capabilities.includes("boost")) return [{ code: "cannot-boost", message: "entity cannot boost" }];
  const target = movement.plan.state.entities[action.targetId];
  const targetDefinition = target ? context.services.getUnit(target.unitTypeId) : undefined;
  if (!target?.position || target.ownerTeamId !== context.actor || !targetDefinition) {
    return [{ code: "invalid-boost-target", message: "boost target must be a friendly board entity" }];
  }
  if (!areAdjacent(action.destination, target.position)) return [{ code: "boost-not-adjacent", message: "boost target must be adjacent" }];
  if (target.statuses.some(({ type }) => type === "boosted")) return [{ code: "already-boosted", message: "target is already boosted" }];
  if (!canBoost(movement.plan.actorBefore.unitTypeId, targetDefinition.category)) {
    return [{ code: "invalid-boost-target", message: "actor cannot boost the selected target" }];
  }
  return [];
};

const movementFor = (context: RuleContext<GameState, TeamId, StandardRuleServices>, action: BoostAction) => {
  const movement = planActorMovement(context, action.actorId, action.destination, {
    allowSamePosition: true,
    collectibleObjectTypeIds: [unitTypeId("money")],
  });
  if (!movement.ok) throw new Error("validated boost movement became invalid");
  return movement.plan;
};

export const boostActionHandler: ActionHandler<GameState, TeamId, BoostAction, StandardEvent, StandardRuleServices> = {
  type: "boost",
  validate,
  apply: (context, action) => {
    const movement = movementFor(context, action);
    const target = movement.state.entities[action.targetId];
    if (!target) throw new Error("validated boost target is missing");
    let state = markEntityActed(movement.state, action.actorId);
    state = {
      ...state,
      revision: state.revision + 1,
      entities: {
        ...state.entities,
        [target.id]: { ...target, statuses: [...target.statuses, { type: "boosted" }] },
      },
    };
    return {
      state,
      events: [{
        type: "unit-boosted",
        actorTeamId: context.actor,
        actorId: action.actorId,
        targetId: action.targetId,
        start: movement.start,
        end: movement.end,
        ...(movement.consumedObject ? { consumedObjectTypeId: movement.consumedObject.unitTypeId } : {}),
        ...(movement.moneyAward ? { moneyAward: movement.moneyAward } : {}),
      }],
    };
  },
};
