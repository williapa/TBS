import type { GameClient, PresenceState } from "@TBS/application";
import {
  createActiveGameSnapshot,
  CURRENT_GAME_PROTOCOL_VERSION,
} from "@TBS/common";
import type { GameAction, MapItem } from "@TBS/common";
import { describe, expect, test } from "vitest";

type Harness = {
  createClient(): Promise<GameClient> | GameClient;
  cleanup?(): Promise<void> | void;
};

const gameInput = () => {
  const state = createActiveGameSnapshot().state;
  return {
    displayName: "Orange",
    initialPayload: { map: state.map, money: state.money },
    winCondition: "combat-elimination" as const,
  };
};

const waitFor = async (condition: () => boolean) => {
  const deadline = Date.now() + 5_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("timed out waiting for adapter notification");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

const contractDescribe = (enabled: boolean) => enabled ? describe : describe.skip;
const last = <T>(values: readonly T[]): T => values[values.length - 1];

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
        expect(created.role).toBe("orange");
        expect(created.snapshot.state.status).toBe("waiting");

        const purple = await harness.createClient();
        const joined = await purple.joinGame(created.inviteToken, "player", "Purple");
        expect(joined.role).toBe("purple");
        expect(joined.snapshot.state.activeTeam).toBe("purple");

        const watcher = await harness.createClient();
        expect((await watcher.joinGame(created.inviteToken, "player", "Watcher")).role)
          .toBe("spectator");
        expect((await purple.joinGame(created.inviteToken, "spectator", "Changed")).role)
          .toBe("purple");

        const snapshot = await orange.getSnapshot(created.gameId);
        expect(snapshot.spectatorCount).toBe(1);
        expect(snapshot.players.orange?.displayName).toBe("Orange");
        expect(snapshot.players.purple?.displayName).toBe("Purple");
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
          role: "orange",
          onlineAt: new Date().toISOString(),
        });
        await watcher.updatePresence({
          gameId: created.gameId,
          displayName: "Watcher",
          role: "orange",
          onlineAt: new Date().toISOString(),
        });
        await waitFor(() => orangePresence.some(({ length }) => length === 2));
        expect(last(orangePresence).map(({ role }) => role).sort())
          .toEqual(["orange", "spectator"]);

        const envelope = {
          protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
          actionId: "26000000-0000-0000-0000-000000000001",
          expectedRevision: 0,
          action: { action: "end" as const },
        };
        expect((await purple.submitAction({ gameId: created.gameId, envelope })).ok).toBe(true);
        await waitFor(() => orangeNotices.length === 1 && watcherNotices.length === 1);
        expect(orangeNotices).toEqual(watcherNotices);
        expect((await purple.submitAction({ gameId: created.gameId, envelope })).ok).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(orangeNotices).toHaveLength(1);

        const stale = await orange.submitAction({
          gameId: created.gameId,
          envelope: { ...envelope, actionId: "26000000-0000-0000-0000-000000000002" },
        });
        expect(stale.ok).toBe(false);
        if (!stale.ok) expect(stale.error.code).toBe("stale-revision");

        const spectator = await watcher.submitAction({
          gameId: created.gameId,
          envelope: {
            ...envelope,
            actionId: "26000000-0000-0000-0000-000000000003",
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

const cell = (
  row: number,
  column: number,
  index: number,
  neighbors: number[],
  unit: MapItem["unit"],
  team: MapItem["team"],
): MapItem => ({ row, column, index, neighbors, terrain: "plains", unit, team });

const baseMap = (): MapItem[][] => [[
  cell(0, 0, 0, [1, 2], "soldier", "purple"),
  cell(0, 1, 1, [0, 2, 3], "none", "gray"),
], [
  cell(1, 0, 2, [0, 1, 3, 5], "soldier", "orange"),
  cell(1, 1, 3, [1, 2, 4, 5, 6], "soldier", "orange"),
  cell(1, 2, 4, [3, 6], "soldier", "orange"),
], [
  cell(2, 0, 5, [2, 3, 6], "soldier", "purple"),
  cell(2, 1, 6, [3, 4, 5], "none", "gray"),
]];

const scenario = (action: GameAction, configure: (map: MapItem[][]) => void = () => {}) => {
  const map = baseMap();
  configure(map);
  return { action, map };
};

const actionScenarios = () => [
  scenario({ action: "end" }),
  scenario({ action: "move", start: { x: 0, y: 0 }, end: { x: 0, y: 1 } }),
  scenario({ action: "attack", attacker: { x: 0, y: 0 }, end: { x: 0, y: 1 }, defender: { x: 1, y: 1 } }),
  scenario({ action: "boost", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, target: { x: 1, y: 1 } }, (map) => {
    map[0][0].unit = "bluesMusician"; map[1][1].team = "purple";
  }),
  scenario({ action: "heal", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, target: { x: 1, y: 1 } }, (map) => {
    map[0][0].unit = "doctor"; map[1][1].team = "purple"; map[1][1].damage = 10;
  }),
  scenario({ action: "spawn", building: { x: 0, y: 0 }, end: { x: 0, y: 1 }, unit: "soldier" }, (map) => {
    map[0][0].unit = "capital";
  }),
  scenario({ action: "construct", worker: { x: 0, y: 0 }, end: { x: 0, y: 1 }, cell: { x: 1, y: 1 }, building: "office" }, (map) => {
    map[0][0].unit = "constructionWorker"; map[1][1].unit = "none"; map[1][1].team = "gray";
  }),
  scenario({ action: "load", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, vehicle: { x: 1, y: 1 } }, (map) => {
    map[1][1].unit = "truck"; map[1][1].team = "purple";
  }),
  scenario({ action: "unload", start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, cell: { x: 0, y: 1 } }, (map) => {
    map[0][0].unit = "truck";
    map[0][0].loadedUnit = { team: "purple", unit: "soldier" };
  }),
];

export const runGameClientActionFamiliesContract = (
  name: string,
  createHarness: () => Harness,
  enabled = true,
) => {
  contractDescribe(enabled)(`${name} action families contract`, () => {
    test("accepts all nine compatibility action families", async () => {
      const harness = createHarness();
      const clients: GameClient[] = [];
      try {
        for (const [index, { action, map }] of actionScenarios().entries()) {
          const orange = await harness.createClient();
          const purple = await harness.createClient();
          clients.push(orange, purple);
          const fixture = createActiveGameSnapshot().state;
          const created = await orange.createGame({
            displayName: `Orange ${index}`,
            initialPayload: { map, money: fixture.money },
            winCondition: "combat-elimination",
          });
          await purple.joinGame(created.inviteToken, "player", `Purple ${index}`);
          const result = await purple.submitAction({
            gameId: created.gameId,
            envelope: {
              protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
              actionId: `31000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
              expectedRevision: 0,
              action,
            },
          });
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.appliedAction.action.action).toBe(action.action);
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
