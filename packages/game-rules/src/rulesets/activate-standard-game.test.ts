import {
  NORMALIZED_GAME_SCHEMA_VERSION,
  rulesetVersion,
  teamId,
  type GameState,
} from "@TBS/game-core";
import { describe, expect, it } from "vitest";

import { STANDARD_CONTENT_VERSION } from "./standard";
import { activateStandardGame } from "./activate-standard-game";
import { LEGACY_STANDARD_RULESET_VERSION, STANDARD_RULESET_VERSION } from "./standard-versions";

const orange = teamId("orange");
const purple = teamId("purple");

const waitingState = (): GameState => ({
  schemaVersion: NORMALIZED_GAME_SCHEMA_VERSION,
  rulesetVersion: STANDARD_RULESET_VERSION,
  contentVersion: STANDARD_CONTENT_VERSION,
  revision: 0,
  lifecycle: { phase: "waiting" },
  board: { cells: {} },
  entities: {},
  teams: {
    [orange]: { id: orange, money: 0 },
    [purple]: { id: purple, money: 0 },
  },
  objectives: [],
  turn: { number: 0 },
});

describe("activateStandardGame", () => {
  it("starts purple on turn one without mutating the setup", () => {
    const state = waitingState();
    const result = activateStandardGame(state);
    expect(result).toMatchObject({
      ok: true,
      state: { lifecycle: { phase: "active", activeTeamId: purple }, turn: { number: 1 } },
    });
    expect(state.lifecycle).toEqual({ phase: "waiting" });
    expect(state.turn.number).toBe(0);
  });

  it("preserves activation compatibility for legacy standard@1 games", () => {
    expect(activateStandardGame({ ...waitingState(), rulesetVersion: LEGACY_STANDARD_RULESET_VERSION }).ok).toBe(true);
  });

  it("rejects incompatible versions and non-initial lifecycle state", () => {
    expect(activateStandardGame({ ...waitingState(), rulesetVersion: rulesetVersion("unknown@1") }))
      .toMatchObject({ ok: false, code: "incompatible-ruleset" });
    expect(activateStandardGame({ ...waitingState(), revision: 1 }))
      .toMatchObject({ ok: false, code: "invalid-initial-state" });
  });
});
