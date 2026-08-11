import {
  Coords,
  GameAction,
  MapItem,
  ObjectUnitOption,
  SpawnableUnitOption,
  TeamOption,
  UnitOption,
  BuildingUnitOption,
  WinCondition,
} from "../types";

export const CURRENT_GAME_SCHEMA_VERSION = 1 as const;
export const CURRENT_GAME_PROTOCOL_VERSION = 1 as const;

export type GameStatus = "waiting" | "active" | "finished";

export type PersistedGamePayload = {
  map: MapItem[][];
  money: Record<TeamOption, number>;
};

export type GameState = PersistedGamePayload & {
  schemaVersion: typeof CURRENT_GAME_SCHEMA_VERSION;
  revision: number;
  status: GameStatus;
  activeTeam?: TeamOption;
  winner?: TeamOption;
  winCondition?: WinCondition;
};

export type PlayerSeat = {
  memberId: string;
  displayName: string;
};

export type GameSnapshot = {
  gameId: string;
  players: {
    orange?: PlayerSeat;
    purple?: PlayerSeat;
  };
  spectatorCount: number;
  state: GameState;
};

export type ActionEnvelope = {
  protocolVersion: typeof CURRENT_GAME_PROTOCOL_VERSION;
  actionId: string;
  expectedRevision: number;
  action: GameAction;
};

type DomainEventBase = { actorTeam: TeamOption };

export type DomainEvent =
  | (DomainEventBase & { type: "move"; start: Coords; end: Coords; unit: UnitOption; consumedObject?: ObjectUnitOption; moneyAward?: number; objectTarget?: Coords; objectPreventedByPriest?: boolean; objectDamage?: { cell: Coords; damage: number; unit: UnitOption; killed: boolean }[] })
  | (DomainEventBase & { type: "attack"; start: Coords; end: Coords; defender: Coords; unit: UnitOption; defendingUnit: UnitOption; attackDamage: number; defenseDamage: number; deaths: Coords[]; consumedObject?: ObjectUnitOption; moneyAward?: number })
  | (DomainEventBase & { type: "boost"; start: Coords; end: Coords; target: Coords; unit: UnitOption; boostedUnit: UnitOption; consumedObject?: ObjectUnitOption; moneyAward?: number })
  | (DomainEventBase & { type: "heal"; start: Coords; end: Coords; target: Coords; unit: UnitOption; healedUnit: UnitOption; healedDamage: number; consumedObject?: ObjectUnitOption; moneyAward?: number })
  | (DomainEventBase & { type: "construct"; worker: Coords; cell: Coords; building: BuildingUnitOption; cost: number; consumedObject?: ObjectUnitOption; moneyAward?: number })
  | (DomainEventBase & { type: "spawn"; building: Coords; end: Coords; unit: SpawnableUnitOption; cost: number })
  | (DomainEventBase & { type: "load"; start: Coords; end: Coords; vehicle: Coords; unit: UnitOption; vehicleUnit: UnitOption; consumedObject?: ObjectUnitOption; moneyAward?: number })
  | (DomainEventBase & { type: "unload"; start: Coords; end: Coords; cell: Coords; unit: UnitOption; vehicleUnit: UnitOption; consumedObject?: ObjectUnitOption; moneyAward?: number })
  | (DomainEventBase & { type: "endTurn"; nextTeam: TeamOption; income: number; money: Record<TeamOption, number> })
  | (DomainEventBase & { type: "gameOver"; winner: TeamOption });

export type AppliedAction = {
  protocolVersion: typeof CURRENT_GAME_PROTOCOL_VERSION;
  actionId: string;
  revision: number;
  actorTeam: TeamOption;
  action: GameAction;
  events: DomainEvent[];
};

export type GameActionRejectionCode =
  | "finished-game"
  | "inactive-game"
  | "wrong-team"
  | "unsupported-action"
  | "invalid-action";

export type ApplyGameActionResult =
  | { ok: true; state: GameState; events: DomainEvent[] }
  | { ok: false; code: GameActionRejectionCode; message: string };
