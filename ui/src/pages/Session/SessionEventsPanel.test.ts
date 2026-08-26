import {
  currentStandardProtocolCodec,
  CURRENT_PROTOCOL_VERSION,
  type StandardAppliedAction,
} from "@TBS/application";

import { getDisplayedEvents } from "./SessionEventsPanel";

const appliedAction = (
  revision: number,
  events: readonly unknown[],
): StandardAppliedAction => currentStandardProtocolCodec.parseAppliedAction({
  protocolVersion: CURRENT_PROTOCOL_VERSION,
  actionId: `42000000-0000-4000-8000-${revision.toString().padStart(12, "0")}`,
  revision,
  actorTeamId: revision === 3 ? "purple" : "orange",
  action: { type: "end-turn" },
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
