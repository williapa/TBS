import getRowAndColumn from "./getRowAndColumn";
import { getNeighbors } from "./getNeighbors";

const generateHexagonalGrid = (width: number): number[][] => {
  const grid: number[][] = [];
  const maxRowSize = (2 * width) -1;
  let index = 0;
  let rowLength = width - 1;
  let flip = false;

  for (let rowIndex = 1; rowIndex <= maxRowSize; rowIndex++) {
    rowLength = flip ? rowLength - 1 : rowLength + 1;

    if (rowLength >= maxRowSize) flip = true;

    const row: number[] = [];

    for (let columnIndex = 0; columnIndex < rowLength; columnIndex++) {
      row.push(index++);
    }

    grid.push(row);
  }

  return grid;
}

const defaultObj = {
  color: "blue"
};

export const generateHexagonalCellGrid = (width: number, defaultValues: any = defaultObj) => {

  const simpleGrid = generateHexagonalGrid(width);

  return simpleGrid.map((numberRow: number[]) => {

    return numberRow.map((num: number) => {

      const rowAndColumn = getRowAndColumn(num, width);

      return {
        ...defaultValues,
        index: num,
        row: rowAndColumn[0],
        column: rowAndColumn[1],
        neighbors: getNeighbors(simpleGrid, num)
      };
      
    });

  });

};

export default generateHexagonalGrid;
