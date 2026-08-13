import type { MapItem } from "../types";
import getRowAndColumn from "../map/getRowAndColumn";
import canBeAttacked from "./canBeAttacked";

const getAttackableCells = (team: "orange" | "purple" | "gray", cellsInMovementRange: number[], map: MapItem[][]) => {

  const uniqueAttackableCells: number[] = [];

  if (team === "gray") return uniqueAttackableCells;
  
  for (const cellIndex of cellsInMovementRange) {

    const [x,y] = getRowAndColumn(cellIndex, map[0].length);
    
    const unit = map[x][y];
    
    const neighbors = unit.neighbors || [];

    for (const neighbor of neighbors) {

      const [ex,why] = getRowAndColumn(neighbor, map[0].length);

      const yewnit = map[ex][why];

      if (cellsInMovementRange.indexOf(yewnit.index) > -1) continue;

      if (uniqueAttackableCells.indexOf(yewnit.index) > -1) continue;

      if (yewnit.team === "gray" || yewnit.team === team) continue;
      
      if (!canBeAttacked(yewnit.unit)) continue;

      uniqueAttackableCells.push(yewnit.index);

    }

  }

  return uniqueAttackableCells;

};

export default getAttackableCells;
