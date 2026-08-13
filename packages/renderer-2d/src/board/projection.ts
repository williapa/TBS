import type { BoardCellViewModel } from "@TBS/presentation";

export type Point2D = Readonly<{ x: number; y: number }>;
export type RendererHexCoord = BoardCellViewModel["coordinate"];

export const HEX_SIZE = 50;

export const projectHexTo2D = ({ q, r }: RendererHexCoord, size = HEX_SIZE): Point2D => ({
  x: Math.sqrt(3) * size * (q + (r / 2)),
  y: 1.5 * size * r,
});

export const hexPolygonPoints = (size = HEX_SIZE): string => Array.from(
  { length: 6 },
  (_, index) => {
    const angle = ((60 * index) - 30) * (Math.PI / 180);
    return `${Math.cos(angle) * size},${Math.sin(angle) * size}`;
  },
).join(" ");
