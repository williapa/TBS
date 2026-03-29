import {
  MapItem,
  objectUnitOptions,
  peopleUnitOptions,
  vehicleUnitOptions,
} from "../types";

export const MONEY_OBJECT_REWARD = 1000;
export const MISSILE_OBJECT_DAMAGE = 30;
export const NUKE_OBJECT_TARGET_DAMAGE = 50;
export const NUKE_OBJECT_SPLASH_DAMAGE = 25;

const consumableObjectUnits = objectUnitOptions.filter((unit) => unit !== "none");

export const isObjectUnit = (unit: string): unit is (typeof consumableObjectUnits)[number] =>
  consumableObjectUnits.includes(unit as (typeof consumableObjectUnits)[number]);

export const canUnitCollectObjects = (unit: string) =>
  peopleUnitOptions.includes(unit as (typeof peopleUnitOptions)[number]) ||
  vehicleUnitOptions.includes(unit as (typeof vehicleUnitOptions)[number]);

export const getConsumableObjectAtCell = (cell?: MapItem) =>
  cell && isObjectUnit(cell.unit) ? cell.unit : null;

