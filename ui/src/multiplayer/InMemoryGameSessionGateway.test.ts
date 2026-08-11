import { createActiveGameSnapshot, CURRENT_GAME_PROTOCOL_VERSION } from "@TBS/common";
import { InMemoryGameSessionGateway, InMemoryGameSessionStore } from "./InMemoryGameSessionGateway";
import { runGameSessionGatewayReadContract } from "./GameSessionGateway.readContract";
import { runGameSessionGatewayWriteContract } from "./GameSessionGateway.writeContract";
import { runGameSessionGatewayActionFamiliesContract } from "./GameSessionGateway.actionFamiliesContract";

const input = () => {
  const state = createActiveGameSnapshot().state;
  return { displayName: "Orange", initialPayload: { map: state.map, money: state.money }, winCondition: "combat-elimination" as const };
};

describe("InMemoryGameSessionGateway", () => {
  test("create, player join, spectator join, reconnect, and snapshot recovery", async () => {
    const store = new InMemoryGameSessionStore();
    const orange = new InMemoryGameSessionGateway(store, "user-orange");
    const created = await orange.createGame(input());
    expect(created.role).toBe("orange");
    expect(created.snapshot.state.status).toBe("waiting");
    const purple = new InMemoryGameSessionGateway(store, "user-purple");
    const joined = await purple.joinGame(created.inviteToken, "player", "Purple");
    expect(joined.role).toBe("purple");
    expect(joined.snapshot.state.activeTeam).toBe("purple");
    const spectator = new InMemoryGameSessionGateway(store, "user-watcher");
    expect((await spectator.joinGame(created.inviteToken, "player", "Watcher")).role).toBe("spectator");
    expect((await new InMemoryGameSessionGateway(store, "user-purple").joinGame(created.inviteToken, "spectator", "Changed")).role).toBe("purple");
    expect((await orange.getSnapshot(created.gameId)).spectatorCount).toBe(1);
  });

  test("submit, duplicate idempotency, stale revision, spectator rejection, notices, and cleanup", async () => {
    const store = new InMemoryGameSessionStore();
    const orange = new InMemoryGameSessionGateway(store, "orange");
    const created = await orange.createGame(input());
    const purple = new InMemoryGameSessionGateway(store, "purple");
    await purple.joinGame(created.inviteToken, "player", "Purple");
    const watcher = new InMemoryGameSessionGateway(store, "watcher");
    await watcher.joinGame(created.inviteToken, "spectator", "Watcher");
    const notices: unknown[] = [];
    await orange.subscribe(created.gameId, (notice) => notices.push(notice));
    const envelope = { protocolVersion: CURRENT_GAME_PROTOCOL_VERSION, actionId: "action-1", expectedRevision: 0, action: { action: "end" as const } };
    const accepted = await purple.submitAction({ gameId: created.gameId, envelope });
    expect(accepted.ok).toBe(true);
    expect(notices).toHaveLength(1);
    const duplicate = await purple.submitAction({ gameId: created.gameId, envelope });
    expect(duplicate.ok).toBe(true);
    expect(notices).toHaveLength(1);
    const stale = await orange.submitAction({ gameId: created.gameId, envelope: { ...envelope, actionId: "action-2" } });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.code).toBe("stale-revision");
    const spectator = await watcher.submitAction({ gameId: created.gameId, envelope: { ...envelope, actionId: "action-3", expectedRevision: 1 } });
    expect(spectator.ok).toBe(false);
    if (!spectator.ok) expect(spectator.error.code).toBe("spectator-read-only");
    await orange.leave();
    await orange.submitAction({ gameId: created.gameId, envelope: { ...envelope, actionId: "action-4", expectedRevision: 1 } });
    expect(notices).toHaveLength(1);
    const recovered = new InMemoryGameSessionGateway(store, "purple");
    expect(await recovered.getActions(created.gameId, 0)).toHaveLength(2);
  });

  test("enforces a configurable spectator cap without blocking reconnect", async () => {
    const store = new InMemoryGameSessionStore();
    const creator = new InMemoryGameSessionGateway(store, "creator", 1);
    const created = await creator.createGame({
      displayName: "Creator",
      initialPayload: createActiveGameSnapshot().state,
      winCondition: "combat-elimination",
    });
    await new InMemoryGameSessionGateway(store, "purple", 1).joinGame(created.inviteToken, "player", "Purple");
    const first = new InMemoryGameSessionGateway(store, "watcher-1", 1);
    await first.joinGame(created.inviteToken, "spectator", "Watcher");
    await expect(new InMemoryGameSessionGateway(store, "watcher-2", 1).joinGame(created.inviteToken, "spectator", "Other"))
      .rejects.toMatchObject({ code: "spectator-limit" });
    await expect(first.joinGame(created.inviteToken, "spectator", "Changed")).resolves.toMatchObject({ role: "spectator" });
    expect((await creator.getSnapshot(created.gameId)).spectatorCount).toBe(1);
  });
});

runGameSessionGatewayReadContract("InMemoryGameSessionGateway", () => {
  const store = new InMemoryGameSessionStore();
  let nextUser = 1;
  return {
    createGateway: () => new InMemoryGameSessionGateway(store, `contract-user-${nextUser++}`),
  };
});

runGameSessionGatewayWriteContract("InMemoryGameSessionGateway", () => {
  const store = new InMemoryGameSessionStore();
  let nextUser = 1;
  return {
    createGateway: () => new InMemoryGameSessionGateway(store, `write-user-${nextUser++}`),
  };
});

runGameSessionGatewayActionFamiliesContract("InMemoryGameSessionGateway", () => {
  const store = new InMemoryGameSessionStore();
  let nextUser = 1;
  return { createGateway: () => new InMemoryGameSessionGateway(store, `actions-user-${nextUser++}`) };
});
