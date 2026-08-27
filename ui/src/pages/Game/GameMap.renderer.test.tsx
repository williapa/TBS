import { createActiveGameStateFixture } from "@TBS/test-kit";
import { applyStandardAction } from "@TBS/game-rules";
import { mapUnitOptions } from "@TBS/game-setup";
import type * as PresentationModule from "@TBS/presentation";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import GameMap from "./GameMap";
import { createActionEnvelope } from "../../multiplayer/createActionEnvelope";

const rendererLifecycle = vi.hoisted(() => ({ disposed: vi.fn() }));
const interactionPreviewCalls = vi.hoisted(() => vi.fn());

vi.mock("@TBS/presentation", async (importOriginal) => {
  const actual = await importOriginal<typeof PresentationModule>();
  return {
    ...actual,
    createGameInteractionPreview: (...args: Parameters<typeof actual.createGameInteractionPreview>) => {
      interactionPreviewCalls();
      return actual.createGameInteractionPreview(...args);
    },
  };
});

vi.mock("@TBS/renderer-3d", async () => {
  const { useEffect } = await import("react");
  return {
    Renderer3DBoard: ({
      onViewChange,
      reducedMotion,
    }: Readonly<{
      onViewChange?: () => void;
      reducedMotion?: boolean;
    }>) => {
      useEffect(() => () => rendererLifecycle.disposed(), []);
      return (
        <div aria-label="Mock three-dimensional board" data-reduced-motion={String(reducedMotion)}>
          <button onClick={onViewChange} type="button">Move mock camera</button>
        </div>
      );
    },
  };
});

const gameProps = () => {
  const state = createActiveGameStateFixture();
  const perspective = Object.values(state.teams).find(({ id }) => id === "orange")?.id;
  if (!perspective) throw new Error("renderer fixture requires the orange team");
  return { perspective, state };
};

const renderGameMap = () => render(<GameMap active {...gameProps()} />);

