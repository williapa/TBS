import { unitTypeId, type ActionHandler, type GameState, type RuleContext, type RuleViolation, type TeamId } from "@TBS/game-core";
import { z } from "zod";

import { areAdjacent, markEntityActed, planActorMovement } from "../mechanics/movement";
import { entityIdSchema, hexCoordSchema } from "./shared-schemas";
import type { HealAction, StandardEvent, StandardRuleServices } from "./types";

export const HEAL_AMOUNT = 10;

export const healActionSchema = z.object({
  type: z.literal("heal"),
  actorId: entityIdSchema,
  destination: hexCoordSchema,
  targetId: entityIdSchema,
}).strict();
export const parseHealAction = (value: unknown): HealAction => healActionSchema.parse(value);

const canHeal = (actorType: string, targetType: string, targetCategory: string, targetTags: readonly string[]) =>
  ((actorType === "ambulance" || actorType === "doctor") && targetCategory === "person") ||
  (actorType === "engineer" && targetCategory === "building") ||
  (actorType === "pilot" && targetTags.includes("flying")) ||
  (actorType === "worker" && ["ambulance", "bigTruck", "truck"].includes(targetType));

const movementFor = (
  context: RuleContext<GameState, TeamId, StandardRuleServices>,
  action: HealAction,
) => planActorMovement(context, action.actorId, action.destination, {
  allowSamePosition: true,
  collectibleObjectTypeIds: [unitTypeId("money")],
});

const validate = (
  context: RuleContext<GameState, TeamId, StandardRuleServices>,
  action: HealAction,
): readonly RuleViolation[] => {
  const movement = movementFor(context, action);
  if (!movement.ok) return [movement.violation];
  const actorDefinition = context.services.getUnit(movement.plan.actorBefore.unitTypeId);
  if (!actorDefinition?.capabilities.includes("heal")) return [{ code: "cannot-heal", message: "entity cannot heal" }];
  const target = movement.plan.state.entities[action.targetId];
  const targetDefinition = target ? context.services.getUnit(target.unitTypeId) : undefined;
  if (!target?.position || target.ownerTeamId !== context.actor || !targetDefinition || !target.health) {
    return [{ code: "invalid-heal-target", message: "heal target must be a damageable friendly board entity" }];
  }
  if (!areAdjacent(action.destination, target.position)) return [{ code: "heal-not-adjacent", message: "heal target must be adjacent" }];
  if (target.health.current >= target.health.maximum) return [{ code: "target-undamaged", message: "heal target must be damaged" }];
  if (!canHeal(movement.plan.actorBefore.unitTypeId, target.unitTypeId, targetDefinition.category, targetDefinition.tags)) {
    return [{ code: "invalid-heal-target", message: "actor cannot heal the selected target" }];
  }
  return [];
};

export const healActionHandler: ActionHandler<GameState, TeamId, HealAction, StandardEvent, StandardRuleServices> = {
  type: "heal",
  validate,
  apply: (context, action) => {
    const movement = movementFor(context, action);
    if (!movement.ok) throw new Error("validated heal movement became invalid");
    const target = movement.plan.state.entities[action.targetId];
    if (!target?.health) throw new Error("validated heal target is missing health");
    const amount = Math.min(HEAL_AMOUNT, target.health.maximum - target.health.current);
    let state = markEntityActed(movement.plan.state, action.actorId);
    state = {
      ...state,
      revision: state.revision + 1,
      entities: {
        ...state.entities,
        [target.id]: { ...target, health: { ...target.health, current: target.health.current + amount } },
      },
    };
    return {
      state,
      events: [{
        type: "unit-healed",
        actorTeamId: context.actor,
        actorId: action.actorId,
        targetId: action.targetId,
        start: movement.plan.start,
        end: movement.plan.end,
        amount,
        ...(movement.plan.consumedObject ? { consumedObjectTypeId: movement.plan.consumedObject.unitTypeId } : {}),
        ...(movement.plan.moneyAward ? { moneyAward: movement.plan.moneyAward } : {}),
      }],
    };
  },
};
