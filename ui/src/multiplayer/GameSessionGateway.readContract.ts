import { createActiveGameSnapshot } from "@TBS/common";
import { GameSessionGateway } from "./GameSessionGateway";

type ReadGateway = Pick<GameSessionGateway, "createGame" | "joinGame" | "getSnapshot" | "getActions">;
type Harness = { createGateway(): Promise<ReadGateway> | ReadGateway; cleanup?(): Promise<void> | void };

const input = () => {
  const state = createActiveGameSnapshot().state;
  return {
    displayName: "Orange",
    initialPayload: { map: state.map, money: state.money },
    winCondition: "combat-elimination" as const,
  };
};

export const runGameSessionGatewayReadContract = (
  name: string,
  createHarness: () => Harness,
  enabled = true
) => {
  (enabled ? describe : describe.skip)(`${name} read contract`, () => {
    test("create, join, reconnect, snapshot, and action recovery", async () => {
      const harness = createHarness();
      try {
        const orange = await harness.createGateway();
        const created = await orange.createGame(input());
        expect(created.role).toBe("orange");
        expect(created.snapshot.state.status).toBe("waiting");

        const purple = await harness.createGateway();
        const joined = await purple.joinGame(created.inviteToken, "player", "Purple");
        expect(joined.role).toBe("purple");
        expect(joined.snapshot.state.activeTeam).toBe("purple");

        const watcher = await harness.createGateway();
        expect((await watcher.joinGame(created.inviteToken, "player", "Watcher")).role).toBe("spectator");
        expect((await purple.joinGame(created.inviteToken, "spectator", "Changed")).role).toBe("purple");

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
