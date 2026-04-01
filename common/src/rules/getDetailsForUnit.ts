import { 
  animalUnitOptions,
  buildingUnitOptions,
  BuildingUnitOption,
  objectUnitOptions,
  peopleUnitOptions,
  vehicleUnitOptions,
  ObjectUnitOption
} from "../types";
import { canUnitBoost } from "../boost";
import { canUnitHeal } from "../heal";
import { MISSILE_OBJECT_DAMAGE, NUKE_OBJECT_SPLASH_DAMAGE, NUKE_OBJECT_TARGET_DAMAGE } from "../objects";

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

export const getActionsForUnit = (unit: string): string[] => {

  const allowedActions = [];

  if (animalUnitOptions.includes(unit)) {

    allowedActions.push(...defaultActionsByGroup["animal"]);

  } else if (buildingUnitOptions.includes(unit as BuildingUnitOption)) {

    allowedActions.push(...defaultActionsByGroup["building"]);

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
