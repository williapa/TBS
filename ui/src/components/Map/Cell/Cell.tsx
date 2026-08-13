import EditorCell from "./EditorCell";
import GameCell from "./GameCell";
import "./Cell.css";
import type { CellProps } from "../../../types";

const Cell = (props: CellProps) => {
  switch(props.mode) {
    case "editor":
      return <EditorCell {...props} />;
    default: // game
      return <GameCell {...props} />;
  }
}

export default Cell;
