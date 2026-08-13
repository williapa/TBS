import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { createActiveGameSnapshot } from "../contracts/fixtures";
import applyGameAction from "./applyGameActionCompatibility";
import {
  createV1ReplayState,
  V1_REPLAY_EVENTS,
  V1_REPLAY_SHA256,
  V1_REPLAY_STEPS,
} from "./v1ReplayFixture";

const movementState = (destinationUnit: "none" | "money" | "soldier" = "none") => {
  const state = createActiveGameSnapshot().state;
  state.map = [
    [
      { row: 0, column: 0, index: 0, neighbors: [1], terrain: "plains", unit: destinationUnit, team: destinationUnit === "soldier" ? "orange" : "gray" },
      { row: 0, column: 1, index: 1, neighbors: [0], terrain: "plains", unit: "soldier", team: "purple" },
    ],
    [
      { row: 1, column: 0, index: 2, neighbors: [], terrain: "plains", unit: "soldier", team: "orange" },
      { row: 1, column: 1, index: 3, neighbors: [], terrain: "plains", unit: "soldier", team: "purple" },
      { row: 1, column: 2, index: 4, neighbors: [], terrain: "plains", unit: "none", team: "gray" },
    ],
  ];
  return state;
};

const rejectionMessage = (result: ReturnType<typeof applyGameAction>) => {
  assert.equal(result.ok, false);
  return "message" in result ? result.message : "";
};

const projectileState = (object: "missile" | "nuke") => {
  const state = createActiveGameSnapshot().state;
  state.map = [
    [
      { row: 0, column: 0, index: 0, neighbors: [1, 2], terrain: "plains", unit: "soldier", team: "purple" },
      { row: 0, column: 1, index: 1, neighbors: [0, 2, 3], terrain: "plains", unit: object, team: "gray" },
    ],
    [
      { row: 1, column: 0, index: 2, neighbors: [0, 1, 3, 5], terrain: "plains", unit: "soldier", team: "orange" },
      { row: 1, column: 1, index: 3, neighbors: [1, 2, 4, 5, 6], terrain: "plains", unit: "soldier", team: "orange" },
      { row: 1, column: 2, index: 4, neighbors: [3, 6], terrain: "plains", unit: "soldier", team: "orange" },
    ],
    [
      { row: 2, column: 0, index: 5, neighbors: [2, 3, 6], terrain: "plains", unit: "none", team: "gray" },
      { row: 2, column: 1, index: 6, neighbors: [3, 4, 5], terrain: "plains", unit: "none", team: "gray" },
    ],
  ];
  return state;
};

const attackState = () => {
  const state = projectileState("missile");
  state.map[0][1] = { ...state.map[0][1], unit: "none" };
  state.map[1][0] = { ...state.map[1][0], unit: "none", team: "gray" };
  state.map[1][2] = { ...state.map[1][2], unit: "none", team: "gray" };
  state.map[2][0] = { ...state.map[2][0], unit: "soldier", team: "purple" };
  return state;
};

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, canonicalize(record[key])]));
  }
  return value;
};

test("manual end returns a new state and provider-neutral end-turn event", () => {
  const state = createActiveGameSnapshot().state;
  state.map[0][1].moved = true;
  state.map[0][1].loadedUnit = {
    moved: true,
    team: "purple",
    unit: "soldier",
  };
  const original = JSON.stringify(state);
  deepFreeze(state);

  const result = applyGameAction(state, "purple", { action: "end" });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.notEqual(result.state, state);
    assert.equal(result.state.revision, state.revision + 1);
    assert.equal(result.state.activeTeam, "orange");
    assert.equal(result.state.map[0][1].moved, undefined);
    assert.equal(result.state.map[0][1].loadedUnit?.moved, undefined);
    assert.deepEqual(result.events, [{
      type: "endTurn",
      actorTeam: "purple",
      nextTeam: "orange",
      income: 0,
      money: { orange: 2_000, purple: 2_000 },
    }]);
  }
  assert.equal(JSON.stringify(state), original);
});

