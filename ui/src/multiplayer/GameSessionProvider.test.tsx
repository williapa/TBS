import type { GameClient } from "@TBS/application";
import { InMemoryGameSessionGateway, InMemoryGameSessionStore } from "@TBS/adapter-memory";
import { applyStandardAction } from "@TBS/game-rules";
import { createWaitingGameStateFixture } from "@TBS/test-kit";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameSessionGatewayContext } from "./GameSessionGatewayContext";
import { GameSessionProvider, useGameSession } from "./GameSessionProvider";
import { createActionEnvelope } from "./createActionEnvelope";

const input = () => ({
  displayName: "Orange",
  initialState: createWaitingGameStateFixture(),
  mapName: "Provider battlefield",
});
const createStore = () => new InMemoryGameSessionStore(applyStandardAction);
const endTurnEnvelope = (revision: number, id: string) =>
  createActionEnvelope(revision, { type: "end-turn" }, () => id);

const wrapperFor = (gateway: GameClient) => ({ children }: { children: ReactNode }) => (
  <GameSessionGatewayContext.Provider value={gateway}>
    <GameSessionProvider>{children}</GameSessionProvider>
  </GameSessionGatewayContext.Provider>
);

describe("GameSessionProvider", () => {
  test("exposes loading and then a joined player session", async () => {
    const store = createStore();
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
    expect(result.current.snapshot?.state.lifecycle.phase).toBe("active");
    unmount();
  });

  test("exposes spectator role and accepted canonical action state", async () => {
    const store = createStore();
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
      rejected = await spectatorHook.result.current.submitAction(endTurnEnvelope(
        spectatorRevision ?? 0,
        "43000000-0000-4000-8000-000000000001",
      ));
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
      submission = await playerHook.result.current.submitAction(endTurnEnvelope(
        0,
        "43000000-0000-4000-8000-000000000002",
      ));
    });
    expect(submission?.ok).toBe(true);
    expect(playerHook.result.current.submitState).toBe("idle");
    expect(playerHook.result.current.snapshot?.state.revision).toBe(1);
    playerHook.unmount();
  });

  test("normalizes gateway errors into provider state and clears them", async () => {
    const gateway = new InMemoryGameSessionGateway(createStore(), "visitor");
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
    const store = createStore();
    const orange = new InMemoryGameSessionGateway(store, "orange");
    const created = await orange.createGame(input());
    const purple = new InMemoryGameSessionGateway(store, "purple");
    await purple.joinGame(created.inviteToken, "player", "Purple");
    await purple.submitAction({
      gameId: created.gameId,
      envelope: endTurnEnvelope(0, "43000000-0000-4000-8000-000000000003"),
    });
    await orange.submitAction({
      gameId: created.gameId,
      envelope: endTurnEnvelope(1, "43000000-0000-4000-8000-000000000004"),
    });
    const reconnected = new InMemoryGameSessionGateway(store, "purple");
    const { result, unmount } = renderHook(() => useGameSession(), { wrapper: wrapperFor(reconnected) });
    await act(() => result.current.joinGame(created.inviteToken, "player", "Purple"));

    expect(result.current.actions.map((action) => action.actionId)).toEqual([
      "43000000-0000-4000-8000-000000000003",
      "43000000-0000-4000-8000-000000000004",
    ]);
    expect(result.current.actions.map((action) => action.revision)).toEqual([1, 2]);
    unmount();
  });
});
