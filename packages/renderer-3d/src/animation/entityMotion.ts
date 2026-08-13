import type { BoardEntityViewModel, MoveEntityCue } from "@TBS/presentation";

import { projectHexToWorld } from "../board/projection.js";

export const easeInOut = (progress: number): number => {
  const bounded = Math.max(0, Math.min(1, progress));
  return bounded * bounded * (3 - (2 * bounded));
};

export const entityWorldPosition = (
  entity: BoardEntityViewModel,
  cue: MoveEntityCue | undefined,
  elapsedMs: number,
  reducedMotion: boolean,
): ReturnType<typeof projectHexToWorld> => {
  const destination = projectHexToWorld(entity.coordinate);
  if (!cue || reducedMotion) return destination;
  const origin = projectHexToWorld(cue.from);
  const progress = easeInOut(elapsedMs / cue.durationMs);
  return {
    x: origin.x + ((destination.x - origin.x) * progress),
    y: origin.y + ((destination.y - origin.y) * progress),
    z: origin.z + ((destination.z - origin.z) * progress),
  };
};
