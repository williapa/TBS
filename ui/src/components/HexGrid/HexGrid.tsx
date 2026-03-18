import Cell from "../../components/Map/Cell/Cell";
import { terrainColors } from "../../components/Map/Cell/Terrain/terrainColors";
import replaceOpacity from "../../utils/replaceOpacity";

const hex = (n: number) => 2 * n - 1;

type HexGridProps = {
  activeTeam?: TeamType;
  actor?: Actor;
  attackTargets: [number[], React.Dispatch<React.SetStateAction<number[]>>],
  callback: (x: number, y: number, mapItem: MapItem, action?: gameActions) => void;
  dimensions: dim;
  editing?: boolean;
  mapData: HexMap;
  mode?: ModeType;
  setActor?: (args: any) => void;
  setEdit?: (args: any) => void;
}

const HexGrid = ({ 
  activeTeam = "gray" as TeamType.gray,
  actor,
  attackTargets,
  callback,
  dimensions,
  editing = false,
  mapData,
  mode = "game",
  setActor,
  setEdit,
}: HexGridProps) => {
  
  const { width, height } = dimensions;
  // use hilighted cells for CHOOSE-TARGET STATE - when moving or attacking, hilight target options
  // if no options, you can hilight the selected cell to click that and return to menu.
  const [attackTargetArray, setAttackTargets] = attackTargets;
  let targetCells: number[] = [];
  if (actor) {
    // intiial target cells should be the neighbors of a moving actor 
    if (actor[0] === "move" && attackTargetArray.length < 1) {
      console.log("attack targets");
      targetCells = actor[1];
    }
  }
  if (attackTargetArray.length > 0 && actor) {
    actor[0] = "attack";
    targetCells = attackTargetArray;
  }
  
  const x = 3;

  const hexDimension = hex(mapData[0].length);
  const cellHeight = (height) / (hexDimension + 1);
  const cellWidth = (width / hexDimension) - x;
  const triangleHeight = (cellHeight - x) / 2;
  const borderWidth = ((cellWidth + (x/2.46))/ 2);
  const borderY = (color: string) => `${triangleHeight}px solid ${color}`;
  const borderX = `${borderWidth}px solid transparent`;

  const isActiveTeam = (team: TeamType) => team === activeTeam && activeTeam !== "gray";
  const isActiveCell = (item: MapItem) => isActiveTeam(item.team) && !item.moved;
  const buildCursor = (item: MapItem) => !item.moved &&
    isActiveTeam(item.team) || targetCells.includes(item.index) ? "pointer" : "default";
  
  const isTarget = (item: MapItem) => targetCells.indexOf(item.index) > -1;

  const targetType = (item: MapItem) => {
    const it = isTarget(item);

    return (it && actor) ? actor[0] : false;
  };

  const targetBorder = (item: MapItem, square?: boolean) => {
    let opaqueBorderCss = terrainColors[item.terrain];
    if (isTarget(item)) {
      opaqueBorderCss = replaceOpacity(opaqueBorderCss);
    }
    if (square) {
      return opaqueBorderCss;
    }
    return borderY(opaqueBorderCss);
  }
  
  const cellMapper = (item: MapItem) => (
    <div
      key={item.index}
      style={{
        width: `${cellWidth}px`,
        height: `${cellHeight}px`,
        textAlign: `center`,
        float: `left`,
        marginLeft: `${x}px`,
        marginBottom: `-${triangleHeight}px`,
        cursor: buildCursor(item)
      }}
      data-cell-id={item.index}
    >
      <div
        key={`cell-triangle-top-${item.index}`}
        style={{
          borderBottom: targetBorder(item),
          borderLeft: borderX,
          borderRight: borderX,
          width: 0,
        }}
      />
      <div
        key={`cell-square-${item.index}`}
        style={{
          textAlign: "center",
          width: `${cellWidth}px`,
          height: `${triangleHeight}px`,
          background: targetBorder(item, true)
        }}
      >
        <Cell
          actor={actor}
          callback={callback}
          column={item.column}
          damage={item.damage}
          editing={editing}
          height={triangleHeight}
          hilightTargets={setAttackTargets}
          index={item.index}
          isActive={isActiveCell(item)}
          isTarget={targetType(item)}
          mode={mode}
          moved={item.moved}
          neighbors={item.neighbors}
          row={item.row}
          setActor={setActor}
          setEdit={setEdit}
          team={item.team}
          terrain={item.terrain}
          unit={item.unit}
          width={cellWidth}
        />
      </div>
      <div
        key={`cell-triangle-bottom-${item.index}`}
        style={{
          borderTop: targetBorder(item),
          borderLeft: borderX,
          borderRight: borderX,
          width: 0
        }}
      />
    </div>
  );

  return (
    <div>
      { mapData.map((row: MapItem[], index: number) => {
        const even = !!(index % 2);
        return (
          <div
            key={`row-${index}`}
            style={{
              height: `${cellHeight}px`,
              width: `${width}px`,
              display: "flex",
              clear: "left",
              justifyContent: "center",
              marginLeft: even ? `0px` : `0px`,
              marginTop: index < 1 ? `${triangleHeight / 3}px` : `0px`
            }}
          >
            { row.map(cellMapper) }
          </div>
        );
      }) }
    </div>
  );
}

export default HexGrid;