test("wrong-team and finished-game calls return typed errors", () => {
  const active = createActiveGameSnapshot().state;
  assert.deepEqual(applyGameAction(active, "orange", { action: "end" }), {
    ok: false,
    code: "wrong-team",
    message: "it is not this team's turn",
  });

  const finished = { ...active, status: "finished" as const, activeTeam: undefined, winner: "purple" as const };
  assert.deepEqual(applyGameAction(finished, "purple", { action: "end" }), {
    ok: false,
    code: "finished-game",
    message: "the game has already finished",
  });
});

test("waiting games and unsupported actions are rejected without mutation", () => {
  const waiting = { ...createActiveGameSnapshot().state, status: "waiting" as const, activeTeam: undefined };
  assert.equal(applyGameAction(waiting, "purple", { action: "end" }).ok, false);

  const active = createActiveGameSnapshot().state;
  const result = applyGameAction(active, "purple", { action: "teleport" } as unknown as Parameters<typeof applyGameAction>[2]);
  assert.deepEqual(result, {
    ok: false,
    code: "unsupported-action",
    message: "the action type is not supported",
  });
});

test("ordinary movement is legal, immutable, and marks the moved unit", () => {
  const state = movementState();
  const original = JSON.stringify(state);
  deepFreeze(state);

  const result = applyGameAction(state, "purple", {
    action: "move",
    start: { x: 0, y: 1 },
    end: { x: 0, y: 0 },
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.map[0][0].unit, "soldier");
    assert.equal(result.state.map[0][0].team, "purple");
    assert.equal(result.state.map[0][0].moved, true);
    assert.equal(result.state.map[0][1].unit, "none");
    assert.equal(result.state.revision, state.revision + 1);
    assert.deepEqual(result.events, [{
      type: "move",
      actorTeam: "purple",
      start: { x: 0, y: 1 },
      end: { x: 0, y: 0 },
      unit: "soldier",
    }]);
  }
  assert.equal(JSON.stringify(state), original);
});

test("ordinary movement consumes money and updates reducer state and event output", () => {
  const state = movementState("money");
  const result = applyGameAction(state, "purple", {
    action: "move",
    start: { x: 0, y: 1 },
    end: { x: 0, y: 0 },
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.money.purple, 3_000);
    assert.equal(result.events[0].type, "move");
    assert.equal(result.events[0].type === "move" && result.events[0].consumedObject, "money");
    assert.equal(result.events[0].type === "move" && result.events[0].moneyAward, 1_000);
  }
});

test("ordinary movement rejects ownership, occupancy, moved, range, and projectile cases", () => {
  const action = { action: "move" as const, start: { x: 0, y: 1 }, end: { x: 0, y: 0 } };
  const occupied = applyGameAction(movementState("soldier"), "purple", action);
  assert.equal(rejectionMessage(occupied), "destination must be an empty space");

  const wrongOwner = movementState();
  wrongOwner.map[0][1].team = "orange";
  const ownership = applyGameAction(wrongOwner, "purple", action);
  assert.equal(rejectionMessage(ownership), "that is not the acting team's piece");

  const moved = movementState();
  moved.map[0][1].moved = true;
  const alreadyMoved = applyGameAction(moved, "purple", action);
  assert.equal(rejectionMessage(alreadyMoved), "that piece has already acted");

  const outOfRange = movementState();
  outOfRange.map[0][1].neighbors = [];
  const range = applyGameAction(outOfRange, "purple", action);
  assert.equal(rejectionMessage(range), "destination must be in range");

});

test("missile movement damages the selected enemy and reports deterministic damage", () => {
  const state = projectileState("missile");
  const original = JSON.stringify(state);
  deepFreeze(state);
  const result = applyGameAction(state, "purple", {
    action: "move",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    objectTarget: { x: 1, y: 1 },
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.map[1][1].damage, 30);
    assert.equal(result.events[0].type, "move");
    assert.deepEqual(result.events[0].type === "move" && result.events[0].objectDamage, [
      { cell: { x: 1, y: 1 }, damage: 30, killed: false, unit: "soldier" },
    ]);
  }
  assert.equal(JSON.stringify(state), original);
});

