import {
  NORMALIZED_GAME_SCHEMA_VERSION,
  contentVersion,
  entityId,
  legacyOffsetToAxial,
  rulesetVersion,
  teamId,
  terrainTypeId,
  unitTypeId,
  validateGameState,
  hexKey,
  type BoardCellState,
  type EntityState,
  type GameLifecycle,
  type GameState,
  type ObjectiveState,
  type TeamState,
} from "@TBS/game-core";

import { legacyGameStateSchema, type LegacyGameState, type LegacyMapCell } from "../schemas/legacy-v1";

export const MIGRATED_V1_RULESET_VERSION = "standard@1" as const;
export const MIGRATED_V1_CONTENT_VERSION = "standard@1" as const;

const owner = (team: LegacyMapCell["team"]) =>
  team === "gray" ? undefined : teamId(team);

const statuses = (boosted: boolean | undefined) =>
  boosted ? [{ type: "boosted" }] : [];

const entityFromLegacyUnit = (
  id: string,
  unit: string,
  team: LegacyMapCell["team"],
  damage: number | undefined,
  moved: boolean | undefined,
  position?: ReturnType<typeof legacyOffsetToAxial>,
): EntityState => ({
  id: entityId(id),
  unitTypeId: unitTypeId(unit),
  ...(owner(team) ? { ownerTeamId: owner(team) } : {}),
  ...(position ? { position } : {}),
  health: { current: 100 - (damage ?? 0), maximum: 100 },
  actionBudget: { moved: moved ?? false, acted: moved ?? false },
  statuses: [],
});

const lifecycleFromLegacy = (state: LegacyGameState): GameLifecycle => {
  if (state.status === "waiting") return { phase: "waiting" };
  if (state.status === "active" && state.activeTeam) {
    return { phase: "active", activeTeamId: teamId(state.activeTeam) };
  }
  if (state.status === "finished" && state.winner) {
    return { phase: "finished", winnerTeamId: teamId(state.winner) };
  }
  throw new Error(`Legacy ${state.status} lifecycle is incomplete`);
};

export const migrateV1GameState = (value: unknown): GameState => {
  const legacy = legacyGameStateSchema.parse(value);
  const width = legacy.map[0].length;
  const cells: Record<string, BoardCellState> = {};
  const entities: Record<string, EntityState> = {};
  const objectives: ObjectiveState[] = [];
  const indexes = new Set<number>();

  for (const [rowIndex, row] of legacy.map.entries()) {
    for (const [columnIndex, cell] of row.entries()) {
      if (cell.row !== rowIndex || cell.column !== columnIndex) {
        throw new Error(`Legacy cell ${cell.index} row/column does not match its map position`);
      }
      if (indexes.has(cell.index)) throw new Error(`Duplicate legacy cell index: ${cell.index}`);
      indexes.add(cell.index);

      const position = legacyOffsetToAxial(cell.row, cell.column, width);
      const occupantId = cell.unit === "none"
        ? undefined
        : entityId(cell.entityId ?? `legacy-cell-${cell.index}`);
      const positionKey = hexKey(position);
      if (cells[positionKey]) throw new Error(`Duplicate legacy cell position: ${positionKey}`);
      cells[positionKey] = {
        position,
        terrainTypeId: terrainTypeId(cell.terrain),
        ...(occupantId ? { occupantEntityId: occupantId } : {}),
      };

      if (!occupantId) continue;
      let entity = entityFromLegacyUnit(
        occupantId,
        cell.unit,
        cell.team,
        cell.damage,
        cell.moved,
        position,
      );
      entity = { ...entity, statuses: statuses(cell.boosted) };

      if (cell.loadedUnit) {
        const cargoId = entityId(cell.loadedUnit.entityId ?? `legacy-cargo-${cell.index}-0`);
        entities[cargoId] = {
          ...entityFromLegacyUnit(
            cargoId,
            cell.loadedUnit.unit,
            cell.loadedUnit.team,
            cell.loadedUnit.damage,
            cell.loadedUnit.moved,
          ),
          statuses: statuses(cell.loadedUnit.boosted),
        };
        entity = { ...entity, cargo: { capacity: 1, entityIds: [cargoId] } };
      }

      entities[occupantId] = entity;
      if (cell.unit === "capital" && legacy.winCondition === "capital-or-combat-elimination") {
        objectives.push({
          type: "capital",
          position,
          ...(owner(cell.team) ? { controllingTeamId: owner(cell.team) } : {}),
        });
      }
    }
  }

  const orange = teamId("orange");
  const purple = teamId("purple");
  const teams: Record<string, TeamState> = {
    [orange]: { id: orange, money: legacy.money.orange },
    [purple]: { id: purple, money: legacy.money.purple },
  };
  objectives.push(
    { type: "elimination", teamId: orange },
    { type: "elimination", teamId: purple },
  );

  const state: GameState = {
    schemaVersion: NORMALIZED_GAME_SCHEMA_VERSION,
    rulesetVersion: rulesetVersion(MIGRATED_V1_RULESET_VERSION),
    contentVersion: contentVersion(MIGRATED_V1_CONTENT_VERSION),
    revision: legacy.revision,
    lifecycle: lifecycleFromLegacy(legacy),
    board: { cells },
    entities,
    teams,
    objectives,
    turn: { number: 0 },
  };

  const violations = validateGameState(state);
  if (violations.length > 0) {
    throw new Error(`Migrated game state violates invariants: ${JSON.stringify(violations)}`);
  }
  return state;
};
