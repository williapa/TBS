import type { EntityId, GameState, HexCoord, TeamId, UnitTypeId } from "@TBS/game-core";

import type { UnitDefinition } from "../content/units";

export type MoveAction = Readonly<{
  type: "move";
  actorId: EntityId;
  destination: HexCoord;
  objectTarget?: HexCoord;
}>;

export type EndTurnAction = Readonly<{
  type: "end-turn";
}>;

export type BoostAction = Readonly<{
  type: "boost";
  actorId: EntityId;
  destination: HexCoord;
  targetId: EntityId;
}>;

export type HealAction = Readonly<{
  type: "heal";
  actorId: EntityId;
  destination: HexCoord;
  targetId: EntityId;
}>;

export type ConstructAction = Readonly<{
  type: "construct";
  actorId: EntityId;
  destination: HexCoord;
  constructionPosition: HexCoord;
  buildingEntityId: EntityId;
  buildingUnitTypeId: UnitTypeId;
}>;

export type SpawnAction = Readonly<{
  type: "spawn";
  actorId: EntityId;
  destination: HexCoord;
  spawnedEntityId: EntityId;
  unitTypeId: UnitTypeId;
}>;

export type AttackAction = Readonly<{
  type: "attack";
  actorId: EntityId;
  destination: HexCoord;
  defenderId: EntityId;
}>;

export type LoadAction = Readonly<{
  type: "load";
  actorId: EntityId;
  destination: HexCoord;
  vehicleId: EntityId;
}>;

export type UnloadAction = Readonly<{
  type: "unload";
  actorId: EntityId;
  destination: HexCoord;
  unloadPosition: HexCoord;
}>;

export type StandardAction =
  | MoveAction
  | EndTurnAction
  | BoostAction
  | HealAction
  | ConstructAction
  | SpawnAction
  | AttackAction
  | LoadAction
  | UnloadAction;

export type ObjectDamage = Readonly<{
  entityId: EntityId;
  position: HexCoord;
  unitTypeId: UnitTypeId;
  damage: number;
  killed: boolean;
}>;

export type StandardEvent =
  | Readonly<{
      type: "unit-moved";
      actorTeamId: TeamId;
      entityId: EntityId;
      unitTypeId: UnitTypeId;
      start: HexCoord;
      end: HexCoord;
      consumedObjectTypeId?: UnitTypeId;
      moneyAward?: number;
      objectTarget?: HexCoord;
      objectPreventedByPriest?: boolean;
      objectDamage?: readonly ObjectDamage[];
    }>
  | Readonly<{
      type: "turn-ended";
      actorTeamId: TeamId;
      nextTeamId: TeamId;
      income: number;
      money: Readonly<Record<TeamId, number>>;
    }>
  | Readonly<{
      type: "unit-boosted" | "unit-healed";
      actorTeamId: TeamId;
      actorId: EntityId;
      targetId: EntityId;
      start: HexCoord;
      end: HexCoord;
      amount?: number;
      consumedObjectTypeId?: UnitTypeId;
      moneyAward?: number;
    }>
  | Readonly<{
      type: "unit-constructed";
      actorTeamId: TeamId;
      actorId: EntityId;
      entityId: EntityId;
      unitTypeId: UnitTypeId;
      position: HexCoord;
      start: HexCoord;
      end: HexCoord;
      cost: number;
      consumedObjectTypeId?: UnitTypeId;
      moneyAward?: number;
    }>
  | Readonly<{
      type: "unit-spawned";
      actorTeamId: TeamId;
      buildingId: EntityId;
      entityId: EntityId;
      unitTypeId: UnitTypeId;
      position: HexCoord;
      cost: number;
    }>
  | Readonly<{
      type: "unit-attacked";
      actorTeamId: TeamId;
      attackerId: EntityId;
      defenderId: EntityId;
      attackerUnitTypeId: UnitTypeId;
      defenderUnitTypeId: UnitTypeId;
      start: HexCoord;
      end: HexCoord;
      defenderPosition: HexCoord;
      attackDamage: number;
      counterattackDamage: number;
      deaths: readonly EntityId[];
      consumedObjectTypeId?: UnitTypeId;
      moneyAward?: number;
    }>
  | Readonly<{
      type: "unit-loaded";
      actorTeamId: TeamId;
      entityId: EntityId;
      vehicleId: EntityId;
      start: HexCoord;
      end: HexCoord;
      consumedObjectTypeId?: UnitTypeId;
      moneyAward?: number;
    }>
  | Readonly<{
      type: "unit-unloaded";
      actorTeamId: TeamId;
      entityId: EntityId;
      vehicleId: EntityId;
      start: HexCoord;
      end: HexCoord;
      unloadPosition: HexCoord;
      consumedObjectTypeId?: UnitTypeId;
      moneyAward?: number;
    }>
  | Readonly<{
      type: "game-over";
      winnerTeamId: TeamId;
    }>;

export type StandardRuleServices = Readonly<{
  getUnit: (id: UnitTypeId) => UnitDefinition | undefined;
}>;

export type StandardActionState = GameState;
