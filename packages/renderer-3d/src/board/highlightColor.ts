import type { BoardCellViewModel, BoardTargetType } from "@TBS/presentation";

const targetColors: Readonly<Record<BoardTargetType, string>> = {
  attack: "#ff3b5c",
  boost: "#39ff88",
  construct: "#ff8a1f",
  heal: "#38bdf8",
  load: "#c084fc",
  move: "#22d3ee",
  spawn: "#ff4fd8",
  unload: "#2dd4bf",
};

export const targetHighlightContrastColor = "#111827";

export const cellHighlightRenderOrder = {
  target: { contrast: 10, color: 11 },
  selection: { contrast: 20, color: 21 },
} as const;

export const targetHighlightColor = (target: BoardTargetType): string =>
  targetColors[target];

export const cellHighlightColor = (
  cell: Pick<BoardCellViewModel, "selection" | "target">,
): string | null => cell.selection !== "none"
  ? "#ffffff"
  : cell.target
    ? targetHighlightColor(cell.target)
    : null;
