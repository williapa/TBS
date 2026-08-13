import { createActiveGameSnapshot, CURRENT_GAME_PROTOCOL_VERSION } from "@TBS/common";
import type { GameClient } from "@TBS/application";
import { InMemoryGameSessionGateway, InMemoryGameSessionStore } from "@TBS/adapter-memory";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameSessionGatewayContext } from "./GameSessionGatewayContext";
import { GameSessionProvider, useGameSession } from "./GameSessionProvider";

const input = () => {
  const state = createActiveGameSnapshot().state;
  return { displayName: "Orange", initialPayload: { map: state.map, money: state.money }, winCondition: "combat-elimination" as const };
};

const wrapperFor = (gateway: GameClient) => ({ children }: { children: ReactNode }) => (
  <GameSessionGatewayContext.Provider value={gateway}>
    <GameSessionProvider>{children}</GameSessionProvider>
  </GameSessionGatewayContext.Provider>
);

describe("GameSessionProvider", () => {
  test("exposes loading and then a joined player session", async () => {
    const store = new InMemoryGameSessionStore();
    const creator = new InMemoryGameSessionGateway(store, "orange");
    const created = await creator.createGame(input());
    const gateway = new InMemoryGameSessionGateway(store, "purple");
    let release!: () => void;
    const originalJoin = gateway.joinGame.bind(gateway);
    gateway.joinGame = async (...args) => {
      await new Promise<void>((resolve) => { release = resolve; });
      return originalJoin(...args);
    };
    const { result, unmount } = renderHook(() => useGameSession(), { wrapper: wrapperFor(gateway) });

    let joining!: Promise<unknown>;
    act(() => { joining = result.current.joinGame(created.inviteToken, "player", "Purple"); });
    expect(result.current.connectionState).toBe("loading");
    await act(async () => { release(); await joining; });

    expect(result.current.connectionState).toBe("connected");
    expect(result.current.role).toBe("purple");
    expect(result.current.snapshot?.state.status).toBe("active");
    unmount();
  });

  test("exposes spectator role and accepted canonical action state", async () => {
    const store = new InMemoryGameSessionStore();
    const orange = new InMemoryGameSessionGateway(store, "orange");
    const created = await orange.createGame(input());
    const purple = new InMemoryGameSessionGateway(store, "purple");
    await purple.joinGame(created.inviteToken, "player", "Purple");

    const spectator = new InMemoryGameSessionGateway(store, "spectator");
    const spectatorHook = renderHook(() => useGameSession(), { wrapper: wrapperFor(spectator) });
    await act(() => spectatorHook.result.current.joinGame(created.inviteToken, "spectator", "Watcher"));
    expect(spectatorHook.result.current.role).toBe("spectator");
    const spectatorRevision = spectatorHook.result.current.snapshot?.state.revision;
    let rejected: Awaited<ReturnType<typeof spectatorHook.result.current.submitAction>> | undefined;
    await act(async () => {
      rejected = await spectatorHook.result.current.submitAction({
        protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
        actionId: "spectator-direct-action",
        expectedRevision: spectatorRevision ?? 0,
        action: { action: "end" },
      });
    });
    expect(rejected?.ok).toBe(false);
    if (rejected && !rejected.ok) expect(rejected.error.code).toBe("spectator-read-only");
    expect(spectatorHook.result.current.error?.code).toBe("spectator-read-only");
    expect(spectatorHook.result.current.snapshot?.state.revision).toBe(spectatorRevision);
    spectatorHook.unmount();

    const playerHook = renderHook(() => useGameSession(), { wrapper: wrapperFor(purple) });
    await act(() => playerHook.result.current.joinGame(created.inviteToken, "player", "Purple"));
    let submission: Awaited<ReturnType<typeof playerHook.result.current.submitAction>> | undefined;
    await act(async () => {
      submission = await playerHook.result.current.submitAction({
        protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
        actionId: "provider-action-1",
        expectedRevision: 0,
        action: { action: "end" },
      });
    });
    expect(submission?.ok).toBe(true);
    expect(playerHook.result.current.submitState).toBe("idle");
    expect(playerHook.result.current.snapshot?.state.revision).toBe(1);
    playerHook.unmount();
  });

  test("normalizes gateway errors into provider state and clears them", async () => {
    const gateway = new InMemoryGameSessionGateway(new InMemoryGameSessionStore(), "visitor");
    const { result } = renderHook(() => useGameSession(), { wrapper: wrapperFor(gateway) });

    await act(async () => {
      await expect(result.current.joinGame("missing", "player", "Visitor")).rejects.toMatchObject({ code: "invalid-invite" });
    });
    await waitFor(() => expect(result.current.connectionState).toBe("error"));
    expect(result.current.error).toMatchObject({ code: "invalid-invite", retryable: false });
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  test("loads, orders, and deduplicates canonical action history on reconnect", async () => {
    const store = new InMemoryGameSessionStore();
    const orange = new InMemoryGameSessionGateway(store, "orange");
    const created = await orange.createGame(input());
    const purple = new InMemoryGameSessionGateway(store, "purple");
    await purple.joinGame(created.inviteToken, "player", "Purple");
    await purple.submitAction({
      gameId: created.gameId,
      envelope: { protocolVersion: CURRENT_GAME_PROTOCOL_VERSION, actionId: "history-1", expectedRevision: 0, action: { action: "end" } },
    });
    await orange.submitAction({
      gameId: created.gameId,
      envelope: { protocolVersion: CURRENT_GAME_PROTOCOL_VERSION, actionId: "history-2", expectedRevision: 1, action: { action: "end" } },
    });
    const reconnected = new InMemoryGameSessionGateway(store, "purple");
    const { result, unmount } = renderHook(() => useGameSession(), { wrapper: wrapperFor(reconnected) });
    await act(() => result.current.joinGame(created.inviteToken, "player", "Purple"));

    expect(result.current.actions.map((action) => action.actionId)).toEqual(["history-1", "history-2"]);
    expect(result.current.actions.map((action) => action.revision)).toEqual([1, 2]);
    unmount();
  });
});
