import "./GamePanel.css";
import type { GamePanelRow, GamePanelState } from "../../types";

const renderRowValue = (row: GamePanelRow) => {
  if (row.type === "actions") {
    return (
      <div className="game-panel__actions">
        {row.actions.map((action) => (
          <details className="game-panel__action" key={action.id}>
            <summary>{action.label}</summary>
            <div className="game-panel__action-description">{action.description}</div>
          </details>
        ))}
      </div>
    );
  }

  return (
    <div
      className="game-panel__value"
      style={row.color ? { color: row.color } : undefined}
    >
      {row.value}
    </div>
  );
};

const renderRows = (rows: readonly GamePanelRow[]) =>
  rows.map((row) => (
    <div className="game-panel__item" key={row.id}>
      <div className="game-panel__label">{row.label}</div>
      {renderRowValue(row)}
    </div>
  ));

const renderSection = (title: string, rows: readonly GamePanelRow[]) => (
  <section className="game-panel__section" key={title}>
    <h3 className="game-panel__title">{title}</h3>
    <div className="game-panel__grid">{renderRows(rows)}</div>
  </section>
);

const GamePanel = ({ state }: { state: GamePanelState | null }) => (
  <div className="game panel">
    {!state ? (
      <p>Click a cell to see game information.</p>
    ) : (
      <div className="game-panel">
        {renderSection("Details", state.rows)}
        {state.transportRows && state.transportRows.length > 0
          ? renderSection("Cargo", state.transportRows)
          : null}
      </div>
    )}
  </div>
);

export default GamePanel;
