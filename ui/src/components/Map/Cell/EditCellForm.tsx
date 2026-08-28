import {
  isObjectMapUnit,
  mapPlayerTeamOptions,
  mapTerrainOptions,
  mapUnitOptions,
  normalizeMapUnitTeam,
} from "@TBS/game-setup";
import { getEmojiForUnit } from "@TBS/renderer-2d";
import { useState } from "react";

import prettyPrint from "../../../utils/prettyPrint";
import type {
  CellFormProps,
  EditableCell,
  TeamType,
  TerrainType,
  UnitTypes,
} from "../../../types";
import { unitOptions } from "../Unit/unitOptions";
import "./EditCellForm.css";

const isTerrainType = (value: unknown): value is TerrainType =>
  typeof value === "string" && mapTerrainOptions.some((candidate) => candidate === value);

const isPlayerTeam = (value: unknown): value is TeamType =>
  typeof value === "string" && mapPlayerTeamOptions.some((candidate) => candidate === value);

const isUnitType = (value: unknown): value is UnitTypes =>
  typeof value === "string" && mapUnitOptions.some((candidate) => candidate === value);

const EditCellForm = ({ initialValues, top, left, save, close }: CellFormProps) => {
  const [draft, setDraft] = useState<EditableCell>(() => ({
    terrain: initialValues.terrain,
    unit: initialValues.unit,
    team: normalizeMapUnitTeam(initialValues.unit, initialValues.team),
  }));

  const saveDraft = (next: EditableCell) => {
    setDraft(next);
    save(next);
  };

  const changeTerrain = (value: unknown) => {
    if (!isTerrainType(value)) throw new Error("Cell editor selected an invalid terrain");
    saveDraft({ ...draft, terrain: value });
  };

  const changeUnit = (value: unknown) => {
    if (!isUnitType(value)) throw new Error("Cell editor selected an invalid unit");
    saveDraft({ ...draft, unit: value, team: normalizeMapUnitTeam(value, draft.team) });
  };

  const changeTeam = (value: unknown) => {
    if (!isPlayerTeam(value)) throw new Error("Cell editor selected an invalid team");
    saveDraft({ ...draft, team: value });
  };

  const showTeam = draft.unit !== "none" && !isObjectMapUnit(draft.unit);

  return (
    <form
      className="edit-cell-form"
      style={{ top, left }}
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="form-row">
        <label htmlFor="terrain">terrain</label>
        <select
          id="terrain"
          name="terrain"
          value={draft.terrain}
          onChange={(event) => changeTerrain(event.currentTarget.value)}
        >
          {mapTerrainOptions.map((terrain) => (
            <option className={terrain} key={terrain} value={terrain}>{prettyPrint(terrain)}</option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label htmlFor="unit">unit</label>
        <select
          id="unit"
          name="unit"
          value={draft.unit}
          onChange={(event) => changeUnit(event.currentTarget.value)}
        >
          {unitOptions.map(([group, units]) => (
            <optgroup key={group} label={group}>
              {Object.values(units).map((unit) => (
                <option className={unit} key={unit} value={unit}>
                  {prettyPrint(unit)} {getEmojiForUnit(unit)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      {showTeam && (
        <div className="form-row">
          <label htmlFor="team">team</label>
          <select
            id="team"
            name="team"
            value={draft.team}
            onChange={(event) => changeTeam(event.currentTarget.value)}
          >
            {mapPlayerTeamOptions.map((team) => (
              <option className={team} key={team} value={team}>{prettyPrint(team)}</option>
            ))}
          </select>
        </div>
      )}
      <button type="button" onClick={close}>Close</button>
    </form>
  );
};

export default EditCellForm;
