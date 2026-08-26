import FieldMapper from "../../Form/FieldMapper";
import { unitOptions } from "../Unit/unitOptions";
import "./EditCellForm.css";
import type { FormEvent, MouseEvent } from "react";
import { mapTeamOptions, mapTerrainOptions, mapUnitOptions } from "@TBS/game-setup";
import { inputTypes } from "../../../types";
import type { CellFormProps, EditableCell, FieldProps, TeamType, TerrainType, UnitTypes } from "../../../types";

const isTerrainType = (value: unknown): value is TerrainType =>
  typeof value === "string" && mapTerrainOptions.some((candidate) => candidate === value);

const isTeamType = (value: unknown): value is TeamType =>
  typeof value === "string" && mapTeamOptions.some((candidate) => candidate === value);

const isUnitType = (value: unknown): value is UnitTypes =>
  typeof value === "string" && mapUnitOptions.some((candidate) => candidate === value);

const EditCellForm = ({ initialValues, top, left, save, cancel }: CellFormProps) => {
  const { terrain, unit, team } = initialValues;
  
  const editCellFormFields = [
    { type: inputTypes.select, name: "terrain", initial: terrain, options: mapTerrainOptions },
    { type: inputTypes.select, name: "unit", initial: unit, options: unitOptions },
    { type: inputTypes.select, name: "team", initial: team, options: mapTeamOptions },
  ] satisfies readonly FieldProps[];

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const terrainValue = data.get("terrain");
    const teamValue = data.get("team");
    const unitValue = data.get("unit");
    if (!isTerrainType(terrainValue) || !isTeamType(teamValue) || !isUnitType(unitValue)) {
      throw new Error("Cell editor submitted an invalid option");
    }
    const nextCell = {
      terrain: terrainValue,
      team: teamValue,
      unit: unitValue,
    } satisfies EditableCell;
    save(nextCell);
  };

  const onCancel = (e: MouseEvent<HTMLButtonElement>) => {
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
