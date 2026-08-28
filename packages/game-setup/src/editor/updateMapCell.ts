import { MapSetupError, type MapCell, type MapGrid } from "../contracts";
import { normalizeMapUnitTeam } from "../maps/mapUnitOwnership";

export type EditableMapCell = Pick<MapCell, "team" | "terrain" | "unit">;

export const updateMapCell = (
  map: MapGrid,
  row: number,
  column: number,
  patch: EditableMapCell,
): MapGrid => {
  const current = map[row]?.[column];
  if (!current) {
    throw new MapSetupError("invalid-map", "Editor cell coordinates are outside the map");
  }
  const normalizedPatch = {
    ...patch,
    team: normalizeMapUnitTeam(patch.unit, patch.team),
  };
  return map.map((existingRow, rowIndex) => rowIndex === row
    ? existingRow.map((cell, columnIndex) => columnIndex === column
      ? { ...cell, ...normalizedPatch }
      : cell)
    : existingRow);
};
