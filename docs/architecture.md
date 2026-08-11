# Architecture

## Supported runtime

TBS is a browser-first turn-based strategy game. The supported runtime has three layers:

- React renders the product routes, local map library/editor, and game board.
- `@TBS/common` owns versioned contracts, runtime parsers, and the deterministic `applyGameAction` reducer used by both adapters and RPC submissions.
- Supabase provides anonymous Auth identities, durable Postgres state/action history, transactional RPCs, row-level read policies, revision Broadcast, and Presence.

The browser does not call an Express server, Socket.IO, DynamoDB, or map REST endpoints. `SupabaseGameSessionGateway` is the production implementation of the provider-neutral `GameSessionGateway`; React components consume only the gateway/provider contracts. Supabase client/channel/row types remain inside `ui/src/multiplayer/supabase`.

## Product routes

- `/` creates a game from a bundled or local map and produces an invite URL.
- `/maps`, `/maps/new`, and `/maps/:mapId/edit` manage versioned maps in browser local storage, including JSON import/export.
- `/game/:inviteToken` joins or reconnects a player or spectator and renders waiting, active, or finished state.

Old signup, profile, lobby, create-game, and map-editor bookmarks redirect intentionally into this supported surface.

## Data and action flow

1. The root identity gate restores or creates a Supabase anonymous Auth user.
2. Creating a game sends a validated gameplay payload to `create_game`. Postgres stores session metadata, revision-zero state, orange membership, and only a hash of the returned bearer invite token.
3. `join_game` reconnects existing membership, atomically claims the one purple seat, or adds a bounded spectator membership. Purple moves first.
4. A player UI builds a protocol-versioned action envelope from canonical state. The Supabase gateway obtains canonical state, runs the deterministic common reducer in the browser, and submits the candidate through `submit_game_action`.
5. The RPC locks the game, enforces membership/team/revision/action-ID rules, and atomically commits the new session revision, state, action, and domain events. Exact action-ID retries are idempotent.
6. One private `game:<uuid>` channel per active tab carries small revision notices and Presence. Clients replay bounded action gaps and fall back to the canonical snapshot when a notice is missed, malformed, or too far ahead.

Postgres is always the durable authority. Presence never controls seats, turns, or gameplay state.

## Security boundary

Supabase enforces authentication, invite lookup, membership reads, player-seat uniqueness, active-turn ownership, revision compare-and-swap, spectator read-only behavior, action-ID uniqueness, and private Realtime authorization. The current design intentionally uses an honest-client game-rule model: the browser calculates candidate state, so a modified player client can cheat. Moving the deterministic reducer into a trusted server/Edge boundary is the future hardening path.

## Storage and operations

Map files and gameplay state are schema-versioned and capped before storage. Action/event queries and UI history are bounded. Retention preview and cleanup functions are operator-only and preserve resumable active games by default. See [Local Supabase development](./supabase-local-development.md) for setup, limits, monitoring, backups, and cleanup procedures, and [Testing](./testing.md) for the acceptance matrix.
