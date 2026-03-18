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
};

export default generateHexagonalGrid;
