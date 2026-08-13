import {
  getSpawnableUnitTypeIds,
  getUnitsByCategory,
  standardActionTypes,
  standardUnits,
} from "@TBS/game-rules";
import type { EntityId } from "@TBS/game-core";
import type { StandardAction, UnitDefinition } from "@TBS/game-rules";

export interface MapItem {
  row: number;
  column: number;
  damage?: number;
  boosted?: boolean;
  entityId?: EntityId;
  index: number;
  loadedUnit?: LoadedUnit;
  moved?: boolean;
  neighbors?: number[];
  terrain: TerrainOption;
  unit: UnitOption;
  team: TeamColor;
}

export type LoadedUnit = {
  damage?: number;
  boosted?: boolean;
  entityId?: EntityId;
  moved?: boolean;
  team: TeamColor;
  unit: UnitOption;
};

export type Coords = {
  x: number;
  y: number;
};

export const teamOptions = ["orange", "purple"] as const;
export type TeamOption = (typeof teamOptions)[number];
export type TeamColor = TeamOption | "gray";

export const winConditions = {
  CAPITAL_OR_ELIMINATION: "capital-or-combat-elimination",
  ELIMINATION_ONLY: "combat-elimination",
} as const;

export type WinCondition = (typeof winConditions)[keyof typeof winConditions];

export type AnimalUnitOption = "dragon" | "lion";

export type BuildingUnitOption =
  | "airport"
  | "bank"
  | "capital"
  | "church"
  | "college"
  | "factory"
  | "house"
  | "lab"
  | "office"
  | "port"
  | "zoo";

export type ObjectUnitOption = "missile" | "money" | "nuke";

export type PeopleUnitOption =
  | "bluesMusician"
  | "constructionWorker"
  | "doctor"
  | "engineer"
  | "leader"
  | "michaelJackson"
  | "pilot"
  | "priest"
  | "scientist"
  | "soldier"
  | "studentAthlete"
  | "worker"
  | "zookeeper"
  | "zuckerbird";

export const TerrainOptions = [
  "beach", // brown
  "forest", // green
  "mountain", // black
  "road", // gray
  "plains", // white
  "desert", // yellow
  "water", // blue
 ] as const satisfies readonly TerrainOption[];

export type TerrainOption = "beach" | "forest" | "mountain" | "road" | "plains" | "desert" | "water";

export type VehicleUnitOption =
  | "airplane"
  | "ambulance"
  | "bigTruck"
  | "helicopter"
  | "sub"
  | "truck";

export type UnitOption =
  | AnimalUnitOption
  | BuildingUnitOption
  | ObjectUnitOption
  | "none"
  | PeopleUnitOption
  | VehicleUnitOption;

const unitIdsByCategory = (category: Parameters<typeof getUnitsByCategory>[0]): readonly string[] =>
  getUnitsByCategory(category).map(({ id }) => String(id));

const unitIdsWith = (predicate: (definition: UnitDefinition) => boolean): readonly string[] =>
  [...standardUnits.values()].filter(predicate).map(({ id }) => String(id));

export const animalUnitOptions = unitIdsByCategory("animal");
export const buildingUnitOptions = unitIdsByCategory("building");
export const objectUnitOptions = [...unitIdsByCategory("object"), "none"].sort();
export const peopleUnitOptions = unitIdsByCategory("person");
export const vehicleUnitOptions = unitIdsByCategory("vehicle");

export const groundVehicleOptions = unitIdsWith(
  ({ tags }) => tags.includes("ground") && tags.includes("vehicle"),
);

export const unitOptions = [
  ["animals", animalUnitOptions],
  ["buildings", buildingUnitOptions],
  ["objects", objectUnitOptions],
  ["people", peopleUnitOptions],
  ["vehicles", vehicleUnitOptions],
];

export const moveableOptions = unitIdsWith(({ capabilities }) => capabilities.includes("move"));
export const attackableOptions = unitIdsWith(({ capabilities }) => capabilities.includes("attack"));
export const flyingOptions = unitIdsWith(({ tags }) => tags.includes("flying"));

export type SpawnableUnitOption =
  | "airplane"
  | "ambulance"
  | "bigTruck"
  | "bluesMusician"
  | "constructionWorker"
  | "doctor"
  | "dragon"
  | "engineer"
  | "helicopter"
  | "leader"
  | "lion"
  | "michaelJackson"
  | "pilot"
  | "priest"
  | "scientist"
  | "soldier"
  | "studentAthlete"
  | "sub"
  | "truck"
  | "worker"
  | "zookeeper"
  | "zuckerbird";

