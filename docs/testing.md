# Testing

Run commands from the repository root.

## Fast suites

- `pnpm test`: all Nx unit and shared adapter-contract projects.
- `pnpm nx run @TBS/game-core:test`: normalized-state invariants, immutable primitives, registries, and mechanic ordering.
- `pnpm nx run @TBS/game-rules:test`: all standard action families, rejection/immutability/event order, deterministic replay, codecs, content registries, and extension seams.
- `pnpm nx run @TBS/game-ai:test`: observation shape/version checks, six-neighbor and relational encoding, production/transport inputs, remaining-turn horizon, record-order invariance, candidate permutation alignment, and explicit overflow rejection.
- `pnpm nx run @TBS/ai-training-tools:test`: complete legal-choice contracts, revision-bound selections, bundled reset, immutable snapshot/replay, same-team sequences, turn-60 draw and final-turn victory behavior, terminal rewards/bootstrap, truncation, encoded-observation protocol, and pipe-protocol validation.
- `pnpm nx run @TBS/protocol:test`: current transport schemas, size limits, round trips, and injected rules-codec composition.
- `pnpm nx run @TBS/application:test`: multiplayer session lifecycle, optimistic action projection and rollback, monotonic submission settlement, revision reconciliation, and deterministic local two-team control.
- `pnpm nx run @TBS/game-setup:test`: map documents, limits, topology, playable placement, axial-backed generation, editor immutability, presets, and initial objective/state derivation.
- `pnpm nx run @TBS/presentation:test`: renderer-neutral board projection, stable entity identity, semantic overlays and accessibility descriptions, movement-cue derivation, adjacent revision ordering, queue limits, replay-gap settling, and reduced motion.
- `pnpm nx run @TBS/renderer-2d:test`: SVG projection, accessible semantic cell/entity controls, click-disabled preview mode, terrain-safe action and selection border layers with selection precedence, stacking above entities, team and health indicators, and movement animation markup.
- `pnpm nx run @TBS/renderer-3d:test`: axial world projection, instanced-terrain lookup, terrain-safe action and selection border layers with explicit selection render priority, proportional health-bar coverage anchored to the track's left edge, bounded camera transitions, distinct house/ambulance/truck/big-truck/sub/bank/airport/factory/lab/church/capital/college/office/zoo/leader/dragon/lion/doctor/scientist/Zuckerbird/blues musician/missile/nuke/moneybag asset routing and health-bar heights, procedural asset fallbacks, and deterministic movement interpolation/reduced-motion settling.
- `pnpm nx run @TBS/adapter-memory:test`: shared provider-neutral contracts against the deterministic adapter.
- `pnpm nx run @TBS/adapter-supabase:test`: provider mapping, identity, realtime lifecycle, and shared contracts. Live Supabase cases are skipped unless explicitly enabled.
- `pnpm ui:test`: React bindings, map repository/import/export, multiplayer and solo routes, deferred multiplayer initialization, local two-team control, interactions, immediate optimistic movement, rejected-move rollback, and conflicting-transition animation cancellation.
- `pnpm build`: strict TypeScript checks and production bundles.
- `pnpm lint`: zero-warning static analysis.
- `pnpm architecture:check`: dependency-boundary enforcement.
- `pnpm edge:build`: deterministic trusted-action bundle generation directly from current workspace sources for the Edge runtime.
- `pnpm performance:check`: maximum-size board batching p95, instanced terrain count, lazy 3D splitting, and production gzip budgets.
- `pnpm portability:check`: shared read, write, and all-nine-action-family contracts against the provider-independent in-memory adapter; CI runs this as a named alternate-provider rehearsal.
- `pnpm ai:benchmark`: builds the headless environment and reports per-preset legal enumeration, bounded random-legal simulation, memory, and serialization measurements. This is a diagnostic benchmark, not a strength gate.
- `pnpm ai:representation:benchmark`: measures Money Mountain's reachable encoded entity/candidate bounds, serialization size, numeric input memory, and encoder latency.
- `pnpm ai:phase2`: with the pinned Python environment active, generates an ignored untrained checkpoint/ONNX bundle, verifies entity/candidate permutation semantics and PyTorch/ONNX Runtime Web parity, runs one engine-to-model-to-engine decision, and reports representation measurements.

## Local Supabase

