# TBS

TBS (“Medal Versus”) is a browser-based turn-based strategy game with durable two-player sessions and read-only spectators.

The supported stack is React, a deterministic TypeScript game engine in `@TBS/common`, and Supabase for anonymous Auth, Postgres persistence/RPCs, Realtime Broadcast, and Presence. The browser runs without Express, Socket.IO, DynamoDB, or server-side map storage.

## Local development

Prerequisites: Node.js/npm, Docker Desktop (or a Docker-compatible runtime), and Chromium installed by Playwright when running browser tests.

1. Run `npm install` from the repository root.
2. Run `npm run supabase:start`.
3. Run `npm run supabase:status` and copy the API URL and publishable key into an `.env` file in the UI package.
4. Run `npm run dev:ui` and open `http://localhost:3000`.

The publishable key is safe for browser configuration. Never place the service-role key in `.env`, source, test fixtures, or client builds. Full migration, reset, monitoring, and cleanup guidance is in [docs/supabase-local-development.md](./docs/supabase-local-development.md).

## Product flow

- Create or import local maps under `/maps`.
- Choose a bundled/local map and a display name at `/`.
- Share the generated `/game/:inviteToken` URL.
- A second anonymous browser claims purple; later visitors may watch as spectators.
- Reopening the invite restores durable membership and canonical database state.

## Commands

- `npm run build` builds the workspaces.
- `npm run common:test` runs deterministic engine/contracts tests.
- `npm run ui:test` runs UI and gateway unit/contract tests.
- `npm run supabase:reset` rebuilds only the local Supabase database from migrations.
- `npm run supabase:test` runs pgTAP database/RLS/RPC tests.
- `npm run supabase:lint` lints the local schema.
- `npm run test:e2e` runs the three-context Chromium journeys against local Supabase.
- `npm run ui:boundary` proves the production UI import graph contains no legacy REST, Socket.IO, DynamoDB, or port-8420 runtime.

See [docs/architecture.md](./docs/architecture.md), [docs/game-domain.md](./docs/game-domain.md), and [docs/testing.md](./docs/testing.md) for the supported design.
