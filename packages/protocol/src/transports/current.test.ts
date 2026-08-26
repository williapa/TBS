import { describe, expect, it } from "vitest";

import { CURRENT_PROTOCOL_VERSION } from "../envelopes/action";
import { ProtocolValidationError } from "../validation";
import { createCurrentProtocolCodec, MAX_ACTION_BYTES } from "./current";

const firstActionId = "00000000-0000-4000-8000-000000000001";
const codec = createCurrentProtocolCodec({
  parseState: (value) => {
    if (!value || typeof value !== "object" || !("revision" in value) || typeof value.revision !== "number") {
      throw new Error("state revision is required");
    }
    return { revision: value.revision };
  },
  parseAction: (value) => {
    if (!value || typeof value !== "object" || !("type" in value) || value.type !== "end-turn") {
      throw new Error("unsupported action");
    }
    return { type: "end-turn" as const };
  },
  parseEvent: (value) => {
    if (!value || typeof value !== "object" || !("type" in value) || value.type !== "turn-ended") {
      throw new Error("unsupported event");
    }
    return { type: "turn-ended" as const };
  },
});

describe("current protocol codec composition", () => {
  it("parses typed envelopes, snapshots, applied actions, membership, and notices", () => {
    expect(codec.parseActionEnvelope({
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      actionId: firstActionId,
      expectedRevision: 2,
      rulesetVersion: "standard@1",
      action: { type: "end-turn" },
    })).toEqual({
      protocolVersion: 2,
      actionId: firstActionId,
      expectedRevision: 2,
      rulesetVersion: "standard@1",
      action: { type: "end-turn" },
    });

    expect(codec.parseGameSnapshot({
      gameId: "game-1",
      players: { orange: { memberId: "member-1", displayName: "Ada" } },
      spectatorCount: 1,
      state: { revision: 2 },
    })).toEqual({
      gameId: "game-1",
      players: { orange: { memberId: "member-1", displayName: "Ada" } },
      spectatorCount: 1,
      state: { revision: 2 },
    });

    expect(codec.parseAppliedAction({
      protocolVersion: 2,
      actionId: firstActionId,
      revision: 3,
      actorTeamId: "orange",
      action: { type: "end-turn" },
      events: [{ type: "turn-ended" }],
    })).toEqual({
      protocolVersion: 2,
      actionId: firstActionId,
      revision: 3,
      actorTeamId: "orange",
      action: { type: "end-turn" },
      events: [{ type: "turn-ended" }],
    });

    expect(codec.parseMembership({
      gameId: "game-1",
      memberId: "member-1",
      displayName: "Ada",
      role: "orange",
    }).role).toBe("orange");
    expect(codec.parseRevisionNotice({ gameId: "game-1", revision: 3, actionId: firstActionId }))
      .toEqual({ gameId: "game-1", revision: 3, actionId: firstActionId });
    expect(codec.parseError({ code: "stale-revision", message: "stale", retryable: true }))
      .toEqual({ code: "stale-revision", message: "stale", retryable: true });
  });

  it("uses one path-aware validation error for structure, rules payloads, and size limits", () => {
    expect(() => codec.parseActionEnvelope({ protocolVersion: 1 })).toThrow(ProtocolValidationError);
    expect(() => codec.parseActionEnvelope({
      protocolVersion: 2,
      actionId: firstActionId,
      expectedRevision: 0,
      rulesetVersion: "standard@1",
      action: { type: "move" },
    })).toThrow("envelope.action: unsupported action");
    expect(() => codec.parseActionEnvelope({
      protocolVersion: 2,
      actionId: firstActionId,
      expectedRevision: 0,
      rulesetVersion: "standard@1",
      action: { type: "end-turn", padding: "x".repeat(MAX_ACTION_BYTES) },
    })).toThrow(`exceeds ${MAX_ACTION_BYTES} bytes`);
    expect(() => codec.parseRevisionNotice({
      gameId: "game-1",
      revision: 3,
      actionId: "not-a-uuid",
    })).toThrow(ProtocolValidationError);
  });
});