test("nuke movement applies target and splash damage and records deaths", () => {
  const state = projectileState("nuke");
  state.map[1][0].damage = 80;
  const result = applyGameAction(state, "purple", {
    action: "move",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    objectTarget: { x: 1, y: 1 },
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.map[1][1].damage, 50);
    assert.equal(result.state.map[1][0].unit, "none");
    assert.equal(result.state.map[1][2].damage, 25);
    const damage = result.events[0].type === "move" ? result.events[0].objectDamage ?? [] : [];
    assert.equal(damage.some((item) => item.killed && item.cell.x === 1 && item.cell.y === 0), true);
  }
});

test("a defending priest prevents all projectile damage", () => {
  const state = projectileState("nuke");
  state.map[2][0] = { ...state.map[2][0], unit: "priest", team: "orange" };
  const result = applyGameAction(state, "purple", {
    action: "move",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    objectTarget: { x: 1, y: 1 },
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.map[1][1].damage, undefined);
    assert.equal(result.events[0].type === "move" && result.events[0].objectPreventedByPriest, true);
    assert.deepEqual(result.events[0].type === "move" && result.events[0].objectDamage, []);
  }
});

test("projectiles reject missing, nonexistent, friendly, and empty targets", () => {
  const baseAction = { action: "move" as const, start: { x: 0, y: 0 }, end: { x: 0, y: 1 } };
  assert.equal(rejectionMessage(applyGameAction(projectileState("missile"), "purple", baseAction)), "projectile object target is required");
  assert.equal(rejectionMessage(applyGameAction(projectileState("missile"), "purple", { ...baseAction, objectTarget: { x: 9, y: 9 } })), "projectile target does not exist");

  const friendly = projectileState("missile");
  friendly.map[1][1].team = "purple";
  assert.equal(rejectionMessage(applyGameAction(friendly, "purple", { ...baseAction, objectTarget: { x: 1, y: 1 } })), "projectile target must be an enemy unit");

  const empty = projectileState("missile");
  empty.map[1][1] = { ...empty.map[1][1], unit: "none", team: "gray" };
  assert.equal(rejectionMessage(applyGameAction(empty, "purple", { ...baseAction, objectTarget: { x: 1, y: 1 } })), "projectile target must be an enemy unit");
});

test("attack from the current cell applies deterministic strike and counterattack damage", () => {
  const state = attackState();
  state.map[0][0].neighbors = [1, 2];
  state.map[1][0] = { ...state.map[1][0], unit: "soldier", team: "orange" };
  const original = JSON.stringify(state);
  deepFreeze(state);
  const result = applyGameAction(state, "purple", {
    action: "attack",
    attacker: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    defender: { x: 1, y: 0 },
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.map[1][0].damage, 15);
    assert.equal(result.state.map[0][0].damage, 10);
    assert.equal(result.state.map[0][0].moved, true);
    assert.equal(result.events[0].type, "attack");
    if (result.events[0].type === "attack") {
      assert.equal(result.events[0].attackDamage, 15);
      assert.equal(result.events[0].defenseDamage, 10);
      assert.deepEqual(result.events[0].deaths, []);
    }
  }
  assert.equal(JSON.stringify(state), original);
});

test("attack supports legal movement before combat", () => {
  const state = attackState();
  const result = applyGameAction(state, "purple", {
    action: "attack",
    attacker: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    defender: { x: 1, y: 1 },
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.map[0][0].unit, "none");
    assert.equal(result.state.map[0][1].unit, "soldier");
    assert.equal(result.state.map[1][1].damage, 15);
  }
});

test("a defender killed by the first strike does not counterattack", () => {
  const state = attackState();
  state.map[1][1].damage = 90;
  const result = applyGameAction(state, "purple", {
    action: "attack",
    attacker: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    defender: { x: 1, y: 1 },
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.map[1][1].unit, "none");
    assert.equal(result.state.map[0][1].damage, undefined);
    assert.equal(result.events[0].type === "attack" && result.events[0].defenseDamage, 0);
    assert.deepEqual(result.events[0].type === "attack" && result.events[0].deaths, [{ x: 1, y: 1 }]);
  }
});

