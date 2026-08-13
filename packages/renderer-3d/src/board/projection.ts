import type { BoardCameraBounds, BoardCellViewModel } from "@TBS/presentation";

export type WorldPoint = Readonly<{ x: number; y: number; z: number }>;
export type RendererHexCoord = BoardCellViewModel["coordinate"];

export const HEX_WORLD_SIZE = 1;

// Three's cylinder and ring geometries measure their start angles from
// different axes. These values give both meshes the pointy-top orientation
// used by the 2D renderer and by the axial projection below.
export const HEX_WORLD_ORIENTATION = {
  cylinderThetaStart: 0,
  ringThetaStart: -Math.PI / 2,
} as const;

export const projectHexToWorld = (
  { q, r }: RendererHexCoord,
  size = HEX_WORLD_SIZE,
): WorldPoint => ({
  x: Math.sqrt(3) * size * (q + (r / 2)),
  y: 0,
  z: 1.5 * size * r,
});

export const projectCameraBounds = (bounds: BoardCameraBounds): Readonly<{
  center: WorldPoint;
  minimum: WorldPoint;
  maximum: WorldPoint;
}> => ({
  center: projectHexToWorld(bounds.center),
  minimum: projectHexToWorld(bounds.minimum),
  maximum: projectHexToWorld(bounds.maximum),
});
