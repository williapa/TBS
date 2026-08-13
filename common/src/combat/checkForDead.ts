import type { MapItem, Coords } from "../types";

export const checkForDead = (
  map: MapItem[][],
  attackerEndPosition: Coords,
  defenderEndPosition: Coords
) => {
  const attackerDied =
    map[attackerEndPosition.x][attackerEndPosition.y].unit === "none";
  const defenderDied =
    map[defenderEndPosition.x][defenderEndPosition.y].unit === "none";
  return [attackerDied, defenderDied];
};
