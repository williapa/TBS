import {
  BuildingUnitOption,
  ConstructionOption,
} from "../types";

const constructionOptions: ConstructionOption[] = [
  { building: "airport", cost: 1000, invalidTerrains: ["water"] },
  { building: "bank", cost: 2000, invalidTerrains: ["water"] },
  { building: "capital", cost: 10000, invalidTerrains: ["water"] }, // todo: maybe don't have capitals be buildable? if so decide how win condition accounts for capitals, maybe enforce 1 capital max?
  { building: "church", cost: 1500, invalidTerrains: ["water"] },
  { building: "college", cost: 3000, invalidTerrains: ["water"] },
  { building: "factory", cost: 2000, invalidTerrains: ["water"] },
  { building: "house", cost: 700, invalidTerrains: ["water"] },
  { building: "lab", cost: 1500, invalidTerrains: ["water"] },
  { building: "office", cost: 1000, invalidTerrains: ["water"] },
  { building: "port", cost: 2500, invalidTerrains: ["beach", "mountain", "road", "forest", "plains", "desert"] },
  { building: "zoo", cost: 5000, invalidTerrains: ["water"] },
];

const getConstructionOptions = (availableFunds: number): ConstructionOption[] =>
  constructionOptions
    .filter(({ cost }) => cost <= availableFunds)
    .map((option) => ({
      building: option.building as BuildingUnitOption,
      cost: option.cost,
      invalidTerrains: [...option.invalidTerrains],
    }));

export default getConstructionOptions;
