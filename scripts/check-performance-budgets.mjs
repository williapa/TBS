import { readdir, readFile, stat } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const { createTerrainBatches } = await import("../packages/renderer-3d/dist/board/terrainBatches.js");

const rows = 49;
const columns = 49;
const cells = Array.from({ length: rows * columns }, (_, index) => {
  const r = Math.floor(index / columns);
  const q = index % columns;
  return {
    id: `${q}:${r}`,
    coordinate: { q, r },
    legacyIndex: index,
    neighborIds: [],
    terrainAssetId: `terrain:${["beach", "desert", "forest", "mountain", "plains", "road", "water"][index % 7]}`,
    selection: "none",
    target: null,
    accessibleDescription: `Cell ${index}`,
  };
});
const board = {
  revision: 0,
  cells,
  entities: [],
  cameraBounds: { minimum: { q: 0, r: 0 }, maximum: { q: columns - 1, r: rows - 1 }, center: { q: 24, r: 24 } },
  focusRequest: null,
  animationCues: [],
};

for (let index = 0; index < 25; index += 1) createTerrainBatches(board);
const timings = Array.from({ length: 200 }, () => {
  const startedAt = performance.now();
  const batches = createTerrainBatches(board);
  if (batches.length !== 7) throw new Error(`Expected 7 instanced terrain batches, received ${batches.length}`);
  return performance.now() - startedAt;
}).sort((left, right) => left - right);
const p95 = timings[Math.floor(timings.length * 0.95)] ?? Number.POSITIVE_INFINITY;
if (p95 > 20) throw new Error(`Large-board terrain preparation p95 ${p95.toFixed(2)}ms exceeds 20ms`);

const assetDirectory = new URL("../ui/build/assets/", import.meta.url);
const budgets = [
  { pattern: /^index-.*\.js$/, label: "initial JavaScript", maximumGzipBytes: 350_000 },
  { pattern: /^dist-.*\.js$/, label: "lazy 3D JavaScript", maximumGzipBytes: 450_000 },
  { pattern: /^index-.*\.css$/, label: "application CSS", maximumGzipBytes: 200_000 },
];
const files = await readdir(assetDirectory);
const measured = [];
for (const budget of budgets) {
  const filename = files.find((candidate) => budget.pattern.test(candidate));
  if (!filename) throw new Error(`Could not find ${budget.label} asset in ${assetDirectory.pathname}`);
  const path = join(assetDirectory.pathname, filename);
  const source = await readFile(path);
  const gzipBytes = gzipSync(source, { level: 9 }).byteLength;
  const rawBytes = (await stat(path)).size;
  if (gzipBytes > budget.maximumGzipBytes) {
    throw new Error(`${budget.label} is ${gzipBytes} gzip bytes; budget is ${budget.maximumGzipBytes}`);
  }
  measured.push({ gzipBytes, label: budget.label, rawBytes });
}

console.log(JSON.stringify({
  largeBoard: { cells: cells.length, terrainBatches: 7, preparationP95Ms: Number(p95.toFixed(2)) },
  bundles: measured,
}, null, 2));
