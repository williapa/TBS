begin;

select plan(17);

insert into auth.users (id, aud, role)
values
  ('00000000-0000-0000-0000-000000000241', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000242', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000243', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000244', 'authenticated', 'authenticated');

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000241","role":"authenticated"}';
set local role authenticated;

create temporary table broadcast_created_game on commit drop as
select * from public.create_game(
  1,
  'Broadcast Orange',
  'combat-elimination',
  '{
    "map":[[
      {"row":0,"column":0,"index":0,"terrain":"plains","unit":"soldier","team":"orange"},
      {"row":0,"column":1,"index":1,"terrain":"plains","unit":"soldier","team":"purple"}
    ]],
    "money":{"orange":0,"purple":0}
  }'::jsonb
);

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000242","role":"authenticated"}';
set local role authenticated;
select * from public.join_game((select invite_token from broadcast_created_game), 'player', 'Broadcast Purple');

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000243","role":"authenticated"}';
set local role authenticated;
select * from public.join_game((select invite_token from broadcast_created_game), 'spectator', 'Broadcast Watcher');

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000242","role":"authenticated"}';
set local role authenticated;

create temporary table broadcast_submission on commit drop as
select * from public.submit_game_action(
  (select game_id from broadcast_created_game),
  '24000000-0000-0000-0000-000000000001',
  1,
  0,
  '{"action":"end"}'::jsonb,
  '[]'::jsonb,
  (select gameplay_payload from broadcast_created_game),
  'active',
  'orange',
  null
);

reset role;

select is(
  (select count(*)::integer from realtime.messages
   where topic = 'game:' || (select game_id from broadcast_created_game)::text
     and event = 'revision'),
  1,
  'one Realtime notice is stored per committed action'
);
select is(
  (select private from realtime.messages
   where topic = 'game:' || (select game_id from broadcast_created_game)::text),
  true,
  'revision notice is private'
);
select is(
  (select extension from realtime.messages
   where topic = 'game:' || (select game_id from broadcast_created_game)::text),
  'broadcast',
  'revision notice uses Broadcast rather than Postgres Changes'
);
select is(
  (select event from realtime.messages
   where topic = 'game:' || (select game_id from broadcast_created_game)::text),
  'revision',
  'revision notice uses one stable event name'
);
select is(
  (select payload from realtime.messages
   where topic = 'game:' || (select game_id from broadcast_created_game)::text),
  pg_catalog.jsonb_build_object(
    'gameId', (select game_id from broadcast_created_game)::text,
    'revision', 1,
    'actionId', '24000000-0000-0000-0000-000000000001'
  ),
  'notice payload contains exactly game ID, revision, and action ID'
);
select ok(
  (select pg_catalog.octet_length(payload::text) < 200
   from realtime.messages
   where topic = 'game:' || (select game_id from broadcast_created_game)::text),
  'revision notice stays small'
);
select is(
  (select payload ? 'map' from realtime.messages
   where topic = 'game:' || (select game_id from broadcast_created_game)::text),
  false,
  'notice does not contain the board'
);

select pg_catalog.set_config(
  'realtime.topic',
  'game:' || (select game_id from broadcast_created_game)::text,
  true
);
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000241","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*)::integer from realtime.messages
   where topic = (select realtime.topic())),
  1,
  'orange player is authorized for the private game topic'
);

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000243","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*)::integer from realtime.messages
   where topic = (select realtime.topic())),
  1,
  'spectator is authorized for the private game topic'
);

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000244","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*)::integer from realtime.messages
   where topic = (select realtime.topic())),
  0,
  'nonmember is denied the private game topic'
);

reset role;
select pg_catalog.set_config('realtime.topic', 'game:00000000-0000-0000-0000-000000000000', true);
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000241","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*)::integer from realtime.messages
   where topic = (select realtime.topic())),
  0,
  'membership does not authorize a different game topic'
);

reset role;

create or replace function public.zz_test_force_action_rollback()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = 'forced action rollback';
end;
$$;

create trigger zz_test_force_action_rollback
after insert on public.game_actions
for each row execute function public.zz_test_force_action_rollback();

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000241","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$select public.submit_game_action(
      (select game_id from broadcast_created_game),
      '24000000-0000-0000-0000-000000000002', 1, 1,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from broadcast_created_game),
      'active', 'purple', null
    )$$,
  'P0001',
  'forced action rollback',
  'a failure after broadcast insertion aborts the action transaction'
);

reset role;

select is(
  (select count(*)::integer from realtime.messages
   where topic = 'game:' || (select game_id from broadcast_created_game)::text
     and event = 'revision'),
  1,
  'rolled-back action produces no notice'
);
select is(
  (select count(*)::integer from public.game_actions
   where game_id = (select game_id from broadcast_created_game)),
  1,
  'rolled-back action leaves no history row'
);
select is(
  (select revision from public.game_sessions
   where id = (select game_id from broadcast_created_game)),
  1,
  'rolled-back action leaves session revision unchanged'
);
select is(
  (select revision from public.game_states
   where game_id = (select game_id from broadcast_created_game)),
  1,
  'rolled-back action leaves state revision unchanged'
);

select is(
  (select count(*)::integer from pg_catalog.pg_policies
   where schemaname = 'realtime'
     and tablename = 'messages'
     and policyname = 'game_members_receive_revision_broadcasts'),
  1,
  'one membership authorization policy protects revision topics'
);

select * from finish();
rollback;
