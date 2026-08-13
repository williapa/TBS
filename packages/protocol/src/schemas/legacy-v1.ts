import { z } from "zod";

export const LEGACY_GAME_SCHEMA_VERSION = 1 as const;

const legacyTeamSchema = z.enum(["orange", "purple", "gray"]);

const legacyLoadedUnitSchema = z.object({
  damage: z.number().int().min(0).max(99).optional(),
  boosted: z.boolean().optional(),
  entityId: z.string().trim().min(1).optional(),
  moved: z.boolean().optional(),
  team: legacyTeamSchema,
  unit: z.string().trim().min(1),
}).strict();

export const legacyMapCellSchema = z.object({
  row: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
  damage: z.number().int().min(0).max(99).optional(),
  boosted: z.boolean().optional(),
  entityId: z.string().trim().min(1).optional(),
  index: z.number().int().nonnegative(),
  loadedUnit: legacyLoadedUnitSchema.optional(),
  moved: z.boolean().optional(),
  neighbors: z.array(z.number().int().nonnegative()).optional(),
  terrain: z.string().trim().min(1),
  unit: z.string().trim().min(1),
  team: legacyTeamSchema,
}).strict();

export const legacyGameStateSchema = z.object({
  schemaVersion: z.literal(LEGACY_GAME_SCHEMA_VERSION),
  revision: z.number().int().nonnegative(),
  status: z.enum(["waiting", "active", "finished"]),
  activeTeam: z.enum(["orange", "purple"]).optional(),
  winner: z.enum(["orange", "purple"]).optional(),
  winCondition: z.enum(["capital-or-combat-elimination", "combat-elimination"]).optional(),
  map: z.array(z.array(legacyMapCellSchema).min(1)).min(1),
  money: z.object({
    orange: z.number().int().nonnegative(),
    purple: z.number().int().nonnegative(),
  }).strict(),
}).strict().superRefine((state, context) => {
  if (state.status === "active" && !state.activeTeam) {
    context.addIssue({ code: "custom", message: "activeTeam is required for an active game", path: ["activeTeam"] });
  }
  if (state.status === "finished" && !state.winner) {
    context.addIssue({ code: "custom", message: "winner is required for a finished game", path: ["winner"] });
  }
});

export type LegacyGameState = z.infer<typeof legacyGameStateSchema>;
export type LegacyMapCell = z.infer<typeof legacyMapCellSchema>;
