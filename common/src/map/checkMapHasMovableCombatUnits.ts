import { MapItem, moveableOptions, teamOptions, TeamOption } from "../types";
import canUnitAttack from "../combat/canUnitAttack";

const checkMapHasMovableCombatUnits = (map: MapItem[][]): TeamOption[] => {
  if (!Array.isArray(map)) {
    return [];
  }

  const teamsWithMovableCombatUnits = new Set<TeamOption>();

  for (const row of map) {
    for (const cell of row) {
      const team = cell?.team as TeamOption;
      const unit = cell?.unit as string;
      const isPlayableTeam = teamOptions.indexOf(team) > -1;
      const isMovable = moveableOptions.indexOf(unit) > -1;
      const isCombatUnit = canUnitAttack(unit);

      if (isPlayableTeam && isMovable && isCombatUnit) {
        teamsWithMovableCombatUnits.add(team);
      }
    }
  }

  return teamOptions.filter((team) => teamsWithMovableCombatUnits.has(team));
};

export default checkMapHasMovableCombatUnits;
