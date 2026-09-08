export type PrimitiveModelKind =
  | "aircraft"
  | "building"
  | "capital"
  | "construction-worker"
  | "leader"
  | "person"
  | "vehicle";

export type ProceduralModelDescriptor = Readonly<{
  assetId: string;
  kind: PrimitiveModelKind;
  healthBarHeight: number;
  source: "project-owned-procedural";
}>;

const buildingIds = new Set([
  "airport", "bank", "church", "college", "factory", "house", "lab",
  "office", "port", "zoo",
]);
const aircraftIds = new Set(["airplane", "helicopter", "missile"]);
const vehicleIds = new Set(["ambulance", "bigTruck", "sub", "truck"]);

export const getProceduralModel = (assetId: string): ProceduralModelDescriptor => {
  const unitId = assetId.startsWith("unit:") ? assetId.slice("unit:".length) : assetId;
  const kind = unitId === "leader" || unitId === "capital"
    ? unitId
    : unitId === "constructionWorker"
      ? "construction-worker"
      : buildingIds.has(unitId)
        ? "building"
        : aircraftIds.has(unitId)
          ? "aircraft"
          : vehicleIds.has(unitId)
            ? "vehicle"
            : "person";
  const healthBarHeight = kind === "capital"
    ? 1.68
    : kind === "leader"
      ? 1.52
      : kind === "construction-worker"
        ? 1.42
        : 1.18;
  return { assetId, kind, healthBarHeight, source: "project-owned-procedural" };
};
