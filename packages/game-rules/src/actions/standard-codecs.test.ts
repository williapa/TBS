import { describe, expect, it } from "vitest";

import { parseStandardAction } from "./parse-standard-action";
import { parseStandardEvent } from "./parse-standard-event";

const position = { q: 0, r: 0 };
const destination = { q: 1, r: 0 };

describe("standard action and event codecs", () => {
  it("parses every standard action discriminant", () => {
    const actions = [
      { type: "move", actorId: "actor", destination },
      { type: "attack", actorId: "actor", destination, defenderId: "target" },
      { type: "boost", actorId: "actor", destination, targetId: "target" },
      { type: "heal", actorId: "actor", destination, targetId: "target" },
      {
        type: "construct",
        actorId: "actor",
        destination,
        constructionPosition: position,
        buildingEntityId: "building",
        buildingUnitTypeId: "house",
      },
      { type: "spawn", actorId: "actor", destination, spawnedEntityId: "spawned", unitTypeId: "soldier" },
      { type: "load", actorId: "actor", destination, vehicleId: "vehicle" },
      { type: "unload", actorId: "vehicle", destination, unloadPosition: position },
      { type: "end-turn" },
    ] as const;

    expect(actions.map((action) => parseStandardAction(action).type)).toEqual(actions.map(({ type }) => type));
    expect(() => parseStandardAction({ type: "unsupported-move" })).toThrow("Unsupported standard action");
  });

  it("parses every standard event discriminant and rejects malformed payloads", () => {
    const movement = { actorTeamId: "orange", start: position, end: destination };
    const events = [
      { type: "unit-moved", ...movement, entityId: "actor", unitTypeId: "soldier" },
      { type: "turn-ended", actorTeamId: "orange", nextTeamId: "purple", income: 100, money: { orange: 0, purple: 100 } },
      { type: "unit-boosted", ...movement, actorId: "actor", targetId: "target" },
      { type: "unit-healed", ...movement, actorId: "actor", targetId: "target", amount: 10 },
      {
        type: "unit-constructed",
        ...movement,
        actorId: "actor",
        entityId: "building",
        unitTypeId: "house",
        position,
        cost: 700,
      },
      {
        type: "unit-spawned",
        actorTeamId: "orange",
        buildingId: "building",
        entityId: "spawned",
        unitTypeId: "soldier",
        position,
        cost: 200,
      },
      {
        type: "unit-attacked",
        ...movement,
        attackerId: "actor",
        defenderId: "target",
        attackerUnitTypeId: "soldier",
        defenderUnitTypeId: "soldier",
        defenderPosition: destination,
        attackDamage: 15,
        counterattackDamage: 10,
        deaths: [],
      },
      { type: "unit-loaded", ...movement, entityId: "actor", vehicleId: "vehicle" },
      { type: "unit-unloaded", ...movement, entityId: "actor", vehicleId: "vehicle", unloadPosition: destination },
      { type: "game-over", winnerTeamId: "orange" },
    ] as const;

    expect(events.map((event) => parseStandardEvent(event).type)).toEqual(events.map(({ type }) => type));
    expect(() => parseStandardEvent({ type: "unit-moved", actorTeamId: "", entityId: "actor" })).toThrow();
    expect(() => parseStandardEvent({ type: "unsupported-event" })).toThrow();
  });
});
