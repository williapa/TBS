import { render, screen } from "@testing-library/react";
import GamePanel from "./GamePanel";

describe("GamePanel", () => {
  test("renders the empty prompt when no state is selected", () => {
    render(<GamePanel state={null} />);

    expect(screen.getByText("Click a cell to see game information.")).toBeInTheDocument();
  });

  test("renders rows, section headers, and action descriptions", () => {
    render(
      <GamePanel
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
  });
});
