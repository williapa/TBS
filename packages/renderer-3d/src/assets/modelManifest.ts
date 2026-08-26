export type PrimitiveModelKind = "aircraft" | "building" | "person" | "vehicle";

export type ProceduralModelDescriptor = Readonly<{
  assetId: string;
  kind: PrimitiveModelKind;
  source: "project-owned-procedural";
}>;

const buildingIds = new Set([
  "airport", "bank", "capital", "church", "college", "factory", "house", "lab",
  "office", "port", "zoo",
]);
const aircraftIds = new Set(["airplane", "helicopter", "missile"]);
const vehicleIds = new Set(["ambulance", "bigTruck", "sub", "truck"]);

export const getProceduralModel = (assetId: string): ProceduralModelDescriptor => {
  const unitId = assetId.startsWith("unit:") ? assetId.slice("unit:".length) : assetId;
  const kind = buildingIds.has(unitId)
    ? "building"
    : aircraftIds.has(unitId)
      ? "aircraft"
      : vehicleIds.has(unitId)
        ? "vehicle"
        : "person";
  return { assetId, kind, source: "project-owned-procedural" };
};
