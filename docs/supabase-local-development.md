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
- `pnpm edge:build` creates the ignored, deployable trusted-action runtime bundle directly from the current shared TypeScript sources, independent of potentially stale package `dist` output.
- `pnpm edge:serve` rebuilds that bundle and serves local Edge Functions until stopped.

## Create a migration

Run `pnpm supabase:migration:new descriptive_name`, edit the generated SQL file, and verify the complete history with `pnpm supabase:reset`, `pnpm supabase:test`, and `pnpm supabase:lint`. Commit `supabase/config.toml`, migrations, tests, and the seed file with the code that depends on them.

The reset, test, and lint commands above affect only the local project. Do not make schema changes directly in a hosted project's SQL or Table Editor. Remote schema changes must be represented by forward-only migration files so that Git history and Supabase's migration history remain aligned.

The generated bundle under `supabase/functions/submit-action/generated/` is deliberately not committed. Production builds and deployments must run `pnpm edge:build` first. The function accepts only `{ gameId, envelope }`; service/secret keys remain in the Edge environment and must never be exposed to the browser.

## Deploy hosted Supabase changes

Deploy from a reviewed release commit and coordinate so only one person pushes migrations to an environment at a time. Use the project-local CLI through `pnpm exec supabase`; this ensures the repository's pinned CLI version is used.

### Decide what must be deployed

| Changed area | Hosted action |
| --- | --- |
| `supabase/migrations/` | Preview and run `db push`. |
| `supabase/functions/submit-action/` | Rebuild and deploy `submit-action`. |
| Trusted runtime sources under `packages/game-core`, `packages/game-rules`, `packages/protocol`, or `packages/application/src/commands` | Rebuild and deploy `submit-action`, even if its checked-in function source did not change. |
| `[functions.submit-action]` in `supabase/config.toml` | Deploy `submit-action` so its function configuration is applied. |
| Edge Function secrets | Update them with `secrets set`; a function redeploy is not required. |
| Other hosted Auth, API, Realtime, Storage, or project configuration | Apply the corresponding reviewed hosted configuration change; see the configuration warning below. |

A change can require more than one row. For example, a ruleset or protocol change that adds persisted state or events normally requires both a migration and an Edge Function deployment. Deploy the compatible database migration first, the Edge Function second, and the web application last.

### Authenticate and link the target project

Authentication and linking are normally one-time setup on each deployment machine:

```sh
pnpm exec supabase login
pnpm exec supabase link --project-ref <production-project-ref>
```

Get the project reference from the hosted project's dashboard URL or project settings. Linking may prompt for the database password. Never put the access token, database password, secret key, or service-role key in a command committed to Git. Before every deployment, confirm that the linked project is the intended environment:

```sh
pnpm exec supabase projects list
pnpm exec supabase migration list
```

The migration list should have a coherent local/remote history. Stop if the remote contains unexpected versions or if previously applied migration files differ from the release commit.

### Validate the release locally

From the repository root, run:

```sh
pnpm check
pnpm supabase:reset
pnpm supabase:test
pnpm supabase:lint
pnpm edge:build
```

`supabase:reset` destroys only the local Supabase database. It verifies that the full migration history can build a clean database. Do not substitute `supabase db reset --linked`; that command destroys the linked remote database and must never be used for production.

### Deploy migrations

Preview the pending migration set, review every listed file, and then apply it:

```sh
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
pnpm exec supabase migration list
```

The final migration list must show the deployed versions on both the local and remote sides. Do not pass `--include-seed` in production; `supabase/seed.sql` is local test data. If migration history is out of sync, investigate the remote schema and release history before using `migration repair`. Repair changes migration bookkeeping only and is not a normal deployment or rollback tool.

### Deploy the trusted Edge Function

Always build immediately before deploying because `supabase/functions/submit-action/generated/` is ignored and may be absent or stale:

```sh
pnpm edge:build
pnpm exec supabase functions deploy submit-action
```

The deploy uses `[functions.submit-action]` from `supabase/config.toml`, including JWT verification. Hosted Supabase supplies the platform URL and API keys used by this function; do not upload those values manually or expose the secret/service-role value to the browser. If future function code introduces a custom secret, set it separately from an ignored environment file and verify its name in the dashboard:

```sh
pnpm exec supabase secrets set --env-file <production-secrets-file>
pnpm exec supabase secrets list
```

Never commit the production secrets file. Supabase makes updated secrets available without redeploying the function.

### Hosted configuration warning

The current `supabase/config.toml` also contains local ports and localhost Auth URLs. Do not run `pnpm exec supabase config push` against production without first separating or reviewing every hosted value; doing so could replace production Auth or API settings with local-development values. Function-specific settings are applied by `functions deploy`. For other hosted configuration changes, use a reviewed production-specific configuration or make the explicit change in the Supabase dashboard and record it in this document until this repository has environment-specific configuration as code.

### Verify and recover

After deployment:

1. Confirm `migration list` shows no unexpected difference.
2. Confirm the dashboard shows a new successful `submit-action` deployment when the function was deployed.
3. Exercise a bounded multiplayer smoke test against the deployed web application: create a game, join the purple seat in a second browser context, submit one action, and confirm both clients reconcile to the same revision.
4. Inspect the database and Edge Function logs for migration, authorization, or invocation errors.

Database migrations are forward-only. Never edit an applied migration or reset production to roll back. Correct a database problem with a new reviewed migration. To recover an Edge Function, rebuild and redeploy a known-good commit only when it remains compatible with the already-deployed database schema.

See Supabase's current guidance for [database migration deployment](https://supabase.com/docs/guides/deployment/database-migrations), [Edge Function deployment](https://supabase.com/docs/guides/functions/deploy), [function secrets](https://supabase.com/docs/guides/functions/secrets), and the [CLI reference](https://supabase.com/docs/reference/cli/su). Supabase CLI behavior can change, so verify these primary sources when updating this runbook.

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
