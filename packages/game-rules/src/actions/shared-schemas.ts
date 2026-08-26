import { entityId, hexCoord, teamId, unitTypeId } from "@TBS/game-core";
import { z } from "zod";

export const entityIdSchema = z.string().trim().min(1).transform(entityId);
export const teamIdSchema = z.string().trim().min(1).transform(teamId);
export const unitTypeIdSchema = z.string().trim().min(1).transform(unitTypeId);
export const hexCoordSchema = z.object({ q: z.number().int(), r: z.number().int() }).strict()
  .transform(({ q, r }) => hexCoord(q, r));
