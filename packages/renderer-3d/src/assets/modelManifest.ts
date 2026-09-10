export type PrimitiveModelKind =
  | "ambulance"
  | "aircraft"
  | "airport"
  | "bank"
  | "big-truck"
  | "blues-musician"
  | "building"
  | "capital"
  | "church"
  | "college"
  | "construction-worker"
  | "doctor"
  | "dragon"
  | "factory"
  | "lab"
  | "leader"
  | "lion"
  | "missile"
  | "money"
  | "nuke"
  | "office"
  | "pilot"
  | "person"
  | "port"
  | "priest"
  | "scientist"
  | "soldier"
  | "sub"
  | "truck"
  | "vehicle"
  | "zoo"
  | "zuckerbird";

export type ProceduralModelDescriptor = Readonly<{
  assetId: string;
  kind: PrimitiveModelKind;
  healthBarHeight: number;
  source: "project-owned-procedural";
}>;

const buildingIds = new Set([
  "house",
]);
const aircraftIds = new Set(["airplane", "helicopter"]);

export const getProceduralModel = (assetId: string): ProceduralModelDescriptor => {
  const unitId = assetId.startsWith("unit:") ? assetId.slice("unit:".length) : assetId;
  const kind = unitId === "priest" || unitId === "pilot" || unitId === "doctor" || unitId === "ambulance" || unitId === "lab" || unitId === "office" || unitId === "college" || unitId === "church" || unitId === "factory" || unitId === "truck" || unitId === "bank" || unitId === "zuckerbird" || unitId === "airport" || unitId === "port" || unitId === "zoo" || unitId === "leader" || unitId === "capital" || unitId === "soldier" || unitId === "sub" || unitId === "dragon" || unitId === "lion" || unitId === "scientist" || unitId === "nuke" || unitId === "money" || unitId === "missile"
    ? unitId
    : unitId === "bigTruck"
      ? "big-truck"
      : unitId === "bluesMusician"
        ? "blues-musician"
        : unitId === "constructionWorker"
          ? "construction-worker"
          : buildingIds.has(unitId)
            ? "building"
            : aircraftIds.has(unitId)
              ? "aircraft"
              : "person";
  const healthBarHeight = kind === "church"
    ? 1.85
    : kind === "priest" || kind === "capital" || kind === "office"
      ? 1.68
      : kind === "big-truck" || kind === "zuckerbird" || kind === "leader" || kind === "scientist" || kind === "blues-musician" || kind === "missile"
        ? 1.52
        : kind === "pilot" || kind === "doctor" || kind === "ambulance" || kind === "airport" || kind === "construction-worker" || kind === "soldier" || kind === "dragon" || kind === "nuke"
          ? 1.42
          : kind === "lab" || kind === "college" || kind === "factory" || kind === "bank" || kind === "zoo" || kind === "port"
            ? 1.55
            : kind === "lion"
              ? 1.32
              : 1.18;
  return { assetId, kind, healthBarHeight, source: "project-owned-procedural" };
};
