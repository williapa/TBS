declare const require: any;
export {};

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  canReceiveHeal,
  canUnitHeal,
  getHealableCellIndexes,
} = require("./index");

const createCell = ({
  damage = undefined,
  index,
  neighbors = [],
  team = "orange",
  unit = "none",
}: {
  damage?: number;
  index: number;
  neighbors?: number[];
  team?: string;
  unit?: string;
}) => ({
  column: index,
  damage,
  index,
  neighbors,
  row: 0,
  team,
  terrain: "plains",
  unit,
});

test("only designated units can heal", () => {
  assert.equal(canUnitHeal("doctor"), true);
  assert.equal(canUnitHeal("soldier"), false);
});

test("heal target categories match the feature rules", () => {
  assert.equal(canReceiveHeal("doctor", "scientist"), true);
  assert.equal(canReceiveHeal("ambulance", "soldier"), true);
  assert.equal(canReceiveHeal("engineer", "capital"), true);
  assert.equal(canReceiveHeal("pilot", "airplane"), true);
  assert.equal(canReceiveHeal("worker", "truck"), true);
  assert.equal(canReceiveHeal("worker", "helicopter"), false);
});

test("getHealableCellIndexes returns adjacent allied eligible damaged targets", () => {
  const actor = createCell({ index: 1, neighbors: [2, 3, 4, 5, 6], unit: "doctor" });
  const validTarget = createCell({ damage: 20, index: 2, team: "orange", unit: "scientist" });
  const enemyTarget = createCell({ damage: 20, index: 3, team: "purple", unit: "soldier" });
  const invalidCategory = createCell({ damage: 20, index: 4, team: "orange", unit: "lion" });
  const fullHealthTarget = createCell({ damage: 0, index: 5, team: "orange", unit: "soldier" });
  const emptyCell = createCell({ damage: 20, index: 6, team: "orange", unit: "none" });

  const map = [[actor, validTarget, enemyTarget, invalidCategory, fullHealthTarget, emptyCell]];

  assert.deepEqual(getHealableCellIndexes(map, actor, "orange"), [2]);
});
