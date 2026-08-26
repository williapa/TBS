# Supabase Realtime Migration Plan

STATUS - COMPLETE (Packets 1–44 complete)

## Implementation Notes

### Packet 1 checkpoint — 2026-08-06

- `npm install` completed successfully: dependencies were already current; npm reported 31 audit findings (9 low, 8 moderate, 14 high) and three install scripts pending allow-list review. No audit fixes or script approvals were applied because they are outside this packet.
- `npm run common:test` built `common` and ran 24 tests: 20 passed and 4 failed. On Node.js 24.18.0, `node --test` also discovers the TypeScript source tests after the compiled tests run; those four source files use CommonJS `require` but Node reparses them as ES modules and fails with `ReferenceError: require is not defined in ES module scope`. This is the recorded pre-existing common-test baseline failure.
- `npm run ui:test` entered Create React App's changed-files/watch behavior and reported no tests related to changed tracked files; it was stopped manually. `CI=true npm run ui:test` ran the complete non-watch suite successfully: 6 suites and 15 tests passed, with pre-existing `ReactDOMTestUtils.act` deprecation warnings.
- `npm run build` completed successfully for `common`, `server`, and `ui`. The UI production build emitted pre-existing ESLint warnings (principally `no-explicit-any` and a few unused variables) plus Node's `fs.F_OK` deprecation warning.
- Packet 1 made no product or architecture changes. The next eligible packet is 1A.

### Packet 1A checkpoint — 2026-08-06

- Added `npm run server:test` and the database-free characterization suite in `server/src/sockets/game/processGameAction.test.ts`. Its named fixtures are the legacy parity references for packets 3–13: one success and one branch-specific rejection for each of `end`, `move`, `attack`, `boost`, `heal`, `spawn`, `construct`, `load`, and `unload`, plus missile consumption, automatic turn/income, and elimination-victory fixtures.
- Server fixtures replace DynamoDB reads with in-process responses and pin `Date.now()` and `Math.random()`. They cover ordinary money consumption, movement-before-action for attack/boost/heal/construct/load/unload, cargo preservation, moved-state reset, income, event construction, and winner identity without a live database.
- Added `ui/src/pages/Game/gameInteraction.test.ts`, covering select, target, confirm-by-action-builder, cancel, reset-after-server-event, projectile targeting, and the expected action shape for all nine action families.
- `npm run server:test` passes 21/21 tests. `CI=true npm run ui:test -- --runInBand` passes 7/7 suites and 20/20 tests (npm warns that the forwarded `--runInBand` is treated as an unknown npm config; the tests still run once under `CI=true`). `npm run build` passes for all workspaces with the baseline UI warnings recorded above.
- Compatibility observations, not desired future behavior: the legacy processor and rule helpers mutate nested map/unit objects; combat damage depends on `Math.random()`; event IDs depend on wall-clock milliseconds; and a non-winning result currently fills `winnerEmail`/`loserEmail` through the false side of the winner ternaries. The fixtures isolate the first three and intentionally do not approve the last as a reducer contract. Packet 2 must keep these persistence, identity, clock, and randomness details out of provider-neutral contracts.
- Packet 1A changes only tests and test commands; production behavior is unchanged. The next eligible packet is 2.

### Packet 2 checkpoint — 2026-08-06

- Replaced `any` in the shared `MapItem` and `LoadedUnit` terrain/unit/team fields with explicit terrain, unit, team-color, animal, people, building, object, and vehicle unions.
- Added schema version 1 and protocol version 1 provider-neutral contracts for `GameState`, `PersistedGamePayload`, `PlayerSeat`, `GameSnapshot`, `ActionEnvelope`, `AppliedAction`, `DomainEvent`, and typed reducer results/rejections under `common/src/contracts` and exported them from `@TBS/common`.
- Added dependency-free runtime parsers for map cells, persisted payloads, game state/snapshots, all nine game action shapes, and action envelopes. They reject malformed coordinates/numbers, invalid terrain/unit/team values, invalid lifecycle combinations, and unsupported schema/protocol versions.
- Added typed waiting and active two-player fixture builders. Contract tests cover both fixtures and invalid terrain, unit, team, schema, snapshot, action, and envelope cases.
- Narrow UI adapter casts were required where the legacy ambient enum-shaped `MapItem` meets the new shared string-union `MapItem`; no interaction or game behavior changed. The duplicate UI contract remains scheduled for removal during the migrated-route work.
- Updated the common test command to run compiled test files only, avoiding Node.js 24's accidental execution of TypeScript sources as ESM. `npm run common:test` now passes 24/24 tests, including the previously recorded 20 legacy tests and 4 new contract tests. `npm run server:test` passes 21/21, `CI=true npm run ui:test` passes 7/7 suites and 20/20 tests, and `npm run build` passes with baseline UI warnings.
- New engine contracts contain no database keys, vendor types, email/PIN identity, or wall-clock fields. The next eligible packet is 3.

### Packet 3 checkpoint — 2026-08-06

- Removed the one-point `Math.random()` combat bonus. `calculateDamage` now deterministically returns `max(0, floor(effective attack × attacker vitality) - ceil(effective defense × defender vitality))`; existing matchup, boost, and health/vitality modifiers are unchanged.
- Updated `docs/game-domain.md` with the exact formula and counterattack ordering, and removed outdated statements that combat is randomized.
- Replaced random-mocking assertions with fixed expected values and a 20-run identical-input determinism test. Removed the now-unnecessary randomness override from the legacy server fixtures and renamed the attack fixture to identify deterministic combat.
- Intentional legacy difference: a roll above 0.55 previously added one point to computed attack before defense; that luck point no longer exists. Fixed rolls at or below 0.55 already match the new formula.
- `npm run common:test` passes 25/25 tests and `npm run server:test` passes 21/21 characterization tests. The next eligible packet is 4.

### Packet 4 checkpoint — 2026-08-06

- Added and exported `applyGameAction(state, actorTeam, action)` in `common`. Shared preconditions now reject finished, waiting/inactive, wrong-team, malformed/unsupported, and not-yet-ported actions with provider-neutral typed codes.
- The manual `end` action is the only executable action in this packet. It deep-clones nested rows, cells, neighbor arrays, loaded units, and money; advances the revision and active team; clears moved flags for units and cargo; awards the next team's existing-rule income; and emits a provider-neutral `endTurn` event.
- Deep-freeze coverage proves the reducer does not mutate its input, including nested loaded-unit state. Focused tests also cover a successful end, wrong-team and finished-game typed errors, waiting state, and a not-yet-ported move.
- `npm run common:test` passes 28/28 tests and `npm run build` passes all workspaces with baseline UI warnings. The next eligible packet is 5.

### Packet 5 checkpoint — 2026-08-06

- Ported ordinary `move` into `applyGameAction` with coordinate, ownership, already-acted, movable-unit, occupancy/object-capability, and reachability checks. Successful movement advances the revision and preserves the legacy moved flag behavior on the destination.
- Money-object collection adds the shared reward to the acting team's reducer money and emits a provider-neutral move event with `consumedObject` and `moneyAward`. Missile and nuke destinations are explicitly rejected as not-yet-ported until packet 6.
- Reducer tests cover legal movement, deep-frozen input immutability, money collection, wrong ownership, occupied destinations, moved units, range failures, and the projectile packet boundary.
- The reducer matches the packet 1A ordinary-money move success/rejection fixtures after removing legacy IDs, keys, actor email, and clocks. Intentional tightening: the reducer rejects an already-moved unit explicitly; the legacy server relied on the UI to prevent that repeat action.
- `npm run common:test` passes 31/31 tests, `npm run server:test` passes 21/21 legacy fixtures, and `npm run build` passes with baseline UI warnings. The next eligible packet is 6.

### Packet 6 checkpoint — 2026-08-06

- Ported missile and nuke consumption inside the reducer's `move` branch. Projectile moves now require an existing enemy unit target, consume the object, apply fixed target/splash damage, clear killed units, and emit provider-neutral target, prevention, damage, unit, and death facts.
- Preserved the legacy team-wide priest rule: if the target team has any priest, the projectile is consumed but all target and splash damage is prevented and an empty damage list is emitted.
- Tests cover missile damage, nuke target and splash damage, a splash death, deep-frozen input immutability, priest prevention, and missing, nonexistent, friendly, neutral/empty target rejections.
- Reducer output matches the packet 1A missile fixture after removing persistence/identity fields. Nuke, splash, priest, friendly-target, and missing-target cases now have direct reducer coverage.
- `npm run common:test` passes 35/35 tests, `npm run server:test` passes 21/21 legacy fixtures, and `npm run build` passes with baseline UI warnings. The next eligible packet is 7.

### Packet 7 checkpoint — 2026-08-06

- Ported `attack` with coordinate, ownership, moved-state, movement-capability, destination occupancy, movement range, enemy target, and attack-range checks. Current-cell and movement-before-attack paths both use the deterministic common combat formula.
- Successful attacks advance the revision, preserve money-object collection, suppress counterattack when the defender dies, and emit provider-neutral attacker/defender unit, strike damage, counterattack damage, and death-coordinate facts derived from the resulting board.
- Tests cover current-cell attack, movement-before-attack, fixed damage in both directions, defender death without counterattack, deep-frozen input immutability, blocked and out-of-range movement, friendly defenders, and out-of-range targets.
- Intentional legacy differences: the reducer now rejects an already-moved attacker and validates that an attack's movement destination is reachable (the legacy processor calculated but did not enforce that movement range). Provider-neutral `attackDamage` means damage inflicted by the first strike and `defenseDamage` means counterattack damage; the legacy persistence event assigned those two array positions in reverse.
- `npm run common:test` passes 39/39 tests, `npm run server:test` passes 21/21 legacy fixtures, and `npm run build` passes with baseline UI warnings. The next eligible packet is 8.

### Packet 8 checkpoint — 2026-08-06

- Ported `boost` and `heal` with immutable movement-before-action, ownership/already-acted checks, actor capability, destination occupancy/range, adjacency, friendly-target, target capability/state, and moved-flag handling.
- Movement onto money is consumed and rewarded for both actions. Boost marks the target boosted; heal subtracts at most `HEAL_AMOUNT`, removes zero damage, and records the actual healed amount.
- Tests cover legal movement flows, money consumption, healing caps, deep-frozen input immutability, incapable actors, enemy/illegal targets, and undamaged heal targets.
- Reducer state/event output matches the packet 1A boost and heal fixtures after removing legacy persistence, identity, and clock fields. No intentional behavior difference was introduced in this packet.
- `npm run common:test` passes 43/43 tests, `npm run server:test` passes 21/21 legacy fixtures, and `npm run build` passes with baseline UI warnings. The next eligible packet is 9.

### Packet 9 checkpoint — 2026-08-06

