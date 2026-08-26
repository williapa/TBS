import {
  NORMALIZED_GAME_SCHEMA_VERSION,
  contentVersion,
  entityId,
  hexCoord,
  hexKey,
  rulesetVersion,
  teamId,
  terrainTypeId,
  unitTypeId,
  validateGameState,
  type BoardCellState,
  type EntityState,
  type GameState,
  type ObjectiveState,
  type TeamState,
} from "@TBS/game-core";
import { z } from "zod";

const identifierSchema = z.string().trim().min(1);
const nonNegativeIntegerSchema = z.number().int().nonnegative();

export const hexCoordSchema = z.object({
  q: z.number().int(),
  r: z.number().int(),
}).strict();

const healthSchema = z.object({
  current: nonNegativeIntegerSchema,
  maximum: z.number().int().positive(),
}).strict().refine(({ current, maximum }) => current <= maximum, {
  message: "current health must not exceed maximum health",
});

const actionBudgetSchema = z.object({
  moved: z.boolean(),
  acted: z.boolean(),
}).strict();

const cargoSchema = z.object({
  capacity: nonNegativeIntegerSchema,
  entityIds: z.array(identifierSchema),
}).strict().refine(({ capacity, entityIds }) => entityIds.length <= capacity, {
  message: "cargo exceeds capacity",
});

const statusSchema = z.object({
  type: identifierSchema,
  remainingTurns: nonNegativeIntegerSchema.optional(),
}).strict();

const entitySchema = z.object({
  id: identifierSchema,
  unitTypeId: identifierSchema,
  ownerTeamId: identifierSchema.optional(),
  position: hexCoordSchema.optional(),
  health: healthSchema.optional(),
  actionBudget: actionBudgetSchema.optional(),
  cargo: cargoSchema.optional(),
  statuses: z.array(statusSchema),
}).strict();

const boardCellSchema = z.object({
  position: hexCoordSchema,
  terrainTypeId: identifierSchema,
  occupantEntityId: identifierSchema.optional(),
}).strict();

const teamSchema = z.object({
  id: identifierSchema,
  money: nonNegativeIntegerSchema,
}).strict();

const objectiveSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("capital"),
    position: hexCoordSchema,
    controllingTeamId: identifierSchema.optional(),
  }).strict(),
  z.object({
    type: z.literal("elimination"),
    teamId: identifierSchema,
  }).strict(),
]);

const lifecycleSchema = z.discriminatedUnion("phase", [
  z.object({ phase: z.literal("waiting") }).strict(),
  z.object({ phase: z.literal("active"), activeTeamId: identifierSchema }).strict(),
  z.object({ phase: z.literal("finished"), winnerTeamId: identifierSchema }).strict(),
]);

export const normalizedGameStateSchema = z.object({
  schemaVersion: z.literal(NORMALIZED_GAME_SCHEMA_VERSION),
  rulesetVersion: identifierSchema,
  contentVersion: identifierSchema,
  revision: nonNegativeIntegerSchema,
  lifecycle: lifecycleSchema,
  board: z.object({ cells: z.record(identifierSchema, boardCellSchema) }).strict(),
  entities: z.record(identifierSchema, entitySchema),
  teams: z.record(identifierSchema, teamSchema),
  objectives: z.array(objectiveSchema),
  turn: z.object({ number: nonNegativeIntegerSchema }).strict(),
}).strict();

export type NormalizedGameStateDocument = z.infer<typeof normalizedGameStateSchema>;

export const parseNormalizedGameState = (value: unknown): GameState => {
  const document = normalizedGameStateSchema.parse(value);
  const cells: Record<string, BoardCellState> = {};
  const entities: Record<string, EntityState> = {};
  const teams: Record<string, TeamState> = {};

  for (const [key, cell] of Object.entries(document.board.cells)) {
    const position = hexCoord(cell.position.q, cell.position.r);
    const positionKey = hexKey(position);
    if (key !== positionKey) {
      throw new Error(`Board cell key ${key} does not match position ${positionKey}`);
    }
    cells[positionKey] = {
      position,
      terrainTypeId: terrainTypeId(cell.terrainTypeId),
      ...(cell.occupantEntityId ? { occupantEntityId: entityId(cell.occupantEntityId) } : {}),
    };
  }

  for (const [key, entity] of Object.entries(document.entities)) {
    entities[key] = {
      id: entityId(entity.id),
      unitTypeId: unitTypeId(entity.unitTypeId),
      ...(entity.ownerTeamId ? { ownerTeamId: teamId(entity.ownerTeamId) } : {}),
      ...(entity.position ? { position: hexCoord(entity.position.q, entity.position.r) } : {}),
      ...(entity.health ? { health: entity.health } : {}),
      ...(entity.actionBudget ? { actionBudget: entity.actionBudget } : {}),
      ...(entity.cargo ? {
        cargo: {
          capacity: entity.cargo.capacity,
          entityIds: entity.cargo.entityIds.map(entityId),
        },
      } : {}),
      statuses: entity.statuses,
    };
  }

  for (const [key, team] of Object.entries(document.teams)) {
    teams[key] = { id: teamId(team.id), money: team.money };
  }

  const objectives: ObjectiveState[] = document.objectives.map((objective) => {
    if (objective.type === "elimination") {
      return { type: "elimination", teamId: teamId(objective.teamId) };
    }
    return {
      type: "capital",
      position: hexCoord(objective.position.q, objective.position.r),
      ...(objective.controllingTeamId ? { controllingTeamId: teamId(objective.controllingTeamId) } : {}),
    };
  });

  const lifecycle = document.lifecycle.phase === "waiting"
    ? document.lifecycle
    : document.lifecycle.phase === "active"
      ? { phase: "active" as const, activeTeamId: teamId(document.lifecycle.activeTeamId) }
      : { phase: "finished" as const, winnerTeamId: teamId(document.lifecycle.winnerTeamId) };

  const state: GameState = {
    schemaVersion: NORMALIZED_GAME_SCHEMA_VERSION,
    rulesetVersion: rulesetVersion(document.rulesetVersion),
    contentVersion: contentVersion(document.contentVersion),
    revision: document.revision,
    lifecycle,
    board: { cells },
    entities,
    teams,
    objectives,
    turn: document.turn,
  };

  const violations = validateGameState(state);
  if (violations.length > 0) {
    throw new Error(`Normalized game state violates invariants: ${JSON.stringify(violations)}`);
  }
  return state;
};
