import { describe, expect, it } from "vitest";
import type { BoardCellViewModel, BoardEntityViewModel, BoardViewModel, MoveEntityCue } from "@TBS/presentation";

import { entityWorldPosition } from "./animation/entityMotion.js";
import { getProceduralModel } from "./assets/modelManifest.js";
import { cellHighlightColor, cellHighlightRenderOrder, targetHighlightContrastColor } from "./board/highlightColor.js";
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
    expect(getProceduralModel("unit:house").kind).toBe("building");
    expect(getProceduralModel("unit:pathfinder")).toEqual({ assetId: "unit:pathfinder", kind: "person", healthBarHeight: 1.18, source: "project-owned-procedural" });
  });

  it("resolves the truck with clearance above its cab while retaining other vehicle fallbacks", () => {
    for (const assetId of ["unit:truck", "truck"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "truck", healthBarHeight: 1.18, source: "project-owned-procedural" });
    }
    for (const assetId of ["unit:bigTruck", "unit:ambulance", "unit:sub"]) {
      expect(getProceduralModel(assetId).kind).toBe("vehicle");
    }
    expect(getProceduralModel("unit:future-truck").kind).toBe("person");
  });

  it("resolves the moneybag with clearance above the tied neck", () => {
    for (const assetId of ["unit:money", "money"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "money", healthBarHeight: 1.18, source: "project-owned-procedural" });
    }
    expect(getProceduralModel("unit:future-money").kind).toBe("person");
  });

  it("resolves the missile's distinct neutral model with clearance above its pointed nose", () => {
    for (const assetId of ["unit:missile", "missile"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "missile", healthBarHeight: 1.52, source: "project-owned-procedural" });
    }
    for (const assetId of ["unit:airplane", "unit:helicopter"]) {
      expect(getProceduralModel(assetId).kind).toBe("aircraft");
    }
    expect(getProceduralModel("unit:future-missile").kind).toBe("person");
  });

  it("resolves the nuke's distinct bomb model", () => {
    for (const assetId of ["unit:nuke", "nuke"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "nuke", healthBarHeight: 1.42, source: "project-owned-procedural" });
    }
    expect(getProceduralModel("unit:future-nuke").kind).toBe("person");
  });

  it("resolves the bank with health clearance above its rooftop coin", () => {
    for (const assetId of ["unit:bank", "bank"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "bank", healthBarHeight: 1.55, source: "project-owned-procedural" });
    }
    expect(getProceduralModel("unit:capital").kind).toBe("capital");
    expect(getProceduralModel("unit:house").kind).toBe("building");
    expect(getProceduralModel("unit:future-bank").kind).toBe("person");
  });

  it("resolves the airport with health clearance above its control tower", () => {
    for (const assetId of ["unit:airport", "airport"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "airport", healthBarHeight: 1.42, source: "project-owned-procedural" });
    }
    expect(getProceduralModel("unit:airplane").kind).toBe("aircraft");
    expect(getProceduralModel("unit:house").kind).toBe("building");
    expect(getProceduralModel("unit:future-airport").kind).toBe("person");
  });

  it("resolves the capital's distinct model with health clearance while retaining other building fallbacks", () => {
    for (const assetId of ["unit:capital", "capital"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "capital", healthBarHeight: 1.68, source: "project-owned-procedural" });
    }
    for (const unitId of ["church", "college", "factory", "house", "lab", "office"]) {
      expect(getProceduralModel(`unit:${unitId}`).kind).toBe("building");
    }
  });

  it("resolves the port with health clearance above its crane", () => {
    for (const assetId of ["unit:port", "port"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "port", healthBarHeight: 1.55, source: "project-owned-procedural" });
    }
    expect(getProceduralModel("unit:house").kind).toBe("building");
    expect(getProceduralModel("unit:future-port").kind).toBe("person");
  });

  it("resolves the zoo's distinct enclosure with clearance above the giraffe and entrance", () => {
    for (const assetId of ["unit:zoo", "zoo"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "zoo", healthBarHeight: 1.55, source: "project-owned-procedural" });
    }
    expect(getProceduralModel("unit:zookeeper").kind).toBe("person");
    expect(getProceduralModel("unit:future-zoo").kind).toBe("person");
    expect(getProceduralModel("unit:house").kind).toBe("building");
  });

  it("resolves the leader's distinct model without changing other people or unknown assets", () => {
    for (const assetId of ["unit:leader", "leader"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "leader", healthBarHeight: 1.52, source: "project-owned-procedural" });
    }
    for (const assetId of ["unit:worker", "unit:priest", "unit:future-leader"]) {
      expect(getProceduralModel(assetId).kind).toBe("person");
    }
  });

  it("resolves the construction worker's distinct model without changing other workers or people", () => {
    for (const assetId of ["unit:constructionWorker", "constructionWorker"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "construction-worker", healthBarHeight: 1.42, source: "project-owned-procedural" });
    }
    for (const assetId of ["unit:worker", "unit:engineer", "unit:future-constructionWorker"]) {
      expect(getProceduralModel(assetId).kind).toBe("person");
    }
  });

  it("resolves the soldier's distinct model with helmet clearance while retaining person fallbacks", () => {
    for (const assetId of ["unit:soldier", "soldier"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "soldier", healthBarHeight: 1.42, source: "project-owned-procedural" });
    }
    for (const assetId of ["unit:warrior", "unit:priest", "unit:future-soldier"]) {
      expect(getProceduralModel(assetId).kind).toBe("person");
    }
  });

  it("resolves the dragon's distinct model with wing clearance while retaining unknown asset fallbacks", () => {
    for (const assetId of ["unit:dragon", "dragon"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "dragon", healthBarHeight: 1.42, source: "project-owned-procedural" });
    }
    for (const assetId of ["unit:future-animal", "unit:future-dragon"]) {
      expect(getProceduralModel(assetId).kind).toBe("person");
    }
  });

  it("resolves the lion's distinct model with mane clearance while retaining unknown asset fallbacks", () => {
    for (const assetId of ["unit:lion", "lion"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "lion", healthBarHeight: 1.32, source: "project-owned-procedural" });
    }
    expect(getProceduralModel("unit:future-lion").kind).toBe("person");
  });

  it("resolves Zuckerbird with clearance above its hair while retaining person fallbacks", () => {
    for (const assetId of ["unit:zuckerbird", "zuckerbird"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "zuckerbird", healthBarHeight: 1.52, source: "project-owned-procedural" });
    }
    expect(getProceduralModel("unit:priest").kind).toBe("person");
    expect(getProceduralModel("unit:future-zuckerbird").kind).toBe("person");
  });

  it("resolves the scientist's distinct model with hair and flask clearance while retaining person fallbacks", () => {
    for (const assetId of ["unit:scientist", "scientist"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "scientist", healthBarHeight: 1.52, source: "project-owned-procedural" });
    }
    for (const assetId of ["unit:worker", "unit:engineer", "unit:priest", "unit:future-scientist"]) {
      expect(getProceduralModel(assetId).kind).toBe("person");
    }
  });

  it("resolves the blues musician's distinct model with fedora and guitar clearance", () => {
    for (const assetId of ["unit:bluesMusician", "bluesMusician"]) {
      expect(getProceduralModel(assetId)).toEqual({ assetId, kind: "blues-musician", healthBarHeight: 1.52, source: "project-owned-procedural" });
    }
    for (const assetId of ["unit:michaelJackson", "unit:priest", "unit:future-bluesMusician"]) {
      expect(getProceduralModel(assetId).kind).toBe("person");
    }
  });

  it("uses terrain-safe solid action colors while selection stays white", () => {
    const targets = [
      ["attack", "#ff3b5c"],
      ["boost", "#39ff88"],
      ["construct", "#ff8a1f"],
      ["heal", "#38bdf8"],
      ["load", "#c084fc"],
      ["move", "#22d3ee"],
      ["spawn", "#ff4fd8"],
      ["unload", "#2dd4bf"],
    ] as const;
    targets.forEach(([target, color]) => {
      expect(cellHighlightColor({ selection: "none", target })).toBe(color);
    });
    expect(targetHighlightContrastColor).toBe("#111827");
    expect(cellHighlightRenderOrder.target.contrast).toBeLessThan(cellHighlightRenderOrder.target.color);
    expect(cellHighlightRenderOrder.target.color).toBeLessThan(cellHighlightRenderOrder.selection.contrast);
    expect(cellHighlightRenderOrder.selection.contrast).toBeLessThan(cellHighlightRenderOrder.selection.color);
    expect(cellHighlightColor({ selection: "selected", target: "attack" })).toBe("#ffffff");
    expect(cellHighlightColor({ selection: "none", target: null })).toBeNull();
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
