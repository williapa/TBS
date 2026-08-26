import { describe, expect, it } from "vitest";

import {
  getHexDistance,
  getHexNeighbors,
  getHexRange,
  hexCoord,
  hexKey,
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
