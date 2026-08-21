import Cell from "../../components/Map/Cell/Cell";
import { terrainColors } from "../../components/Map/Cell/Terrain/terrainColors";
import type {
  Dimensions,
  EditableCell,
  HexMap,
  MapItem,
} from "../../types";

const hex = (value: number) => (2 * value) - 1;

type HexGridProps = Readonly<{
  callback?: (row: number, column: number, mapItem: EditableCell) => void;
  dimensions: Dimensions;
  editing?: boolean;
  mapData: HexMap;
  setEdit?: (editing: boolean) => void;
}>;

const terrainColor = (terrain: MapItem["terrain"]): string =>
  terrainColors[String(terrain) as keyof typeof terrainColors] ?? "rgba(119, 128, 141, 1)";

const HexGrid = ({
  callback,
  dimensions,
  editing = false,
  mapData,
  setEdit,
}: HexGridProps) => {
  const { width, height } = dimensions;
  const gap = 3;
  const hexDimension = hex(mapData[0]?.length ?? 1);
  const cellHeight = height / (hexDimension + 1);
  const cellWidth = (width / hexDimension) - gap;
  const triangleHeight = (cellHeight - gap) / 2;
  const borderWidth = (cellWidth + (gap / 2.46)) / 2;
  const borderY = (color: string) => `${triangleHeight}px solid ${color}`;
  const borderX = `${borderWidth}px solid transparent`;

  const cellView = (item: MapItem) => {
    const color = terrainColor(item.terrain);
    return (
      <div
        data-cell-id={item.index}
        key={item.index}
        style={{
          cursor: "pointer",
          float: "left",
          height: `${cellHeight}px`,
          marginBottom: `-${triangleHeight}px`,
          marginLeft: `${gap}px`,
          textAlign: "center",
          width: `${cellWidth}px`,
        }}
      >
        <div
          style={{
            borderBottom: borderY(color),
            borderLeft: borderX,
            borderRight: borderX,
            width: 0,
          }}
        />
        <div
          style={{
            background: color,
            height: `${triangleHeight}px`,
            textAlign: "center",
            width: `${cellWidth}px`,
          }}
        >
          <Cell
            callback={callback}
            column={item.column}
            editing={editing}
            height={triangleHeight}
            index={item.index}
            row={item.row}
            setEdit={setEdit}
            team={item.team}
            terrain={item.terrain}
            unit={item.unit}
            width={cellWidth}
          />
        </div>
        <div
          style={{
            borderLeft: borderX,
            borderRight: borderX,
            borderTop: borderY(color),
            width: 0,
          }}
        />
      </div>
    );
  };

  return (
    <div>
      {mapData.map((row, index) => (
        <div
          key={`row-${index}`}
          style={{
            clear: "left",
            display: "flex",
            height: `${cellHeight}px`,
            justifyContent: "center",
            marginTop: index < 1 ? `${triangleHeight / 3}px` : "0px",
            width: `${width}px`,
          }}
        >
          {row.map(cellView)}
        </div>
      ))}
    </div>
  );
};

export default HexGrid;
