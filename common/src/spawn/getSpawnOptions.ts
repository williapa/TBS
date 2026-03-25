import {
  BuildingUnitOption,
  SpawnOption,
} from "../types";

const spawnOptionsByBuilding: Partial<Record<BuildingUnitOption, SpawnOption[]>> = {
  airport: [
    { unit: "airplane", cost: 1000, invalidTerrains: ["mountain", "forest", "water"] },
    { unit: "helicopter", cost: 500, invalidTerrains: ["forest", "water"] },
    { unit: "pilot", cost: 300, invalidTerrains: ["water"] },
  ],
  capital: [
    { unit: "soldier", cost: 200, invalidTerrains: ["water"] },
    { unit: "leader", cost: 1000, invalidTerrains: ["water"] },
  ],
  church: [
    { unit: "priest", cost: 100, invalidTerrains: ["water"] },
    { unit: "bluesMusician", cost: 100, invalidTerrains: ["water"] },
    { unit: "michaelJackson", cost: 1000, invalidTerrains: [] },
  ],
  college: [
    { unit: "engineer", cost: 200, invalidTerrains: ["water"] },
    { unit: "studentAthlete", cost: 300, invalidTerrains: ["water"] },
  ],
  factory: [
    { unit: "truck", cost: 400, invalidTerrains: ["water", "mountain", "forest"] },
    { unit: "bigTruck", cost: 600, invalidTerrains: ["water", "mountain", "forest"] },
    { unit: "ambulance", cost: 500, invalidTerrains: ["water", "mountain", "forest"] },
  ],
  house: [
    { unit: "constructionWorker", cost: 100, invalidTerrains: ["water"] },
  ],
  lab: [
    { unit: "scientist", cost: 300, invalidTerrains: ["water"] },
    { unit: "doctor", cost: 500, invalidTerrains: ["water"] },
  ],
  office: [
    { unit: "zuckerbird", cost: 1000, invalidTerrains: ["water"] },
    { unit: "worker", cost: 100, invalidTerrains: ["water"] },
  ],
  port: [
    { unit: "sub", cost: 500, invalidTerrains: ["forest", "beach", "plains", "road", "mountain", "desert"] },
  ],
  zoo: [
    { unit: "dragon", cost: 2500, invalidTerrains: [] },
    { unit: "lion", cost: 1500, invalidTerrains: ["water"] },
  ],
};

const getSpawnOptions = (buildingType: string, availableFunds: number): SpawnOption[] => {
  const options = spawnOptionsByBuilding[buildingType as BuildingUnitOption] ?? [];

  return options
    .filter(({ cost }) => cost <= availableFunds)
    .map((option) => ({
      ...option,
      invalidTerrains: [...option.invalidTerrains],
    }));
};

export default getSpawnOptions;
