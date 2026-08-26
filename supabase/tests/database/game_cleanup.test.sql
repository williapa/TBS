begin;

select plan(9);

delete from public.game_sessions;
insert into auth.users(id, aud, role)
values ('00000000-0000-0000-0000-000000000031', 'authenticated', 'authenticated');

insert into public.game_sessions(
  id, invite_code_hash, revision, lifecycle_phase, active_team_id, winner_team_id,
  created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000031', 'cleanup-waiting', 0, 'waiting', null, null,
   now() - interval '8 days', now() - interval '8 days'),
  ('10000000-0000-0000-0000-000000000032', 'cleanup-abandoned', 0, 'active', 'purple', null,
   now() - interval '31 days', now() - interval '31 days'),
  ('10000000-0000-0000-0000-000000000033', 'cleanup-active', 1, 'active', 'orange', null,
   now() - interval '400 days', now() - interval '400 days'),
  ('10000000-0000-0000-0000-000000000034', 'cleanup-finished', 1, 'finished', null, 'purple',
   now() - interval '91 days', now() - interval '91 days');

insert into public.game_members(game_id, user_id, role, display_name)
select id, '00000000-0000-0000-0000-000000000031', 'orange', 'Orange'
from public.game_sessions;

insert into public.game_states(game_id, revision, state, checksum)
select
  id,
  revision,
  pg_catalog.jsonb_build_object(
    'schemaVersion', 2,
    'rulesetVersion', 'standard@1',
    'contentVersion', 'standard@1',
    'revision', revision,
    'lifecycle', case lifecycle_phase
      when 'waiting' then '{"phase":"waiting"}'::jsonb
      when 'active' then pg_catalog.jsonb_build_object(
        'phase', 'active', 'activeTeamId', active_team_id
      )
      else pg_catalog.jsonb_build_object(
        'phase', 'finished', 'winnerTeamId', winner_team_id
      )
    end,
    'board', '{"cells":{}}'::jsonb,
    'entities', '{}'::jsonb,
    'teams', '{"orange":{"id":"orange","money":0},"purple":{"id":"purple","money":0}}'::jsonb,
    'objectives', '[]'::jsonb,
    'turn', pg_catalog.jsonb_build_object('number', revision)
  ),
  'pending'
from public.game_sessions;

insert into public.game_actions(
  game_id, revision, protocol_version, ruleset_version, content_version,
  action_id, actor_user_id, actor_team_id, action, events, result_state_checksum
) values (
  '10000000-0000-0000-0000-000000000033', 1, 2, 'standard@1', 'standard@1',
  '33000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000031', 'orange',
  '{"type":"end-turn"}', '[]', 'fixture'
);

create temporary table cleanup_preview on commit drop as
select * from private.preview_game_cleanup(now());

select is((select count(*)::integer from cleanup_preview), 4, 'preview classifies every game');
select is((select category from cleanup_preview where game_id = '10000000-0000-0000-0000-000000000031'), 'waiting', 'waiting retention is separate');
select is((select category from cleanup_preview where game_id = '10000000-0000-0000-0000-000000000032'), 'abandoned', 'never-acted active retention is separate');
select is((select category from cleanup_preview where game_id = '10000000-0000-0000-0000-000000000033'), 'active', 'acted active games are resumable');
select is((select category from cleanup_preview where game_id = '10000000-0000-0000-0000-000000000034'), 'finished', 'finished retention is separate');
select is((select count(*)::integer from cleanup_preview where eligible), 3, 'waiting, abandoned, and finished games expire');
select is((select count(*)::integer from private.cleanup_games(now(), true)), 3, 'dry run reports eligible games');
select is((select count(*)::integer from public.game_sessions), 4, 'dry run deletes nothing');
select is((select count(*)::integer from private.cleanup_games(now(), false) where was_deleted), 3, 'execute deletes only eligible games');

select * from finish();
rollback;
