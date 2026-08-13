import FieldMapper from "../../Form/FieldMapper";
import { unitOptions } from "../Unit/unitOptions";
import "./EditCellForm.css";
import type { FormEvent, MouseEvent } from "react";
import { TerrainOptions, teamOptions } from "@TBS/common";
import { inputTypes } from "../../../types";
import type { CellFormProps, EditableCell, FieldProps, TeamType, TerrainType, UnitTypes } from "../../../types";

const teamTypes = [teamOptions[0], "gray", teamOptions[1]] as const;

const isTerrainType = (value: unknown): value is TerrainType =>
  typeof value === "string" && TerrainOptions.some((candidate) => candidate === value);

const isTeamType = (value: unknown): value is TeamType =>
  typeof value === "string" && teamTypes.some((candidate) => candidate === value);

const isUnitType = (value: unknown): value is UnitTypes =>
  typeof value === "string" &&
  unitOptions.some(([, candidates]) => candidates.some((candidate) => candidate === value));

const EditCellForm = ({ initialValues, top, left, save, cancel }: CellFormProps) => {
  const { terrain, unit, team } = initialValues;
  
  const editCellFormFields = [
    { type: inputTypes.select, name: "terrain", initial: terrain, options: TerrainOptions },
    { type: inputTypes.select, name: "unit", initial: unit, options: unitOptions },
    { type: inputTypes.select, name: "team", initial: team, options: teamTypes },
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
