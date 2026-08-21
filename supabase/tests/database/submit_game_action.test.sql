begin;

select plan(21);

insert into auth.users(id, aud, role) values
  ('00000000-0000-0000-0000-000000000021', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000022', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000023', 'authenticated', 'authenticated');

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000021","role":"authenticated"}';
set local role authenticated;
create temporary table commit_created_game on commit drop as
select * from public.create_game(
  'Orange',
  '{
    "schemaVersion":2,"rulesetVersion":"standard@1","contentVersion":"standard@1",
    "revision":0,"lifecycle":{"phase":"waiting"},"board":{"cells":{}},
    "entities":{},"teams":{"orange":{"id":"orange","money":1000},"purple":{"id":"purple","money":1000}},
    "objectives":[],"turn":{"number":0}
  }'::jsonb
);
reset role;

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000022","role":"authenticated"}';
set local role authenticated;
select * from public.join_game(
  (select invite_token from commit_created_game), 'player', 'Purple'
);
reset role;

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000023","role":"authenticated"}';
set local role authenticated;
select * from public.join_game(
  (select invite_token from commit_created_game), 'spectator', 'Watcher'
);
reset role;

create temporary table proposed_state on commit drop as
select pg_catalog.jsonb_set(
  pg_catalog.jsonb_set(
    pg_catalog.jsonb_set(state, '{revision}', '1'::jsonb),
    '{lifecycle}', '{"phase":"active","activeTeamId":"orange"}'::jsonb
  ),
  '{turn}', '{"number":2}'::jsonb
) as state
from public.game_states where game_id = (select game_id from commit_created_game);

grant select on commit_created_game, proposed_state to service_role;
set local role service_role;
create temporary table committed_action on commit drop as
select * from public.commit_game_action(
  (select game_id from commit_created_game),
  '00000000-0000-0000-0000-000000000022',
  '22000000-0000-4000-8000-000000000001',
  2, 'standard@1', 'standard@1', 0,
  '{"type":"end-turn"}'::jsonb,
  '[{"type":"turn-ended","actorTeamId":"purple","nextTeamId":"orange","income":0,"money":{"orange":1000,"purple":1000}}]'::jsonb,
  (select state from proposed_state)
);
reset role;

select is((select idempotent from committed_action), false, 'first commit is not idempotent');
select is((select committed_action_revision from committed_action), 1, 'commit advances one revision');
select is(
  (select revision from public.game_sessions where id = (select game_id from commit_created_game)),
  1,
  'session revision advances atomically'
);
select is(
  (select revision from public.game_states where game_id = (select game_id from commit_created_game)),
  1,
  'canonical state revision advances atomically'
);
select is(
  (select lifecycle_phase || ':' || active_team_id from public.game_sessions
   where id = (select game_id from commit_created_game)),
  'active:orange',
  'indexed lifecycle matches the proposed state'
);
select is(
  (select state #>> '{lifecycle,activeTeamId}' from public.game_states
   where game_id = (select game_id from commit_created_game)),
  'orange',
  'the full normalized state is canonical'
);
select is(
  (select checksum = pg_catalog.encode(extensions.digest(state::text, 'sha256'), 'hex')
   from public.game_states where game_id = (select game_id from commit_created_game)),
  true,
  'the committed state checksum is current'
);
select is(
  (select actor_team_id || ':' || (action ->> 'type') from public.game_actions
   where game_id = (select game_id from commit_created_game)),
  'purple:end-turn',
  'current action history is stored'
);
select is(
  (select count(*)::integer from realtime.messages
   where topic = 'game:' || (select game_id from commit_created_game)::text
     and event = 'revision'),
  1,
  'commit emits one small revision notice'
);

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000022","role":"authenticated"}';
set local role authenticated;
create temporary table action_history on commit drop as
select * from public.get_game_actions((select game_id from commit_created_game), 0, 100);
select is((select count(*)::integer from action_history), 1, 'members read bounded history');
select is((select actor_team_id from action_history), 'purple', 'history uses current actor field');
reset role;

set local role service_role;
create temporary table exact_retry on commit drop as
select * from public.commit_game_action(
  (select game_id from commit_created_game),
  '00000000-0000-0000-0000-000000000022',
  '22000000-0000-4000-8000-000000000001',
  2, 'standard@1', 'standard@1', 0,
  '{"type":"end-turn"}'::jsonb,
  '[{"type":"turn-ended","actorTeamId":"purple","nextTeamId":"orange","income":0,"money":{"orange":1000,"purple":1000}}]'::jsonb,
  (select state from proposed_state)
);
reset role;

