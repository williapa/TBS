export interface MapItem {
  row: number;
  column: number;
  damage?: number;
  boosted?: boolean;
  index: number;
  loadedUnit?: LoadedUnit;
  moved?: boolean;
  neighbors?: number[];
  terrain: any;
  unit: any;
  team: any;
}

export type LoadedUnit = {
  damage?: number;
  boosted?: boolean;
  moved?: boolean;
  team: any;
  unit: any;
};

export type Coords = {
  x: number;
  y: number;
};

export const teamOptions = ["orange", "purple"] as const;
export type TeamOption = (typeof teamOptions)[number];

export const winConditions = {
  CAPITAL_OR_ELIMINATION: "capital-or-combat-elimination",
  ELIMINATION_ONLY: "combat-elimination",
} as const;

export type WinCondition = (typeof winConditions)[keyof typeof winConditions];

export const animalUnitOptions = [
  "dragon",
  "lion"
];

export const buildingUnitOptions = [
  "airport",
  "bank",
  "capital",
  "church",
  "college",
  "factory",
  "house",
  "lab",
  "office",
  "port",
  "zoo"
 ] as const;

export type BuildingUnitOption = (typeof buildingUnitOptions)[number];

export const objectUnitOptions = [
  "missile",
  "money",
  "none",
  "nuke",
] as const;
export type ObjectUnitOption = Exclude<(typeof objectUnitOptions)[number], "none">;

export const peopleUnitOptions = [
  "bluesMusician",
  "constructionWorker",
  "doctor",
  "engineer",
  "leader",
  "michaelJackson",
  "pilot",
  "priest",
  "scientist",
  "soldier",
  "studentAthlete",
  "worker",
  "zookeeper",
  "zuckerbird",
];

export const TerrainOptions = [
  "beach", // brown
  "forest", // green
  "mountain", // black
  "road", // gray
  "plains", // white
  "desert", // yellow
  "water", // blue
 ] as const;

export type TerrainOption = (typeof TerrainOptions)[number];

export const vehicleUnitOptions = [
  "airplane",
  "ambulance",
  "bigTruck",
  "helicopter",
  "sub",
  "truck"
];

export const groundVehicleOptions = [
  vehicleUnitOptions[1],
  vehicleUnitOptions[2],
  vehicleUnitOptions[5]
];

export const unitOptions = [
  ["animals", animalUnitOptions],
  ["buildings", buildingUnitOptions],
  ["objects", objectUnitOptions],
  ["people", peopleUnitOptions],
  ["vehicles", vehicleUnitOptions],
];

export const moveableOptions = [
  ...animalUnitOptions,
  ...peopleUnitOptions,
  ...vehicleUnitOptions
];

export const attackableOptions = [
  ...animalUnitOptions,
  ...buildingUnitOptions,
  ...peopleUnitOptions,
  ...vehicleUnitOptions
];

export const flyingOptions = [
  animalUnitOptions[0],
  vehicleUnitOptions[0],
  vehicleUnitOptions[3],
];

export const spawnableUnitOptions = [
  "airplane",
  "ambulance",
  "bigTruck",
  "bluesMusician",
  "constructionWorker",
  "doctor",
  "dragon",
  "engineer",
  "helicopter",
  "leader",
  "lion",
  "michaelJackson",
  "pilot",
  "priest",
  "scientist",
  "soldier",
  "studentAthlete",
  "sub",
  "truck",
  "worker",
  "zookeeper",
  "zuckerbird",
] as const;

export type SpawnableUnitOption = (typeof spawnableUnitOptions)[number];

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

export const supportedActions = ["attack", "boost", "construct", "end", "heal", "load", "move", "spawn", "unload"] as const;

export type gameActions = (typeof supportedActions)[number];

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

