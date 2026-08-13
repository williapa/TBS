begin;

select plan(25);

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
select * from public.join_game(
  (select invite_token from submit_created_game),
  'player',
  'Submit Purple'
);

reset role;
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000233","role":"authenticated"}';
set local role authenticated;
select * from public.join_game(
  (select invite_token from submit_created_game),
  'spectator',
  'Submit Watcher'
);

reset role;

select is(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.submit_game_action(uuid,uuid,integer,integer,jsonb,jsonb,jsonb,text,text,text)',
    'EXECUTE'
  ),
  false,
  'authenticated browsers cannot execute the legacy candidate-state RPC'
);
select is(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.commit_game_action(uuid,uuid,uuid,integer,text,text,integer,jsonb,jsonb,jsonb,text,text,text)',
    'EXECUTE'
  ),
  false,
  'authenticated browsers cannot execute the trusted commit RPC'
);
select is(
  pg_catalog.has_function_privilege(
    'service_role',
    'public.commit_game_action(uuid,uuid,uuid,integer,text,text,integer,jsonb,jsonb,jsonb,text,text,text)',
    'EXECUTE'
  ),
  true,
  'only the trusted service role can execute the commit RPC'
);

grant select on submit_created_game to service_role;
grant select on public.game_actions, public.game_sessions, public.game_states to service_role;
set local role service_role;

select throws_ok(
  $$select public.commit_game_action(
      (select game_id from submit_created_game),
      '00000000-0000-0000-0000-000000000233',
      '23000000-0000-0000-0000-000000000001', 1,
      'standard@1', 'standard@1', 0,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from submit_created_game),
      'active', 'orange', null
    )$$,
  '42501',
  'spectators cannot submit actions',
  'the trusted commit repeats spectator authorization'
);

select throws_ok(
  $$select public.commit_game_action(
      (select game_id from submit_created_game),
      '00000000-0000-0000-0000-000000000231',
      '23000000-0000-0000-0000-000000000002', 1,
      'standard@1', 'standard@1', 0,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from submit_created_game),
      'active', 'purple', null
    )$$,
  '42501',
  'caller does not own the active turn',
  'the trusted commit repeats active-team authorization'
);

select throws_ok(
  $$select public.commit_game_action(
      (select game_id from submit_created_game),
      '00000000-0000-0000-0000-000000000232',
      '23000000-0000-0000-0000-000000000003', 1,
      'standard@1', 'standard@1', 1,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from submit_created_game),
      'active', 'orange', null
    )$$,
  'PT409',
  'stale game revision: expected 1 but current revision is 0',
  'the trusted commit rejects stale revisions'
);

select throws_ok(
  $$select public.commit_game_action(
      (select game_id from submit_created_game),
      '00000000-0000-0000-0000-000000000232',
      '23000000-0000-0000-0000-000000000004', 2,
      'standard@1', 'standard@1', 0,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from submit_created_game),
      'active', 'orange', null
    )$$,
  '22023',
  'unsupported game protocol version: 2',
  'unsupported protocol versions are rejected'
);

select throws_ok(
  $$select public.commit_game_action(
      (select game_id from submit_created_game),
      '00000000-0000-0000-0000-000000000232',
      '23000000-0000-0000-0000-000000000005', 1,
      'other@1', 'standard@1', 0,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from submit_created_game),
      'active', 'orange', null
    )$$,
  '22023',
  'submitted engine versions do not match the pinned game versions',
  'ruleset versions must match the pinned game version'
);

select throws_ok(
  $$select public.commit_game_action(
      (select game_id from submit_created_game),
      '00000000-0000-0000-0000-000000000232',
      '23000000-0000-0000-0000-000000000006', 1,
      'standard@1', 'standard@1', 0,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from submit_created_game),
      'waiting', null, null
    )$$,
  '22023',
  'invalid game lifecycle transition proposal',
  'invalid lifecycle proposals are rejected'
);

create temporary table first_submission on commit drop as
select * from public.commit_game_action(
  (select game_id from submit_created_game),
  '00000000-0000-0000-0000-000000000232',
  '23000000-0000-0000-0000-000000000010',
  1,
  'standard@1',
  'standard@1',
  0,
  '{"action":"end"}'::jsonb,
  '[{"actorTeam":"purple","type":"endTurn","nextTeam":"orange","income":0,"money":{"orange":100,"purple":100}}]'::jsonb,
  jsonb_set((select gameplay_payload from submit_created_game), '{money,purple}', '90'::jsonb),
  'active',
  'orange',
  null
);

