import type { BoardCellViewModel, BoardViewModel } from "@TBS/presentation";

import { projectHexToWorld } from "./projection.js";

export type TerrainInstance = Readonly<{
  cell: BoardCellViewModel;
  position: ReturnType<typeof projectHexToWorld>;
}>;

export type TerrainBatch = Readonly<{
  assetId: string;
  instances: readonly TerrainInstance[];
}>;

export const createTerrainBatches = (board: BoardViewModel): readonly TerrainBatch[] => {
  const groups = new Map<string, TerrainInstance[]>();
  for (const cell of board.cells) {
    const instances = groups.get(cell.terrainAssetId) ?? [];
    instances.push({ cell, position: projectHexToWorld(cell.coordinate) });
    groups.set(cell.terrainAssetId, instances);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([assetId, instances]) => ({ assetId, instances }));
};

export const cellForTerrainInstance = (
  batch: TerrainBatch,
  instanceId: number | undefined,
): BoardCellViewModel | undefined => instanceId === undefined
  ? undefined
  : batch.instances[instanceId]?.cell;
