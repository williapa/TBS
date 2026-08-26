import { getHexNeighbors, type TerrainTypeId } from "@TBS/game-core";

import {
  MAX_MAP_SIDE,
  MIN_MAP_SIDE,
  MapSetupError,
  type MapGrid,
} from "../contracts";
import { axialToMapIndex, mapIndexToAxial } from "../geometry/mapHex";

export const generateHexagonalIndexGrid = (width: number): number[][] => {
  if (!Number.isSafeInteger(width) || width < MIN_MAP_SIDE || width > MAX_MAP_SIDE) {
    throw new MapSetupError(
      "invalid-map",
      `Map side width must be a whole number between ${MIN_MAP_SIDE} and ${MAX_MAP_SIDE}`,
    );
  }
  const rowCount = (2 * width) - 1;
  let nextIndex = 0;
  return Array.from({ length: rowCount }, (_, row) => {
    const length = width + Math.min(row, rowCount - 1 - row);
    return Array.from({ length }, () => nextIndex++);
  });
};

const neighborIndexes = (index: number, width: number): number[] =>
  getHexNeighbors(mapIndexToAxial(index, width))
    .flatMap((neighbor) => {
      try {
        return [axialToMapIndex(neighbor, width)];
      } catch {
        return [];
      }
    })
    .sort((left, right) => left - right);

export const createHexMap = (
  width: number,
  defaultTerrain: TerrainTypeId,
): MapGrid => generateHexagonalIndexGrid(width).map((row, rowIndex) =>
  row.map((index, column) => ({
    row: rowIndex,
    column,
    index,
    neighbors: neighborIndexes(index, width),
    terrain: defaultTerrain,
    unit: "none",
    team: "gray",
  })));
