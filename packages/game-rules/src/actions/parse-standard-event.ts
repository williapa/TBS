import { z } from "zod";

import { entityIdSchema, hexCoordSchema, teamIdSchema, unitTypeIdSchema } from "./shared-schemas";
import type { StandardEvent } from "./types";

const actorTeamSchema = { actorTeamId: teamIdSchema };
const movementOutcomeSchema = {
  consumedObjectTypeId: unitTypeIdSchema.optional(),
  moneyAward: z.number().int().nonnegative().optional(),
};

const objectDamageSchema = z.object({
  entityId: entityIdSchema,
  position: hexCoordSchema,
  unitTypeId: unitTypeIdSchema,
  damage: z.number().int().nonnegative(),
  killed: z.boolean(),
}).strict();

const unitMovedEventSchema = z.object({
  type: z.literal("unit-moved"),
  ...actorTeamSchema,
  entityId: entityIdSchema,
  unitTypeId: unitTypeIdSchema,
  start: hexCoordSchema,
  end: hexCoordSchema,
  ...movementOutcomeSchema,
  objectTarget: hexCoordSchema.optional(),
  objectPreventedByPriest: z.boolean().optional(),
  objectDamage: z.array(objectDamageSchema).readonly().optional(),
}).strict();

const turnEndedEventSchema = z.object({
  type: z.literal("turn-ended"),
  ...actorTeamSchema,
  nextTeamId: teamIdSchema,
  income: z.number().int().nonnegative(),
  money: z.record(z.string().trim().min(1), z.number().int().nonnegative()).readonly(),
}).strict();

const supportEventSchema = z.object({
  type: z.enum(["unit-boosted", "unit-healed"]),
  ...actorTeamSchema,
  actorId: entityIdSchema,
  targetId: entityIdSchema,
  start: hexCoordSchema,
  end: hexCoordSchema,
  amount: z.number().int().positive().optional(),
  ...movementOutcomeSchema,
}).strict();

const unitConstructedEventSchema = z.object({
  type: z.literal("unit-constructed"),
  ...actorTeamSchema,
  actorId: entityIdSchema,
  entityId: entityIdSchema,
  unitTypeId: unitTypeIdSchema,
  position: hexCoordSchema,
  start: hexCoordSchema,
  end: hexCoordSchema,
  cost: z.number().int().nonnegative(),
  ...movementOutcomeSchema,
}).strict();

const unitSpawnedEventSchema = z.object({
  type: z.literal("unit-spawned"),
  ...actorTeamSchema,
  buildingId: entityIdSchema,
  entityId: entityIdSchema,
  unitTypeId: unitTypeIdSchema,
  position: hexCoordSchema,
  cost: z.number().int().nonnegative(),
}).strict();

const unitAttackedEventSchema = z.object({
  type: z.literal("unit-attacked"),
  ...actorTeamSchema,
  attackerId: entityIdSchema,
  defenderId: entityIdSchema,
  attackerUnitTypeId: unitTypeIdSchema,
  defenderUnitTypeId: unitTypeIdSchema,
  start: hexCoordSchema,
  end: hexCoordSchema,
  defenderPosition: hexCoordSchema,
  attackDamage: z.number().int().nonnegative(),
  counterattackDamage: z.number().int().nonnegative(),
  deaths: z.array(entityIdSchema).readonly(),
  ...movementOutcomeSchema,
}).strict();

const unitLoadedEventSchema = z.object({
  type: z.literal("unit-loaded"),
  ...actorTeamSchema,
  entityId: entityIdSchema,
  vehicleId: entityIdSchema,
  start: hexCoordSchema,
  end: hexCoordSchema,
  ...movementOutcomeSchema,
}).strict();

const unitUnloadedEventSchema = z.object({
  type: z.literal("unit-unloaded"),
  ...actorTeamSchema,
  entityId: entityIdSchema,
  vehicleId: entityIdSchema,
  start: hexCoordSchema,
  end: hexCoordSchema,
  unloadPosition: hexCoordSchema,
  ...movementOutcomeSchema,
}).strict();

const gameOverEventSchema = z.object({
  type: z.literal("game-over"),
  winnerTeamId: teamIdSchema,
}).strict();

export const standardEventSchema = z.union([
  unitMovedEventSchema,
  turnEndedEventSchema,
  supportEventSchema,
  unitConstructedEventSchema,
  unitSpawnedEventSchema,
  unitAttackedEventSchema,
  unitLoadedEventSchema,
  unitUnloadedEventSchema,
  gameOverEventSchema,
]);

export const parseStandardEvent = (value: unknown): StandardEvent => standardEventSchema.parse(value);
