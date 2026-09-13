import "./GamePanel.css";
import type { WinConditionViewModel } from "@TBS/presentation";
import type { CameraIntent } from "@TBS/renderer-3d";
import { useEffect, useState } from "react";
import type {
  GameMapControlsState,
  GamePanelRow,
  GamePanelState,
  GamePanelTerrain,
} from "../../types";
import { AccessibleBoardNavigator } from "./AccessibleBoardNavigator";

const cameraControls: readonly Readonly<{
  intent: CameraIntent;
  label: string;
  text: string;
}>[] = [
  { intent: "pan-left", label: "Pan camera left", text: "←" },
  { intent: "pan-up", label: "Pan camera up", text: "↑" },
  { intent: "pan-down", label: "Pan camera down", text: "↓" },
  { intent: "pan-right", label: "Pan camera right", text: "→" },
  { intent: "zoom-in", label: "Zoom camera in", text: "+" },
  { intent: "zoom-out", label: "Zoom camera out", text: "−" },
  { intent: "rotate", label: "Rotate camera clockwise", text: "↻" },
];

const renderTerrain = (terrain: GamePanelTerrain, cost?: number) => (
  <span className="game-panel__terrain">
    <span
      aria-hidden="true"
      className="game-panel__terrain-swatch"
      data-terrain={terrain.id}
      style={{ backgroundColor: terrain.color }}
    />
    <span>{terrain.label}{cost === undefined ? null : ` ${cost}`}</span>
  </span>
);

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

  if (row.type === "terrain") {
    return <div className="game-panel__value">{renderTerrain(row.terrain)}</div>;
  }

  if (row.type === "terrain-costs") {
    return (
      <div className="game-panel__terrain-list">
        {row.costs.map(({ cost, terrain }) => (
          <span key={terrain.id}>{renderTerrain(terrain, cost)}</span>
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

const renderSection = (rows: readonly GamePanelRow[], title?: string) => (
  <section className="game-panel__section">
    {title && <h3 className="game-panel__title">{title}</h3>}
    <div className="game-panel__grid">{renderRows(rows)}</div>
  </section>
);

const GamePanel = ({
  controls,
  showKeyboardBoardControls = false,
  state,
  winCondition,
}: Readonly<{
  controls?: GameMapControlsState | null;
  showKeyboardBoardControls?: boolean;
  state: GamePanelState | null;
  winCondition: WinConditionViewModel;
}>) => {
  const [view, setView] = useState<"default" | "selection">(state ? "selection" : "default");

  useEffect(() => setView(state ? "selection" : "default"), [state]);

  const showSelection = view === "selection" && state;
  return (
    <div aria-label="Game details" className="game panel" role="region">
      <div className="game-panel">
        <div aria-label="Details view" className="game-panel__view-toggle" role="group">
          <button
            aria-pressed={!showSelection}
            onClick={() => setView("default")}
            type="button"
          >
            Map controls
          </button>
          <button
            aria-pressed={Boolean(showSelection)}
            disabled={!state}
            onClick={() => setView("selection")}
            type="button"
          >
            Selected cell
          </button>
        </div>
        {showSelection ? (
          <>
            {renderSection(state.rows)}
            {state.transportRows && state.transportRows.length > 0
              ? renderSection(state.transportRows, "Cargo")
              : null}
          </>
        ) : (
          <div className="game-panel__default">
            <section className="game-panel__section">
              <h3 className="game-panel__title">Win condition</h3>
              <div className="game-panel__value">{winCondition.description}</div>
            </section>
            {controls && (
              <section aria-labelledby="map-controls-title" className="game-panel__section">
                <h3 className="game-panel__title" id="map-controls-title">Map controls</h3>
                <div className="game-panel__control-row">
                  <div aria-label="Board view" className="game-renderer-toggle" role="group">
                    <button aria-pressed={controls.renderer === "2d"} onClick={() => controls.onRendererChange("2d")} type="button">Use 2D board</button>
                    <button aria-pressed={controls.renderer === "3d"} onClick={() => controls.onRendererChange("3d")} type="button">Use 3D board</button>
                  </div>
                  {controls.renderer === "3d" && controls.rendererAvailable && (
                    <div aria-label="3D camera controls" className="game-camera-controls" role="toolbar">
                      {cameraControls.map((control) => (
                        <button aria-label={control.label} key={control.intent} onClick={() => controls.onCameraIntent(control.intent)} type="button">{control.text}</button>
                      ))}
                    </div>
                  )}
                </div>
                {showKeyboardBoardControls
                  && controls.renderer === "3d"
                  && controls.rendererAvailable && (
                  <AccessibleBoardNavigator board={controls.board} onIntent={controls.onBoardIntent} />
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePanel;
