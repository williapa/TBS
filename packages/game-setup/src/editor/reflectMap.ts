import { hexCoord } from "@TBS/game-core";

import { MapSetupError, type MapCell, type MapGrid, type MapLoadedUnit } from "../contracts";
import { axialToMapOffset, mapOffsetToAxial } from "../geometry/mapHex";
import { normalizeMapUnitTeam, oppositeMapUnitTeam } from "../maps/mapUnitOwnership";

export const mapReflectionAxes = ["vertical", "diagonal"] as const;
export type MapReflectionAxis = (typeof mapReflectionAxes)[number];
export type MapReflectionCellRole = "source" | "axis" | "destination";
export type MapReflectionOptions = Readonly<{ flipVertically?: boolean }>;

const reflectionValue = (
  row: number,
  column: number,
  width: number,
  axis: MapReflectionAxis,
): number => {
  const { q, r } = mapOffsetToAxial(row, column, width);
  return axis === "vertical" ? (2 * q) + r : q;
};

export const getMapReflectionCellRole = (
  row: number,
  column: number,
  width: number,
  axis: MapReflectionAxis,
): MapReflectionCellRole => {
  const value = reflectionValue(row, column, width, axis);
  if (value === 0) return "axis";
  if (axis === "vertical") return value < 0 ? "source" : "destination";
  return value > 0 ? "source" : "destination";
};

const reflectedCoordinate = (
  row: number,
  column: number,
  width: number,
  axis: MapReflectionAxis,
  options: MapReflectionOptions,
) => {
  const { q, r } = mapOffsetToAxial(row, column, width);
  if (options.flipVertically) return hexCoord(-q, -r);
  return axis === "vertical"
    ? hexCoord(-q - r, r)
    : hexCoord(-q, q + r);
};

const normalizeLoadedUnit = (unit: MapLoadedUnit): MapLoadedUnit => ({
  ...unit,
  team: normalizeMapUnitTeam(unit.unit, unit.team),
});

const reflectLoadedUnit = (unit: MapLoadedUnit): MapLoadedUnit => ({
  ...unit,
  team: oppositeMapUnitTeam(unit.unit, unit.team),
});

const normalizeCell = (cell: MapCell): MapCell => ({
  ...cell,
  team: normalizeMapUnitTeam(cell.unit, cell.team),
  ...(cell.loadedUnit ? { loadedUnit: normalizeLoadedUnit(cell.loadedUnit) } : {}),
});

const copyReflectedContent = (source: MapCell, destination: MapCell): MapCell => {
  return {
    row: destination.row,
    column: destination.column,
    index: destination.index,
    ...(destination.neighbors ? { neighbors: destination.neighbors } : {}),
    terrain: source.terrain,
    unit: source.unit,
    team: oppositeMapUnitTeam(source.unit, source.team),
    ...(source.loadedUnit ? { loadedUnit: reflectLoadedUnit(source.loadedUnit) } : {}),
  };
};

export const reflectMap = (
  map: MapGrid,
  axis: MapReflectionAxis,
  options: MapReflectionOptions = {},
): MapGrid => {
  const width = map[0]?.length;
  if (!width) throw new MapSetupError("invalid-map", "Cannot reflect an empty map");

  const reflected = map.map((row) => row.map(normalizeCell));
  for (const source of reflected.flat()) {
    if (getMapReflectionCellRole(source.row, source.column, width, axis) !== "source") continue;
    const target = axialToMapOffset(
      reflectedCoordinate(source.row, source.column, width, axis, options),
      width,
    );
    const destination = reflected[target.row]?.[target.column];
    if (!destination) {
      throw new MapSetupError("invalid-map", "Reflected cell coordinates are outside the map");
    }
    reflected[target.row][target.column] = copyReflectedContent(source, destination);
  }
  return reflected;
};
