import { createHash } from "node:crypto";

import {
  encodeStandardObservation,
  type EncodedStandardObservation,
  type StandardObservationLimits,
} from "@TBS/game-ai";
import type { GameState, TeamId } from "@TBS/game-core";
import {
  activateStandardGame,
  applyStandardAction,
  enumerateStandardActions,
  STANDARD_ACTION_CANDIDATE_VERSION,
  STANDARD_CONTENT_VERSION,
  STANDARD_RULESET_VERSION,
  type StandardAction,
  type StandardActionCandidate,
} from "@TBS/game-rules";
import { createBundledMapPresets, createInitialGameState } from "@TBS/game-setup";
import { parseNormalizedGameState } from "@TBS/protocol";

export const TRAINING_ENVIRONMENT_VERSION = "standard-simulation@1" as const;
export const TRAINING_REPLAY_VERSION = "standard-replay@1" as const;
export const PRODUCTION_AI_PRESET_IDS = ["four-forests", "lake-affection", "money-mountain"] as const;
export type ProductionAiPresetId = (typeof PRODUCTION_AI_PRESET_IDS)[number];

export const DEFAULT_MAX_COMMANDS = 10_000;
export const MAX_COMMANDS_LIMIT = 1_000_000;
export const MAX_TRAINING_MODEL_CANDIDATES = 65_536;

export type TrainingStatus = "running" | "terminated" | "truncated";

export type CandidateSelection = Readonly<{
  candidateVersion: typeof STANDARD_ACTION_CANDIDATE_VERSION;
  stateRevision: number;
  candidateIndex: number;
  candidateKey: string;
}>;

export type ReplayStep = Readonly<{
  stateRevision: number;
  candidateKey: string;
}>;

export type TrainingReplay = Readonly<{
  version: typeof TRAINING_REPLAY_VERSION;
  presetId: ProductionAiPresetId;
  presetHash: string;
  seed: number;
  rngState: number;
  maxCommands: number;
  initialCommandCount: number;
  initialState: GameState;
  steps: readonly ReplayStep[];
}>;

export type TrainingSnapshot = Readonly<{
  version: typeof TRAINING_ENVIRONMENT_VERSION;
  presetId: ProductionAiPresetId;
  presetHash: string;
  seed: number;
  rngState: number;
  maxCommands: number;
  commandCount: number;
  candidateVersion: typeof STANDARD_ACTION_CANDIDATE_VERSION;
  state: GameState;
}>;

export type TrainingObservation = Readonly<{
  environmentVersion: typeof TRAINING_ENVIRONMENT_VERSION;
  presetId: ProductionAiPresetId;
  presetHash: string;
  state: GameState;
  status: TrainingStatus;
  actorTeamId: TeamId | null;
  candidateVersion: typeof STANDARD_ACTION_CANDIDATE_VERSION;
  stateRevision: number;
  candidates: readonly StandardActionCandidate[];
  commandCount: number;
  maxCommands: number;
  rewards: Readonly<Record<TeamId, number>>;
  bootstrapAllowed: boolean;
}>;

export type TrainingTransition = Readonly<{
  actorTeamId: TeamId;
  action: StandardAction;
  candidateKey: string;
  observation: TrainingObservation;
}>;

type EnvironmentState = Readonly<{
  presetId: ProductionAiPresetId;
  presetHash: string;
  seed: number;
  rngState: number;
  maxCommands: number;
  commandCount: number;
  state: GameState;
  replayBaseState: GameState;
  replayBaseCommandCount: number;
  steps: readonly ReplayStep[];
}>;

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stableValue(nested)]));
  }
  return value;
};

const contentHash = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");

const productionPresetIds = new Set<string>(PRODUCTION_AI_PRESET_IDS);

const isProductionPresetId = (value: string): value is ProductionAiPresetId =>
  productionPresetIds.has(value);

const requireUnsignedInteger = (value: number, name: string): void => {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new Error(`${name} must be an unsigned 32-bit integer`);
  }
};

const requireMaxCommands = (value: number): void => {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_COMMANDS_LIMIT) {
    throw new Error(`maxCommands must be between 1 and ${MAX_COMMANDS_LIMIT}`);
  }
};

const presetFor = (presetId: string) => {
  if (!isProductionPresetId(presetId)) throw new Error(`unsupported AI training preset: ${presetId}`);
  const preset = createBundledMapPresets().find(({ id }) => id === presetId);
  if (!preset) throw new Error(`bundled preset is unavailable: ${presetId}`);
  return preset;
};

export const getTrainingObservationLimits = (
  presetId: ProductionAiPresetId,
): StandardObservationLimits => {
  const cellCount = Object.keys(createInitialGameState(presetFor(presetId)).board.cells).length;
  return {
    cellCount,
    // Current standard transports carry at most one loadable entity. Rejecting an
    // overflow keeps future content changes explicit instead of truncating input.
    maxEntities: cellCount * 2,
    maxCandidates: MAX_TRAINING_MODEL_CANDIDATES,
  };
};

