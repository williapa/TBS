begin;

select plan(24);

insert into auth.users (id, aud, role)
values
  ('00000000-0000-0000-0000-000000000231', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000232', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000233', 'authenticated', 'authenticated');

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000231","role":"authenticated"}';
set local role authenticated;

create temporary table submit_created_game on commit drop as
select * from public.create_game(
  1,
  'Submit Orange',
  'combat-elimination',
  '{
    "map":[[
      {"row":0,"column":0,"index":0,"neighbors":[],"terrain":"plains","unit":"soldier","team":"orange"},
      {"row":0,"column":1,"index":1,"neighbors":[],"terrain":"plains","unit":"soldier","team":"purple"}
    ]],
    "money":{"orange":100,"purple":100}
  }'::jsonb
);

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000232","role":"authenticated"}';
set local role authenticated;
select * from public.join_game((select invite_token from submit_created_game), 'player', 'Submit Purple');

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000233","role":"authenticated"}';
set local role authenticated;
select * from public.join_game((select invite_token from submit_created_game), 'spectator', 'Submit Watcher');

select throws_ok(
  $$select public.submit_game_action(
      (select game_id from submit_created_game),
      '23000000-0000-0000-0000-000000000001', 1, 0,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from submit_created_game),
      'active', 'orange', null
    )$$,
  '42501',
  'spectators cannot submit actions',
  'spectators are read-only'
);

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000231","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$select public.submit_game_action(
      (select game_id from submit_created_game),
      '23000000-0000-0000-0000-000000000002', 1, 0,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from submit_created_game),
      'active', 'purple', null
    )$$,
  '42501',
  'caller does not own the active turn',
  'out-of-turn players are rejected'
);

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000232","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$select public.submit_game_action(
      (select game_id from submit_created_game),
      '23000000-0000-0000-0000-000000000003', 1, 1,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from submit_created_game),
      'active', 'orange', null
    )$$,
  'PT409',
  'stale game revision: expected 1 but current revision is 0',
  'stale expected revisions are rejected'
);

select throws_ok(
  $$select public.submit_game_action(
      (select game_id from submit_created_game),
      '23000000-0000-0000-0000-000000000004', 2, 0,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from submit_created_game),
      'active', 'orange', null
    )$$,
  '22023',
  'unsupported game protocol version: 2',
  'unsupported action protocols fail at the RPC boundary'
);

select throws_ok(
  $$select public.submit_game_action(
      (select game_id from submit_created_game),
      '23000000-0000-0000-0000-000000000005', 1, 0,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from submit_created_game),
      'waiting', null, null
    )$$,
  '22023',
  'invalid game lifecycle transition proposal',
  'invalid lifecycle proposals are rejected'
);

create temporary table first_submission on commit drop as
select * from public.submit_game_action(
  (select game_id from submit_created_game),
  '23000000-0000-0000-0000-000000000010',
  1,
  0,
  '{"action":"end"}'::jsonb,
  '[{"actorTeam":"purple","type":"endTurn","nextTeam":"orange","income":0,"money":{"orange":100,"purple":100}}]'::jsonb,
  jsonb_set((select gameplay_payload from submit_created_game), '{money,purple}', '90'::jsonb),
  'active',
  'orange',
  null
);