- Ported `spawn` with building ownership/acted/capability checks, configured spawn options and costs, available funds, and adjacent empty terrain-valid destinations. Spawned units and their building are marked moved and reducer money is deducted.
- Ported `construct` with worker ownership/acted/capability checks, configured construction options and costs, movement-before-action, destination money collection, and adjacent empty terrain-valid construction cells. Workers and new buildings are marked moved.
- Tests cover legal spawn/construction, movement-before-construction, money consumption, deep-frozen input immutability, exact costs, invalid building/unit or worker, insufficient funds, occupied/invalid terrain cells, and invalid destinations.
- Reducer output matches the packet 1A spawn and construction fixtures after removing legacy persistence, identity, and clock fields. No intentional behavior difference was introduced in this packet.
- `npm run common:test` passes 47/47 tests, `npm run server:test` passes 21/21 legacy fixtures, and `npm run build` passes with baseline UI warnings. The next eligible packet is 10.

### Packet 10 checkpoint — 2026-08-06

- Ported `load` and `unload` with ownership/already-acted checks, people/vehicle compatibility, cargo occupancy, optional movement/range, adjacency, destination occupancy/terrain, moved flags, and movement money-object consumption.
- Load stores transported damage, boost, team, unit, and acted state in cargo and clears the board cell. Unload restores those fields, clears cargo, and marks the vehicle acted.
- Tests cover an immutable load/unload round trip plus invalid person, vehicle, occupied cargo, missing cargo, occupied destination, water destination, and nonadjacent vehicle/cell cases.
- Reducer output matches the packet 1A load/unload fixtures after removing persistence, identity, and clock fields. No intentional behavior difference was introduced.
- `npm run common:test` passes 50/50 tests, `npm run server:test` passes 21/21 legacy fixtures, and `npm run build` passes with baseline UI warnings. The next eligible packet is 11.

### Packet 11 checkpoint — 2026-08-06

- Centralized post-action resolution for every successful reducer branch. Elimination or configured capital victory now finishes the game, clears `activeTeam`, records `winner`, and emits `gameOver`; otherwise manual end or exhaustion of available actions changes teams, clears unit/cargo moved flags, awards next-team income, and emits `endTurn`.
- Added optional validated `winCondition` session state because capital victory cannot be reconstructed after a capital is destroyed from the current board alone. Packet 17 must persist it canonically in `game_sessions`; the database model and ownership notes below are updated accordingly.
- Tests cover elimination, capital victory, later-action rejection, automatic/manual transition parity, moved reset (including cargo), income, and finished lifecycle state.
- Reducer turn, income, and victory output matches the packet 1A automatic-turn and victory fixtures after removing persistence/identity fields. The already documented deterministic combat and corrected attack-damage naming remain the only relevant intentional differences.
- `npm run common:test` passes 53/53 tests, `npm run server:test` passes 21/21 legacy fixtures, and `npm run build` passes with baseline UI warnings. The next eligible packet is 12.

### Packet 12 checkpoint — 2026-08-06

- Added a five-step, two-turn replay fixture covering move, manual end, opposing movement, turn return, and deterministic attack. Replaying from a fresh state ten times produces byte-identical serialized state and event history.
- Closed remaining deep-freeze gaps for boost, spawn, and unload; every action branch now has mutation detection either in its direct success test or the replay, and all nine actions have success and rejection coverage.
- Completed the packet 1A parity matrix: `end` → manual transition tests; `move` → ordinary money and projectile tests; `attack` → current/moved deterministic combat tests; `boost`/`heal` → moved support tests; `spawn`/`construct` → cost/cell tests; `load`/`unload` → cargo round trip; automatic turn/income and victory → centralized lifecycle tests. Each corresponding legacy success/rejection fixture remains green in `npm run server:test`.
- Approved intentional differences are exhaustive at this checkpoint: deterministic combat removes the optional luck point; reducer move/attack reject already-acted units; attack movement range is enforced; provider-neutral attack damage names follow strike/counterstrike semantics rather than the legacy reversed array assignment; and provider-neutral results never expose the legacy non-winning `winnerEmail`/`loserEmail` ternary bug or persistence/clock fields.
- `npm run common:test` passes 54/54 deterministic tests, `npm run server:test` passes 21/21 legacy characterization fixtures, and `npm run build` passes with baseline UI warnings. The next eligible packet is 13.

### Packet 13 checkpoint — 2026-08-06

- Replaced the legacy server's duplicated action-rule branches with orchestration: DynamoDB game/user reads and identity checks, `legacyGameItemToState`, one `applyGameAction` call, `domainEventsToLegacy`, and the existing persistence/socket result shape.
- The event adapter adds legacy IDs, keys, actor identity, winner identity, and wall-clock values only at the persistence boundary. It deliberately reverses the provider-neutral strike/counterstrike values back into the legacy event's historically reversed attack/defense fields.
- Added direct adapter tests proving gameplay state excludes creator/challenger identity and domain attack events round-trip to the expected persistence-shaped record. All action characterization fixtures now execute through the production reducer-backed server without DynamoDB.
- `npm run common:test` passes 54/54, `npm run server:test` passes 23/23, `CI=true npm run ui:test` passes 7/7 suites and 20/20 tests, and `npm run build` passes with baseline UI warnings. Together, the reducer replay, all-action server fixtures, adapter tests, and UI interaction suite provide the repository's automated representative two-player path; a live DynamoDB instance is no longer required for rule parity.
- Phase 1 exit gate is satisfied: every action has success/rejection/immutability/parity coverage; replay is deterministic; contracts are provider-neutral and runtime validated; server orchestration uses the reducer; and duplicated server rule branches are removed. Supabase implementation remains blocked until Phase 2 also passes. The next eligible packet is 14.

### Packet 14 checkpoint — 2026-08-06

- Added the provider-neutral `GameSessionGateway` contract under `ui/src/multiplayer`, covering create, invite join, snapshot, paged-from-revision action reads, subscription/unsubscribe, submission, presence, and leave.
- Added request/result/session/role/revision-notice/presence types and normalized gateway error codes without importing or exposing Supabase clients, rows, channels, RPC responses, or auth types.
- Added a React context and hook injection point plus a gateway factory type; no production route or current UI behavior is changed.
- `npm run build -w @TBS/ui` passes with baseline warnings and `CI=true npm run ui:test` passes 7/7 suites and 20/20 tests. The next eligible packet is 15.

### Packet 15 checkpoint — 2026-08-06

- Added a shared in-memory game store and per-user `InMemoryGameSessionGateway` implementing the production gateway contract with the real common reducer.
- Supports creator/orange and challenger/purple seats, spectator fallback, reconnect by stable user ID, waiting→active transition with purple first, canonical snapshots, action history, revision notices, expected-revision rejection, action-ID idempotency, presence storage, subscription cleanup, and leave.
- Contract tests cover create, player join, spectator join, occupied-seat fallback, reconnect, snapshot recovery, accepted submit, duplicate retry, stale revision, spectator rejection, notices, cleanup, and action-history recovery.
- `CI=true npm run ui:test` passes 8/8 suites and 22/22 tests, and `npm run build` passes with baseline UI warnings.
- Phase 2 exit gate is satisfied: contracts contain no provider types, the in-memory gateway uses the production reducer and covers seats/revisions/idempotency/reconnect/cleanup/recovery, and React receives the implementation only through context. Supabase scaffolding is now eligible. The next packet is 16.

### Packet 16 checkpoint — 2026-08-06

- Pinned the project-local Supabase CLI at `2.111.0`, initialized `supabase/config.toml`, and added an intentionally empty ordered migration plus stable empty seed target. Generated local runtime state remains ignored under `supabase/.temp` and `supabase/.branches`.
- Added root scripts for local start, stop, status, reset, and named migration creation. Added `.env.example` with only the local API URL and a publishable-key placeholder; no service-role, secret, hosted-project, or linked-project credential is committed.
- Added `docs/supabase-local-development.md` and linked it from the root readme. It documents Docker prerequisites, clean-checkout setup, migration application, destructive-local-only reset semantics, and the distinction between browser-safe publishable configuration and privileged credentials.
- Local validation passed with Docker 29.6.2: `supabase start` applied `20260806000000_initial_scaffold.sql` and `supabase/seed.sql`; `supabase db reset --local` recreated the database and reapplied both successfully; `supabase stop` stopped the stack while preserving local data. Initial image pulls briefly hit registry rate-limit retries but completed without intervention.
- `git diff --check` and `npm run build` pass. The UI build retains the previously recorded ESLint and Node deprecation warnings. The next eligible packet is 17.

### Packet 17 checkpoint — 2026-08-06

- Added the four canonical relational tables: `game_sessions` owns version/lifecycle/revision/invitation metadata including `win_condition`; `game_members` owns identities, roles, seats, and display names; `game_states` stores only version-selected map/money gameplay JSON; and `game_actions` owns ordered protocol-versioned action/event history.
- Added named checks, foreign keys, cascading session ownership, unique membership, partial one-orange/one-purple indexes, action revision/action-ID idempotency constraints, actor-membership enforcement, useful lookup indexes, and private `updated_at` triggers. Schema and protocol version 1 are enforced both by storage checks and private reusable RPC-boundary guard functions.
- Enforced the session/state revision invariant with an immediate composite foreign key whose session revision updates cascade to `game_states` in the same statement. Gameplay state cannot advance independently, and gameplay JSON is shape-checked to reject duplicated session or membership metadata.
- Added a repeatable 21-case pgTAP suite covering supported and unsupported versions, invalid roles, duplicate membership/seats/revisions/action IDs, nonmember actors, gameplay JSON ownership, valid two-seat/action storage, and the cascading revision invariant.
- `supabase db reset --local` recreated the schema from both ordered migrations and the seed target. `npm run supabase:test` passes 21/21 and `npm run supabase:lint` reports no schema errors or warnings. The next eligible packet is 18.

### Packet 18 checkpoint — 2026-08-06

- Added exact `@supabase/supabase-js` 2.112.2 to the UI workspace and enabled anonymous sign-ins in committed local configuration. The singleton browser client is created only inside `ui/src/multiplayer/supabase`, uses the URL and publishable key environment variables, and explicitly persists and refreshes browser sessions.
- Added a provider-neutral identity contract/context plus a Supabase anonymous identity provider. It restores an existing SDK session before creating a user, deduplicates concurrent initialization, normalizes Auth failures as retryable `auth-unavailable` errors, and clears failed attempts so retry can succeed.
- Added and wired a root identity gate with explicit loading, failure, and retry UI. Downstream gateway code receives only `{ userId }` through the provider-neutral context; `rg` confirms the sole `@supabase/supabase-js` import is the browser-client module inside the Supabase adapter.
- Added five focused tests covering restored identity, first anonymous sign-in, same-session identity across a simulated page reload, normalized/retryable failure, loading UI, identity context delivery, error UI, and retry. `CI=true npm run ui:test` passes 10/10 suites and 27/27 tests; focused reruns pass 5/5 with only the baseline React test-utils deprecation warning.
- `npm run build -w @TBS/ui` passes with the baseline ESLint and Node deprecation warnings. After restarting local Supabase to load the Auth configuration, a live SDK check successfully created an anonymous local user and restored the same user ID from the returned session. The next eligible packet is 19.

