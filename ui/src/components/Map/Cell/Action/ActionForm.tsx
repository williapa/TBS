import { getAttackableCells } from "@TBS/common";
import useGame from "../../../../hooks/useGame";
import { useGameSocket } from "../../../../hooks/gameSocketContext";
const ActionForm = (props: CellFormProps) => {

  const { data } = useGame();
  const { map, turn } = useGameSocket();

  let attackableCells: number[] = [];

  const { activeTurn, creator, mapData } = data as GameProps;
  const finalMap = map[0].length > 1 ? map : mapData;
  const currentActiveTurn = (turn.length > 0) ? turn : activeTurn;

  if (finalMap) {
    const activeTeam = (currentActiveTurn === creator) ? "orange" : "purple";
    attackableCells = getAttackableCells(activeTeam, [props.initialValues.index], finalMap);
  }
  
  const move = (e: any) => {
    e.preventDefault();
    props.save();
    props.cancel();
  };

  const attack = (e: any) => {
    e.preventDefault();
    props.save();
    // experiment
    props.cancel(true);
  };

  const displayAttackOptions = (e: any) => {
    e.preventDefault();
    console.log("display attack options");
    window.localStorage.setItem("position", `${props.initialValues.index}`);
    props.attack(attackableCells);
    props.cancel(false, true); // false - do not clear actor & hilight targets. true (2nd arg) - save local storage position
  };

  const clearAndCancel = (e: any) => {
    e.preventDefault();
    e.stopPropagation(); // this is necessary, otherwise this bubbles up to the gameCell onClick which creates problems, like re-hilighting
    props.cancel(true);
  }
  
  return (
    <form className="edit-cell-form" style={{ top: props.top, left: props.left }} >
      <p style={{color: "black" }}> Options </p>
      { (!!attackableCells.length && props.targetType !== "attack") && (
        <button style={{ width: "100%" }} onClick={displayAttackOptions}> Attack </button>
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