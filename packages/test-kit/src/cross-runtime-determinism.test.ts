import { createHash } from "node:crypto";

import { teamId } from "@TBS/game-core";
import { applyStandardAction, parseStandardAction } from "@TBS/game-rules";
import { migratePersistedGameState, parseActionEnvelope, parseNormalizedGameState } from "@TBS/protocol";
import { describe, expect, it } from "vitest";

import { canonicalJson } from "./canonical-json";

const legacyFixture = {
  schemaVersion: 1,
  revision: 0,
  status: "active",
  activeTeam: "orange",
  winCondition: "combat-elimination",
  map: [
    [
      { row: 0, column: 0, index: 0, neighbors: [1, 2], terrain: "plains", unit: "soldier", team: "orange" },
      { row: 0, column: 1, index: 1, neighbors: [0, 2, 3], terrain: "plains", unit: "none", team: "gray" },
    ],
    [
      { row: 1, column: 0, index: 2, neighbors: [0, 1, 3, 5], terrain: "plains", unit: "soldier", team: "orange" },
      { row: 1, column: 1, index: 3, neighbors: [1, 2, 4, 5, 6], terrain: "plains", unit: "soldier", team: "purple" },
      { row: 1, column: 2, index: 4, neighbors: [3, 6], terrain: "plains", unit: "none", team: "gray" },
    ],
    [
      { row: 2, column: 0, index: 5, neighbors: [2, 3, 6], terrain: "plains", unit: "none", team: "gray" },
      { row: 2, column: 1, index: 6, neighbors: [3, 4, 5], terrain: "plains", unit: "none", team: "gray" },
    ],
  ],
  money: { orange: 0, purple: 0 },
} as const;

const envelopeFixture = {
  protocolVersion: 2,
  actionId: "determinism-action-1",
  expectedRevision: 0,
  rulesetVersion: "standard@1",
  action: {
    type: "move",
    actorId: "legacy-cell-0",
    destination: { q: 1, r: -1 },
  },
} as const;

const executeThroughJsonBoundary = () => {
  const state = parseNormalizedGameState(JSON.parse(JSON.stringify(migratePersistedGameState(legacyFixture))));
  const envelope = parseActionEnvelope(JSON.parse(JSON.stringify(envelopeFixture)));
  if (envelope.expectedRevision !== state.revision) throw new Error("fixture revision mismatch");
  if (envelope.rulesetVersion !== state.rulesetVersion) throw new Error("fixture ruleset mismatch");
  return applyStandardAction(state, teamId("orange"), parseStandardAction(envelope.action));
};

describe("browser/trusted-runtime determinism", () => {
  it("produces byte-equivalent canonical state and ordered events across isolated JSON boundaries", () => {
    const browserResult = executeThroughJsonBoundary();
    const trustedResult = executeThroughJsonBoundary();
    expect(browserResult).toEqual(trustedResult);
    const checksum = createHash("sha256").update(canonicalJson(browserResult)).digest("hex");
    expect(checksum).toBe("e73ea7616f98c1008b8f42ed62fcdc361a4640b575acc18b664b62b1f99dea08");
  });
});
