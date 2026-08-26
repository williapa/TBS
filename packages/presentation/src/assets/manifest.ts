import type { PresentationAssetManifest } from "../board/contracts";

const humanize = (value: string): string => value
  .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  .replace(/[-_]+/g, " ")
  .replace(/^./, (first) => first.toUpperCase());

export const identityAssetManifest: PresentationAssetManifest = {
  terrain: (terrainTypeId) => ({
    assetId: `terrain:${terrainTypeId}`,
    label: humanize(terrainTypeId),
  }),
  unit: (unitTypeId) => ({
    assetId: `unit:${unitTypeId}`,
    label: humanize(unitTypeId),
  }),
};
