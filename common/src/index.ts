import validateUser from "./validation/validateUser";
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
import getSpawnOptions from "./spawn/getSpawnOptions";
import getSpawnableCells from "./spawn/getSpawnableCells";
import {
  buildingUnitOptions,
  moveableOptions,
  MapItem,
  Coords,
  GameEvent,
  GameAction,
  SpawnOption,
  SpawnableUnitOption,
  supportedActions,
  TerrainOption,
  teamOptions,
  TeamOption,
  winConditions,
  WinCondition,
} from "./types";

export {
  attackUnit,
  checkForDead,
  checkMapHasCapitals,
  checkMapHasMovableCombatUnits,
  Coords,
  getAllCellsWhichCanBeReached,
  getAttackableCells,
  getIncomeForTeam,
  getSpawnOptions,
  getSpawnableCells,
  getTeamForPlayer,
  getUnitIncome,
  getWinningTeam,
  GameEvent,
  GameAction,
  isTurnOver,
  MapItem,
  SpawnOption,
  SpawnableUnitOption,
  TerrainOption,
  buildingUnitOptions,
  moveableOptions,
  moveMapUnit,
  startingMoney,
  supportedActions,
  teamOptions,
  TeamOption,
  validateUser,
  winConditions,
  WinCondition
};
