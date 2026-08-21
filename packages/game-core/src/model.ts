import type {
  ContentVersion,
  EntityId,
  RulesetVersion,
  TeamId,
  TerrainTypeId,
  UnitTypeId,
} from "./ids";
import type { HexCoord, HexKey } from "./hex";
import { hexKey } from "./hex";

export const NORMALIZED_GAME_SCHEMA_VERSION = 2 as const;

export type HealthComponent = Readonly<{
  current: number;
  maximum: number;
}>;

export type ActionBudgetComponent = Readonly<{
  moved: boolean;
  acted: boolean;
}>;

export type CargoComponent = Readonly<{
  capacity: number;
  entityIds: readonly EntityId[];
}>;

export type StatusInstance = Readonly<{
  type: string;
  remainingTurns?: number;
}>;

export type EntityState = Readonly<{
  id: EntityId;
  unitTypeId: UnitTypeId;
  ownerTeamId?: TeamId;
  position?: HexCoord;
  health?: HealthComponent;
  actionBudget?: ActionBudgetComponent;
  cargo?: CargoComponent;
  statuses: readonly StatusInstance[];
}>;

export type BoardCellState = Readonly<{
  position: HexCoord;
  terrainTypeId: TerrainTypeId;
  occupantEntityId?: EntityId;
}>;

export type BoardState = Readonly<{
  cells: Readonly<Record<HexKey, BoardCellState>>;
}>;

export type TeamState = Readonly<{
  id: TeamId;
  money: number;
}>;

export type ObjectiveState =
  | Readonly<{ type: "capital"; position: HexCoord; controllingTeamId?: TeamId }>
  | Readonly<{ type: "elimination"; teamId: TeamId }>;

export type GameLifecycle =
  | Readonly<{ phase: "waiting" }>
  | Readonly<{ phase: "active"; activeTeamId: TeamId }>
  | Readonly<{ phase: "finished"; winnerTeamId: TeamId }>;

export type TurnState = Readonly<{
  number: number;
}>;

export type GameState = Readonly<{
  schemaVersion: typeof NORMALIZED_GAME_SCHEMA_VERSION;
  rulesetVersion: RulesetVersion;
  contentVersion: ContentVersion;
  revision: number;
  lifecycle: GameLifecycle;
  board: BoardState;
  entities: Readonly<Record<EntityId, EntityState>>;
  teams: Readonly<Record<TeamId, TeamState>>;
  objectives: readonly ObjectiveState[];
  turn: TurnState;
}>;

export type StateInvariantViolation = Readonly<{
  code:
    | "cargo-position-mismatch"
    | "entity-key-mismatch"
    | "invalid-board-key"
    | "invalid-cargo"
    | "invalid-content-version"
    | "invalid-health"
    | "invalid-money"
    | "invalid-revision"
    | "invalid-ruleset-version"
    | "invalid-status"
    | "invalid-turn"
    | "missing-active-team"
    | "missing-cargo-entity"
    | "missing-entity-team"
    | "missing-objective-cell"
    | "missing-objective-team"
    | "missing-occupant"
    | "missing-winner-team"
    | "duplicate-cargo-entity"
    | "orphaned-entity"
    | "occupancy-mismatch"
    | "team-key-mismatch";
  path: string;
}>;

