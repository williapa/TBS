import generateHexagonalGrid from "./buildHexagon";

const getRowAndColumn = (index: number, width: number): number[] => {

  if (index < width) return [0, index];

  const grid = generateHexagonalGrid(width);

  let rowIndex = 0;

  do {
    rowIndex++;
    const columnIndex = grid[rowIndex].indexOf(index)
    if (columnIndex > -1) {
      return [rowIndex, columnIndex]
    }
  } while (rowIndex < grid.length);

  return [rowIndex, width-1];

};

export default getRowAndColumn;