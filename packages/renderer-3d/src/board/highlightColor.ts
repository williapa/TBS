import type { BoardCellViewModel, BoardTargetType } from "@TBS/presentation";

const targetColors: Readonly<Record<BoardTargetType, string>> = {
  attack: "#ff5d5d",
  boost: "#58d68d",
  construct: "#f5b041",
  heal: "#5dade2",
  load: "#af7ac5",
  move: "#22d3ee",
  spawn: "#f4d03f",
  unload: "#48c9b0",
};

export const cellHighlightColor = (
  cell: Pick<BoardCellViewModel, "selection" | "target">,
): string | null => cell.selection !== "none"
  ? "#ffffff"
  : cell.target
    ? targetColors[cell.target]
    : null;
