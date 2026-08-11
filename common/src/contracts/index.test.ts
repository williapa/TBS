declare const require: (module: string) => any;
const assert = require("node:assert/strict");
const test = require("node:test");
import { createActiveGameSnapshot, createWaitingGameSnapshot } from "./fixtures";
import {
  ContractValidationError,
  parseActionEnvelope,
  parseAppliedAction,
  parseDomainEvent,
  parseGameSnapshot,
  parseMapItem,
  parseTeamOption,
  parseTerrainOption,
  parseUnitOption,
} from "./parsers";

test("typed fixture builders create valid waiting and active games", () => {
  assert.equal(parseGameSnapshot(createWaitingGameSnapshot()).state.status, "waiting");
  const active = parseGameSnapshot(createActiveGameSnapshot());
  assert.equal(active.state.status, "active");
  assert.equal(active.state.activeTeam, "purple");
  assert.ok(active.players.orange);
  assert.ok(active.players.purple);
});

test("invalid terrain, unit, and team values are rejected", () => {
  assert.throws(() => parseTerrainOption("lava"), ContractValidationError);
  assert.throws(() => parseUnitOption("wizard"), ContractValidationError);
  assert.throws(() => parseTeamOption("green"), ContractValidationError);
  assert.throws(
    () => parseMapItem({ row: 0, column: 0, index: 0, terrain: "lava", unit: "none", team: "gray" }),
    /terrain/
  );
});

test("unsupported schema versions and malformed snapshots are rejected", () => {
  const unsupported = createWaitingGameSnapshot() as unknown as { state: { schemaVersion: number } };
  unsupported.state.schemaVersion = 99;
  assert.throws(() => parseGameSnapshot(unsupported), /unsupported schema version 99/);
  assert.throws(() => parseGameSnapshot({ gameId: "x", players: {}, spectatorCount: -1, state: {} }), ContractValidationError);
});

test("valid action envelopes are parsed and unsupported protocol versions are rejected", () => {
  const envelope = {
    protocolVersion: 1,
    actionId: "action-1",
    expectedRevision: 2,
    action: { action: "move", start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  };
  assert.deepEqual(parseActionEnvelope(envelope), envelope);
  assert.throws(() => parseActionEnvelope({ ...envelope, protocolVersion: 2 }), /unsupported protocol version 2/);
  assert.throws(() => parseActionEnvelope({ ...envelope, action: { action: "teleport" } }), /expected one of/);
});

test("applied actions and domain events are runtime validated", () => {
  const event = {
    actorTeam: "purple",
    type: "endTurn",
    nextTeam: "orange",
    income: 100,
    money: { orange: 2100, purple: 2000 },
  };
  assert.deepEqual(parseDomainEvent(event), event);
  const applied = {
    protocolVersion: 1,
    actionId: "action-1",
    revision: 1,
    actorTeam: "purple",
    action: { action: "end" },
    events: [event],
  };
  assert.deepEqual(parseAppliedAction(applied), applied);
  assert.throws(() => parseAppliedAction({ ...applied, protocolVersion: 2 }), /unsupported protocol version 2/);
  assert.throws(() => parseDomainEvent({ ...event, nextTeam: "green" }), /nextTeam/);
  assert.throws(() => parseDomainEvent({ actorTeam: "orange", type: "databaseRow", id: 1 }), /supported domain event/);
});
