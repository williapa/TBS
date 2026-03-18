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

const peopleUnitOptions = [
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

const vehicleUnitOptions = [
  "airplane",
  "ambulance",
  "bigTruck",
  "helicopter",
  "sub",
  "truck"
];


export const unitOptions = [
  ["animals", animalUnitOptions as AnimalType[]],
  ["buildings", buildingUnitOptions as BuildingType[]],
  ["objects", objectUnitOptions as ObjectType[]],
  ["people", peopleUnitOptions as PersonType[]],
  ["vehicles", vehicleUnitOptions as VehicleType[]],
] as OptionGroups;

export const moveableOptions = [
  ...animalUnitOptions,
  ...peopleUnitOptions,
  ...vehicleUnitOptions
];