Start the local stack, run `pnpm edge:serve` in a second terminal, and configure the public values in the UI package's `.env.local` file, then run:

```sh
pnpm supabase:reset
pnpm supabase:test
pnpm supabase:lint
```

To run the Supabase adapter contracts against the local stack:

```sh
RUN_SUPABASE_INTEGRATION=true \
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_PUBLISHABLE_KEY=<local-publishable-key> \
pnpm --filter @TBS/adapter-supabase test
```

Never use a service-role key in browser or gateway tests.

## Distributed browser acceptance

The standalone local-game checks do not require Supabase. The per-model browser specs are temporarily excluded by the Playwright configuration while their repeated coverage is reworked into a smaller representative suite; the model-specific descriptions below document those retained but inactive specs. Fast renderer tests continue to cover dedicated asset routing and health-bar placement.

Install the pinned browser once with `pnpm exec playwright install chromium`, keep both local Supabase and `pnpm edge:serve` running, then run `pnpm test:e2e`. Its lifecycle pre-step rebuilds all workspace and Edge artifacts before Playwright starts, preventing ignored package output from becoming stale.

The Playwright web server sets `VITE_TEST_ONLY_GAME_CONTENT=true` so browser tests can exercise the WebGL cell-selection controls and use the minimal two-cell Default battlefield fixture. Existing production-build and development-server commands do not set this test-only flag, so those controls and that map remain hidden during normal use.

The one-worker suite uses isolated anonymous browser contexts and covers creator/challenger/spectator share-link play through the trusted action authority, a complete match controlled through the 3D renderer's semantic and keyboard inputs, Presence, completion, all nine action families, tab closure and durable restore, a same-member stale-tab conflict, and exact action-ID retry. Failures retain trace, video, screenshots, an HTML report, and client console/page errors under ignored `test-results/` paths.

The Zuckerbird model case checks mesh selection, action menus, camera rotation, and 2D/3D switching with both teams, and attaches two views for glasses, tablet, and hoodie visibility. Its manifest test checks dedicated asset routing and health-bar clearance above the hair.

The bank model case checks mesh selection, absence of production actions, camera rotation, and 2D/3D switching with both teams. It attaches front and rotated views alongside the capital and a residential house for vault, coin, and team-color visibility. Its manifest test checks dedicated routing and health-bar clearance above the coin.

The truck model case checks mesh selection, attack-menu access, camera rotation, and 2D/3D switching with both teams alongside the big-truck semi. It attaches front and rotated views for cab, wheels, open cargo bed, and team-color visibility. Its manifest test checks dedicated routing, cab-roof health-bar clearance, and preservation of the other vehicle fallbacks.

The big-truck model case checks mesh selection, attack-menu access, camera rotation, and 2D/3D switching with both teams alongside the regular pickup. It attaches front and rotated views for the tall cab, exhaust stacks, enclosed trailer, multiple axles, and team-color visibility. Its manifest test checks distinct routing and health-bar clearance above the exhaust stacks and trailer roof.

The factory model case checks mesh selection, spawning access, camera rotation, and 2D/3D switching with both teams alongside a residential house. It attaches front and rotated views for sawtooth roof, loading bay, smokestack, and team-color visibility. Its manifest test checks dedicated routing and health-bar clearance above the taller stack.

The church model case checks mesh selection, spawning access, camera rotation, and 2D/3D switching with both teams alongside a residential house. It attaches front and rotated views for the pitched roof, stained-glass windows, bell tower, cross, and team-color visibility. Its manifest test checks dedicated routing and health-bar clearance above the steeple cross.

The college model case checks mesh selection, spawning access, camera rotation, and renderer switching with both teams alongside the capital. It attaches front and rotated views for the brick wings, clock tower, mortarboard, tassel, and team colors. Its manifest test checks dedicated routing and health-bar clearance above the mortarboard.

The office model case checks mesh selection, spawning access, camera rotation, and 2D/3D switching with both teams alongside a residential house. It attaches front and rotated views for the stepped glass tower, window grid, entrance canopy, rooftop equipment, and team-color visibility. Its manifest test checks dedicated routing and health-bar clearance above the rooftop equipment.

The submarine model case checks mesh selection, attacks, camera rotation, and 2D/3D switching with both teams on water beside a port. It attaches front and rotated views for the silver capsule hull at the waterline, control surfaces, sail, team band, periscope, and surface wake. Its manifest test checks dedicated routing and health-bar clearance above the periscope.