test("attacks reject illegal movement, friendly defenders, and out-of-range targets", () => {
  const action = { action: "attack" as const, attacker: { x: 0, y: 0 }, end: { x: 0, y: 1 }, defender: { x: 1, y: 1 } };
  const blocked = attackState();
  blocked.map[0][1] = { ...blocked.map[0][1], unit: "soldier", team: "purple" };
  assert.equal(rejectionMessage(applyGameAction(blocked, "purple", action)), "attack destination must be empty");

  const far = attackState();
  far.map[0][0].neighbors = [];
  assert.equal(rejectionMessage(applyGameAction(far, "purple", action)), "attack destination must be in movement range");

  const friendly = attackState();
  friendly.map[1][1].team = "purple";
  assert.equal(rejectionMessage(applyGameAction(friendly, "purple", action)), "attacker is not in range of an enemy unit");

  const outOfRange = attackState();
  outOfRange.map[0][1].neighbors = [];
  assert.equal(rejectionMessage(applyGameAction(outOfRange, "purple", action)), "attacker is not in range of an enemy unit");
});

test("boost moves before acting, consumes money, and boosts an eligible target", () => {
  const state = projectileState("missile");
  state.map[0][0] = { ...state.map[0][0], unit: "bluesMusician" };
  state.map[0][1] = { ...state.map[0][1], unit: "money" };
  state.map[1][1] = { ...state.map[1][1], team: "purple" };
  const original = JSON.stringify(state);
  deepFreeze(state);
  const result = applyGameAction(state, "purple", { action: "boost", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, target: { x: 1, y: 1 } });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.map[0][1].moved, true);
    assert.equal(result.state.map[1][1].boosted, true);
    assert.equal(result.state.money.purple, 3_000);
    assert.equal(result.events[0].type, "boost");
  }
  assert.equal(JSON.stringify(state), original);
});

test("boost rejects an incapable actor and an illegal target", () => {
  const incapable = projectileState("missile");
  assert.equal(rejectionMessage(applyGameAction(incapable, "purple", { action: "boost", start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, target: { x: 0, y: 1 } })), "that piece cannot boost other units");
  const invalid = projectileState("missile");
  invalid.map[0][0] = { ...invalid.map[0][0], unit: "bluesMusician" };
  assert.equal(rejectionMessage(applyGameAction(invalid, "purple", { action: "boost", start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, target: { x: 0, y: 1 } })), "boost target must be a friendly unit");
});

test("heal moves before acting and caps healing at the target's damage", () => {
  const state = projectileState("missile");
  state.map[0][0] = { ...state.map[0][0], unit: "doctor" };
  state.map[0][1] = { ...state.map[0][1], unit: "none" };
  state.map[1][1] = { ...state.map[1][1], team: "purple", damage: 10 };
  const original = JSON.stringify(state);
  deepFreeze(state);
  const result = applyGameAction(state, "purple", { action: "heal", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, target: { x: 1, y: 1 } });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.map[1][1].damage, undefined);
    assert.equal(result.events[0].type === "heal" && result.events[0].healedDamage, 10);
  }
  assert.equal(JSON.stringify(state), original);
});

test("heal rejects an incapable actor, an illegal target, and an undamaged target", () => {
  const incapable = projectileState("missile");
  assert.equal(rejectionMessage(applyGameAction(incapable, "purple", { action: "heal", start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, target: { x: 0, y: 1 } })), "that piece cannot heal other units");
  const enemy = projectileState("missile");
  enemy.map[0][0] = { ...enemy.map[0][0], unit: "doctor" };
  assert.equal(rejectionMessage(applyGameAction(enemy, "purple", { action: "heal", start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, target: { x: 0, y: 1 } })), "heal target must be a friendly unit");
  const undamaged = projectileState("missile");
  undamaged.map[0][0] = { ...undamaged.map[0][0], unit: "doctor" };
  undamaged.map[0][1] = { ...undamaged.map[0][1], unit: "soldier", team: "purple" };
  assert.equal(rejectionMessage(applyGameAction(undamaged, "purple", { action: "heal", start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, target: { x: 0, y: 1 } })), "heal target must be damaged");
});

