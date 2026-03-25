export interface MapItem {
  row: number;
  column: number;
  damage?: number;
  index: number;
  moved?: boolean;
  neighbors?: number[];
  terrain: any;
  unit: any;
  team: any;
}

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
];

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
  "zuckerbird",
] as const;

export type SpawnableUnitOption = (typeof spawnableUnitOptions)[number];

export type SpawnOption = {
  unit: SpawnableUnitOption;
  cost: number;
  invalidTerrains: TerrainOption[];
};

export const supportedActions = ["attack", "end", "move", "spawn"] as const;

export type gameActions = (typeof supportedActions)[number];

export type GameAction = Attack | End | Move | Spawn;
export type GameEvent = AttackEvent | EndTurnEvent | GameOverEvent | MoveEvent | SpawnEvent;

type Attack = {
  action: "attack";
  attacker: Coords;
  defender: Coords;
  end: Coords;
};

export type End = {
  action: "end";
};

export type Move = {
  action: "move";
  start: Coords;
  end: Coords;
};

export type Spawn = {
  action: "spawn";
  building: Coords;
  end: Coords;
  unit: SpawnableUnitOption;
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
};

export type EndTurnEvent = BaseGameEvent & {
  action: "endTurn";
  income: number;
  creatorMoney: number;
  challengerMoney: number;
};

export type GameOverEvent = BaseGameEvent & {
  action: "gameOver";
};

export type MoveEvent = BaseGameEvent & {
  action: "move";
  start: Coords;
  end: Coords;
  unit: string;
};

export type SpawnEvent = BaseGameEvent & {
  action: "spawn";
  building: Coords;
  cost: number;
  end: Coords;
  unit: SpawnableUnitOption;
};

