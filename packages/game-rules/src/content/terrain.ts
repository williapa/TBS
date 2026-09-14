import { terrainTypeId, type TerrainTypeId } from "@TBS/game-core";

import type { UnitDefinition } from "./units";

export const standardTerrainTypeIds: readonly TerrainTypeId[] = [
  "beach",
  "forest",
  "mountain",
  "road",
  "plains",
  "desert",
  "water",
].map(terrainTypeId);

export const getMovementCost = (unit: UnitDefinition, terrain: TerrainTypeId): number => {
  if (!unit.capabilities.includes("move")) return Number.POSITIVE_INFINITY;
  if (unit.tags.includes("flying")) return 1;
  if (unit.tags.includes("naval")) return terrain === "water" ? 1 : Number.POSITIVE_INFINITY;

  const groundVehicle = unit.category === "vehicle";
  switch (terrain) {
    case "beach":
    case "forest":
      return groundVehicle ? 2 : 1;
    case "mountain":
      return unit.id === "lion" ? 2 : 3;
    case "road":
      return 1;
    case "plains":
      return unit.id === "lion" ? 0 : 1;
    case "desert":
      return unit.id === "lion" ? 1 : 2;
    case "water":
      return Number.POSITIVE_INFINITY;
    default:
      return Number.POSITIVE_INFINITY;
  }
};
