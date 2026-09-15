import { performance } from "node:perf_hooks";

import { StandardTrainingEnvironment } from "./environment";

const EPISODES = 32;
const COMMANDS_PER_EPISODE = 200;

const nextRandom = (value: number): number => {
  let state = value >>> 0;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return state >>> 0;
};

const percentile = (values: readonly number[], proportion: number): number => {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * proportion))] ?? 0;
};

const main = (): void => {
  const durations: number[] = [];
  let maximumEntities = 0;
  let maximumCandidates = 0;
  let maximumTransportedEntities = 0;
  let maximumSerializedBytes = 0;
  let encodedPositions = 0;
  const actionFamilies = new Set<string>();

  for (let episode = 0; episode < EPISODES; episode += 1) {
    const environment = new StandardTrainingEnvironment();
    let observation = environment.reset("money-mountain", episode, COMMANDS_PER_EPISODE);
    let randomState = episode + 1;
    while (observation.status === "running") {
      const startedAt = performance.now();
      const encoded = environment.encode();
      durations.push(performance.now() - startedAt);
      maximumEntities = Math.max(maximumEntities, encoded.tensors.entityFeatures.length);
      maximumCandidates = Math.max(maximumCandidates, encoded.tensors.candidateFeatures.length);
      maximumTransportedEntities = Math.max(
        maximumTransportedEntities,
        Object.values(observation.state.entities).filter(({ position }) => !position).length,
      );
      for (const { action } of observation.candidates) actionFamilies.add(action.type);
      maximumSerializedBytes = Math.max(maximumSerializedBytes, Buffer.byteLength(JSON.stringify(encoded), "utf8"));
      encodedPositions += 1;
      randomState = nextRandom(randomState);
      const candidateIndex = randomState % observation.candidates.length;
      const candidate = observation.candidates[candidateIndex];
      if (!candidate) throw new Error("running observation has no legal candidate");
      observation = environment.step({
        candidateVersion: observation.candidateVersion,
        stateRevision: observation.stateRevision,
        candidateIndex,
        candidateKey: candidate.key,
      }).observation;
    }
  }

  const initial = new StandardTrainingEnvironment();
  initial.reset("money-mountain", 0);
  const initialEncoding = initial.encode();
  const numericValues = Object.values(initialEncoding.tensors).reduce((count, tensor) =>
    count + (Array.isArray(tensor[0])
      ? (tensor as readonly (readonly number[])[]).reduce((sum, row) => sum + row.length, 0)
      : tensor.length), 0);
  process.stdout.write(`${JSON.stringify({
    benchmarkVersion: "phase-2-representation-benchmark@1",
    presetId: "money-mountain",
    episodes: EPISODES,
    commandLimitPerEpisode: COMMANDS_PER_EPISODE,
    encodedPositions,
    observedBounds: {
      cells: initialEncoding.tensors.cellFeatures.length,
      maximumEntities,
      maximumCandidates,
      maximumTransportedEntities,
      actionFamilies: [...actionFamilies].sort(),
    },
    declaredLimits: initialEncoding.limits,
    encodingMilliseconds: {
      median: percentile(durations, 0.5),
      p95: percentile(durations, 0.95),
      maximum: Math.max(...durations),
    },
    maximumSerializedBytes,
    initialNumericBytesFloat32Equivalent: numericValues * 4,
  })}\n`);
};

main();