### Packet 19 checkpoint — 2026-08-06

- Added an authenticated, `security definer` `create_game` RPC that derives the caller from `auth.uid()`, creates the session, orange creator membership, and revision-zero gameplay state in one transaction, and returns the provider-facing result with the one-time raw invite token.
- Invite tokens contain 256 random bits encoded as 64 hexadecimal characters. Only their SHA-256 hashes are stored in the unique `game_sessions.invite_code_hash` column; the schema has no raw-token column.
- Added centralized private helpers for the 1 MiB serialized gameplay limit and schema-selected RPC validation. The boundary rejects unsupported schema versions, oversized JSON, session/membership metadata, empty/invalid row structure, malformed core cell fields, and malformed team money before any rows are inserted. Waiting status, revision zero, empty active team/winner, orange seat, timestamps, and canonical win condition are RPC/table-derived rather than accepted in gameplay JSON.
- Added 18 create-RPC pgTAP assertions covering atomic success, returned metadata, creator membership/state persistence, token entropy/hash-only storage, unauthenticated access denial, schema rejection, metadata rejection, payload-size rejection, and absence of partial rows after every failure.
- A clean `supabase db reset --local` applied all three migrations. `npm run supabase:test` passes 39/39 across two SQL files, `npm run supabase:lint` reports no errors or warnings, and a live anonymous SDK → PostgREST `create_game` call returned the expected orange/waiting/revision-zero result. The next eligible packet is 20.

### Packet 20 checkpoint — 2026-08-06

- Added an authenticated, `security definer` `join_game` RPC that resolves only the SHA-256 hash of the supplied bearer token, locks the matching session row, and derives the caller from `auth.uid()`.
- Existing members reconnect to their original role and display name without duplicate rows. A player request claims purple only while the locked game is waiting and the seat is empty; that same transaction activates the game with purple first. Explicit spectators and every later player request receive spectator membership without changing lifecycle or gameplay state.
- Session row locking serializes seat decisions and the existing partial unique index remains the database backstop against a second purple member. Invalid tokens/intents and unauthenticated calls fail before membership writes.
- Added 21 join-RPC pgTAP assertions covering creator and purple reconnects, stable display names, purple activation/first turn, third-user fallback, explicit spectators, invalid input/Auth, row-count atomicity, gameplay immutability, and the session/state revision invariant.
- A clean reset applied all four migrations. `npm run supabase:test` passes 60/60 across three SQL files and `npm run supabase:lint` is clean. Live anonymous SDK checks verified player, spectator, and reconnect results; a real concurrent two-client player race produced exactly one purple and one spectator. The next eligible packet is 21.

### Packet 21 checkpoint — 2026-08-06

- Enabled RLS on all four game tables and granted authenticated users read-only table privileges. Membership-scoped select policies expose a session, canonical state, all member/seat metadata, and action history only when `auth.uid()` belongs to that game; unauthenticated visitors have no table privileges.
- Added a private stable `security definer` membership predicate so the `game_members` policy can check itself without RLS recursion. Private-schema function execution is revoked from `public`; authenticated callers receive only schema usage and execute access to this one policy helper.
- No insert, update, or delete policies or grants exist for browser roles. The existing `security definer` create/join RPCs remain the only mutation path and continue deriving identity from `auth.uid()`.
- Added 18 pgTAP RLS assertions covering identical player/spectator reads, zero-row nonmember visibility by known UUID, unauthenticated denial, all-table RLS enablement, and direct state, action, session, and membership write denial.
- A clean reset applied all five migrations. `npm run supabase:test` passes 78/78 across four SQL files and `npm run supabase:lint` is clean. A live three-client PostgREST check confirmed member and spectator visibility, nonmember isolation, and direct-write rejection. The next eligible packet is 22.

### Packet 22 checkpoint — 2026-08-06

- Added authenticated, membership-scoped `get_game_snapshot` and `get_game_actions` `security definer` RPCs. Snapshot reads compose lifecycle/version metadata from `game_sessions`, orange/purple seats and spectator count from `game_members`, and the revision-matched gameplay payload from `game_states` into one provider-neutral row.
- Snapshot reads re-run the schema-selected payload validator before returning JSON. Malformed payloads and unsupported stored schema versions are normalized to SQLSTATE `22023` with `incompatible stored gameplay data`, preventing unvalidated state from crossing the RPC boundary.
- Action recovery returns protocol version, UUID action ID, ordered revision, actor team, action, and events strictly after the supplied revision. A centralized maximum page size of 100 is enforced; negative cursors and limits outside 1–100 are rejected. Stored protocol versions are validated before rows are returned.
- Added 18 pgTAP assertions covering composed seats/lifecycle/payload, player/spectator snapshot equality, spectator history, ordered and bounded after-revision paging, malformed parameters, nonmember denial, and typed malformed/unsupported stored-data errors.
- A clean reset applied all six migrations. `npm run supabase:test` passes 96/96 across five SQL files and `npm run supabase:lint` is clean. A live four-client SDK check verified player/spectator snapshot equality, empty recovery, spectator count, and nonmember rejection. The next eligible packet is 23.

### Packet 23 checkpoint — 2026-08-06

- Added authenticated `submit_game_action`, which derives `auth.uid()` and the player team from membership, serializes per game, locks the session row, enforces active-player/turn/expected-revision/finished-state rules, validates protocol/action/events/candidate gameplay, and structurally validates the separate lifecycle transition proposal.
- Accepted submissions atomically insert the ordered action/events, advance canonical session metadata, and replace gameplay payload. The session revision now cascades immediately through the composite foreign key to `game_states`, so the invariant holds in the revision-update statement itself; gameplay state cannot advance independently.
- Exact same-caller/action/protocol/events retries return the previously committed action plus the current canonical snapshot with `idempotent = true`, even after the turn or later state has changed. Reusing an action ID for different content is rejected.
- Live concurrency exposed two implementation details that unit SQL alone did not: competing operations must enter through a per-game transaction advisory lock before any game-table access to avoid foreign-key/row-lock queue inversion, and an application-level stale revision must use PostgREST SQLSTATE `PT409` rather than PostgreSQL serialization SQLSTATE `40001` (which infrastructure retries until timeout). After correction, the live two-request race returned one revision and one `PT409` in 14 ms.
- Added 24 pgTAP assertions covering spectator/out-of-turn/stale/finished rejection, unsupported protocol, invalid lifecycle/payload atomic rollback, actor derivation, action/state/session atomicity, exact retry, conflicting ID reuse, active and finished transitions, and post-finish denial. Count assertions were made game-scoped/baseline-relative so the suite remains repeatable on a nonempty local stack.
- A clean reset applied all seven migrations. `npm run supabase:test` passes 120/120 across six SQL files on a deliberately nonempty database, `npm run supabase:lint` is clean, and `git diff --check` passes. A final live SDK race verified one commit, immediate `PT409`, exact idempotent retry, one history row, and revision-matched canonical recovery. The next eligible packet is 24.

### Packet 24 checkpoint — 2026-08-06

- Added one private Realtime `revision` Broadcast row after each committed `game_actions` insert. The payload contains exactly `gameId`, `revision`, and `actionId`; it contains no action/events, player identity, lifecycle metadata, or board state and remains below 200 serialized bytes in tests.
- Added a private, stable, `security definer` `game:<uuid>` authorization predicate and a `realtime.messages` SELECT policy based on the documented `realtime.topic()` authorization input. It delegates membership to the existing indexed membership helper; no client Broadcast INSERT policy is granted.
- The action trigger and message insert share the action transaction. A test-only later trigger forces failure after the notice insert and proves the message, action, session revision, and state revision all roll back together.
- Added 17 pgTAP assertions covering exact/small/private Broadcast shape, one notice per action, player/spectator topic access, nonmember/cross-game denial, and post-trigger rollback behavior.
- A clean reset applied all eight migrations. `npm run supabase:test` passes 137/137 across seven SQL files, `npm run supabase:lint` is clean, and `git diff --check` passes. A live four-client WebSocket check delivered the exact notice to the orange player and spectator, while Realtime logged `Unauthorized` for the nonmember (the local SDK surfaced that denial as a subscription timeout). The next eligible packet is 25.

### Packet 25 checkpoint — 2026-08-06

- Added `SupabaseGameSessionGateway` read/create/join methods behind the existing provider-neutral contract. It awaits anonymous identity readiness, invokes only the authenticated RPCs, confirms returned membership matches the ready identity, and returns `CreatedGame`, `GameSession`, `GameSnapshot`, and `AppliedAction[]` rather than Supabase rows/responses.
- Every boundary is runtime validated: create payloads use `parsePersistedGamePayload`; composed RPC snapshots use `parseGameSnapshot`; history rows use the new `parseAppliedAction` and discriminated `parseDomainEvent` validators. Unsupported or malformed stored data becomes provider-neutral `incompatible-data` rather than a cast value.
- Added centralized Supabase error normalization for Auth, invalid invite/game, membership, spectator, turn, `PT409` stale revision, duplicate action, incompatible data, invalid action, network, and unknown failures with provider-neutral retryability.
- Extracted a shared create/join/reconnect/snapshot/history read contract and ran it against both the in-memory and Supabase implementations. The local Supabase version uses independent clients/Auth storage keys and passes through real anonymous Auth and RPCs without raw provider objects.
- `npm run common:test` passes 55/55. The default UI suite passes 11 suites and 35 tests with the live Supabase suite intentionally skipped; the explicitly enabled live Supabase read contract passes 1/1. `npm run build -w @TBS/ui` and `git diff --check` pass with only the recorded baseline UI warnings. Production `@supabase/supabase-js` imports remain confined to `ui/src/multiplayer/supabase`. The next eligible packet is 26.

### Packet 26 checkpoint — 2026-08-06

- Implemented reducer-backed `submitAction`, private-topic `subscribe`, and idempotent `leave`/unsubscribe cleanup in `SupabaseGameSessionGateway`. Submissions derive the actor role from canonical membership, calculate a candidate through the shared reducer, await `submit_game_action`, validate the applied action, and refetch the canonical snapshot before returning it.
- Revision subscriptions authenticate before opening `game:<uuid>`, validate the caller's membership, expose only parsed provider-neutral revision notices, ignore malformed provider payloads for later reconciliation, and track every channel so both explicit unsubscribe and `leave` remove it exactly once.
- Added a shared write/subscription contract for both gateway implementations. It covers accepted state, ordered notices, duplicate action idempotency, stale revisions, spectator rejection, canonical recovery, unsubscribe, and complete channel cleanup. Supabase error normalization is now idempotent when a provider-neutral gateway error crosses the adapter twice.
- `CI=true npm run ui:test` passes 11 suites and 36 tests with the two explicitly live Supabase tests skipped. With local Supabase enabled, both the shared read and write contracts pass 2/2 through real anonymous Auth, RPCs, and private Realtime WebSockets. `npm run build -w @TBS/ui` and `git diff --check` pass with only the recorded baseline UI warnings. The next eligible packet is 27.

