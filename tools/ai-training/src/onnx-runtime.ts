import { readFile } from "node:fs/promises";

import type { EncodedStandardObservation, StandardObservationTensors } from "@TBS/game-ai";
import * as ort from "onnxruntime-web";

export type PolicyValueOutput = Readonly<{
  policyLogits: readonly number[];
  value: number;
}>;

const floatTensor = (values: readonly number[], dimensions: readonly number[]): ort.Tensor =>
  new ort.Tensor("float32", Float32Array.from(values), dimensions);

const integerTensor = (values: readonly number[], dimensions: readonly number[]): ort.Tensor =>
  new ort.Tensor("int64", BigInt64Array.from(values.map((value) => BigInt(value))), dimensions);

const matrix = (
  values: readonly (readonly number[])[],
  width: number,
  integer = false,
): ort.Tensor => {
  const dimensions = [1, values.length, width];
  const flattened = values.flat();
  return integer ? integerTensor(flattened, dimensions) : floatTensor(flattened, dimensions);
};

const vector = (values: readonly number[], integer = false): ort.Tensor => {
  const dimensions = [1, values.length];
  return integer ? integerTensor(values, dimensions) : floatTensor(values, dimensions);
};

export const createOnnxFeeds = (tensors: StandardObservationTensors): Record<string, ort.Tensor> => ({
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

const numericData = (tensor: ort.Tensor, outputName: string): readonly number[] => {
  if (tensor.type !== "float32") throw new Error(`${outputName} has unexpected tensor type ${tensor.type}`);
  return Array.from(tensor.data as Float32Array);
};

export const createOnnxSession = async (modelPath: string): Promise<ort.InferenceSession> => {
  ort.env.wasm.numThreads = 1;
  const model = await readFile(modelPath);
  return ort.InferenceSession.create(model, { executionProviders: ["wasm"] });
};

export const runOnnxPolicyValue = async (
  session: ort.InferenceSession,
  observation: EncodedStandardObservation,
): Promise<PolicyValueOutput> => {
  const outputs = await session.run(createOnnxFeeds(observation.tensors));
  const logits = outputs.policy_logits;
  const value = outputs.value;
  if (!logits || !value) throw new Error("ONNX model did not return policy_logits and value");
  const policyLogits = numericData(logits, "policy_logits");
  const valueData = numericData(value, "value");
  if (policyLogits.length !== observation.candidateKeys.length || valueData.length !== 1) {
    throw new Error("ONNX output shapes do not match the encoded observation");
  }
  return { policyLogits, value: valueData[0] ?? 0 };
};
