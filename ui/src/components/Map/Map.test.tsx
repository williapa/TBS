import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createDefaultBattlefield,
  createHexMap,
  mapTeamOptions,
  mapUnitOptions,
} from "@TBS/game-setup";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MapRepository} from "../../maps";
import { MapRepositoryProvider } from "../../maps";
import type { EditableCell, HexMap } from "../../types";
import Map from "./Map";

vi.mock("../HexGrid/HexGrid", () => ({
  default: ({
    callback,
    mapData,
  }: Readonly<{
    callback?: (row: number, column: number, mapItem: EditableCell) => void;
    mapData: HexMap;
  }>) => {
    const capital = mapData.flat().find((cell) => cell.unit === "capital");
    const empty = mapData.flat().find((cell) => cell.unit === "none");
    return (
      <div data-testid="hex-grid">
        {callback && capital && empty && (
          <button
            onClick={() => callback(capital.row, capital.column, {
              team: empty.team,
              terrain: capital.terrain,
              unit: empty.unit,
            })}
            type="button"
          >
            Remove a capital
          </button>
        )}
      </div>
    );
  },
}));
vi.mock("../../hooks/useWindowDimensions", () => ({ default: () => ({ width: 1000, height: 800 }) }));

describe("map editor persistence", () => {
  test("saves through the local repository contract and returns to game creation", async () => {
    const save = vi.fn().mockResolvedValue({ id: "tiny", name: "Tiny" });
    const repository: MapRepository = {
      list: vi.fn(),
      get: vi.fn(),
      save,
      update: vi.fn(),
      delete: vi.fn(),
    };
    render(
      <MapRepositoryProvider repository={repository}>
        <MemoryRouter initialEntries={["/mapEditor"]}>
          <Routes>
            <Route
              path="/mapEditor"
              element={<Map name="Tiny" initialMap={createDefaultBattlefield().map} />}
            />
            <Route path="/game/new" element={<h1>Start a game</h1>} />
          </Routes>
        </MemoryRouter>
      </MapRepositoryProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: 'Create map "Tiny"' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: "Tiny" })));
    expect(await screen.findByRole("heading", { name: "Start a game" })).toBeInTheDocument();
  });

  test("updates the displayed win condition when the capital setup changes", () => {
    const repository: MapRepository = {
      list: vi.fn(),
      get: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    const defaultMap = createDefaultBattlefield().map;
    const orange = mapTeamOptions.find((team) => team === "orange");
    const purple = mapTeamOptions.find((team) => team === "purple");
    const soldier = mapUnitOptions.find((unit) => unit === "soldier");
    const capital = mapUnitOptions.find((unit) => unit === "capital");
    if (!orange || !purple || !soldier || !capital) {
      throw new Error("Standard map options are unavailable");
    }
    const map = createHexMap(2, defaultMap[0][0].terrain);
    map[0][0] = { ...map[0][0], team: orange, unit: soldier };
    map[2][1] = { ...map[2][1], team: purple, unit: soldier };
    map[1][0] = { ...map[1][0], team: orange, unit: capital };
    map[1][1] = { ...map[1][1], team: purple, unit: capital };

    render(
      <MapRepositoryProvider repository={repository}>
        <MemoryRouter>
          <Map initialMap={map} name="Capitals" />
        </MemoryRouter>
      </MapRepositoryProvider>,
    );

    expect(screen.getByLabelText("Map win condition")).toHaveTextContent(
      "Eliminate every enemy unit that can move and attack, or destroy every enemy capital.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove a capital" }));
    expect(screen.getByLabelText("Map win condition")).toHaveTextContent(
      "Eliminate every enemy unit that can move and attack.",
    );
    expect(screen.getByText("Capital victory requires at least one capital for each team."))
      .toBeInTheDocument();
  });
});
