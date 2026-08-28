import { standardTeamIds, standardUnits } from "@TBS/game-rules";

import type { MapTeamId, MapUnitTypeId } from "../contracts";

const orangeTeam = standardTeamIds.find((team) => team === "orange");
if (!orangeTeam) throw new Error("Standard map editing requires the orange team");

export const mapPlayerTeamOptions = standardTeamIds;
export const defaultPlacedUnitTeam = orangeTeam;

export const isObjectMapUnit = (unit: MapUnitTypeId): boolean =>
  unit !== "none" && standardUnits.get(unit)?.category === "object";

export const normalizeMapUnitTeam = (
  unit: MapUnitTypeId,
  team: MapTeamId,
): MapTeamId => {
  if (unit === "none" || isObjectMapUnit(unit)) return "gray";
  return team === "gray" ? defaultPlacedUnitTeam : team;
};

export const neutralizeObjectMapUnitTeam = (
  unit: MapUnitTypeId,
  team: MapTeamId,
): MapTeamId => unit === "none" || isObjectMapUnit(unit) ? "gray" : team;

export const oppositeMapUnitTeam = (
  unit: MapUnitTypeId,
  team: MapTeamId,
): MapTeamId => {
  const normalized = normalizeMapUnitTeam(unit, team);
  const opposite = standardTeamIds.find((candidate) => candidate !== normalized);
  if (normalized !== "gray" && opposite) return opposite;
  return normalized;
};
