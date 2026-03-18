import getRowAndColumn from "./getRowAndColumn";

type NA = number[];

const addRowNeighbors = (selectedIndex: number, selectedRow: NA, neighborRow: NA, neighbors: NA, add = false): NA => {

  const offsets = [selectedRow.length, neighborRow.length];

  offsets.forEach((offset) => {
    const val = add ? selectedIndex + offset : selectedIndex - offset;
    neighborRow.includes(val) && neighbors.push(val);
  });

  return neighbors;

};

export const getMapNeighbors = (grid: MapItem[][], cellIndex: number): number[] => {
  const convertedMap = grid.map((row: MapItem[]) => row.map((cell: MapItem) => cell.index));
  return getNeighbors(convertedMap, cellIndex);
};

export const getNeighbors = (grid: number[][], cellIndex: number): number[] => {

  const [cellIndexRow] = getRowAndColumn(cellIndex, grid[0].length);
  const selectedRow = grid[cellIndexRow];

  let neighbors: number[] = [];

  // row above
  if (cellIndexRow > 0) {
    const rowAbove = grid[cellIndexRow - 1]
    neighbors = addRowNeighbors(cellIndex, selectedRow, rowAbove, neighbors);
  }

  // current row
  selectedRow.includes(cellIndex + 1) && neighbors.push(cellIndex + 1);
  selectedRow.includes(cellIndex - 1) && neighbors.push(cellIndex - 1);

  // row below
  if (cellIndexRow < grid.length - 1) {
    const rowBelow = grid[cellIndexRow + 1];
    neighbors = addRowNeighbors(cellIndex, selectedRow, rowBelow, neighbors, true);
  }
  
  // check for mistakes
  if (neighbors.length > 6) {
    console.log(neighbors);
    throw new Error("something is broken with get neighbors - there are more than 6 neighbors.");
  }

  return neighbors;
  
};