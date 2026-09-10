# Testing

Run commands from the repository root.

## Fast suites

- `pnpm test`: all Nx unit and shared adapter-contract projects.
- `pnpm nx run @TBS/game-core:test`: normalized-state invariants, immutable primitives, registries, and mechanic ordering.
- `pnpm nx run @TBS/game-rules:test`: all standard action families, rejection/immutability/event order, deterministic replay, codecs, content registries, and extension seams.
- `pnpm nx run @TBS/protocol:test`: current transport schemas, size limits, round trips, and injected rules-codec composition.
- `pnpm nx run @TBS/application:test`: multiplayer session lifecycle, optimistic action projection and rollback, monotonic submission settlement, revision reconciliation, and deterministic local two-team control.
- `pnpm nx run @TBS/game-setup:test`: map documents, limits, topology, playable placement, axial-backed generation, editor immutability, presets, and initial objective/state derivation.
- `pnpm nx run @TBS/presentation:test`: renderer-neutral board projection, stable entity identity, semantic overlays and accessibility descriptions, movement-cue derivation, adjacent revision ordering, queue limits, replay-gap settling, and reduced motion.
- `pnpm nx run @TBS/renderer-2d:test`: SVG projection, accessible semantic cell/entity controls, click-disabled preview mode, terrain-safe action and selection border layers with selection precedence, stacking above entities, team and health indicators, and movement animation markup.
- `pnpm nx run @TBS/renderer-3d:test`: axial world projection, instanced-terrain lookup, terrain-safe action and selection border layers with explicit selection render priority, proportional health-bar coverage anchored to the track's left edge, bounded camera transitions, distinct ambulance/truck/big-truck/sub/bank/airport/factory/lab/church/capital/college/office/zoo/leader/dragon/lion/doctor/scientist/Zuckerbird/blues musician/missile/nuke/moneybag asset routing and health-bar heights, procedural asset fallbacks, and deterministic movement interpolation/reduced-motion settling.
- `pnpm nx run @TBS/adapter-memory:test`: shared provider-neutral contracts against the deterministic adapter.
- `pnpm nx run @TBS/adapter-supabase:test`: provider mapping, identity, realtime lifecycle, and shared contracts. Live Supabase cases are skipped unless explicitly enabled.
- `pnpm ui:test`: React bindings, map repository/import/export, multiplayer and solo routes, deferred multiplayer initialization, local two-team control, interactions, immediate optimistic movement, rejected-move rollback, and conflicting-transition animation cancellation.
- `pnpm build`: strict TypeScript checks and production bundles.
- `pnpm lint`: zero-warning static analysis.
- `pnpm architecture:check`: dependency-boundary enforcement.
- `pnpm edge:build`: deterministic trusted-action bundle generation directly from current workspace sources for the Edge runtime.
- `pnpm performance:check`: maximum-size board batching p95, instanced terrain count, lazy 3D splitting, and production gzip budgets.
- `pnpm portability:check`: shared read, write, and all-nine-action-family contracts against the provider-independent in-memory adapter; CI runs this as a named alternate-provider rehearsal.

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

The standalone local-game checks can run without Supabase: after `pnpm build`, run `pnpm exec playwright test tests/e2e/solo-mode.spec.js tests/e2e/ambulance-model.spec.js tests/e2e/truck-model.spec.js tests/e2e/big-truck-model.spec.js tests/e2e/sub-model.spec.js tests/e2e/bank-model.spec.js tests/e2e/airport-model.spec.js tests/e2e/factory-model.spec.js tests/e2e/lab-model.spec.js tests/e2e/church-model.spec.js tests/e2e/capital-model.spec.js tests/e2e/college-model.spec.js tests/e2e/office-model.spec.js tests/e2e/zoo-model.spec.js tests/e2e/port-model.spec.js tests/e2e/soldier-model.spec.js tests/e2e/dragon-model.spec.js tests/e2e/lion-model.spec.js tests/e2e/doctor-model.spec.js tests/e2e/scientist-model.spec.js tests/e2e/zuckerbird-model.spec.js tests/e2e/blues-musician-model.spec.js tests/e2e/missile-model.spec.js tests/e2e/nuke-model.spec.js tests/e2e/money-model.spec.js`. The model cases check mesh selection and action menus before and after camera rotation, renderer switching, and browser errors; they attach front and rotated screenshots showing both team colors alongside generic building/person fallbacks. The airport case shows both teams with runway, terminal, control tower, and parked plane silhouettes from two camera angles, and checks selection, spawning access, and renderer switching. The port case shows both teams on water, with dock, crane, and container silhouettes visible from two camera angles. The zoo, port, soldier, dragon, lion, scientist, and blues musician manifest tests also check dedicated routing and health-bar clearance above the zoo giraffe and entrance, port crane, helmet, raised wings, mane, scientist hair and flask, or musician fedora and guitar. The dragon and lion browser cases include both team colors alongside the other distinct animal model. The missile, nuke, and moneybag cases check neutral-object mesh selection after camera rotation and renderer switching, and attach front and rotated views alongside other neutral objects.

Install the pinned browser once with `pnpm exec playwright install chromium`, keep both local Supabase and `pnpm edge:serve` running, then run `pnpm test:e2e`. Its lifecycle pre-step rebuilds all workspace and Edge artifacts before Playwright starts, preventing ignored package output from becoming stale.

