import { getHexDistance, hexCoord, type HexCoord } from "@TBS/game-core";

const safeInteger = (value: number, label: string): number => {
  if (!Number.isSafeInteger(value)) throw new Error(`${label} must be a safe integer`);
  return value;
};

const radiusFor = (width: number): number => {
  safeInteger(width, "width");
  if (width < 1) throw new Error("width must be positive");
  return width - 1;
};

const rowLength = (row: number, radius: number): number => radius + 1 + Math.min(row, 2 * radius - row);

export const mapOffsetToAxial = (row: number, column: number, width: number): HexCoord => {
  const radius = radiusFor(width);
  safeInteger(row, "row");
  safeInteger(column, "column");
  if (row < 0 || row > 2 * radius) throw new Error("row is outside the map hexagon");
  if (column < 0 || column >= rowLength(row, radius)) throw new Error("column is outside the map row");
  const r = row - radius;
  return hexCoord(Math.max(-radius, -r - radius) + column, r);
};

export const axialToMapOffset = (coord: HexCoord, width: number): Readonly<{ row: number; column: number }> => {
  const radius = radiusFor(width);
  if (getHexDistance(hexCoord(0, 0), coord) > radius) throw new Error("coordinate is outside the map hexagon");
  const row = coord.r + radius;
  return { row, column: coord.q - Math.max(-radius, -coord.r - radius) };
};

export const mapIndexToAxial = (index: number, width: number): HexCoord => {
  const radius = radiusFor(width);
  safeInteger(index, "index");
  if (index < 0) throw new Error("index must not be negative");
  let remaining = index;
  for (let row = 0; row <= 2 * radius; row += 1) {
    const length = rowLength(row, radius);
    if (remaining < length) return mapOffsetToAxial(row, remaining, width);
    remaining -= length;
  }
  throw new Error("index is outside the map hexagon");
};

export const axialToMapIndex = (coord: HexCoord, width: number): number => {
  const radius = radiusFor(width);
  const { row, column } = axialToMapOffset(coord, width);
  let index = column;
  for (let currentRow = 0; currentRow < row; currentRow += 1) index += rowLength(currentRow, radius);
  return index;
};
