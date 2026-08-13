# 3D renderer performance budget

These are release gates for the 3D MVP, not aspirational targets. Run `pnpm performance:check` after renderer, dependency, or bundling changes.

## Supported floor

- Current stable desktop Chromium with WebGL 2.
- Four logical CPU cores, integrated GPU, 8 GB system memory.
- Device-pixel ratio is capped at 1.75 by the renderer.
- The accessibility-friendly 2D renderer remains available for lower-resource or unsupported devices.

## Automated budgets

| Metric | Workload | Limit |
| --- | --- | --- |
| Terrain preparation p95 | 49 × 49 map, 2,401 cells, 200 measured runs | 20 ms |
| Terrain draw-call structure | 2,401 cells across all seven terrain materials | 7 instanced meshes |
| Initial application JavaScript | production build, gzip | 350 kB |
| Lazy 3D JavaScript | production build, gzip | 450 kB |
| Application CSS | production build, gzip | 200 kB |

The production shell lazily imports `@TBS/renderer-3d`, so Three.js and React Three Fiber are not in the initial JavaScript chunk. Static scenes use demand rendering; continuous frames are requested only while a movement cue is active. Camera changes and canonical board updates invalidate the scene through React Three Fiber.

## Manual release profile

Before a release that changes scene composition or assets, record a Chromium Performance trace on the supported floor using a 25 × 25 generated map and at least 50 entities. The acceptance floor is 30 frames per second while panning and moving one entity, no increasing GPU-memory trend after ten 2D/3D switches, and no WebGL context loss. Record the browser/device and observed values in the release notes.

Procedural asset provenance is documented in `packages/renderer-3d/assets/README.md`. Any future binary asset must also fit the lazy 3D transfer budget or change this budget through a measured, reviewed decision.
