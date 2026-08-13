import type { MapItem as CommonMapItem } from "@TBS/common";
import { createHexMap, updateMapCell } from "@TBS/game-setup";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import HexGrid from "../../components/HexGrid/HexGrid";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { useMapRepository } from "../../maps";
import type { EditableCell, HexMap, ModeType, TerrainType } from "../../types";

type MapProps = {
  defaultTerrain?: TerrainType;
  dimension?: number;
  mode?: ModeType;
  name?: string;
  submitted?: boolean;
  mapId?: string;
  initialMap?: CommonMapItem[][];
}

const Map = ({ mode = "editor", name, dimension = 16, defaultTerrain = "forest", mapId, initialMap }: MapProps) => {
  const navigate = useNavigate();
  const mapRepository = useMapRepository();
  const { height, width } = useWindowDimensions();


  const initialGridData: HexMap = initialMap ?? createHexMap(dimension, defaultTerrain);

  const [mapData, setMapData] = useState(initialGridData);
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const create = async () => {
    setSaving(true);
    setSaveError(undefined);
    try {
      const input = { name: name ?? "", map: mapData };
      if (mapId) await mapRepository.update(mapId, input);
      else await mapRepository.save(input);
      navigate("/");
    } catch (value) {
      setSaveError(value instanceof Error ? value.message : "The map could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const updateCell = (x: number, y: number, mapItem: EditableCell) => {
    setMapData((current) => updateMapCell(current, x, y, mapItem));
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
        <p> Maps must contain at least one movable combat unit per team. </p>
        <button disabled={saving} onClick={create} style={{ maxWidth: "200px", marginLeft: "8px" }}>
          {saving ? "Saving…" : `${mapId ? "Save" : "Create"} map "${name}"`}
        </button>
      </div>
      {saveError && <p role="alert">{saveError}</p>}
      <HexGrid
        callback={updateCell}
        dimensions={{ width: .6 * width, height: height - 110 }}
        editing={editing}
        mapData={mapData}
        mode={mode}
        setEdit={setEditing}
      />
    </div>
  );
}

export default Map;
