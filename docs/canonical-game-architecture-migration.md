# Canonical Game Architecture Migration

## Status and purpose

This document defines a new migration phase for the in-development TBS prototype. It is the implementation goal for retiring `@TBS/common`, removing the legacy game model, and converging the repository on one clean set of game-state, action, event, rules, setup, application, presentation, and transport contracts.

This is not a backward-compatibility project. The game is not a deployed service, so legacy stored games, action history, snapshots, local prototype data, and obsolete database structures may be deleted. The implementation must not retain two executable versions of the game engine, actions, events, or persistence protocol.

The existing v2 design and checkpoint documents are historical inputs and must not be edited as part of this phase. This document is the authoritative plan and completion checklist for the cleanup migration.

## Goals

1. Establish one canonical, normalized `GameState` model that is used by setup, rules, application, presentation, adapters, the browser, and the trusted Edge runtime.
2. Establish one canonical `StandardAction` union and one canonical `StandardEvent` union, with one deterministic rules implementation.
3. Put every concept in the package that owns it and enforce the intended inward dependency direction.
4. Remove `@TBS/common`, its compatibility facade, its duplicated rules, its legacy contracts, and all consumers of its public API.
5. Replace legacy map-in-cell runtime state with normalized board and entity state everywhere outside the map-editor document boundary.
6. Make legal-action previews and trusted action validation share the same rules policies so the browser cannot drift from the engine.
7. Reset persistence to the single current schema and protocol, deleting legacy stored games rather than migrating them.
8. Leave the repository in a state where new units, actions, abilities, mechanics, objectives, and renderers can be added through explicit extension points instead of central legacy conditionals.
9. Delete obsolete code, tests, exports, dependencies, scripts, configuration, generated artifacts, and documentation references that no longer describe the supported system.

## Non-goals

- Do not preserve or migrate legacy game sessions, snapshots, action history, checksums, invite tokens, or database rows.
- Do not support protocol or game-schema version 1 at runtime.
- Do not retain a legacy action/event parser, reducer, translator, replay path, or compatibility facade.
- Do not redesign the product UI or merge the renderers. The 2D and 3D renderers are intentional parallel implementations of the same presentation contract.
- Do not move or rename the UI workspace solely for repository aesthetics in this phase.
- Do not change game balance or user-visible game rules unless a legacy behavior cannot be represented safely; any such exception must be documented and tested explicitly.
- Do not edit `docs/v2-system-design.md`, `docs/v2-implementation-checkpoint.md`, or the historical migration record in `docs/features/supabase-realtime-migration.md`.

## Final architectural rules

The completed dependency graph is:

```text
game-core        -> no workspace package
game-rules       -> game-core
protocol         -> game-core
game-setup       -> game-core + game-rules
application      -> game-core + game-rules + protocol
presentation     -> game-core + game-rules
renderer-*       -> presentation
adapter-memory   -> application + protocol
adapter-supabase -> application + protocol
test-kit         -> public APIs needed by cross-package contract tests
UI               -> application + presentation + game-setup + renderers
UI composition   -> concrete adapters and current protocol/rules codecs
Edge composition -> game-core + game-rules + protocol + provider client
```

Rules at every boundary:

- `game-core` owns normalized state, branded IDs, hex coordinates, lifecycle, entities, teams, objectives, turn state, immutable transition primitives, and invariant validation.
- `game-rules` owns the standard ruleset, unit/content definitions, action and event unions, payload parsers, action handlers, mechanics, and read-only legality/availability selectors.
- `protocol` owns the single current wire envelope, snapshot, applied-action, membership, serialization, and trust-boundary schemas. It validates common transport structure and accepts ruleset codecs through explicit composition; it does not import `game-rules`.
- `game-setup` owns map documents, editor-facing map types, validation, generation, presets, objectives, stable initial entity IDs, and construction of revision-zero normalized state.
- `application` owns provider-neutral ports, sessions, commands, reconciliation, and observable state. It is the application layer for the standard TBS product and may use the concrete `StandardAction` and `StandardEvent` contracts from `game-rules`. Provider dependencies remain injected.
- `presentation` consumes normalized state and standard rule queries, emits renderer-neutral view models and semantic intents, and never implements independent game rules.
- Adapters validate `unknown` provider data through injected/current protocol codecs and do not expose provider types.
- The Edge Function is the trusted composition root for protocol parsing, ruleset selection, deterministic evaluation, and atomic persistence proposals.
- React renders application and presentation models. It does not calculate rules, construct persistence rows, or call Supabase directly.