export const getBundledPresetHash = (presetId: ProductionAiPresetId): string => {
  const preset = presetFor(presetId);
  return contentHash({ id: preset.id, name: preset.name, state: createInitialGameState(preset) });
};

const rewardsFor = (state: GameState): Readonly<Record<TeamId, number>> => {
  const rewards: Record<string, number> = Object.fromEntries(Object.keys(state.teams).map((id) => [id, 0]));
  if (state.lifecycle.phase !== "finished" || !("winnerTeamId" in state.lifecycle)) return rewards;
  for (const id of Object.keys(state.teams)) rewards[id] = id === state.lifecycle.winnerTeamId ? 1 : -1;
  return rewards;
};

const statusFor = (environment: EnvironmentState): TrainingStatus => {
  if (environment.state.lifecycle.phase === "finished") return "terminated";
  return environment.commandCount >= environment.maxCommands ? "truncated" : "running";
};

const verifyCurrentEngine = (state: GameState): void => {
  if (state.rulesetVersion !== STANDARD_RULESET_VERSION) {
    throw new Error(`training requires ${STANDARD_RULESET_VERSION}; legacy games are not accepted`);
  }
  if (state.contentVersion !== STANDARD_CONTENT_VERSION) {
    throw new Error(`training requires content ${STANDARD_CONTENT_VERSION}`);
  }
};

export class StandardTrainingEnvironment {
  private environment: EnvironmentState | null = null;

  reset(
    presetId: ProductionAiPresetId,
    seed: number,
    maxCommands = DEFAULT_MAX_COMMANDS,
  ): TrainingObservation {
    requireUnsignedInteger(seed, "seed");
    requireMaxCommands(maxCommands);
    const preset = presetFor(presetId);
    const initialState = createInitialGameState(preset);
    verifyCurrentEngine(initialState);
    const activation = activateStandardGame(initialState);
    if (!activation.ok) throw new Error(activation.message);
    this.environment = {
      presetId,
      presetHash: getBundledPresetHash(presetId),
      seed,
      rngState: seed,
      maxCommands,
      commandCount: 0,
      state: activation.state,
      replayBaseState: activation.state,
      replayBaseCommandCount: 0,
      steps: [],
    };
    return this.observe();
  }

  observe(): TrainingObservation {
    const environment = this.requireEnvironment();
    const status = statusFor(environment);
    const actorTeamId = status === "running" && environment.state.lifecycle.phase === "active"
      ? environment.state.lifecycle.activeTeamId
      : null;
    const candidates = actorTeamId
      ? enumerateStandardActions(environment.state, actorTeamId).candidates
      : [];
    return {
      environmentVersion: TRAINING_ENVIRONMENT_VERSION,
      presetId: environment.presetId,
      presetHash: environment.presetHash,
      state: environment.state,
      status,
      actorTeamId,
      candidateVersion: STANDARD_ACTION_CANDIDATE_VERSION,
      stateRevision: environment.state.revision,
      candidates,
      commandCount: environment.commandCount,
      maxCommands: environment.maxCommands,
      rewards: rewardsFor(environment.state),
      bootstrapAllowed: status !== "terminated",
    };
  }

  legalActions(): TrainingObservation["candidates"] {
    return this.observe().candidates;
  }

  encode(): EncodedStandardObservation {
    const observation = this.observe();
    if (observation.status !== "running" || !observation.actorTeamId) {
      throw new Error(`cannot encode an environment that is ${observation.status}`);
    }
    return encodeStandardObservation({
      state: observation.state,
      observerTeamId: observation.actorTeamId,
      candidateSet: {
        version: observation.candidateVersion,
        stateRevision: observation.stateRevision,
        actorTeamId: observation.actorTeamId,
        candidates: observation.candidates,
      },
      limits: getTrainingObservationLimits(observation.presetId),
    });
  }

  step(selection: CandidateSelection): TrainingTransition {
    const before = this.observe();
    if (before.status !== "running" || !before.actorTeamId) {
      throw new Error(`cannot step an environment that is ${before.status}`);
    }
    if (selection.candidateVersion !== before.candidateVersion) throw new Error("candidate version is stale");
    if (selection.stateRevision !== before.stateRevision) throw new Error("candidate revision is stale");
    if (!Number.isSafeInteger(selection.candidateIndex) || selection.candidateIndex < 0) {
      throw new Error("candidate index is invalid");
    }
    const candidate = before.candidates[selection.candidateIndex];
    if (!candidate || candidate.key !== selection.candidateKey) throw new Error("candidate mapping is stale");
    const environment = this.requireEnvironment();
    const result = applyStandardAction(environment.state, before.actorTeamId, candidate.action);
    if (!result.ok) throw new Error(`enumerated action was rejected: ${JSON.stringify(result.violations)}`);
    const step = { stateRevision: before.stateRevision, candidateKey: candidate.key };
    this.environment = {
      ...environment,
      commandCount: environment.commandCount + 1,
      state: result.state,
      steps: [...environment.steps, step],
    };
    return {
      actorTeamId: before.actorTeamId,
      action: candidate.action,
      candidateKey: candidate.key,
      observation: this.observe(),
    };
  }

