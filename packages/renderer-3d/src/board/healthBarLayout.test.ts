import { describe, expect, it } from "vitest";

import { healthBarFill, healthBarTrack } from "./healthBarLayout.js";

describe("3D health bar coverage", () => {
  const leftEdge = healthBarTrack.centerX - healthBarTrack.width / 2;
  const rightEdge = healthBarTrack.centerX + healthBarTrack.width / 2;

  it("centers the track and full-health fill over the unit's origin", () => {
    expect(leftEdge).toBeCloseTo(-rightEdge);
    expect(healthBarFill({ current: 100, maximum: 100 }).centerX).toBe(0);
  });

  it.each([100, 200])("covers the entire track at maximum health %i", (maximum) => {
    const fill = healthBarFill({ current: maximum, maximum });
    expect(fill.width).toBe(healthBarTrack.width);
    expect(fill.centerX - fill.width / 2).toBeCloseTo(leftEdge);
    expect(fill.centerX + fill.width / 2).toBeCloseTo(rightEdge);
  });

  it.each([0, 25, 50, 75])("fills exactly %i percent from the left without overflowing", (current) => {
    const fill = healthBarFill({ current, maximum: 100 });
    expect(fill.width / healthBarTrack.width).toBeCloseTo(current / 100);
    expect(fill.centerX - fill.width / 2).toBeCloseTo(leftEdge);
    expect(fill.centerX + fill.width / 2).toBeLessThanOrEqual(rightEdge);
  });
});
