begin;

select plan(18);

insert into auth.users (id, aud, role)
values
  ('00000000-0000-0000-0000-000000000221', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000222', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000223', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000224', 'authenticated', 'authenticated');

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000221","role":"authenticated"}';
set local role authenticated;

create temporary table read_created_game on commit drop as
select * from public.create_game(
  1,
  'Read Orange',
  'combat-elimination',
  '{
    "map":[[
      {"row":0,"column":0,"index":0,"neighbors":[],"terrain":"plains","unit":"soldier","team":"orange"}
    ]],
    "money":{"orange":300,"purple":400}
  }'::jsonb
);

reset role;

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000222","role":"authenticated"}';
set local role authenticated;
select * from public.join_game((select invite_token from read_created_game), 'player', 'Read Purple');

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000223","role":"authenticated"}';
set local role authenticated;
select * from public.join_game((select invite_token from read_created_game), 'spectator', 'Read Watcher');

reset role;

update public.game_sessions
set revision = 3
where id = (select game_id from read_created_game);

update public.game_states
set revision = 3
where game_id = (select game_id from read_created_game);

insert into public.game_actions (
  game_id, revision, protocol_version, action_id,
  actor_user_id, actor_team, action, events
)
select c.game_id, action_revision, 1,
  ('22000000-0000-0000-0000-00000000000' || action_revision)::uuid,
  case when action_revision % 2 = 1
    then '00000000-0000-0000-0000-000000000222'::uuid
    else '00000000-0000-0000-0000-000000000221'::uuid
  end,
  case when action_revision % 2 = 1 then 'purple' else 'orange' end,
  '{"action":"end"}'::jsonb,
  '[]'::jsonb
from read_created_game c
cross join pg_catalog.generate_series(1, 3) revisions(action_revision);

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000221","role":"authenticated"}';
set local role authenticated;

create temporary table player_snapshot on commit drop as
select * from public.get_game_snapshot((select game_id from read_created_game));

select is((select count(*)::integer from player_snapshot), 1, 'snapshot RPC returns one composed row');
select is((select status || ':' || revision || ':' || active_team from player_snapshot), 'active:3:purple', 'snapshot composes canonical lifecycle metadata');
select is((select players -> 'orange' ->> 'displayName' from player_snapshot), 'Read Orange', 'snapshot composes the orange seat');
select is((select players -> 'purple' ->> 'displayName' from player_snapshot), 'Read Purple', 'snapshot composes the purple seat');
select is((select spectator_count from player_snapshot), 1, 'snapshot composes spectator count');
select is((select gameplay_payload #>> '{money,purple}' from player_snapshot), '400', 'snapshot returns canonical gameplay payload');

create temporary table first_action_page on commit drop as
select * from public.get_game_actions((select game_id from read_created_game), 0, 2);

select is((select count(*)::integer from first_action_page), 2, 'action history respects requested page size');
select is(
  (select pg_catalog.array_agg(revision order by revision) from first_action_page),
  array[1, 2],
  'action history is ordered strictly after the supplied revision'
);

select is(
  (select pg_catalog.array_agg(revision order by revision)
   from public.get_game_actions((select game_id from read_created_game), 1, 100)),
  array[2, 3],
  'action recovery returns only missing revisions'
);

select throws_ok(
  $$select public.get_game_actions((select game_id from read_created_game), 0, 101)$$,
  '22023',
  'requested_limit must be between 1 and 100',
  'action pages cannot exceed the centralized bound'
);
select throws_ok(
  $$select public.get_game_actions((select game_id from read_created_game), 0, 0)$$,
  '22023',
  'requested_limit must be between 1 and 100',
  'empty action page limits are rejected'
);
select throws_ok(
  $$select public.get_game_actions((select game_id from read_created_game), -1, 10)$$,
  '22023',
  'after_revision must be nonnegative',
  'negative recovery revisions are rejected'
);

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000223","role":"authenticated"}';
set local role authenticated;

select is(
  (select pg_catalog.to_jsonb(s) from public.get_game_snapshot((select game_id from read_created_game)) s),
  (select pg_catalog.to_jsonb(s) from player_snapshot s),
  'spectator receives the same canonical snapshot as a player'
);
select is(
  (select count(*)::integer from public.get_game_actions((select game_id from read_created_game), 0, 100)),
  3,
  'spectator receives the same canonical action history'
);

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000224","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$select public.get_game_snapshot((select game_id from read_created_game))$$,
  '42501',
  'game membership required',
  'nonmember cannot fetch a known game snapshot'
);
select throws_ok(
  $$select public.get_game_actions((select game_id from read_created_game), 0, 100)$$,
  '42501',
  'game membership required',
  'nonmember cannot fetch known action history'
);

reset role;
alter table public.game_states drop constraint game_states_payload_shape;
update public.game_states
set state = '{}'::jsonb
where game_id = (select game_id from read_created_game);

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000221","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$select public.get_game_snapshot((select game_id from read_created_game))$$,
  '22023',
  'incompatible stored gameplay data',
  'malformed stored gameplay returns a typed compatibility error'
);

reset role;
update public.game_states
set state = (select gameplay_payload from read_created_game)
where game_id = (select game_id from read_created_game);
alter table public.game_sessions drop constraint game_sessions_supported_schema_version;
update public.game_sessions
set schema_version = 2
where id = (select game_id from read_created_game);

set local role authenticated;

select throws_ok(
  $$select public.get_game_snapshot((select game_id from read_created_game))$$,
  '22023',
  'incompatible stored gameplay data',
  'unsupported stored schema versions return a typed compatibility error'
);

select * from finish();
rollback;
