# TBS Engineering Instructions

These instructions apply to the entire repository. More specific `AGENTS.md` files may add local constraints but must not weaken these standards. The current architecture and supported production behavior are defined in `docs/architecture.md` and `docs/game-domain.md`; the v2 design and checkpoint documents are historical context.

## Priorities

Apply these priorities in order:

1. Preserve correctness, determinism, security, persisted-data compatibility, and user-visible behavior unless the task explicitly changes them.
2. Preserve dependency direction, single responsibility, clear ownership, and testability.
3. Keep code and structure consistent, strongly typed, and easy to extend.
4. Implement the requested behavior with the least code and fewest dependencies that satisfy the priorities above.

“Minimal code” never justifies skipped validation, weaker types, hidden coupling, duplicated rules, missing tests, or a broken boundary. Design patterns are tools for real variation points, not goals by themselves.

## Before changing code

- Read the nearest architecture, domain, feature, and test documentation relevant to the task.
- Search for existing types, rules, helpers, tests, and adapters before introducing another one.
- Inspect the working tree and preserve unrelated or pre-existing changes. Do not delete or rewrite work you do not own.
- Identify the owning layer and the smallest affected package before editing.
- State important assumptions in the change description or relevant decision document.
- For persisted state, commands, events, database schema, or public package APIs, plan compatibility and migration before implementation.

## Architectural boundaries

- The deterministic game core and rules are framework-free TypeScript. They must not import React, Three.js, Supabase, browser APIs, storage, network clients, environment variables, wall clocks, or global randomness.
- `game-core` and `game-rules` are the deterministic boundaries. Core has no workspace dependencies; rules depends only on core.
- React components render view models and emit semantic intents. They do not implement game rules, construct persistence rows, or call Supabase directly.
- Renderers do not decide legal movement, combat, costs, turn completion, objectives, or setup validity.
- Setup/map creation is separate from turn execution and from rendering.
- Infrastructure is accessed through application-owned ports. Provider SDK types, database rows, channel objects, and provider errors remain inside their adapters.
- Supabase is durable authority; Realtime and Presence are not authoritative state. Presence must never control seats, turns, readiness, or game outcomes.
- Player commands are validated by the trusted engine boundary. Browser previews are advisory.
- Package dependencies point inward as documented in `docs/architecture.md`. Do not deep-import another package's internal files or create cycles.
- Composition roots construct registries/adapters explicitly. Avoid global mutable registries, service locators, decorator discovery, and invisible side effects.

## Game-engine standards

- Keep transitions deterministic and express them as typed commands producing immutable state plus ordered domain events.
- Use focused action/ability/mechanic handlers rather than expanding a central conditional dispatcher.
- Model units through composition of definitions, capabilities, abilities, tags, and components. Do not create inheritance hierarchies for unit categories.
- Use stable entity IDs. Coordinates identify board locations, not entity identity.
- Make mechanic phases and ordering explicit. Reject duplicate IDs, missing dependencies, and hook cycles during ruleset construction.
- Do not read `Date`, locale, browser state, network state, or `Math.random()` inside deterministic rules. If randomness is required, inject a serialized deterministic source.
- Keep gameplay arithmetic deterministic. Centralize rounding and avoid floating-point state where integers are sufficient.
- Pin schema, protocol, ruleset, and content versions for persisted games. Never reinterpret an active match under new balance rules silently.
- Rejections are typed expected values and must not mutate state. Exceptions are for programming or infrastructure failures.

## TypeScript standards

- Keep strict TypeScript enabled. Do not introduce `any`; accept `unknown` at trust boundaries and narrow it.
- Prefer discriminated unions for commands, events, lifecycle states, and failures.
- Prefer branded IDs when plain strings for different entities could be confused.
- Infer transport types from runtime schemas when possible; do not maintain parallel schemas, parsers, and handwritten unions without a documented need.
- Use `import type` and `export type` for type-only dependencies.
- Prefer readonly inputs/outputs in domain code. Scoped internal mutation is acceptable only when it is contained and returns a clear immutable result.
- Avoid unchecked assertions, non-null assertions, overly broad generics, and optional fields that permit invalid states.
- Keep package public APIs deliberate. Do not export implementation details “just in case.”
- Do not use TypeScript suppression comments without a narrow explanation and a follow-up path.

## Organization and responsibility

- Put each concept in the layer and bounded context that owns it. Folder names should describe domain or application responsibility, not vague categories such as `misc`, `shared`, or `helpers`.
- A file should have one cohesive reason to change. Split a file when it mixes orchestration, domain decisions, infrastructure mapping, and rendering—not to satisfy an arbitrary line count.
- Prefer feature-local code. Promote a helper only when multiple callers share the same stable concept.
- Keep dependency composition at app/function entry points. Pass explicit dependencies into units that need them.
- Avoid barrel files that expose internals or create cycles. Package entry points may provide a small intentional public API.
- Do not create empty folders, speculative interfaces, placeholder abstractions, or one package per class.
- Record significant, durable architectural choices as ADRs and link superseded decisions.

