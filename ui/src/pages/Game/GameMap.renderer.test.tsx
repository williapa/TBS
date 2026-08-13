import { createActiveGameSnapshot } from "@TBS/common";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import GameMap from "./GameMap";

const rendererLifecycle = vi.hoisted(() => ({ disposed: vi.fn() }));

vi.mock("@TBS/renderer-3d", async () => {
  const { useEffect } = await import("react");
  return {
    Renderer3DBoard: ({ reducedMotion }: Readonly<{ reducedMotion?: boolean }>) => {
      useEffect(() => () => rendererLifecycle.disposed(), []);
      return <div aria-label="Mock three-dimensional board" data-reduced-motion={String(reducedMotion)} />;
    },
  };
});

const renderGameMap = () => render(
  <GameMap
    active
    perspective="orange"
    state={createActiveGameSnapshot().state}
  />,
);

describe("GameMap renderer lifecycle", () => {
  beforeEach(() => {
    window.localStorage.clear();
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
    fireEvent.click(soldier);
    expect(screen.getByRole("button", { name: "Move" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use 3D board" }));
    expect(await screen.findByLabelText("Mock three-dimensional board")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Keyboard board controls" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use 2D board" }));
    await waitFor(() => expect(rendererLifecycle.disposed).toHaveBeenCalledOnce());
    expect(screen.getByRole("grid", { name: /Two-dimensional game board/ })).toBeInTheDocument();
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
        perspective="orange"
        state={createActiveGameSnapshot().state}
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
