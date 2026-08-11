begin;

select plan(18);

insert into auth.users (id, aud, role)
values
  ('00000000-0000-0000-0000-000000000211', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000212', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000213', 'authenticated', 'authenticated');

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000211","role":"authenticated"}';
set local role authenticated;

create temporary table rls_created_game on commit drop as
select * from public.create_game(
  1,
  'RLS Player',
  'combat-elimination',
  '{
    "map":[[
      {"row":0,"column":0,"index":0,"neighbors":[],"terrain":"plains","unit":"soldier","team":"orange"}
    ]],
    "money":{"orange":100,"purple":100}
  }'::jsonb
);

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000212","role":"authenticated"}';
set local role authenticated;

select * from public.join_game(
  (select invite_token from rls_created_game),
  'spectator',
  'RLS Spectator'
);

reset role;

insert into public.game_actions (
  game_id, revision, protocol_version, action_id,
  actor_user_id, actor_team, action, events
)
select
  game_id, 1, 1, '20000000-0000-0000-0000-000000000211',
  '00000000-0000-0000-0000-000000000211', 'orange',
  '{"action":"end"}'::jsonb, '[]'::jsonb
from rls_created_game;

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000211","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::integer from public.game_sessions), 1, 'player reads the joined session');
select is((select count(*)::integer from public.game_states), 1, 'player reads the canonical state');
select is((select count(*)::integer from public.game_members), 2, 'player reads game membership and seats');
select is((select count(*)::integer from public.game_actions), 1, 'player reads action history');

select throws_ok(
  $$update public.game_states set state = state$$,
  '42501',
  'permission denied for table game_states',
  'player cannot directly update game state'
);

select throws_ok(
  $$insert into public.game_actions (
      game_id, revision, protocol_version, action_id,
      actor_user_id, actor_team, action, events
    ) select
      game_id, 2, 1, '20000000-0000-0000-0000-000000000212',
      '00000000-0000-0000-0000-000000000211', 'orange',
      '{"action":"end"}'::jsonb, '[]'::jsonb
    from rls_created_game$$,
  '42501',
  'permission denied for table game_actions',
  'player cannot directly insert action history'
);

select throws_ok(
  $$update public.game_sessions set status = 'finished'$$,
  '42501',
  'permission denied for table game_sessions',
  'player cannot directly update session lifecycle'
);

select throws_ok(
  $$insert into public.game_members (game_id, user_id, role, display_name)
    select game_id, '00000000-0000-0000-0000-000000000213', 'spectator', 'Injected'
    from rls_created_game$$,
  '42501',
  'permission denied for table game_members',
  'player cannot directly create membership'
);

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000212","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::integer from public.game_sessions), 1, 'spectator reads the joined session');
select is((select count(*)::integer from public.game_states), 1, 'spectator reads the same canonical state');
select is((select count(*)::integer from public.game_members), 2, 'spectator reads the same memberships');
select is((select count(*)::integer from public.game_actions), 1, 'spectator reads the same action history');

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000213","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::integer from public.game_sessions), 0, 'nonmember cannot read a session by UUID');
select is((select count(*)::integer from public.game_states), 0, 'nonmember cannot read gameplay state');
select is((select count(*)::integer from public.game_members), 0, 'nonmember cannot enumerate membership');
select is((select count(*)::integer from public.game_actions), 0, 'nonmember cannot read action history');

reset role;
set local request.jwt.claims = '{}';
set local role anon;

select throws_ok(
  $$select * from public.game_sessions$$,
  '42501',
  'permission denied for table game_sessions',
  'unauthenticated visitors have no direct table access'
);

reset role;

select is(
  (select count(*)::integer
   from pg_catalog.pg_class c
   join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in ('game_sessions', 'game_members', 'game_states', 'game_actions')
     and c.relrowsecurity),
  4,
  'RLS is enabled on all four game tables'
);

select * from finish();
rollback;
