# TBS

TBS (“Hostile Hexagons”) is a browser-based turn-based strategy game with durable two-player sessions and read-only spectators.

The supported stack is React, a normalized deterministic TypeScript core with focused rules, protocol, setup, application, presentation, renderer, and adapter packages, and Supabase for anonymous Auth, trusted Edge action evaluation, Postgres persistence/RPCs, Realtime Broadcast, and Presence. The browser runs without Express, Socket.IO, DynamoDB, or server-side map storage.

## Local development

Prerequisites: Node.js, pnpm 11.16.0, Docker Desktop (or a Docker-compatible runtime), and Chromium installed by Playwright when running browser tests.

1. Run `pnpm install` from the repository root.
2. Run `pnpm supabase:start`.
3. Run `pnpm supabase:status` and copy the API URL and publishable key into an `.env` file in the UI package.
4. Run `pnpm edge:serve` in a second terminal to build and serve the trusted action authority.
5. Run `pnpm dev:ui` and open the Vite URL printed in the terminal.

The publishable key is safe for browser configuration. Never place the service-role key in `.env`, source, test fixtures, or client builds. Full migration, reset, monitoring, and cleanup guidance is in [docs/supabase-local-development.md](./docs/supabase-local-development.md).

## Product flow

- Create a local map under `/maps/new` or edit one under `/maps/:mapId/edit`.
- Choose a bundled/local map and a display name at `/`.
- Share the generated `/game/:inviteToken` URL.
- A second anonymous browser claims purple; later visitors may watch as spectators.
- Reopening the invite restores durable membership and canonical database state.

## Commands

- `pnpm build` type-checks and builds the workspaces.
- `pnpm lint` enforces the TypeScript, React hook, and repository lint rules.
- `pnpm architecture:check` enforces the current dependency boundaries.
- `pnpm graph` opens the Nx project/dependency graph.
- `pnpm check` runs the complete cached local verification sequence.
- `pnpm portability:check` rehearses the shared provider contracts against the in-memory adapter.
- `pnpm performance:check` enforces the maximum-board and production-bundle budgets.
- `pnpm edge:build` builds the shared trusted-action runtime for Supabase Edge Functions.
- `pnpm edge:serve` builds and serves the local trusted action authority.
- `pnpm test` runs the deterministic engine, protocol, application, presentation, renderer, and adapter suites.
- `pnpm ui:test` runs UI and gateway unit/contract tests.
- `pnpm supabase:reset` rebuilds only the local Supabase database from migrations.
- `pnpm supabase:test` runs pgTAP database/RLS/RPC tests.
- `pnpm supabase:lint` lints the local schema.
- `pnpm test:e2e` runs the three-context Chromium journeys against local Supabase.

See [docs/architecture.md](./docs/architecture.md), [docs/game-domain.md](./docs/game-domain.md), and [docs/testing.md](./docs/testing.md) for the supported design. The v2 design and implementation checkpoint are retained as historical context.
