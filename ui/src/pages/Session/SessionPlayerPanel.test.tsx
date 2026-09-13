import { render, screen } from "@testing-library/react";

import { SessionPlayerPanel } from "./SessionPlayerPanel";

describe("SessionPlayerPanel", () => {
  test("formats money and per-turn income as currency", () => {
    render(
      <SessionPlayerPanel
        activeTurn
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

    expect(screen.getByText("Money:").closest("p")).toHaveTextContent("Money: $1000");
    expect(screen.getByText("Income per turn:").closest("p"))
      .toHaveTextContent("Income per turn: $25");
    expect(screen.queryByText("Income/turn:")).not.toBeInTheDocument();
  });
});