test("spawn creates a moved unit and deducts the configured cost", () => {
  const state = projectileState("missile");
  state.map[0][0] = { ...state.map[0][0], unit: "capital" };
  state.map[0][1] = { ...state.map[0][1], unit: "none" };
  state.map[2][0] = { ...state.map[2][0], unit: "soldier", team: "purple" };
  const original = JSON.stringify(state);
  deepFreeze(state);
  const result = applyGameAction(state, "purple", { action: "spawn", building: { x: 0, y: 0 }, end: { x: 0, y: 1 }, unit: "soldier" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.map[0][1].unit, "soldier");
    assert.equal(result.state.map[0][1].moved, true);
    assert.equal(result.state.money.purple, 1_800);
    assert.equal(result.events[0].type === "spawn" && result.events[0].cost, 200);
  }
  assert.equal(JSON.stringify(state), original);
});

test("spawn rejects invalid building options, cells, and funds", () => {
  const invalid = projectileState("missile");
  assert.equal(rejectionMessage(applyGameAction(invalid, "purple", { action: "spawn", building: { x: 0, y: 0 }, end: { x: 0, y: 1 }, unit: "soldier" })), "that piece cannot spawn units");
  const funds = projectileState("missile");
  funds.map[0][0] = { ...funds.map[0][0], unit: "capital" };
  funds.map[0][1] = { ...funds.map[0][1], unit: "none" };
  funds.money.purple = 0;
  assert.equal(rejectionMessage(applyGameAction(funds, "purple", { action: "spawn", building: { x: 0, y: 0 }, end: { x: 0, y: 1 }, unit: "soldier" })), "that unit cannot be spawned with current funds");
  const water = projectileState("missile");
  water.map[0][0] = { ...water.map[0][0], unit: "capital" };
  water.map[0][1] = { ...water.map[0][1], unit: "none", terrain: "water" };
  assert.equal(rejectionMessage(applyGameAction(water, "purple", { action: "spawn", building: { x: 0, y: 0 }, end: { x: 0, y: 1 }, unit: "soldier" })), "spawn destination must be adjacent, empty, and valid terrain");
});

test("construction moves the worker, consumes money, builds, and deducts cost", () => {
  const state = projectileState("missile");
  state.map[0][0] = { ...state.map[0][0], unit: "constructionWorker" };
  state.map[0][1] = { ...state.map[0][1], unit: "money" };
  state.map[1][1] = { ...state.map[1][1], unit: "none", team: "gray" };
  state.map[2][0] = { ...state.map[2][0], unit: "soldier", team: "purple" };
  const original = JSON.stringify(state);
  deepFreeze(state);
  const result = applyGameAction(state, "purple", { action: "construct", worker: { x: 0, y: 0 }, end: { x: 0, y: 1 }, cell: { x: 1, y: 1 }, building: "office" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.map[1][1].unit, "office");
    assert.equal(result.state.map[0][1].moved, true);
    assert.equal(result.state.money.purple, 2_000);
    assert.equal(result.events[0].type, "construct");
  }
  assert.equal(JSON.stringify(state), original);
});

test("construction rejects invalid worker, building funds, and cell", () => {
  const invalid = projectileState("missile");
  assert.equal(rejectionMessage(applyGameAction(invalid, "purple", { action: "construct", worker: { x: 0, y: 0 }, end: { x: 0, y: 0 }, cell: { x: 0, y: 1 }, building: "office" })), "that piece cannot construct buildings");
  const funds = projectileState("missile");
  funds.map[0][0] = { ...funds.map[0][0], unit: "constructionWorker" };
  funds.money.purple = 0;
  assert.equal(rejectionMessage(applyGameAction(funds, "purple", { action: "construct", worker: { x: 0, y: 0 }, end: { x: 0, y: 0 }, cell: { x: 0, y: 1 }, building: "office" })), "that building cannot be constructed with current funds");
  const occupied = projectileState("missile");
  occupied.map[0][0] = { ...occupied.map[0][0], unit: "constructionWorker" };
  assert.equal(rejectionMessage(applyGameAction(occupied, "purple", { action: "construct", worker: { x: 0, y: 0 }, end: { x: 0, y: 0 }, cell: { x: 0, y: 1 }, building: "office" })), "construction cell must be adjacent, empty, and valid terrain");
});

