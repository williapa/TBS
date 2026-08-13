import getSpawnOptions from "./getSpawnOptions";
import type {
  Coords,
  MapItem,
  SpawnableUnitOption,
} from "../types";

const getSpawnableCells = (
  mapData: MapItem[][],
  buildingCoords: Coords,
  unitType: SpawnableUnitOption
) => {
  const building = mapData[buildingCoords.x]?.[buildingCoords.y];

  if (!building) {
    return [];
  }

  const spawnOption = getSpawnOptions(building.unit, Number.MAX_SAFE_INTEGER)
    .find((option) => option.unit === unitType);

  if (!spawnOption) {
    return [];
  }

  const buildingNeighbors = new Set(building.neighbors ?? []);

  return mapData
    .flat()
    .filter((cell) =>
      buildingNeighbors.has(cell.index) &&
      cell.unit === "none" &&
      spawnOption.invalidTerrains.indexOf(cell.terrain) < 0
    )
    .map((cell) => cell.index);
};

export default getSpawnableCells;
