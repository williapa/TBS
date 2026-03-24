import getRowAndColumn from "../map/getRowAndColumn";
import { MapItem } from "../types";

const filterNeighborsForMovableCells = (neighbors: number[], map: MapItem[][]): number[] => {
  return neighbors.filter((neighbor: number) => {
    const [x,y] = getRowAndColumn(neighbor, map[0].length);
    const mapItem = map[x][y];
    return mapItem.unit === "none";
  });
};

export default filterNeighborsForMovableCells;
