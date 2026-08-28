import { fireEvent, render, screen } from "@testing-library/react";
import { createHexMap, mapTeamOptions, mapTerrainOptions, mapUnitOptions } from "@TBS/game-setup";
import EditCellForm from "./EditCellForm";

describe("EditCellForm", () => {
  const forest = mapTerrainOptions.find((terrain) => terrain === "forest");
  const water = mapTerrainOptions.find((terrain) => terrain === "water");
  if (!forest || !water) throw new Error("Standard terrain options are unavailable");
  const initialValues = createHexMap(2, forest)[0][0];
  const purple = mapTeamOptions.find((team) => team === "purple");
  const soldier = mapUnitOptions.find((unit) => unit === "soldier");
  if (!purple || !soldier) throw new Error("Standard unit fixtures are unavailable");

  test("saves the complete cell immediately when a selection changes", () => {
    const save = vi.fn();

    render(
      <EditCellForm
        initialValues={initialValues}
        top={0}
        left={0}
        save={save}
        close={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("terrain"), { target: { value: water } });

    expect(save).toHaveBeenCalledWith({
      terrain: "water",
      unit: "none",
      team: "gray",
    });
    expect(screen.queryByRole("button", { name: /submit|cancel/i })).not.toBeInTheDocument();
  });

  test("closes without applying another change", () => {
    const save = vi.fn();
    const close = vi.fn();

    render(
      <EditCellForm
        initialValues={initialValues}
        top={0}
        left={0}
        save={save}
        close={close}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(close).toHaveBeenCalledOnce();
    expect(save).not.toHaveBeenCalled();
  });

  test("defaults a placed unit to orange and allows purple", () => {
    const save = vi.fn();
    render(
      <EditCellForm
        initialValues={initialValues}
        top={0}
        left={0}
        save={save}
        close={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("team")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("unit"), { target: { value: "soldier" } });
    expect(save).toHaveBeenLastCalledWith({ terrain: "forest", unit: "soldier", team: "orange" });

    fireEvent.change(screen.getByLabelText("team"), { target: { value: "purple" } });
    expect(save).toHaveBeenLastCalledWith({ terrain: "forest", unit: "soldier", team: "purple" });
  });

  test("hides team assignment and saves neutral ownership for objects", () => {
    const save = vi.fn();
    render(
      <EditCellForm
        initialValues={{ ...initialValues, unit: soldier, team: purple }}
        top={0}
        left={0}
        save={save}
        close={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("team")).toHaveValue("purple");
    fireEvent.change(screen.getByLabelText("unit"), { target: { value: "money" } });

    expect(screen.queryByLabelText("team")).not.toBeInTheDocument();
    expect(save).toHaveBeenLastCalledWith({ terrain: "forest", unit: "money", team: "gray" });
  });
});
