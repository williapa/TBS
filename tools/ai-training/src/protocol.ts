import { parseNormalizedGameState } from "@TBS/protocol";
import { z } from "zod";

import {
  MAX_COMMANDS_LIMIT,
  PRODUCTION_AI_PRESET_IDS,
  StandardTrainingEnvironment,
  TRAINING_ENVIRONMENT_VERSION,
  TRAINING_REPLAY_VERSION,
  type TrainingReplay,
  type TrainingSnapshot,
} from "./environment";
import { STANDARD_ACTION_CANDIDATE_VERSION } from "@TBS/game-rules";

export const MAX_PROTOCOL_LINE_BYTES = 1_048_576;
export const MAX_TRAINING_ENVIRONMENTS = 256;

const boundedId = z.string().trim().min(1).max(128);
const unsignedInteger = z.number().int().min(0).max(0xffff_ffff);
const maxCommands = z.number().int().min(1).max(MAX_COMMANDS_LIMIT);
const replayStepSchema = z.object({
  stateRevision: z.number().int().nonnegative(),
  candidateKey: z.string().min(1).max(4_096),
}).strict();

const snapshotSchema = z.object({
  version: z.literal(TRAINING_ENVIRONMENT_VERSION),
  presetId: z.enum(PRODUCTION_AI_PRESET_IDS),
  presetHash: z.string().regex(/^[a-f0-9]{64}$/),
  seed: unsignedInteger,
  rngState: unsignedInteger,
  maxCommands,
  commandCount: z.number().int().nonnegative(),
  candidateVersion: z.literal(STANDARD_ACTION_CANDIDATE_VERSION),
  state: z.unknown(),
}).strict();

const replaySchema = z.object({
  version: z.literal(TRAINING_REPLAY_VERSION),
  presetId: z.enum(PRODUCTION_AI_PRESET_IDS),
  presetHash: z.string().regex(/^[a-f0-9]{64}$/),
  seed: unsignedInteger,
  rngState: unsignedInteger,
  maxCommands,
  initialCommandCount: z.number().int().nonnegative(),
  initialState: z.unknown(),
  steps: z.array(replayStepSchema).max(MAX_COMMANDS_LIMIT),
}).strict();

const requestBase = {
  id: boundedId,
  environmentId: boundedId,
};

export const trainingRequestSchema = z.discriminatedUnion("operation", [
  z.object({
    ...requestBase,
    operation: z.literal("reset"),
    presetId: z.enum(PRODUCTION_AI_PRESET_IDS),
    seed: unsignedInteger,
    maxCommands: maxCommands.optional(),
  }).strict(),
  z.object({ ...requestBase, operation: z.literal("observe") }).strict(),
  z.object({ ...requestBase, operation: z.literal("legal-actions") }).strict(),
  z.object({ ...requestBase, operation: z.literal("encode") }).strict(),
  z.object({
    ...requestBase,
    operation: z.literal("step"),
    selection: z.object({
      candidateVersion: z.literal(STANDARD_ACTION_CANDIDATE_VERSION),
      stateRevision: z.number().int().nonnegative(),
      candidateIndex: z.number().int().nonnegative(),
      candidateKey: z.string().min(1).max(4_096),
    }).strict(),
  }).strict(),
  z.object({ ...requestBase, operation: z.literal("snapshot") }).strict(),
  z.object({ ...requestBase, operation: z.literal("release") }).strict(),
  z.object({ ...requestBase, operation: z.literal("restore"), snapshot: snapshotSchema }).strict(),
  z.object({ ...requestBase, operation: z.literal("replay"), replay: replaySchema }).strict(),
]);

export type TrainingProtocolResponse =
  | Readonly<{ id: string; ok: true; result: unknown }>
  | Readonly<{ id: string | null; ok: false; error: Readonly<{ code: "invalid-request" | "operation-failed"; message: string }> }>;

const snapshotFrom = (value: z.infer<typeof snapshotSchema>): TrainingSnapshot => ({
  ...value,
  state: parseNormalizedGameState(value.state),
});

const replayFrom = (value: z.infer<typeof replaySchema>): TrainingReplay => ({
  ...value,
  initialState: parseNormalizedGameState(value.initialState),
});

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : "unknown operation failure";

export class TrainingProtocol {
  private readonly environments = new Map<string, StandardTrainingEnvironment>();

  handle(value: unknown): TrainingProtocolResponse {
    const parsed = trainingRequestSchema.safeParse(value);
    if (!parsed.success) {
      const id = value && typeof value === "object" && "id" in value && typeof value.id === "string"
        ? value.id
        : null;
      return {
        id,
        ok: false,
        error: { code: "invalid-request", message: z.prettifyError(parsed.error) },
      };
    }
    const request = parsed.data;
    try {
      if (request.operation === "release") {
        return {
          id: request.id,
          ok: true,
          result: { released: this.environments.delete(request.environmentId) },
        };
      }
      let environment = this.environments.get(request.environmentId);
      if (request.operation === "reset" || request.operation === "restore" || request.operation === "replay") {
        if (!environment) {
          if (this.environments.size >= MAX_TRAINING_ENVIRONMENTS) throw new Error("training environment limit reached");
          environment = new StandardTrainingEnvironment();
          this.environments.set(request.environmentId, environment);
        }
      }
      if (!environment) throw new Error("unknown training environment");

      let result: unknown;
      switch (request.operation) {
        case "reset":
          result = environment.reset(request.presetId, request.seed, request.maxCommands);
          break;
        case "observe":
          result = environment.observe();
          break;
        case "legal-actions": {
          const observation = environment.observe();
          result = {
            candidateVersion: observation.candidateVersion,
            stateRevision: observation.stateRevision,
            actorTeamId: observation.actorTeamId,
            candidates: observation.candidates,
          };
          break;
        }
        case "encode":
          result = environment.encode();
          break;
        case "step":
          result = environment.step(request.selection);
          break;
        case "snapshot":
          result = environment.snapshot();
          break;
        case "restore":
          result = environment.restore(snapshotFrom(request.snapshot));
          break;
        case "replay":
          result = environment.replay(replayFrom(request.replay));
          break;
      }
      return { id: request.id, ok: true, result };
    } catch (error) {
      return {
        id: request.id,
        ok: false,
        error: { code: "operation-failed", message: errorMessage(error) },
      };
    }
  }
}
