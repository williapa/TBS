import { getSpawnOptions, moveableOptions } from "@TBS/common";
import Cell from "../../components/Map/Cell/Cell";
import { terrainColors } from "../../components/Map/Cell/Terrain/terrainColors";
import replaceOpacity from "../../utils/replaceOpacity";

const hex = (n: number) => 2 * n - 1;

type HexGridProps = {
  activeTeam?: TeamType;
  callback?: (x: number, y: number, mapItem: MapItem, action?: gameActions) => void;
  dimensions: dim;
  editing?: boolean;
  gameInteraction?: GameGridInteractionProps;
  mapData: HexMap;
  mode?: ModeType;
  setEdit?: (args: any) => void;
}

const HexGrid = ({
  activeTeam = "gray" as TeamType.gray,
  callback,
  dimensions,
  editing = false,
  gameInteraction,
  mapData,
  mode = "game",
  setEdit,
}: HexGridProps) => {
  const { width, height } = dimensions;
  const targetCells = gameInteraction?.targetedCellIndexes ?? [];
  const targetType = gameInteraction?.targetType ?? null;

  const x = 3;

  const hexDimension = hex(mapData[0].length);
  const cellHeight = (height) / (hexDimension + 1);
  const cellWidth = (width / hexDimension) - x;
  const triangleHeight = (cellHeight - x) / 2;
  const borderWidth = ((cellWidth + (x / 2.46)) / 2);
  const borderY = (color: string) => `${triangleHeight}px solid ${color}`;
  const borderX = `${borderWidth}px solid transparent`;

  const isActiveTeam = (team: TeamType) => team === activeTeam && activeTeam !== "gray";
  const isActionableCell = (item: MapItem) =>
    isActiveTeam(item.team) &&
    !item.moved &&
    (
      moveableOptions.includes(item.unit) ||
      getSpawnOptions(item.unit, Number.MAX_SAFE_INTEGER).length > 0
    );
  const isActiveCell = (item: MapItem) => isActionableCell(item);
  const buildCursor = (item: MapItem) => {
    if (mode === "game" && gameInteraction?.interactive) {
      return (isActionableCell(item) || targetCells.includes(item.index))
        ? "pointer"
        : "default";
    }

    if (mode === "editor") {
      return "pointer";
    }

    return "default";
  };

  const isTarget = (item: MapItem) => targetCells.includes(item.index);

  const targetBorder = (item: MapItem, square?: boolean) => {
    let opaqueBorderCss = terrainColors[item.terrain];
    if (isTarget(item)) {
      opaqueBorderCss = replaceOpacity(opaqueBorderCss);
    }
    if (square) {
      return opaqueBorderCss;
    }
    return borderY(opaqueBorderCss);
  };

  const cellMapper = (item: MapItem) => {
    const isMenuCell = gameInteraction?.menu?.cellIndex === item.index;
    const cellMenu = isMenuCell && gameInteraction?.menu ? {
      onAction: gameInteraction.onMenuAction,
      options: gameInteraction.menu.options,
      position: gameInteraction.menu.position,
    } : undefined;

    return (
      <div
        key={item.index}
        style={{
          width: `${cellWidth}px`,
          height: `${cellHeight}px`,
          textAlign: "center",
          float: "left",
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
            callback={callback}
            column={item.column}
            damage={item.damage}
            editing={editing}
            gameMenu={cellMenu}
            height={triangleHeight}
            index={item.index}
            isActive={mode === "game" ? isActiveCell(item) : false}
            loadedUnit={item.loadedUnit}
            mode={mode}
            moved={item.moved}
            neighbors={item.neighbors}
            onGameCellClick={gameInteraction?.onCellClick}
            row={item.row}
            setEdit={setEdit}
            targetType={isTarget(item) ? targetType : null}
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
  };

  return (
    <div>
      {mapData.map((row: MapItem[], index: number) => {
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
              marginLeft: even ? "0px" : "0px",
              marginTop: index < 1 ? `${triangleHeight / 3}px` : "0px"
            }}
          >
            {row.map(cellMapper)}
          </div>
        );
      })}
    </div>
  );
}

export default HexGrid;
