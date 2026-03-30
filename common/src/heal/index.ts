import {
  buildingUnitOptions,
  flyingOptions,
  groundVehicleOptions,
  MapItem,
  peopleUnitOptions,
} from "../types";

export const HEAL_AMOUNT = 10;

const healTargetGroups = {
  ambulance: peopleUnitOptions as readonly string[],
  doctor: peopleUnitOptions as readonly string[],
  engineer: buildingUnitOptions as readonly string[],
  pilot: flyingOptions as readonly string[],
  worker: groundVehicleOptions as readonly string[],
} as const;

export const canUnitHeal = (unit: string) => unit in healTargetGroups;

export const canReceiveHeal = (healerUnit: string, targetUnit: string) => {
  if (!(healerUnit in healTargetGroups)) {
    return false;
  }

  return healTargetGroups[healerUnit as keyof typeof healTargetGroups].includes(targetUnit);
};

export const getHealableCellIndexes = (
  map: MapItem[][],
  actorCell: MapItem | undefined,
  perspective: string
) => {
  if (!actorCell || actorCell.team !== perspective || !canUnitHeal(actorCell.unit)) {
    return [];
  }

  return (actorCell.neighbors ?? []).filter((neighborIndex) => {
    const neighborCell = map.flat().find((cell) => cell.index === neighborIndex);

    return Boolean(
      neighborCell &&
        neighborCell.team === perspective &&
        neighborCell.unit !== "none" &&
        (neighborCell.damage || 0) > 0 &&
        canReceiveHeal(actorCell.unit, neighborCell.unit)
    );
  });
};
