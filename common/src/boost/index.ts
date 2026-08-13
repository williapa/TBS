import type {
  MapItem} from "../types";
import {
  animalUnitOptions,
  buildingUnitOptions,
  peopleUnitOptions,
} from "../types";

export const boostTargetGroups = {
  bluesMusician: peopleUnitOptions as readonly string[],
  scientist: buildingUnitOptions as readonly string[],
  zookeeper: animalUnitOptions as readonly string[],
} as const;

export const canUnitBoost = (unit: string) => unit in boostTargetGroups;

export const canReceiveBoost = (boosterUnit: string, targetUnit: string) => {
  if (!(boosterUnit in boostTargetGroups)) {
    return false;
  }

  return boostTargetGroups[boosterUnit as keyof typeof boostTargetGroups].includes(targetUnit);
};

export const getBoostableCellIndexes = (
  map: MapItem[][],
  actorCell: MapItem | undefined,
  perspective: string
) => {
  if (!actorCell || actorCell.team !== perspective || !canUnitBoost(actorCell.unit)) {
    return [];
  }

  return (actorCell.neighbors ?? []).filter((neighborIndex) => {
    const neighborCell = map.flat().find((cell) => cell.index === neighborIndex);

    return Boolean(
      neighborCell &&
        neighborCell.team === perspective &&
        neighborCell.unit !== "none" &&
        !neighborCell.boosted &&
        canReceiveBoost(actorCell.unit, neighborCell.unit)
    );
  });
};
