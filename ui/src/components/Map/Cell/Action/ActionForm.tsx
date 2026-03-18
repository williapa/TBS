import { getAttackableCells } from "@TBS/common";
import useGame from "../../../../hooks/useGame";

const ActionForm = (props: CellFormProps) => {

  const { data } = useGame();

  let attackableCells: number[] = [];

  if (data) {
    const { activeTurn, creator, mapData } = data as GameProps;
    const activeTeam = activeTurn === creator ? "orange" : "purple";
    attackableCells = getAttackableCells(activeTeam, [props.initialValues.index], mapData);
  }
  
  const move = (e: any) => {
    e.preventDefault();
    props.save();
    props.cancel();
  };

  const attack = (e: any) => {
    e.preventDefault();
    props.save();
    // todo: cancel gets called later (i think???)
    // props.cancel();
  };

  const displayAttackOptions = (e: any) => {
    e.preventDefault();
    console.log("display attack options");
    console.log(props.initialValues);
    window.localStorage.setItem("position", `${props.initialValues.index}`);
    props.attack(attackableCells);
    props.cancel(false, true); // false - do not clear actor & hilight targets. true (2nd arg) - save local storage position
  };

  const clearAndCancel = (e: any) => {
    e.preventDefault();
    props.cancel(true);
  }
  
  return (
    <form className="edit-cell-form" style={{ top: props.top, left: props.left }} >
      <p style={{color: "black" }}> Options </p>
      { !!attackableCells.length && (
        <button style={{ width: "100%" }} onClick={displayAttackOptions}>Attack</button>
      )}
      { props.targetType === "move" && (
        <button style={{ width: "100%" }} onClick={move}> Move </button>
      )}
      { props.targetType === "attack" && (
        <button style={{ width: "100%" }} onClick={attack} > Confirm { props.targetType } </button>
      )}
      <button style={{ width: "100%" }} onClick={clearAndCancel}> Cancel </button>
    </form>
  );
};

export default ActionForm;