export const spawnableUnitOptions: readonly SpawnableUnitOption[] =
  getSpawnableUnitTypeIds().map(String).sort() as SpawnableUnitOption[];

export type SpawnOption = {
  unit: SpawnableUnitOption;
  cost: number;
  invalidTerrains: TerrainOption[];
};

export type ConstructionOption = {
  building: BuildingUnitOption;
  cost: number;
  invalidTerrains: TerrainOption[];
};

export type gameActions = GameAction["action"];

const toLegacyActionType = (type: StandardAction["type"]): gameActions =>
  type === "end-turn" ? "end" : type;

export const supportedActions: readonly gameActions[] = standardActionTypes
  .map(toLegacyActionType)
  .sort();

export type GameAction = Attack | Boost | Construct | End | Heal | Load | Move | Spawn | Unload;
export type GameEvent =
  | AttackEvent
  | BoostEvent
  | ConstructEvent
  | EndTurnEvent
  | GameOverEvent
  | HealEvent
  | LoadEvent
  | MoveEvent
  | SpawnEvent
  | UnloadEvent;

type Attack = {
  action: "attack";
  attacker: Coords;
  defender: Coords;
  end: Coords;
};

export type Boost = {
  action: "boost";
  start: Coords;
  end: Coords;
  target: Coords;
};

export type Heal = {
  action: "heal";
  start: Coords;
  end: Coords;
  target: Coords;
};

export type End = {
  action: "end";
};

export type Construct = {
  action: "construct";
  worker: Coords;
  end: Coords;
  cell: Coords;
  building: BuildingUnitOption;
};

export type Load = {
  action: "load";
  start: Coords;
  end: Coords;
  vehicle: Coords;
};

export type Move = {
  action: "move";
  start: Coords;
  end: Coords;
  objectTarget?: Coords;
};

export type Spawn = {
  action: "spawn";
  building: Coords;
  end: Coords;
  unit: SpawnableUnitOption;
};

export type Unload = {
  action: "unload";
  start: Coords;
  end: Coords;
  cell: Coords;
};

type BaseGameEvent = {
  id: string;
  sk: string;
  actor: string;
};

export type AttackEvent = BaseGameEvent & {
  action: "attack";
  defender: Coords;
  start: Coords;
  end: Coords;
  unit: string;
  defendingUnit: string;
  attackDamage: number;
  defenseDamage: number;
  deaths: unknown[];
  consumedObject?: ObjectUnitOption;
  moneyAward?: number;
};

export type BoostEvent = BaseGameEvent & {
  action: "boost";
  start: Coords;
  end: Coords;
  target: Coords;
  unit: string;
  boostedUnit: string;
  consumedObject?: ObjectUnitOption;
  moneyAward?: number;
};

export type EndTurnEvent = BaseGameEvent & {
  action: "endTurn";
  income: number;
  creatorMoney: number;
  challengerMoney: number;
};

export type ConstructEvent = BaseGameEvent & {
  action: "construct";
  building: BuildingUnitOption;
  cell: Coords;
  cost: number;
  worker: Coords;
  consumedObject?: ObjectUnitOption;
  moneyAward?: number;
};

export type GameOverEvent = BaseGameEvent & {
  action: "gameOver";
};

export type HealEvent = BaseGameEvent & {
  action: "heal";
  start: Coords;
  end: Coords;
  target: Coords;
  unit: string;
  healedUnit: string;
  healedDamage: number;
  consumedObject?: ObjectUnitOption;
  moneyAward?: number;
};

export type LoadEvent = BaseGameEvent & {
  action: "load";
  start: Coords;
  end: Coords;
  vehicle: Coords;
  unit: string;
  vehicleUnit: string;
  consumedObject?: ObjectUnitOption;
  moneyAward?: number;
};

export type MoveEvent = BaseGameEvent & {
  action: "move";
  start: Coords;
  end: Coords;
  unit: string;
  consumedObject?: ObjectUnitOption;
  moneyAward?: number;
  objectTarget?: Coords;
  objectPreventedByPriest?: boolean;
  objectDamage?: {
    cell: Coords;
    damage: number;
    unit: string;
    killed: boolean;
  }[];
};

export type SpawnEvent = BaseGameEvent & {
  action: "spawn";
  building: Coords;
  cost: number;
  end: Coords;
  unit: SpawnableUnitOption;
};

export type UnloadEvent = BaseGameEvent & {
  action: "unload";
  start: Coords;
  end: Coords;
  cell: Coords;
  unit: string;
  vehicleUnit: string;
  consumedObject?: ObjectUnitOption;
  moneyAward?: number;
};
