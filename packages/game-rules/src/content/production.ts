import { terrainTypeId, unitTypeId, type TerrainTypeId, type UnitTypeId } from "@TBS/game-core";

export type ProductionOption = Readonly<{
  unitTypeId: UnitTypeId;
  cost: number;
  invalidTerrainTypeIds: readonly TerrainTypeId[];
}>;

export type ConstructionOption = Readonly<{
  unitTypeId: UnitTypeId;
  cost: number;
  invalidTerrainTypeIds: readonly TerrainTypeId[];
}>;

const option = (unit: string, cost: number, invalidTerrains: readonly string[]): ProductionOption => ({
  unitTypeId: unitTypeId(unit),
  cost,
  invalidTerrainTypeIds: invalidTerrains.map(terrainTypeId),
});

const productionByBuilding = new Map<UnitTypeId, readonly ProductionOption[]>([
  [unitTypeId("airport"), [option("airplane", 1000, ["mountain", "forest", "water"]), option("helicopter", 500, ["forest", "water"]), option("pilot", 300, ["water"])]],
  [unitTypeId("capital"), [option("soldier", 200, ["water"]), option("leader", 1000, ["water"]), option("constructionWorker", 100, ["water"])]],
  [unitTypeId("church"), [option("priest", 100, ["water"]), option("bluesMusician", 100, ["water"]), option("michaelJackson", 1000, [])]],
  [unitTypeId("college"), [option("engineer", 200, ["water"]), option("studentAthlete", 300, ["water"])]],
  [unitTypeId("factory"), [option("truck", 400, ["water", "mountain", "forest"]), option("bigTruck", 600, ["water", "mountain", "forest"]), option("ambulance", 500, ["water", "mountain", "forest"])]],
  [unitTypeId("house"), [option("constructionWorker", 100, ["water"]), option("zookeeper", 300, ["water"])]],
  [unitTypeId("lab"), [option("scientist", 300, ["water"]), option("doctor", 500, ["water"])]],
  [unitTypeId("office"), [option("zuckerbird", 1000, ["water"]), option("worker", 100, ["water"])]],
  [unitTypeId("port"), [option("sub", 500, ["forest", "beach", "plains", "road", "mountain", "desert"])]],
  [unitTypeId("zoo"), [option("dragon", 2500, []), option("lion", 1500, ["water"])]],
]);

const constructionOptions: readonly ConstructionOption[] = [
  option("airport", 1000, ["water"]),
  option("bank", 2000, ["water"]),
  option("capital", 10000, ["water"]),
  option("church", 1500, ["water"]),
  option("college", 3000, ["water"]),
  option("factory", 2000, ["water"]),
  option("house", 700, ["water"]),
  option("lab", 1500, ["water"]),
  option("office", 1000, ["water"]),
  option("port", 2500, ["beach", "mountain", "road", "forest", "plains", "desert"]),
  option("zoo", 5000, ["water"]),
];

export const getProductionOption = (
  buildingTypeId: UnitTypeId,
  producedUnitTypeId: UnitTypeId,
): ProductionOption | undefined =>
  productionByBuilding.get(buildingTypeId)?.find((candidate) => candidate.unitTypeId === producedUnitTypeId);

export const getProductionOptions = (buildingTypeId: UnitTypeId): readonly ProductionOption[] =>
  productionByBuilding.get(buildingTypeId) ?? [];

export const getSpawnableUnitTypeIds = (): readonly UnitTypeId[] => [
  ...new Set(
    [...productionByBuilding.values()]
      .flatMap((options) => options.map(({ unitTypeId }) => unitTypeId)),
  ),
];

export const getConstructionOption = (buildingTypeId: UnitTypeId): ConstructionOption | undefined =>
  constructionOptions.find((candidate) => candidate.unitTypeId === buildingTypeId);

export const getConstructionOptions = (): readonly ConstructionOption[] => constructionOptions;
