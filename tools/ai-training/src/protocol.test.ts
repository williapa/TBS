import { describe, expect, it } from "vitest";

import { MAX_TRAINING_ENVIRONMENTS, TrainingProtocol } from "./protocol";

describe("TrainingProtocol", () => {
  it("validates requests and keeps named environments alive", () => {
    const protocol = new TrainingProtocol();
    expect(protocol.handle({ id: "bad", environmentId: "one", operation: "reset", presetId: "default", seed: 0 }))
      .toMatchObject({ ok: false, error: { code: "invalid-request" } });

    expect(protocol.handle({
      id: "reset",
      environmentId: "one",
      operation: "reset",
      presetId: "four-forests",
      seed: 123,
      maxCommands: 5,
    })).toMatchObject({ id: "reset", ok: true, result: { commandCount: 0, actorTeamId: "purple" } });
    expect(protocol.handle({ id: "observe", environmentId: "one", operation: "observe" }))
      .toMatchObject({ id: "observe", ok: true, result: { commandCount: 0, actorTeamId: "purple" } });
    expect(protocol.handle({ id: "encode", environmentId: "one", operation: "encode" }))
      .toMatchObject({
        id: "encode",
        ok: true,
        result: {
          version: "standard-observation@1",
          candidateVersion: "standard-actions@1",
          actorTeamId: "purple",
          tensors: { globalFeatures: expect.any(Array), candidateMask: expect.any(Array) },
        },
      });
    expect(protocol.handle({ id: "missing", environmentId: "other", operation: "observe" }))
      .toMatchObject({ ok: false, error: { code: "operation-failed", message: "unknown training environment" } });
    expect(protocol.handle({ id: "release", environmentId: "one", operation: "release" }))
      .toEqual({ id: "release", ok: true, result: { released: true } });
    expect(protocol.handle({ id: "released", environmentId: "one", operation: "observe" }))
      .toMatchObject({ ok: false, error: { code: "operation-failed", message: "unknown training environment" } });
    expect(protocol.handle({ id: "release-again", environmentId: "one", operation: "release" }))
      .toEqual({ id: "release-again", ok: true, result: { released: false } });
  });

  it("supports sequential runs longer than the concurrent environment limit", () => {
    const protocol = new TrainingProtocol();
    for (let index = 0; index <= MAX_TRAINING_ENVIRONMENTS; index += 1) {
      const environmentId = `sequential-${index}`;
      expect(protocol.handle({
        id: `reset-${index}`,
        environmentId,
        operation: "reset",
        presetId: "four-forests",
        seed: index,
        maxCommands: 1,
      })).toMatchObject({ ok: true });
      expect(protocol.handle({
        id: `release-${index}`,
        environmentId,
        operation: "release",
      })).toMatchObject({ ok: true, result: { released: true } });
    }
  });
});
