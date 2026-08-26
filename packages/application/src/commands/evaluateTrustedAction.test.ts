import {
  STANDARD_CONTENT_VERSION,
  STANDARD_RULESET_VERSION,
} from "@TBS/game-rules";
import { CURRENT_PROTOCOL_VERSION } from "@TBS/protocol";
import { describe, expect, it } from "vitest";

import { createGameSnapshotFixture } from "../canonical-test-fixture";
import { evaluateTrustedAction } from "./evaluateTrustedAction";

const versions = {
  protocolVersion: CURRENT_PROTOCOL_VERSION,
  rulesetVersion: STANDARD_RULESET_VERSION,
  contentVersion: STANDARD_CONTENT_VERSION,
};
const envelope = {
  protocolVersion: CURRENT_PROTOCOL_VERSION,
  actionId: "00000000-0000-4000-8000-000000000001",
  expectedRevision: 0,
  rulesetVersion: STANDARD_RULESET_VERSION,
  action: { type: "end-turn" },
};

describe("evaluateTrustedAction", () => {
  it("derives a complete immutable commit proposal from canonical state and intent", () => {
    const canonical = createGameSnapshotFixture();

    const result = evaluateTrustedAction({
      snapshot: canonical,
      callerId: "orange-member",
      versions,
      envelope,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal).toMatchObject({
      gameId: canonical.gameId,
      callerId: "orange-member",
      actorTeamId: "orange",
      actionId: envelope.actionId,
      expectedRevision: 0,
      state: {
        revision: 1,
        lifecycle: { phase: "active", activeTeamId: "purple" },
      },
    });
    expect(result.proposal.events).not.toHaveLength(0);
    expect(canonical.state.revision).toBe(0);
  });

  it("rejects candidate-state fields because callers may send intent only", () => {
    const result = evaluateTrustedAction({
      snapshot: createGameSnapshotFixture(),
      callerId: "orange-member",
      versions,
      envelope: { ...envelope, candidateState: {} },
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "incompatible-data", retryable: false },
    });
  });

  it("rejects spectators, stale revisions, and unsupported pinned versions", () => {
    expect(evaluateTrustedAction({
      snapshot: createGameSnapshotFixture(),
      callerId: "spectator-member",
      versions,
      envelope,
    })).toMatchObject({ ok: false, error: { code: "spectator-read-only" } });

    expect(evaluateTrustedAction({
      snapshot: createGameSnapshotFixture(),
      callerId: "orange-member",
      versions,
      envelope: { ...envelope, expectedRevision: 4 },
    })).toMatchObject({ ok: false, error: { code: "stale-revision", retryable: true } });

    expect(evaluateTrustedAction({
      snapshot: createGameSnapshotFixture(),
      callerId: "orange-member",
      versions: { ...versions, rulesetVersion: "future@1" },
      envelope,
    })).toMatchObject({ ok: false, error: { code: "incompatible-data" } });
  });

  it("returns typed rule rejections without mutating canonical state", () => {
    const canonical = createGameSnapshotFixture();
    const before = structuredClone(canonical);

    const result = evaluateTrustedAction({
      snapshot: canonical,
      callerId: "purple-member",
      versions,
      envelope,
    });

    expect(result).toMatchObject({ ok: false, error: { code: "wrong-team" } });
    expect(canonical).toEqual(before);
  });
});
