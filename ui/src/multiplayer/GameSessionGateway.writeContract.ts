import { createActiveGameSnapshot, CURRENT_GAME_PROTOCOL_VERSION } from "@TBS/common";
import { GameSessionGateway, PresenceState } from "./GameSessionGateway";

type WriteGateway = Pick<GameSessionGateway, "createGame" | "joinGame" | "getActions" | "subscribe" | "submitAction" | "updatePresence" | "leave">;
type Harness = { createGateway(): Promise<WriteGateway> | WriteGateway; cleanup?(): Promise<void> | void };

const input = () => {
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
    if (Date.now() >= deadline) throw new Error("timed out waiting for gateway notice");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

export const runGameSessionGatewayWriteContract = (
  name: string,
  createHarness: () => Harness,
  enabled = true
) => {
  (enabled ? describe : describe.skip)(`${name} write contract`, () => {
    test("submit, notify, reject, recover, retry, and clean up", async () => {
      const harness = createHarness();
      try {
        const orange = await harness.createGateway();
        const purple = await harness.createGateway();
        const watcher = await harness.createGateway();
        const created = await orange.createGame(input());
        await purple.joinGame(created.inviteToken, "player", "Purple");
        await watcher.joinGame(created.inviteToken, "spectator", "Watcher");

        const orangeNotices: unknown[] = [];
        const watcherNotices: unknown[] = [];
        const orangePresence: PresenceState[][] = [];
        const unsubscribeOrange = await orange.subscribe(created.gameId, (notice) => orangeNotices.push(notice), (presence) => orangePresence.push(presence));
        const unsubscribeWatcher = await watcher.subscribe(created.gameId, (notice) => watcherNotices.push(notice));
        await orange.updatePresence({ gameId: created.gameId, displayName: "Orange", role: "orange", onlineAt: new Date().toISOString() });
        await watcher.updatePresence({ gameId: created.gameId, displayName: "Watcher", role: "orange", onlineAt: new Date().toISOString() });
        await waitFor(() => orangePresence.some((presence) => presence.length === 2));
        expect(orangePresence[orangePresence.length - 1].map((entry) => entry.role).sort()).toEqual(["orange", "spectator"]);
        const envelope = {
          protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
          actionId: "26000000-0000-0000-0000-000000000001",
          expectedRevision: 0,
          action: { action: "end" as const },
        };

        const accepted = await purple.submitAction({ gameId: created.gameId, envelope });
        expect(accepted.ok).toBe(true);
        await waitFor(() => orangeNotices.length === 1 && watcherNotices.length === 1);
        expect(orangeNotices).toEqual(watcherNotices);

        const duplicate = await purple.submitAction({ gameId: created.gameId, envelope });
        expect(duplicate.ok).toBe(true);
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
          envelope: { ...envelope, actionId: "26000000-0000-0000-0000-000000000003", expectedRevision: 1 },
        });
        expect(spectator.ok).toBe(false);
        if (!spectator.ok) expect(spectator.error.code).toBe("spectator-read-only");
        expect(await watcher.getActions(created.gameId, 0)).toHaveLength(1);

        await unsubscribeWatcher();
        await watcher.leave();
        await waitFor(() => orangePresence[orangePresence.length - 1].length === 1);
        await unsubscribeOrange();
        await unsubscribeOrange();
        await orange.leave();
      } finally {
        await harness.cleanup?.();
      }
    }, 15_000);
  });
};
