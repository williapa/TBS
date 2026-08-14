import { fireEvent, render, screen } from "@testing-library/react";

import ActionForm from "./ActionForm";

const options = [
  { id: "move" as const, label: "Move" },
  { id: "cancel" as const, label: "Cancel" },
];

describe("ActionForm", () => {
  test("flips an anchored menu back inside the board near its right and bottom edges", () => {
    const view = render(
      <div data-testid="board" style={{ position: "relative" }}>
        <ActionForm left={290} onAction={vi.fn()} options={options} placement="anchored" top={290} />
      </div>,
    );
    const board = screen.getByTestId("board");
    const menu = screen.getByRole("dialog", { name: "Available actions" });
    Object.defineProperties(board, {
      clientHeight: { configurable: true, value: 320 },
      clientWidth: { configurable: true, value: 320 },
    });
    Object.defineProperty(menu, "offsetParent", { configurable: true, value: board });
    vi.spyOn(menu, "getBoundingClientRect").mockReturnValue({
      bottom: 440,
      height: 150,
      left: 290,
      right: 490,
      top: 290,
      width: 200,
      x: 290,
      y: 290,
      toJSON: () => undefined,
    });

    view.rerender(
      <div data-testid="board" style={{ position: "relative" }}>
        <ActionForm left={291} onAction={vi.fn()} options={options} placement="anchored" top={291} />
      </div>,
    );

    expect(menu).toHaveStyle({ left: "67px", top: "117px" });
  });

  test("uses the docked tray without an inline screen position", () => {
    render(<ActionForm left={120} onAction={vi.fn()} options={options} placement="docked" top={160} />);

    const menu = screen.getByRole("dialog", { name: "Available actions" });
    expect(menu).toHaveClass("game-action-menu--docked");
    expect(menu).not.toHaveAttribute("style");
    expect(screen.getByRole("button", { name: "Move" })).toHaveFocus();
  });

  test("maps Escape to the typed cancel action", () => {
    const onAction = vi.fn();
    render(<ActionForm left={0} onAction={onAction} options={options} placement="docked" top={0} />);

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Available actions" }), { key: "Escape" });
    expect(onAction).toHaveBeenCalledWith("cancel");
  });
});