### Packet 27 checkpoint — 2026-08-06

- Added a provider-neutral `GameRevisionReconciler` that always obtains a canonical snapshot before opening the subscription, then immediately reads history to close the snapshot/subscription race. Realtime notices are serialized as hints rather than treated as state.
- Recovery ignores already-applied revisions and replays only an action whose revision is exactly local revision plus one. Each replay reruns the shared reducer and requires the resulting revision and domain events to match the committed action before publishing the new local snapshot.
- Revision gaps are read in order through `getActions`. Missing/noncontiguous history, reducer/event mismatch, read failure, or a configurable oversized gap falls back to `getSnapshot`; snapshot fallback cannot regress a newer local revision. Stop/unsubscribe is generation-safe and idempotent so queued work cannot update an unmounted consumer.
- Focused tests pass 4/4 and cover dropped, duplicate, delayed, and out-of-order notices; contiguous replay; corrupt-history fallback; oversized-gap fallback; initial subscription races; returning-tab canonical recovery; and repeated cleanup. The complete default UI suite passes 12 suites and 40 tests with two live Supabase tests intentionally skipped. `npm run build -w @TBS/ui` and `git diff --check` pass with only the recorded baseline UI warnings. Phase 4 is complete and the next eligible packet is 28.

### Packet 28 checkpoint — 2026-08-06

- Added a provider-neutral `GameSessionProvider` and `useGameSession` hook over the injected gateway. The context exposes the joined session/role, canonical snapshot, idle/loading/connected/error connection state, idle/submitting submit state, normalized errors, create/join/submit operations, error clearing, and leave.
- Connected sessions start the Packet 27 reconciler and publish only initial, RPC-returned, or reducer-reconciled canonical snapshots. Operation generations and mounted-state guards prevent stale joins, queued notices, submissions, or asynchronous cleanup from updating an unmounted consumer.
- Kept the provider isolated to its component test harness; `App` and every production route remain on the legacy provider in this packet. Tests use the real in-memory gateway and cover observable loading, a joined purple player, spectator role, accepted canonical action state, submit reset, invalid-invite error state, and error clearing.
- Focused provider tests pass 3/3. The complete default UI suite passes 13 suites and 43 tests with two live Supabase tests intentionally skipped. `npm run build -w @TBS/ui` and `git diff --check` pass with only the recorded baseline UI warnings. The next eligible packet is 29.

### Packet 29 checkpoint — 2026-08-06

- Added the provider-neutral new-session home and invite route components in the in-memory route harness. The home collects a display name, selects the version-one default battlefield through a map selector, creates through `GameSessionProvider`, and presents both a read-only share URL and Clipboard copy action only after gateway success.
- Invite visitors can request the purple player seat or explicitly watch. A player request claims purple when available; when both durable seats are occupied, the gateway's canonical spectator result replaces the join controls with an explicit occupied/spectator-only message. Existing members retain their assigned role through the provider.
- Kept this flow out of the legacy production `App` pending the staged route/data migration and final Supabase gateway selection. The components and route harness depend only on the provider-neutral session API; no Supabase types or REST calls were introduced.
- Focused create/share/join tests pass 3/3, covering the selected map, copyable URL, purple claim, explicit spectator join, and occupied-game fallback. The complete default UI suite passes 14 suites and 46 tests with two live Supabase tests intentionally skipped. `npm run build -w @TBS/ui` and `git diff --check` pass with only the recorded baseline UI warnings. The next eligible packet is 30.

### Packet 30 checkpoint — 2026-08-06

- Replaced initial loading inside the new invite-route harness with `GameSessionProvider` joins and canonical gateway snapshots. Successful create/join saves only reconnect display-name/intent metadata under the invite token; a returning anonymous identity automatically re-invokes the idempotent join and displays an explicit reconnect state while membership and snapshot are restored.
- Added durable waiting, active, and finished views sourced exclusively from `GameSnapshot`: player seats, spectator count, current turn, winner, and the copied board. The new route renders a specific invalid-invite message and retains the join choice for first-time visitors.
- No `fetch`, `useFetch`, backend host, `/game/:id` REST request, or Socket.IO dependency exists anywhere under the new `pages/Session` route. The legacy production route remains unchanged until the staged action/history migration and final provider cutover.
- Focused route tests pass 5/5, including waiting/active/finished snapshots, hard-reload-style reconnect, player/spectator roles, occupied seats, and invalid invites. The complete default UI suite passes 14 suites and 48 tests with two live Supabase tests intentionally skipped. `npm run build -w @TBS/ui`, the new-route REST-absence check, and `git diff --check` pass with only the recorded baseline UI warnings. The next eligible packet is 31.

### Packet 31 checkpoint — 2026-08-06

- Extracted the board's submission boundary from the legacy Socket.IO context. `GameMap` now owns only selection, targeting, cancellation, panel intent, and shared `GameAction` construction; it neither reads email/PIN identity nor mutates a preview map optimistically. The old route's socket and temporary ordinary-move preview are isolated in the legacy `Game` adapter.
- The migrated session view builds protocol-versioned `ActionEnvelope`s with unique UUIDs and the currently rendered canonical revision, submits through `GameSessionProvider`, disables interaction while submitting or off-turn, and renders only the RPC-returned/reconciled snapshot. Rejected/stale actions surface the provider's recoverable error while preserving canonical state.
- The existing all-action interaction characterization now proves all nine builders enter the identical envelope shape. Added a shared gateway action-family contract with tailored legal maps for end, move, attack, boost, heal, spawn, construct, load, and unload; each must commit revision one through the real common reducer.
- The in-memory all-family contract passes 9/9, and the same contract passes 9/9 through independent anonymous local Supabase clients plus real RPC/canonical reads. The complete live Supabase gateway suite passes 3/3 contracts (read, write/Realtime, all actions). The default UI suite passes 14 suites and 49 tests with three live tests intentionally skipped. `npm run build -w @TBS/ui`, migrated-route socket/type boundary checks, and `git diff --check` pass with only the recorded baseline UI warnings. The next eligible packet is 32.

### Packet 32 checkpoint — 2026-08-06

- Moved canonical action-history ownership into `GameSessionProvider`. Connect/reconnect loads at most the latest 100 committed actions through `getActions`; RPC-accepted local actions and reducer-validated Realtime replays enter the same ordered merge path.
- History is sorted by committed revision, bounded to 100 actions, and deduplicated by both action ID and revision, including duplicates within a single incoming page. The reconciler now optionally reports each successfully validated replay without coupling its snapshot contract to React.
- Added a migrated `SessionEventsPanel` that flattens shared `DomainEvent`s in revision/event order, keys them by action ID plus event index, and bounds the rendered list to the most recent 100 events. No REST, persistence-shaped event type, or legacy events component is used by the new route.
- Provider and route tests cover prior two-turn history, live ordered append, duplicate suppression, and reload restoration. The complete default UI suite passes 14 suites and 51 tests with three live Supabase tests intentionally skipped. `npm run build -w @TBS/ui`, the migrated-route event-REST absence check, and `git diff --check` pass with only the recorded baseline UI warnings. The next eligible packet is 33.

### Packet 33 checkpoint — 2026-08-06

- The migrated active-game view now labels spectators explicitly as `Watching — Spectator mode`. Its board receives `active = false`, preserving cell inspection while preventing actor selection, target flows, action menus, and End Turn rendering.
- Added defensive direct-submission coverage through `GameSessionProvider`: a spectator receives the typed `spectator-read-only` error, the error is exposed to the view, and the canonical revision remains unchanged. The existing live Supabase write contract continues to prove the same rejection at the authenticated RPC boundary while spectators receive the same snapshot/action reads and Realtime notices as players.
- Focused route coverage clicks a real occupied cell as a spectator, verifies the details panel opens, and verifies neither Move nor End Turn controls exist. The complete default UI suite passes 14 suites and 52 tests with three live Supabase tests intentionally skipped. `npm run build -w @TBS/ui` and `git diff --check` pass with only the recorded baseline UI warnings. The next eligible packet is 34.

### Packet 34 checkpoint — 2026-08-06

- Extended the provider-neutral subscription with synchronized `PresenceState[]` while keeping caller updates identity-free. Both adapters derive `memberId` and persistent role from authenticated membership rather than trusting the requested Presence role; the shared contract deliberately submits a spoofed player role for a spectator and observes `spectator`.
- Supabase uses the existing single private `game:<uuid>` channel for revision Broadcast and Presence, keyed by the authenticated user ID. Presence payloads contain only game ID, display name, durable role, and online timestamp; runtime parsing rejects malformed/cross-game state. Untrack/channel removal is idempotent on leave.
- Added a membership-scoped Realtime INSERT policy restricted to `extension = 'presence'`. The separate SELECT policy already authorizes member Presence reads; client Broadcast INSERT remains denied. React now shows player online/offline state, total online viewers, and online spectators without using Presence to alter seats, lifecycle, or gameplay state.
- A clean local reset applied all nine migrations. `npm run supabase:test` passes 141/141 across eight SQL files and schema lint is clean. The live Supabase read/write/all-action suite passes 3/3, including two-client Presence sync, spoof-resistant role derivation, and leave removal. The default UI suite passes 14 suites and 52 tests with three live tests skipped; the build and `git diff --check` pass with baseline warnings. Phase 5 is complete and the next eligible packet is 35.

### Packet 35 checkpoint — 2026-08-06

- Added a provider-neutral `MapRepository` contract and a version-one local-storage adapter supporting list, get, save, update, and delete. Repository and map payloads are versioned independently; callers receive cloned values so edits cannot mutate stored state accidentally.
- Routed the bundled default battlefield through the same validated read interface and marked it read-only. Custom maps are validated through the shared persisted-game parser plus coordinate, unique-index, and neighbor-reference integrity checks before any write.
- Corrupt JSON, unsupported repository/map versions, malformed maps, duplicate IDs, invalid coordinates, and broken neighbors are rejected with typed, useful errors while preserving the prior local-storage bytes. No Supabase dependency appears under `ui/src/maps`.
- Focused repository coverage passes 7/7 and the complete default UI suite passes 15 suites and 59 tests with three live Supabase tests skipped. `npm run build -w @TBS/ui`, the Supabase-boundary check, and `git diff --check` pass with only the recorded baseline UI warnings. The next eligible packet is 36.

### Packet 36 checkpoint — 2026-08-06

