import getUnitIncome from "../income/getUnitIncome";
import type { MapItem, TeamOption } from "../types";

export const getIncomeForTeam = (map: MapItem[][], team: TeamOption): number => 
  map.reduce(
    (total, row) =>
      total +
      row.reduce((rowTotal, item) => {
        if (item.team !== team) return rowTotal;
        return rowTotal + getUnitIncome(item);
      }, 0),
    0
  );
