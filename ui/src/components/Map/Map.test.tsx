import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createDefaultBattlefield,
  createHexMap,
  getMapReflectionCellRole,
  mapTeamOptions,
  mapUnitOptions,
} from "@TBS/game-setup";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MapRepository} from "../../maps";
import { MapRepositoryProvider } from "../../maps";
import type { EditableCell, HexMap, MapCellEditState, MapItem } from "../../types";
import Map from "./Map";

vi.mock("../HexGrid/HexGrid", () => ({
  default: ({
    callback,
    getCellEditState,
    mapData,
  }: Readonly<{
    callback?: (row: number, column: number, mapItem: EditableCell) => void;
    getCellEditState?: (cell: MapItem) => MapCellEditState;
    mapData: HexMap;
  }>) => {
    const capital = mapData.flat().find((cell) => cell.unit === "capital");
    const empty = mapData.flat().find((cell) => cell.unit === "none");
    const editStates = mapData.flat().map((cell) => getCellEditState?.(cell) ?? "editable");
    return (
      <div data-testid="hex-grid">
        <span data-testid="editable-count">
          {editStates.filter((state) => state === "editable").length}
        </span>
        <span data-testid="axis-count">
          {editStates.filter((state) => state === "axis").length}
        </span>
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

  test("reflects a guided new map before enabling unrestricted editing and save", async () => {
    const save = vi.fn().mockResolvedValue({ id: "symmetric", name: "Symmetric" });
    const repository: MapRepository = {
      list: vi.fn(),
      get: vi.fn(),
      save,
      update: vi.fn(),
      delete: vi.fn(),
    };
    const terrain = createDefaultBattlefield().map[0][0].terrain;
    const map = createHexMap(2, terrain);
    const source = map.flat().find((cell) =>
      getMapReflectionCellRole(cell.row, cell.column, 2, "vertical") === "source");
    const orange = mapTeamOptions.find((team) => team === "orange");
    const soldier = mapUnitOptions.find((unit) => unit === "soldier");
    if (!source || !orange || !soldier) throw new Error("Vertical reflection fixture is unavailable");
    map[source.row][source.column] = { ...source, team: orange, unit: soldier };

    render(
      <MapRepositoryProvider repository={repository}>
        <MemoryRouter>
          <Map initialMap={map} name="Symmetric" reflectionAxis="vertical" />
        </MemoryRouter>
      </MapRepositoryProvider>,
    );

    expect(screen.getByTestId("editable-count")).toHaveTextContent("3");
    expect(screen.getByTestId("axis-count")).toHaveTextContent("1");
    expect(screen.queryByRole("button", { name: 'Create map "Symmetric"' })).not.toBeInTheDocument();
    const flipCheckbox = screen.getByRole("checkbox", { name: "Flip reflected half vertically" });
    expect(flipCheckbox).not.toBeChecked();
    fireEvent.click(flipCheckbox);
    expect(flipCheckbox).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Reflect map" }));

    expect(screen.getByTestId("editable-count")).toHaveTextContent("7");
    expect(screen.queryByRole("button", { name: "Reflect map" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Flip reflected half vertically" }))
      .not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: 'Create map "Symmetric"' }));

    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    const savedMap = save.mock.calls[0]?.[0].map as HexMap;
    expect(savedMap.flat()).toEqual(expect.arrayContaining([
      expect.objectContaining({ team: "orange", unit: "soldier" }),
      expect.objectContaining({ team: "purple", unit: "soldier" }),
    ]));
    expect(savedMap[2][1]).toMatchObject({ team: "purple", unit: "soldier" });
  });
});