- Added a portable map-transfer contract containing only schema version, name, and map data. Export validates and emits readable version-one JSON; import checks UTF-8 byte size before parsing, rejects malformed or unsupported payloads with typed messages, and returns repository-ready input without importing machine-local IDs or read-only flags.
- Centralized map limits at 49 rows, 49 columns per row, and 1,000,000 serialized bytes. The same structural/dimension validator now governs local repository reads and writes plus transfer files, while every individual stored map is size-checked before persistence.
- Focused repository/transfer coverage passes 15/15, including semantic export/import round-trip, malformed JSON, unsupported versions, missing names, row/column overflow, pre-parse byte overflow, and rejection without a local-storage write. The complete default UI suite passes 16 suites and 67 tests with three live Supabase tests skipped; the production build and `git diff --check` pass with baseline warnings. The next eligible packet is 37.

### Packet 37 checkpoint — 2026-08-06

- Added an injectable React map-repository boundary. The editor now saves through `MapRepository`, renders normalized save errors, and navigates to the maps collection after success; its former `POST /createMap` request is gone.
- The migrated game creator asynchronously lists bundled and custom local maps, validates the selected map again, and passes a fresh gameplay payload to the provider-neutral `createGame` API. The transitional legacy creator also selects from the repository rather than `/listMaps`, so no map REST endpoint remains in UI source.
- Focused tests pass 8/8. They prove editor persistence and prove a custom local map is copied into the durable in-memory game snapshot, where independently joining player and spectator clients receive it without possessing the local map. The complete default UI suite passes 17 suites and 68 tests with three live Supabase tests skipped; the production build, exact map-REST absence scan, and `git diff --check` pass with baseline warnings. The next eligible packet is 38.

### Packet 38 checkpoint — 2026-08-06

- Expanded the provider-neutral product route tree to exactly the supported surface: `/`, `/maps`, `/maps/new`, `/maps/:mapId/edit`, and `/game/:inviteToken`. Its primary navigation exposes only Start game and Maps.
- Added a local map collection page with create/edit links, guarded delete, JSON import/export controls, and useful operation errors. The editor now supports loading and updating writable repository maps while rejecting bundled-map edits.
- Intentional redirects preserve `/createGame`, `/lobby`, `/mapEditor`, `/signup`, and `/profile/*` bookmarks; every other obsolete URL receives an explicit not-found page with a route home. The legacy production `App` remains isolated until the scheduled Supabase gateway cutover in Packet 43.
- Focused route/editor coverage passes 9/9, including visible navigation, the maps collection, redirects, and not-found handling. The complete default UI suite passes 17 suites and 69 tests with three live Supabase tests skipped; the production build and `git diff --check` pass with baseline warnings. Phase 6 is complete and the next eligible packet is 39.

### Packet 39 checkpoint — 2026-08-06

- Added a pinned Playwright harness with one worker and retained trace, video, screenshots, HTML report, and per-client console/page-error logs on failure. The local web server receives only the public local Supabase URL/key and an explicit test-only switch that exposes the staged provider-neutral route before production cutover.
- Added one deterministic Chromium journey with creator, challenger, and spectator in isolated browser contexts. It creates from a local-only quick-finish map, opens the share link, claims the second seat, joins a spectator, observes Presence, completes the game through the UI, and verifies all three clients converge on the purple winner.
- The same browser journey then commits end, move, attack, boost, heal, spawn, construct, load, and unload through independent real Supabase games from browser-authenticated clients, asserting revision one for every family. No service-role credential or direct database mutation is used.
- `npm run test:e2e` passes 1/1 in Chromium. The complete default UI suite passes 17 suites and 69 tests with three live Supabase tests skipped; the production build and `git diff --check` pass with baseline warnings. The next eligible packet is 40.

### Packet 40 checkpoint — 2026-08-06

- Added a browser resilience journey that closes and reopens the challenger tab after an intervening action, then closes both player tabs and restores both later from the persisted anonymous Auth sessions, reconnect metadata, and canonical database snapshot. Both clients return at revision two without clearing storage or manually refreshing.
- Added a real concurrent stale-tab race using two browser contexts carrying the same authenticated purple member. Two distinct action IDs submit against revision zero concurrently; exactly one commits, the loser receives `stale-revision`, both canonical reads converge at revision one, and retrying the accepted request from the other tab returns the original action without a second row.
- Existing focused reconciler coverage remains the deterministic notice-failure layer: dropped and out-of-order notices replay gaps, delayed duplicates are ignored, snapshot/subscription races close without a notice, and corrupt or oversized replay gaps fall back to the canonical snapshot.
- The expanded distributed suite passes 3/3 with one worker, and focused reconciler coverage passes 4/4. `git diff --check` passes. The next eligible packet is 41.

### Packet 41 checkpoint — 2026-08-06

- Centralized browser limits for 100-action history/replay, 49-by-49 maps, 1 MiB serialized gameplay payloads, and the default 20-spectator cap. Local transfer validation and durable Postgres state writes now enforce matching size/dimension bounds.
- Supabase gateways now replace an existing subscription before opening another channel for the same game, preserving one private Broadcast/Presence channel per active game tab. Focused fake-channel coverage proves replacement, idempotent old cleanup, and final removal.
- Added a private singleton runtime-limit row and serialized membership trigger for the configurable spectator cap. The in-memory adapter mirrors the default/configurable behavior; both adapters reject new spectators at capacity while allowing existing spectators to reconnect.
- Documented weekly database-size, Auth MAU, Realtime-message, and peak-connection monitoring with current official Supabase links, conservative alert thresholds, Free-project inactivity pauses, logical backup guidance, and the absence of a paid-plan durability posture on Free.
- A clean reset applied all ten migrations. `npm run supabase:test` passes 154/154 across nine SQL files and schema lint is clean. Focused UI safeguards pass 23/23; the complete default UI suite passes 18 suites and 72 tests with three live tests skipped; the production build, distributed browser suite (3/3), and `git diff --check` pass with baseline warnings. The next eligible packet is 42.

### Packet 42 checkpoint — 2026-08-06

- Added an operator-only retention policy with separate classifications and intervals for waiting (7 days), abandoned active games with no actions (30 days), resumable active games (preserved indefinitely by default), and finished games (90 days). Opting resumable games into deletion requires explicitly setting the nullable `active_after` policy.
- Added a stable preview returning every game's category, eligibility, dependent row counts, and approximate tuple bytes. `cleanup_games` defaults to dry-run; execution locks candidates and deletes only rows whose `updated_at` still matches the preview, skipping concurrent or changed games while foreign keys cascade dependents.
- Documented preview/aggregate/transactional execution commands and separate anonymous Auth-user cleanup guidance. Auth deletion is deliberately excluded because deleting a user can cascade durable membership without deleting the corresponding game.
- A clean reset applied all eleven migrations. `npm run supabase:test` passes 168/168 across ten SQL files, including preview, dry-run, execute, cascading dependencies, and preservation of an extremely old resumable active game. Schema lint and `git diff --check` pass. The next eligible packet is 43.

### Packet 43 checkpoint — 2026-08-06

- Removed the legacy root branch: production now unconditionally constructs `SupabaseGameSessionGateway` beneath the anonymous identity gate and renders only the provider-neutral product routes. New games use the shared 1,000-per-team starting-money constant.
- Added a static import-graph boundary check from `ui/src/index.tsx`. All 71 reachable modules are free of native REST requests, port 8420, Socket.IO client/context, and DynamoDB/AWS runtime references; the optimized JavaScript bundle passes the same legacy-string scan.
- Rewrote architecture, setup, testing, and game-domain documentation around the supported React/common/Supabase flow, canonical Postgres authority, private revision/Presence channel, honest-client boundary, local map repository, resilience tests, and operator procedures.
- Common passes 55/55, the transitional server characterization passes 23/23, the default UI passes 18 suites and 72 tests with three live tests skipped, and the real local Supabase gateway passes all three read/write/all-action contracts. The root production build succeeds and drops roughly 131 kB gzip from the main bundle. SQL remains 168/168 with clean lint; distributed Chromium passes 3/3; boundary and `git diff --check` pass. The browser game now runs without Express or DynamoDB. Phase 7 is complete and the next eligible packet is 44.

### Packet 44 checkpoint — 2026-08-06

- Removed the obsolete signup, profile, lobby, legacy game display/event panels, REST hooks, socket provider/client, transitional UI utilities, and their unused packages. Removed the email/PIN validator and duplicate ambient action/event/game types; the surviving map editor uses only its local form and repository contracts.
- Removed the entire tracked Express/Socket.IO/DynamoDB server implementation, local DynamoDB scripts, server manifests, server workspace entry, root server/database scripts, and server-only dependencies. The root lockfile is now authoritative for only `common` and `ui`; `npm install` removed 187 legacy packages and completed with the previously recorded 31 transitive audit findings unchanged.
- Preserved the old decision log and UI worklog with explicit historical notices, added a feature-documentation authority note, and kept the supported architecture, setup, testing, and domain documents focused on React, the common deterministic engine, local maps, and Supabase.
- Common passes 55/55. The default UI passes 16 suites and 66 tests with the three live tests skipped; the separately enabled real Supabase gateway passes 3/3. A clean local database reset applies all eleven migrations, SQL passes 168/168 across ten files, and schema lint is clean. Distributed Chromium passes 3/3 reconnect/race/three-client scenarios.
- The root production build and install pass without a server workspace. The 71-module reachable UI boundary and direct source/manifest scans find no AWS SDK, DynamoDB, Socket.IO, legacy backend URL, old REST request, email/PIN identity, or server workspace runtime reference; `npm ls` confirms the removed runtime packages are absent, and `git diff --check` passes. The migration is complete.

## Objective

Replace the Express, Socket.IO, and DynamoDB backend with a Supabase Free-tier backend that supports:

- durable two-player games that can be resumed after both browsers close
- spectators who can watch but cannot submit moves
- share-link game creation and joining
- local custom maps copied into the durable game snapshot
- anonymous identities today, with a path to accounts, profiles, and cloud maps later
- a provider-neutral adapter so the UI and game engine do not depend directly on Supabase

This version intentionally accepts an honest-client security model. Supabase will enforce membership, player seats, active-turn ownership, revision ordering, and spectator read-only access. The browser will still calculate the next game state, so a player who modifies the client can cheat.

## Architecture Decision

Proceed with this migration rather than performing a separate, repository-wide cleanup first.

This does **not** mean adding Supabase directly to the existing React and Socket.IO design. Phases 1 and 2 are the required refactoring path: first establish a deterministic, provider-neutral game engine while the current backend still works, then prove the multiplayer gateway with an in-memory implementation. Supabase-specific work is blocked until both phases satisfy their exit gates.

A broad pre-migration cleanup would spend substantial effort on REST hooks, Socket.IO state, DynamoDB persistence, legacy authentication, and routes that later phases intentionally remove. Refactoring during this plan should therefore be limited to:

