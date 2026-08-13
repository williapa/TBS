import { hexKey, unitTypeId, type ActionHandler, type EntityId, type EntityState, type GameState, type RuleContext, type RuleViolation, type TeamId } from "@TBS/game-core";
import { z } from "zod";

import { areAdjacent, markEntityActed, planActorMovement } from "../mechanics/movement";
import type { UnitDefinition } from "../content/units";
import { entityIdSchema, hexCoordSchema } from "./shared-schemas";
import type { AttackAction, StandardEvent, StandardRuleServices } from "./types";

export const attackActionSchema = z.object({
  type: z.literal("attack"),
  actorId: entityIdSchema,
  destination: hexCoordSchema,
  defenderId: entityIdSchema,
}).strict();
export const parseAttackAction = (value: unknown): AttackAction => attackActionSchema.parse(value);

const movementFor = (context: RuleContext<GameState, TeamId, StandardRuleServices>, action: AttackAction) =>
  planActorMovement(context, action.actorId, action.destination, {
    allowSamePosition: true,
    collectibleObjectTypeIds: [unitTypeId("money")],
  });

const effectiveStats = (
  entity: EntityState,
  definition: UnitDefinition,
  opponent: EntityState,
  opponentDefinition: UnitDefinition,
): readonly [attack: number, defense: number] => {
  if (entity.unitTypeId === "studentAthlete" && opponent.unitTypeId === "michaelJackson") return [100, 100];
  if (entity.unitTypeId === "studentAthlete" && opponentDefinition.category === "vehicle") return [10, 0];
  if (entity.unitTypeId === "zuckerbird" && opponent.unitTypeId === "capital") return [160, 8];
  if (entity.unitTypeId === "zuckerbird" && opponent.unitTypeId === "dragon") return [8, 100];
  const boost = entity.statuses.some(({ type }) => type === "boosted") ? 10 : 0;
  return [definition.base.attack + boost, definition.base.defense + boost];
};

const damage = (
  attacker: EntityState,
  attackerDefinition: UnitDefinition,
  defender: EntityState,
  defenderDefinition: UnitDefinition,
): number => {
  if (!attacker.health || !defender.health) return 0;
  const attackerStats = effectiveStats(attacker, attackerDefinition, defender, defenderDefinition);
  const defenderStats = effectiveStats(defender, defenderDefinition, attacker, attackerDefinition);
  const attackDamage = Math.floor(attackerStats[0] * (attacker.health.current / attacker.health.maximum));
  const defenseDamage = Math.ceil(defenderStats[1] * (defender.health.current / defender.health.maximum));
  return Math.max(0, attackDamage - defenseDamage);
};

const removeKilled = (state: GameState, killed: EntityState): GameState => {
  if (!killed.position) return state;
  const entities = Object.fromEntries(Object.entries(state.entities).filter(([id]) => id !== killed.id));
  const key = hexKey(killed.position);
  const cell = state.board.cells[key];
  return {
    ...state,
    entities,
    board: { cells: { ...state.board.cells, [key]: { ...cell, occupantEntityId: undefined } } },
  };
};

const strike = (
  state: GameState,
  attackerId: EntityId,
  defenderId: EntityId,
  services: StandardRuleServices,
): Readonly<{ state: GameState; damage: number; killed: boolean }> => {
  const attacker = state.entities[attackerId];
  const defender = state.entities[defenderId];
  const attackerDefinition = attacker ? services.getUnit(attacker.unitTypeId) : undefined;
  const defenderDefinition = defender ? services.getUnit(defender.unitTypeId) : undefined;
  if (!attacker || !defender || !attackerDefinition || !defenderDefinition || !defender.health) {
    throw new Error("validated combat dependencies are missing");
  }
  const applied = Math.min(damage(attacker, attackerDefinition, defender, defenderDefinition), defender.health.current);
  if (applied >= defender.health.current) return { state: removeKilled(state, defender), damage: applied, killed: true };
  return {
    state: {
      ...state,
      entities: {
        ...state.entities,
        [defender.id]: { ...defender, health: { ...defender.health, current: defender.health.current - applied } },
      },
    },
    damage: applied,
    killed: false,
  };
};

export const attackActionHandler: ActionHandler<GameState, TeamId, AttackAction, StandardEvent, StandardRuleServices> = {
  type: "attack",
  validate: (context, action): readonly RuleViolation[] => {
    const movement = movementFor(context, action);
    if (!movement.ok) return [movement.violation];
    if (!context.services.getUnit(movement.plan.actorBefore.unitTypeId)?.capabilities.includes("attack")) {
      return [{ code: "cannot-attack", message: "entity cannot attack" }];
    }
    const defender = movement.plan.state.entities[action.defenderId];
    const defenderDefinition = defender ? context.services.getUnit(defender.unitTypeId) : undefined;
    if (!defender?.position || !defender.ownerTeamId || defender.ownerTeamId === context.actor || !defender.health || defenderDefinition?.category === "object") {
      return [{ code: "invalid-defender", message: "defender must be a damageable enemy board entity" }];
    }
    if (!areAdjacent(action.destination, defender.position)) return [{ code: "defender-out-of-range", message: "defender must be adjacent" }];
    return [];
  },
  apply: (context, action) => {
    const movement = movementFor(context, action);
    if (!movement.ok) throw new Error("validated attack movement became invalid");
    const defender = movement.plan.state.entities[action.defenderId];
    if (!defender?.position) throw new Error("validated defender is missing");
    const defenderPosition = defender.position;
    let state = markEntityActed(movement.plan.state, action.actorId);
    const first = strike(state, action.actorId, action.defenderId, context.services);
    state = first.state;
    let counterattackDamage = 0;
    let attackerKilled = false;
    if (!first.killed) {
      const counter = strike(state, action.defenderId, action.actorId, context.services);
      state = counter.state;
      counterattackDamage = counter.damage;
      attackerKilled = counter.killed;
    }
    state = { ...state, revision: state.revision + 1 };
    const deaths: EntityId[] = [];
    if (attackerKilled) deaths.push(action.actorId);
    if (first.killed) deaths.push(action.defenderId);
    return {
      state,
      events: [{
        type: "unit-attacked",
        actorTeamId: context.actor,
        attackerId: action.actorId,
        defenderId: action.defenderId,
        attackerUnitTypeId: movement.plan.actorBefore.unitTypeId,
        defenderUnitTypeId: defender.unitTypeId,
        start: movement.plan.start,
        end: movement.plan.end,
        defenderPosition,
        attackDamage: first.damage,
        counterattackDamage,
        deaths,
        ...(movement.plan.consumedObject ? { consumedObjectTypeId: movement.plan.consumedObject.unitTypeId } : {}),
        ...(movement.plan.moneyAward ? { moneyAward: movement.plan.moneyAward } : {}),
      }],
    };
  },
};
