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
    | "invalid-health"
    | "invalid-money"
    | "invalid-revision"
    | "invalid-turn"
    | "missing-active-team"
    | "missing-cargo-entity"
    | "missing-occupant"
    | "duplicate-cargo-entity"
    | "entity-key-mismatch"
    | "occupancy-mismatch"
    | "team-key-mismatch";
  path: string;
}>;

export const validateGameState = (state: GameState): readonly StateInvariantViolation[] => {
  const violations: StateInvariantViolation[] = [];
  const cargoEntities = new Set<EntityId>();

  if (!Number.isSafeInteger(state.revision) || state.revision < 0) {
    violations.push({ code: "invalid-revision", path: "revision" });
  }
  if (!Number.isSafeInteger(state.turn.number) || state.turn.number < 0) {
    violations.push({ code: "invalid-turn", path: "turn.number" });
  }
  if (state.lifecycle.phase === "active" && !state.teams[state.lifecycle.activeTeamId]) {
    violations.push({ code: "missing-active-team", path: "lifecycle.activeTeamId" });
  }

  for (const [key, team] of Object.entries(state.teams)) {
    if (key !== team.id) violations.push({ code: "team-key-mismatch", path: `teams.${key}.id` });
    if (!Number.isSafeInteger(team.money) || team.money < 0) {
      violations.push({ code: "invalid-money", path: `teams.${key}.money` });
    }
  }

  for (const [key, entity] of Object.entries(state.entities)) {
    if (key !== entity.id) violations.push({ code: "entity-key-mismatch", path: `entities.${key}.id` });
    if (entity.health && (
      !Number.isSafeInteger(entity.health.current) ||
      !Number.isSafeInteger(entity.health.maximum) ||
      entity.health.current < 0 ||
      entity.health.maximum < 1 ||
      entity.health.current > entity.health.maximum
    )) {
      violations.push({ code: "invalid-health", path: `entities.${key}.health` });
    }
    for (const cargoEntityId of entity.cargo?.entityIds ?? []) {
      if (!state.entities[cargoEntityId]) {
        violations.push({ code: "missing-cargo-entity", path: `entities.${key}.cargo` });
      } else if (cargoEntities.has(cargoEntityId)) {
        violations.push({ code: "duplicate-cargo-entity", path: `entities.${key}.cargo` });
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
      violations.push({ code: "occupancy-mismatch", path: `board.cells.${key}.position` });
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

  return violations;
};
