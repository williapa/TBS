import { z } from "zod";

import { parseAttackAction } from "./attack";
import { parseBoostAction } from "./boost";
import { parseConstructAction } from "./construct";
import { parseEndTurnAction } from "./end-turn";
import { parseHealAction } from "./heal";
import { parseLoadAction } from "./load";
import { parseMoveAction } from "./move";
import { parseSpawnAction } from "./spawn";
import type { StandardAction } from "./types";
import { parseUnloadAction } from "./unload";

type ActionParser = (value: unknown) => StandardAction;

export const standardActionParsers: Readonly<Record<StandardAction["type"], ActionParser>> = {
  move: parseMoveAction,
  attack: parseAttackAction,
  boost: parseBoostAction,
  heal: parseHealAction,
  construct: parseConstructAction,
  spawn: parseSpawnAction,
  load: parseLoadAction,
  unload: parseUnloadAction,
  "end-turn": parseEndTurnAction,
};

const actionDiscriminantSchema = z.object({ type: z.string().trim().min(1) }).passthrough();

export const parseStandardAction = (value: unknown): StandardAction => {
  const { type } = actionDiscriminantSchema.parse(value);
  if (!(type in standardActionParsers)) throw new Error(`Unsupported standard action: ${type}`);
  return standardActionParsers[type as StandardAction["type"]](value);
};
