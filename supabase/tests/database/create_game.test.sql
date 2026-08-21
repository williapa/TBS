begin;

select plan(20);

insert into auth.users(id, aud, role) values
  ('00000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000014', 'authenticated', 'authenticated');

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}';
set local role authenticated;

create temporary table created_game on commit drop as
select * from public.create_game(
  'Orange',
  '{
    "schemaVersion":2,"rulesetVersion":"standard@1","contentVersion":"standard@1",
    "revision":0,"lifecycle":{"phase":"waiting"},"board":{"cells":{}},
    "entities":{},"teams":{"orange":{"id":"orange","money":1000},"purple":{"id":"purple","money":1000}},
    "objectives":[],"turn":{"number":0}
  }'::jsonb
);

create temporary table creator_reconnect on commit drop as
select * from public.join_game(
  (select invite_token from created_game), 'spectator', 'Changed Orange'
);

reset role;

select is((select count(*)::integer from created_game), 1, 'create_game returns one row');
select is((select role from created_game), 'orange', 'creator receives orange');
select is(
  (select concat_ws(':', schema_version, protocol_version, ruleset_version, content_version)
   from public.game_sessions where id = (select game_id from created_game)),
  '2:2:standard@1:standard@1',
  'new games pin the current engine versions'
);
select is(
  (select lifecycle_phase from public.game_sessions where id = (select game_id from created_game)),
  'waiting',
  'new sessions begin waiting'
);
select is(
  (select state #>> '{lifecycle,phase}' from public.game_states
   where game_id = (select game_id from created_game)),
  'waiting',
  'the normalized state also begins waiting'
);
select is(
  (select checksum = pg_catalog.encode(extensions.digest(state::text, 'sha256'), 'hex')
   from public.game_states where game_id = (select game_id from created_game)),
  true,
  'state checksum is database-computed'
);
select is(
  (select invite_code_hash = pg_catalog.encode(
     extensions.digest((select invite_token from created_game), 'sha256'), 'hex'
   ) from public.game_sessions where id = (select game_id from created_game)),
  true,
  'only the invite-token hash is durable'
);
select is((select role from creator_reconnect), 'orange', 'reconnect preserves the creator seat');
select is(
  (select count(*)::integer from public.game_members
   where game_id = (select game_id from created_game)
     and user_id = '00000000-0000-0000-0000-000000000011'),
  1,
  'reconnect is idempotent'
);

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000012","role":"authenticated"}';
set local role authenticated;
create temporary table purple_join on commit drop as
select * from public.join_game((select invite_token from created_game), 'player', 'Purple');
reset role;

select is((select role from purple_join), 'purple', 'second player claims purple');
select is(
  (select lifecycle_phase || ':' || active_team_id from public.game_sessions
   where id = (select game_id from created_game)),
  'active:purple',
  'purple joining activates the indexed lifecycle'
);
select is(
  (select state #>> '{lifecycle,activeTeamId}' from public.game_states
   where game_id = (select game_id from created_game)),
  'purple',
  'purple joining updates canonical state lifecycle'
);
select is(
  (select (state #>> '{turn,number}')::integer from public.game_states
   where game_id = (select game_id from created_game)),
  1,
  'activation starts turn one'
);

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000013","role":"authenticated"}';
set local role authenticated;
create temporary table spectator_join on commit drop as
select * from public.join_game((select invite_token from created_game), 'spectator', 'Watcher');
reset role;

select is((select role from spectator_join), 'spectator', 'spectator joins without authority');

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}';
set local role authenticated;
create temporary table composed_snapshot on commit drop as
select * from public.get_game_snapshot((select game_id from created_game));
select is((select spectator_count from composed_snapshot), 1, 'snapshot counts spectators');
select is(
  (select players #>> '{purple,displayName}' from composed_snapshot),
  'Purple',
  'snapshot composes player seats'
);
select throws_ok(
  $$update public.game_states set state = state$$,
  '42501',
  'permission denied for table game_states',
  'browser members cannot mutate canonical state directly'
);
reset role;

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000014","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  format(
    'select * from public.get_game_snapshot(%L::uuid)',
    (select game_id from created_game)
  ),
  '42501',
  'game membership required',
  'nonmembers cannot read snapshots'
);
reset role;

update private.runtime_limits set max_spectators_per_game = 1 where singleton;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000014","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  format(
    'select * from public.join_game(%L, %L, %L)',
    (select invite_token from created_game), 'spectator', 'Overflow'
  ),
  'P0001',
  'spectator limit reached (maximum 1)',
  'durable spectator cap is enforced'
);
reset role;

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$select public.create_game(
    'Bad initial',
    '{
      "schemaVersion":2,"rulesetVersion":"standard@1","contentVersion":"standard@1",
      "revision":0,"lifecycle":{"phase":"active","activeTeamId":"orange"},
      "board":{"cells":{}},"entities":{},
      "teams":{"orange":{"id":"orange","money":0},"purple":{"id":"purple","money":0}},
      "objectives":[],"turn":{"number":1}
    }'::jsonb
  )$$,
  '22023',
  'initial state must be waiting',
  'game creation rejects non-waiting initial state'
);

select * from finish();
rollback;
