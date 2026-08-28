import {
  NORMALIZED_GAME_SCHEMA_VERSION,
  entityId,
  hexKey,
  validateGameState,
  type BoardCellState,
  type EntityState,
  type GameState,
  type ObjectiveState,
  type TeamId,
  type TeamState,
} from "@TBS/game-core";
import {
  STANDARD_CONTENT_VERSION,
  STANDARD_RULESET_VERSION,
  STANDARD_STARTING_MONEY,
  standardTeamIds,
  standardUnits,
} from "@TBS/game-rules";

import { mapOffsetToAxial } from "../geometry/mapHex";
import { validatePlayableMap } from "../maps/validation";
import type { MapCell, MapGrid } from "../contracts";
import { isObjectMapUnit } from "../maps/mapUnitOwnership";

const ownerFor = (cell: Pick<MapCell, "team" | "unit">): TeamId | undefined =>
  cell.team === "gray" || isObjectMapUnit(cell.unit) ? undefined : cell.team;

const initialEntity = (
  cell: Pick<MapCell, "team" | "unit">,
  id: ReturnType<typeof entityId>,
  position?: ReturnType<typeof mapOffsetToAxial>,
): EntityState => {
  if (cell.unit === "none") throw new Error("cannot create an entity for an empty map cell");
  const definition = standardUnits.get(cell.unit);
  if (!definition) throw new Error(`missing standard unit definition: ${cell.unit}`);
  const ownerTeamId = ownerFor(cell);
  return {
    id,
    unitTypeId: cell.unit,
    ...(ownerTeamId ? { ownerTeamId } : {}),
    ...(position ? { position } : {}),
    ...(definition.base.maximumHealth
      ? { health: { current: definition.base.maximumHealth, maximum: definition.base.maximumHealth } }
      : {}),
    ...(ownerTeamId ? { actionBudget: { moved: false, acted: false } } : {}),
    statuses: [],
  };
};

export const deriveInitialObjectives = (map: MapGrid): readonly ObjectiveState[] => {
  const capitals = map.flat().filter((cell) => cell.unit === "capital" && cell.team !== "gray");
  const hasCapitalForEveryTeam = standardTeamIds.every((team) =>
    capitals.some((cell) => cell.team === team));
  const capitalObjectives: ObjectiveState[] = hasCapitalForEveryTeam
    ? capitals.map((cell): ObjectiveState => {
        if (cell.team === "gray") throw new Error("validated capital must have a team");
        return {
          type: "capital",
          position: mapOffsetToAxial(cell.row, cell.column, map[0].length),
          controllingTeamId: cell.team,
        };
      })
    : [];
  return [
    ...capitalObjectives,
    ...standardTeamIds.map((teamId): ObjectiveState => ({ type: "elimination", teamId })),
  ];
};

export const createInitialGameState = (value: unknown): GameState => {
  const map = validatePlayableMap(value);
  const width = map[0].length;
  const cells: Record<string, BoardCellState> = {};
  const entities: Record<string, EntityState> = {};

  for (const cell of map.flat()) {
    const position = mapOffsetToAxial(cell.row, cell.column, width);
    const key = hexKey(position);
    const occupantEntityId = cell.unit === "none" ? undefined : entityId(`initial-cell-${cell.index}`);
    cells[key] = {
      position,
      terrainTypeId: cell.terrain,
      ...(occupantEntityId ? { occupantEntityId } : {}),
    };
    if (!occupantEntityId) continue;
    let entity = initialEntity(cell, occupantEntityId, position);
    if (cell.loadedUnit) {
      const cargoId = entityId(`initial-cargo-${cell.index}-0`);
      entities[cargoId] = initialEntity(cell.loadedUnit, cargoId);
      entity = { ...entity, cargo: { capacity: 1, entityIds: [cargoId] } };
    }
    entities[occupantEntityId] = entity;
  }

  const teams: Record<string, TeamState> = Object.fromEntries(standardTeamIds.map((id) => [
    id,
    { id, money: STANDARD_STARTING_MONEY },
  ]));
  const state: GameState = {
    schemaVersion: NORMALIZED_GAME_SCHEMA_VERSION,
    rulesetVersion: STANDARD_RULESET_VERSION,
    contentVersion: STANDARD_CONTENT_VERSION,
    revision: 0,
    lifecycle: { phase: "waiting" },
    board: { cells },
    entities,
    teams,
    objectives: deriveInitialObjectives(map),
    turn: { number: 0 },
  };
  const violations = validateGameState(state);
  if (violations.length > 0) {
    throw new Error(`Initial game state violates invariants: ${JSON.stringify(violations)}`);
  }
  return state;
};

export const createInitialGameSetup = createInitialGameState;