select is((select idempotent from exact_retry), true, 'an exact retry is idempotent');
select is(
  (select count(*)::integer from public.game_actions
   where game_id = (select game_id from commit_created_game)),
  1,
  'an exact retry stores no duplicate action'
);
select is(
  (select count(*)::integer from realtime.messages
   where topic = 'game:' || (select game_id from commit_created_game)::text
     and event = 'revision'),
  1,
  'an exact retry emits no duplicate notice'
);

set local role service_role;
select throws_ok(
  format(
    'select * from public.commit_game_action(%L,%L,%L,2,%L,%L,0,%L::jsonb,%L::jsonb,%L::jsonb)',
    (select game_id from commit_created_game),
    '00000000-0000-0000-0000-000000000022',
    '22000000-0000-4000-8000-000000000001',
    'standard@1', 'standard@1', '{"type":"move"}', '[]',
    (select state::text from proposed_state)
  ),
  '23505',
  'action ID conflicts with a previously committed action',
  'same ID with different intent is rejected'
);
select throws_ok(
  format(
    'select * from public.commit_game_action(%L,%L,%L,2,%L,%L,0,%L::jsonb,%L::jsonb,%L::jsonb)',
    (select game_id from commit_created_game),
    '00000000-0000-0000-0000-000000000021',
    '22000000-0000-4000-8000-000000000002',
    'standard@1', 'standard@1', '{"type":"end-turn"}', '[]',
    (select state::text from proposed_state)
  ),
  'PT409',
  'stale game revision: expected 0 but current revision is 1',
  'compare-and-swap rejects a stale revision'
);
select throws_ok(
  format(
    'select * from public.commit_game_action(%L,%L,%L,2,%L,%L,1,%L::jsonb,%L::jsonb,%L::jsonb)',
    (select game_id from commit_created_game),
    '00000000-0000-0000-0000-000000000022',
    '22000000-0000-4000-8000-000000000003',
    'standard@1', 'standard@1', '{"type":"end-turn"}', '[]',
    (select state::text from proposed_state)
  ),
  '42501',
  'caller does not own the active turn',
  'trusted commit rechecks turn ownership'
);
select throws_ok(
  format(
    'select * from public.commit_game_action(%L,%L,%L,2,%L,%L,1,%L::jsonb,%L::jsonb,%L::jsonb)',
    (select game_id from commit_created_game),
    '00000000-0000-0000-0000-000000000023',
    '22000000-0000-4000-8000-000000000004',
    'standard@1', 'standard@1', '{"type":"end-turn"}', '[]',
    (select state::text from proposed_state)
  ),
  '42501',
  'spectators cannot submit actions',
  'trusted commit rejects spectators'
);
select throws_ok(
  format(
    'select * from public.commit_game_action(%L,%L,%L,2,%L,%L,1,%L::jsonb,%L::jsonb,%L::jsonb)',
    (select game_id from commit_created_game),
    '00000000-0000-0000-0000-000000000021',
    '22000000-0000-4000-8000-000000000005',
    'standard@1', 'standard@1', '{"type":"end-turn"}', '[]',
    (select state::text from proposed_state)
  ),
  '22023',
  'state revision does not match the proposed revision',
  'commit rejects a state whose revision does not advance'
);
select throws_ok(
  format(
    'select * from public.commit_game_action(%L,%L,%L,2,%L,%L,1,jsonb_build_object(%L,%L,%L,repeat(%L,17000)),%L::jsonb,%L::jsonb)',
    (select game_id from commit_created_game),
    '00000000-0000-0000-0000-000000000021',
    '22000000-0000-4000-8000-000000000006',
    'standard@1', 'standard@1', 'type', 'move', 'padding', 'x', '[]',
    (select state::text from proposed_state)
  ),
  '22023',
  'submitted action is invalid or too large',
  'commit enforces the current action size limit'
);
reset role;

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000021","role":"authenticated"}';
set local role authenticated;
create temporary table committed_snapshot on commit drop as
select * from public.get_game_snapshot((select game_id from commit_created_game));
select is(
  (select (state ->> 'revision')::integer from committed_snapshot),
  1,
  'snapshot RPC returns the committed canonical state'
);

select * from finish();
rollback;
