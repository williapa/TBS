import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  STANDARD_CANDIDATE_FEATURE_NAMES,
  STANDARD_CELL_FEATURE_NAMES,
  STANDARD_ENTITY_FEATURE_NAMES,
  STANDARD_GLOBAL_FEATURE_NAMES,
  STANDARD_OBSERVATION_NORMALIZATION,
} from "@TBS/game-ai";

import { StandardTrainingEnvironment, getBundledPresetHash } from "./environment";

export const MONEY_MOUNTAIN_PHASE_2_FIXTURE = ".tmp/ai-phase-2/money-mountain-observation.json";

export const createMoneyMountainRepresentationFixture = () => {
  const environment = new StandardTrainingEnvironment();
  const observation = environment.reset("money-mountain", 0);
  return {
    formatVersion: "phase-2-model-fixture@1",
    presetId: observation.presetId,
    presetHash: getBundledPresetHash(observation.presetId),
    schemaVersion: observation.state.schemaVersion,
    rulesetVersion: observation.state.rulesetVersion,
    contentVersion: observation.state.contentVersion,
    featureNames: {
      cell: STANDARD_CELL_FEATURE_NAMES,
      entity: STANDARD_ENTITY_FEATURE_NAMES,
      candidate: STANDARD_CANDIDATE_FEATURE_NAMES,
      global: STANDARD_GLOBAL_FEATURE_NAMES,
    },
    normalization: STANDARD_OBSERVATION_NORMALIZATION,
    encoding: environment.encode(),
  } as const;
};

const main = async (): Promise<void> => {
  const outputPath = resolve(process.argv[2] ?? MONEY_MOUNTAIN_PHASE_2_FIXTURE);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(createMoneyMountainRepresentationFixture())}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ fixture: outputPath })}\n`);
};

if (require.main === module) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
