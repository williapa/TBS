import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateHexagonalCellGrid } from "../../utils/buildHexagon";
import HexGrid from "../../components/HexGrid/HexGrid";
import useWindowDimensions from "../../hooks/useWindowDimensions";

type MapProps = {
  defaultTerrain?: TerrainType;
  dimension?: number;
  mode?: ModeType;
  name?: string;
  submitted?: boolean;
}

const Map = ({ mode = "editor", name, dimension = 16, defaultTerrain = "forest" as TerrainType.forest }: MapProps) => {
  const navigate = useNavigate();
  const { height, width } = useWindowDimensions();


  const initialGridData: HexMap = generateHexagonalCellGrid(dimension, {
    team: "gray" as TeamType.gray,
    terrain: defaultTerrain,
    unit: "none" as UnitTypes
  });

  const [mapData, setMapData] = useState(initialGridData);
  const [editing, setEditing] = useState(false);
  const attackTargets = useState<number[]>([]);

  const create = () => {
    fetch("http://localhost:8420/createMap", {
      method: "post",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        map: mapData,
        name,
      }),
    }).then((response) => { 
      if (response.ok) {
        return response.json();
      }
      throw new Error("it no ok.");
    })
    .then((data) => {
      console.log(data);
      navigate("/lobby");
    }).catch((e) => {
      alert("Submitted map is not valid - must contain at least one movable combat unit for each team.");
      console.error(e.message);
    });
  };

  const updateCell = (x: number, y: number, mapItem: MapItem) => {
    const oldItem = mapData[x][y];
    const newMapData = [...mapData];
    newMapData[x][y] = {
      ...oldItem,
      ...mapItem
    };
    setMapData(newMapData);
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
        <button onClick={create} style={{ maxWidth: "200px", marginLeft: "8px" }}> 
          Create map "{name}"
        </button>
      </div>
      <HexGrid
        attackTargets={attackTargets}
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
