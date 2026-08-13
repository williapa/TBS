import { describe, expect, it } from "vitest";

import {
  axialToLegacyIndex,
  axialToLegacyOffset,
  getHexDistance,
  getHexNeighbors,
  getHexRange,
  hexCoord,
  hexKey,
  legacyIndexToAxial,
  legacyOffsetToAxial,
  parseHexKey,
} from "./hex";

describe("axial hex geometry", () => {
  it("provides six ordered neighbors at distance one", () => {
    const center = hexCoord(2, -3);
    const neighbors = getHexNeighbors(center);

    expect(neighbors).toHaveLength(6);
    expect(neighbors.every((neighbor) => getHexDistance(center, neighbor) === 1)).toBe(true);
    expect(neighbors).toEqual([
      { q: 3, r: -3 },
      { q: 3, r: -4 },
      { q: 2, r: -4 },
      { q: 1, r: -3 },
      { q: 1, r: -2 },
      { q: 2, r: -2 },
    ]);
  });

  it("calculates symmetric distance and complete ranges", () => {
    const origin = hexCoord(0, 0);
    const target = hexCoord(-2, 3);

    expect(getHexDistance(origin, target)).toBe(3);
    expect(getHexDistance(target, origin)).toBe(3);
    expect(getHexRange(origin, 0)).toEqual([origin]);
    expect(getHexRange(origin, 2)).toHaveLength(19);
  });

  it("round trips canonical keys", () => {
    const coord = hexCoord(-12, 7);
    expect(parseHexKey(hexKey(coord))).toEqual(coord);
    expect(() => parseHexKey("1.5,2")).toThrow("Invalid hex key");
  });
});

describe("legacy hexagon migration geometry", () => {
  it("maps every legacy width-three cell to axial coordinates and back", () => {
    const expectedCellCount = 19;
    for (let index = 0; index < expectedCellCount; index += 1) {
      const axial = legacyIndexToAxial(index, 3);
      expect(axialToLegacyIndex(axial, 3)).toBe(index);
    }
  });

  it("maps the center and corners without retaining offset coordinates", () => {
    expect(legacyOffsetToAxial(0, 0, 3)).toEqual({ q: 0, r: -2 });
    expect(legacyOffsetToAxial(2, 2, 3)).toEqual({ q: 0, r: 0 });
    expect(axialToLegacyOffset(hexCoord(-2, 2), 3)).toEqual({ row: 4, column: 0 });
  });

  it("rejects values outside the legacy grid", () => {
    expect(() => legacyIndexToAxial(19, 3)).toThrow("outside");
    expect(() => legacyOffsetToAxial(0, 3, 3)).toThrow("outside");
    expect(() => axialToLegacyIndex(hexCoord(3, 0), 3)).toThrow("outside");
  });
});
