begin;

select plan(20);

select lives_ok(
  $$select private.assert_current_state(
    '{
      "schemaVersion":2,"rulesetVersion":"standard@1","contentVersion":"standard@1",
      "revision":0,"lifecycle":{"phase":"waiting"},"board":{"cells":{}},
      "entities":{},"teams":{"orange":{"id":"orange","money":0},"purple":{"id":"purple","money":0}},
      "objectives":[],"turn":{"number":0}
    }'::jsonb,
    0
  )$$,
  'the database accepts the current normalized state shape'
);

select throws_ok(
  $$select private.assert_current_state(
    '{
      "schemaVersion":1,"rulesetVersion":"standard@1","contentVersion":"standard@1",
      "revision":0,"lifecycle":{"phase":"waiting"},"board":{"cells":{}},
      "entities":{},"teams":{"orange":{},"purple":{}},"objectives":[],"turn":{"number":0}
    }'::jsonb,
    0
  )$$,
  '22023',
  'state uses unsupported engine versions',
  'v1 state is rejected'
);

select throws_ok(
  $$select private.assert_current_state(
    '{
      "schemaVersion":2,"rulesetVersion":"standard@1","contentVersion":"standard@1",
      "revision":0,"lifecycle":{"phase":"waiting"},"board":{"cells":{}},
      "entities":{},"teams":{"orange":{},"purple":{}},"objectives":[],"turn":{"number":0},
      "map":[]
    }'::jsonb,
    0
  )$$,
  '22023',
  'state contains unsupported top-level fields',
  'legacy top-level state fields are rejected'
);

select throws_ok(
  $$select private.assert_current_state(
    '{
      "schemaVersion":2,"rulesetVersion":"standard@1","contentVersion":"standard@1",
      "revision":1,"lifecycle":{"phase":"waiting"},"board":{"cells":{}},
      "entities":{},"teams":{"orange":{},"purple":{}},"objectives":[],"turn":{"number":0}
    }'::jsonb,
    0
  )$$,
  '22023',
  'state revision does not match the proposed revision',
  'state revision must match the row and commit revision'
);

select is(private.max_state_bytes(), 1048576, 'state cap is 1 MiB');
select is(private.max_action_bytes(), 16384, 'action cap matches the current protocol');
select is(private.max_event_bytes(), 65536, 'per-event cap matches the current protocol');
select is(private.max_action_history_page_size(), 100, 'history page size is bounded');

select has_column('public', 'game_sessions', 'lifecycle_phase', 'sessions own indexed lifecycle metadata');
select has_column('public', 'game_states', 'state', 'states store one normalized document');
select has_column('public', 'game_actions', 'actor_team_id', 'actions use the current actor-team field');
select hasnt_column('public', 'game_sessions', 'win_condition', 'legacy win-condition metadata is gone');
select hasnt_column('public', 'game_states', 'gameplay_payload', 'there is no split gameplay payload column');

select is(
  pg_catalog.to_regprocedure(
    'public.submit_game_action(uuid,uuid,integer,integer,jsonb,jsonb,jsonb,text,text,text)'
  ) is null,
  true,
  'the browser candidate-state RPC no longer exists'
);
select is(
  pg_catalog.to_regprocedure(
    'public.commit_game_action(uuid,uuid,uuid,integer,text,text,integer,jsonb,jsonb,jsonb,text,text,text)'
  ) is null,
  true,
  'the legacy commit signature no longer exists'
);
select is(
  pg_catalog.to_regprocedure(
    'public.commit_game_action(uuid,uuid,uuid,integer,text,text,integer,jsonb,jsonb,jsonb)'
  ) is not null,
  true,
  'exactly the current trusted commit signature exists'
);
select is(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.commit_game_action(uuid,uuid,uuid,integer,text,text,integer,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ),
  false,
  'authenticated browsers cannot commit canonical state'
);
select is(
  pg_catalog.has_function_privilege(
    'service_role',
    'public.commit_game_action(uuid,uuid,uuid,integer,text,text,integer,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ),
  true,
  'the trusted service role can commit canonical state'
);
select is(
  (select count(*)::integer from pg_catalog.pg_class
   where relnamespace = 'public'::regnamespace
     and relname in ('game_sessions', 'game_members', 'game_states', 'game_actions')
     and relrowsecurity),
  4,
  'RLS is enabled on every exposed game table'
);
select is(
  (select count(*)::integer from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'create_game'),
  1,
  'only one current create-game RPC exists'
);

select * from finish();
rollback;
