declare const hexKeyBrand: unique symbol;

export type HexCoord = Readonly<{
  q: number;
  r: number;
}>;

export type HexKey = string & { readonly [hexKeyBrand]: "HexKey" };

const directions: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

const safeInteger = (value: number, label: string): number => {
  if (!Number.isSafeInteger(value)) throw new Error(`${label} must be a safe integer`);
  return value;
};

export const hexCoord = (q: number, r: number): HexCoord => ({
  q: safeInteger(q, "q"),
  r: safeInteger(r, "r"),
});

export const hexKey = (coord: HexCoord): HexKey => `${coord.q},${coord.r}` as HexKey;

export const parseHexKey = (key: string): HexCoord => {
  const match = /^(-?\d+),(-?\d+)$/.exec(key);
  if (!match) throw new Error(`Invalid hex key: ${key}`);
  return hexCoord(Number(match[1]), Number(match[2]));
};

export const addHexCoords = (left: HexCoord, right: HexCoord): HexCoord =>
  hexCoord(left.q + right.q, left.r + right.r);

export const getHexNeighbors = (coord: HexCoord): readonly HexCoord[] =>
  directions.map((direction) => addHexCoords(coord, direction));

export const getHexDistance = (left: HexCoord, right: HexCoord): number => {
  const q = left.q - right.q;
  const r = left.r - right.r;
  const s = -q - r;
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
};

export const getHexRange = (center: HexCoord, radius: number): readonly HexCoord[] => {
  safeInteger(radius, "radius");
  if (radius < 0) throw new Error("radius must not be negative");

  const coordinates: HexCoord[] = [];
  for (let qOffset = -radius; qOffset <= radius; qOffset += 1) {
    const minimumR = Math.max(-radius, -qOffset - radius);
    const maximumR = Math.min(radius, -qOffset + radius);
    for (let rOffset = minimumR; rOffset <= maximumR; rOffset += 1) {
      coordinates.push(hexCoord(center.q + qOffset, center.r + rOffset));
    }
  }
  return coordinates;
};

const legacyRadius = (width: number): number => {
  safeInteger(width, "width");
  if (width < 1) throw new Error("width must be positive");
  return width - 1;
};

const legacyRowLength = (row: number, radius: number): number =>
  radius + 1 + Math.min(row, 2 * radius - row);

export const legacyOffsetToAxial = (row: number, column: number, width: number): HexCoord => {
  const radius = legacyRadius(width);
  safeInteger(row, "row");
  safeInteger(column, "column");
  if (row < 0 || row > 2 * radius) throw new Error("row is outside the legacy hexagon");
  const rowLength = legacyRowLength(row, radius);
  if (column < 0 || column >= rowLength) throw new Error("column is outside the legacy row");

  const r = row - radius;
  const minimumQ = Math.max(-radius, -r - radius);
  return hexCoord(minimumQ + column, r);
};

export const axialToLegacyOffset = (
  coord: HexCoord,
  width: number,
): Readonly<{ row: number; column: number }> => {
  const radius = legacyRadius(width);
  if (getHexDistance(hexCoord(0, 0), coord) > radius) {
    throw new Error("coordinate is outside the legacy hexagon");
  }
  const row = coord.r + radius;
  const minimumQ = Math.max(-radius, -coord.r - radius);
  return { row, column: coord.q - minimumQ };
};

export const legacyIndexToAxial = (index: number, width: number): HexCoord => {
  const radius = legacyRadius(width);
  safeInteger(index, "index");
  if (index < 0) throw new Error("index must not be negative");

  let remaining = index;
  for (let row = 0; row <= 2 * radius; row += 1) {
    const rowLength = legacyRowLength(row, radius);
    if (remaining < rowLength) return legacyOffsetToAxial(row, remaining, width);
    remaining -= rowLength;
  }
  throw new Error("index is outside the legacy hexagon");
};

export const axialToLegacyIndex = (coord: HexCoord, width: number): number => {
  const radius = legacyRadius(width);
  const { row, column } = axialToLegacyOffset(coord, width);
  let index = column;
  for (let currentRow = 0; currentRow < row; currentRow += 1) {
    index += legacyRowLength(currentRow, radius);
  }
  return index;
};
