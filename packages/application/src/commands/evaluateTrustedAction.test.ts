import {
  createActiveGameSnapshot,
  CURRENT_GAME_PROTOCOL_VERSION,
} from "@TBS/common";
import { describe, expect, it } from "vitest";

import { evaluateTrustedAction } from "./evaluateTrustedAction";

const snapshot = () => createActiveGameSnapshot();
const versions = {
  protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
  rulesetVersion: "standard@1",
  contentVersion: "standard@1",
};
const envelope = {
  protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
  actionId: "action-1",
  expectedRevision: 0,
  action: { action: "end" },
};

describe("evaluateTrustedAction", () => {
  it("derives a complete immutable commit proposal from canonical state and intent", () => {
    const canonical = snapshot();

    const result = evaluateTrustedAction({
      snapshot: canonical,
      callerId: "purple-member",
      versions,
      envelope,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal).toMatchObject({
      gameId: canonical.gameId,
      callerId: "purple-member",
      actorTeam: "purple",
      actionId: "action-1",
      expectedRevision: 0,
      status: "active",
      activeTeam: "orange",
      winnerTeam: null,
    });
    expect(result.proposal.snapshot.state.revision).toBe(1);
    expect(result.proposal.events).not.toHaveLength(0);
    expect(canonical.state.revision).toBe(0);
  });

  it("rejects candidate-state fields because callers may send intent only", () => {
    const result = evaluateTrustedAction({
      snapshot: snapshot(),
      callerId: "purple-member",
      versions,
      envelope: { ...envelope, candidateGameplayPayload: { map: [], money: {} } },
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "incompatible-data",
        message: "envelope.candidateGameplayPayload: trusted submission accepts intent fields only",
        retryable: false,
      },
    });
  });

  it("rejects spectators, stale revisions, and unsupported pinned versions", () => {
    expect(evaluateTrustedAction({
      snapshot: snapshot(),
      callerId: "spectator-member",
      versions,
      envelope,
    })).toMatchObject({ ok: false, error: { code: "spectator-read-only" } });

    expect(evaluateTrustedAction({
      snapshot: snapshot(),
      callerId: "purple-member",
      versions,
      envelope: { ...envelope, expectedRevision: 4 },
    })).toMatchObject({ ok: false, error: { code: "stale-revision", retryable: true } });

    expect(evaluateTrustedAction({
      snapshot: snapshot(),
      callerId: "purple-member",
      versions: { ...versions, rulesetVersion: "future@1" },
      envelope,
    })).toMatchObject({ ok: false, error: { code: "incompatible-data" } });
  });

  it("returns typed rule rejections without mutating canonical state", () => {
    const canonical = snapshot();
    const before = structuredClone(canonical);

    const result = evaluateTrustedAction({
      snapshot: canonical,
      callerId: "orange-member",
      versions,
      envelope,
    });

    expect(result).toMatchObject({ ok: false, error: { code: "wrong-team" } });
    expect(canonical).toEqual(before);
  });
});
