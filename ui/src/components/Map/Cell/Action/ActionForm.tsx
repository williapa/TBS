import type React from "react";

const ActionForm = ({ left, onAction, options, top }: ActionFormProps) => {
  const handleClick = (action: GameMenuActionId) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onAction(action);
  };

  return (
    <form className="edit-cell-form" style={{ top, left }}>
      <p style={{ color: "black" }}> Options </p>
      {options.map(({ id, label }) => (
        <button key={id} style={{ width: "100%" }} onClick={handleClick(id)}>
          {label}
        </button>
      ))}
    </form>
  );
};

export default ActionForm;
