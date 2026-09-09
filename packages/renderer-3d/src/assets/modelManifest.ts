export type PrimitiveModelKind =
  | "aircraft"
  | "blues-musician"
  | "building"
  | "capital"
  | "construction-worker"
  | "dragon"
  | "leader"
  | "lion"
  | "nuke"
  | "person"
  | "scientist"
  | "soldier"
  | "vehicle"
  | "zoo";

export type ProceduralModelDescriptor = Readonly<{
  assetId: string;
  kind: PrimitiveModelKind;
  healthBarHeight: number;
  source: "project-owned-procedural";
}>;

const buildingIds = new Set([
  "airport", "bank", "church", "college", "factory", "house", "lab",
  "office", "port",
]);
const aircraftIds = new Set(["airplane", "helicopter", "missile"]);
const vehicleIds = new Set(["ambulance", "bigTruck", "sub", "truck"]);

export const getProceduralModel = (assetId: string): ProceduralModelDescriptor => {
  const unitId = assetId.startsWith("unit:") ? assetId.slice("unit:".length) : assetId;
  const kind = unitId === "zoo" || unitId === "leader" || unitId === "capital" || unitId === "soldier" || unitId === "dragon" || unitId === "lion" || unitId === "scientist" || unitId === "nuke"
    ? unitId
    : unitId === "bluesMusician"
      ? "blues-musician"
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
    : kind === "leader" || kind === "scientist" || kind === "blues-musician"
      ? 1.52
      : kind === "construction-worker" || kind === "soldier" || kind === "dragon" || kind === "nuke"
        ? 1.42
        : kind === "zoo"
          ? 1.55
          : kind === "lion"
            ? 1.32
            : 1.18;
  return { assetId, kind, healthBarHeight, source: "project-owned-procedural" };
};
