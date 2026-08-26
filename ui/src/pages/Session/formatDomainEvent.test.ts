import {
  currentStandardProtocolCodec,
  CURRENT_PROTOCOL_VERSION,
  type StandardAppliedAction,
} from "@TBS/application";

import { formatDomainEvent } from "./formatDomainEvent";

const parseEvent = (value: unknown): StandardAppliedAction["events"][number] => {
  const parsed = currentStandardProtocolCodec.parseAppliedAction({
    protocolVersion: CURRENT_PROTOCOL_VERSION,
    actionId: "42000000-0000-4000-8000-000000000001",
    revision: 1,
    actorTeamId: "purple",
    action: { type: "end-turn" },
    events: [value],
  });
  const event = parsed.events[0];
  if (!event) throw new Error("expected one event");
  return event;
};

describe("formatDomainEvent", () => {
  it("renders canonical combat damage, deaths, units, and axial coordinates", () => {
    const event = parseEvent({
      type: "unit-attacked",
      actorTeamId: "purple",
      attackerId: "attacker",
      defenderId: "defender",
      attackerUnitTypeId: "soldier",
      defenderUnitTypeId: "studentAthlete",
      start: { q: 1, r: 2 },
      end: { q: 1, r: 3 },
      defenderPosition: { q: 2, r: 3 },
      attackDamage: 24,
      counterattackDamage: 7,
      deaths: ["defender"],
    });

    expect(formatDomainEvent(event)).toBe(
      "Purple soldier moved from 1,2 to 1,3 and attacked student athlete at 2,3, dealing 24 damage and receiving 7 counterattack damage. The defender was destroyed.",
    );
  });

  it("renders turn income as a readable sentence", () => {
    expect(formatDomainEvent(parseEvent({
      type: "turn-ended",
      actorTeamId: "orange",
      nextTeamId: "purple",
      income: 125,
      money: { orange: 500, purple: 625 },
    }))).toBe("Orange ended their turn. Purple gained $125 income.");
  });

  it("describes projectile targeting and damage", () => {
    expect(formatDomainEvent(parseEvent({
      type: "unit-moved",
      actorTeamId: "purple",
      entityId: "actor",
      unitTypeId: "soldier",
      start: { q: 0, r: 0 },
      end: { q: 0, r: 1 },
      consumedObjectTypeId: "missile",
      objectTarget: { q: 2, r: 2 },
      objectDamage: [{
        entityId: "target",
        position: { q: 2, r: 2 },
        unitTypeId: "soldier",
        damage: 50,
        killed: true,
      }],
    }))).toContain("launched a missile at 2,2. It damaged 1 unit and destroyed 1.");
  });
});
