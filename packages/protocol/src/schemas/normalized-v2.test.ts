import { describe, expect, it } from "vitest";

import { parseNormalizedGameState } from "./normalized-v2";

const drawnState = {
  schemaVersion: 2,
  rulesetVersion: "standard@2",
  contentVersion: "standard@1",
  revision: 60,
  lifecycle: { phase: "finished", result: "draw" },
  board: { cells: {} },
  entities: {},
  teams: {
    orange: { id: "orange", money: 0 },
    purple: { id: "purple", money: 0 },
  },
  objectives: [],
  turn: { number: 61 },
} as const;

describe("normalized v2 game state", () => {
  it("parses the additive draw lifecycle without requiring a winner", () => {
    expect(parseNormalizedGameState(drawnState).lifecycle).toEqual({
      phase: "finished",
      result: "draw",
    });
  });

  it("rejects unsupported finished results", () => {
    expect(() => parseNormalizedGameState({
      ...drawnState,
      lifecycle: { phase: "finished", result: "stalemate" },
    })).toThrow();
  });
});