## Canonical contracts

The migration must converge on these concepts rather than preserving legacy aliases:

- `GameState` from `@TBS/game-core` is the only live state type.
- `StandardAction` from `@TBS/game-rules` is the only executable player-command union.
- `StandardEvent` from `@TBS/game-rules` is the only domain-event union.
- `ActionEnvelope<StandardAction>` is the only submitted action envelope.
- `AppliedAction<StandardAction, StandardEvent>` is the only committed/replayed action shape.
- `GameSnapshot<GameState>` is the only application snapshot shape.
- `MapDocument` and editor draft types are owned by `@TBS/game-setup`; they are converted once into normalized `GameState` at game creation and never become the runtime state model.
- Unit, terrain, team, entity, ruleset, content, action, and request IDs use the appropriate branded core/protocol types rather than interchangeable strings.
- There is one current schema constant and one current protocol constant. No runtime version dispatch remains after this phase.

Generic protocol wrappers must not duplicate ruleset payload definitions. The composition root combines protocol envelope schemas with `game-rules` action/event parsers. Keep this generic composition at the protocol boundary; do not propagate action/event type parameters through application ports, adapters, hooks, and components without a demonstrated second product ruleset. The application uses concrete `StandardAction` and `StandardEvent` contracts.

## Phase 0 — Protect behavior and expose the remaining dependency

1. Inventory every `@TBS/common` import, package dependency, root script, build setting, test fixture, generated bundle input, and documentation reference.
2. Classify each exported symbol by its final owner: core, rules, protocol, setup, application, presentation, test-kit, or deletion.
3. Add a temporary architecture check that fails if the number of `@TBS/common` consumers increases.
4. Review the existing suites first, then add only missing observable characterization coverage needed to protect:
   - all nine current action families;
   - success and typed rejection paths;
   - immutable state updates;
   - ordered events;
   - turn completion, income, object consumption, death, objectives, and victory;
   - deterministic replay from one canonical snapshot;
   - renderer-neutral semantic interactions.
5. Do not duplicate an already-covered legacy test merely to compare two implementations. Move the authoritative assertion to the owning package and delete the obsolete test when its implementation is removed.
6. Record the current dependency inventory in this phase's change description. Do not add another long-lived tracking document.

Exit criteria:

- Every currently supported gameplay invariant affected by this migration has adequate observable coverage outside implementation details.
- No new code is allowed to depend on `@TBS/common`.
- Every remaining common symbol has one destination or an explicit deletion decision.

## Phase 1 — Establish replacement APIs from real consumers

Do not design an idealized replacement API in isolation. For each common symbol or responsibility:

1. Identify its actual runtime and test consumers.
2. Decide which package owns the underlying concept.
3. Add the smallest cohesive replacement required by those consumers.
4. Migrate every caller of that responsibility.
5. Delete the old implementation, export, and tests immediately when no caller remains.

Prefer vertical progress through a real use case over speculative completeness. New abstractions require a current variation point or repeated domain responsibility.

### Game core

1. Make normalized `GameState` and its component types sufficient for every live runtime consumer.
2. Keep entity identity independent of board coordinates.
3. Expose only cohesive state queries and immutable primitives that are ruleset-neutral.
4. Strengthen invariant validation for occupancy, cargo, entity/team keys, health, money, lifecycle, revision, turn, ruleset, and content consistency.
5. Remove or avoid legacy offset/index concepts from the canonical runtime API. Coordinate conversion may remain only at setup/import or presentation boundaries where it is genuinely needed.

### Game rules

1. Make `StandardAction` and `StandardEvent` the authoritative unions for all supported actions and events.
2. Add or complete runtime parsing for every standard action and event.
3. Extract reusable legality and availability policies from handlers, including:
   - selectable and actionable entities;
   - reachable positions;
   - attack, boost, heal, load, unload, construct, and spawn targets;
   - production and construction choices and affordability;
   - object collection and projectile targeting;
   - income, combat stats, movement costs, capabilities, and rule-owned content metadata.
4. Make trusted handlers and browser preview selectors call the same policies.
5. Keep one authoritative registry for unit definitions, capabilities, abilities, tags, costs, terrain behavior, ruleset version, and content version.
6. Preserve deterministic rejection, immutability, event ordering, and replay tests while deleting equivalent common implementations as consumers move.
7. Keep human-facing labels, descriptions, formatting, icons, and panel copy in presentation rather than turning `game-rules` into a general metadata package.