The one-worker suite uses isolated anonymous browser contexts and covers creator/challenger/spectator share-link play through the trusted action authority, a complete match controlled through the 3D renderer's semantic and keyboard inputs, Presence, completion, all nine action families, tab closure and durable restore, a same-member stale-tab conflict, and exact action-ID retry. Failures retain trace, video, screenshots, an HTML report, and client console/page errors under ignored `test-results/` paths.

The Zuckerbird model case checks mesh selection, action menus, camera rotation, and 2D/3D switching with both teams, and attaches two views for glasses, tablet, and hoodie visibility. Its manifest test checks dedicated asset routing and health-bar clearance above the hair.

The bank model case checks mesh selection, absence of production actions, camera rotation, and 2D/3D switching with both teams. It attaches front and rotated views alongside the capital and a generic house for vault, coin, and team-color visibility. Its manifest test checks dedicated routing and health-bar clearance above the coin.

The truck model case checks mesh selection, attack-menu access, camera rotation, and 2D/3D switching with both teams alongside the big-truck semi. It attaches front and rotated views for cab, wheels, open cargo bed, and team-color visibility. Its manifest test checks dedicated routing, cab-roof health-bar clearance, and preservation of the other vehicle fallbacks.

The big-truck model case checks mesh selection, attack-menu access, camera rotation, and 2D/3D switching with both teams alongside the regular pickup. It attaches front and rotated views for the tall cab, exhaust stacks, enclosed trailer, multiple axles, and team-color visibility. Its manifest test checks distinct routing and health-bar clearance above the exhaust stacks and trailer roof.

The factory model case checks mesh selection, spawning access, camera rotation, and 2D/3D switching with both teams alongside a generic house. It attaches front and rotated views for sawtooth roof, loading bay, smokestack, and team-color visibility. Its manifest test checks dedicated routing and health-bar clearance above the taller stack.

The church model case checks mesh selection, spawning access, camera rotation, and 2D/3D switching with both teams alongside a generic house. It attaches front and rotated views for the pitched roof, stained-glass windows, bell tower, cross, and team-color visibility. Its manifest test checks dedicated routing and health-bar clearance above the steeple cross.

The college model case checks mesh selection, spawning access, camera rotation, and renderer switching with both teams alongside the capital. It attaches front and rotated views for the brick wings, clock tower, mortarboard, tassel, and team colors. Its manifest test checks dedicated routing and health-bar clearance above the mortarboard.

The office model case checks mesh selection, spawning access, camera rotation, and 2D/3D switching with both teams alongside a generic house. It attaches front and rotated views for the stepped glass tower, window grid, entrance canopy, rooftop equipment, and team-color visibility. Its manifest test checks dedicated routing and health-bar clearance above the rooftop equipment.

The submarine model case checks mesh selection, attacks, camera rotation, and 2D/3D switching with both teams on water beside a port. It attaches front and rotated views for the silver capsule hull at the waterline, control surfaces, sail, team band, periscope, and surface wake. Its manifest test checks dedicated routing and health-bar clearance above the periscope.

The lab model case checks mesh selection, spawning access, camera rotation, and renderer switching with both teams beside a generic house. Front and rotated screenshots cover the rooftop reagent flask, windows, and team trim. Its manifest test checks dedicated routing and health-bar clearance above the flask rim.

The ambulance model case checks mesh selection, attack-menu access, camera rotation, and renderer switching with both teams beside a pickup. Front and rotated screenshots cover the medical crosses, light bar, rear doors, and team stripes. Its manifest test checks dedicated routing and health-bar clearance above the light bar.

The doctor model case checks mesh selection, action-menu access, camera rotation, and 2D/3D switching with both teams beside a scientist. Front and rotated screenshots cover the cap, mask, stethoscope, medical case, and team colors. Its manifest test checks dedicated routing and health-bar clearance above the cap.

The pilot model case (`tests/e2e/pilot-model.spec.js`) checks mesh selection, attack-menu access, camera rotation, and renderer switching with both teams. Front and rotated screenshots cover the goggles, flight helmet, scarf, and team colors. The manifest test checks dedicated routing, helmet clearance, and aircraft and unknown-unit fallbacks.

The priest model case (`tests/e2e/priest-model.spec.js`) checks mesh selection, action-menu access, camera rotation, and renderer switching with both teams beside a doctor. Front and rotated screenshots cover the robe, mitre, cross staff, prayer book, and team colors. Its manifest test checks dedicated routing and health-bar clearance above the mitre and staff.

The airplane model case (`tests/e2e/airplane-model.spec.js`) checks mesh selection, attack-menu access, camera rotation, and renderer switching with both teams beside the helicopter. Front and rotated screenshots cover the wings, cockpit, propeller, tail, and team colors. Its manifest test checks dedicated routing, tail-fin health-bar clearance, and helicopter routing and unknown-unit fallbacks.

The helicopter model case (`tests/e2e/helicopter-model.spec.js`) checks mesh selection, attack-menu access, camera rotation, and renderer switching with both teams beside an airplane. Front and rotated screenshots cover the cockpit, main and tail rotors, skids, and team colors. Its manifest test checks dedicated routing, rotor health-bar clearance, and unknown-unit fallback behavior.
