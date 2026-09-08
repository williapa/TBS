import type { BoardEntityViewModel } from "@TBS/presentation";

export const healthBarTrack = { centerX: 0, width: 0.6 } as const;

export const healthBarFill = (health: NonNullable<BoardEntityViewModel["health"]>) => {
  const width = healthBarTrack.width * (health.current / health.maximum);
  return {
    // Box geometry is centered on its position; anchor the fill's left edge to the track.
    centerX: healthBarTrack.centerX - healthBarTrack.width / 2 + width / 2,
    width,
  };
};
