import { useState } from "react";
import EditCellForm from "./EditCellForm";
import Terrain from "./Terrain/Terrain";

const EditorCell = ({
  row, 
  column, 
  callback, 
  editing,
  height = 40,
  index,
  setEdit = (args: any) => null,
  team = "gray" as TeamType.gray, 
  terrain, 
  unit = "none" as ObjectType.none,
  width = 80,
}: CellProps) => {
  const [editorPosition, setEditorPosition] = useState({ top: 0, left: 0 });
  const [amIEditing, setAmIEditing] = useState(false);
  
  const editorOnClick = (e: any) => {
    if (!editing) {           
      const { top, left } = e.target.getBoundingClientRect();
      setEditorPosition({ top: (top + window.scrollY), left: (left + window.scrollX) });
      setEdit(true);
      setAmIEditing(true);
    }
  }

  const cancel = () => {
    setEdit(false);
    setAmIEditing(false);
  };

  const save = (mapItem: MapItem) => {
    callback(row, column, mapItem);
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
            attack={()=>null}
          /> 
        }
      </span>
    </div>
  );
}

export default EditorCell;