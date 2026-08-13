import type { DomainEvent } from "@TBS/common";
import { formatDomainEvent } from "./formatDomainEvent";

describe("formatDomainEvent", () => {
  it("renders combat damage, deaths, teams, units, and coordinates as a sentence", () => {
    const event: DomainEvent = {
      actorTeam: "purple",
      type: "attack",
      start: { x: 1, y: 2 },
      end: { x: 1, y: 3 },
      defender: { x: 2, y: 3 },
      unit: "soldier",
      defendingUnit: "studentAthlete",
      attackDamage: 24,
      defenseDamage: 7,
      deaths: [{ x: 2, y: 3 }],
    };

    expect(formatDomainEvent(event)).toBe(
      "Purple soldier moved from 1,2 to 1,3 and attacked Orange student athlete at 2,3, dealing 24 damage and receiving 7 counterattack damage. The Orange student athlete was destroyed."
    );
  });

  it("renders turn income as a readable sentence", () => {
    expect(formatDomainEvent({
      actorTeam: "orange",
      type: "endTurn",
      nextTeam: "purple",
      income: 125,
      money: { orange: 500, purple: 625 },
    })).toBe("Orange ended their turn. Purple gained $125 income.");
  });

  it("describes projectile targeting and damage", () => {
    expect(formatDomainEvent({
      actorTeam: "purple",
      type: "move",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      unit: "soldier",
      consumedObject: "missile",
      objectTarget: { x: 2, y: 2 },
      objectDamage: [{ cell: { x: 2, y: 2 }, damage: 50, unit: "soldier", killed: true }],
    })).toContain("launched a missile at 2,2. It damaged 1 unit and destroyed 1.");
  });
});
