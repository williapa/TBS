import { applyStandardAction } from "@TBS/game-rules";
import { createDefaultBattlefield, mapTerrainOptions } from "@TBS/game-setup";
import { createWaitingGameStateFixture } from "@TBS/test-kit";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MapRepository } from "../../maps";
import { LocalStorageMapRepository } from "../../maps";
import { InMemoryGameSessionGateway, InMemoryGameSessionStore } from "@TBS/adapter-memory";
import { GameSessionGatewayContext } from "../../multiplayer/GameSessionGatewayContext";
import { GameSessionProvider } from "../../multiplayer/GameSessionProvider";
import { createActionEnvelope } from "../../multiplayer/createActionEnvelope";
import { SessionFlowRoutes } from "./SessionFlowRoutes";
import { saveReconnectDetails } from "./sessionReconnect";

const renderFlow = (gateway: InMemoryGameSessionGateway, route = "/", mapRepository?: MapRepository) => render(
  <MemoryRouter initialEntries={[route]}>
    <GameSessionGatewayContext.Provider value={gateway}>
      <GameSessionProvider><SessionFlowRoutes mapRepository={mapRepository} /></GameSessionProvider>
    </GameSessionGatewayContext.Provider>
  </MemoryRouter>
);

const createStore = () => new InMemoryGameSessionStore(applyStandardAction);
const endTurnEnvelope = (revision: number, id: string) =>
  createActionEnvelope(revision, { type: "end-turn" }, () => id);

const createGame = async (store: InMemoryGameSessionStore) => {
  return new InMemoryGameSessionGateway(store, "orange").createGame({
    displayName: "Orange",
    initialState: createWaitingGameStateFixture(),
    mapName: "Route battlefield",
  });
};