  snapshot(): TrainingSnapshot {
    const environment = this.requireEnvironment();
    return {
      version: TRAINING_ENVIRONMENT_VERSION,
      presetId: environment.presetId,
      presetHash: environment.presetHash,
      seed: environment.seed,
      rngState: environment.rngState,
      maxCommands: environment.maxCommands,
      commandCount: environment.commandCount,
      candidateVersion: STANDARD_ACTION_CANDIDATE_VERSION,
      state: environment.state,
    };
  }

  restore(value: TrainingSnapshot): TrainingObservation {
    if (value.version !== TRAINING_ENVIRONMENT_VERSION) throw new Error("unsupported training snapshot version");
    if (value.candidateVersion !== STANDARD_ACTION_CANDIDATE_VERSION) throw new Error("unsupported candidate version");
    presetFor(value.presetId);
    const expectedHash = getBundledPresetHash(value.presetId);
    if (value.presetHash !== expectedHash) throw new Error("training snapshot preset hash does not match bundled content");
    requireUnsignedInteger(value.seed, "seed");
    requireUnsignedInteger(value.rngState, "rngState");
    requireMaxCommands(value.maxCommands);
    if (!Number.isSafeInteger(value.commandCount) || value.commandCount < 0 || value.commandCount > value.maxCommands) {
      throw new Error("snapshot commandCount is invalid");
    }
    const state = parseNormalizedGameState(value.state);
    verifyCurrentEngine(state);
    if (state.lifecycle.phase === "waiting") throw new Error("training snapshots cannot contain waiting games");
    this.environment = {
      presetId: value.presetId,
      presetHash: value.presetHash,
      seed: value.seed,
      rngState: value.rngState,
      maxCommands: value.maxCommands,
      commandCount: value.commandCount,
      state,
      replayBaseState: state,
      replayBaseCommandCount: value.commandCount,
      steps: [],
    };
    return this.observe();
  }

  replay(value: TrainingReplay): TrainingObservation {
    if (value.version !== TRAINING_REPLAY_VERSION) throw new Error("unsupported training replay version");
    if (value.presetHash !== getBundledPresetHash(value.presetId)) {
      throw new Error("training replay preset hash does not match bundled content");
    }
    requireUnsignedInteger(value.seed, "seed");
    requireUnsignedInteger(value.rngState, "rngState");
    requireMaxCommands(value.maxCommands);
    if (!Number.isSafeInteger(value.initialCommandCount)
      || value.initialCommandCount < 0
      || value.initialCommandCount > value.maxCommands) {
      throw new Error("replay initialCommandCount is invalid");
    }
    const initialState = parseNormalizedGameState(value.initialState);
    verifyCurrentEngine(initialState);
    if (initialState.lifecycle.phase === "waiting") throw new Error("training replays cannot begin with waiting games");
    this.environment = {
      presetId: value.presetId,
      presetHash: value.presetHash,
      seed: value.seed,
      rngState: value.rngState,
      maxCommands: value.maxCommands,
      commandCount: value.initialCommandCount,
      state: initialState,
      replayBaseState: initialState,
      replayBaseCommandCount: value.initialCommandCount,
      steps: [],
    };
    for (const recorded of value.steps) {
      const observation = this.observe();
      if (observation.stateRevision !== recorded.stateRevision) throw new Error("replay revision does not match");
      const candidateIndex = observation.candidates.findIndex(({ key }) => key === recorded.candidateKey);
      if (candidateIndex < 0) throw new Error("replay candidate is not legal in the reconstructed state");
      this.step({
        candidateVersion: observation.candidateVersion,
        stateRevision: observation.stateRevision,
        candidateIndex,
        candidateKey: recorded.candidateKey,
      });
    }
    return this.observe();
  }

  createReplay(): TrainingReplay {
    const environment = this.requireEnvironment();
    return {
      version: TRAINING_REPLAY_VERSION,
      presetId: environment.presetId,
      presetHash: environment.presetHash,
      seed: environment.seed,
      rngState: environment.rngState,
      maxCommands: environment.maxCommands,
      initialCommandCount: environment.replayBaseCommandCount,
      initialState: environment.replayBaseState,
      steps: environment.steps,
    };
  }

  private requireEnvironment(): EnvironmentState {
    if (!this.environment) throw new Error("training environment has not been reset or restored");
    return this.environment;
  }
}
