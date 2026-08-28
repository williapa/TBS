import { fireEvent, render, screen } from "@testing-library/react";
import { createHexMap, mapTerrainOptions } from "@TBS/game-setup";
import EditCellForm from "./EditCellForm";

describe("EditCellForm", () => {
  const forest = mapTerrainOptions.find((terrain) => terrain === "forest");
  const water = mapTerrainOptions.find((terrain) => terrain === "water");
  if (!forest || !water) throw new Error("Standard terrain options are unavailable");
  const initialValues = createHexMap(2, forest)[0][0];

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
});