select is((select idempotent from first_submission), false, 'first action commit is not an idempotent replay');
select is((select committed_action_revision from first_submission), 1, 'database assigns the next action revision');
select is((select snapshot_revision from first_submission), 1, 'canonical snapshot advances with the action');
select is((select actor_team from first_submission), 'purple', 'actor team is derived from membership');
select is((select status || ':' || active_team from first_submission), 'active:orange', 'accepted transition becomes canonical session metadata');
select is((select gameplay_payload #>> '{money,purple}' from first_submission), '90', 'accepted candidate gameplay becomes canonical state');

reset role;

select is(
  (select count(*)::integer from public.game_actions
   where game_id = (select game_id from submit_created_game)),
  1,
  'one ordered action row is committed'
);
select is(
  (select s.revision = gs.revision and s.revision = 1
   from public.game_sessions s join public.game_states gs on gs.game_id = s.id
   where s.id = (select game_id from submit_created_game)),
  true,
  'session and gameplay state revisions commit together'
);
select is(
  (select actor_user_id from public.game_actions
   where game_id = (select game_id from submit_created_game)),
  '00000000-0000-0000-0000-000000000232'::uuid,
  'action identity is derived from auth.uid'
);

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000232","role":"authenticated"}';
set local role authenticated;

select is(
  (select idempotent from public.submit_game_action(
    (select game_id from submit_created_game),
    '23000000-0000-0000-0000-000000000010', 1, 0,
    '{"action":"end"}'::jsonb,
    '[{"actorTeam":"purple","type":"endTurn","nextTeam":"orange","income":0,"money":{"orange":100,"purple":100}}]'::jsonb,
    jsonb_set((select gameplay_payload from submit_created_game), '{money,purple}', '90'::jsonb),
    'active', 'orange', null
  )),
  true,
  'an exact action-ID retry succeeds idempotently after the turn changes'
);

select throws_ok(
  $$select public.submit_game_action(
      (select game_id from submit_created_game),
      '23000000-0000-0000-0000-000000000010', 1, 0,
      '{"action":"move","start":{"x":0,"y":0},"end":{"x":0,"y":1}}'::jsonb,
      '[]'::jsonb,
      (select gameplay_payload from submit_created_game),
      'active', 'orange', null
    )$$,
  '23505',
  'action ID conflicts with a previously committed action',
  'reusing an action ID for different content is rejected'
);

reset role;
select is(
  (select count(*)::integer from public.game_actions
   where game_id = (select game_id from submit_created_game)),
  1,
  'idempotent and conflicting retries add no rows'
);

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000231","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$select public.submit_game_action(
      (select game_id from submit_created_game),
      '23000000-0000-0000-0000-000000000011', 1, 1,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      '{}'::jsonb,
      'finished', null, 'orange'
    )$$,
  '22023',
  'gameplay payload may contain only map and money',
  'invalid candidate payload aborts the whole submission'
);

reset role;
select is(
  (select pg_catalog.concat(
    (select revision from public.game_sessions where id = (select game_id from submit_created_game)), ':',
    (select revision from public.game_states where game_id = (select game_id from submit_created_game)), ':',
    (select count(*) from public.game_actions
     where game_id = (select game_id from submit_created_game))
  )),
  '1:1:1',
  'failed candidate validation leaves all canonical owners unchanged'
);

set local role authenticated;

create temporary table finishing_submission on commit drop as
select * from public.submit_game_action(
  (select game_id from submit_created_game),
  '23000000-0000-0000-0000-000000000012',
  1,
  1,
  '{"action":"attack","start":{"x":0,"y":0},"end":{"x":0,"y":0},"target":{"x":0,"y":1}}'::jsonb,
  '[{"actorTeam":"orange","type":"gameOver","winner":"orange"}]'::jsonb,
  jsonb_set((select gameplay_payload from first_submission), '{money,orange}', '80'::jsonb),
  'finished',
  null,
  'orange'
);

select is((select status from finishing_submission), 'finished', 'a structurally valid finish transition is accepted');
select is((select winner_team from finishing_submission), 'orange', 'finished transition stores the proposed winner');
select is((select snapshot_revision from finishing_submission), 2, 'finishing action atomically advances to revision two');

select throws_ok(
  $$select public.submit_game_action(
      (select game_id from submit_created_game),
      '23000000-0000-0000-0000-000000000013', 1, 2,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from finishing_submission),
      'active', 'purple', null
    )$$,
  '55000',
  'game is already finished',
  'new actions are rejected after game completion'
);

select is(
  (select count(*)::integer from public.game_actions
   where game_id = (select game_id from submit_created_game)),
  2,
  'only two accepted revisions exist'
);

select * from finish();
rollback;
