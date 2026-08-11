begin;

select plan(13);

select is(private.max_gameplay_payload_bytes(), 1048576, 'gameplay payload cap is 1 MiB');
select is(private.max_map_rows(), 49, 'map row cap is centralized');
select is(private.max_map_columns(), 49, 'map column cap is centralized');
select is(private.max_action_history_page_size(), 100, 'action history page cap is centralized');
select is(private.max_spectators_per_game(), 20, 'default spectator cap is centralized');

insert into auth.users (id, aud, role)
values
  ('00000000-0000-0000-0000-000000000090', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000091', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000092', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000093', 'authenticated', 'authenticated');

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000090","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $sql$
    with generated_map as (
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'row', position, 'column', 0, 'index', position, 'terrain', 'plains', 'unit', 'none', 'team', 'gray'
      ))) as value from pg_catalog.generate_series(0, 49) position
    )
    select public.create_game(1, 'Too tall', 'combat-elimination',
      pg_catalog.jsonb_build_object('map', value, 'money', '{"orange":0,"purple":0}'::jsonb))
    from generated_map
  $sql$,
  '22023',
  'gameplay map exceeds the 49 row limit',
  'the durable state boundary rejects too many map rows'
);

select throws_ok(
  $sql$
    with generated_row as (
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'row', 0, 'column', position, 'index', position, 'terrain', 'plains', 'unit', 'none', 'team', 'gray'
      )) as value from pg_catalog.generate_series(0, 49) position
    )
    select public.create_game(1, 'Too wide', 'combat-elimination',
      pg_catalog.jsonb_build_object('map', pg_catalog.jsonb_build_array(value), 'money', '{"orange":0,"purple":0}'::jsonb))
    from generated_row
  $sql$,
  '22023',
  'gameplay map exceeds the 49 column limit',
  'the durable state boundary rejects too many map columns'
);

create temporary table limited_game on commit drop as
select * from public.create_game(
  1,
  'Limit creator',
  'combat-elimination',
  '{"map":[[{"row":0,"column":0,"index":0,"neighbors":[],"terrain":"plains","unit":"soldier","team":"orange"}]],"money":{"orange":2000,"purple":2000}}'::jsonb
);

reset role;
update private.runtime_limits set max_spectators_per_game = 1 where singleton;

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000091","role":"authenticated"}';
set local role authenticated;
create temporary table limited_purple on commit drop as
select * from public.join_game((select invite_token from limited_game), 'player', 'Purple');
reset role;
select is((select role from limited_purple), 'purple', 'player seat assignment is outside the spectator cap');

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000092","role":"authenticated"}';
set local role authenticated;
create temporary table limited_spectator on commit drop as
select * from public.join_game((select invite_token from limited_game), 'spectator', 'First watcher');
reset role;
select is((select role from limited_spectator), 'spectator', 'a spectator can join below the configured cap');

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000093","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$select public.join_game((select invite_token from limited_game), 'spectator', 'Second watcher')$$,
  'P0001',
  'spectator limit reached (maximum 1)',
  'a new spectator is rejected at the configured cap'
);
reset role;

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000092","role":"authenticated"}';
set local role authenticated;
create temporary table limited_reconnect on commit drop as
select * from public.join_game((select invite_token from limited_game), 'spectator', 'Changed watcher');
reset role;
select is((select role from limited_reconnect), 'spectator', 'an existing spectator can reconnect at the cap');
select is(
  (select count(*)::integer from public.game_members where game_id = (select game_id from limited_game) and role = 'spectator'),
  1,
  'rejection and reconnect do not add spectator memberships'
);

select is(private.max_spectators_per_game(), 1, 'operators can configure the spectator cap in one private row');

select * from finish();
rollback;
