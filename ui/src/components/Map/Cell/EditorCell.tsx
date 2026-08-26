import { useState } from "react";
import type { MouseEvent } from "react";
import EditCellForm from "./EditCellForm";
import Terrain from "./Terrain/Terrain";
import type { CellProps, EditableCell } from "../../../types";

const EditorCell = ({
  row, 
  column, 
  callback, 
  editing,
  height = 40,
  index,
  setEdit = () => undefined,
  team = "gray",
  terrain, 
  unit = "none",
  width = 80,
}: CellProps) => {
  const [editorPosition, setEditorPosition] = useState({ top: 0, left: 0 });
  const [amIEditing, setAmIEditing] = useState(false);
  
  const editorOnClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!editing) {           
      const { top, left } = e.currentTarget.getBoundingClientRect();
      setEditorPosition({ top: (top + window.scrollY), left: (left + window.scrollX) });
      setEdit(true);
      setAmIEditing(true);
    }
  }

  const cancel = () => {
    setEdit(false);
    setAmIEditing(false);
  };

  const save = (mapItem: EditableCell) => {
    callback?.(row, column, mapItem);
    cancel();
  }

  return (
    <div
      onClick={editorOnClick}
      style={{
        textAlign: "center",
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <span>
        <Terrain height={height} type={terrain} row={row} column={column} unitType={unit} team={team} />
        {amIEditing && 
          <EditCellForm {...editorPosition} 
            initialValues={{ team, terrain, unit, row, column, index }}
            save={save} 
            cancel={cancel} 
          /> 
        }
      </span>
    </div>
  );
}

export default EditorCell;
