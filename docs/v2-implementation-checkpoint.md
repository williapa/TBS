# v2 implementation checkpoint

The v2 plan is implemented as of 2026-08-11. This checkpoint records the deliberate compatibility boundary and maps the MVP acceptance criteria to repository evidence. The current runtime remains authoritative in `docs/architecture.md`.

## Compatibility and scope decisions

- `@TBS/common` remains the deployed schema-v1 compatibility boundary for active games, shared legacy fixtures, and current persistence contracts. Removing it would require a separately versioned persisted-state rollout; v2 does not silently reinterpret those games.
- `standard@1` remains pinned at 36 units. The opt-in Pathfinder example proves extension seams without changing production balance or content semantics.
- Profiling met the documented large-board and bundle budgets. Authored clips, additional effects, binary compression, LOD, and entity instancing remain deferred until measurements justify their complexity.
- Supabase remains the production provider. The in-memory adapter exercises the same application contracts in CI as the portability rehearsal.

## Acceptance evidence

| Criterion | Evidence |
| --- | --- |
| React/Vite and strict TypeScript | UI Vite build, shared strict base config, package typechecks, and `pnpm check` |
| Shared browser/Edge deterministic rules | `@TBS/game-rules`, trusted Edge bundle, and cross-runtime replay/checksum tests in `@TBS/test-kit` |
| Provider confinement | application ports, adapter packages, UI composition root, and `pnpm architecture:check` |
| Trusted canonical authority | `submit-action` Edge function, service-only atomic RPC, revoked browser candidate-state path, and database security tests |
| Localized unit/ability extension | `packages/game-rules/src/extensions/pathfinder.ts` and its tests; generic 2D/3D fallback tests require no renderer implementation changes |
| Focused action handlers | explicit nine-handler standard registry and shared action-family adapter contracts |
| Shared 2D/3D interaction | `@TBS/presentation` board/intent contract consumed by both renderer packages |
| Complete 3D MVP | orthographic camera, pan/zoom, raycast selection, overlays, team/entity rendering, movement cues, and the complete-match Playwright journey |
| Canonical animation settling | presentation animation director, reduced-motion tests, renderer-switch tests, and reconciliation behavior |
| Distributed convergence | reconnect, missed-notice recovery, stale-tab conflict, spectator, renderer-switch, and idempotent-retry coverage |
| Enforced performance floor | `docs/performance/3d-renderer-budget.md` and `pnpm performance:check` |
| Guardrails | root `AGENTS.md`, package dependency tags, and automated import-boundary checks |

## Closeout commands

Run `pnpm portability:check`, `pnpm performance:check`, and `pnpm check` for the portable implementation gates. With the local Supabase stack and Edge function server running, also run the database/RLS suites, live Supabase adapter contracts, and `pnpm test:e2e` as described in `docs/testing.md`.
