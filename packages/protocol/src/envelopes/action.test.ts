import { describe, expect, it } from "vitest";

import { CURRENT_PROTOCOL_VERSION, parseActionEnvelope } from "./action";

describe("versioned action envelope", () => {
  it("keeps the transport envelope typed while delegating action payload semantics", () => {
    expect(parseActionEnvelope({
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      actionId: "00000000-0000-4000-8000-000000000001",
      expectedRevision: 3,
      rulesetVersion: "standard@1",
      action: { type: "move", actorId: "unit-1", destination: { q: 1, r: 0 } },
    })).toEqual({
      protocolVersion: 2,
      actionId: "00000000-0000-4000-8000-000000000001",
      expectedRevision: 3,
      rulesetVersion: "standard@1",
      action: { type: "move", actorId: "unit-1", destination: { q: 1, r: 0 } },
    });
  });

  it("rejects unsupported versions, oversized IDs, and non-JSON action values", () => {
    expect(() => parseActionEnvelope({ protocolVersion: 1 })).toThrow();
    expect(() => parseActionEnvelope({
      protocolVersion: 2,
      actionId: "x".repeat(129),
      expectedRevision: 0,
      rulesetVersion: "standard@1",
      action: { type: "end-turn" },
    })).toThrow();
    expect(() => parseActionEnvelope({
      protocolVersion: 2,
      actionId: "action-1",
      expectedRevision: 0,
      rulesetVersion: "standard@1",
      action: { type: "move", invalid: undefined },
    })).toThrow();
  });
});
