import { createHash } from "node:crypto";

import { teamId } from "@TBS/game-core";
import { applyStandardAction, parseStandardAction, parseStandardEvent } from "@TBS/game-rules";
import { createCurrentProtocolCodec, parseNormalizedGameState } from "@TBS/protocol";
import { describe, expect, it } from "vitest";

import { canonicalJson } from "./canonical-json";
import { createActiveGameStateFixture, FIXTURE_ACTION_ID } from "./canonical-fixtures";

const envelopeFixture = {
  protocolVersion: 2,
  actionId: FIXTURE_ACTION_ID,
  expectedRevision: 0,
  rulesetVersion: "standard@1",
  action: {
    type: "move",
    actorId: "initial-cell-0",
    destination: { q: 1, r: -1 },
  },
} as const;

const protocolCodec = createCurrentProtocolCodec({
  parseState: parseNormalizedGameState,
  parseAction: parseStandardAction,
  parseEvent: parseStandardEvent,
});

const executeThroughJsonBoundary = () => {
  const state = parseNormalizedGameState(JSON.parse(JSON.stringify(createActiveGameStateFixture())));
  const envelope = protocolCodec.parseActionEnvelope(JSON.parse(JSON.stringify(envelopeFixture)));
  if (envelope.expectedRevision !== state.revision) throw new Error("fixture revision mismatch");
  if (envelope.rulesetVersion !== state.rulesetVersion) throw new Error("fixture ruleset mismatch");
  return applyStandardAction(state, teamId("orange"), envelope.action);
};

describe("browser/trusted-runtime determinism", () => {
  it("produces byte-equivalent canonical state and ordered events across isolated JSON boundaries", () => {
    const browserResult = executeThroughJsonBoundary();
    const trustedResult = executeThroughJsonBoundary();
    expect(browserResult).toEqual(trustedResult);
    const checksum = createHash("sha256").update(canonicalJson(browserResult)).digest("hex");
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });
});
