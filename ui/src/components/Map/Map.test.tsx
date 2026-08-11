import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MapRepository, MapRepositoryProvider } from "../../maps";
import Map from "./Map";

jest.mock("../HexGrid/HexGrid", () => () => <div data-testid="hex-grid" />);
jest.mock("../../hooks/useWindowDimensions", () => () => ({ width: 1000, height: 800 }));

describe("map editor persistence", () => {
  test("saves through the local repository contract and navigates to maps", async () => {
    const save = jest.fn().mockResolvedValue({ id: "tiny", name: "Tiny" });
    const repository: MapRepository = {
      list: jest.fn(),
      get: jest.fn(),
      save,
      update: jest.fn(),
      delete: jest.fn(),
    };
    render(
      <MapRepositoryProvider repository={repository}>
        <MemoryRouter initialEntries={["/mapEditor"]}>
          <Routes>
            <Route path="/mapEditor" element={<Map name="Tiny" dimension={2} />} />
            <Route path="/maps" element={<h1>Saved maps</h1>} />
          </Routes>
        </MemoryRouter>
      </MapRepositoryProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: 'Create map "Tiny"' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: "Tiny" })));
    expect(await screen.findByRole("heading", { name: "Saved maps" })).toBeInTheDocument();
  });
});
