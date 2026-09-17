/// <reference lib="webworker" />

import {
  FOUR_FORESTS_OBJECTIVE_TOP_K,
  FOUR_FORESTS_POLICY_VERSION,
  FourForestsPolicy,
  STANDARD_OBSERVATION_ENCODING_VERSION,
  encodeStandardObservation,
  type StandardObservationTensors,
} from "@TBS/game-ai";
import type { GameState } from "@TBS/game-core";
import {
  STANDARD_ACTION_CANDIDATE_VERSION,
  STANDARD_CONTENT_VERSION,
  STANDARD_RULESET_VERSION,
  enumerateStandardActions,
} from "@TBS/game-rules";
import * as ort from "onnxruntime-web/wasm";

import modelUrl from "./assets/four-forests-policy.onnx?url";
import manifest from "./assets/four-forests-training-manifest.json";
import wasmUrl from "./assets/ort-wasm-simd-threaded.wasm?url";
import type { FourForestsAiWorkerRequest, FourForestsAiWorkerResponse } from "./fourForestsAiWorkerProtocol";

const MODEL_LIMITS = manifest.supportedShapes.limits;

const validateManifest = (): void => {
  if (
    !manifest.qualifiedForFourForestsPolicyRelease
    || manifest.presetId !== "four-forests"
    || manifest.observationEncodingVersion !== STANDARD_OBSERVATION_ENCODING_VERSION
    || manifest.candidateEncodingVersion !== STANDARD_ACTION_CANDIDATE_VERSION
    || manifest.rulesetVersion !== STANDARD_RULESET_VERSION
    || manifest.contentVersion !== STANDARD_CONTENT_VERSION
    || manifest.inferencePolicy.version !== FOUR_FORESTS_POLICY_VERSION
    || manifest.inferencePolicy.objectiveTopK !== FOUR_FORESTS_OBJECTIVE_TOP_K
  ) throw new Error("The bundled Four Forests model manifest is incompatible");
};

const sha256 = async (value: ArrayBuffer): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const floatTensor = (values: readonly number[], dimensions: readonly number[]): ort.Tensor =>
  new ort.Tensor("float32", Float32Array.from(values), dimensions);

const integerTensor = (values: readonly number[], dimensions: readonly number[]): ort.Tensor =>
  new ort.Tensor("int64", BigInt64Array.from(values.map((value) => BigInt(value))), dimensions);

const matrix = (
  values: readonly (readonly number[])[],
  width: number,
  integer = false,
): ort.Tensor => {
  const flattened = values.flat();
  const dimensions = [1, values.length, width];
  return integer ? integerTensor(flattened, dimensions) : floatTensor(flattened, dimensions);
};

const vector = (values: readonly number[], integer = false): ort.Tensor => {
  const dimensions = [1, values.length];
  return integer ? integerTensor(values, dimensions) : floatTensor(values, dimensions);
};

const createFeeds = (tensors: StandardObservationTensors): Record<string, ort.Tensor> => ({
  cell_features: matrix(tensors.cellFeatures, tensors.cellFeatures[0]?.length ?? 0),
  cell_mask: vector(tensors.cellMask),
  cell_neighbors: matrix(tensors.cellNeighbors, 6, true),
  entity_features: matrix(tensors.entityFeatures, tensors.entityFeatures[0]?.length ?? 0),
  entity_mask: vector(tensors.entityMask),
  entity_cells: vector(tensors.entityCells, true),
  entity_carriers: vector(tensors.entityCarriers, true),
  candidate_features: matrix(tensors.candidateFeatures, tensors.candidateFeatures[0]?.length ?? 0),
  candidate_mask: vector(tensors.candidateMask),
  candidate_actors: vector(tensors.candidateActors, true),
  candidate_destinations: vector(tensors.candidateDestinations, true),
  candidate_target_entities: vector(tensors.candidateTargetEntities, true),
  candidate_target_cells: vector(tensors.candidateTargetCells, true),
  global_features: vector(tensors.globalFeatures),
});

const loadSession = async (): Promise<ort.InferenceSession> => {
  validateManifest();
  ort.env.wasm.numThreads = 1;
  const [model, wasm] = await Promise.all([
    fetch(modelUrl).then((response) => {
      if (!response.ok) throw new Error("Four Forests model could not be loaded");
      return response.arrayBuffer();
    }),
    fetch(wasmUrl).then((response) => {
      if (!response.ok) throw new Error("AI runtime could not be loaded");
      return response.arrayBuffer();
    }),
  ]);
  if (await sha256(model) !== manifest.modelSha256) {
    throw new Error("The bundled Four Forests model failed its integrity check");
  }
  ort.env.wasm.wasmBinary = wasm;
  return ort.InferenceSession.create(model, { executionProviders: ["wasm"] });
};

const policy = new FourForestsPolicy();
const session = loadSession();

const policyLogits = async (state: GameState) => {
  if (state.lifecycle.phase !== "active" || state.lifecycle.activeTeamId !== "purple") {
    throw new Error("AI can only select an action during Purple's turn");
  }
  const candidateSet = enumerateStandardActions(state, state.lifecycle.activeTeamId);
  const observation = encodeStandardObservation({
    state,
    observerTeamId: state.lifecycle.activeTeamId,
    candidateSet,
    limits: MODEL_LIMITS,
  });
  const outputs = await (await session).run(createFeeds(observation.tensors));
  const output = outputs.policy_logits;
  if (!output || output.type !== "float32") throw new Error("AI model returned invalid policy logits");
  return {
    candidateSet,
    logits: Array.from(output.data as Float32Array),
  };
};

self.addEventListener("message", (event: MessageEvent<FourForestsAiWorkerRequest>) => {
  const request = event.data;
  void policyLogits(request.state).then(({ candidateSet, logits }) => {
    const selected = policy.select({ state: request.state, candidateSet, policyLogits: logits });
    const response: FourForestsAiWorkerResponse = {
      type: "selection",
      requestId: request.requestId,
      stateRevision: request.state.revision,
      candidateKey: selected.key,
      action: selected.action,
    };
    self.postMessage(response);
  }).catch((value: unknown) => {
    const response: FourForestsAiWorkerResponse = {
      type: "error",
      requestId: request.requestId,
      message: value instanceof Error ? value.message : "AI inference failed",
    };
    self.postMessage(response);
  });
});

export {};