- code that survives the migration, especially `common` game rules and provider-neutral contracts
- characterization and regression tests needed to preserve current behavior
- adapter seams needed to keep the current backend working during the transition
- narrow correctness fixes required to use the legacy backend safely while migration work is in progress

Do not reorganize obsolete code solely for cleanliness. Defer cleanup of old REST, Socket.IO, DynamoDB, signup, profile, lobby, and map-persistence paths until their scheduled replacement or removal packets.

## Pre-Implementation Audit

The repository review that produced this revision found these primary constraints:

- `server/src/sockets/game/processGameAction.ts` is the current authoritative implementation and combines database access, identity checks, nine action branches, map mutation, event construction, clocks, turn resolution, and victory resolution in one large function.
- the current DynamoDB update has no revision-based compare-and-swap protection, so concurrent actions calculated from the same snapshot can overwrite one another
- combat uses `Math.random()`, and foundational helpers such as `moveMapUnit` and `attackUnit` mutate their input maps, preventing reliable replay without an explicit purity boundary
- `common` map types still use `any` for important domain fields, while the existing `GameEvent` type contains DynamoDB-specific `id` and `sk` fields and player email identity
- the earlier active-game UI cleanup successfully made cell and action-form components more presentational, but `ui/src/pages/Game/gameInteraction.ts` has grown into another large state-and-rule orchestration module without direct interaction-flow coverage
- current tests are sparse: there are no server action tests and no direct reducer tests for `gameInteractionReducer`

An attempted pre-audit run of `npm run common:test` did not reach the tests because workspace dependencies were not installed (`tsc: command not found`). This is not a recorded code failure and does not replace packet 1; packet 1 must install dependencies and establish the real baseline.

### Legacy backend stabilization policy

The legacy backend is a transitional compatibility target, not a second architecture to improve indefinitely.

- If it remains local-only during migration, document its current concurrency limitations and avoid unrelated redesign.
- If it will be shared or publicly reachable before cutover, fix the existing third-player join condition and add revision-based conditional action persistence before treating it as concurrency-safe.
- In either case, do not let legacy fixes introduce types or behavior that the provider-neutral engine must retain.

## Delivery Guidance

This plan is divided into work packets sized for one focused GPT-5.6-sol/light implementation turn. Complete the packets in order unless a packet explicitly says it can be done in parallel. Each packet should leave the repository building and should include its own tests. Do not combine multiple packets merely because they are in the same phase.

Before starting a packet:

1. Read this document and the files named by the packet.
2. Confirm the preceding packet's acceptance criteria still pass.
3. Keep Supabase imports behind the multiplayer adapter boundary.
4. Put dependency-free game rules and domain types in `common`.
5. Update this document if implementation discoveries change a later packet.
6. For every action ported in Phase 1, run its matching legacy characterization fixtures in the same packet; do not postpone parity checking until the end of the phase.
7. Treat intentional differences, including deterministic combat, as documented behavior changes with explicit old/new expectations rather than silent parity failures.

## Fixed Product Decisions

- Supabase Postgres is the durable source of truth.
- Realtime messages are notifications, not the sole copy of game state.
- Supabase anonymous Auth provides the initial player identity.
- Closing and reopening the same browser should preserve a seat.
- Clearing site data or changing devices will not restore a player seat until permanent accounts or recovery codes are implemented.
- The invitation URL is a bearer secret. Anyone with it may join the game as a player if the second seat is open, or otherwise as a spectator.
- Orange is the creator and purple is the challenger. Purple moves first.
- Combat damage will be deterministic.
- Custom maps remain local to their creator but are copied into a game snapshot when a game is created.
- The first release uses only Supabase Free-tier features.

## Target Architecture

```text
React components
    |
    v
GameSessionProvider / GameSessionGateway
    |
    +-- InMemoryGameSessionGateway (tests)
    |
    +-- SupabaseGameSessionGateway
            |
            +-- Postgres RPCs for create, join, snapshot, and action submission
            +-- Postgres tables for durable state and action history
            +-- Realtime for lightweight revision notifications

common/applyGameAction
    ^
    |
React builds action and calculates candidate state before gateway submission
```

React components must not import `@supabase/supabase-js`. Supabase user IDs, channel objects, database row types, and RPC response types must not appear in game-domain types.

## Domain Contracts

The exact names may change during implementation, but the architecture should expose equivalents of these types:

```ts
type GameState = {
  schemaVersion: number;
  revision: number;
  status: "waiting" | "active" | "finished";
  activeTeam?: TeamOption;
  map: MapItem[][];
  money: Record<TeamOption, number>;
  winner?: TeamOption;
};

type PlayerSeat = {
  memberId: string;
  displayName: string;
};

type GameSnapshot = {
  gameId: string;
  players: {
    orange?: PlayerSeat;
    purple?: PlayerSeat;
  };
  spectatorCount: number;
  state: GameState;
};

type PersistedGamePayload = {
  map: MapItem[][];
  money: Record<TeamOption, number>;
};

type ActionEnvelope = {
  protocolVersion: number;
  actionId: string;
  expectedRevision: number;
  action: GameAction;
};

type AppliedAction = {
  protocolVersion: number;
  actionId: string;
  revision: number;
  actorTeam: TeamOption;
  action: GameAction;
  events: DomainEvent[];
};

interface GameSessionGateway {
  createGame(input: CreateGameInput): Promise<CreatedGame>;
  joinGame(inviteToken: string, intent: "player" | "spectator"): Promise<GameSession>;
  getSnapshot(gameId: string): Promise<GameSnapshot>;
  getActions(gameId: string, afterRevision: number): Promise<AppliedAction[]>;
  subscribe(gameId: string, listener: (notice: GameRevisionNotice) => void): Promise<Unsubscribe>;
  submitAction(input: SubmitActionInput): Promise<SubmitActionResult>;
  updatePresence(input: PresenceState): Promise<void>;
  leave(): Promise<void>;
}
```

`GameState` is the in-memory gameplay aggregate used by the reducer. Player identity and display names are session metadata composed into `GameSnapshot`; they are not reducer input and must not be duplicated inside the persisted gameplay JSON.

Introduce provider-neutral `DomainEvent` variants for reducer output. They may contain gameplay facts such as actor team, coordinates, damage, income, and deaths, but must not require database keys, timestamps, game IDs, email addresses, or provider user IDs. The legacy DynamoDB adapter may translate a `DomainEvent` into the existing persistence-shaped `GameEvent` while the old backend remains active.

All JSON entering the application through fixtures, local storage, RPCs, or database rows must pass a runtime parser/validator selected by the canonical `schemaVersion`. TypeScript declarations alone are not runtime validation.

## Initial Database Model

Use committed Supabase migrations to create these logical tables:

### `game_sessions`

