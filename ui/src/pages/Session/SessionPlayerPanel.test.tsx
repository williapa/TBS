import { fireEvent, render, screen } from "@testing-library/react";

import { SessionPlayerPanel } from "./SessionPlayerPanel";

describe("SessionPlayerPanel", () => {
  const history = {
    money: [{ turn: 1, value: 1000 }, { turn: 2, value: 900 }],
    income: [{ turn: 1, value: 25 }, { turn: 2, value: 125 }],
  };
  const renderPanel = (activeTurn: boolean) => render(
    <SessionPlayerPanel
      activeTurn={activeTurn}
      canEndTurn={false}
      color="purple"
      displayName="Ada"
      history={history}
      income={25}
      isLocalPlayer
      isOnline
      isWinner={false}
      money={1000}
      onEndTurn={vi.fn()}
    />,
  );

  test("formats money and per-turn income as currency", () => {
    renderPanel(true);

    expect(screen.getByText("Money:").closest("button")).toHaveTextContent("Money: $1000");
    expect(screen.getByText("Income:").closest("button"))
      .toHaveTextContent("Income: $25");
    expect(screen.getByRole("img", { name: /Money history from turn 1 to turn 2/ }))
      .toBeInTheDocument();
    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getByText("$1,100")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Income: $25" }));

    expect(screen.getByRole("button", { name: "Income: $25" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: /Income history from turn 1 to turn 2/ }))
      .toBeInTheDocument();
    expect(screen.getByText("$200")).toBeInTheDocument();
  });

  test("shows the current-turn indicator only inside the active player panel", () => {
    const view = renderPanel(true);

    expect(screen.getByText("Current turn")).toBeVisible();
    expect(screen.getByRole("complementary", { name: "purple player" }))
      .toHaveAttribute("aria-current", "true");

    view.rerender(
      <SessionPlayerPanel
        activeTurn={false}
        canEndTurn={false}
        color="purple"
        displayName="Ada"
        history={history}
        income={25}
        isLocalPlayer
        isOnline
        isWinner={false}
        money={1000}
        onEndTurn={vi.fn()}
      />,
    );

    expect(screen.queryByText("Current turn")).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "purple player" }))
      .not.toHaveAttribute("aria-current");
  });

  test("places the winner badge after the centered avatar", () => {
    render(
      <SessionPlayerPanel
        activeTurn={false}
        canEndTurn={false}
        color="purple"
        displayName="Ada"
        history={history}
        income={25}
        isLocalPlayer
        isOnline
        isWinner
        money={1000}
        onEndTurn={vi.fn()}
      />,
    );

    const avatar = screen.getByRole("img", { name: "avatar" });
    const winnerBadge = screen.getByText("Winner");

    expect(avatar.nextElementSibling).toBe(winnerBadge);
    expect(avatar.parentElement).toHaveClass("player__identity");
  });
});
