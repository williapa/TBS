import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import {
  currentStandardProtocolCodec,
  CURRENT_PROTOCOL_VERSION,
  type StandardAppliedAction,
} from "@TBS/application";

import { getDisplayedEvents, SessionEventsPanel } from "./SessionEventsPanel";

const appliedAction = (
  revision: number,
  events: readonly unknown[],
  action: unknown = { type: "end-turn" },
): StandardAppliedAction => currentStandardProtocolCodec.parseAppliedAction({
  protocolVersion: CURRENT_PROTOCOL_VERSION,
  actionId: `42000000-0000-4000-8000-${revision.toString().padStart(12, "0")}`,
  revision,
  actorTeamId: revision === 3 ? "purple" : "orange",
  action,
  events,
});

const turnEnded = (actorTeamId: "orange" | "purple", nextTeamId: "orange" | "purple") => ({
  type: "turn-ended",
  actorTeamId,
  nextTeamId,
  income: 0,
  money: { orange: 500, purple: 500 },
});

describe("getDisplayedEvents", () => {
  it("shows newest events first and numbers automatic turn endings independently", () => {
    const actions = [
      appliedAction(1, [{
        type: "unit-moved",
        actorTeamId: "orange",
        entityId: "orange-soldier",
        unitTypeId: "soldier",
        start: { q: 0, r: 0 },
        end: { q: 0, r: 1 },
      }]),
      appliedAction(2, [{
        type: "unit-moved",
        actorTeamId: "orange",
        entityId: "orange-soldier",
        unitTypeId: "soldier",
        start: { q: 0, r: 1 },
        end: { q: 0, r: 2 },
      }, turnEnded("orange", "purple")]),
      appliedAction(3, [turnEnded("purple", "orange")]),
    ];

    expect(getDisplayedEvents(actions).map(({ action, event, sequence }) => ({
      revision: action.revision,
      type: event.type,
      sequence,
    }))).toEqual([
      { revision: 3, type: "turn-ended", sequence: "2.1" },
      { revision: 2, type: "turn-ended", sequence: "1.3" },
      { revision: 2, type: "unit-moved", sequence: "1.2" },
      { revision: 1, type: "unit-moved", sequence: "1.1" },
    ]);
  });
});

describe("SessionEventsPanel", () => {
  it("shows the first-move message only while the event history is empty", () => {
    const view = render(createElement(SessionEventsPanel, { actions: [], revision: 0 }));

    expect(screen.getByText("purple moves first.")).toBeInTheDocument();

    view.rerender(createElement(SessionEventsPanel, {
      actions: [appliedAction(1, [turnEnded("orange", "purple")])],
      revision: 1,
    }));

    expect(screen.queryByText("purple moves first.")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("places draw warnings and the result at the required turn action IDs", () => {
    const actions = Array.from({ length: 60 }, (_, index) => {
      const turn = index + 1;
      const actorTeamId = turn % 2 === 0 ? "orange" : "purple";
      const nextTeamId = actorTeamId === "orange" ? "purple" : "orange";
      const events: unknown[] = [turnEnded(actorTeamId, nextTeamId)];
      if (turn === 50) events.push({ type: "draw-warning", turnsRemaining: 10 });
      if (turn === 58) events.push({ type: "last-turn-warning", teamId: "purple" });
      if (turn === 59) events.push({ type: "last-turn-warning", teamId: "orange" });
      if (turn === 60) events.push({ type: "game-drawn" });
      return appliedAction(turn, events);
    });

    render(createElement(SessionEventsPanel, {
      actions,
      revision: 60,
    }));

    expect(getDisplayedEvents(actions)
      .filter(({ event }) => ["draw-warning", "last-turn-warning", "game-drawn"].includes(event.type))
      .map(({ event, sequence }) => ({ type: event.type, sequence })))
      .toEqual([
        { type: "game-drawn", sequence: "61.1" },
        { type: "last-turn-warning", sequence: "60.1" },
        { type: "last-turn-warning", sequence: "59.1" },
        { type: "draw-warning", sequence: "51.1" },
      ]);

    for (const message of [
      "10 turns left before game ends in draw!",
      "This is purple's last turn before the game ends in a draw!",
      "This is orange's last turn before the game ends in a draw!",
      "The game has ended in a draw.",
    ]) {
      expect(screen.getByText(message).closest("tr")).toBeInTheDocument();
    }
  });

  it("plays action-specific alerts for newly added actions", () => {
    const initialAction = appliedAction(1, [{
      type: "unit-moved",
      actorTeamId: "orange",
      entityId: "orange-soldier",
      unitTypeId: "soldier",
      start: { q: 0, r: 0 },
      end: { q: 0, r: 1 },
    }], {
      type: "move",
      actorId: "orange-soldier",
      destination: { q: 0, r: 1 },
    });
    const moveAction = appliedAction(2, [{
      type: "unit-moved",
      actorTeamId: "orange",
      entityId: "orange-soldier",
      unitTypeId: "soldier",
      start: { q: 0, r: 1 },
      end: { q: 0, r: 2 },
    }], {
      type: "move",
      actorId: "orange-soldier",
      destination: { q: 0, r: 2 },
    });
    const automaticEndTurnAction = appliedAction(3, [
      {
        type: "unit-moved",
        actorTeamId: "purple",
        entityId: "purple-soldier",
        unitTypeId: "soldier",
        start: { q: 1, r: 0 },
        end: { q: 1, r: 1 },
      },
      turnEnded("purple", "orange"),
    ], {
      type: "move",
      actorId: "purple-soldier",
      destination: { q: 1, r: 1 },
    });
    const playAlert = vi.fn();
    const view = render(createElement(SessionEventsPanel, {
      actions: [initialAction],
      playAlert,
      revision: 1,
    }));

    expect(playAlert).not.toHaveBeenCalled();

    view.rerender(createElement(SessionEventsPanel, {
      actions: [initialAction, moveAction],
      playAlert,
      revision: 2,
    }));

    expect(playAlert).toHaveBeenLastCalledWith("action");

    view.rerender(createElement(SessionEventsPanel, {
      actions: [initialAction, moveAction, automaticEndTurnAction],
      playAlert,
      revision: 3,
    }));

    expect(playAlert).toHaveBeenLastCalledWith("end-turn");
    expect(playAlert).toHaveBeenCalledTimes(2);
  });

  it("does not alert when restored history arrives after mount", () => {
    const restoredAction = appliedAction(4, [turnEnded("orange", "purple")]);
    const playAlert = vi.fn();
    const view = render(createElement(SessionEventsPanel, {
      actions: [],
      playAlert,
      revision: 4,
    }));

    view.rerender(createElement(SessionEventsPanel, {
      actions: [restoredAction],
      playAlert,
      revision: 4,
    }));

    expect(playAlert).not.toHaveBeenCalled();
  });
});
