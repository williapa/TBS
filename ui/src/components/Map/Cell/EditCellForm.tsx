import FieldMapper from "../../Form/FieldMapper";
import { unitOptions } from "../Unit/unitOptions";
import "./EditCellForm.css";
import type { FormEvent } from "react";
import { mapTeamOptions, mapTerrainOptions, mapUnitOptions } from "@TBS/game-setup";
import { inputTypes } from "../../../types";
import type { CellFormProps, EditableCell, FieldProps, TeamType, TerrainType, UnitTypes } from "../../../types";

const isTerrainType = (value: unknown): value is TerrainType =>
  typeof value === "string" && mapTerrainOptions.some((candidate) => candidate === value);

const isTeamType = (value: unknown): value is TeamType =>
  typeof value === "string" && mapTeamOptions.some((candidate) => candidate === value);

const isUnitType = (value: unknown): value is UnitTypes =>
  typeof value === "string" && mapUnitOptions.some((candidate) => candidate === value);

const EditCellForm = ({ initialValues, top, left, save, close }: CellFormProps) => {
  const { terrain, unit, team } = initialValues;
  
  const editCellFormFields = [
    { type: inputTypes.select, name: "terrain", initial: terrain, options: mapTerrainOptions },
    { type: inputTypes.select, name: "unit", initial: unit, options: unitOptions },
    { type: inputTypes.select, name: "team", initial: team, options: mapTeamOptions },
  ] satisfies readonly FieldProps[];

  const saveChange = (event: FormEvent<HTMLFormElement>) => {
    const data = new FormData(event.currentTarget);
    const terrainValue = data.get("terrain");
    const teamValue = data.get("team");
    const unitValue = data.get("unit");
    if (!isTerrainType(terrainValue) || !isTeamType(teamValue) || !isUnitType(unitValue)) {
      throw new Error("Cell editor selected an invalid option");
    }
    const nextCell = {
      terrain: terrainValue,
      team: teamValue,
      unit: unitValue,
    } satisfies EditableCell;
    save(nextCell);
  };

  return (
    <form className="edit-cell-form" style={{ top, left }} onChange={saveChange}>
      {editCellFormFields.map(FieldMapper)}
      <button type="button" onClick={close}>Close</button>
    </form>
  );
};

export default EditCellForm;
