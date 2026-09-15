import { resolve } from "node:path";

import { StandardTrainingEnvironment } from "./environment";
import { createOnnxSession, runOnnxPolicyValue } from "./onnx-runtime";

const main = async (): Promise<void> => {
  const modelPath = resolve(process.argv[2] ?? ".tmp/ai-phase-2/policy-value.onnx");
  const environment = new StandardTrainingEnvironment();
  const before = environment.reset("money-mountain", 0);
  const encoded = environment.encode();
  const session = await createOnnxSession(modelPath);
  const output = await runOnnxPolicyValue(session, encoded);
  let candidateIndex = -1;
  let bestLogit = Number.NEGATIVE_INFINITY;
  for (const [index, logit] of output.policyLogits.entries()) {
    if (encoded.tensors.candidateMask[index] === 1 && logit > bestLogit) {
      candidateIndex = index;
      bestLogit = logit;
    }
  }
  const candidate = before.candidates[candidateIndex];
  if (!candidate || candidate.key !== encoded.candidateKeys[candidateIndex]) {
    throw new Error("model selection did not map back to the current legal candidate set");
  }
  const transition = environment.step({
    candidateVersion: before.candidateVersion,
    stateRevision: before.stateRevision,
    candidateIndex,
    candidateKey: candidate.key,
  });
  if (transition.observation.stateRevision !== before.stateRevision + 1) {
    throw new Error("model-selected legal action did not advance the engine");
  }
  process.stdout.write(`${JSON.stringify({
    presetId: before.presetId,
    fromRevision: before.stateRevision,
    toRevision: transition.observation.stateRevision,
    candidateKey: candidate.key,
    actionType: transition.action.type,
    value: output.value,
  })}\n`);
};

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
