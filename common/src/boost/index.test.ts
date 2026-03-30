declare const require: any;
export {};

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  canReceiveBoost,
  canUnitBoost,
  getBoostableCellIndexes,
} = require("./index");

const createCell = ({
  boosted = false,
  index,
  neighbors = [],
  team = "orange",
  unit = "none",
}: {
  boosted?: boolean;
  index: number;
  neighbors?: number[];
  team?: string;
  unit?: string;
}) => ({
  boosted,
  column: index,
  damage: undefined,
  index,
  neighbors,
  row: 0,
  team,
  terrain: "plains",
  unit,
});

test("only designated units can boost", () => {
  assert.equal(canUnitBoost("bluesMusician"), true);
  assert.equal(canUnitBoost("soldier"), false);
});

test("boost target categories match the feature rules", () => {
  assert.equal(canReceiveBoost("bluesMusician", "scientist"), true);
  assert.equal(canReceiveBoost("zookeeper", "lion"), true);
  assert.equal(canReceiveBoost("scientist", "capital"), true);
  assert.equal(canReceiveBoost("scientist", "soldier"), false);
});

test("getBoostableCellIndexes returns adjacent allied eligible unboosted targets", () => {
  const actor = createCell({ index: 1, neighbors: [2, 3, 4, 5], unit: "bluesMusician" });
  const validTarget = createCell({ index: 2, team: "orange", unit: "scientist" });
  const enemyTarget = createCell({ index: 3, team: "purple", unit: "soldier" });
  const invalidCategory = createCell({ index: 4, team: "orange", unit: "lion" });
  const alreadyBoosted = createCell({ boosted: true, index: 5, team: "orange", unit: "soldier" });

  const map = [[actor, validTarget, enemyTarget, invalidCategory, alreadyBoosted]];

  assert.deepEqual(getBoostableCellIndexes(map, actor, "orange"), [2]);
});
