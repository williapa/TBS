import moveMapUnit from "./movement/moveMapUnit";
import isTurnOver from "./rules/isTurnOver";
import getAllCellsWhichCanBeReached from "./movement/getAllCellsWhichCanBeReached";
import getAttackableCells from "./combat/getAttackableCells";
import attackUnit from "./combat/attackUnit";
import checkMapHasCapitals from "./map/checkMapHasCapitals";
import checkMapHasMovableCombatUnits from "./map/checkMapHasMovableCombatUnits";
import getWinningTeam from "./rules/getWinningTeam";
import getUnitIncome from "./income/getUnitIncome";
import { getIncomeForTeam } from "./income/getIncomeForTeam";
import { getTeamForPlayer } from "./rules/getTeamForPlayer";
import { startingMoney } from "./income/startingMoney";
import { checkForDead } from "./combat/checkForDead";
import getConstructionOptions from "./construction/getConstructionOptions";
import getConstructableCells from "./construction/getConstructableCells";
import {
  canUnitCollectObjects,
  getConsumableObjectAtCell,
  isObjectUnit,
  MISSILE_OBJECT_DAMAGE,
  MONEY_OBJECT_REWARD,
  NUKE_OBJECT_SPLASH_DAMAGE,
  NUKE_OBJECT_TARGET_DAMAGE,
} from "./objects";
import getSpawnOptions from "./spawn/getSpawnOptions";
import getSpawnableCells from "./spawn/getSpawnableCells";
import { canReceiveBoost, canUnitBoost, getBoostableCellIndexes } from "./boost";
import { canReceiveHeal, canUnitHeal, getHealableCellIndexes, HEAL_AMOUNT } from "./heal";
import getCombatStats from "./combat/getCombatStats";
import getEffectiveCombatStats from "./combat/getEffectiveCombatStats";
import getDefaultUnitEnergy from "./movement/getDefaultUnitEnergy";
import getTerrainUnitMovementCost from "./movement/getTerrainUnitMovementCost";
import {
  getActionDetailsForUnit,
  getActionDetailsText,
  getActionsForUnit,
} from "./rules/getDetailsForUnit";
import {
  animalUnitOptions,
  AnimalUnitOption,
  buildingUnitOptions,
  BuildingUnitOption,
  ConstructionOption,
  moveableOptions,
  MapItem,
  objectUnitOptions,
  ObjectUnitOption,
  PeopleUnitOption,
  peopleUnitOptions,
  Coords,
  GameEvent,
  GameAction,
  SpawnOption,
  SpawnableUnitOption,
  supportedActions,
  TerrainOptions,
  TerrainOption,
  teamOptions,
  TeamOption,
  TeamColor,
  UnitOption,
  VehicleUnitOption,
  vehicleUnitOptions,
  winConditions,
  WinCondition,
} from "./types";

export {
  animalUnitOptions,
  AnimalUnitOption,
  attackUnit,
  checkForDead,
  checkMapHasCapitals,
  checkMapHasMovableCombatUnits,
  ConstructionOption,
  BuildingUnitOption,
  canReceiveBoost,
  canReceiveHeal,
  canUnitBoost,
  canUnitHeal,
  Coords,
  getActionDetailsForUnit,
  getActionDetailsText,
  getActionsForUnit,
  canUnitCollectObjects,
  getBoostableCellIndexes,
  getAllCellsWhichCanBeReached,
  getAttackableCells,
  getCombatStats,
  getConstructionOptions,
  getDefaultUnitEnergy,
  getEffectiveCombatStats,
  getConsumableObjectAtCell,
  getConstructableCells,
  getHealableCellIndexes,
  HEAL_AMOUNT,
  getIncomeForTeam,
  getTerrainUnitMovementCost,
  isObjectUnit,
  getSpawnOptions,
  getSpawnableCells,
  getTeamForPlayer,
  getUnitIncome,
  getWinningTeam,
  GameEvent,
  GameAction,
  isTurnOver,
  MapItem,
  MISSILE_OBJECT_DAMAGE,
  MONEY_OBJECT_REWARD,
  NUKE_OBJECT_SPLASH_DAMAGE,
  NUKE_OBJECT_TARGET_DAMAGE,
  ObjectUnitOption,
  PeopleUnitOption,
  SpawnOption,
  SpawnableUnitOption,
  TerrainOptions,
  TerrainOption,
  buildingUnitOptions,
  moveableOptions,
  objectUnitOptions,
  peopleUnitOptions,
  moveMapUnit,
  startingMoney,
  supportedActions,
  teamOptions,
  TeamOption,
  TeamColor,
  UnitOption,
  vehicleUnitOptions,
  VehicleUnitOption,
  winConditions,
  WinCondition
};

export * from "./contracts/types";
export * from "./contracts/parsers";
export * from "./contracts/fixtures";
export { default as applyGameAction } from "./engine/applyGameAction";
