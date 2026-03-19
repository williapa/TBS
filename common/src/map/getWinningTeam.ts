import { MapItem, teamOptions, TeamOption, WinCondition, winConditions } from "../types";
import checkMapHasCapitals from "./checkMapHasCapitals";
import checkMapHasMovableCombatUnits from "./checkMapHasMovableCombatUnits";

const getWinningTeam = (
  map: MapItem[][],
  winCondition: WinCondition
): TeamOption | undefined => {
  const teamsWithMovableCombatUnits = checkMapHasMovableCombatUnits(map);
  const missingMovableCombatUnitTeams = teamOptions.filter(
    (team) => teamsWithMovableCombatUnits.indexOf(team) < 0
  );

  if (missingMovableCombatUnitTeams.length === 1) {
    return missingMovableCombatUnitTeams[0] === "orange" ? "purple" : "orange";
  }

  if (winCondition !== winConditions.CAPITAL_OR_ELIMINATION) {
    return undefined;
  }

  const teamsWithCapitals = checkMapHasCapitals(map);
  const missingCapitalTeams = teamOptions.filter(
    (team) => teamsWithCapitals.indexOf(team) < 0
  );

  if (missingCapitalTeams.length === 1) {
    return missingCapitalTeams[0] === "orange" ? "purple" : "orange";
  }

  return undefined;
};

export default getWinningTeam;
