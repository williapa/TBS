import type { BoardIntentHandler, BoardViewModel } from "@TBS/presentation";
import { useEffect, useState } from "react";

export const AccessibleBoardNavigator = ({ board, onIntent }: Readonly<{
  board: BoardViewModel;
  onIntent: BoardIntentHandler;
}>) => {
  const requestedCell = board.focusRequest?.type === "cell" ? board.focusRequest.cellId : undefined;
  const requestedEntityId = board.focusRequest?.type === "entity" ? board.focusRequest.entityId : undefined;
  const requestedEntity = requestedEntityId
    ? board.entities.find(({ id }) => id === requestedEntityId)
    : undefined;
  const requestedIndex = board.cells.findIndex(({ id }) => id === (requestedCell ?? requestedEntity?.cellId));
  const [activeIndex, setActiveIndex] = useState(requestedIndex >= 0 ? requestedIndex : 0);
  const boundedIndex = Math.min(activeIndex, Math.max(0, board.cells.length - 1));
  const cell = board.cells[boundedIndex];
  const entity = cell ? board.entities.find(({ cellId }) => cellId === cell.id) : undefined;

  useEffect(() => {
    if (requestedIndex >= 0) setActiveIndex(requestedIndex);
  }, [requestedIndex]);

  if (!cell) return null;
  const move = (offset: number) => setActiveIndex((index) => (
    (index + offset + board.cells.length) % board.cells.length
  ));

  return (
    <section aria-label="Keyboard board controls" className="game-board-keyboard-controls">
      <p>Use arrow keys to visit cells, then Enter or Space to select.</p>
      <button
        aria-label={`Current cell: ${cell.accessibleDescription}${cell.target ? `; ${cell.target} target` : ""}`}
        onClick={() => onIntent({ type: "select-cell", cell: cell.coordinate })}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            move(-1);
          } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            move(1);
          } else if (event.key === "Home") {
            event.preventDefault();
            setActiveIndex(0);
          } else if (event.key === "End") {
            event.preventDefault();
            setActiveIndex(board.cells.length - 1);
          }
        }}
        type="button"
      >
        Cell {cell.id}: {cell.accessibleDescription}{cell.target ? ` — ${cell.target} target` : ""}
      </button>
      {entity && (
        <button onClick={() => onIntent({ type: "select-entity", entityId: entity.id })} type="button">
          Select {entity.accessibleDescription}
        </button>
      )}
    </section>
  );
};
