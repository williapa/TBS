import { render, screen } from "@testing-library/react";

import { SessionPlayerPanel } from "./SessionPlayerPanel";

describe("SessionPlayerPanel", () => {
  const renderPanel = (activeTurn: boolean) => render(
    <SessionPlayerPanel
      activeTurn={activeTurn}
      canEndTurn={false}
      color="purple"
      displayName="Ada"
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

    expect(screen.getByText("Money:").closest("p")).toHaveTextContent("Money: $1000");
    expect(screen.getByText("Income:").closest("p"))
      .toHaveTextContent("Income: $25");
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
});
