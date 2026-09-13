import "./GamePanel.css";
import {
  presentUnitDictionary,
  presentUnitTypeDetails,
  type UnitTypeDetailsViewModel,
  type WinConditionViewModel,
} from "@TBS/presentation";
import { getEmojiForUnit } from "@TBS/renderer-2d";
import type { CameraIntent } from "@TBS/renderer-3d";
import { useEffect, useState } from "react";
import type {
  GameMapControlsState,
  GamePanelRow,
  GamePanelState,
  GamePanelTerrain,
} from "../../types";
import { AccessibleBoardNavigator } from "./AccessibleBoardNavigator";
import { buildUnitDictionaryRows } from "./gamePanelState";

type DetailsView = "default" | "dictionary" | "selection";
type DictionaryUnitTypeId = UnitTypeDetailsViewModel["unitTypeId"];

const unitDictionaryGroups = presentUnitDictionary();
const unitDictionaryUnits = unitDictionaryGroups.flatMap(({ units }) => units);
const initialDictionaryUnitTypeId = unitDictionaryUnits[0]?.unitTypeId ?? null;

const isDictionaryUnitTypeId = (value: string): value is DictionaryUnitTypeId =>
  unitDictionaryUnits.some(({ unitTypeId }) => unitTypeId === value);

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
  const [view, setView] = useState<DetailsView>(state ? "selection" : "default");
  const [dictionaryUnitTypeId, setDictionaryUnitTypeId] =
    useState<DictionaryUnitTypeId | null>(initialDictionaryUnitTypeId);

  useEffect(() => setView((current) =>
    current === "dictionary" ? current : state ? "selection" : "default"), [state]);

  const showSelection = view === "selection" && state;
  const dictionaryUnit = dictionaryUnitTypeId
    ? presentUnitTypeDetails(dictionaryUnitTypeId)
    : null;
  const dictionaryRows = dictionaryUnit ? buildUnitDictionaryRows(dictionaryUnit) : [];
  return (
    <div aria-label="Game details" className="game panel" role="region">
      <div className="game-panel">
        <div aria-label="Details view" className="game-panel__view-toggle" role="group">
          <button
            aria-pressed={view === "default"}
            onClick={() => setView("default")}
            type="button"
          >
            Map controls
          </button>
          <button
            aria-pressed={view === "selection"}
            disabled={!state}
            onClick={() => setView("selection")}
            type="button"
          >
            Selected cell
          </button>
          <button
            aria-pressed={view === "dictionary"}
            onClick={() => setView("dictionary")}
            type="button"
          >
            Unit dictionary
          </button>
        </div>
        {showSelection ? (
          <>
            {renderSection(state.rows)}
            {state.transportRows && state.transportRows.length > 0
              ? renderSection(state.transportRows, "Cargo")
              : null}
          </>
        ) : view === "dictionary" ? (
          <div className="game-panel__dictionary">
            <div className="game-panel__dictionary-picker">
              <label className="game-panel__label" htmlFor="unit-dictionary-select">Unit</label>
              <select
                id="unit-dictionary-select"
                name="unit-dictionary"
                value={dictionaryUnitTypeId ?? ""}
                onChange={(event) => {
                  const nextUnitTypeId = event.currentTarget.value;
                  if (!isDictionaryUnitTypeId(nextUnitTypeId)) {
                    throw new Error("Unit dictionary selected an invalid unit");
                  }
                  setDictionaryUnitTypeId(nextUnitTypeId);
                }}
              >
                {unitDictionaryGroups.map((group) => (
                  <optgroup key={group.category} label={group.label}>
                    {group.units.map((unit) => (
                      <option key={unit.unitTypeId} value={unit.unitTypeId}>
                        {unit.label} {getEmojiForUnit(unit.unitTypeId)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {dictionaryUnit ? renderSection(dictionaryRows, dictionaryUnit.label) : null}
          </div>
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
