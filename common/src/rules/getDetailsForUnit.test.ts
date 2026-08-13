import * as assert from "node:assert/strict";
import { test } from "node:test";
import {
  getActionDetailsForUnit,
  getActionDetailsText,
  getActionsForUnit,
} from "./getDetailsForUnit";

test("getActionsForUnit preserves supported special actions", () => {
  assert.deepEqual(getActionsForUnit("doctor"), ["move", "attack", "load", "heal"]);
  assert.deepEqual(getActionsForUnit("scientist"), ["move", "attack", "load", "boost"]);
});

test("getActionDetailsText appends valid boost targets for supporting units", () => {
  assert.match(
    getActionDetailsText("boost", "scientist"),
    /Valid targets: adjacent allied buildings that are not already boosted\./
  );
});

test("getActionDetailsText appends valid heal targets for supporting units", () => {
  assert.match(
    getActionDetailsText("heal", "worker"),
    /Valid targets: adjacent allied damaged ground vehicles\./
  );
});

test("getActionDetailsForUnit leaves unrelated actions unchanged", () => {
  const details = getActionDetailsForUnit("soldier");

  assert.equal(
    details.attack,
    "Initiate combat with an adjacent unit, dealing damage first. If enemy is not killed, it will deal retaliatory damage."
  );
});
