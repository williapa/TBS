import { unitTypeId, type UnitTypeId } from "@TBS/game-core";

export const unitCategories = ["animal", "building", "object", "person", "vehicle"] as const;
export type UnitCategory = (typeof unitCategories)[number];

export const unitCapabilities = [
  "attack",
  "boost",
  "collect-object",
  "construct",
  "heal",
  "loadable",
  "move",
  "spawn",
  "transport",
] as const;
export type UnitCapability = (typeof unitCapabilities)[number];

export type UnitDefinition = Readonly<{
  id: UnitTypeId;
  category: UnitCategory;
  base: Readonly<{
    maximumHealth?: number;
    movement: number;
    attack: number;
    defense: number;
  }>;
  capabilities: readonly UnitCapability[];
  abilities: readonly string[];
  tags: readonly string[];
  income: number;
}>;

export type UnitInput = Omit<UnitDefinition, "id" | "income"> & {
  id: string;
  income?: number;
};

export const defineUnit = (input: UnitInput): UnitDefinition => ({
  ...input,
  id: unitTypeId(input.id),
  income: input.income ?? 0,
});

const mobile = ["move", "attack"] as const;
const person = [...mobile, "collect-object", "loadable"] as const;
const vehicle = [...mobile, "collect-object", "transport"] as const;
const building = ["attack", "spawn"] as const;

