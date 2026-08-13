import {
  entityId,
  getHexNeighbors,
  hexCoord,
  hexKey,
  unitTypeId,
  type ActionHandler,
  type EntityId,
  type GameState,
  type HexCoord,
  type RuleContext,
  type RuleViolation,
  type TeamId,
} from "@TBS/game-core";
import { z } from "zod";

import {
  MISSILE_OBJECT_DAMAGE,
  NUKE_OBJECT_SPLASH_DAMAGE,
  NUKE_OBJECT_TARGET_DAMAGE,
} from "../content/objects";
import { getEntityAt, markEntityActed, planActorMovement } from "../mechanics/movement";
import type { MoveAction, ObjectDamage, StandardEvent, StandardRuleServices } from "./types";

const entityIdSchema = z.string().trim().min(1).transform(entityId);
const hexCoordSchema = z.object({ q: z.number().int(), r: z.number().int() }).strict()
  .transform(({ q, r }) => hexCoord(q, r));

export const moveActionSchema = z.object({
  type: z.literal("move"),
  actorId: entityIdSchema,
  destination: hexCoordSchema,
  objectTarget: hexCoordSchema.optional(),
}).strict();

export const parseMoveAction = (value: unknown): MoveAction => moveActionSchema.parse(value);

const violation = (code: string, message: string): RuleViolation => ({ code, message });

const projectileTargetViolations = (
  context: RuleContext<GameState, TeamId, StandardRuleServices>,
  objectType: string,
  action: MoveAction,
): readonly RuleViolation[] => {
  if (objectType !== "missile" && objectType !== "nuke") {
    return action.objectTarget
      ? [violation("unexpected-object-target", "objectTarget is only valid when collecting a projectile")]
      : [];
  }
  if (!action.objectTarget) return [violation("missing-object-target", "projectile object target is required")];
  const target = getEntityAt(context.state, action.objectTarget);
  const definition = target ? context.services.getUnit(target.unitTypeId) : undefined;
  if (!target || !target.ownerTeamId || target.ownerTeamId === context.actor || !target.health || definition?.category === "object") {
    return [violation("invalid-object-target", "projectile target must be a damageable enemy unit")];
  }
  return [];
};

const validateMove = (
  context: RuleContext<GameState, TeamId, StandardRuleServices>,
  action: MoveAction,
): readonly RuleViolation[] => {
  const movement = planActorMovement(context, action.actorId, action.destination, {
    allowSamePosition: false,
    collectibleObjectTypeIds: [unitTypeId("money"), unitTypeId("missile"), unitTypeId("nuke")],
  });
  if (!movement.ok) return [movement.violation];
  return projectileTargetViolations(
    { ...context, state: movement.plan.state },
    movement.plan.consumedObject?.unitTypeId ?? "",
    action,
  );
};

const withoutEntity = (entities: GameState["entities"], removedId: EntityId) =>
  Object.fromEntries(Object.entries(entities).filter(([id]) => id !== removedId));

const teamHasPriest = (
  context: RuleContext<GameState, TeamId, StandardRuleServices>,
  team: TeamId,
) => Object.values(context.state.entities).some(
  (entity) => entity.ownerTeamId === team && Boolean(entity.position) && entity.unitTypeId === "priest",
);

const applyProjectileDamage = (
  context: RuleContext<GameState, TeamId, StandardRuleServices>,
  state: GameState,
  objectType: string,
  targetPosition: HexCoord,
): Readonly<{ state: GameState; prevented: boolean; damage: readonly ObjectDamage[] }> => {
  const initialTarget = getEntityAt(state, targetPosition);
  if (!initialTarget?.ownerTeamId) return { state, prevented: false, damage: [] };
  if (teamHasPriest({ ...context, state }, initialTarget.ownerTeamId)) {
    return { state, prevented: true, damage: [] };
  }

  const targets = objectType === "missile"
    ? [{ position: targetPosition, damage: MISSILE_OBJECT_DAMAGE }]
    : [
        { position: targetPosition, damage: NUKE_OBJECT_TARGET_DAMAGE },
        ...getHexNeighbors(targetPosition).map((position) => ({ position, damage: NUKE_OBJECT_SPLASH_DAMAGE })),
      ];
  let entities = { ...state.entities };
  const cells = { ...state.board.cells };
  const damageEvents: ObjectDamage[] = [];

  for (const target of targets) {
    const cell = cells[hexKey(target.position)];
    const damaged = cell?.occupantEntityId ? entities[cell.occupantEntityId] : undefined;
    if (!damaged?.health || context.services.getUnit(damaged.unitTypeId)?.category === "object") continue;
    const appliedDamage = Math.min(target.damage, damaged.health.current);
    const killed = appliedDamage >= damaged.health.current;
    damageEvents.push({
      entityId: damaged.id,
      position: target.position,
      unitTypeId: damaged.unitTypeId,
      damage: appliedDamage,
      killed,
    });
    if (killed) {
      entities = withoutEntity(entities, damaged.id);
      cells[hexKey(target.position)] = { ...cell, occupantEntityId: undefined };
    } else {
      entities[damaged.id] = {
        ...damaged,
        health: { ...damaged.health, current: damaged.health.current - appliedDamage },
      };
    }
  }
  return { state: { ...state, entities, board: { cells } }, prevented: false, damage: damageEvents };
};

export const moveActionHandler: ActionHandler<GameState, TeamId, MoveAction, StandardEvent, StandardRuleServices> = {
  type: "move",
  validate: validateMove,
  apply: (context, action) => {
    const movement = planActorMovement(context, action.actorId, action.destination, {
      allowSamePosition: false,
      collectibleObjectTypeIds: [unitTypeId("money"), unitTypeId("missile"), unitTypeId("nuke")],
    });
    if (!movement.ok) throw new Error("validated move became invalid");
    const actor = movement.plan.actorBefore;
    const consumed = movement.plan.consumedObject;
    let state: GameState = markEntityActed(movement.plan.state, actor.id);
    state = { ...state, revision: state.revision + 1 };
    let prevented: boolean | undefined;
    let objectDamage: readonly ObjectDamage[] | undefined;
    if ((consumed?.unitTypeId === "missile" || consumed?.unitTypeId === "nuke") && action.objectTarget) {
      const result = applyProjectileDamage(context, state, consumed.unitTypeId, action.objectTarget);
      state = result.state;
      prevented = result.prevented;
      objectDamage = result.damage;
    }
    return {
      state,
      events: [{
        type: "unit-moved",
        actorTeamId: context.actor,
        entityId: actor.id,
        unitTypeId: actor.unitTypeId,
        start: movement.plan.start,
        end: action.destination,
        ...(consumed ? { consumedObjectTypeId: consumed.unitTypeId } : {}),
        ...(movement.plan.moneyAward ? { moneyAward: movement.plan.moneyAward } : {}),
        ...(action.objectTarget ? { objectTarget: action.objectTarget } : {}),
        ...(prevented !== undefined ? { objectPreventedByPriest: prevented } : {}),
        ...(objectDamage ? { objectDamage } : {}),
      }],
    };
  },
};
