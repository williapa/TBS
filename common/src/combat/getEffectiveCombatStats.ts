import { MapItem, vehicleUnitOptions } from "../types";
import getCombatStats from "./getCombatStats";

type CombatStats = [number, number];

type SpecialCombatRule = {
  unit: string;
  matches: (opponent: MapItem) => boolean;
  stats: CombatStats;
};

const specialCombatRules: SpecialCombatRule[] = [
  {
    unit: "studentAthlete",
    matches: (opponent) => opponent.unit === "michaelJackson",
    stats: [100, 100]
  },
  {
    unit: "studentAthlete",
    matches: (opponent) => vehicleUnitOptions.includes(opponent.unit),
    stats: [10, 0]
  },
  {
    unit: "zuckerbird",
    matches: (opponent) => opponent.unit === "capital",
    stats: [100, 8]
  },
  {
    unit: "zuckerbird",
    matches: (opponent) => opponent.unit === "dragon",
    stats: [8, 100]
  }
];

const getEffectiveCombatStats = (item: MapItem, opponent: MapItem): CombatStats => {
  const matchingRule = specialCombatRules.find(
    (rule) => rule.unit === item.unit && rule.matches(opponent)
  );

  return matchingRule?.stats ?? getCombatStats(item);
};

export default getEffectiveCombatStats;
