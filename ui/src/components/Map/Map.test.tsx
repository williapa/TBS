import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createDefaultBattlefield } from "@TBS/game-setup";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MapRepository} from "../../maps";
import { MapRepositoryProvider } from "../../maps";
import Map from "./Map";

vi.mock("../HexGrid/HexGrid", () => ({ default: () => <div data-testid="hex-grid" /> }));
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
            <Route path="/" element={<h1>Start a game</h1>} />
          </Routes>
        </MemoryRouter>
      </MapRepositoryProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: 'Create map "Tiny"' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: "Tiny" })));
    expect(await screen.findByRole("heading", { name: "Start a game" })).toBeInTheDocument();
  });
});