const isNonEmptyIdentifier = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const validateGameState = (state: GameState): readonly StateInvariantViolation[] => {
  const violations: StateInvariantViolation[] = [];
  const cargoEntities = new Set<EntityId>();

  if (!Number.isSafeInteger(state.revision) || state.revision < 0) {
    violations.push({ code: "invalid-revision", path: "revision" });
  }
  if (!Number.isSafeInteger(state.turn.number) || state.turn.number < 0) {
    violations.push({ code: "invalid-turn", path: "turn.number" });
  }
  if (!isNonEmptyIdentifier(state.rulesetVersion)) {
    violations.push({ code: "invalid-ruleset-version", path: "rulesetVersion" });
  }
  if (!isNonEmptyIdentifier(state.contentVersion)) {
    violations.push({ code: "invalid-content-version", path: "contentVersion" });
  }
  if (state.lifecycle.phase === "active" && !state.teams[state.lifecycle.activeTeamId]) {
    violations.push({ code: "missing-active-team", path: "lifecycle.activeTeamId" });
  }
  if (state.lifecycle.phase === "finished" && !state.teams[state.lifecycle.winnerTeamId]) {
    violations.push({ code: "missing-winner-team", path: "lifecycle.winnerTeamId" });
  }

  for (const [key, team] of Object.entries(state.teams)) {
    if (key !== team.id) violations.push({ code: "team-key-mismatch", path: `teams.${key}.id` });
    if (!Number.isSafeInteger(team.money) || team.money < 0) {
      violations.push({ code: "invalid-money", path: `teams.${key}.money` });
    }
  }

  for (const [key, entity] of Object.entries(state.entities)) {
    if (key !== entity.id) violations.push({ code: "entity-key-mismatch", path: `entities.${key}.id` });
    if (entity.ownerTeamId && !state.teams[entity.ownerTeamId]) {
      violations.push({ code: "missing-entity-team", path: `entities.${key}.ownerTeamId` });
    }
    if (entity.health && (
      !Number.isSafeInteger(entity.health.current) ||
      !Number.isSafeInteger(entity.health.maximum) ||
      entity.health.current < 0 ||
      entity.health.maximum < 1 ||
      entity.health.current > entity.health.maximum
    )) {
      violations.push({ code: "invalid-health", path: `entities.${key}.health` });
    }
    for (const [statusIndex, status] of entity.statuses.entries()) {
      if (
        !isNonEmptyIdentifier(status.type)
        || (status.remainingTurns !== undefined
          && (!Number.isSafeInteger(status.remainingTurns) || status.remainingTurns < 1))
      ) {
        violations.push({ code: "invalid-status", path: `entities.${key}.statuses.${statusIndex}` });
      }
    }
    if (entity.cargo && (
      !Number.isSafeInteger(entity.cargo.capacity)
      || entity.cargo.capacity < 0
      || entity.cargo.entityIds.length > entity.cargo.capacity
    )) {
      violations.push({ code: "invalid-cargo", path: `entities.${key}.cargo` });
    }
    for (const cargoEntityId of entity.cargo?.entityIds ?? []) {
      const cargoEntity = state.entities[cargoEntityId];
      if (!cargoEntity) {
        violations.push({ code: "missing-cargo-entity", path: `entities.${key}.cargo` });
      } else if (cargoEntityId === entity.id) {
        violations.push({ code: "invalid-cargo", path: `entities.${key}.cargo` });
      } else if (cargoEntities.has(cargoEntityId)) {
        violations.push({ code: "duplicate-cargo-entity", path: `entities.${key}.cargo` });
      }
      if (cargoEntity?.position) {
        violations.push({ code: "cargo-position-mismatch", path: `entities.${cargoEntityId}.position` });
      }
      cargoEntities.add(cargoEntityId);
    }
    if (entity.position) {
      const cell = state.board.cells[hexKey(entity.position)];
      if (cell?.occupantEntityId !== entity.id) {
        violations.push({ code: "occupancy-mismatch", path: `entities.${key}.position` });
      }
    }
  }

  for (const [key, cell] of Object.entries(state.board.cells)) {
    if (key !== hexKey(cell.position)) {
      violations.push({ code: "invalid-board-key", path: `board.cells.${key}.position` });
    }
    if (cell.occupantEntityId) {
      const occupant = state.entities[cell.occupantEntityId];
      if (!occupant) {
        violations.push({ code: "missing-occupant", path: `board.cells.${key}.occupantEntityId` });
      } else if (!occupant.position || hexKey(occupant.position) !== key) {
        violations.push({ code: "occupancy-mismatch", path: `board.cells.${key}.occupantEntityId` });
      }
    }
  }

  for (const [key, entity] of Object.entries(state.entities)) {
    if (!entity.position && !cargoEntities.has(entity.id)) {
      violations.push({ code: "orphaned-entity", path: `entities.${key}.position` });
    }
  }

  for (const [objectiveIndex, objective] of state.objectives.entries()) {
    if (objective.type === "elimination" && !state.teams[objective.teamId]) {
      violations.push({ code: "missing-objective-team", path: `objectives.${objectiveIndex}.teamId` });
    }
    if (objective.type === "capital") {
      if (!state.board.cells[hexKey(objective.position)]) {
        violations.push({ code: "missing-objective-cell", path: `objectives.${objectiveIndex}.position` });
      }
      if (objective.controllingTeamId && !state.teams[objective.controllingTeamId]) {
        violations.push({
          code: "missing-objective-team",
          path: `objectives.${objectiveIndex}.controllingTeamId`,
        });
      }
    }
  }

  return violations;
};
