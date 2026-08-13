# Local Supabase development

Supabase runs locally in Docker and does not require a hosted project for development. Install the repository dependencies from the project root before using these commands; the Supabase CLI version is pinned in `devDependencies`.

## Start and configure

1. Start Docker Desktop or another Docker-compatible runtime.
2. Run `pnpm install` at the repository root.
3. Run `pnpm supabase:start`. The first start downloads the local service images and applies every file in `supabase/migrations`.
4. Run `pnpm supabase:status` and copy the API URL and publishable key into a local `.env` file in the UI package.
5. In a second terminal, run `pnpm edge:serve`. This builds the shared trusted-action runtime and serves the authenticated `submit-action` function with JWT verification enabled.

The browser may use the publishable key. Never copy or commit the service-role key printed by the local stack. Environment files are ignored; only example templates are tracked.

## Daily commands

- `pnpm supabase:start` starts the local stack and applies pending migrations.
- `pnpm supabase:stop` stops it while preserving local Docker data.
- `pnpm supabase:status` prints local endpoints and development credentials.
- `pnpm supabase:reset` recreates the local database, reapplies all migrations in filename order, and then runs `supabase/seed.sql`. This destroys local Supabase database data only.
- `pnpm supabase:test` runs the committed pgTAP database tests.
- `pnpm supabase:lint` checks the local schema for SQL errors and warnings.
- `pnpm edge:build` creates the ignored, deployable trusted-action runtime bundle from the shared application and rules packages.
- `pnpm edge:serve` rebuilds that bundle and serves local Edge Functions until stopped.

## Create a migration

Run `pnpm supabase:migration:new descriptive_name`, edit the generated SQL file, and verify the complete history with `pnpm supabase:reset`, `pnpm supabase:test`, and `pnpm supabase:lint`. Commit `supabase/config.toml`, migrations, tests, and the seed file with the code that depends on them.

These commands affect only the local project. Linking to or deploying a hosted Supabase project is intentionally outside this setup.

The generated bundle under `supabase/functions/submit-action/generated/` is deliberately not committed. Production builds and deployments must run `pnpm edge:build` first. The function accepts only `{ gameId, envelope }`; service/secret keys remain in the Edge environment and must never be exposed to the browser.

## Free-tier safeguards and monitoring

Runtime limits are intentionally conservative and centralized:

- each active game tab owns one private `game:<uuid>` Realtime channel shared by revision Broadcast and Presence; replacing or leaving a game removes the prior channel
- action recovery requests and the rendered event history are capped at 100 entries, with replay gaps above 100 falling back to a canonical snapshot
- gameplay JSON is capped at 1 MiB at every durable state write; maps are capped at 49 rows and 49 cells per row in both browser validation and Postgres
- durable spectator membership defaults to 20 per game; operators may change the singleton `private.runtime_limits.max_spectators_per_game` value through a reviewed migration or privileged SQL session

For a hosted Free project, review the organization Usage page at least weekly and before a public launch. Monitor database size, Auth Monthly Active Users, Realtime message count, and Realtime peak connections. The current published Free quotas are 500 MB of database data, 50,000 MAU, 2 million Realtime messages per billing cycle, and 200 peak Realtime connections; verify them against the [current billing table](https://supabase.com/docs/guides/platform/billing-on-supabase) rather than treating these numbers as permanent. Use the project’s [Realtime reports](https://supabase.com/docs/guides/realtime/reports) to inspect connected clients, Broadcast events, Presence events, errors, and lag. Alert before 70%, investigate at 80%, and freeze public growth or clean up retained data before 90% of any applicable quota.

Free projects with low activity may be [paused after a seven-day activity window](https://supabase.com/docs/guides/platform/free-project-pausing). Resume is an operator action, so the client must present normal network/retry UI during a pause. Free projects should not be treated as carrying a paid-plan availability or durability commitment: downloadable backups are unavailable on Free, and Supabase recommends regular off-site logical exports for Free projects in its [backup guidance](https://supabase.com/docs/guides/platform/backups). For data whose loss would be unacceptable, schedule `supabase db dump`/`pg_dump` exports to separate storage or move to a plan and backup posture with the required SLA, RPO, and recovery testing.

## Retention and manual cleanup

The singleton `private.game_retention_policy` row defines four categories independently:

- `waiting`: games that never acquired the purple seat; eligible after 7 days
- `abandoned`: active games with no committed actions; eligible after 30 days
- `active`: active games with committed history and therefore resumable progress; `active_after` is `NULL`, so these are preserved indefinitely by default
- `finished`: completed games; eligible after 90 days

Change these values only through a reviewed migration or privileged SQL session. In particular, setting `active_after` opts resumable games into deletion and should be reserved for explicit storage-pressure incidents with a verified backup.

Preview every cleanup first. This query estimates game/member/action/state row counts and approximate tuple bytes without deleting anything:

```sql
select category,
       count(*) as games,
       sum(member_rows) as member_rows,
       sum(action_rows) as action_rows,
       sum(state_rows) as state_rows,
       sum(estimated_bytes) as estimated_bytes
from private.preview_game_cleanup(now())
where eligible
group by category
order by category;
```

`select * from private.cleanup_games(now(), true);` is a second dry-run view. To execute, run `select * from private.cleanup_games(now(), false);` inside an explicit transaction, inspect the returned rows, and commit only when they match the preview. The function locks candidate sessions, skips locked or changed rows, and relies on foreign-key cascades for membership, state, action, and Realtime authorization cleanup.

Anonymous Auth users have a separate lifecycle. Never delete an anonymous user that still appears in `public.game_members`: doing so cascades the membership, can vacate a durable player seat, and does not itself remove the game. After game cleanup, preview orphaned anonymous users with a privileged query against `auth.users` (`is_anonymous = true`, older than the approved Auth retention window, and `not exists` in `public.game_members`). Record the count and oldest/newest creation timestamps, export if required, then use the supported Supabase Auth admin API or a separately reviewed SQL operation. Do not fold Auth-user deletion into `private.cleanup_games`.
