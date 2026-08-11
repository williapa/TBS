begin;

select plan(21);

insert into auth.users (id, aud, role)
values
  ('00000000-0000-0000-0000-000000000020', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000021', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000022', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000023', 'authenticated', 'authenticated');

create temporary table join_game_baseline on commit drop as
select
  (select count(*) from public.game_sessions) as sessions,
  (select count(*) from public.game_members) as members,
  (select count(*) from public.game_states) as states;

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000020","role":"authenticated"}';
set local role authenticated;

create temporary table created_game on commit drop as
select * from public.create_game(
  1,
  'Original Creator',
  'combat-elimination',
  '{
    "map":[[
      {"row":0,"column":0,"index":0,"neighbors":[],"terrain":"plains","unit":"soldier","team":"orange"}
    ]],
    "money":{"orange":2000,"purple":2000}
  }'::jsonb
);

create temporary table creator_reconnect on commit drop as
select * from public.join_game(
  (select invite_token from created_game),
  'spectator',
  'Changed Creator'
);

reset role;

select is((select role from creator_reconnect), 'orange', 'creator reconnect keeps the orange seat');
select is(
  (select count(*)::integer from public.game_members gm join created_game c on c.game_id = gm.game_id
   where gm.user_id = '00000000-0000-0000-0000-000000000020'),
  1,
  'creator reconnect does not duplicate membership'
);
select is(
  (select display_name from creator_reconnect),
  'Original Creator',
  'creator reconnect preserves the original display name'
);

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000021","role":"authenticated"}';
set local role authenticated;

create temporary table purple_join on commit drop as
select * from public.join_game(
  (select invite_token from created_game),
  'player',
  'Purple Player'
);

reset role;

select is((select role from purple_join), 'purple', 'first player join claims purple');
select is((select status from purple_join), 'active', 'purple joining activates the game');
select is((select active_team from purple_join), 'purple', 'purple receives the first turn');
select is(
  (select count(*)::integer from public.game_members gm join created_game c on c.game_id = gm.game_id
   where gm.role = 'purple'),
  1,
  'exactly one purple membership exists'
);

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000022","role":"authenticated"}';
set local role authenticated;

create temporary table third_join on commit drop as
select * from public.join_game(
  (select invite_token from created_game),
  'player',
  'Third User'
);

reset role;

select is((select role from third_join), 'spectator', 'a third player request becomes spectator');
select is(
  (select count(*)::integer from public.game_members gm join created_game c on c.game_id = gm.game_id
   where gm.role = 'purple'),
  1,
  'later joins cannot create a second purple seat'
);
select is(
  (select count(*)::integer from public.game_members gm join created_game c on c.game_id = gm.game_id
   where gm.role = 'spectator'),
  1,
  'third user has one spectator membership'
);

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000023","role":"authenticated"}';
set local role authenticated;

create temporary table explicit_spectator_join on commit drop as
select * from public.join_game(
  (select invite_token from created_game),
  'spectator',
  'Watcher'
);

reset role;

select is((select role from explicit_spectator_join), 'spectator', 'spectator intent creates a spectator');

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000021","role":"authenticated"}';
set local role authenticated;

create temporary table purple_reconnect on commit drop as
select * from public.join_game(
  (select invite_token from created_game),
  'spectator',
  'Changed Purple'
);

reset role;

select is((select role from purple_reconnect), 'purple', 'purple reconnect keeps the player seat');
select is(
  (select count(*)::integer from public.game_members gm join created_game c on c.game_id = gm.game_id
   where gm.user_id = '00000000-0000-0000-0000-000000000021'),
  1,
  'purple reconnect does not duplicate membership'
);
select is((select display_name from purple_reconnect), 'Purple Player', 'reconnect preserves player display name');

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000023","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$select public.join_game(repeat('0', 64), 'player', 'Invalid')$$,
  'P0002',
  'invalid invite token',
  'an invalid bearer invite is rejected'
);

select throws_ok(
  $$select public.join_game(
      repeat('0', 64),
      'admin',
      'Invalid intent'
    )$$,
  '22023',
  'join intent must be player or spectator',
  'an invalid join intent is rejected'
);

reset role;
set local request.jwt.claims = '{}';
set local role anon;

select throws_ok(
  $$select public.join_game(
      repeat('0', 64),
      'spectator',
      'Unauthenticated'
    )$$,
  '42501',
  'permission denied for function join_game',
  'unauthenticated callers cannot execute join_game'
);

reset role;

select is(
  (select pg_catalog.concat(
    (select count(*) from public.game_sessions) - (select sessions from join_game_baseline), ':',
    (select count(*) from public.game_members) - (select members from join_game_baseline), ':',
    (select count(*) from public.game_states) - (select states from join_game_baseline)
  )),
  '1:4:1',
  'failed joins leave no partial session, membership, or state rows'
);

select is(
  (select s.revision = gs.revision and s.revision = 0
   from public.game_sessions s
   join public.game_states gs on gs.game_id = s.id
   join created_game c on c.game_id = s.id),
  true,
  'seat assignment preserves the session/state revision invariant'
);

select is(
  (select gameplay_payload from purple_join),
  (select gameplay_payload from created_game),
  'joining does not mutate canonical gameplay state'
);

select is(
  (select status from third_join),
  'active',
  'spectator joins preserve active lifecycle state'
);

select * from finish();
rollback;
