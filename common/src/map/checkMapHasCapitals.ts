import { MapItem, teamOptions, TeamOption } from "../types";

const checkMapHasCapitals = (map: MapItem[][]): TeamOption[] => {
  if (!Array.isArray(map)) {
    return [];
  }

  const teamsWithCapitals = new Set<TeamOption>();

  for (const row of map) {
    for (const cell of row) {
      const team = cell?.team;
      if (
        cell?.unit === "capital" &&
        teamOptions.indexOf(team as TeamOption) > -1
      ) {
        teamsWithCapitals.add(team as TeamOption);
      }
    }
  }

  return teamOptions.filter((team) => teamsWithCapitals.has(team));
};

export default checkMapHasCapitals;