- `id uuid primary key`
- `invite_code_hash text unique not null`
- `schema_version integer not null`
- `status text not null`
- `revision integer not null`
- `active_team text`
- `winner_team text`
- `win_condition text not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `game_members`

- `game_id uuid not null`
- `user_id uuid not null`
- `role text not null` with `orange`, `purple`, or `spectator`
- `display_name text not null`
- `joined_at timestamptz not null`
- unique membership for `(game_id, user_id)`
- unique partial constraints for one orange and one purple member per game

### `game_states`

- `game_id uuid primary key`
- `revision integer not null`
- `state jsonb not null`, containing only the `PersistedGamePayload` validated for the session's schema version
- `checksum text`
- `updated_at timestamptz not null`

### `game_actions`

- `game_id uuid not null`
- `revision integer not null`
- `protocol_version integer not null`
- `action_id uuid not null`
- `actor_user_id uuid not null`
- `actor_team text not null`
- `action jsonb not null`
- `events jsonb not null`
- `created_at timestamptz not null`
- unique `(game_id, revision)`
- unique `(game_id, action_id)`

Do not add profile or cloud-map tables during this migration.

### Canonical field ownership

Avoid treating the relational columns and JSON snapshot as independent copies of the same state:

- `game_members` is canonical for user membership, player seats, roles, and display names.
- `game_sessions` is canonical for schema version, win condition, lifecycle status, ordered revision, active team, winner, invitation metadata, and timestamps.
- `game_states.state` is canonical for the schema-versioned gameplay payload: map, money, and future board-local state only. Its parser version comes from `game_sessions.schema_version`.
- `game_states.revision` identifies the session revision represented by that payload. It must equal `game_sessions.revision` after every committed transaction; submission and recovery tests must assert this invariant.
- `game_actions` is the canonical ordered action/event history. Its protocol version selects the action/event parser, while revision and action ID uniqueness provide ordering and idempotency.

`get_game_snapshot` composes these sources into a provider-neutral `GameSnapshot`. Clients must not embed membership or session metadata inside candidate gameplay JSON. Action submission may carry a separate reducer-produced transition proposal for next status, active team, and winner. The RPC derives the caller, current metadata, and committed revision from locked relational rows; validates the proposed lifecycle transition structurally; and writes the canonical session columns itself. Under the accepted honest-client model, it does not independently recompute whether the proposed board and lifecycle outcome are semantically correct.

## Ordered Work Packets

### Phase 1 - Establish a safe game-engine boundary

#### 1. Restore and record the baseline

Scope:

- install root workspace dependencies
- run the common tests, UI tests, and root build
- record any pre-existing failures in this document under Implementation Notes
- make no product or architecture changes

Acceptance criteria:

- the exact baseline commands and results are documented
- later packets have a known build/test comparison point

#### 1A. Capture legacy behavior with characterization fixtures

Scope:

- add representative input/output fixtures for all nine current action types without changing production behavior
- cover successful actions, important rejection paths, movement-before-action variants, object consumption, automatic turn completion, income, and victory
- isolate clocks, generated event IDs, database reads, and current combat randomness so assertions can focus on observable gameplay behavior
- add focused UI interaction tests proving that `gameInteractionReducer` and the action builders produce the expected `GameAction` for each action family
- record known defects or ambiguous behavior as explicit compatibility decisions rather than silently encoding them as desired behavior

Acceptance criteria:

- every supported action has at least one legacy success fixture and one rejection fixture
- UI coverage includes select, target, confirm, cancel, and reset-after-server-event flows
- characterization tests run without a live DynamoDB instance
- no production behavior changes in this packet
- later Phase 1 packets can name the exact fixtures used for parity

#### 2. Add versioned game-state types

Scope:

- replace `any` in `common` map and loaded-unit domain fields with explicit terrain, unit, and team unions
- add `GameState`, `PersistedGamePayload`, `PlayerSeat`, `GameSnapshot`, `ActionEnvelope`, `AppliedAction`, `DomainEvent`, and reducer result types to `common`
- add schema and protocol version constants
- add runtime parsers/validators for versioned snapshots and action envelopes
- keep player identity, database keys, clocks, and persistence metadata out of reducer state and domain events
- export the new contracts from `common/src/index.ts`
- add small typed fixture builders for tests

Acceptance criteria:

- `common` builds without changing current runtime behavior
- fixtures can construct a waiting and an active two-player game
- invalid terrain, unit, team, schema version, snapshot, and action-envelope values are rejected at runtime
- no new engine or event contract contains DynamoDB, Supabase, email/PIN, or wall-clock fields

#### 3. Make combat damage deterministic

Scope:

- remove `Math.random()` from damage calculation
- define the deterministic formula in code and `docs/game-domain.md`
- replace tests that mock `Math.random()` with fixed input/output cases

Acceptance criteria:

- identical combat inputs always produce identical damage
- existing combat modifiers and health effects remain covered

#### 4. Create the pure reducer shell

Scope:

- add `applyGameAction(state, actorTeam, action)` in `common`
- implement shared preconditions: game status, active team, supported action, and typed rejection
- implement only the manual `end` action in this packet
- make any reused map/rule helper pure or protect the reducer input with an explicit deep clone at the boundary; never rely on shallow cloning nested rows or units
- do not connect the reducer to the server yet

Acceptance criteria:

- input state is not mutated
- an allowed manual end returns a new state and end-turn event
- wrong-team and finished-game calls return typed errors

#### 5. Port ordinary movement

Scope:

- port the ordinary `move` path from `processGameAction`
- include reachability, ownership, occupancy, moved flags, and ordinary money-object collection
- exclude missile and nuke effects until the next packet

Acceptance criteria:

- legal and illegal movement cases are reducer-tested
- money collection updates both state and event output
- reducer inputs remain immutable
- reducer output matches the applicable packet 1A fixtures except for documented intentional changes

#### 6. Port projectile object movement

Scope:

- port missile and nuke targeting, splash damage, priest prevention, deaths, and event fields
- keep this behavior within the `move` action branch

Acceptance criteria:

- missile, nuke, splash, priest, friendly-target, and missing-target cases are tested
- no clock, database, or network dependency enters `common`
- reducer output matches the applicable packet 1A fixtures except for documented intentional changes

#### 7. Port attacks

Scope:

- port attack movement, range checks, deterministic defender damage, counterattack, deaths, and attack events
- use the deterministic damage function from packet 3

Acceptance criteria:

- attack from the current cell and after movement are tested
- dead defenders do not counterattack
- event damage and death data match the resulting board
- non-random behavior matches the applicable packet 1A fixtures, and deterministic damage differences are documented explicitly

#### 8. Port boost and heal actions

Scope:

- port `boost` and `heal`
- include movement-before-action, target validation, moved flags, healing caps, and consumed money objects

Acceptance criteria:

- each action has legal, illegal-target, insufficient-capability, and movement cases
- events match the resulting board
- reducer output matches the applicable packet 1A fixtures except for documented intentional changes

#### 9. Port construction and spawning

Scope:

- port `construct` and `spawn`
- include allowed options, terrain/cell restrictions, available money, costs, and moved flags

Acceptance criteria:

- legal construction and spawning deduct the correct money
- invalid building/unit, cell, and funds cases are tested
- reducer output matches the applicable packet 1A fixtures except for documented intentional changes

#### 10. Port load and unload actions

Scope:

- port `load` and `unload`
- include vehicle compatibility, cell adjacency/range, cargo state, movement flags, and consumed objects

Acceptance criteria:

- legal load/unload round trips preserve the transported unit fields
- occupied, invalid vehicle, invalid unit, and invalid destination cases are tested
- reducer output matches the applicable packet 1A fixtures except for documented intentional changes

#### 11. Add automatic turn and victory resolution

Scope:

- run victory detection after successful actions
- run automatic turn completion when appropriate
- reset per-turn unit state
- calculate next-player income and money
- generate end-turn and game-over events

Acceptance criteria:

- elimination and capital victory are tested
- manual and automatic turn completion produce the same turn-transition rules
- finished games have no active team and reject later actions
- turn, income, and victory output matches the applicable packet 1A fixtures except for documented intentional changes

#### 12. Add reducer replay and immutability coverage

Scope:

- add a representative multi-action game replay fixture
- assert replaying the same ordered actions produces the same final state
- add deep-freeze or equivalent mutation-detection tests
- run the complete packet 1A characterization suite against the reducer and document every intentional difference

Acceptance criteria:

- all action types appear in reducer tests
- repeated test runs produce identical serialized output
- no reducer branch mutates its input
- all legacy characterization fixtures either pass or have an approved, documented behavior change

#### 13. Make the existing server call the reducer

Scope:

- adapt `processGameAction` to load DynamoDB data, translate it to `GameState`, call `applyGameAction`, and translate the result back
- translate provider-neutral `DomainEvent` output into legacy DynamoDB `GameEvent` records at the adapter boundary, adding IDs, timestamps, keys, and player identity there
- add round-trip tests for legacy game-state and event adapters
- preserve the current Socket.IO and DynamoDB external behavior
- remove duplicated rule branches only after parity tests pass

Acceptance criteria:

- the existing UI can play through the current backend
- server code is orchestration rather than a second implementation of rules
- root build and existing tests pass

### Phase 1 exit gate

Phase 1 is complete only when all of the following are true:

1. Every supported action is covered by reducer success, rejection, immutability, and legacy-characterization tests.
2. Representative multi-action replay is deterministic and produces stable serialized output.
3. Provider-neutral reducer state and events contain no persistence, transport, clock, email/PIN, or vendor-specific fields.
4. Runtime validation rejects unsupported or malformed state and action versions.
5. The existing Socket.IO/DynamoDB UI can complete a representative two-player game through the reducer-backed server.
6. The old rule branches have been removed from server orchestration only after adapter parity passes.

Do not add Supabase dependencies or implementation code before this gate passes.

### Phase 2 - Define and prove the provider boundary

#### 14. Add the gateway contract

Scope:

- create `GameSessionGateway` and its request/result types under `ui/src/multiplayer`
- keep the contract free of Supabase types
- add a provider factory or React context injection point

Acceptance criteria:

- the gateway contract covers create, join, snapshot, action history, subscription, submission, presence, and leave
- no current UI behavior changes yet

#### 15. Implement an in-memory gateway

Scope:

- implement the gateway with in-memory maps and listeners
- use the real common reducer for action application
- support two player seats, spectators, revisions, duplicate action IDs, and reconnect-by-user-ID

Acceptance criteria:

- gateway contract tests cover create, player join, spectator join, submit, duplicate submit, stale revision, and snapshot recovery
- no Supabase dependency is required for these tests

### Phase 2 exit gate

Phase 2 is complete only when:

1. The gateway API and all request/result/error contracts are provider-neutral.
2. The in-memory implementation passes create, join, seat, spectator, revision, idempotency, reconnect, subscription-cleanup, and snapshot-recovery tests.
3. The in-memory implementation uses the production `common` reducer rather than a test-only rule implementation.
4. No React component needs to know whether the selected gateway is in-memory, Supabase, or another future provider.

Supabase scaffolding in Phase 3 is blocked until both the Phase 1 and Phase 2 exit gates pass.

### Phase 3 - Build the Supabase persistence layer

#### 16. Add local Supabase project scaffolding

Scope:

- add Supabase CLI configuration and an initial empty migration
- add documented local start, stop, reset, and migration commands
- add environment-variable templates for URL and publishable key
- do not create hosted resources in this packet

Acceptance criteria:

- a developer can start local Supabase and apply migrations from a clean checkout
- no secret or service-role key is committed

#### 17. Create the game tables and constraints

Scope:

- create the four initial tables described above
- add foreign keys, checks, unique constraints, and indexes
- encode the canonical field-ownership rules above and avoid putting membership or session-lifecycle fields in gameplay JSON
- add an `updated_at` helper if needed
- add SQL tests or repeatable verification queries

Acceptance criteria:

- invalid roles, duplicate seats, duplicate revisions, and duplicate action IDs are rejected by Postgres
- invalid or unsupported schema and protocol versions are rejected at RPC boundaries
- verification proves that committed session and state revisions cannot be observed out of sync
- resetting local Supabase recreates the schema

#### 18. Add anonymous Auth bootstrap

Scope:

- create the Supabase browser client inside the Supabase adapter module
- sign in anonymously when no session exists
- expose provider-neutral identity readiness and user ID to the gateway implementation
- add UI handling for loading and Auth failure

Acceptance criteria:

- reloading the same browser preserves the anonymous user ID
- React components outside the multiplayer integration do not import Supabase

#### 19. Implement the `create_game` RPC

Scope:

- create the session, creator membership, initial state, orange seat, and invite token atomically
- store a hash of a long random invite token
- return the raw token only to the creator
- validate the initial gameplay payload against a supported requested schema version and serialized-size bounds
- derive waiting status, revision, seat, and other session metadata in the RPC rather than accepting them from gameplay JSON

Acceptance criteria:

- partial games are not left behind on failure
- the creator is orange and the game begins in `waiting`
- the raw token is not stored in a readable table column

#### 20. Implement the `join_game` RPC

Scope:

- resolve a supplied invite token
- return an existing membership on reconnect
- claim purple atomically when requested and available
- otherwise create a spectator membership
- transition the game to `active` and set purple as the first turn when purple joins

Acceptance criteria:

- concurrent join attempts cannot create two purple players
- a third user becomes a spectator
- the same anonymous user receives the same membership after reload

#### 21. Add membership-based read RLS

Scope:

- enable RLS on all game tables
- allow members to read their session, snapshot, and action history
- deny direct client inserts, updates, and deletes
- grant only the RPC access required by anonymous authenticated users

Acceptance criteria:

- a nonmember cannot read a game by UUID
- a player and spectator can read the same joined game
- direct state and action writes fail from the browser role

#### 22. Implement snapshot and action-history RPCs

Scope:

- add `get_game_snapshot(game_id)`
- add `get_game_actions(game_id, after_revision, limit)`
- require membership and compose session metadata, member seats, spectator count, and gameplay payload into provider-neutral data shapes
- impose a bounded action-history page size

Acceptance criteria:

- reconnect can fetch a complete current snapshot
- a client can request only actions after its local revision
- spectators receive the same canonical history as players
- malformed or unsupported stored gameplay payloads return a typed compatibility error rather than unvalidated state

#### 23. Implement atomic action submission

Scope:

- add `submit_game_action`
- lock the game session row
- derive the caller from `auth.uid()` and membership, never from request data
- enforce player role, active team, expected revision, and finished status
- accept the candidate gameplay payload, domain events, and a separately typed reducer transition proposal; reject membership or session metadata embedded in gameplay JSON
- assign the committed revision from the locked row and validate allowed status, active-team, and winner transitions before writing canonical session columns
- make action IDs idempotent
- insert action and update snapshot/session in one transaction

Acceptance criteria:

- spectators and out-of-turn players are rejected
- simultaneous submissions from the same revision yield one accepted revision
- retrying an accepted action ID returns its existing result
- state, session, and action log cannot have different committed revisions
- the client cannot alter player seats, roles, revision, active team, status, or winner through candidate gameplay JSON, and malformed lifecycle transitions are rejected

### Phase 4 - Add Supabase Realtime and reconciliation

#### 24. Add lightweight revision broadcasts

Scope:

- broadcast after a committed `game_actions` insert
- send only game ID, revision, and action ID
- authorize private Realtime topics through game membership
- do not send the entire board through Broadcast

Acceptance criteria:

- players and spectators receive one small notice per committed action
- nonmembers cannot subscribe to the private game topic
- failed transactions produce no notice

#### 25. Implement the Supabase gateway read/join methods

Scope:

- implement Auth readiness, `createGame`, `joinGame`, `getSnapshot`, and `getActions`
- map database/RPC data into provider-neutral contracts
- run all RPC JSON through the runtime parsers before exposing it to application code
- normalize Supabase errors into gateway errors

Acceptance criteria:

- the shared gateway contract tests pass against local Supabase for these methods
- callers do not receive raw Supabase response objects

#### 26. Implement Supabase submit and subscribe methods

Scope:

- implement `submitAction`, `subscribe`, and `leave`
- await RPC acceptance before exposing state as canonical
- clean up channels on leave and component unmount

Acceptance criteria:

- two gateway instances receive ordered revision notices
- rejected submissions return typed gateway errors
- repeated mount/unmount does not leak channels

#### 27. Add revision reconciliation

Scope:

- apply the next action locally only when its revision is exactly local revision plus one
- ignore already-applied revisions
- fetch missing actions for a revision gap
- fall back to the snapshot if action replay fails or the gap is too large
- fetch snapshot before subscribing on initial load/reconnect

Acceptance criteria:

- dropped, duplicate, delayed, and out-of-order notice tests converge on the database snapshot
- a tab returning after several turns catches up without a page reload

### Phase 5 - Move React to the new session model

#### 28. Add `GameSessionProvider` using the in-memory gateway

Scope:

- create the new provider and hooks
- expose session role, current snapshot, connection state, submit state, and errors
- initially wire it only into a test route or component harness

Acceptance criteria:

- provider tests cover loading, joined player, spectator, action acceptance, and gateway error states
- existing production routes still use the old provider

#### 29. Build the new home create/join flow

Scope:

- replace the home content with display-name input, map selection, and Create Game
- create the share URL after gateway success
- support opening `/game/:inviteToken`
- ask a new visitor to join as player or spectator when a player seat is available

Acceptance criteria:

- create produces a copyable link
- opening the link can claim purple or choose spectator
- occupied games offer spectator mode only

#### 30. Replace initial game loading

Scope:

- make `/game/:inviteToken` join through `GameSessionProvider`
- replace `useGame` REST loading with a gateway snapshot
- render waiting, active, finished, invalid-invite, and reconnect states
- keep move submission on the old socket temporarily if necessary

Acceptance criteria:

- initial and reloaded game views render entirely from the durable Supabase snapshot
- no `/game/:id` REST fetch remains on the new route

#### 31. Replace move submission and live updates

Scope:

- build `ActionEnvelope` in the client
- calculate the candidate state with the common reducer
- submit through the gateway
- render only RPC-accepted/reconciled canonical state
- remove the ordinary-move optimistic mutation in `GameMap`
- keep `GameMap`/`gameInteraction` responsible for interaction intent and target presentation only; do not recreate authoritative transition rules outside `common`
- replace migrated-route copies of `GameAction`, game-state, and event types with imports from the provider-neutral `common` contracts

Acceptance criteria:

- all nine actions work through Supabase in a two-browser test
- focused interaction tests prove that all nine UI action flows build the expected envelope and recover cleanly from cancellation and rejection
- stale and rejected actions show recoverable errors
- the Socket.IO provider is no longer used by the game route
- migrated UI code has no duplicate persistence-shaped game action or event contract

#### 32. Replace event-history loading

Scope:

- populate the events panel from snapshot/action history and live applied actions
- remove its REST fetch
- deduplicate by action ID and revision
- bound the displayed history

Acceptance criteria:

- reconnect displays recent prior events followed by new live events in order
- no `/game/:id/events` call remains in the UI

#### 33. Add spectator interaction restrictions

Scope:

- make the board inspectable but not actionable for spectators
- hide End Turn and action menus
- display an explicit Watching label
- handle a spectator RPC rejection defensively even though controls are hidden

Acceptance criteria:

- spectator component tests expose no move controls
- direct spectator submission is still rejected by the database
- spectators receive the same state and events as players

#### 34. Add Presence for connection indicators

Scope:

- implement gateway `updatePresence`
- track display name, persistent role, and online timestamp
- display player connection status and spectator count
- do not put board or turn state in Presence

Acceptance criteria:

- join, leave, and reconnect update the viewer count
- Presence loss does not alter durable seats or game state

### Phase 6 - Move maps and navigation off the old backend

#### 35. Add a versioned local map repository

Scope:

- define `MapRepository`
- implement local-storage list, get, save, update, and delete
- include map schema versioning and validation
- ship at least one default map through the same read interface

Acceptance criteria:

- saved maps survive reload
- invalid or unsupported map data is rejected without damaging existing maps
- no Supabase dependency appears in the repository contract

#### 36. Add map import/export and size limits

Scope:

- export a map as versioned JSON
- import and validate versioned JSON
- enforce maximum dimensions and serialized size
- show useful validation errors

Acceptance criteria:

- export/import round trips without data loss
- oversized and malformed maps are rejected

#### 37. Connect the editor and game creator to local maps

Scope:

- replace `POST /createMap` with the local repository
- replace `/listMaps` game-creation selection with local/default maps
- copy the selected map into the validated initial gameplay payload sent to `createGame`; the gateway/RPC derives session metadata

Acceptance criteria:

- a custom map can create a game
- player 2 and spectators receive the copied map without having it locally
- no map REST request remains

#### 38. Simplify routes and navigation

Scope:

- keep `/`, `/maps`, map create/edit routes, and `/game/:inviteToken`
- remove navigation to signup, profile, open lobby, and old create-game routes
- retain temporary redirects where useful

Acceptance criteria:

- every visible navigation item belongs to the new product flow
- bookmarked obsolete routes fail gracefully or redirect intentionally

### Phase 7 - Resilience, Free-tier protection, and cutover

#### 39. Add distributed browser tests

Scope:

- test creator, challenger, and spectator in separate browser contexts
- cover share-link join, all action families, spectator updates, and completed games
- use local Supabase and deterministic fixtures

Acceptance criteria:

- one automated journey proves the complete three-client happy path
- failures preserve screenshots/logs sufficient for diagnosis

#### 40. Add reconnect and race tests

Scope:

- close and reopen one player
- close both players and later restore from the database
- drop or delay Realtime notices
- submit from two stale tabs at the same revision
- retry the same action ID

Acceptance criteria:

- every client converges to the database revision
- only one conflicting action is committed
- no scenario requires deleting local storage or manually reloading the page

#### 41. Add Free-tier usage safeguards

Scope:

- ensure one Realtime channel per active game tab
- add bounded event-history queries and UI lists
- cap map/state sizes
- add a configurable spectator limit
- document database, Auth-user, connection, and message monitoring

Acceptance criteria:

- safeguards have tests where practical
- limits are centralized constants rather than scattered magic numbers
- the documentation notes that Free projects may pause after inactivity and have no paid-plan durability SLA

#### 42. Add retention and manual cleanup tooling

Scope:

- define retention separately for waiting, abandoned, active, and finished games
- add a reviewed SQL cleanup script or migration function
- include anonymous Auth-user cleanup guidance
- default to preserving resumable active games unless storage pressure requires intervention

Acceptance criteria:

- cleanup has a dry-run query or preview mode
- active games are not accidentally deleted
- operators can estimate rows/storage before deletion

#### 43. Cut the UI over to the Supabase gateway

Scope:

- make Supabase the production gateway selection
- remove remaining REST and Socket.IO calls from reachable UI code
- run the full build, unit tests, and distributed browser tests
- update architecture, setup, testing, and game-domain documentation

Acceptance criteria:

- the browser game runs without the Express server or DynamoDB
- no reachable UI code references `localhost:8420`
- the complete new-user-to-finished-game flow passes

#### 44. Remove obsolete UI and server code

Scope:

- remove signup, profile, lobby, old game-fetch hooks, and old socket provider
- remove Express, Socket.IO, DynamoDB controllers/data code, dependencies, and scripts
- remove the `server` workspace only after no transitional imports remain
- preserve relevant historical documentation through explicit updates rather than silent deletion

Acceptance criteria:

- root install, build, and tests pass with no server workspace
- `rg` finds no AWS SDK, DynamoDB, Socket.IO, old REST route, email/PIN login, or server-port runtime references
- repository documentation describes only the supported architecture

## Final Acceptance Criteria

The migration is complete when:

1. A visitor can choose a default or local custom map and create a game.
2. The creator receives a shareable invitation URL.
3. A second anonymous user can claim the challenger seat.
4. Additional users can join as read-only spectators.
5. All game actions are calculated by one deterministic reducer.
6. Postgres atomically stores each accepted revision, action, event list, and snapshot.
7. Players and spectators receive live revision notifications and reconcile missed updates.
8. Either or both players can close the browser and later recover the game from Postgres on the same anonymous identity.
9. React and game-domain code depend on `GameSessionGateway`, not Supabase APIs.
10. The game runs without Express, Socket.IO, DynamoDB, signup, profiles, or the open-game lobby.
11. Free-tier connection, message, state-size, spectator, retention, and cleanup constraints are documented and guarded.
12. Provider-neutral reducer state and domain events contain no persistence keys, clocks, email/PIN identity, or vendor-specific types.
13. Every persisted or locally loaded snapshot and action envelope is runtime-validated and version-checked before use.
14. Membership, session lifecycle, gameplay payload, and action history each have one documented canonical owner, with transactional revision invariants covered by tests.

## Deferred Work

The following work is intentionally outside this migration:

- permanent account signup and identity linking
- recovering a player seat on a different device
- user profiles and win/loss records
- cloud-saved reusable maps
- public game discovery or matchmaking
- chat or moderation
- server-authoritative semantic validation of the candidate board
- paid Supabase features, backups, or uptime guarantees
- a Playroom or other production adapter

The gateway and map-repository boundaries should make these additions possible without changing the pure game reducer.

## Implementation Notes

- At planning time, the root build could not run because workspace dependencies were not installed and `tsc` was unavailable. Packet 1 must establish the true baseline before implementation begins.
- Supabase Free-tier quotas and behavior can change. Recheck the official limits immediately before creating the hosted project, then record the checked date and values here.
