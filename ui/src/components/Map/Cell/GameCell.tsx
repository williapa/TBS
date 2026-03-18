import { useEffect, useState } from "react";
import Terrain from "./Terrain/Terrain";
import ActionForm from "./Action/ActionForm";
// TODO: react-tooltip
// TODO: on click behavior is different
// TODO: onclick, show move options
// TODO: game mode should a) track those options, b) update the board, c) check who has moved, d) dispatch to srvr e) end turn and wait
const GameCell = ({ 
  actor,
  callback,
  column,
  damage = 0,
  editing,
  height = 40,
  hilightTargets = (targets: number[]) => null,
  isActive,
  isTarget,
  index,
  moved = false,
  neighbors,
  row,
  setActor = (args: any) => null,
  setEdit = (args: any) => null,
  team = "gray" as TeamType.gray,
  terrain,
  unit = "none" as ObjectType.none,
  width = 80
 }: CellProps) => {
  const factor = actor && actor[0];
  const [actionsPosition, setActionsPosition] = useState({ top: 0, left: 0 });
  const [actionsOpen, setActionsOpen] = useState(false);
  // TODO: maybe I should roll these properties up in HexGrid.ts
  const mapItem = { column, index, neighbors, row, team, terrain, unit };

  const setFormVisibility = (boolean: boolean) => { 
    setActionsOpen(boolean); 
    setEdit(boolean); 
  };

  useEffect(() => {
    if (actor && actor[0] === "park&bark" && actor[2].x === row && actor[2].y === column) {
      const possiblyNull = document.querySelector(
        `[data-row="${row}"][data-column="${column}"]`
      );
      if (possiblyNull) {
        console.log("check it");
        console.log(editing);
        const { top, left } = possiblyNull.getBoundingClientRect();
        const pos = { top: (top + window.scrollY), left: (left + window.scrollX) }
        setActionsPosition(pos);
        setFormVisibility(true);
      }
    }
  }, [factor]);
  
  // isActive && !actionsOpen ? j
  const openActions =(e: any) => {
    if (!editing) {      
      const { top, left } = e.target.getBoundingClientRect();
      setActionsPosition({ top: (top + window.scrollY), left: (left + window.scrollX) });
      setFormVisibility(true);
    }
  };

  const cancel = (clear?: boolean, saveStorage?: boolean) => {
    console.log("cancel was clicked");
    if (!saveStorage) {
      console.log("clearing intermediate position from local storage");
      window.localStorage.removeItem("position");
    }
    if (clear) {
      console.log("clearing actor & hilighted targets");
      setActor(false);
      hilightTargets([]);
    }
    setFormVisibility(false);
  }

  const hilightMovementCells = () => {

    console.log("hilight movement cells");

    console.log(actor);
    // stand and attack 
    if (actor && actor[0] === "park&bark" && actor[2].x === row && actor[2].y === column) {

      console.log("self calling callback w/ park n bark");

      callback(row, column, mapItem, "park&bark");

    // refer to actor which contains move position 
    } else {

      callback(row, column, mapItem);

    }

  };

  const clickTargetUnit = (e: any) => {
    // right now move is the only option
    // but later this will need to support many functions
    // think about that...
    if (!actor) {
      console.error("there needs to be an eric, the actor, in order to click a target. otherwise who is acting? event:", e);
      return;
    }
    openActions(e);
  }

  const confirm = () => {
    cancel(false, true);
    callback(row, column, mapItem, isTarget ? isTarget : "move");
  };

  const onCellClick = isTarget ?
    clickTargetUnit :
    isActive ?
      hilightMovementCells :
      undefined;

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
          column={column}
          damage={damage}
          height={height}
          moved={moved}
          row={row}
          team={team}
          type={terrain}
          unitType={unit}
        />
        {actionsOpen && 
          <ActionForm {...actionsPosition}
            attack={hilightTargets}
            cancel={cancel}
            initialValues={{ team, terrain, unit, row, column, index }}
            save={confirm}
            targetType={isTarget}
          /> 
        }
      </span>
    </div>
  );
};
  
export default GameCell;

// 19148793762 wtf is this ... oh god
