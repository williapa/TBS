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
];

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
];

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

export const supportedActions = ["attack", "end", "move"];

export type gameActions = "attack" | "end" | "move";

export type GameAction = Attack | End | Move;

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