test("load and unload round trip preserves transported unit fields", () => {
  const state = projectileState("missile");
  state.map[0][0] = { ...state.map[0][0], unit: "soldier", damage: 20, boosted: true };
  state.map[0][1] = { ...state.map[0][1], unit: "money" };
  state.map[1][1] = { ...state.map[1][1], unit: "truck", team: "purple" };
  const original = JSON.stringify(state);
  deepFreeze(state);
  const loaded = applyGameAction(state, "purple", { action: "load", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, vehicle: { x: 1, y: 1 } });
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  assert.deepEqual(loaded.state.map[1][1].loadedUnit, { damage: 20, boosted: true, moved: true, team: "purple", unit: "soldier" });
  assert.equal(loaded.state.money.purple, 3_000);
  const unloadState = { ...loaded.state, activeTeam: "purple" as const };
  unloadState.map[1][2] = { ...unloadState.map[1][2], unit: "none", team: "gray" };
  unloadState.map[1][1] = { ...unloadState.map[1][1], moved: undefined };
  deepFreeze(unloadState);
  const unloaded = applyGameAction(unloadState, "purple", { action: "unload", start: { x: 1, y: 1 }, end: { x: 1, y: 1 }, cell: { x: 1, y: 2 } });
  assert.equal(unloaded.ok, true);
  if (unloaded.ok) {
    assert.deepEqual({ damage: unloaded.state.map[1][2].damage, boosted: unloaded.state.map[1][2].boosted, moved: unloaded.state.map[1][2].moved, team: unloaded.state.map[1][2].team, unit: unloaded.state.map[1][2].unit }, { damage: 20, boosted: true, moved: undefined, team: "purple", unit: "soldier" });
    assert.equal(unloaded.state.map[1][1].loadedUnit, undefined);
  }
  assert.equal(JSON.stringify(state), original);
});

test("load rejects invalid units, vehicles, occupied cargo, and nonadjacent destinations", () => {
  const action = { action: "load" as const, start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, vehicle: { x: 0, y: 1 } };
  const invalidUnit = projectileState("missile");
  invalidUnit.map[0][0] = { ...invalidUnit.map[0][0], unit: "lion" };
  assert.equal(rejectionMessage(applyGameAction(invalidUnit, "purple", action)), "only people units can load into vehicles");
  const invalidVehicle = projectileState("missile");
  invalidVehicle.map[0][1] = { ...invalidVehicle.map[0][1], unit: "soldier", team: "purple" };
  assert.equal(rejectionMessage(applyGameAction(invalidVehicle, "purple", action)), "load destination must be a vehicle");
  const occupied = projectileState("missile");
  occupied.map[0][1] = { ...occupied.map[0][1], unit: "truck", team: "purple", loadedUnit: { team: "purple", unit: "worker" } };
  assert.equal(rejectionMessage(applyGameAction(occupied, "purple", action)), "that vehicle is already carrying a unit");
  const far = projectileState("missile");
  far.map[0][1] = { ...far.map[0][1], unit: "truck", team: "purple" };
  far.map[0][0].neighbors = [];
  assert.equal(rejectionMessage(applyGameAction(far, "purple", action)), "vehicle must be adjacent to loading unit");
});

