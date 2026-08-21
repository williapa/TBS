import { describe, expect, it } from "vitest";
import type { BoardCellViewModel, BoardEntityViewModel, BoardViewModel, MoveEntityCue } from "@TBS/presentation";

import { entityWorldPosition } from "./animation/entityMotion.js";
import { getProceduralModel } from "./assets/modelManifest.js";
import { HEX_WORLD_ORIENTATION, projectHexToWorld } from "./board/projection.js";
import { cellForTerrainInstance, createTerrainBatches } from "./board/terrainBatches.js";
import { initialCameraState, updateCameraState } from "./camera/cameraState.js";

const cellId = (value: string) => value as BoardCellViewModel["id"];

const board = {
  revision: 2,
  cells: [
    { id: cellId("0:0"), coordinate: { q: 0, r: 0 }, neighborIds: [cellId("1:0")], terrainAssetId: "terrain:plains", selection: "none", target: null, accessibleDescription: "Plains" },
    { id: cellId("1:0"), coordinate: { q: 1, r: 0 }, neighborIds: [cellId("0:0")], terrainAssetId: "terrain:plains", selection: "none", target: "move", accessibleDescription: "Plains target" },
    { id: cellId("0:1"), coordinate: { q: 0, r: 1 }, neighborIds: [], terrainAssetId: "terrain:water", selection: "none", target: null, accessibleDescription: "Water" },
  ],
  entities: [],
  cameraBounds: { minimum: { q: 0, r: 0 }, maximum: { q: 1, r: 1 }, center: { q: 0.5, r: 0.5 } },
  focusRequest: null,
  animationCues: [],
} as const satisfies BoardViewModel;

describe("renderer-3d projection", () => {
  it("projects axial coordinates into a stable flat hex world", () => {
    expect(projectHexToWorld({ q: 2, r: -1 })).toEqual({ x: Math.sqrt(3) * 1.5, y: 0, z: -1.5 });
  });

  it("orients terrain and overlays so adjacent cells meet along flat edges", () => {
    const terrainCorners = Array.from({ length: 6 }, (_, index) => {
      const angle = HEX_WORLD_ORIENTATION.cylinderThetaStart + (index * Math.PI / 3);
      return { x: Math.sin(angle), z: Math.cos(angle) };
    });
    const overlayCorners = Array.from({ length: 6 }, (_, index) => {
      const angle = HEX_WORLD_ORIENTATION.ringThetaStart + (index * Math.PI / 3);
      return { x: Math.cos(angle), z: -Math.sin(angle) };
    });
    const qNeighbor = projectHexToWorld({ q: 1, r: 0 });
    const terrainMaximumX = Math.max(...terrainCorners.map(({ x }) => x));

    expect(qNeighbor.x).toBeCloseTo(terrainMaximumX * 2);
    overlayCorners.forEach((corner, index) => {
      expect(corner.x).toBeCloseTo(terrainCorners[index]?.x ?? Number.NaN);
      expect(corner.z).toBeCloseTo(terrainCorners[index]?.z ?? Number.NaN);
    });
  });

  it("batches terrain while retaining a deterministic instance-to-cell lookup", () => {
    const batches = createTerrainBatches(board);
    expect(batches.map(({ assetId, instances }) => [assetId, instances.length])).toEqual([
      ["terrain:plains", 2], ["terrain:water", 1],
    ]);
    const plains = batches.find(({ assetId }) => assetId === "terrain:plains");
    expect(plains).toBeDefined();
    if (!plains) throw new Error("Expected plains terrain batch");
    expect(cellForTerrainInstance(plains, 1)?.id).toBe(cellId("1:0"));
    expect(cellForTerrainInstance(plains, undefined)).toBeUndefined();
  });
});

describe("renderer-3d presentation behavior", () => {
  const entity = {
    id: "unit-1" as BoardEntityViewModel["id"], unitTypeId: "soldier" as BoardEntityViewModel["unitTypeId"], assetId: "unit:soldier", cellId: cellId("1:0"), coordinate: { q: 1, r: 0 }, orientation: 0,
    teamId: "purple" as BoardEntityViewModel["teamId"], health: { current: 75, maximum: 100 }, statuses: [], capabilities: [], selected: false, actionable: true,
    cargo: [], label: "Soldier", accessibleDescription: "Soldier, purple team, 75 health",
  } as const satisfies BoardEntityViewModel;
  const cue = {
    type: "move-entity", id: "move-2-unit-1", revision: 2, entityId: entity.id,
    from: { q: 0, r: 0 }, to: entity.coordinate, durationMs: 300,
  } as const satisfies MoveEntityCue;

  it("interpolates accepted movement and settles immediately for reduced motion", () => {
    expect(entityWorldPosition(entity, cue, 0, false)).toEqual(projectHexToWorld(cue.from));
    expect(entityWorldPosition(entity, cue, 300, false)).toEqual(projectHexToWorld(entity.coordinate));
    expect(entityWorldPosition(entity, cue, 0, true)).toEqual(projectHexToWorld(entity.coordinate));
  });

  it("provides project-owned procedural fallbacks for known and future assets", () => {
    expect(getProceduralModel("unit:capital").kind).toBe("building");
    expect(getProceduralModel("unit:pathfinder")).toEqual({ assetId: "unit:pathfinder", kind: "person", source: "project-owned-procedural" });
  });

  it("keeps camera changes bounded and rotation discrete", () => {
    const initial = initialCameraState(board.cameraBounds);
    const rotated = updateCameraState(initial, "rotate", board.cameraBounds);
    expect(rotated.rotationStep).toBe(1);
    let zoomed = initial;
    for (let index = 0; index < 20; index += 1) zoomed = updateCameraState(zoomed, "zoom-in", board.cameraBounds);
    expect(zoomed.zoom).toBe(2.2);
  });
});
