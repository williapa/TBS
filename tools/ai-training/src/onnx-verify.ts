import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

import type { EncodedStandardObservation } from "@TBS/game-ai";

import { createOnnxSession, runOnnxPolicyValue } from "./onnx-runtime";

type Fixture = Readonly<{ encoding: EncodedStandardObservation }>;
type Expected = Readonly<{ policyLogits: readonly number[]; value: number }>;

const parseJson = async <Value>(path: string): Promise<Value> =>
  JSON.parse(await readFile(path, "utf8")) as Value;

const maximumDifference = (left: readonly number[], right: readonly number[]): number =>
  Math.max(0, ...left.map((value, index) => Math.abs(value - (right[index] ?? Number.NaN))));

const reversedCandidates = (observation: EncodedStandardObservation): EncodedStandardObservation => ({
  ...observation,
  candidateKeys: [...observation.candidateKeys].reverse(),
  tensors: {
    ...observation.tensors,
    candidateFeatures: [...observation.tensors.candidateFeatures].reverse(),
    candidateMask: [...observation.tensors.candidateMask].reverse(),
    candidateActors: [...observation.tensors.candidateActors].reverse(),
    candidateDestinations: [...observation.tensors.candidateDestinations].reverse(),
    candidateTargetEntities: [...observation.tensors.candidateTargetEntities].reverse(),
    candidateTargetCells: [...observation.tensors.candidateTargetCells].reverse(),
  },
});

const main = async (): Promise<void> => {
  const modelPath = resolve(process.argv[2] ?? ".tmp/ai-phase-2/policy-value.onnx");
  const fixturePath = resolve(process.argv[3] ?? ".tmp/ai-phase-2/money-mountain-observation.json");
  const expectedPath = resolve(process.argv[4] ?? ".tmp/ai-phase-2/pytorch-output.json");
  const fixture = await parseJson<Fixture>(fixturePath);
  const expected = await parseJson<Expected>(expectedPath);
  const session = await createOnnxSession(modelPath);
  const actual = await runOnnxPolicyValue(session, fixture.encoding);
  const policyMaximumAbsoluteDifference = maximumDifference(actual.policyLogits, expected.policyLogits);
  const valueAbsoluteDifference = Math.abs(actual.value - expected.value);
  const reversed = await runOnnxPolicyValue(session, reversedCandidates(fixture.encoding));
  const candidatePermutationDifference = maximumDifference(
    reversed.policyLogits,
    [...actual.policyLogits].reverse(),
  );
  if (policyMaximumAbsoluteDifference > 1e-5 || valueAbsoluteDifference > 1e-5) {
    throw new Error("PyTorch and ONNX Runtime Web outputs differ beyond tolerance");
  }
  if (candidatePermutationDifference > 1e-6 || Math.abs(reversed.value - actual.value) > 1e-6) {
    throw new Error("candidate permutation changed model meaning");
  }
  const durations: number[] = [];
  for (let index = 0; index < 50; index += 1) {
    const startedAt = performance.now();
    await runOnnxPolicyValue(session, fixture.encoding);
    durations.push(performance.now() - startedAt);
  }
  durations.sort((left, right) => left - right);
  process.stdout.write(`${JSON.stringify({
    runtime: "onnxruntime-web/wasm",
    tolerance: 1e-5,
    policyMaximumAbsoluteDifference,
    valueAbsoluteDifference,
    candidatePermutationDifference,
    inferenceMilliseconds: {
      median: durations[Math.floor(durations.length / 2)],
      p95: durations[Math.floor(durations.length * 0.95)],
    },
  })}\n`);
};

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
