# Testing

Run commands from the repository root.

## Fast suites

- `pnpm test`: all Nx unit and shared adapter-contract projects.
- `pnpm nx run @TBS/game-core:test`: normalized-state invariants, immutable primitives, registries, and mechanic ordering.
- `pnpm nx run @TBS/game-rules:test`: all standard action families, rejection/immutability/event order, deterministic replay, codecs, content registries, and extension seams.
- `pnpm nx run @TBS/protocol:test`: current transport schemas, size limits, round trips, and injected rules-codec composition.
- `pnpm nx run @TBS/application:test`: session lifecycle, optimistic action projection and rollback, monotonic submission settlement, and revision reconciliation.
- `pnpm nx run @TBS/game-setup:test`: map documents, limits, topology, playable placement, axial-backed generation, editor immutability, presets, and initial objective/state derivation.
- `pnpm nx run @TBS/presentation:test`: renderer-neutral board projection, stable entity identity, semantic overlays and accessibility descriptions, movement-cue derivation, adjacent revision ordering, queue limits, replay-gap settling, and reduced motion.
- `pnpm nx run @TBS/renderer-2d:test`: SVG projection, accessible semantic cell/entity controls, click-disabled preview mode, terrain-safe action and selection border layers with selection precedence, stacking above entities, team and health indicators, and movement animation markup.
- `pnpm nx run @TBS/renderer-3d:test`: axial world projection, instanced-terrain lookup, terrain-safe action and selection border layers with explicit selection render priority, bounded camera transitions, procedural asset fallbacks, and deterministic movement interpolation/reduced-motion settling.
- `pnpm nx run @TBS/adapter-memory:test`: shared provider-neutral contracts against the deterministic adapter.
- `pnpm nx run @TBS/adapter-supabase:test`: provider mapping, identity, realtime lifecycle, and shared contracts. Live Supabase cases are skipped unless explicitly enabled.
- `pnpm ui:test`: React bindings, map repository/import/export, routes, interactions, immediate optimistic movement, rejected-move rollback, and conflicting-transition animation cancellation.
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

Install the pinned browser once with `pnpm exec playwright install chromium`, keep both local Supabase and `pnpm edge:serve` running, then run `pnpm test:e2e`. Its lifecycle pre-step rebuilds all workspace and Edge artifacts before Playwright starts, preventing ignored package output from becoming stale.

The one-worker suite uses isolated anonymous browser contexts and covers creator/challenger/spectator share-link play through the trusted action authority, a complete match controlled through the 3D renderer's semantic and keyboard inputs, Presence, completion, all nine action families, tab closure and durable restore, a same-member stale-tab conflict, and exact action-ID retry. Failures retain trace, video, screenshots, an HTML report, and client console/page errors under ignored `test-results/` paths.
