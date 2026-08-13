import { canUnitCollectObjects, isObjectUnit } from "../objects";
import getRowAndColumn from "../map/getRowAndColumn";
import type { MapItem } from "../types";

const filterNeighborsForMovableCells = (
  unit: string,
  neighbors: number[],
  map: MapItem[][]
): number[] => {
  return neighbors.filter((neighbor: number) => {
    const [x,y] = getRowAndColumn(neighbor, map[0].length);
    const mapItem = map[x][y];
    return (
      mapItem.unit === "none" ||
      (isObjectUnit(mapItem.unit) && canUnitCollectObjects(unit))
    );
  });
};

export default filterNeighborsForMovableCells;
