begin;

select plan(21);

insert into auth.users (id, aud, role)
values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated');

insert into public.game_sessions (
  id, invite_code_hash, schema_version, status, revision, win_condition
) values (
  '10000000-0000-0000-0000-000000000001',
  'invite-hash-1',
  1,
  'waiting',
  0,
  'combat-elimination'
);

select lives_ok(
  $$select private.assert_supported_schema_version(1)$$,
  'the RPC schema-version guard accepts the current version'
);

select throws_ok(
  $$select private.assert_supported_schema_version(2)$$,
  '22023',
  'unsupported game schema version: 2',
  'the RPC schema-version guard rejects unsupported versions'
);

select lives_ok(
  $$select private.assert_supported_protocol_version(1)$$,
  'the RPC protocol-version guard accepts the current version'
);

select throws_ok(
  $$select private.assert_supported_protocol_version(2)$$,
  '22023',
  'unsupported game protocol version: 2',
  'the RPC protocol-version guard rejects unsupported versions'
);

select lives_ok(
  $$insert into public.game_states (game_id, revision, state)
    values (
      '10000000-0000-0000-0000-000000000001',
      0,
      '{"map":[],"money":{"orange":0,"purple":0}}'::jsonb
    )$$,
  'a supported gameplay payload can be stored'
);

select throws_ok(
  $$insert into public.game_sessions (
      invite_code_hash, schema_version, status, revision, win_condition
    ) values ('bad-schema', 2, 'waiting', 0, 'combat-elimination')$$,
  '23514',
  'new row for relation "game_sessions" violates check constraint "game_sessions_supported_schema_version"',
  'unsupported schema versions are rejected'
);

select throws_ok(
  $$insert into public.game_members (game_id, user_id, role, display_name)
    values (
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      'owner',
      'Invalid'
    )$$,
  '23514',
  'new row for relation "game_members" violates check constraint "game_members_role_valid"',
  'invalid member roles are rejected'
);

insert into public.game_members (game_id, user_id, role, display_name)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'orange',
  'Orange One'
);

select throws_ok(
  $$insert into public.game_members (game_id, user_id, role, display_name)
    values (
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      'orange',
      'Orange Two'
    )$$,
  '23505',
  'duplicate key value violates unique constraint "game_members_one_orange_per_game"',
  'only one orange seat is allowed per game'
);

select throws_ok(
  $$insert into public.game_members (game_id, user_id, role, display_name)
    values (
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      'spectator',
      'Duplicate membership'
    )$$,
  '23505',
  'duplicate key value violates unique constraint "game_members_pkey"',
  'a user has only one membership per game'
);

insert into public.game_members (game_id, user_id, role, display_name)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'purple',
  'Purple'
);

select throws_ok(
  $$update public.game_states
    set state = state || '{"status":"waiting"}'::jsonb
    where game_id = '10000000-0000-0000-0000-000000000001'$$,
  '23514',
  null,
  'session metadata cannot be embedded in gameplay JSON'
);

select throws_ok(
  $$insert into public.game_actions (
      game_id, revision, protocol_version, action_id,
      actor_user_id, actor_team, action, events
    ) values (
      '10000000-0000-0000-0000-000000000001', 1, 2,
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001', 'orange',
      '{"action":"end"}'::jsonb, '[]'::jsonb
    )$$,
  '23514',
  'new row for relation "game_actions" violates check constraint "game_actions_supported_protocol_version"',
  'unsupported protocol versions are rejected'
);

select lives_ok(
  $$insert into public.game_actions (
      game_id, revision, protocol_version, action_id,
      actor_user_id, actor_team, action, events
    ) values (
      '10000000-0000-0000-0000-000000000001', 1, 1,
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001', 'orange',
      '{"action":"end"}'::jsonb, '[]'::jsonb
    )$$,
  'a supported action is stored'
);

select throws_ok(
  $$insert into public.game_actions (
      game_id, revision, protocol_version, action_id,
      actor_user_id, actor_team, action, events
    ) values (
      '10000000-0000-0000-0000-000000000001', 1, 1,
      '20000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000001', 'orange',
      '{"action":"end"}'::jsonb, '[]'::jsonb
    )$$,
  '23505',
  'duplicate key value violates unique constraint "game_actions_pkey"',
  'duplicate revisions are rejected'
);

select throws_ok(
  $$insert into public.game_actions (
      game_id, revision, protocol_version, action_id,
      actor_user_id, actor_team, action, events
    ) values (
      '10000000-0000-0000-0000-000000000001', 2, 1,
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001', 'orange',
      '{"action":"end"}'::jsonb, '[]'::jsonb
    )$$,
  '23505',
  'duplicate key value violates unique constraint "game_actions_action_id_unique"',
  'duplicate action IDs are rejected'
);

select throws_ok(
  $$insert into public.game_actions (
      game_id, revision, protocol_version, action_id,
      actor_user_id, actor_team, action, events
    ) values (
      '10000000-0000-0000-0000-000000000001', 2, 1,
      '20000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000003', 'orange',
      '{"action":"end"}'::jsonb, '[]'::jsonb
    )$$,
  '23503',
  null,
  'action actors must be game members'
);

update public.game_sessions
set status = 'active', active_team = 'purple', revision = 1
where id = '10000000-0000-0000-0000-000000000001';

select throws_ok(
  $$update public.game_states
    set revision = 2
    where game_id = '10000000-0000-0000-0000-000000000001'$$,
  '23503',
  null,
  'gameplay state cannot advance independently of its session'
);

select is(
  (select s.revision = gs.revision
   from public.game_sessions s
   join public.game_states gs on gs.game_id = s.id
   where s.id = '10000000-0000-0000-0000-000000000001'),
  true,
  'session revision updates cascade atomically to gameplay state'
);

select is(
  (select status from public.game_sessions
   where id = '10000000-0000-0000-0000-000000000001'),
  'active',
  'session lifecycle metadata remains relational'
);

select is(
  (select state ? 'status' from public.game_states
   where game_id = '10000000-0000-0000-0000-000000000001'),
  false,
  'gameplay state does not duplicate lifecycle metadata'
);

select is(
  (select count(*)::integer from public.game_members
   where game_id = '10000000-0000-0000-0000-000000000001'
     and role in ('orange', 'purple')),
  2,
  'both unique player seats can coexist'
);

select is(
  (select count(*)::integer from public.game_actions
   where game_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'only the accepted ordered action was stored'
);

select * from finish();
rollback;
