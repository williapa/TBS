begin;

select plan(10);

insert into auth.users(id, aud, role) values
  ('00000000-0000-0000-0000-000000000031', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000032', 'authenticated', 'authenticated');

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000031","role":"authenticated"}';
set local role authenticated;

create temporary table invite_preview_game on commit drop as
select * from public.create_game_with_metadata(
  'Orange',
  '{
    "schemaVersion":2,"rulesetVersion":"standard@1","contentVersion":"standard@1",
    "revision":0,"lifecycle":{"phase":"waiting"},"board":{"cells":{}},
    "entities":{},"teams":{"orange":{"id":"orange","money":1000},"purple":{"id":"purple","money":1000}},
    "objectives":[],"turn":{"number":0}
  }'::jsonb,
  'Forest crossing'
);

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000032","role":"authenticated"}';
set local role authenticated;

create temporary table invite_preview_result on commit drop as
select * from public.get_game_invite_preview(
  (select invite_token from invite_preview_game)
);

select is(
  (select game_id from invite_preview_result),
  (select game_id from invite_preview_game),
  'a valid bearer token resolves the invited game'
);
select is(
  (select state #>> '{lifecycle,phase}' from invite_preview_result),
  'waiting',
  'the preview returns canonical battlefield state'
);
select is(
  (select map_name from invite_preview_result),
  'Forest crossing',
  'the preview returns the persisted map name'
);
select is(
  (select creator_display_name from invite_preview_result),
  'Orange',
  'the preview returns the creator display name'
);
select is(
  (select count(*)::integer from public.game_members
   where user_id = '00000000-0000-0000-0000-000000000032'),
  0,
  'previewing an invite does not create membership'
);
select throws_ok(
  $$select * from public.get_game_invite_preview(repeat('0', 64))$$,
  'P0002',
  'invalid invite token',
  'an unknown bearer token is rejected'
);
select throws_ok(
  $$select * from public.get_game_invite_preview('short')$$,
  'P0002',
  'invalid invite token',
  'a malformed bearer token is rejected before lookup'
);

set local request.jwt.claims = '{}';
set local role anon;
select throws_ok(
  $$select * from public.get_game_invite_preview(repeat('0', 64))$$,
  '42501',
  'permission denied for function get_game_invite_preview',
  'anonymous callers cannot preview invite state'
);
reset role;

select is(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.get_game_invite_preview(text)',
    'EXECUTE'
  ),
  true,
  'authenticated browsers can execute the preview RPC'
);
select is(
  pg_catalog.has_function_privilege(
    'anon',
    'public.get_game_invite_preview(text)',
    'EXECUTE'
  ),
  false,
  'anonymous callers have no preview RPC grant'
);

select * from finish();
rollback;
