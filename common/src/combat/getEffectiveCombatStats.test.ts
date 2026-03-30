declare const require: any;

const test = require("node:test");
const assert = require("node:assert/strict");

const getEffectiveCombatStats = require("./getEffectiveCombatStats").default;
const calculateDamage = require("./calculateDamage").default;

const createMapItem = (unit: string, damage = 0) => ({
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
  const vehicleUnits = ["airplane", "ambulance", "bigTruck", "helicopter", "sub", "truck"];

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

test("zuckerbird gets its capital combat bonus", () => {
  assert.deepEqual(
    getEffectiveCombatStats(createMapItem("zuckerbird"), createMapItem("capital")),
    [100, 8]
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

test("calculateDamage uses matchup-aware stats for reversed combat roles", () => {
  const originalRandom = Math.random;

  Math.random = () => 0.9;

  try {
    assert.equal(calculateDamage(createMapItem("studentAthlete"), createMapItem("truck")), 0);
    assert.equal(calculateDamage(createMapItem("truck"), createMapItem("studentAthlete")), 21);
  } finally {
    Math.random = originalRandom;
  }
});
