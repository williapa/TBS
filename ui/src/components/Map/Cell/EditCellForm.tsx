import FieldMapper from "../../Form/FieldMapper";
import { unitOptions } from "../Unit/unitOptions";
import "./EditCellForm.css";

const terrainOptions = [
  "beach", // brown
  "forest", // green
  "mountain", // black
  "road", // gray
  "plains", // white
  "desert", // yellow
  "water", // blue
];

const teamTypes = [
  "orange",
  "gray",
  "purple"
];

const EditCellForm = ({ initialValues, top, left, save, cancel }: CellFormProps) => {
  const { terrain, unit, team } = initialValues;
  
  const editCellFormFields = [
    {type: "select" as InputType.select, name: "terrain", initial: terrain, options: terrainOptions },
    {type: "select" as InputType.select, name: "unit", initial: unit, options: unitOptions },
    {type: "select" as InputType.select, name: "team", initial: team, options: teamTypes }
  ];

  const submit = (e: any) => {
    e.preventDefault();
    const { terrain, team, unit }  = e.target;
    save({ terrain: terrain.value, team: team.value, unit: unit.value } as MapItem);
  };

  const onCancel = (e: any) => {
    e.preventDefault();
    cancel();
  };

  return (
    <form className="edit-cell-form" style={{ top, left }} onSubmit={submit} >
      {editCellFormFields.map(FieldMapper)}
      <input style={{ minWidth: "50%", maxWidth: "50%" }} type="submit" />
      <button style={{ width: "50%" }} onClick={onCancel} > cancel </button>
    </form>
  );
};

export default EditCellForm;