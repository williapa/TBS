import EditorCell from "./EditorCell";
import "./Cell.css";
import type { CellProps } from "../../../types";

const Cell = (props: CellProps) => <EditorCell {...props} />;

export default Cell;
