# Architecture

## Supported runtime

TBS is a browser-first turn-based strategy game. The supported runtime has these dependency layers:

- `@TBS/game-core` owns the normalized state model, branded identifiers, axial coordinates, immutable transition primitives, mechanic infrastructure, and invariants. It has no workspace dependencies.
- `@TBS/game-rules` owns the standard action/event unions, unit and terrain definitions, legality selectors, focused action handlers, ordered mechanics, and the single deterministic evaluator. It depends only on core.
- `@TBS/protocol` owns the current wire envelopes, snapshots, applied actions, memberships, notices, and validation composition. It depends only on core and accepts rules codecs at composition roots.
- `@TBS/game-setup` owns the current editor-oriented map document, map limits and validation, map-to-axial conversion, immutable editor operations, bundled presets, objectives, initial money, stable entity IDs, and normalized revision-zero state creation. It depends only on core and rules.
- `@TBS/application` owns provider-neutral identity, session, query, command, realtime, and clock ports plus the canonical observable session model and revision reconciliation.
- `@TBS/presentation` maps canonical state, transient interaction state, and ordered domain events into renderer-neutral board cells, stable entities, accessible descriptions, camera bounds, legal-target overlays, semantic `BoardIntent` values, and bounded animation cues. It is framework-free and cannot import React, Three.js, browser APIs, renderers, or providers.
- `@TBS/renderer-2d` renders that contract as an accessible SVG hex board. It owns the emoji asset strategy and 2D projection only; it emits semantic board intents and does not construct game actions or decide legality.
- `@TBS/renderer-3d` renders the same contract through React Three Fiber. It owns axial-to-world projection, an orthographic strategy camera, instanced terrain and raycast lookup, project-owned procedural model fallbacks, overlays, and movement interpolation. Three.js objects and frame time remain inside this renderer.
- `@TBS/adapter-memory` and `@TBS/adapter-supabase` implement those ports and accept current protocol/rules codecs through explicit injection. Provider clients, rows, channels, functions, and provider errors stay inside the Supabase adapter.
- React renders product routes, the local map library/editor, and the game board. It observes the application session model and emits semantic session commands through application ports.
- A non-React browser composition root creates the Supabase identity and game clients and injects them into React.

The browser does not call an Express server, Socket.IO, DynamoDB, or map REST endpoints. The Supabase adapter is the production `GameClient`; components and application code depend only on provider-neutral contracts.

## Product routes

- `/` presents the  homepage. `/game/new` previews the selected bundled or local map with the read-only 2D renderer, creates a game from that exact setup, and produces an invite URL.
- `/maps/new` and `/maps/:mapId/edit` create and edit versioned maps in browser local storage. `/maps` currently redirects to the new-map flow; import/export remains a setup/repository API rather than a shipped screen.
- `/game/:inviteToken` previews the current battlefield for a fresh invite visitor, then joins a player or spectator; saved members reconnect directly and render waiting, active, or finished state.

Old signup, profile, lobby, create-game, and map-editor bookmarks redirect intentionally into this supported surface.

## Data and action flow

1. The root identity gate restores or creates a Supabase anonymous Auth user.
2. `game-setup` validates the selected map, derives objectives, initial money, and pinned versions, and produces normalized revision-zero `GameState`. Creating a game sends that state and the validated map name to `create_game_with_metadata`. Postgres stores the map name as session metadata, the canonical snapshot, orange membership, and only a hash of the returned bearer invite token; the legacy `create_game` RPC remains available for older clients and assigns a generic map name.
3. Before a fresh visitor joins, the bearer invite token can read the current canonical battlefield, persisted map name, and creator display name through `get_game_invite_preview`. The creator name is derived from authoritative orange-seat membership. This read-only operation creates no membership and the UI renders it through the click-disabled 2D renderer. `join_game` then reconnects existing membership, atomically claims the one purple seat, or adds a bounded spectator membership. Purple moves first.
4. A renderer emits a semantic board intent and may separately report the screen-space anchor of a pointer interaction. The presentation interaction controller advances transient selection/menu state and emits a typed action draft only after the player confirms a terminal choice. Choosing an ordinary move from a selected destination is terminal; actions that still require a target expose an explicit confirmation after target selection. React renders one renderer-independent DOM action surface: it is placed next to the pointer anchor when space permits and becomes a docked tray for keyboard, touch, and narrow-screen interaction. The UI composition boundary injects action and entity IDs, creates the current action envelope from canonical state, and sends only the game ID and envelope to the authenticated `submit-action` Edge Function.
5. The function resolves the authenticated member and pinned protocol/ruleset/content versions, reads canonical state, and runs the shared deterministic evaluator. A service-only RPC then locks the game, rechecks caller membership, turn, versions, revision, and action ID, and atomically commits the resulting state, action, and ordered domain events. Exact action-ID retries are idempotent.
6. One private `game:<uuid>` channel per active tab carries small revision notices and Presence. The application session model replays bounded action gaps and falls back to the canonical snapshot when a notice is missed, malformed, or too far ahead.
7. The presentation layer derives the active renderer's `BoardViewModel` from the canonical snapshot. Both SVG and React Three Fiber renderers consume that same model and emit the same semantic intents. The UI lazily loads 3D, preserves session and interaction state across renderer changes, stores only the local renderer preference, and supplies bounded DOM keyboard controls for the WebGL view. Its animation director may present only adjacent events and always settles immediately on reconnect gaps, cancellation, renderer changes, or reduced-motion requests; animation never delays canonical reconciliation.

Both renderers show cell selection with a solid white outline and legal targets with solid action-specific colors. Each outline is backed by its own dark contrast edge so it remains visible over every terrain palette. Renderers paint complete target borders first and complete selection borders last, keeping the selected-cell border above every overlapping target border. The 2D overlays are painted above units and buildings so occupied cells cannot hide any part of an outline.

The 3D scene uses demand rendering while static and caps device-pixel ratio. Project-owned procedural asset provenance and future binary-asset requirements live with the renderer package. Enforced large-board preparation and production transfer budgets are documented in [3D renderer performance budget](./performance/3d-renderer-budget.md).

The extension seam is exercised by an opt-in Pathfinder unit and forest-concealment mechanic without modifying the pinned `standard@1` content. Provider replacement requirements and the in-memory contract rehearsal are documented in [Provider portability](./provider-portability.md). Historical design context remains in [v2 system design](./v2-system-design.md) and [v2 implementation checkpoint](./v2-implementation-checkpoint.md).

Postgres is always the durable authority. Presence never controls seats, turns, or gameplay state.

## Security boundary

Supabase enforces authentication, bearer-token invite preview and lookup, membership reads, player-seat uniqueness, active-turn ownership, pinned engine versions, revision compare-and-swap, spectator read-only behavior, action-ID uniqueness, payload limits, state checksums, and private Realtime authorization. Invite preview returns only the current canonical game state and never creates membership. Browsers cannot call the service-only commit RPC and never submit candidate state or domain events. The authenticated Edge Function is the trusted game-rule boundary; Postgres independently rechecks durable authorization and concurrency invariants before commit.

## Storage and operations

Map files and gameplay state are schema-versioned and capped before storage. The setup package rejects malformed topology and maps without a movable combat unit for each team; the local-storage repository owns only browser persistence and IDs. Action/event queries and UI history are bounded. Retention preview and cleanup functions are operator-only and preserve resumable active games by default. See [Local Supabase development](./supabase-local-development.md) for setup, limits, monitoring, backups, and cleanup procedures, and [Testing](./testing.md) for the acceptance matrix.
