import getRowAndColumn from "../map/getRowAndColumn";
import type { MapItem } from "../types";
import getTerrainUnitMovementCost from "../movement/getTerrainUnitMovementCost";

const filterNeighborsForReachableCells = (unit: string, availableEnergy: number, neighbors: number[], map: MapItem[][]) => {
  const width = map[0].length;
  return neighbors.filter((index: number) => {
    const [x,y] = getRowAndColumn(index, width);
    const { terrain } = map[x][y];
    return getTerrainUnitMovementCost(unit, terrain) <= availableEnergy;
  });
};

export default filterNeighborsForReachableCells;
