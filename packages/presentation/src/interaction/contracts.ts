import type {
  BuildingUnitOption,
  Coords,
  MapItem,
  SpawnableUnitOption,
  TeamColor,
  UnitOption,
} from "@TBS/common";

export type HexMap = MapItem[][];
export type MenuPosition = Readonly<{ top: number; left: number }>;

export type GameInteractionMode =
  | "idle"
  | "unitSelected"
  | "actionMenu"
  | "targetingAttack"
  | "targetingBoost"
  | "targetingHeal"
  | "targetingMissile"
  | "targetingNuke"
  | "targetingConstruct"
  | "targetingLoad"
  | "targetingSpawn"
  | "targetingUnload";

export type GameCellTargetType =
  | "move"
  | "attack"
  | "boost"
  | "construct"
  | "heal"
  | "load"
  | "spawn"
  | "unload";

export type GameMenuActionId =
  | "move"
  | "chooseAttack"
  | "chooseBoost"
  | "chooseConstruct"
  | "chooseHeal"
  | "chooseLoad"
  | "chooseUnload"
  | "confirmAttack"
  | "confirmBoost"
  | "confirmHeal"
  | "confirmMissileLaunch"
  | "confirmNukeLaunch"
  | "confirmConstruct"
  | "confirmLoad"
  | "confirmSpawn"
  | "confirmUnload"
  | "cancel"
  | `construct:${BuildingUnitOption}`
  | `spawn:${SpawnableUnitOption}`;

export type GameMenuOption = Readonly<{
  disabled?: boolean;
  id: GameMenuActionId;
  label: string;
  unitType?: UnitOption;
}>;

export type GameActionMenuState = Readonly<{
  cellIndex: number;
  kind:
    | "origin"
    | "move"
    | "attack"
    | "boost"
    | "construct"
    | "heal"
    | "missile"
    | "nuke"
    | "load"
    | "spawn"
    | "unload"
    | "constructSelection";
  options: readonly GameMenuOption[];
  position: MenuPosition;
}>;

export type GameInteractionState = Readonly<{
  availableAttackTargets: readonly number[];
  availableBoostTargets: readonly number[];
  availableConstructTargets: readonly number[];
  availableHealTargets: readonly number[];
  availableLoadTargets: readonly number[];
  availableMoveTargets: readonly number[];
  availableSpawnTargets: readonly number[];
  availableUnloadTargets: readonly number[];
  menu: GameActionMenuState | null;
  mode: GameInteractionMode;
  origin: Coords | null;
  pendingAction: "attack" | "boost" | "construct" | "heal" | "load" | "missile" | "move" | "nuke" | "spawn" | "unload" | null;
  previewDestination: Coords | null;
  selectedAttackTarget: Coords | null;
  selectedBoostTarget: Coords | null;
  selectedConstructBuilding: BuildingUnitOption | null;
  selectedConstructTarget: Coords | null;
  selectedHealTarget: Coords | null;
  selectedLoadVehicle: Coords | null;
  selectedSpawnUnit: SpawnableUnitOption | null;
  selectedUnit: MapItem | null;
  selectedUnloadTarget: Coords | null;
}>;

export type GameInteractionContext = Readonly<{
  active: boolean;
  availableFunds: number;
  map: HexMap;
  menuPosition: MenuPosition;
  perspective: Exclude<TeamColor, "gray">;
}>;
