import {
  createHexMap,
  deriveInitialObjectives,
  mapTerrainOptions,
  getMapReflectionCellRole,
  reflectMap,
  updateMapCell,
} from "@TBS/game-setup";
import type { MapGrid } from "@TBS/game-setup";
import type { MapReflectionAxis } from "@TBS/game-setup";
import { presentWinCondition } from "@TBS/presentation";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HexGrid from "../../components/HexGrid/HexGrid";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { useMapRepository } from "../../maps";
import type { EditableCell, HexMap, MapCellEditState, ModeType, TerrainType } from "../../types";

type MapProps = {
  defaultTerrain?: TerrainType;
  dimension?: number;
  mode?: ModeType;
  name?: string;
  submitted?: boolean;
  mapId?: string;
  initialMap?: MapGrid;
  reflectionAxis?: MapReflectionAxis;
}

type EditorStage = "symmetry-setup" | "final-edit";

const Map = ({ name, dimension = 16, defaultTerrain, mapId, initialMap, reflectionAxis }: MapProps) => {
  const navigate = useNavigate();
  const mapRepository = useMapRepository();
  const { height, width } = useWindowDimensions();


  const terrain = defaultTerrain ?? mapTerrainOptions.find((value) => value === "forest")
    ?? mapTerrainOptions[0];
  if (!terrain) throw new Error("The map editor requires at least one terrain option");
  const initialGridData: HexMap = initialMap ?? createHexMap(dimension, terrain);

  const [mapData, setMapData] = useState(initialGridData);
  const [editorStage, setEditorStage] = useState<EditorStage>(
    reflectionAxis ? "symmetry-setup" : "final-edit",
  );
  const [flipReflectedCellsVertically, setFlipReflectedCellsVertically] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const winCondition = useMemo(
    () => presentWinCondition(deriveInitialObjectives(mapData)),
    [mapData],
  );
  const hasIncompleteCapitalSetup = useMemo(() => (
    !winCondition.includesCapitalVictory
    && mapData.flat().some((cell) => cell.unit === "capital" && cell.team !== "gray")
  ), [mapData, winCondition.includesCapitalVictory]);

  const create = async () => {
    setSaving(true);
    setSaveError(undefined);
    try {
      const input = { name: name ?? "", map: mapData };
      if (mapId) await mapRepository.update(mapId, input);
      else await mapRepository.save(input);
      navigate("/game/new");
    } catch (value) {
      setSaveError(value instanceof Error ? value.message : "The map could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const updateCell = (x: number, y: number, mapItem: EditableCell) => {
    setMapData((current) => updateMapCell(current, x, y, mapItem));
  };

  const reflect = () => {
    if (!reflectionAxis) return;
    setEditing(false);
    setMapData((current) => reflectMap(current, reflectionAxis, {
      flipVertically: flipReflectedCellsVertically,
    }));
    setEditorStage("final-edit");
  };

  const getCellEditState = (cell: HexMap[number][number]): MapCellEditState => {
    if (editorStage === "final-edit" || !reflectionAxis) return "editable";
    const role = getMapReflectionCellRole(cell.row, cell.column, mapData[0].length, reflectionAxis);
    if (role === "source") return "editable";
    return role === "axis" ? "axis" : "disabled";
  };

  return (
    <div style={{ marginLeft: "20%", maxWidth: "60%", paddingTop: "10px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}
      > 
        {editorStage === "symmetry-setup" ? (
          <div>
            <p><strong>Build one half of the map.</strong></p>
            <p>The grey cells and reflection line unlock after you reflect the map.</p>
          </div>
        ) : (
          <div>
            <p aria-label="Map win condition">
              <strong>Win condition:</strong> {winCondition.description}
            </p>
            {hasIncompleteCapitalSetup && (
              <p>Capital victory requires at least one capital for each team.</p>
            )}
            <p>Maps must contain at least one movable combat unit per team.</p>
          </div>
        )}
        {editorStage === "symmetry-setup" ? (
          <div style={{ marginLeft: "8px" }}>
            <label
              style={{ alignItems: "center", display: "flex", gap: "6px", minWidth: "auto" }}
            >
              <input
                checked={flipReflectedCellsVertically}
                onChange={(event) => setFlipReflectedCellsVertically(event.currentTarget.checked)}
                style={{ minWidth: "auto" }}
                type="checkbox"
              />
              Flip reflected half vertically
            </label>
            <button onClick={reflect} style={{ marginTop: "8px", maxWidth: "200px" }}>
              Reflect map
            </button>
          </div>
        ) : (
          <button disabled={saving} onClick={create} style={{ maxWidth: "200px", marginLeft: "8px" }}>
            {saving ? "Saving…" : `${mapId ? "Save" : "Create"} map "${name}"`}
          </button>
        )}
      </div>
      {saveError && <p role="alert">{saveError}</p>}
      <HexGrid
        key={editorStage}
        callback={updateCell}
        dimensions={{ width: .6 * width, height: height - 110 }}
        editing={editing}
        mapData={mapData}
        getCellEditState={getCellEditState}
        setEdit={setEditing}
      />
    </div>
  );
}

export default Map;
