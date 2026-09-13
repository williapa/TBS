import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("button", { name: "Selected cell" })).toBeDisabled();
  });

  test("renders rows, section headers, and action descriptions", () => {
    const { container } = render(
      <GamePanel
        winCondition={winCondition}
        state={{
          coords: { q: 0, r: 0 },
          focus: "cell",
          rows: [
            { id: "occupant-type", label: "Occupant Type", type: "text", value: "Soldier (person)" },
            {
              id: "terrain",
              label: "Terrain",
              terrain: { color: "rgb(102, 204, 102)", id: "forest", label: "Forest" },
              type: "terrain",
            },
            {
              costs: [
                {
                  cost: 1,
                  terrain: { color: "rgb(102, 204, 102)", id: "forest", label: "Forest" },
                },
                {
                  cost: 2,
                  terrain: { color: "rgb(255, 255, 159)", id: "desert", label: "Desert" },
                },
              ],
              id: "energy-costs",
              label: "Energy Costs",
              type: "terrain-costs",
            },
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
    expect(screen.getByText("Forest")).toBeInTheDocument();
    expect(screen.getByText("Forest 1")).toBeInTheDocument();
    expect(screen.getByText("Desert 2")).toBeInTheDocument();
    expect(container.querySelectorAll(".game-panel__terrain-swatch")).toHaveLength(3);
    expect(container.querySelector('[data-terrain="forest"]')).toHaveStyle({
      backgroundColor: "rgb(102, 204, 102)",
    });
    expect(screen.getByText("Attack")).toBeInTheDocument();
    expect(screen.getByText("Move")).toBeInTheDocument();
    expect(screen.getByText("Initiate combat.")).toBeInTheDocument();
    expect(screen.getByText("Traverse empty map cells.")).toBeInTheDocument();
    expect(screen.getByText("Carrying Doctor (person)")).toBeInTheDocument();
    expect(screen.queryByText(winCondition.description)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Map controls" }));
    expect(screen.getByText(winCondition.description)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selected cell" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Selected cell" }));
    expect(screen.getByText("Soldier (person)")).toBeInTheDocument();
  });
});