const standardUnitDefinitions: readonly UnitDefinition[] = [
  defineUnit({ id: "dragon", category: "animal", base: { maximumHealth: 100, movement: 5, attack: 90, defense: 40 }, capabilities: mobile, abilities: [], tags: ["animal", "flying", "living"] }),
  defineUnit({ id: "lion", category: "animal", base: { maximumHealth: 100, movement: 3, attack: 90, defense: 25 }, capabilities: mobile, abilities: [], tags: ["animal", "ground", "living"] }),

  defineUnit({ id: "airport", category: "building", base: { maximumHealth: 100, movement: 0, attack: 0, defense: 60 }, capabilities: building, abilities: ["spawn-airport"], tags: ["building"], income: 100 }),
  defineUnit({ id: "bank", category: "building", base: { maximumHealth: 100, movement: 0, attack: 0, defense: 60 }, capabilities: building, abilities: [], tags: ["building"], income: 1000 }),
  defineUnit({ id: "capital", category: "building", base: { maximumHealth: 100, movement: 0, attack: 0, defense: 60 }, capabilities: building, abilities: ["spawn-capital"], tags: ["building", "capital"], income: 200 }),
  defineUnit({ id: "church", category: "building", base: { maximumHealth: 100, movement: 0, attack: 0, defense: 60 }, capabilities: building, abilities: ["spawn-church"], tags: ["building"], income: 0 }),
  defineUnit({ id: "college", category: "building", base: { maximumHealth: 100, movement: 0, attack: 0, defense: 60 }, capabilities: building, abilities: ["spawn-college"], tags: ["building"], income: 0 }),
  defineUnit({ id: "factory", category: "building", base: { maximumHealth: 100, movement: 0, attack: 0, defense: 60 }, capabilities: building, abilities: ["spawn-factory"], tags: ["building"], income: 200 }),
  defineUnit({ id: "house", category: "building", base: { maximumHealth: 100, movement: 0, attack: 0, defense: 60 }, capabilities: building, abilities: ["spawn-house"], tags: ["building"], income: 100 }),
  defineUnit({ id: "lab", category: "building", base: { maximumHealth: 100, movement: 0, attack: 0, defense: 60 }, capabilities: building, abilities: ["spawn-lab"], tags: ["building"], income: 300 }),
  defineUnit({ id: "office", category: "building", base: { maximumHealth: 100, movement: 0, attack: 0, defense: 40 }, capabilities: building, abilities: ["spawn-office"], tags: ["building"], income: 400 }),
  defineUnit({ id: "port", category: "building", base: { maximumHealth: 100, movement: 0, attack: 0, defense: 60 }, capabilities: building, abilities: ["spawn-port"], tags: ["building"], income: 200 }),
  defineUnit({ id: "zoo", category: "building", base: { maximumHealth: 100, movement: 0, attack: 0, defense: 60 }, capabilities: building, abilities: ["spawn-zoo"], tags: ["building"], income: 100 }),

  defineUnit({ id: "missile", category: "object", base: { movement: 0, attack: 0, defense: 0 }, capabilities: [], abilities: ["missile"], tags: ["consumable", "projectile"] }),
  defineUnit({ id: "money", category: "object", base: { movement: 0, attack: 0, defense: 0 }, capabilities: [], abilities: ["money"], tags: ["consumable"] }),
  defineUnit({ id: "nuke", category: "object", base: { movement: 0, attack: 0, defense: 0 }, capabilities: [], abilities: ["nuke"], tags: ["consumable", "projectile"] }),

  defineUnit({ id: "bluesMusician", category: "person", base: { maximumHealth: 100, movement: 1, attack: 10, defense: 30 }, capabilities: [...person, "boost"], abilities: ["boost-people"], tags: ["ground", "living", "person"] }),
  defineUnit({ id: "constructionWorker", category: "person", base: { maximumHealth: 100, movement: 1, attack: 15, defense: 5 }, capabilities: [...person, "construct"], abilities: ["construct-building"], tags: ["ground", "living", "person"] }),
  defineUnit({ id: "doctor", category: "person", base: { maximumHealth: 100, movement: 1, attack: 5, defense: 1 }, capabilities: [...person, "heal"], abilities: ["heal-people"], tags: ["ground", "living", "person", "medic"] }),
  defineUnit({ id: "engineer", category: "person", base: { maximumHealth: 100, movement: 1, attack: 3, defense: 1 }, capabilities: [...person, "heal"], abilities: ["heal-buildings"], tags: ["ground", "living", "person"] }),
  defineUnit({ id: "leader", category: "person", base: { maximumHealth: 100, movement: 1, attack: 50, defense: 35 }, capabilities: person, abilities: [], tags: ["ground", "living", "person"] }),
  defineUnit({ id: "michaelJackson", category: "person", base: { maximumHealth: 100, movement: 1, attack: 86, defense: 86 }, capabilities: person, abilities: [], tags: ["ground", "living", "person"] }),
  defineUnit({ id: "pilot", category: "person", base: { maximumHealth: 100, movement: 1, attack: 15, defense: 5 }, capabilities: [...person, "heal"], abilities: ["heal-flying"], tags: ["ground", "living", "person"] }),
  defineUnit({ id: "priest", category: "person", base: { maximumHealth: 100, movement: 1, attack: 1, defense: 1 }, capabilities: person, abilities: ["projectile-shield"], tags: ["ground", "living", "person"] }),
  defineUnit({ id: "scientist", category: "person", base: { maximumHealth: 100, movement: 1, attack: 1, defense: 1 }, capabilities: [...person, "boost"], abilities: ["boost-buildings"], tags: ["ground", "living", "person"] }),
  defineUnit({ id: "soldier", category: "person", base: { maximumHealth: 100, movement: 2, attack: 30, defense: 15 }, capabilities: person, abilities: [], tags: ["ground", "living", "person"] }),
  defineUnit({ id: "studentAthlete", category: "person", base: { maximumHealth: 100, movement: 2, attack: 10, defense: 10 }, capabilities: person, abilities: ["student-athlete-matchup"], tags: ["ground", "living", "person"] }),
  defineUnit({ id: "worker", category: "person", base: { maximumHealth: 100, movement: 1, attack: 10, defense: 2 }, capabilities: [...person, "heal"], abilities: ["heal-ground-vehicles"], tags: ["ground", "living", "person"] }),
  defineUnit({ id: "zookeeper", category: "person", base: { maximumHealth: 100, movement: 1, attack: 4, defense: 4 }, capabilities: [...person, "boost"], abilities: ["boost-animals"], tags: ["ground", "living", "person"] }),
  defineUnit({ id: "zuckerbird", category: "person", base: { maximumHealth: 100, movement: 1, attack: 8, defense: 8 }, capabilities: person, abilities: ["zuckerbird-matchup"], tags: ["ground", "living", "person"] }),

  defineUnit({ id: "airplane", category: "vehicle", base: { maximumHealth: 100, movement: 5, attack: 20, defense: 60 }, capabilities: vehicle, abilities: [], tags: ["flying", "vehicle"] }),
  defineUnit({ id: "ambulance", category: "vehicle", base: { maximumHealth: 100, movement: 4, attack: 20, defense: 60 }, capabilities: [...vehicle, "heal"], abilities: ["heal-people"], tags: ["ground", "vehicle"] }),
  defineUnit({ id: "bigTruck", category: "vehicle", base: { maximumHealth: 100, movement: 4, attack: 20, defense: 60 }, capabilities: vehicle, abilities: [], tags: ["ground", "vehicle"] }),
  defineUnit({ id: "helicopter", category: "vehicle", base: { maximumHealth: 100, movement: 5, attack: 20, defense: 60 }, capabilities: vehicle, abilities: [], tags: ["flying", "vehicle"] }),
  defineUnit({ id: "sub", category: "vehicle", base: { maximumHealth: 100, movement: 1, attack: 20, defense: 60 }, capabilities: vehicle, abilities: [], tags: ["naval", "vehicle"] }),
  defineUnit({ id: "truck", category: "vehicle", base: { maximumHealth: 100, movement: 4, attack: 20, defense: 60 }, capabilities: vehicle, abilities: [], tags: ["ground", "vehicle"] }),
];

export const createUnitRegistry = (definitions: readonly UnitDefinition[]) => {
  const registry = new Map<UnitTypeId, UnitDefinition>();
  for (const definition of definitions) {
    if (registry.has(definition.id)) throw new Error(`Duplicate unit definition: ${definition.id}`);
    if (definition.base.movement < 0) throw new Error(`Invalid movement for ${definition.id}`);
    registry.set(definition.id, definition);
  }
  return registry as ReadonlyMap<UnitTypeId, UnitDefinition>;
};

export const standardUnits = createUnitRegistry(standardUnitDefinitions);

export const getUnitDefinition = (id: UnitTypeId): UnitDefinition | undefined => standardUnits.get(id);

export const getUnitsByCategory = (category: UnitCategory): readonly UnitDefinition[] =>
  [...standardUnits.values()].filter((definition) => definition.category === category);
