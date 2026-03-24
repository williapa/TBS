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
import {
  moveableOptions,
  MapItem,
  Coords,
  GameAction,
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
  getTeamForPlayer,
  getUnitIncome,
  getWinningTeam,
  GameAction,
  isTurnOver,
  MapItem,
  moveableOptions,
  moveMapUnit,
  startingMoney,
  teamOptions,
  TeamOption,
  validateUser,
  winConditions,
  WinCondition
};
