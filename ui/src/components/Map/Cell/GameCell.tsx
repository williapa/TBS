import type React from "react";
import ActionForm from "./Action/ActionForm";
import Terrain from "./Terrain/Terrain";
import type { CellProps, MenuPosition } from "../../../types";

const getMenuPosition = (element: HTMLDivElement): MenuPosition => {
  const { top, left } = element.getBoundingClientRect();

  return {
    top: top + window.scrollY,
    left: left + window.scrollX,
  };
};

const GameCell = ({
  column,
  boosted = false,
  damage = 0,
  gameMenu,
  height = 40,
  index,
  isActive,
  loadedUnit,
  moved = false,
  neighbors,
  onGameCellClick,
  row,
  targetType,
  team = "gray",
  terrain,
  unit = "none",
  width = 80,
}: CellProps) => {
  const mapItem = { boosted, column, damage, index, loadedUnit, moved, neighbors, row, team, terrain, unit };

  const onCellClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onGameCellClick) {
      return;
    }

    if (!isActive && !targetType) {
      onGameCellClick(mapItem, getMenuPosition(event.currentTarget));
      return;
    }

    onGameCellClick(mapItem, getMenuPosition(event.currentTarget));
  };

  return (
    <div
      onClick={onCellClick}
      style={{
        textAlign: "center",
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <span>
        <Terrain
          boosted={boosted}
          column={column}
          damage={damage}
          height={height}
          loadedUnit={loadedUnit}
          moved={moved}
          row={row}
          team={team}
          type={terrain}
          unitType={unit}
        />
        {gameMenu && (
          <ActionForm
            left={gameMenu.position.left}
            onAction={gameMenu.onAction}
            options={gameMenu.options}
            top={gameMenu.position.top}
          />
        )}
      </span>
    </div>
  );
};

export default GameCell;