The lab model case checks mesh selection, spawning access, camera rotation, and renderer switching with both teams beside a residential house. Front and rotated screenshots cover the rooftop reagent flask, windows, and team trim. Its manifest test checks dedicated routing and health-bar clearance above the flask rim.

The ambulance model case checks mesh selection, attack-menu access, camera rotation, and renderer switching with both teams beside a pickup. Front and rotated screenshots cover the medical crosses, light bar, rear doors, and team stripes. Its manifest test checks dedicated routing and health-bar clearance above the light bar.

The doctor model case checks mesh selection, action-menu access, camera rotation, and 2D/3D switching with both teams beside a scientist. Front and rotated screenshots cover the cap, mask, stethoscope, medical case, and team colors. Its manifest test checks dedicated routing and health-bar clearance above the cap.

The pilot model case (`tests/e2e/pilot-model.spec.js`) checks mesh selection, attack-menu access, camera rotation, and renderer switching with both teams. Front and rotated screenshots cover the goggles, flight helmet, scarf, and team colors. The manifest test checks dedicated routing, helmet clearance, and aircraft and unknown-unit fallbacks.

The priest model case (`tests/e2e/priest-model.spec.js`) checks mesh selection, action-menu access, camera rotation, and renderer switching with both teams beside a doctor. Front and rotated screenshots cover the robe, mitre, cross staff, prayer book, and team colors. Its manifest test checks dedicated routing and health-bar clearance above the mitre and staff.

The airplane model case (`tests/e2e/airplane-model.spec.js`) checks mesh selection, attack-menu access, camera rotation, and renderer switching with both teams beside the helicopter. Front and rotated screenshots cover the wings, cockpit, propeller, tail, and team colors. Its manifest test checks dedicated routing, tail-fin health-bar clearance, and helicopter routing and unknown-unit fallbacks.

The helicopter model case (`tests/e2e/helicopter-model.spec.js`) checks mesh selection, attack-menu access, camera rotation, and renderer switching with both teams beside an airplane. Front and rotated screenshots cover the cockpit, main and tail rotors, skids, and team colors. Its manifest test checks dedicated routing, rotor health-bar clearance, and unknown-unit fallback behavior.

The engineer model case (`tests/e2e/engineer-model.spec.js`) checks mesh selection, action-menu access, camera rotation, and renderer switching with both teams beside a construction worker. Front and rotated screenshots cover the white hard hat, wrench, blueprints, and team-colored jackets. Its manifest test checks dedicated routing, health-bar clearance, and preservation of the construction worker, scientist, and unknown-unit fallbacks.

The student athlete model case (`tests/e2e/student-athlete-model.spec.js`) checks mesh selection, attack-menu access, camera rotation, and renderer switching for both teams beside a worker. Front and rotated screenshots cover the graduation cap, tassel, basketball, jersey, and team colors. Its manifest test checks dedicated routing, cap clearance, and generic person fallbacks.

The worker model case (`tests/e2e/worker-model.spec.js`) checks mesh selection, action-menu access, camera rotation, and renderer switching for both teams beside an engineer. Front and rotated screenshots cover the mechanic coveralls, collar, pockets, name patch, rolled sleeves, cap, empty hands, and team colors. Manifest tests check dedicated routing and cap clearance while preserving the engineer and construction worker models.

The house model case checks mesh selection, spawning access, camera rotation, and renderer switching with both teams beside a church. Front and rotated screenshots cover the cottage roof, chimney, windows, door, and team colors. Its manifest test checks dedicated routing and health-bar clearance above the chimney.

The zookeeper model case (`tests/e2e/zookeeper-model.spec.js`) checks mesh selection, action-menu access, camera rotation, renderer switching, and browser errors with both teams beside a lion. Front and rotated screenshots cover the safari hat, feed bucket, and ownership colors; the manifest test checks dedicated routing and health-bar clearance.

The costume dancer case (`tests/e2e/michael-jackson-model.spec.js`) checks mesh selection, attack-menu access, camera rotation, renderer switching, and browser errors for both teams. Front and rotated screenshots cover the leather suit, pink shirt, red bow tie, white shoes, featureless mannequin head, and team shoulder tabs. Manifest tests check dedicated routing, head clearance, and preservation of the blues musician and unknown-unit fallback.
