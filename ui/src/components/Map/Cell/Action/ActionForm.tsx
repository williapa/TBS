import type React from "react";
import { getEmojiForUnit } from "@TBS/renderer-2d";
import type { ActionFormProps, GameMenuActionId } from "../../../../types";

const ActionForm = ({ left, onAction, options, top }: ActionFormProps) => {
  const handleClick = (action: GameMenuActionId) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onAction(action);
  };

  return (
    <form className="edit-cell-form" style={{ top, left }}>
      <p style={{ color: "black" }}> Options </p>
      {options.map(({ disabled, id, label, unitType }) => (
        <button
          key={id}
          disabled={Boolean(disabled)}
          style={{ width: "100%" }}
          type="button"
          onClick={handleClick(id)}
        >
          {unitType ? `${getEmojiForUnit(unitType)} ${label}` : label}
        </button>
      ))}
    </form>
  );
};

export default ActionForm;