### Protocol

1. Define the one current action envelope, snapshot, applied-action, membership, revision-notice, and error schemas.
2. Infer TypeScript transport types from runtime schemas.
3. Provide schema composition functions that accept the current ruleset's action/event parsers without importing `game-rules`.
4. Align action/request ID validation with database constraints and idempotency rules.
5. Remove version-1 schemas, migrations, dispatch, and compatibility errors. Unsupported or stale prototype data is deleted, not parsed.
6. Use one deliberate validation error representation that adapters can map into application errors.

Exit criteria:

- The destination packages expose every API required by migrated consumers, without speculative public surface added solely for possible future use.
- No rule, constant, action discriminant, event discriminant, cost, or content definition has two authoritative implementations.
- Core, rules, and protocol package tests pass independently.

## Phase 2 — Make setup own maps and create normalized games

1. Replace imports of common `MapItem`, coordinate, terrain, unit, and team types with setup-owned map-document contracts plus core/rules IDs.
2. Define one current map-document schema. Retain the existing editor-oriented row/column representation if it remains cohesive for editing; do not redesign the file format merely to resemble runtime state. Because this is a prototype, incompatible local map documents may be rejected or cleared rather than supported through a permanent legacy parser.
3. Keep editor state separate from canonical game state. Stored neighbor indexes, row/column offsets, form fields, and empty-cell sentinels must not leak into runtime `GameState`.
4. Convert a validated map document into a normalized revision-zero state with:
   - axial board cells;
   - stable entity and cargo IDs;
   - explicit teams and initial money;
   - objectives;
   - waiting lifecycle;
   - turn zero;
   - current schema, ruleset, and content identifiers.
5. Derive objectives and setup validity from rules/content definitions rather than duplicated option arrays.
6. Move shared normalized setup fixtures into test-kit and delete common fixtures when their consumers are migrated.

Exit criteria:

- Game creation produces normalized `GameState` directly.
- `game-setup` has no dependency on `@TBS/common` or `@TBS/protocol`.
- Map import/export, editor immutability, setup validation, stable IDs, and revision-zero invariants are tested.

## Phase 3 — Convert application and presentation to normalized contracts

### Application

1. Replace common snapshots, actions, events, teams, payloads, and reducer imports with core/protocol contracts.
2. Make session state hold normalized `GameState` only.
3. Use concrete `StandardAction` and `StandardEvent` contracts throughout application ports and session state. Keep an evaluator dependency injectable where it materially improves deterministic testing or composition, but do not make the whole application generic over actions and events.
4. Replay only the current `StandardAction`/`StandardEvent` format and fall back to the current canonical snapshot on gaps or mismatches.
5. Replace `CreateGameInput.initialPayload` and legacy win-condition fields with the normalized initial state/setup contract.
6. Keep trusted provider and commit composition in the Edge root. Application may depend inward on standard game rules, but it must not depend on Supabase, Edge, browser, or renderer implementations.

### Presentation

1. Rewrite board presentation to iterate normalized board cells and entities directly.
2. Remove map-cell-derived entity identity and legacy coordinate/index fallbacks.
3. Convert animation cues from `StandardEvent` entity IDs and hex positions.
4. Rewrite interaction state around `EntityId`, `HexKey`, and `HexCoord`.
5. Use game-rules legality selectors for overlays, menus, targets, costs, and availability.
6. Emit typed semantic command drafts. Inject creation of action IDs and new entity IDs at the application/UI composition boundary rather than using global randomness in domain or presentation code.
7. Move unit panel/read-model derivation into presentation so React does not recalculate combat, income, capabilities, or movement costs.

Exit criteria:

- Application and presentation have no `@TBS/common` dependency.
- Reconciliation and presentation tests use normalized fixtures and current actions/events only.
- Both renderers still consume the same unchanged-or-deliberately-evolved renderer-neutral board contract.

## Phase 4 — Replace adapters, trusted execution, and persistence

### In-memory adapter

1. Convert it first so it becomes the fast reference implementation of the final application ports.
2. Store normalized snapshots and current applied actions only.
3. Execute the injected standard rules evaluator and pass the shared adapter contract suite.

### Supabase schema reset

Add a forward-only prototype reset migration. Do not rewrite historical migration files.

The reset migration must:

1. Delete all existing game sessions and their dependent members, states, actions, tokens, presence rows, and prototype history.
2. Drop obsolete v1 constraints, functions, policies, triggers, columns, and RPC signatures that encode the legacy payload or direct-submission path.
3. Create the clean current schema for normalized snapshots and current action/event rows.
4. Enforce one supported schema/protocol, current ruleset/content pins, revision compare-and-swap, action-ID uniqueness, lifecycle consistency, payload limits, checksums, membership, RLS, least-privilege grants, and service-only commit authority.
5. Store the canonical normalized state atomically with the action and ordered events.
6. Keep Realtime messages as small revision notices and Presence as non-authoritative display state.
7. Rebuild seed data and pgTAP tests for the current schema only.

### Supabase adapter and Edge Function

1. Replace common parsing with the current protocol codec.
2. Remove all legacy snapshot reconstruction from separate `map`, `money`, status, active-team, and winner fields when the normalized state already owns those values. Database metadata may duplicate indexed lifecycle/revision fields only when the commit RPC cross-checks equality atomically.
3. Make the Edge composition root parse the current envelope, select the pinned standard ruleset, resolve the authenticated actor, apply `applyStandardAction`, and submit one typed atomic commit proposal.
4. Remove the compatibility evaluator, v1 action translation, v1 state conversion, and conversion back to a legacy payload.
5. Regenerate the Edge runtime from current package entry points and verify the bundle contains no common or legacy engine code.

Exit criteria:

- A fresh local database contains no legacy game data or v1 runtime structures.
- Memory and Supabase adapters pass the same current contract suite.
- Browser roles cannot submit candidate state/events or call the service-only commit operation.
- There is exactly one trusted action-evaluation path.

## Phase 5 — Rewire the UI without redesigning it

1. Replace UI imports and re-exports of common types with application, presentation, and setup public APIs. Only the UI composition root may bind the concrete adapter and current protocol/rules codecs.
2. Update session screens to read normalized lifecycle, teams, money, objectives, entities, and events.
3. Replace legacy action-envelope construction with the current typed command/envelope factory.
4. Remove UI calculations duplicated from the rules package; consume presentation view models instead.
5. Update the map editor to the current setup-owned map document contract. Clear or reject incompatible prototype local-storage entries rather than maintaining a permanent v1 reader.
6. Preserve existing routes, accessibility, semantic interactions, and renderer selection.
7. Keep both `renderer-2d` and `renderer-3d`; verify that they consume the same presentation contract and emit the same semantic intents.
8. Delete UI aliases, components, hooks, utilities, and tests that become unused after the normalized path is wired.

Exit criteria:

- UI source has no `@TBS/common` import or re-export.
- Neither renderer imports core, rules, setup, application, protocol, or provider packages directly.
- Current 2D and 3D interaction tests and browser journeys pass.

## Phase 6 — Delete the legacy implementation and close the hierarchy

Perform this phase as the immediate conclusion of the migration, after all runtime and test consumers use the new packages. Do not accept a compatibility facade as an intermediate completion milestone or leave deletion for an indefinite follow-up.

1. Delete the entire `common/` workspace.
2. Delete the compatibility reducer, legacy reducer, legacy state/action/event types, parsers, fixtures, coordinate translators that no longer serve a real boundary, and duplicate rule helpers.
3. Delete unused v1 protocol/migration code, compatibility exports, generated bundles, stale build output, and dead tests.
4. Remove `@TBS/common` from every package manifest and regenerate the single root lockfile.
5. Remove `common` from `pnpm-workspace.yaml`, root scripts, lint inputs, Vite dependency optimization, TypeScript/Nx configuration, and architecture checks.
6. Replace transitional architecture exceptions with exact final dependency constraints, including:
   - application may import only core, rules, and protocol workspace packages;
   - presentation may import only core and rules;
   - setup may import only core and rules;
   - adapters may import application and protocol, with concrete rules codecs injected from composition;
   - renderers may import presentation only.
7. Run a migration-scoped dead-code and public-export audit covering `common`, v1 contracts and persistence, compatibility translators, duplicate rules/selectors, stale configuration, and files directly orphaned by the migration. Delete unused code in that scope. Record unrelated cleanup separately rather than expanding this phase into a general repository rewrite.
8. Update current authoritative documentation—`docs/architecture.md`, `docs/game-domain.md`, `docs/testing.md`, `docs/conventions.md`, setup/operations documentation, and `AGENTS.md`—to describe the one supported architecture. Do not edit the historical v2 documents listed in the non-goals.

Exit criteria:

- A repository search excluding the explicitly preserved historical documents finds no `@TBS/common`, `common/src`, or `common/dist` references in active source, manifests, configuration, generated code, or current documentation.
- No package named `@TBS/common` exists in the workspace or lockfile.
- No executable v1 schema, protocol, reducer, translator, parser, or rules path exists.
- No unused legacy implementation remains merely because it existed before the migration.

## Feature-extension acceptance

The purpose of this migration is to lower the cost and risk of adding game features, not merely to produce a cleaner tree. Before declaring completion, exercise the resulting extension seams and verify:

1. A representative unit or content extension can be added through one authoritative definition plus necessary presentation assets, without editing parallel unit lists or legacy type unions.
2. A representative action or ability can be added through one cohesive rules module, explicit registry composition, presentation interaction wiring, and focused tests.
3. Adding that action does not require a second reducer branch, compatibility translation, duplicate parser, protocol-version dispatch, candidate-state database change, or renderer-specific rule implementation.
4. A mechanic can participate through an explicit ordered phase or hook without expanding a central conditional dispatcher.
5. Both renderers receive the feature through the same presentation contract and semantic intents.
6. The implementation path for a new feature is documented briefly in current architecture or contribution guidance so future work follows the intended ownership boundaries.

Use an existing opt-in extension where it proves these properties; add a test-only extension only when existing coverage cannot demonstrate the seam. Do not ship a placeholder production feature solely to satisfy this gate.

## Required testing and verification

Run focused checks while migrating each owner, then run all affected checks before completion.

Required coverage:

- Core invariant and immutable-state tests.
- Every standard action's success, rejection, event order, and deterministic replay behavior.
- Ruleset construction failures for duplicate IDs, missing dependencies, and hook cycles.
- Current protocol parser rejection, size limits, round trips, and rules-codec composition.
- Setup validation, map limits, stable IDs, objectives, and normalized revision-zero state.
- Application session, action submission, bounded replay, snapshot fallback, reconnect, and cancellation.
- Presentation selectors, semantic intents, accessibility descriptions, overlays, panels, and animation cues.
- Shared in-memory and Supabase adapter contracts.
- pgTAP coverage for the reset schema, constraints, RLS, grants, service-only commit, idempotent retries, stale revisions, races, cleanup, and resource limits.
- E2E coverage for create, join, spectator, every action family, reconnect, stale-tab conflict, exact retry, game completion, and both renderer paths where current tests distinguish them.

Required commands include, as applicable:

```sh
pnpm architecture:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm performance:check
pnpm portability:check
pnpm supabase:reset
pnpm supabase:test
pnpm supabase:lint
pnpm test:e2e
```

The final change must also verify:

1. `git status` and the final diff contain no unrelated overwritten work, secrets, generated noise, debug logging, stale compatibility comments, or unexplained suppressions.
2. The generated Edge bundle and production browser chunks contain no `common` or legacy engine implementation.
3. The Nx graph matches the final dependency direction and contains no cycles.
4. A clean clone can install, reset the local database, build, test, and run using only documented root commands.

## Definition of done

This migration is complete only when all of the following are true:

- The repository has one canonical state model, one standard action union, one standard event union, and one deterministic rules implementation.
- `@TBS/common` and all of its obsolete code are deleted.
- Runtime code supports one current game schema and one current action protocol; there is no version dispatch or compatibility execution path.
- Legacy stored games and action history have been deleted by the prototype reset migration.
- Setup, application, presentation, adapters, UI, and Edge all consume the canonical contracts through their owning package boundaries.
- Legal-action previews and trusted validation derive from shared rules policies.
- Both renderers implement the same renderer-neutral presentation contract without owning game rules.
- The feature-extension acceptance checks demonstrate that a new unit, action or mechanic has one authoritative implementation path without compatibility work.
- Architecture checks enforce the intended hierarchy.
- Tests, lint, type-check, build, database verification, portability checks, performance budgets, and E2E acceptance pass.
- Current authoritative documentation describes the resulting implementation accurately.

No phase may declare success merely because a compatibility facade makes tests pass. The final state must remove the old path rather than hide it.



## prompt

Create and pursue a continuing goal to implement the plan outlined in "docs/canonical-game-architecture-migration.md".
Use one agent only—no subagents or parallel work. Continue automatically from one eligible plan item to the next. After each item, run the relevant tests and update the plan with status and checkpoint notes.
Stop only when the plan is complete, genuinely blocked, requires my decision, or Codex reaches my usage limit. Do not apply a reset, purchase credits, or enable paid continuation.