const transportGameProps = () => {
  const state = createActiveGameStateFixture();
  const perspective = Object.values(state.teams).find(({ id }) => id === "orange")?.id;
  const soldier = Object.values(state.entities).find(({ ownerTeamId }) => ownerTeamId === perspective);
  const vehicle = Object.values(state.entities).find(({ ownerTeamId }) => ownerTeamId !== perspective);
  const soldierPosition = soldier?.position;
  const truckUnitTypeId = mapUnitOptions.find((unitTypeId) => unitTypeId === "truck");
  if (!perspective || !soldier || !soldierPosition || !vehicle || !truckUnitTypeId || truckUnitTypeId === "none") {
    throw new Error("transport renderer fixture is incomplete");
  }
  const isAdjacent = (position: Readonly<{ q: number; r: number }>) => [
    [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
  ].some(([q, r]) => position.q === soldierPosition.q + q && position.r === soldierPosition.r + r);
  const previousVehicleCellEntry = Object.entries(state.board.cells)
    .find(([, cell]) => cell.occupantEntityId === vehicle.id);
  const vehicleCellEntry = Object.entries(state.board.cells)
    .find(([, cell]) => !cell.occupantEntityId && isAdjacent(cell.position));
  if (!previousVehicleCellEntry || !vehicleCellEntry) {
    throw new Error("transport renderer fixture requires vehicle cells");
  }
  const [previousVehicleCellId, previousVehicleCell] = previousVehicleCellEntry;
  const [vehicleCellId, vehicleCell] = vehicleCellEntry;
  return {
    perspective,
    soldierId: soldier.id,
    state: {
      ...state,
      board: {
        cells: {
          ...state.board.cells,
          [previousVehicleCellId]: {
            ...previousVehicleCell,
            occupantEntityId: undefined,
          },
          [vehicleCellId]: {
            ...vehicleCell,
            occupantEntityId: vehicle.id,
          },
        },
      },
      entities: {
        ...state.entities,
        [vehicle.id]: {
          ...vehicle,
          ownerTeamId: perspective,
          position: vehicleCell.position,
          unitTypeId: truckUnitTypeId,
        },
      },
    },
    vehicleId: vehicle.id,
  };
};

const moveTargetCell = () => {
  const targetId = document.querySelector('[data-highlight-kind="move"]')
    ?.getAttribute("data-cell-highlight");
  const target = screen.getAllByRole("gridcell")
    .find((cell) => cell.getAttribute("data-cell-id") === targetId);
  if (!target) throw new Error("expected a legal move target cell");
  return target;
};

describe("GameMap renderer lifecycle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    interactionPreviewCalls.mockClear();
    rendererLifecycle.disposed.mockClear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      }),
    });
  });

  test("switches renderers without discarding the active interaction and tears down 3D", async () => {
    renderGameMap();
    const soldier = screen.getByRole("button", { name: /Soldier, orange team/ });
    fireEvent.click(soldier);
    fireEvent.click(moveTargetCell());
    expect(screen.getByRole("button", { name: "Move" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use 3D board" }));
    expect(await screen.findByLabelText("Mock three-dimensional board")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Keyboard board controls" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use 2D board" }));
    await waitFor(() => expect(rendererLifecycle.disposed).toHaveBeenCalledOnce());
    expect(screen.getByRole("grid", { name: /Two-dimensional game board/ })).toBeInTheDocument();
  });

  test("submits an ordinary move from the destination action menu without a second confirmation", () => {
    const onAction = vi.fn();
    render(<GameMap active onAction={onAction} {...gameProps()} />);
    fireEvent.click(screen.getByRole("button", { name: /Soldier, orange team/ }));
    fireEvent.click(moveTargetCell());

    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ type: "move" }));
    expect(screen.queryByRole("button", { name: "Confirm Move" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Available actions" })).not.toBeInTheDocument();
  });

  test("keeps an optimistic movement animation on confirmation and cancels it for a conflicting transition", async () => {
    const onAction = vi.fn();
    const props = gameProps();
    const view = render(<GameMap active onAction={onAction} {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Soldier, orange team/ }));
    fireEvent.click(moveTargetCell());
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    const command = onAction.mock.calls[0]?.[0];
    if (!command || command.type !== "move") {
      throw new Error("animation fixture requires a move command");
    }
    const reduced = applyStandardAction(props.state, props.perspective, command);
    if (!reduced.ok) throw new Error("animation fixture move should be valid");
    const firstActionId = createActionEnvelope(
      props.state.revision,
      command,
      () => "45000000-0000-4000-8000-000000000001",
    ).actionId;
    const conflictingActionId = createActionEnvelope(
      props.state.revision,
      command,
      () => "45000000-0000-4000-8000-000000000002",
    ).actionId;

    view.rerender(
      <GameMap
        active={false}
        events={reduced.events}
        perspective={props.perspective}
        state={reduced.state}
        transitionId={firstActionId}
      />,
    );
    await waitFor(() => expect(
      screen.getByRole("button", { name: /Soldier, orange team/ }).querySelector("g")
        ?.getAttribute("style"),
    ).toContain("tbs-renderer-2d-move"));

    view.rerender(
      <GameMap
        active={false}
        events={[]}
        perspective={props.perspective}
        state={reduced.state}
        transitionId={conflictingActionId}
      />,
    );
    await waitFor(() => expect(
      screen.getByRole("button", { name: /Soldier, orange team/ }).querySelector("g")
        ?.getAttribute("style") ?? "",
    ).not.toContain("tbs-renderer-2d-move"));
  });

  test("reuses the snapshot legality preview across interaction-only renders", () => {
    renderGameMap();
    expect(interactionPreviewCalls).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: /Soldier, orange team/ }));
    fireEvent.click(moveTargetCell());

    expect(interactionPreviewCalls).toHaveBeenCalledOnce();
  });

  test("keeps the loading unit selected and submits only after confirming a 2D vehicle target", () => {
    const onAction = vi.fn();
    const { perspective, soldierId, state, vehicleId } = transportGameProps();
    render(<GameMap active onAction={onAction} perspective={perspective} state={state} />);

    fireEvent.click(screen.getByRole("button", { name: /Soldier, orange team/ }));
    fireEvent.click(screen.getByRole("button", { name: /Soldier, orange team/ }));
    fireEvent.click(screen.getByRole("button", { name: "Load" }));
    fireEvent.click(screen.getByRole("button", { name: /Truck, orange team/ }));

    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirm Load" })).toBeInTheDocument();
    expect(document.querySelector(`[data-entity-id="${soldierId}"] circle`)?.getAttribute("stroke-width"))
      .toBe("5");

    fireEvent.click(screen.getByRole("button", { name: "Confirm Load" }));

    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      type: "load",
      actorId: soldierId,
      vehicleId,
    }));
  });

  test("anchors pointer menus, docks keyboard menus, and restores keyboard focus on Escape", async () => {
    renderGameMap();
    let soldier = screen.getByRole("button", { name: /Soldier, orange team/ });
    fireEvent.click(soldier, { clientX: 120, clientY: 160 });
    fireEvent.click(moveTargetCell(), { clientX: 120, clientY: 160 });

    const anchored = screen.getByRole("dialog", { name: "Available actions" });
    expect(anchored).toHaveClass("game-action-menu--anchored");
    expect(anchored).toHaveStyle({ left: "132px", top: "172px" });
    expect(screen.getByRole("button", { name: "Move" })).toHaveFocus();

    fireEvent.keyDown(anchored, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Available actions" })).not.toBeInTheDocument();

    soldier = screen.getByRole("button", { name: /Soldier, orange team/ });
    soldier.focus();
    fireEvent.keyDown(soldier, { key: "Enter" });
    const keyboardTarget = moveTargetCell();
    keyboardTarget.focus();
    fireEvent.keyDown(keyboardTarget, { key: "Enter" });
    expect(screen.getByRole("dialog", { name: "Available actions" })).toHaveClass(
      "game-action-menu--docked",
    );
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Available actions" }), { key: "Escape" });
    await waitFor(() => expect(keyboardTarget).toHaveFocus());
  });

  test("docks an anchored menu when the 3D camera changes", async () => {
    renderGameMap();
    const soldier = screen.getByRole("button", { name: /Soldier, orange team/ });
    fireEvent.click(soldier, { clientX: 120, clientY: 160 });
    fireEvent.click(moveTargetCell(), { clientX: 120, clientY: 160 });
    expect(screen.getByRole("dialog", { name: "Available actions" })).toHaveClass(
      "game-action-menu--anchored",
    );

    fireEvent.click(screen.getByRole("button", { name: "Use 3D board" }));
    fireEvent.click(await screen.findByRole("button", { name: "Move mock camera" }));
    expect(screen.getByRole("dialog", { name: "Available actions" })).toHaveClass(
      "game-action-menu--docked",
    );
  });

  test("persists the renderer preference and forwards reduced-motion preference", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: true,
        removeEventListener: vi.fn(),
      }),
    });
    const first = renderGameMap();
    fireEvent.click(screen.getByRole("button", { name: "Use 3D board" }));
    expect(await screen.findByLabelText("Mock three-dimensional board")).toHaveAttribute("data-reduced-motion", "true");
    first.unmount();

    renderGameMap();
    expect(await screen.findByLabelText("Mock three-dimensional board")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use 3D board" })).toHaveAttribute("aria-pressed", "true");
  });

  test("offers a bounded keyboard cell navigator for the WebGL view", async () => {
    const onPanelStateChange = vi.fn();
    render(
      <GameMap
        active
        onPanelStateChange={onPanelStateChange}
        {...gameProps()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Use 3D board" }));
    const currentCell = await screen.findByRole("button", { name: /Current cell:/ });
    const initialLabel = currentCell.getAttribute("aria-label");
    fireEvent.keyDown(currentCell, { key: "ArrowRight" });
    expect(currentCell.getAttribute("aria-label")).not.toBe(initialLabel);
    fireEvent.keyDown(currentCell, { key: "Enter" });
    await waitFor(() => expect(onPanelStateChange).toHaveBeenCalled());
  });
});
