import * as assert from "node:assert/strict";
import { test } from "node:test";
import calculateDamage from "./calculateDamage";
import getEffectiveCombatStats from "./getEffectiveCombatStats";
import type { MapItem, UnitOption } from "../types";

const createMapItem = (unit: UnitOption, damage = 0, boosted = false): MapItem => ({
  boosted,
  row: 0,
  column: 0,
  damage,
  index: 0,
  terrain: "plains",
  unit,
  team: "orange"
});

test("studentAthlete gets the michaelJackson combat bonus", () => {
  assert.deepEqual(
    getEffectiveCombatStats(createMapItem("studentAthlete"), createMapItem("michaelJackson")),
    [100, 100]
  );
});

test("studentAthlete gets reduced defense against each vehicle type", () => {
  const vehicleUnits: readonly UnitOption[] = ["airplane", "ambulance", "bigTruck", "helicopter", "sub", "truck"];

  for (const unit of vehicleUnits) {
    assert.deepEqual(
      getEffectiveCombatStats(createMapItem("studentAthlete"), createMapItem(unit)),
      [10, 0]
    );
  }
});

test("studentAthlete keeps base stats against unrelated units", () => {
  assert.deepEqual(
    getEffectiveCombatStats(createMapItem("studentAthlete"), createMapItem("soldier")),
    [10, 10]
  );
});

test("boosted units get +10/+10 when no special combat bonus applies", () => {
  assert.deepEqual(
    getEffectiveCombatStats(createMapItem("soldier", 0, true), createMapItem("leader")),
    [40, 25]
  );
});

test("zuckerbird gets its capital combat bonus", () => {
  assert.deepEqual(
    getEffectiveCombatStats(createMapItem("zuckerbird"), createMapItem("capital")),
    [160, 8]
  );
});

test("zuckerbird gets its dragon combat bonus", () => {
  assert.deepEqual(
    getEffectiveCombatStats(createMapItem("zuckerbird"), createMapItem("dragon")),
    [8, 100]
  );
});

test("zuckerbird keeps base stats against unrelated units", () => {
  assert.deepEqual(
    getEffectiveCombatStats(createMapItem("zuckerbird"), createMapItem("leader")),
    [8, 8]
  );
});

test("special combat bonus overrides boost", () => {
  assert.deepEqual(
    getEffectiveCombatStats(createMapItem("studentAthlete", 0, true), createMapItem("michaelJackson")),
    [100, 100]
  );
});

test("boost still applies to the opposing unit when only one unit has a matchup bonus", () => {
  assert.deepEqual(
    getEffectiveCombatStats(createMapItem("soldier", 0, true), createMapItem("studentAthlete")),
    [40, 25]
  );
});

test("calculateDamage uses matchup-aware stats for reversed combat roles", () => {
  assert.equal(calculateDamage(createMapItem("studentAthlete"), createMapItem("truck")), 0);
  assert.equal(calculateDamage(createMapItem("truck"), createMapItem("studentAthlete")), 20);
});

test("calculateDamage is deterministic for identical combat inputs", () => {
  const attacker = createMapItem("soldier", 25, true);
  const defender = createMapItem("leader", 40);
  const results = Array.from({ length: 20 }, () => calculateDamage(attacker, defender));

  assert.deepEqual(results, Array(20).fill(9));
});
