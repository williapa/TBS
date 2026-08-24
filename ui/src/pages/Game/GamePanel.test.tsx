import { render, screen } from "@testing-library/react";
import GamePanel from "./GamePanel";

const winCondition = {
  description: "Eliminate every enemy unit that can move and attack.",
  includesCapitalVictory: false,
  includesEliminationVictory: true,
} as const;

describe("GamePanel", () => {
  test("renders the win condition when no cell is selected", () => {
    render(<GamePanel state={null} winCondition={winCondition} />);

    expect(screen.getByText("Win condition")).toBeInTheDocument();
    expect(screen.getByText(winCondition.description)).toBeInTheDocument();
    expect(screen.getByText("Select a cell to see its details.")).toBeInTheDocument();
  });

  test("renders rows, section headers, and action descriptions", () => {
    render(
      <GamePanel
        winCondition={winCondition}
        state={{
          coords: { q: 0, r: 0 },
          focus: "cell",
          rows: [
            { id: "occupant-type", label: "Occupant Type", type: "text", value: "Soldier (person)" },
            {
              actions: [
                { description: "Initiate combat.", id: "attack", label: "Attack" },
                { description: "Traverse empty map cells.", id: "move", label: "Move" },
              ],
              id: "actions",
              label: "Actions",
              type: "actions",
            },
          ],
          transportRows: [
            { id: "type", label: "Type", type: "text", value: "Carrying Doctor (person)" },
          ],
        }}
      />
    );

    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Cargo")).toBeInTheDocument();
    expect(screen.getByText("Soldier (person)")).toBeInTheDocument();
    expect(screen.getByText("Attack")).toBeInTheDocument();
    expect(screen.getByText("Move")).toBeInTheDocument();
    expect(screen.getByText("Initiate combat.")).toBeInTheDocument();
    expect(screen.getByText("Traverse empty map cells.")).toBeInTheDocument();
    expect(screen.getByText("Carrying Doctor (person)")).toBeInTheDocument();
    expect(screen.queryByText(winCondition.description)).not.toBeInTheDocument();
  });
});
