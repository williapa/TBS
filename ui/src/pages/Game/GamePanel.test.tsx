import { mapUnitOptions } from "@TBS/game-setup";
import { presentUnitDictionary, presentUnitTypeDetails } from "@TBS/presentation";
import { fireEvent, render, screen } from "@testing-library/react";
import GamePanel from "./GamePanel";
import { buildUnitDictionaryRows } from "./gamePanelState";

const winCondition = {
  description: "Eliminate every enemy unit that can move and attack.",
  includesCapitalVictory: false,
  includesEliminationVictory: true,
} as const;

const dictionaryUnitTypeId = (value: string) => {
  const unit = presentUnitDictionary()
    .flatMap(({ units }) => units)
    .find(({ unitTypeId }) => unitTypeId === value);
  if (!unit) throw new Error(`Expected ${value} in the unit dictionary`);
  return unit.unitTypeId;
};

const dictionaryRows = (unitTypeId: string) => {
  const unit = presentUnitTypeDetails(dictionaryUnitTypeId(unitTypeId));
  if (!unit) throw new Error(`Expected details for ${unitTypeId}`);
  return buildUnitDictionaryRows(unit);
};

describe("GamePanel", () => {
  test("renders the win condition when no cell is selected", () => {
    render(<GamePanel state={null} winCondition={winCondition} />);

    expect(screen.getByText("Win condition")).toBeInTheDocument();
    expect(screen.getByText(winCondition.description)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selected cell" })).toBeDisabled();
  });

  test("renders rows, the cargo heading, and action descriptions without a details heading", () => {
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
              attack: 100,
              defense: 15,
              id: "stats",
              label: "Stats",
              type: "combat-stats",
            },
            {
              color: "purple",
              current: 65,
              id: "health",
              label: "Health",
              maximum: 100,
              type: "health-stat",
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
                {
                  description: "Initiate combat.",
                  id: "attack",
                  label: "Attack",
                  unitList: null,
                },
                {
                  description: "Traverse empty map cells.",
                  id: "move",
                  label: "Move",
                  unitList: null,
                },
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

    expect(screen.queryByRole("heading", { name: "Details" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cargo" })).toBeInTheDocument();
    expect(screen.getByText("Soldier (person)")).toBeInTheDocument();
    expect(screen.getByText("Forest")).toBeInTheDocument();
    expect(screen.getByText("Forest 1")).toBeInTheDocument();
    expect(screen.getByText("Desert 2")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "attack" })).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    expect(screen.getByRole("progressbar", { name: "attack" })).toHaveAttribute(
      "aria-valuemax",
      "100",
    );
    expect(screen.getByRole("progressbar", { name: "defense" })).toHaveAttribute(
      "aria-valuenow",
      "15",
    );
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(container.querySelector('[data-stat="attack"]')).toHaveStyle({ width: "100%" });
    expect(container.querySelector('[data-stat="defense"]')).toHaveStyle({ width: "15%" });
    expect(screen.getByRole("progressbar", { name: "health" })).toHaveAttribute(
      "aria-valuenow",
      "65",
    );
    expect(screen.getByRole("progressbar", { name: "health" })).toHaveAttribute(
      "aria-valuemax",
      "100",
    );
    expect(screen.getByText("65 / 100")).toBeInTheDocument();
    expect(container.querySelector('[data-stat="health"]')).toHaveStyle({
      backgroundColor: "rgb(128, 0, 128)",
      width: "65%",
    });
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

  test("browses every concrete unit in a persistent dictionary view", () => {
    const { rerender } = render(<GamePanel state={null} winCondition={winCondition} />);

    fireEvent.click(screen.getByRole("button", { name: "Unit dictionary" }));

    const select = screen.getByRole("combobox", { name: "Unit" });
    expect(select.querySelectorAll("option")).toHaveLength(mapUnitOptions.length - 1);
    expect(select.querySelector('option[value="none"]')).not.toBeInTheDocument();
    expect([...select.querySelectorAll("optgroup")].map(({ label }) => label)).toEqual([
      "animal",
      "building",
      "object",
      "person",
      "vehicle",
    ]);
    expect(select).toHaveValue("dragon");
    expect(screen.queryByRole("heading", { name: "Dragon" })).not.toBeInTheDocument();

    fireEvent.change(select, { target: { value: "airport" } });

    expect(select).toHaveValue("airport");
    expect(screen.getByText("$100")).toBeInTheDocument();
    expect(screen.getByText("$1000")).toBeInTheDocument();
    expect(screen.getByText("Spawn")).toBeInTheDocument();
    expect(screen.getByText("Can spawn:")).toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: "View Airplane in unit dictionary",
    })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {
      name: "View Helicopter in unit dictionary",
    }));

    expect(select).toHaveValue("helicopter");
    expect(select).toHaveFocus();

    fireEvent.change(select, { target: { value: "constructionWorker" } });
    expect(select).toHaveValue("constructionWorker");
    expect(screen.getByText("Construct")).toBeInTheDocument();
    expect(screen.getByText("Can construct:")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {
      name: "View Bank in unit dictionary",
    }));

    expect(select).toHaveValue("bank");
    expect(select).toHaveFocus();

    fireEvent.change(select, { target: { value: "airport" } });

    rerender(
      <GamePanel
        state={{ coords: { q: 0, r: 0 }, focus: "cell", rows: [] }}
        winCondition={winCondition}
      />
    );

    expect(screen.getByRole("button", { name: "Unit dictionary" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("combobox", { name: "Unit" })).toHaveValue("airport");
  });

  test("opens linked spawn and construction units from selected-cell details", () => {
    const { rerender } = render(
      <GamePanel
        state={{
          coords: { q: 0, r: 0 },
          focus: "cell",
          rows: dictionaryRows("airport"),
        }}
        winCondition={winCondition}
      />,
    );

    fireEvent.click(screen.getByText("Spawn"));
    fireEvent.click(screen.getByRole("button", {
      name: "View Pilot in unit dictionary",
    }));

    const select = screen.getByRole("combobox", { name: "Unit" });
    expect(screen.getByRole("button", { name: "Unit dictionary" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(select).toHaveValue("pilot");
    expect(select).toHaveFocus();

    rerender(
      <GamePanel
        state={{
          coords: { q: 1, r: 0 },
          focus: "cell",
          rows: dictionaryRows("constructionWorker"),
        }}
        winCondition={winCondition}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Selected cell" }));
    fireEvent.click(screen.getByText("Construct"));
    fireEvent.click(screen.getByRole("button", {
      name: "View Capital in unit dictionary",
    }));

    const constructionSelect = screen.getByRole("combobox", { name: "Unit" });
    expect(constructionSelect).toHaveValue("capital");
    expect(constructionSelect).toHaveFocus();
  });
});
