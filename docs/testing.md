# Testing

Run commands from the repository root.

## Fast suites

- `npm run common:test`: shared contracts, parsers, rules, and deterministic reducer.
- `npm run ui:test`: provider/gateway contracts, reconciliation, map repository/import/export, routes, and interactions. Live Supabase tests are skipped unless explicitly enabled.
- `npm run build`: TypeScript compilation and production bundles.

## Local Supabase

Start the local stack and configure the public values in the UI package's `.env.local` file, then run:

```sh
npm run supabase:reset
npm run supabase:test
npm run supabase:lint
```

To run the Supabase gateway contract directly through Jest:

```sh
RUN_SUPABASE_INTEGRATION=true \
REACT_APP_SUPABASE_URL=http://127.0.0.1:54321 \
REACT_APP_SUPABASE_PUBLISHABLE_KEY=<local-publishable-key> \
CI=true npm test -w @TBS/ui -- --runTestsByPath src/multiplayer/supabase/SupabaseGameSessionGateway.test.ts
```

Never use a service-role key in browser or gateway tests.

## Distributed browser acceptance

Install the pinned browser once with `npx playwright install chromium`, keep local Supabase running, then run `npm run test:e2e`.

The one-worker suite uses isolated anonymous browser contexts and covers creator/challenger/spectator share-link play, Presence, completion, all nine action families, tab closure and durable restore, a same-member stale-tab conflict, and exact action-ID retry. Failures retain trace, video, screenshots, an HTML report, and client console/page errors under ignored `test-results/` paths.
