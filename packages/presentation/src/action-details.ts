import type { UnitTypeId } from "@TBS/game-core";
import {
  getProductionOptions,
  getUnitDefinition,
  MISSILE_OBJECT_DAMAGE,
  NUKE_OBJECT_SPLASH_DAMAGE,
  NUKE_OBJECT_TARGET_DAMAGE,
  type UnitCapability,
} from "@TBS/game-rules";

export type UnitPanelActionId =
  | "attack"
  | "boost"
  | "construct"
  | "heal"
  | "load"
  | "missile"
  | "move"
  | "nuke"
  | "priest"
  | "spawn"
  | "studentAthlete"
  | "unload"
  | "zuckerbird";

export type UnitPanelActionViewModel = Readonly<{
  id: UnitPanelActionId;
  label: string;
  description: string;
}>;

const actionDetails: Readonly<Record<UnitPanelActionId, Readonly<{
  label: string;
  description: string;
}>>> = {
  attack: {
    label: "Attack",
    description: "Initiate combat with an adjacent unit, dealing damage first. If enemy is not killed, it will deal retaliatory damage.",
  },
  boost: {
    label: "Boost",
    description: "Boost the combat stats of an allied unit.",
  },
  construct: {
    label: "Construct",
    description: "create a building at an adjacent target cell for a monetary cost.",
  },
  heal: {
    label: "Heal",
    description: "Increase the health of a damaged unit",
  },
  load: {
    label: "Load",
    description: "occupy an allied vehicle unit, moving wherever it goes until unloaded.",
  },
  missile: {
    label: "Missile",
    description: `Launch a projectile dealing ${MISSILE_OBJECT_DAMAGE} damage to a target enemy unit.`,
  },
  move: {
    label: "Move",
    description: "Traverse empty map cells based on the unit's available energy and the energy cost of the terrain of cells in its path.",
  },
  nuke: {
    label: "Nuke",
    description: `Launch a bomb dealing ${NUKE_OBJECT_TARGET_DAMAGE} damage to the target enemy unit, and ${NUKE_OBJECT_SPLASH_DAMAGE} to all adjacent units.`,
  },
  priest: {
    label: "Priest",
    description: "Protect all allied units against missile and nuke damage, neutralizing these projectiles.",
  },
  spawn: {
    label: "Spawn",
    description: "Create a new unit on an empty adjacent cell for a monetary cost.",
  },
  studentAthlete: {
    label: "Student Athlete",
    description: "Student athletes receive a combat bonus against enemy Michael Jackson units, but are susceptible to attacks by vehicle units.",
  },
  unload: {
    label: "Unload",
    description: "Drop a unit being transnported on a valid adjacent cell.",
  },
  zuckerbird: {
    label: "Zuckerbird",
    description: "Zuckerbirds receive a powerful combat bonus against enemy capitals, toppling unfriendly governments. It also receives a significant defense bonus against dragons.",
  },
};

const actionByCapability: Readonly<Partial<Record<UnitCapability, UnitPanelActionId>>> = {
  attack: "attack",
  boost: "boost",
  construct: "construct",
  heal: "heal",
  loadable: "load",
  move: "move",
  spawn: "spawn",
  transport: "unload",
};

const actionByAbility: Readonly<Record<string, UnitPanelActionId | undefined>> = {
  missile: "missile",
  nuke: "nuke",
  "projectile-shield": "priest",
  "student-athlete-matchup": "studentAthlete",
  "zuckerbird-matchup": "zuckerbird",
};

const targetGroupByAbility: Readonly<Record<string, string | undefined>> = {
  "boost-animals": "animals that are not already boosted",
  "boost-buildings": "buildings that are not already boosted",
  "boost-people": "people that are not already boosted",
  "heal-buildings": "damaged buildings",
  "heal-flying": "damaged flying units",
  "heal-ground-vehicles": "damaged ground vehicles",
  "heal-people": "damaged people",
};

const descriptionForAction = (
  actionId: UnitPanelActionId,
  abilities: readonly string[],
): string => {
  const baseText = actionDetails[actionId].description;
  if (actionId !== "boost" && actionId !== "heal") return baseText;
  const targetGroup = abilities.map((ability) => targetGroupByAbility[ability]).find(Boolean);
  return targetGroup
    ? `${baseText} Valid targets: adjacent allied ${targetGroup}.`
    : baseText;
};

export const presentUnitActions = (unitTypeId: UnitTypeId): readonly UnitPanelActionViewModel[] => {
  const definition = getUnitDefinition(unitTypeId);
  if (!definition) return [];
  const actionIds = definition.capabilities.flatMap((capability) => {
    const actionId = actionByCapability[capability];
    if (!actionId) return [];
    if (actionId === "spawn" && getProductionOptions(unitTypeId).length === 0) return [];
    return [actionId];
  });
  actionIds.push(...definition.abilities.flatMap((ability) => actionByAbility[ability] ?? []));
  return actionIds
    .filter((actionId, index, values) => values.indexOf(actionId) === index)
    .map((actionId) => ({
      id: actionId,
      label: actionDetails[actionId].label,
      description: descriptionForAction(actionId, definition.abilities),
    }));
};
