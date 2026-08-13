begin;

select plan(14);

-- The preview and cleanup functions intentionally operate across every game.
-- Isolate this transaction from durable local/E2E fixtures; rollback restores them.
delete from public.game_sessions;

insert into auth.users (id, aud, role)
values
  ('00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated');

insert into public.game_sessions (
  id, invite_code_hash, schema_version, status, revision, active_team, winner_team,
  win_condition, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000101', 'cleanup-waiting', 1, 'waiting', 0, null, null, 'combat-elimination', now() - interval '8 days', now() - interval '8 days'),
  ('10000000-0000-0000-0000-000000000102', 'cleanup-abandoned', 1, 'active', 0, 'purple', null, 'combat-elimination', now() - interval '31 days', now() - interval '31 days'),
  ('10000000-0000-0000-0000-000000000103', 'cleanup-active', 1, 'active', 1, 'orange', null, 'combat-elimination', now() - interval '400 days', now() - interval '400 days'),
  ('10000000-0000-0000-0000-000000000104', 'cleanup-finished', 1, 'finished', 1, null, 'purple', 'combat-elimination', now() - interval '91 days', now() - interval '91 days');

insert into public.game_members (game_id, user_id, role, display_name) values
  ('10000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000101', 'orange', 'Orange'),
  ('10000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000101', 'orange', 'Orange'),
  ('10000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000102', 'purple', 'Purple'),
  ('10000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000101', 'orange', 'Orange'),
  ('10000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000102', 'purple', 'Purple'),
  ('10000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000101', 'orange', 'Orange'),
  ('10000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000102', 'purple', 'Purple');

insert into public.game_states (game_id, revision, state)
select id, revision,
  '{"map":[[{"row":0,"column":0,"index":0,"neighbors":[],"terrain":"plains","unit":"soldier","team":"orange"}]],"money":{"orange":2000,"purple":2000}}'::jsonb
from public.game_sessions where invite_code_hash like 'cleanup-%';

insert into public.game_actions (
  game_id, revision, protocol_version, action_id, actor_user_id, actor_team, action, events
) values
  ('10000000-0000-0000-0000-000000000103', 1, 1, '20000000-0000-4000-8000-000000000103', '00000000-0000-0000-0000-000000000102', 'purple', '{"action":"end"}', '[]'),
  ('10000000-0000-0000-0000-000000000104', 1, 1, '20000000-0000-4000-8000-000000000104', '00000000-0000-0000-0000-000000000102', 'purple', '{"action":"end"}', '[]');

create temporary table cleanup_preview on commit drop as
select * from private.preview_game_cleanup(now());

select is((select count(*)::integer from cleanup_preview), 4, 'preview classifies every game');
select is((select category from cleanup_preview where game_id = '10000000-0000-0000-0000-000000000101'), 'waiting', 'waiting retention is separate');
select is((select category from cleanup_preview where game_id = '10000000-0000-0000-0000-000000000102'), 'abandoned', 'never-started active retention is separate');
select is((select category from cleanup_preview where game_id = '10000000-0000-0000-0000-000000000103'), 'active', 'resumable active retention is separate');
select is((select category from cleanup_preview where game_id = '10000000-0000-0000-0000-000000000104'), 'finished', 'finished retention is separate');
select is((select eligible from cleanup_preview where category = 'active'), false, 'resumable active games are preserved by default');
select is((select count(*)::integer from cleanup_preview where eligible), 3, 'only waiting, abandoned, and finished fixtures are eligible');
select ok((select bool_and(estimated_bytes > 0) from cleanup_preview), 'preview estimates bytes for every game');
select is((select sum(member_rows)::integer from cleanup_preview where eligible), 5, 'preview estimates dependent membership rows');

select is((select count(*)::integer from private.cleanup_games(now(), true)), 3, 'dry-run returns all eligible games');
select is((select count(*)::integer from public.game_sessions where invite_code_hash like 'cleanup-%'), 4, 'dry-run deletes nothing');

create temporary table cleanup_deleted on commit drop as
select * from private.cleanup_games(now(), false);
select is((select count(*)::integer from cleanup_deleted where was_deleted), 3, 'execute reports each deleted game');
select is((select count(*)::integer from public.game_sessions where invite_code_hash like 'cleanup-%'), 1, 'execute preserves only the resumable active game');
select is(
  (select pg_catalog.concat(
    (select count(*) from public.game_members where game_id = '10000000-0000-0000-0000-000000000103'), ':',
    (select count(*) from public.game_actions where game_id = '10000000-0000-0000-0000-000000000103'), ':',
    (select count(*) from public.game_states where game_id = '10000000-0000-0000-0000-000000000103')
  )),
  '2:1:1',
  'the preserved active game retains all dependent rows'
);

select * from finish();
rollback;