test("unload rejects invalid vehicle, missing cargo, occupied, water, and nonadjacent cells", () => {
  const action = { action: "unload" as const, start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, cell: { x: 0, y: 1 } };
  const invalid = projectileState("missile");
  assert.equal(rejectionMessage(applyGameAction(invalid, "purple", action)), "only vehicles can unload units");
  const empty = projectileState("missile");
  empty.map[0][0] = { ...empty.map[0][0], unit: "truck" };
  assert.equal(rejectionMessage(applyGameAction(empty, "purple", action)), "that vehicle is not carrying a unit");
  const base = projectileState("missile");
  base.map[0][0] = { ...base.map[0][0], unit: "truck", loadedUnit: { team: "purple", unit: "soldier" } };
  assert.equal(rejectionMessage(applyGameAction(base, "purple", action)), "unload destination must be empty");
  const water = projectileState("missile");
  water.map[0][0] = { ...water.map[0][0], unit: "truck", loadedUnit: { team: "purple", unit: "soldier" } };
  water.map[0][1] = { ...water.map[0][1], unit: "none", terrain: "water" };
  assert.equal(rejectionMessage(applyGameAction(water, "purple", action)), "cannot unload onto water");
  const far = projectileState("missile");
  far.map[0][0] = { ...far.map[0][0], unit: "truck", neighbors: [], loadedUnit: { team: "purple", unit: "soldier" } };
  far.map[0][1] = { ...far.map[0][1], unit: "none" };
  assert.equal(rejectionMessage(applyGameAction(far, "purple", action)), "unload destination must be adjacent to the vehicle");
});

test("automatic and manual turn completion share transition, income, and reset rules", () => {
  const automaticState = projectileState("missile");
  automaticState.map[0][1] = { ...automaticState.map[0][1], unit: "none" };
  automaticState.map[1][0] = { ...automaticState.map[1][0], unit: "bank" };
  const automatic = applyGameAction(automaticState, "purple", { action: "move", start: { x: 0, y: 0 }, end: { x: 0, y: 1 } });
  const manual = applyGameAction(automaticState, "purple", { action: "end" });
  assert.equal(automatic.ok, true);
  assert.equal(manual.ok, true);
  if (automatic.ok && manual.ok) {
    assert.equal(automatic.state.activeTeam, "orange");
    assert.equal(automatic.state.map[0][1].moved, undefined);
    assert.equal(automatic.events[automatic.events.length - 1].type, "endTurn");
    assert.equal(manual.state.activeTeam, automatic.state.activeTeam);
    assert.deepEqual(manual.state.money, automatic.state.money);
  }
});

test("elimination victory finishes the game and rejects later actions", () => {
  const state = attackState();
  state.map[1][1].damage = 90;
  const result = applyGameAction(state, "purple", { action: "attack", attacker: { x: 0, y: 0 }, end: { x: 0, y: 1 }, defender: { x: 1, y: 1 } });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.status, "finished");
    assert.equal(result.state.activeTeam, undefined);
    assert.equal(result.state.winner, "purple");
    assert.equal(result.events[result.events.length - 1].type, "gameOver");
    assert.equal(rejectionMessage(applyGameAction(result.state, "purple", { action: "end" })), "the game has already finished");
  }
});

test("capital victory uses the configured win condition", () => {
  const state = attackState();
  state.winCondition = "capital-or-combat-elimination";
  state.map[0][0] = { ...state.map[0][0], unit: "zuckerbird" };
  state.map[1][1] = { ...state.map[1][1], unit: "capital", damage: 90 };
  state.map[2][1] = { ...state.map[2][1], unit: "capital", team: "purple" };
  const result = applyGameAction(state, "purple", { action: "attack", attacker: { x: 0, y: 0 }, end: { x: 0, y: 1 }, defender: { x: 1, y: 1 } });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.status, "finished");
    assert.equal(result.state.winner, "purple");
    assert.equal(result.state.map[1][1].unit, "none");
  }
});

test("the v1 characterization replay preserves ordered events and its canonical checksum", () => {
  const replay = () => {
    let state = createV1ReplayState();
    deepFreeze(state);
    const eventLog: typeof V1_REPLAY_EVENTS[number][] = [];
    for (const step of V1_REPLAY_STEPS) {
      const result = applyGameAction(state, step.actor, step.action);
      assert.equal(result.ok, true);
      if (!result.ok) throw new Error("replay action rejected");
      state = result.state;
      eventLog.push(...result.events);
      deepFreeze(state);
    }
    assert.deepEqual(eventLog, V1_REPLAY_EVENTS);
    const canonical = JSON.stringify(canonicalize({ state, eventLog }));
    return createHash("sha256").update(canonical).digest("hex");
  };

  for (let index = 0; index < 10; index += 1) assert.equal(replay(), V1_REPLAY_SHA256);
});
