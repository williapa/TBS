import { fireEvent, render, screen } from "@testing-library/react";
import { createHexMap, mapTerrainOptions } from "@TBS/game-setup";

import HexGrid from "./HexGrid";

describe("HexGrid editor states", () => {
  test("distinguishes axis cells without drawing a rectangular outline", () => {
    const plains = mapTerrainOptions.find((terrain) => terrain === "plains");
    if (!plains) throw new Error("Plains terrain fixture is unavailable");
    const map = createHexMap(2, plains);
    render(
      <HexGrid
        dimensions={{ width: 600, height: 500 }}
        getCellEditState={() => "axis"}
        mapData={map}
      />,
    );

    const axisCell = document.querySelector('[data-cell-id="0"]') as HTMLElement;
    expect(axisCell).toHaveStyle({ opacity: "0.58" });
    expect(axisCell.style.outline).toBe("");
  });

  test("does not open the cell editor for disabled cells", () => {
    const plains = mapTerrainOptions.find((terrain) => terrain === "plains");
    if (!plains) throw new Error("Plains terrain fixture is unavailable");
    const map = createHexMap(2, plains);
    const { rerender } = render(
      <HexGrid
        dimensions={{ width: 600, height: 500 }}
        getCellEditState={() => "disabled"}
        mapData={map}
      />,
    );

    fireEvent.click(document.querySelector('[data-row="0"][data-column="0"]') as Element);
    expect(screen.queryByLabelText("terrain")).not.toBeInTheDocument();

    rerender(
      <HexGrid
        dimensions={{ width: 600, height: 500 }}
        getCellEditState={() => "editable"}
        mapData={map}
      />,
    );
    fireEvent.click(document.querySelector('[data-row="0"][data-column="0"]') as Element);
    expect(screen.getByLabelText("terrain")).toBeInTheDocument();
  });
});
