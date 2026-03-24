import { MapItem, moveableOptions, gameActions } from "../types"

const isTurnOver = (team: "orange" | "purple", mapData: MapItem[][], gameAction: gameActions) => !(
    mapData.flat().filter(
      (mapItem: MapItem) => mapItem.team === team && !mapItem.moved && moveableOptions.indexOf(mapItem.unit) > -1
    ).length
  ) || gameAction === "end";

export default isTurnOver;
