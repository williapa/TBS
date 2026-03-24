import { Coords, MapItem } from "../types"

const moveMapUnit = (mapData: MapItem[][], start: Coords, end: Coords) => {
  if (start.x === end.x && start.y === end.y) {
    return mapData;
  }
  const newItem = { ...mapData[end.x][end.y] };
  const oldItem = { ...mapData[start.x][start.y] };
  newItem.team = oldItem.team;
  newItem.unit = oldItem.unit;
  newItem.moved = true;
  newItem.damage = oldItem.damage;
  oldItem.team = "gray";
  oldItem.unit = "none";
  oldItem.damage = undefined;
  mapData[end.x][end.y] = newItem;
  mapData[start.x][start.y] = oldItem;
  return mapData;
};

export default moveMapUnit;
