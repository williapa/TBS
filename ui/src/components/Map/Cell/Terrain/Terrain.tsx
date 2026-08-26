import "./Terrain.css";
import Unit from "../../../../components/Map/Unit/Unit";
import type { TerrainProps } from "../../../../types";

const Terrain = ({
  row,
  column,
  height,
  type,
  unitType
}: TerrainProps) => (
  <div style={{ fontSize: `${height * .76}px` }} data-row={row} data-column={column} data-terrain={`${type}`}>
    <span style={{ display: "inline-block", position: "relative" }}>
      <Unit type={unitType} />
    </span>
  </div>
);

export default Terrain;
