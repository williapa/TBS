import getSpawnOptions from "../spawn/getSpawnOptions";
import type {
  MapItem,
  gameActions} from "../types";
import {
  moveableOptions,
  buildingUnitOptions,
} from "../types";

const isTurnOver = (
  team: "orange" | "purple",
  mapData: MapItem[][],
  gameAction: gameActions,
  availableFunds: number
) => !(
    mapData.flat().filter((mapItem: MapItem) => {
      if (mapItem.team !== team || mapItem.moved) {
        return false;
      }

      if (moveableOptions.indexOf(mapItem.unit) > -1) {
        return true;
      }

      if (buildingUnitOptions.indexOf(mapItem.unit as typeof buildingUnitOptions[number]) > -1) {
        return getSpawnOptions(mapItem.unit, availableFunds).length > 0;
      }

      return false;
    }).length
  ) || gameAction === "end";

export default isTurnOver;
