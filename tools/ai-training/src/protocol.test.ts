import { describe, expect, it } from "vitest";

import { TrainingProtocol } from "./protocol";

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
  });
});
