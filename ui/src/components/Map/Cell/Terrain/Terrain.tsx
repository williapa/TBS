import "./Terrain.css";
import Bar from "../Health/Bar";
import Unit from "../../../../components/Map/Unit/Unit";

const Terrain = ({
  damage = 0,
  row,
  column,
  height,
  loadedUnit,
  moved = false,
  team = "gray" as TeamType.gray,
  type,
  unitType
}: TerrainProps) => (
  <div style={{ fontSize: `${height * .76}px` }} data-row={row} data-column={column} data-terrain={`${type}`}>
    {moved && <span style={{ fontSize: `${height * .38}px` }}> * </span>}
    <span style={{ display: "inline-block", position: "relative" }}>
      <Unit type={unitType} />
      {loadedUnit && (
        <Unit
          type={loadedUnit.unit}
          scale={0.62}
          offsetX={-8}
          offsetY={-12}
        />
      )}
    </span>
    <Bar damage={damage} height={height} unit={unitType} team={team} />
  </div>
);

export default Terrain;