select is((select idempotent from first_submission), false, 'first commit is not an idempotent replay');
select is((select committed_action_revision from first_submission), 1, 'database assigns the next revision');
select is((select actor_team from first_submission), 'purple', 'actor team is derived from membership');
select is(
  (select ruleset_version || ':' || content_version from first_submission),
  'standard@1:standard@1',
  'the commit preserves pinned engine versions'
);
select is(
  (select state_checksum = pg_catalog.encode(
    extensions.digest(gameplay_payload::text, 'sha256'),
    'hex'
  ) from first_submission),
  true,
  'Postgres computes the canonical state checksum'
);
select is(
  (select actor_user_id from public.game_actions
   where game_id = (select game_id from submit_created_game)),
  '00000000-0000-0000-0000-000000000232'::uuid,
  'the explicit authenticated caller becomes the action owner'
);
select is(
  (select s.revision = gs.revision and s.revision = 1
   from public.game_sessions s
   join public.game_states gs on gs.game_id = s.id
   where s.id = (select game_id from submit_created_game)),
  true,
  'session and state revisions commit together'
);
select is(
  (select idempotent from public.commit_game_action(
    (select game_id from submit_created_game),
    '00000000-0000-0000-0000-000000000232',
    '23000000-0000-0000-0000-000000000010', 1,
    'standard@1', 'standard@1', 0,
    '{"action":"end"}'::jsonb,
    '[{"actorTeam":"purple","type":"endTurn","nextTeam":"orange","income":0,"money":{"orange":100,"purple":100}}]'::jsonb,
    jsonb_set((select gameplay_payload from submit_created_game), '{money,purple}', '90'::jsonb),
    'active', 'orange', null
  )),
  true,
  'an exact action-ID retry is idempotent after the turn changes'
);

select throws_ok(
  $$select public.commit_game_action(
      (select game_id from submit_created_game),
      '00000000-0000-0000-0000-000000000232',
      '23000000-0000-0000-0000-000000000010', 1,
      'standard@1', 'standard@1', 0,
      '{"action":"move"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from submit_created_game),
      'active', 'orange', null
    )$$,
  '23505',
  'action ID conflicts with a previously committed action',
  'reusing an action ID for different content is rejected'
);
select is(
  (select count(*)::integer from public.game_actions
   where game_id = (select game_id from submit_created_game)),
  1,
  'idempotent and conflicting retries add no rows'
);

select throws_ok(
  $$select public.commit_game_action(
      (select game_id from submit_created_game),
      '00000000-0000-0000-0000-000000000231',
      '23000000-0000-0000-0000-000000000011', 1,
      'standard@1', 'standard@1', 1,
      '{"action":"end"}'::jsonb, '[]'::jsonb, '{}'::jsonb,
      'finished', null, 'orange'
    )$$,
  '22023',
  'gameplay payload may contain only map and money',
  'invalid candidate payload aborts the whole commit'
);
select is(
  (select pg_catalog.concat(
    (select revision from public.game_sessions where id = (select game_id from submit_created_game)), ':',
    (select revision from public.game_states where game_id = (select game_id from submit_created_game)), ':',
    (select count(*) from public.game_actions where game_id = (select game_id from submit_created_game))
  )),
  '1:1:1',
  'a failed commit leaves all canonical owners unchanged'
);

create temporary table finishing_submission on commit drop as
select * from public.commit_game_action(
  (select game_id from submit_created_game),
  '00000000-0000-0000-0000-000000000231',
  '23000000-0000-0000-0000-000000000012', 1,
  'standard@1', 'standard@1', 1,
  '{"action":"attack"}'::jsonb,
  '[{"actorTeam":"orange","type":"gameOver","winner":"orange"}]'::jsonb,
  jsonb_set((select gameplay_payload from first_submission), '{money,orange}', '80'::jsonb),
  'finished', null, 'orange'
);

select is((select status from finishing_submission), 'finished', 'a valid finish transition is accepted');
select is((select winner_team from finishing_submission), 'orange', 'the winner is stored atomically');
select throws_ok(
  $$select public.commit_game_action(
      (select game_id from submit_created_game),
      '00000000-0000-0000-0000-000000000232',
      '23000000-0000-0000-0000-000000000013', 1,
      'standard@1', 'standard@1', 2,
      '{"action":"end"}'::jsonb, '[]'::jsonb,
      (select gameplay_payload from finishing_submission),
      'active', 'purple', null
    )$$,
  '55000',
  'game is already finished',
  'new commits are rejected after completion'
);
select is(
  (select count(*)::integer from public.game_actions
   where game_id = (select game_id from submit_created_game)),
  2,
  'only the two accepted revisions exist'
);

select * from finish();
rollback;
