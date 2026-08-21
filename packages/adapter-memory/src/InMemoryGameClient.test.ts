import {
  runGameClientActionFamiliesContract,
  runGameClientReadContract,
  runGameClientWriteContract,
} from "@TBS/test-kit";
import { applyStandardAction } from "@TBS/game-rules";
import { createWaitingGameStateFixture } from "@TBS/test-kit";
import { describe, expect, it } from "vitest";

import { InMemoryGameSessionGateway, InMemoryGameSessionStore } from "./InMemoryGameClient";

const harness = (prefix: string) => {
  const store = new InMemoryGameSessionStore(applyStandardAction);
  let nextUser = 1;
  return {
    createClient: () => new InMemoryGameSessionGateway(store, `${prefix}-${nextUser++}`),
  };
};

runGameClientReadContract("InMemoryGameSessionGateway", () => harness("read-user"));
runGameClientWriteContract("InMemoryGameSessionGateway", () => harness("write-user"));
runGameClientActionFamiliesContract("InMemoryGameSessionGateway", () => harness("action-user"));

describe("InMemoryGameSessionGateway", () => {
  it("enforces a configurable spectator cap without blocking reconnect", async () => {
    const store = new InMemoryGameSessionStore(applyStandardAction);
    const creator = new InMemoryGameSessionGateway(store, "creator", 1);
    const created = await creator.createGame({
      displayName: "Creator",
      initialState: createWaitingGameStateFixture(),
    });
    await new InMemoryGameSessionGateway(store, "purple", 1)
      .joinGame(created.inviteToken, "player", "Purple");
    const first = new InMemoryGameSessionGateway(store, "watcher-1", 1);
    await first.joinGame(created.inviteToken, "spectator", "Watcher");

    await expect(
      new InMemoryGameSessionGateway(store, "watcher-2", 1)
        .joinGame(created.inviteToken, "spectator", "Other"),
    ).rejects.toMatchObject({ code: "spectator-limit" });
    await expect(first.joinGame(created.inviteToken, "spectator", "Changed"))
      .resolves.toMatchObject({ role: "spectator" });
    expect((await creator.getSnapshot(created.gameId)).spectatorCount).toBe(1);
  });
});
