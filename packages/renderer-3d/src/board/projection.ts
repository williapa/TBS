import type { BoardCameraBounds, BoardCellViewModel } from "@TBS/presentation";

export type WorldPoint = Readonly<{ x: number; y: number; z: number }>;
export type RendererHexCoord = BoardCellViewModel["coordinate"];

export const HEX_WORLD_SIZE = 1;

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
