import { actionId } from "@TBS/protocol";
import { describe, expect, it, vi } from "vitest";

import {
  createActiveGameStateFixture,
  orangeTeamId,
  purpleTeamId,
} from "../canonical-test-fixture";
import type { StandardActionEnvelope } from "../contracts";
import { CURRENT_PROTOCOL_VERSION, STANDARD_RULESET_VERSION } from "../contracts";
import { SoloGameModel } from "./SoloGameModel";

const waitingState = () => ({
  ...createActiveGameStateFixture(),
  lifecycle: { phase: "waiting" as const },
  revision: 0,
  turn: { number: 0 },
});

const envelope = (revision: number, value: string): StandardActionEnvelope => ({
  protocolVersion: CURRENT_PROTOCOL_VERSION,
  actionId: actionId(value),
  expectedRevision: revision,
  rulesetVersion: STANDARD_RULESET_VERSION,
  action: { type: "end-turn" },
});

describe("SoloGameModel", () => {
  it("starts the standard teams locally with purple taking the first turn", () => {
    const model = new SoloGameModel();
    const listener = vi.fn();
    model.subscribe(listener);

    model.startGame({ initialState: waitingState(), mapName: " Local battlefield " });

    expect(model.getState()).toMatchObject({
      actions: [],
      error: null,
      game: {
        mapName: "Local battlefield",
        state: {
          lifecycle: { phase: "active", activeTeamId: purpleTeamId },
          revision: 0,
          turn: { number: 1 },
        },
      },
    });
    expect(listener).toHaveBeenCalledOnce();
  });

  it("derives the actor from each active turn and records ordered actions", () => {
    const model = new SoloGameModel();
    model.startGame({ initialState: waitingState(), mapName: "Local battlefield" });

    const purple = model.submitAction(envelope(0, "00000000-0000-4000-8000-000000000001"));
    const orange = model.submitAction(envelope(1, "00000000-0000-4000-8000-000000000002"));

    expect(purple).toMatchObject({ ok: true, appliedAction: { actorTeamId: purpleTeamId } });
    expect(orange).toMatchObject({ ok: true, appliedAction: { actorTeamId: orangeTeamId } });
    expect(model.getState().actions.map(({ actorTeamId, revision }) => ({ actorTeamId, revision })))
      .toEqual([
        { actorTeamId: purpleTeamId, revision: 1 },
        { actorTeamId: orangeTeamId, revision: 2 },
      ]);
    expect(model.getState().game?.state.lifecycle).toEqual({
      phase: "active",
      activeTeamId: purpleTeamId,
    });
  });

  it("rejects stale actions without changing the canonical game or history", () => {
    const model = new SoloGameModel();
    model.startGame({ initialState: waitingState(), mapName: "Local battlefield" });
    const before = model.getState().game;

    const result = model.submitAction(envelope(2, "00000000-0000-4000-8000-000000000003"));

    expect(result).toMatchObject({ ok: false, error: { code: "stale-revision" } });
    expect(model.getState().game).toBe(before);
    expect(model.getState().actions).toEqual([]);
  });

  it("rejects non-waiting initial state", () => {
    const model = new SoloGameModel();
    expect(() => model.startGame({
      initialState: createActiveGameStateFixture(),
      mapName: "Local battlefield",
    })).toThrow();
    expect(model.getState()).toEqual({ actions: [], error: null, game: null });
  });
});
