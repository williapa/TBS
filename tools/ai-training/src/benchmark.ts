#!/usr/bin/env node
import { performance } from "node:perf_hooks";

import { activateStandardGame, enumerateStandardActions } from "@TBS/game-rules";
import { createBundledMapPresets, createInitialGameState } from "@TBS/game-setup";

import { PRODUCTION_AI_PRESET_IDS } from "./environment";
import { StandardTrainingEnvironment } from "./environment";

const repetitions = 50;
const rolloutEpisodes = 10;
const rolloutCommandLimit = 100;
const presets = createBundledMapPresets();

for (const presetId of PRODUCTION_AI_PRESET_IDS) {
  const preset = presets.find(({ id }) => id === presetId);
  if (!preset) throw new Error(`missing bundled preset ${presetId}`);
  const activation = activateStandardGame(createInitialGameState(preset));
  if (!activation.ok || activation.state.lifecycle.phase !== "active") {
    throw new Error(`could not activate ${preset.id}`);
  }
  let movementTraversals = 0;
  let validationCalls = 0;
  let bookkeepingIdAllocations = 0;
  let candidateCount = 0;
  const heapBefore = process.memoryUsage().heapUsed;
  const started = performance.now();
  for (let iteration = 0; iteration < repetitions; iteration += 1) {
    const candidates = enumerateStandardActions(activation.state, activation.state.lifecycle.activeTeamId, {
      movementTraversal: () => { movementTraversals += 1; },
      validation: () => { validationCalls += 1; },
      bookkeepingIdAllocation: () => { bookkeepingIdAllocations += 1; },
    });
    candidateCount = candidates.candidates.length;
  }
  const elapsedMs = performance.now() - started;
  const heapBytesDelta = process.memoryUsage().heapUsed - heapBefore;
  const environment = new StandardTrainingEnvironment();
  let rolloutCommands = 0;
  let terminatedEpisodes = 0;
  const rolloutStarted = performance.now();
  for (let episode = 0; episode < rolloutEpisodes; episode += 1) {
    let observation = environment.reset(presetId, episode, rolloutCommandLimit);
    let randomState = (episode + 1) * 2_654_435_761;
    while (observation.status === "running") {
      randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
      const candidateIndex = randomState % observation.candidates.length;
      const candidate = observation.candidates[candidateIndex];
      if (!candidate) throw new Error("benchmark candidate is unavailable");
      observation = environment.step({
        candidateVersion: observation.candidateVersion,
        stateRevision: observation.stateRevision,
        candidateIndex,
        candidateKey: candidate.key,
      }).observation;
      rolloutCommands += 1;
    }
    if (observation.status === "terminated") terminatedEpisodes += 1;
  }
  const rolloutElapsedMs = performance.now() - rolloutStarted;
  const observation = environment.reset(presetId, 0);
  const serializationStarted = performance.now();
  let serializedBytes = 0;
  for (let iteration = 0; iteration < repetitions; iteration += 1) {
    serializedBytes = Buffer.byteLength(JSON.stringify(observation), "utf8");
  }
  const serializationElapsedMs = performance.now() - serializationStarted;
  process.stdout.write(`${JSON.stringify({
    presetId: preset.id,
    cells: preset.map.flat().length,
    entities: Object.keys(activation.state.entities).length,
    repetitions,
    candidateCount,
    meanEnumerationMs: elapsedMs / repetitions,
    movementTraversalsPerEnumeration: movementTraversals / repetitions,
    validationCallsPerEnumeration: validationCalls / repetitions,
    bookkeepingIdAllocationsPerEnumeration: bookkeepingIdAllocations / repetitions,
    heapBytesDelta,
    rolloutEpisodes,
    rolloutCommands,
    terminatedEpisodes,
    transitionsPerSecond: rolloutCommands / (rolloutElapsedMs / 1_000),
    serializedObservationBytes: serializedBytes,
    meanSerializationMs: serializationElapsedMs / repetitions,
  })}\n`);
}
