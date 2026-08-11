begin;

select plan(18);

insert into auth.users (id, aud, role)
values ('00000000-0000-0000-0000-000000000019', 'authenticated', 'authenticated');

create temporary table create_game_baseline on commit drop as
select
  (select count(*) from public.game_sessions) as sessions,
  (select count(*) from public.game_members) as members,
  (select count(*) from public.game_states) as states;

set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000019","role":"authenticated"}';
set local role authenticated;

create temporary table created_game_result on commit drop as
select * from public.create_game(
  1,
  'Creator',
  'combat-elimination',
  '{
    "map":[[
      {"row":0,"column":0,"index":0,"neighbors":[],"terrain":"plains","unit":"soldier","team":"orange"}
    ]],
    "money":{"orange":2000,"purple":2000}
  }'::jsonb
);

reset role;

select is((select count(*)::integer from created_game_result), 1, 'create_game returns one result');
select is((select role from created_game_result), 'orange', 'creator receives the orange role');
select is((select status from created_game_result), 'waiting', 'new game begins waiting');
select is((select revision from created_game_result), 0, 'new game begins at revision zero');
select is((select active_team from created_game_result), null, 'waiting game has no active team');
select is((select winner_team from created_game_result), null, 'waiting game has no winner');

select is(
  (select gm.role from public.game_members gm join created_game_result r on r.game_id = gm.game_id),
  'orange',
  'creator membership is stored as orange'
);

select is(
  (select gs.revision from public.game_states gs join created_game_result r on r.game_id = gs.game_id),
  0,
  'initial gameplay state is stored at revision zero'
);

select matches(
  (select invite_token from created_game_result),
  '^[0-9a-f]{64}$',
  'the returned invite token contains 256 random bits encoded as hex'
);

select is(
  (select s.invite_code_hash = pg_catalog.encode(extensions.digest(r.invite_token, 'sha256'), 'hex')
   from public.game_sessions s join created_game_result r on r.game_id = s.id),
  true,
  'only the SHA-256 invite hash is stored'
);

select isnt(
  (select s.invite_code_hash from public.game_sessions s join created_game_result r on r.game_id = s.id),
  (select invite_token from created_game_result),
  'the raw invite token is not stored as its hash'
);

select hasnt_column('public', 'game_sessions', 'invite_token', 'game_sessions has no raw invite-token column');

set local role authenticated;

select throws_ok(
  $$select public.create_game(
      2, 'Bad version', 'combat-elimination',
      '{"map":[[{"row":0,"column":0,"index":0,"terrain":"plains","unit":"none","team":"gray"}]],"money":{"orange":0,"purple":0}}'::jsonb
    )$$,
  '22023',
  'unsupported game schema version: 2',
  'unsupported schema versions fail at the RPC boundary'
);

select throws_ok(
  $$select public.create_game(
      1, 'Bad metadata', 'combat-elimination',
      '{"map":[[{"row":0,"column":0,"index":0,"terrain":"plains","unit":"none","team":"gray"}]],"money":{"orange":0,"purple":0},"status":"waiting"}'::jsonb
    )$$,
  '22023',
  'gameplay payload may contain only map and money',
  'session metadata is rejected from gameplay JSON'
);

select throws_ok(
  $$select public.create_game(
      1, 'Too large', 'combat-elimination',
      pg_catalog.jsonb_build_object(
        'map', pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object(
            'row', 0, 'column', 0, 'index', 0, 'terrain', 'plains',
            'unit', 'none', 'team', 'gray', 'padding', repeat('x', 1048576)
          )
        )),
        'money', '{"orange":0,"purple":0}'::jsonb
      )
    )$$,
  '22023',
  'gameplay payload exceeds the 1048576 byte limit',
  'oversized gameplay JSON is rejected'
);

reset role;
set local request.jwt.claims = '{}';
set local role anon;

select throws_ok(
  $$select public.create_game(
      1, 'Unauthenticated', 'combat-elimination',
      '{"map":[[{"row":0,"column":0,"index":0,"terrain":"plains","unit":"none","team":"gray"}]],"money":{"orange":0,"purple":0}}'::jsonb
    )$$,
  '42501',
  'permission denied for function create_game',
  'unauthenticated callers cannot execute create_game'
);

reset role;

select is(
  (select pg_catalog.concat(
    (select count(*) from public.game_sessions) - (select sessions from create_game_baseline), ':',
    (select count(*) from public.game_members) - (select members from create_game_baseline), ':',
    (select count(*) from public.game_states) - (select states from create_game_baseline)
  )),
  '1:1:1',
  'every failed create leaves no partial session, membership, or state'
);

select is(
  (select s.win_condition from public.game_sessions s join created_game_result r on r.game_id = s.id),
  'combat-elimination',
  'win condition is stored as canonical session metadata'
);

select * from finish();
rollback;