describe("new session create and join flow", () => {
  beforeEach(() => window.localStorage.clear());

  test("creates a game from a selected local map, copies its payload, and produces a share link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const store = createStore();
    const repository = new LocalStorageMapRepository(window.localStorage, () => "custom-map");
    const forest = mapTerrainOptions.find((terrain) => terrain === "forest");
    if (!forest) throw new Error("Forest terrain fixture is unavailable");
    const custom = createDefaultBattlefield().map.map((row, rowIndex) => row.map(
      (cell, columnIndex) => rowIndex === 0 && columnIndex === 0
        ? { ...cell, terrain: forest }
        : cell,
    ));
    const savedMap = await repository.save({ name: "Forest crossing", map: custom });
    const customMapRepository: MapRepository = {
      list: async () => [savedMap],
      get: (id) => repository.get(id),
      save: (input) => repository.save(input),
      update: (id, input) => repository.update(id, input),
      delete: (id) => repository.delete(id),
    };
    renderFlow(new InMemoryGameSessionGateway(store, "creator"), "/", customMapRepository);

    expect(await screen.findAllByText("Forest crossing")).not.toHaveLength(0);
    expect(screen.getByRole("img", { name: "Map preview" })).toBeInTheDocument();
    const previewDetails = within(screen.getByLabelText("Game preview details"));
    expect(previewDetails.getByText("Forest crossing")).toBeInTheDocument();
    expect(previewDetails.getByText("Enter a display name")).toBeInTheDocument();
    expect(previewDetails.getByText("Eliminate every enemy unit that can move and attack."))
      .toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Ada" } });
    expect(previewDetails.getByText("Ada")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));
    const link = await screen.findByLabelText("Share link");
    expect(link).toHaveValue("http://localhost/game/invite-1");
    expect(screen.getByRole("button", { name: "Open game" })).toBeInTheDocument();
    expect(
      link.compareDocumentPosition(screen.getByRole("img", { name: "Map preview" }))
      & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("http://localhost/game/invite-1"));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();

    const game = Array.from(store.games.values())[0];
    expect(Object.values(game.state.board.cells).some(({ terrainTypeId }) => terrainTypeId === "forest"))
      .toBe(true);
    const purple = await new InMemoryGameSessionGateway(store, "purple-copy").joinGame("invite-1", "player", "Purple");
    const watcher = await new InMemoryGameSessionGateway(store, "watcher-copy").joinGame("invite-1", "spectator", "Watcher");
    expect(purple.snapshot.state.board).toEqual(game.state.board);
    expect(watcher.snapshot.state.entities).toEqual(game.state.entities);
  });

  test("an invite can claim purple or explicitly choose spectator", async () => {
    const playerStore = createStore();
    const playerGame = await createGame(playerStore);
    renderFlow(new InMemoryGameSessionGateway(playerStore, "purple"), `/game/${playerGame.inviteToken}`);
    await screen.findByRole("img", { name: "Battlefield preview" });
    const joinPreviewDetails = within(screen.getByLabelText("Game preview details"));
    expect(joinPreviewDetails.getByText("Route battlefield")).toBeInTheDocument();
    expect(joinPreviewDetails.getByText("Orange")).toBeInTheDocument();
    expect(joinPreviewDetails.getByText("Eliminate every enemy unit that can move and attack."))
      .toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Purple" } });
    fireEvent.click(screen.getByRole("button", { name: "Join as player" }));
    expect(await screen.findByRole("heading", { name: "Game in progress" })).toBeInTheDocument();
    expect(screen.getByText("Win condition")).toBeInTheDocument();
    expect(screen.getByText("Eliminate every enemy unit that can move and attack."))
      .toBeInTheDocument();

    window.localStorage.clear();
    const spectatorStore = createStore();
    const spectatorGame = await createGame(spectatorStore);
    const secondView = renderFlow(new InMemoryGameSessionGateway(spectatorStore, "watcher"), `/game/${spectatorGame.inviteToken}`);
    await secondView.findByRole("img", { name: "Battlefield preview" });
    const names = secondView.getAllByLabelText("Display name");
    fireEvent.change(names[names.length - 1], { target: { value: "Watcher" } });
    const watchButtons = secondView.getAllByRole("button", { name: "Watch as spectator" });
    fireEvent.click(watchButtons[watchButtons.length - 1]);
    expect(await secondView.findByRole("heading", { name: "Waiting for an opponent" })).toBeInTheDocument();
    expect(await secondView.findByText("Spectating")).toBeInTheDocument();
    expect(secondView.getByText("You are watching as a spectator and cannot take game actions."))
      .toBeInTheDocument();
  });

  test("an occupied game falls back to spectator-only mode", async () => {
    const store = createStore();
    const created = await createGame(store);
    await new InMemoryGameSessionGateway(store, "purple").joinGame(created.inviteToken, "player", "Purple");
    renderFlow(new InMemoryGameSessionGateway(store, "third"), `/game/${created.inviteToken}`);
    await screen.findByRole("img", { name: "Battlefield preview" });
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Third" } });
    fireEvent.click(screen.getByRole("button", { name: "Join as player" }));

    expect(await screen.findByText("Spectating")).toBeInTheDocument();
    expect(screen.getByText("Player seats are occupied. You joined as a spectator.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join as player" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss spectator notice" }));
    expect(screen.queryByText("Player seats are occupied. You joined as a spectator.")).not.toBeInTheDocument();
  });

  test("reload reconnects and renders waiting, active, and finished snapshots without REST", async () => {
    const waitingStore = createStore();
    const waiting = await createGame(waitingStore);
    saveReconnectDetails(waiting.inviteToken, { displayName: "Orange", intent: "player" });
    const waitingView = renderFlow(new InMemoryGameSessionGateway(waitingStore, "orange"), `/game/${waiting.inviteToken}`);
    expect(await waitingView.findByRole("heading", { name: "Waiting for an opponent" })).toBeInTheDocument();
    waitingView.unmount();

    const activeStore = createStore();
    const active = await createGame(activeStore);
    await new InMemoryGameSessionGateway(activeStore, "purple").joinGame(active.inviteToken, "player", "Purple");
    saveReconnectDetails(active.inviteToken, { displayName: "Purple", intent: "player" });
    const activeView = renderFlow(new InMemoryGameSessionGateway(activeStore, "purple"), `/game/${active.inviteToken}`);
    expect(await activeView.findByRole("heading", { name: "Game in progress" })).toBeInTheDocument();
    expect(activeView.container.querySelectorAll(".r1 > .player.panel")).toHaveLength(2);
    expect(activeView.container.querySelector(".r1 > .game.special-panel")).toBeInTheDocument();
    expect(activeView.container.querySelector(".r2 > .game.panel")).toBeInTheDocument();
    expect(activeView.container.querySelector(".r2 > .event.panel")).toBeInTheDocument();
    fireEvent.click(activeView.getByRole("button", { name: "End turn" }));
    await waitFor(() => expect(activeView.getByText("Revision").nextSibling).toHaveTextContent("1"));
    expect(activeView.queryByRole("button", { name: "End turn" })).not.toBeInTheDocument();
    activeView.unmount();

    const finishedGame = activeStore.games.get(active.gameId);
    if (!finishedGame) throw new Error("active game fixture is missing");
    const winnerTeamId = Object.values(finishedGame.state.teams)
      .find(({ id }) => id === "orange")?.id;
    if (!winnerTeamId) throw new Error("finished fixture requires an orange team");
    finishedGame.state = {
      ...finishedGame.state,
      lifecycle: { phase: "finished", winnerTeamId },
    };
    const finishedView = renderFlow(new InMemoryGameSessionGateway(activeStore, "purple"), `/game/${active.inviteToken}`);
    expect(await finishedView.findByRole("heading", {
      name: "Orange team wins — Orange is the winner!",
    })).toBeInTheDocument();
    const metadata = finishedView.container.querySelector<HTMLElement>(".game-view__metadata");
    if (!metadata) throw new Error("finished game metadata is missing");
    expect(within(metadata).getByText("Winner").nextSibling).toHaveTextContent("orange");
    const winningPanel = finishedView.getByRole("complementary", { name: "orange player" });
    expect(winningPanel).toHaveClass("panel--winner");
    expect(within(winningPanel).getByText("Winner")).toBeInTheDocument();
    expect(finishedView.getByRole("complementary", { name: "purple player" }))
      .not.toHaveClass("panel--winner");
  });

  test("renders an invalid invite state", async () => {
    renderFlow(new InMemoryGameSessionGateway(createStore(), "visitor"), "/game/missing");
    expect(await screen.findByRole("alert")).toHaveTextContent("This invite link is invalid.");
    expect(screen.getByRole("button", { name: "Join as player" })).toBeDisabled();
  });

  test("exposes only supported navigation and redirects or explains obsolete bookmarks", async () => {
    const gateway = new InMemoryGameSessionGateway(createStore(), "visitor");
    const mapsView = renderFlow(gateway, "/maps");
    expect(await mapsView.findByRole("heading", { name: "New Map Configuration" })).toBeInTheDocument();
    const navigation = mapsView.getByRole("navigation", { name: "Primary" });
    expect(navigation).toContainElement(mapsView.getByRole("link", { name: "Start game" }));
    expect(navigation).toContainElement(mapsView.getByRole("link", { name: "Create map" }));
    expect(mapsView.queryByText(/signup|profile|lobby/i)).not.toBeInTheDocument();
    expect(mapsView.queryByLabelText("Import map JSON")).not.toBeInTheDocument();
    expect(mapsView.queryByRole("button", { name: /Export/ })).not.toBeInTheDocument();
    mapsView.unmount();

    const redirected = renderFlow(gateway, "/lobby");
    expect(await redirected.findByRole("heading", { name: "Start a game" })).toBeInTheDocument();
    redirected.unmount();

    const oldEditor = renderFlow(gateway, "/mapEditor");
    expect(await oldEditor.findByText("New Map Configuration")).toBeInTheDocument();
    oldEditor.unmount();

    const missing = renderFlow(gateway, "/gone");
    expect(missing.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });

  test("orders prior and live events and restores them on reconnect", async () => {
    const store = createStore();
    const created = await createGame(store);
    const purpleGateway = new InMemoryGameSessionGateway(store, "purple");
    await purpleGateway.joinGame(created.inviteToken, "player", "Purple");
    saveReconnectDetails(created.inviteToken, { displayName: "Purple", intent: "player" });
    const view = renderFlow(purpleGateway, `/game/${created.inviteToken}`);
    await view.findByRole("heading", { name: "Game in progress" });

    fireEvent.click(view.getByRole("button", { name: "End turn" }));
    await waitFor(() => expect(view.container.querySelectorAll("[data-revision]")).toHaveLength(1));
    const orange = new InMemoryGameSessionGateway(store, "orange");
    await orange.submitAction({
      gameId: created.gameId,
      envelope: endTurnEnvelope(1, "44000000-0000-4000-8000-000000000002"),
    });
    await waitFor(() => expect(Array.from(view.container.querySelectorAll("[data-revision]")).map((node) => node.getAttribute("data-revision"))).toEqual(["2", "1"]));
    view.unmount();

    const reloaded = renderFlow(new InMemoryGameSessionGateway(store, "purple"), `/game/${created.inviteToken}`);
    await waitFor(() => expect(Array.from(reloaded.container.querySelectorAll("[data-revision]")).map((node) => node.getAttribute("data-revision"))).toEqual(["2", "1"]));
  });

  test("spectators can inspect the board without action controls", async () => {
    const store = createStore();
    const created = await createGame(store);
    await new InMemoryGameSessionGateway(store, "purple").joinGame(created.inviteToken, "player", "Purple");
    const watcher = new InMemoryGameSessionGateway(store, "watcher");
    await watcher.joinGame(created.inviteToken, "spectator", "Watcher");
    saveReconnectDetails(created.inviteToken, { displayName: "Watcher", intent: "spectator" });
    const view = renderFlow(watcher, `/game/${created.inviteToken}`);

    expect(await view.findByRole("heading", { name: "Game in progress" })).toBeInTheDocument();
    expect(await view.findByText("Spectating")).toBeInTheDocument();
    expect(view.getByText("You are watching as a spectator and cannot take game actions."))
      .toBeInTheDocument();
    expect(view.getByText("Viewers online").nextSibling).toHaveTextContent("1");
    expect(view.getByText("Spectators online").nextSibling).toHaveTextContent("1");
    expect(view.queryByRole("button", { name: "End turn" })).not.toBeInTheDocument();
    fireEvent.click(await view.findByRole("button", { name: /Soldier, orange team/ }));
    expect(view.queryByRole("button", { name: "Move" })).not.toBeInTheDocument();
    expect(await view.findByText("Occupant Type")).toBeInTheDocument();
  });
});
