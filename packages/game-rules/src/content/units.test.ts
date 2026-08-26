import { unitTypeId } from "@TBS/game-core";
import { describe, expect, it } from "vitest";

import { getSpawnableUnitTypeIds } from "./production";
import { getUnitDefinition, getUnitsByCategory, standardUnits } from "./units";

describe("standard unit registry", () => {
  it("contains every existing concrete unit exactly once", () => {
    expect(standardUnits.size).toBe(36);
    expect(getUnitsByCategory("animal").map(({ id }) => id)).toEqual(["dragon", "lion"]);
    expect(getUnitsByCategory("building")).toHaveLength(11);
    expect(getUnitsByCategory("object").map(({ id }) => id)).toEqual(["missile", "money", "nuke"]);
    expect(getUnitsByCategory("person")).toHaveLength(14);
    expect(getUnitsByCategory("vehicle")).toHaveLength(6);
  });

  it("keeps rule metadata joined under one content identifier", () => {
    expect(getUnitDefinition(unitTypeId("soldier"))).toMatchObject({
      base: { maximumHealth: 100, movement: 2, attack: 30, defense: 15 },
      capabilities: expect.arrayContaining(["move", "attack", "collect-object", "loadable"]),
      tags: expect.arrayContaining(["ground", "living", "person"]),
    });
    expect(getUnitDefinition(unitTypeId("bank"))?.income).toBe(1000);
  });

  it("derives the unique spawnable catalog from production content", () => {
    const spawnableIds = getSpawnableUnitTypeIds();

    expect(spawnableIds).toHaveLength(22);
    expect(new Set(spawnableIds).size).toBe(spawnableIds.length);
    expect(spawnableIds).toContain("dragon");
    expect(spawnableIds).toContain("worker");
  });
});
