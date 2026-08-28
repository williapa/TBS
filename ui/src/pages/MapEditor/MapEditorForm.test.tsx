import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MapEditorForm, { CLIENT_MAX_MAP_SIDE } from "./MapEditorForm";

describe("MapEditorForm", () => {
  test("rejects map side widths above the client limit", () => {
    const submit = vi.fn();
    render(<MapEditorForm submit={submit} />);

    fireEvent.change(screen.getByLabelText("Map name"), { target: { value: "Large map" } });
    fireEvent.change(screen.getByLabelText("Hexagon side width"), {
      target: { value: String(CLIENT_MAX_MAP_SIDE + 1) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Go to map editor" }));

    expect(screen.getByText(`Enter a whole number between 2 and ${CLIENT_MAX_MAP_SIDE}.`))
      .toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  test("submits a map at the client limit", () => {
    const submit = vi.fn();
    render(<MapEditorForm submit={submit} />);

    fireEvent.change(screen.getByLabelText("Map name"), { target: { value: "Largest map" } });
    fireEvent.click(screen.getByRole("button", { name: "Go to map editor" }));

    expect(submit).toHaveBeenCalledWith({
      defaultTerrain: "forest",
      dimension: CLIENT_MAX_MAP_SIDE,
      name: "Largest map",
      reflectionAxis: "vertical",
      submitted: true,
    });
  });

  test("allows diagonal reflection for a new map", async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    render(<MapEditorForm submit={submit} />);

    fireEvent.change(screen.getByLabelText("Map name"), { target: { value: "Diagonal map" } });
    await user.click(screen.getByLabelText("Reflection line"));
    await user.click(await screen.findByRole("option", { name: "Diagonal" }));
    await user.click(screen.getByRole("button", { name: "Go to map editor" }));

    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ reflectionAxis: "diagonal" }));
  });
});
