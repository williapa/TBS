import getConstructionOptions from "./getConstructionOptions";
import {
  BuildingUnitOption,
  Coords,
  MapItem,
} from "../types";

const getConstructableCells = (
  mapData: MapItem[][],
  workerCoords: Coords,
  buildingType: BuildingUnitOption
) => {
  const worker = mapData[workerCoords.x]?.[workerCoords.y];

  if (!worker) {
    return [];
  }

  const constructionOption = getConstructionOptions(Number.MAX_SAFE_INTEGER)
    .find((option) => option.building === buildingType);

  if (!constructionOption) {
    return [];
  }

  const workerNeighbors = new Set(worker.neighbors ?? []);

  return mapData
    .flat()
    .filter((cell) =>
      workerNeighbors.has(cell.index) &&
      cell.unit === "none" &&
      constructionOption.invalidTerrains.indexOf(cell.terrain) < 0
    )
    .map((cell) => cell.index);
};

export default getConstructableCells;
