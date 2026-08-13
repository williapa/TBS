import { createHash } from "node:crypto";

import { entityId, hexCoord, hexKey, validateGameState } from "@TBS/game-core";
import { describe, expect, it } from "vitest";

import { migratePersistedGameState } from "./index";
import { migrateV1GameState } from "./v1-to-v2";
import { parseNormalizedGameState } from "../schemas/normalized-v2";

const legacyFixture = {
  schemaVersion: 1,
  revision: 7,
  status: "active",
  activeTeam: "orange",
  winCondition: "capital-or-combat-elimination",
  map: [
    [
      { row: 0, column: 0, index: 0, neighbors: [1, 2], terrain: "plains", unit: "truck", team: "orange", moved: true, loadedUnit: { unit: "soldier", team: "orange", damage: 15 } },
      { row: 0, column: 1, index: 1, neighbors: [0, 2, 3], terrain: "forest", unit: "none", team: "gray" },
    ],
    [
      { row: 1, column: 0, index: 2, neighbors: [0, 1, 3, 5], terrain: "road", unit: "capital", team: "purple", damage: 25 },
      { row: 1, column: 1, index: 3, neighbors: [1, 2, 4, 5, 6], terrain: "plains", unit: "soldier", team: "purple", boosted: true },
      { row: 1, column: 2, index: 4, neighbors: [3, 6], terrain: "water", unit: "none", team: "gray" },
    ],
    [
      { row: 2, column: 0, index: 5, neighbors: [2, 3, 6], terrain: "beach", unit: "none", team: "gray" },
      { row: 2, column: 1, index: 6, neighbors: [3, 4, 5], terrain: "desert", unit: "none", team: "gray" },
    ],
  ],
  money: { orange: 350, purple: 275 },
} as const;

const canonicalJson = (value: unknown): string => {
  const canonical = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(canonical);
    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, canonical(child)]),
      );
    }
    return input;
  };
  return JSON.stringify(canonical(value));
};

describe("v1 to v2 persisted-state migration", () => {
  it("normalizes cells, stable entities, cargo, health, ownership, and objectives", () => {
    const state = migrateV1GameState(legacyFixture);
    const truckId = entityId("legacy-cell-0");
    const cargoId = entityId("legacy-cargo-0-0");

    expect(state.schemaVersion).toBe(2);
    expect(state.lifecycle).toEqual({ phase: "active", activeTeamId: "orange" });
    expect(state.board.cells[hexKey(hexCoord(0, -1))]?.occupantEntityId).toBe(truckId);
    expect(state.entities[truckId]?.cargo?.entityIds).toEqual([cargoId]);
    expect(state.entities[cargoId]).toMatchObject({
      id: cargoId,
      unitTypeId: "soldier",
      health: { current: 85, maximum: 100 },
    });
    expect(state.entities[cargoId]?.position).toBeUndefined();
    expect(state.objectives).toContainEqual({
      type: "capital",
      position: { q: -1, r: 0 },
      controllingTeamId: "purple",
    });
    expect(validateGameState(state)).toEqual([]);
  });

  it("round trips the normalized runtime schema and dispatches by schema version", () => {
    const migrated = migratePersistedGameState(legacyFixture);
    expect(parseNormalizedGameState(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated);
    expect(migratePersistedGameState(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated);
  });

  it("has a stable golden checksum", () => {
    const migrated = migrateV1GameState(legacyFixture);
    const checksum = createHash("sha256").update(canonicalJson(migrated)).digest("hex");
    expect(checksum).toBe("e8ae30e469186288a15f0824b5d3e98e873bc7b15e7219361b21d4ba53a127a8");
  });

  it("rejects malformed and unsupported versions before migration", () => {
    expect(() => migratePersistedGameState({ schemaVersion: 9 })).toThrow("Unsupported");
    expect(() => migrateV1GameState({ ...legacyFixture, activeTeam: undefined })).toThrow();
    expect(() => migrateV1GameState({
      ...legacyFixture,
      map: [[legacyFixture.map[0][0], { ...legacyFixture.map[0][0], column: 1 }]],
    })).toThrow("Duplicate legacy cell index");
  });
});
