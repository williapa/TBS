import type { GameClient, PresenceState } from "@TBS/application";
import {
  entityId,
  hexCoord,
  hexKey,
  teamId,
  terrainTypeId,
  unitTypeId,
  type EntityState,
  type GameState,
  type HexCoord,
} from "@TBS/game-core";
import {
  getUnitDefinition,
  STANDARD_RULESET_VERSION,
  type StandardAction,
} from "@TBS/game-rules";
import { actionId, CURRENT_PROTOCOL_VERSION } from "@TBS/protocol";
import { describe, expect, test } from "vitest";

import { createWaitingGameStateFixture } from "./canonical-fixtures";

type Harness = {
  createClient(): Promise<GameClient> | GameClient;
  cleanup?(): Promise<void> | void;
};

const orangeTeamId = teamId("orange");
const purpleTeamId = teamId("purple");

const gameInput = () => ({
  displayName: "Orange",
  initialState: createWaitingGameStateFixture(),
  mapName: "Contract battlefield",
});

const waitFor = async (condition: () => boolean) => {
  const deadline = Date.now() + 5_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("timed out waiting for adapter notification");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

const contractDescribe = (enabled: boolean) => enabled ? describe : describe.skip;
const last = <T>(values: readonly T[]): T => {
  const value = values[values.length - 1];
  if (!value) throw new Error("expected a non-empty collection");
  return value;
};

export const runGameClientReadContract = (
  name: string,
  createHarness: () => Harness,
  enabled = true,
) => {
  contractDescribe(enabled)(`${name} read contract`, () => {
    test("creates, joins, reconnects, and recovers durable state", async () => {
      const harness = createHarness();
      try {
        const orange = await harness.createClient();
        const created = await orange.createGame(gameInput());
        expect(created.role).toBe(orangeTeamId);
        expect(created.snapshot.state.lifecycle).toEqual({ phase: "waiting" });

        const purple = await harness.createClient();
        const preview = await purple.getInvitePreview(created.inviteToken);
        expect(preview.gameId).toBe(created.gameId);
        expect(preview.mapName).toBe("Contract battlefield");
        expect(preview.creatorDisplayName).toBe("Orange");
        expect(preview.state).toEqual(created.snapshot.state);
        const joined = await purple.joinGame(created.inviteToken, "player", "Purple");
        expect(joined.role).toBe(purpleTeamId);
        expect(joined.snapshot.state.lifecycle).toEqual({
          phase: "active",
          activeTeamId: purpleTeamId,
        });

        const watcher = await harness.createClient();
        expect((await watcher.joinGame(created.inviteToken, "player", "Watcher")).role)
          .toBe("spectator");
        expect((await purple.joinGame(created.inviteToken, "spectator", "Changed")).role)
          .toBe(purpleTeamId);

        const snapshot = await orange.getSnapshot(created.gameId);
        expect(snapshot.spectatorCount).toBe(1);
        expect(snapshot.players[orangeTeamId]?.displayName).toBe("Orange");
        expect(snapshot.players[purpleTeamId]?.displayName).toBe("Purple");
        expect(await watcher.getActions(created.gameId, 0)).toEqual([]);
      } finally {
        await harness.cleanup?.();
      }
    });
  });
};

export const runGameClientWriteContract = (
  name: string,
  createHarness: () => Harness,
  enabled = true,
) => {
  contractDescribe(enabled)(`${name} write contract`, () => {
    test("submits, notifies, rejects, retries idempotently, and cleans up", async () => {
      const harness = createHarness();
      try {
        const orange = await harness.createClient();
        const purple = await harness.createClient();
        const watcher = await harness.createClient();
        const created = await orange.createGame(gameInput());
        await purple.joinGame(created.inviteToken, "player", "Purple");
        await watcher.joinGame(created.inviteToken, "spectator", "Watcher");

        const orangeNotices: unknown[] = [];
        const watcherNotices: unknown[] = [];
        const orangePresence: Array<readonly PresenceState[]> = [];
        const unsubscribeOrange = await orange.subscribe(
          created.gameId,
          (notice) => orangeNotices.push(notice),
          (presence) => orangePresence.push(presence),
        );
        const unsubscribeWatcher = await watcher.subscribe(
          created.gameId,
          (notice) => watcherNotices.push(notice),
        );
        await orange.updatePresence({
          gameId: created.gameId,
          displayName: "Orange",
          role: orangeTeamId,
          onlineAt: "2026-08-18T12:00:00.000Z",
        });
        await watcher.updatePresence({
          gameId: created.gameId,
          displayName: "Watcher",
          role: orangeTeamId,
          onlineAt: "2026-08-18T12:00:00.000Z",
        });
        await waitFor(() => orangePresence.some(({ length }) => length === 2));
        expect(last(orangePresence).map(({ role }) => role).sort())
          .toEqual([orangeTeamId, "spectator"]);

        const envelope = {
          protocolVersion: CURRENT_PROTOCOL_VERSION,
          actionId: actionId("26000000-0000-4000-8000-000000000001"),
          expectedRevision: 0,
          rulesetVersion: STANDARD_RULESET_VERSION,
          action: { type: "end-turn" as const },
        };
        expect((await purple.submitAction({ gameId: created.gameId, envelope })).ok).toBe(true);
        await waitFor(() => orangeNotices.length === 1 && watcherNotices.length === 1);
        expect(orangeNotices).toEqual(watcherNotices);
        expect((await purple.submitAction({ gameId: created.gameId, envelope })).ok).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(orangeNotices).toHaveLength(1);

        const stale = await orange.submitAction({
          gameId: created.gameId,
          envelope: {
            ...envelope,
            actionId: actionId("26000000-0000-4000-8000-000000000002"),
          },
        });
        expect(stale.ok).toBe(false);
        if (!stale.ok) expect(stale.error.code).toBe("stale-revision");

        const spectator = await watcher.submitAction({
          gameId: created.gameId,
          envelope: {
            ...envelope,
            actionId: actionId("26000000-0000-4000-8000-000000000003"),
            expectedRevision: 1,
          },
        });
        expect(spectator.ok).toBe(false);
        if (!spectator.ok) expect(spectator.error.code).toBe("spectator-read-only");
        expect(await watcher.getActions(created.gameId, 0)).toHaveLength(1);

        await unsubscribeWatcher();
        await watcher.leave();
        await waitFor(() => last(orangePresence).length === 1);
        await unsubscribeOrange();
        await unsubscribeOrange();
        await orange.leave();
      } finally {
        await harness.cleanup?.();
      }
    }, 15_000);
  });
};

const positions = [
  hexCoord(0, 0),
  hexCoord(1, 0),
  hexCoord(2, 0),
  hexCoord(0, 1),
] as const;

const unit = (
  idValue: string,
  typeValue: string,
  ownerTeamId: typeof purpleTeamId | typeof orangeTeamId | undefined,
  position: HexCoord | undefined,
  options: Readonly<{
    currentHealth?: number;
    cargoIds?: readonly string[];
  }> = {},
): EntityState => {
  const id = entityId(idValue);
  const type = unitTypeId(typeValue);
  const definition = getUnitDefinition(type);
  const maximumHealth = definition?.base.maximumHealth;
  return {
    id,
    unitTypeId: type,
    ...(ownerTeamId ? { ownerTeamId } : {}),
    ...(position ? { position } : {}),
    ...(maximumHealth ? {
      health: {
        current: options.currentHealth ?? maximumHealth,
        maximum: maximumHealth,
      },
    } : {}),
    actionBudget: { moved: false, acted: false },
    ...(options.cargoIds ? {
      cargo: { capacity: 1, entityIds: options.cargoIds.map(entityId) },
    } : {}),
    statuses: [],
  };
};

const scenarioState = (entities: readonly EntityState[]): GameState => {
  const cells = Object.fromEntries(positions.map((position) => [
    hexKey(position),
    {
      position,
      terrainTypeId: terrainTypeId("plains"),
      ...(() => {
        const occupant = entities.find((entity) =>
          entity.position && hexKey(entity.position) === hexKey(position));
        return occupant ? { occupantEntityId: occupant.id } : {};
      })(),
    },
  ]));
  return {
    ...createWaitingGameStateFixture(),
    board: { cells },
    entities: Object.fromEntries(entities.map((entity) => [entity.id, entity])),
    teams: {
      [orangeTeamId]: { id: orangeTeamId, money: 20_000 },
      [purpleTeamId]: { id: purpleTeamId, money: 20_000 },
    },
    objectives: [],
  };
};

type ActionScenario = Readonly<{
  name: StandardAction["type"];
  state: GameState;
  action: StandardAction;
}>;

const actionScenarios = (): readonly ActionScenario[] => {
  const actorId = entityId("actor");
  const targetId = entityId("target");
  const cargoId = entityId("cargo");
  return [
    {
      name: "end-turn",
      state: scenarioState([unit("actor", "soldier", purpleTeamId, positions[0])]),
      action: { type: "end-turn" },
    },
    {
      name: "move",
      state: scenarioState([unit("actor", "soldier", purpleTeamId, positions[0])]),
      action: { type: "move", actorId, destination: positions[1] },
    },
    {
      name: "attack",
      state: scenarioState([
        unit("actor", "soldier", purpleTeamId, positions[0]),
        unit("target", "soldier", orangeTeamId, positions[2]),
      ]),
      action: {
        type: "attack",
        actorId,
        destination: positions[1],
        defenderId: targetId,
      },
    },
    {
      name: "boost",
      state: scenarioState([
        unit("actor", "bluesMusician", purpleTeamId, positions[0]),
        unit("target", "soldier", purpleTeamId, positions[2]),
      ]),
      action: { type: "boost", actorId, destination: positions[1], targetId },
    },
    {
      name: "heal",
      state: scenarioState([
        unit("actor", "doctor", purpleTeamId, positions[0]),
        unit("target", "soldier", purpleTeamId, positions[2], { currentHealth: 50 }),
      ]),
      action: { type: "heal", actorId, destination: positions[1], targetId },
    },
    {
      name: "construct",
      state: scenarioState([unit("actor", "constructionWorker", purpleTeamId, positions[0])]),
      action: {
        type: "construct",
        actorId,
        destination: positions[1],
        constructionPosition: positions[2],
        buildingEntityId: entityId("constructed"),
        buildingUnitTypeId: unitTypeId("office"),
      },
    },
    {
      name: "spawn",
      state: scenarioState([unit("actor", "capital", purpleTeamId, positions[0])]),
      action: {
        type: "spawn",
        actorId,
        destination: positions[1],
        spawnedEntityId: entityId("spawned"),
        unitTypeId: unitTypeId("soldier"),
      },
    },
    {
      name: "load",
      state: scenarioState([
        unit("actor", "soldier", purpleTeamId, positions[0]),
        unit("target", "truck", purpleTeamId, positions[2]),
      ]),
      action: { type: "load", actorId, destination: positions[1], vehicleId: targetId },
    },
    {
      name: "unload",
      state: scenarioState([
        unit("actor", "truck", purpleTeamId, positions[0], { cargoIds: [cargoId] }),
        unit("cargo", "soldier", purpleTeamId, undefined),
      ]),
      action: {
        type: "unload",
        actorId,
        destination: positions[0],
        unloadPosition: positions[1],
      },
    },
  ];
};

export const runGameClientActionFamiliesContract = (
  name: string,
  createHarness: () => Harness,
  enabled = true,
) => {
  contractDescribe(enabled)(`${name} action families contract`, () => {
    test("accepts all nine current standard action families", async () => {
      const harness = createHarness();
      const clients: GameClient[] = [];
      try {
        for (const [index, scenario] of actionScenarios().entries()) {
          const orange = await harness.createClient();
          const purple = await harness.createClient();
          clients.push(orange, purple);
          const created = await orange.createGame({
            displayName: `Orange ${index}`,
            initialState: scenario.state,
            mapName: `Action battlefield ${index}`,
          });
          await purple.joinGame(created.inviteToken, "player", `Purple ${index}`);
          const result = await purple.submitAction({
            gameId: created.gameId,
            envelope: {
              protocolVersion: CURRENT_PROTOCOL_VERSION,
              actionId: actionId(
                `31000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
              ),
              expectedRevision: 0,
              rulesetVersion: STANDARD_RULESET_VERSION,
              action: scenario.action,
            },
          });
          expect(result.ok, scenario.name).toBe(true);
          if (result.ok) {
            expect(result.appliedAction.action.type).toBe(scenario.name);
            expect(result.snapshot.state.revision).toBe(1);
          }
        }
      } finally {
        await Promise.all(clients.map((client) => client.leave()));
        await harness.cleanup?.();
      }
    }, 30_000);
  });
};
