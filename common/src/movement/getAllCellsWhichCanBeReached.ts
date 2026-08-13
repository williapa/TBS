import { isObjectUnit } from "../objects";
import type { MapItem} from "../types";
// import canUnitAttack from "./canUnitAttack";
import getDefaultUnitEnergy from "./getDefaultUnitEnergy";
import filterNeighborsForMovableCells from "./filterNeighborsForMovableCells";
import filterNeighborsForReachableCells from "./filterNeighborsForReachableCells";
import getTerrainUnitMovementCost from "./getTerrainUnitMovementCost";
import getRowAndColumn from "../map/getRowAndColumn";

// helper function to get the cell object for a given cell index
const getCellFromIndex = (index: number, boardCells: MapItem[][]) => {
  const [x,y] = getRowAndColumn(index, boardCells[0].length);
  return boardCells[x][y];
};

const getAllCellsWhichCanBeReached = (startingUnitIndex: number, boardCells: MapItem[][]) => {
  const initialUnitType = getCellFromIndex(startingUnitIndex, boardCells).unit;
  const visited = new Set<number>(); // to keep track of visited cells
  const reachableCells = new Set<number>(); // to keep track of reachable cells
  const queue: [number, number][] = [[startingUnitIndex, getDefaultUnitEnergy(initialUnitType)]]; // initialize the queue with the starting unit index and its energy

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const [currentIndex, currentEnergy] = current; // get the next cell from the queue
    visited.add(currentIndex); // mark the cell as visited
    const currentCell = getCellFromIndex(currentIndex, boardCells); // get the current cell object
    const movableNeighbors = filterNeighborsForMovableCells(initialUnitType, currentCell.neighbors || [], boardCells); // filter the default neighbors for movable indexes
    const reachableNeighbors = filterNeighborsForReachableCells(initialUnitType, currentEnergy, movableNeighbors, boardCells); // filter the neighbors for reachable cells

    reachableNeighbors.forEach((neighborIndex) => {
      if (!visited.has(neighborIndex)) { // if the neighbor has not been visited yet
        reachableCells.add(neighborIndex); // add the neighbor to the reachable cells
        const neighborCell = getCellFromIndex(neighborIndex, boardCells); // get the neighbor cell object
        if (!isObjectUnit(neighborCell.unit)) {
          const neighborEnergy = currentEnergy - getTerrainUnitMovementCost(initialUnitType, neighborCell.terrain); // calculate the remaining energy after moving to the neighbor cell
          queue.push([neighborIndex, neighborEnergy]); // add the neighbor to the queue with its remaining energy
        }
      }
    });
  }

  return Array.from(reachableCells); // convert the reachable cells set to an array
};

export default getAllCellsWhichCanBeReached;
