import {
  MapItem,
  ObjectUnitOption,
  objectUnitOptions,
  peopleUnitOptions,
  vehicleUnitOptions,
} from "../types";

export const MONEY_OBJECT_REWARD = 1000;
export const MISSILE_OBJECT_DAMAGE = 30;
export const NUKE_OBJECT_TARGET_DAMAGE = 50;
export const NUKE_OBJECT_SPLASH_DAMAGE = 25;

const consumableObjectUnits: readonly ObjectUnitOption[] = ["missile", "money", "nuke"];

export const isObjectUnit = (unit: string): unit is ObjectUnitOption =>
  consumableObjectUnits.includes(unit as ObjectUnitOption);

export const canUnitCollectObjects = (unit: string) =>
  peopleUnitOptions.includes(unit as (typeof peopleUnitOptions)[number]) ||
  vehicleUnitOptions.includes(unit as (typeof vehicleUnitOptions)[number]);

export const getConsumableObjectAtCell = (cell?: MapItem) =>
  cell && isObjectUnit(cell.unit) ? cell.unit : null;