## DRY and design-pattern standards

- Maintain one authoritative definition for unit/rule metadata, costs, limits, protocol discriminants, and persisted versions.
- Remove copy/paste branches by extracting the underlying domain concept, not by creating an untyped generic utility.
- Do not force superficially similar behavior through one abstraction when its invariants differ.
- Use ports/adapters for replaceable infrastructure, command handlers for action families, strategies for renderer implementations, presenters for domain-to-view mapping, and explicit state machines for multi-step interactions.
- Prefer composition over inheritance.
- Abstract after a real variation point or repeated domain responsibility is understood. Direct, well-placed code is better than premature indirection.

## React and presentation standards

- Keep route/shell concerns, application session state, presenter logic, interaction state, and rendering separate.
- Keep canonical game state in one session model. Derive narrow view models/selectors; do not mirror the whole snapshot across component state.
- Keep hooks focused and dependency arrays correct. Effects synchronize with external systems; they are not a substitute for derivation.
- Both 2D and 3D renderers consume the same renderer-neutral board model and emit the same semantic intents.
- Animation consumes domain events and never changes canonical game rules/state. It must be cancellable and able to settle immediately to canonical state.
- Keep HUD, menus, labels, and keyboard/reduced-motion support accessible in DOM even when the board is 3D.
- Profile before adding memoization, instancing complexity, state libraries, or rendering effects.

## Supabase and security standards

- Validate every untrusted payload at the boundary and enforce size/count limits before expensive work.
- Enable RLS on exposed tables and use least-privilege grants. Recheck authorization inside security-definer/service-only operations.
- Never expose service/secret keys to browser code, logs, fixtures, screenshots, or committed environment files.
- Browser configuration may contain only values explicitly safe for public clients.
- Mutating operations require unique action/request IDs, optimistic revision checks, idempotent retry behavior, and typed errors.
- Commit canonical snapshot, action, events, lifecycle, and revision atomically.
- Broadcast small revision notices. Recover durable state through bounded history or snapshots.
- Do not log invite tokens, JWTs, secrets, or unnecessary private game payloads.
- Add forward-only database migrations and pgTAP coverage for policies, grants, RPCs, constraints, race behavior, and cleanup.

## Style and dependencies

- Follow the repository formatter, linter, naming, and import-order configuration. Do not hand-format around the tools.
- Use clear domain names. Avoid unexplained abbreviations, magic values, boolean parameters with unclear meaning, and comments that merely repeat code.
- Comments explain intent, invariant, tradeoff, or non-obvious constraint. Remove stale and commented-out code.
- Keep functions small enough to understand, but prefer cohesive flow over fragmentation into trivial wrappers.
- Add a dependency only when it removes meaningful implementation/maintenance risk. Check runtime weight, ownership, license, compatibility, and whether platform/workspace code already solves the need.
- Use pnpm through the root lockfile and documented root/Nx commands. Never introduce a second lockfile.

## Testing

- Add or update the closest test for every behavior change and every fixed bug.
- Test observable behavior and invariants rather than implementation details.
- Engine changes require success, rejection, immutability, event-order, and replay/determinism coverage as applicable.
- New handlers and adapters must pass their shared contract suites.
- Persisted-contract changes require parser/schema, forward-only migration, and round-trip coverage. Prototype data may be reset only when an authoritative migration plan explicitly permits it.
- Supabase changes require local integration/pgTAP coverage. Multiplayer/reconciliation changes require isolated-client race/reconnect coverage.
- Renderer changes require semantic interaction tests; use a small number of visual screenshots for layout/scene regressions.
- Animation tests use a fake clock or controlled frames. Do not rely on real delays.
- Run the smallest relevant checks while iterating, then all affected lint, type-check, test, and build tasks before completion.
- Do not weaken, skip, or delete a failing test to make a change pass unless the requirement intentionally changed and the replacement assertion documents it.

## Documentation

- Update documentation in the same change when behavior, architecture, commands, setup, limits, security assumptions, or supported versions change.
- Keep `docs/architecture.md` accurate for the supported system; do not describe proposed behavior as already shipped. Preserve explicitly historical documents as records.
- Add feature rules to the relevant feature/domain document, not only to code comments.
- Link rather than duplicate authoritative explanations. Mark historical decisions as superseded instead of silently rewriting their rationale.

## Completion checklist

Before declaring work complete, verify:

- The requested behavior is implemented and no unrelated work was overwritten.
- Ownership, dependency direction, single responsibility, and DRY remain intact.
- Types model valid states and all trust boundaries validate `unknown` input.
- Security, determinism, compatibility, idempotency, and realtime recovery were considered where relevant.
- Focused and affected tests, lint, type-check, build, database, and E2E checks passed as appropriate.
- Documentation and migrations are included when required.
- The diff contains no secrets, generated noise, debug logging, stale code, unexplained suppressions, or unnecessary dependencies.
- The implementation is the least verbose solution that still satisfies every standard above.
