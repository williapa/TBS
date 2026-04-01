import { 
  animalUnitOptions,
  buildingUnitOptions,
  BuildingUnitOption,
  objectUnitOptions,
  peopleUnitOptions,
  vehicleUnitOptions,
  ObjectUnitOption
} from "../types";
import { boostTargetGroups, canUnitBoost } from "../boost";
import { canUnitHeal, healTargetGroups } from "../heal";
import { MISSILE_OBJECT_DAMAGE, NUKE_OBJECT_SPLASH_DAMAGE, NUKE_OBJECT_TARGET_DAMAGE } from "../objects";
import getSpawnOptions from "../spawn/getSpawnOptions";

const defaultActionsByGroup = {
  animal: ["move", "attack"],
  building: ["spawn"],
  object: [],
  people: ["move", "attack", "load"],
  vehicle: ["move", "unload"],
};

const specialUnits = ["studentAthlete", "studentAthlete", "zuckerbird"];

export const detailsTextByAction = {
  attack: `Initiate combat with an adjacent unit, dealing damage first. If enemy is not killed, it will deal retaliatory damage.`,
  boost: `Boost the combat stats of an allied unit.`,
  construct: `create a building at an adjacent target cell for a monetary cost.`,
  heal: `Increase the health of a damaged unit`,
  load: `occupy an allied vehicle unit, moving wherever it goes until unloaded.`,
  missile: `Launch a projectile dealing ${MISSILE_OBJECT_DAMAGE} damage to a target enemy unit.`,
  move: `Traverse empty map cells based on the unit's available energy and the energy cost of the terrain of cells in its path.`,
  nuke: `Launch a bomb dealing ${NUKE_OBJECT_TARGET_DAMAGE} damage to the target enemy unit, and ${NUKE_OBJECT_SPLASH_DAMAGE} to all adjacent units.`,
  priest: `Protect all allied units against missile and nuke damage, neutralizing these projectiles.`,
  spawn: `Create a new unit on an empty adjacent cell for a monetary cost.`,
  studentAthlete: `Student athletes receive a combat bonus against enemy Michael Jackson units, but are susceptible to attacks by vehicle units.`,
  unload: `Drop a unit being transnported on a valid adjacent cell.`,
  zuckerbird: `Zuckerbirds receive a powerful combat bonus against enemy capitals, toppling unfriendly governments. It also receives a significant defense bonus against dragons.`,
};

const boostTargetTextByUnit = {
  bluesMusician: "people",
  scientist: "buildings",
  zookeeper: "animals",
} as const;

const healTargetTextByUnit = {
  ambulance: "people",
  doctor: "people",
  engineer: "buildings",
  pilot: "flying units",
  worker: "ground vehicles",
} as const;

const buildBoostTargetText = (targetGroup: string) =>
  `adjacent allied ${targetGroup} that are not already boosted`;

const buildHealTargetText = (targetGroup: string) =>
  `adjacent allied damaged ${targetGroup}`;

const getTargetTextForAction = (unit: string, action: string) => {
  if (action === "boost" && unit in boostTargetGroups) {
    return buildBoostTargetText(boostTargetTextByUnit[unit as keyof typeof boostTargetTextByUnit]);
  }

  if (action === "heal" && unit in healTargetGroups) {
    return buildHealTargetText(healTargetTextByUnit[unit as keyof typeof healTargetTextByUnit]);
  }

  return null;
};

export const getActionDetailsText = (action: string, unit?: string) => {
  const baseText = detailsTextByAction[action as keyof typeof detailsTextByAction] ?? "";

  if (!unit) {
    return baseText;
  }

  const targetText = getTargetTextForAction(unit, action);

  if (!targetText) {
    return baseText;
  }

  return `${baseText} Valid targets: ${targetText}.`;
};

export const getActionDetailsForUnit = (unit: string) =>
  getActionsForUnit(unit).reduce<Record<string, string>>((detailsByAction, action) => {
    detailsByAction[action] = getActionDetailsText(action, unit);
    return detailsByAction;
  }, {});

export const getActionsForUnit = (unit: string): string[] => {

  const allowedActions = [];

  if (animalUnitOptions.includes(unit)) {

    allowedActions.push(...defaultActionsByGroup["animal"]);

  } else if (buildingUnitOptions.includes(unit as BuildingUnitOption)) {

    if (getSpawnOptions(unit as BuildingUnitOption, Number.MAX_SAFE_INTEGER).length > 0) {
      allowedActions.push(...defaultActionsByGroup["building"]);
    }

  } else if (objectUnitOptions.includes(unit as ObjectUnitOption)) {

    allowedActions.push(unit);

  } else if (vehicleUnitOptions.includes(unit)) {

    allowedActions.push(...defaultActionsByGroup["vehicle"]);

    if (unit === "ambulance") {

      allowedActions.push("heal");

    }

  } else if (peopleUnitOptions.includes(unit)) {

    allowedActions.push(...defaultActionsByGroup["people"]);

    if (canUnitBoost(unit)) {

      allowedActions.push("boost");

    }

    if (canUnitHeal(unit)) {
    
      allowedActions.push("heal");
    
    }

    if (unit === "constructionWorker") {

      allowedActions.push("construct");
    
    }

    // construction worker is not a special; special includes bonus combat scenarios for specific units.
    if (specialUnits.includes(unit)) {
      // special descriptions are listed by the unit name
      allowedActions.push(unit);

    }
    
  }

  return allowedActions;

};
