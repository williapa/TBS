# Provider portability

The application owns the contracts that a game provider must implement. Supabase is the production adapter, while `@TBS/adapter-memory` is an independent deterministic implementation used to prove that application and UI behavior do not depend on Supabase SDK types, rows, channels, or errors.

## Port surface

A replacement provider composes the focused application ports through `GameClient`:

- `IdentityPort` resolves the provider-neutral user identity.
- `GameSessionPort` creates games and joins players or spectators.
- `GameQueryPort` reads canonical snapshots and bounded ordered action history.
- `GameCommandPort` submits versioned intents and returns typed results.
- `GameRealtimePort` reports revision notices and ephemeral Presence, then tears down subscriptions explicitly.

The port contracts live in `@TBS/application`. Provider clients and transport objects stay inside their adapter package; adapter failures are normalized into application error codes before crossing the boundary. The automated architecture check permits concrete adapters only in composition roots.

## Authority requirements

An alternate durable provider must preserve the behavior, not merely the TypeScript shape:

- authenticate every operation and derive actor membership on the trusted side;
- treat its durable store as authority and realtime messages only as revision notifications;
- validate protocol, ruleset, content, payload size, membership, turn, and expected revision at the trusted command boundary;
- atomically commit the canonical snapshot, action, ordered events, lifecycle, and revision;
- make action IDs idempotent and reject conflicting retries;
- support bounded history recovery with canonical snapshot fallback;
- keep spectators read-only and Presence non-authoritative; and
- normalize provider errors without exposing credentials or private payloads.

If a provider cannot offer a single native transaction for the commit, its adapter must introduce an equivalent serialized authority boundary before it is production-safe.

## Rehearsal and replacement checklist

`pnpm portability:check` runs the shared read, write, and all-nine-action-family contract suites against the in-memory adapter. The repository CI runs this as a named gate before the complete repository check; `pnpm test` also includes it through Nx. This is the alternate-adapter rehearsal and catches accidental Supabase assumptions in the portable contract.

Before enabling another production adapter:

1. Implement the application ports in one infrastructure package.
2. Run the shared `@TBS/test-kit` client contracts unchanged against it.
3. Add provider integration tests for identity, atomic revision races, exact action-ID retry, authorization, realtime recovery, and cleanup.
4. Add only its construction to an application composition root.
5. Run `pnpm architecture:check`, `pnpm portability:check`, and `pnpm check`.
6. Document its secrets, backup/restore, retention, monitoring, and migration procedures.

Changing providers must not change game-core, rules, protocol, presentation, renderer, or React component imports.
