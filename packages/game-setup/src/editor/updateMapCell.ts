import type { MapItem } from "@TBS/common";

import { MapSetupError } from "../contracts";

export type EditableMapCell = Pick<MapItem, "team" | "terrain" | "unit">;

export const updateMapCell = (
  map: MapItem[][],
  row: number,
  column: number,
  patch: EditableMapCell,
): MapItem[][] => {
  const current = map[row]?.[column];
  if (!current) {
    throw new MapSetupError("invalid-map", "Editor cell coordinates are outside the map");
  }
  return map.map((existingRow, rowIndex) => rowIndex === row
    ? existingRow.map((cell, columnIndex) => columnIndex === column
      ? { ...cell, ...patch }
      : cell)
    : existingRow);
};
