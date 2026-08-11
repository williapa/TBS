begin;

select plan(4);

select is(
  (select cmd from pg_catalog.pg_policies
   where schemaname = 'realtime' and tablename = 'messages'
     and policyname = 'game_members_track_presence'),
  'INSERT',
  'Presence authorization is an INSERT policy'
);

select ok(
  pg_catalog.strpos((select with_check from pg_catalog.pg_policies
   where schemaname = 'realtime' and tablename = 'messages'
     and policyname = 'game_members_track_presence'), 'presence') > 0,
  'Presence tracking cannot authorize client Broadcast writes'
);

select ok(
  pg_catalog.strpos((select with_check from pg_catalog.pg_policies
   where schemaname = 'realtime' and tablename = 'messages'
     and policyname = 'game_members_track_presence'), 'can_receive_game_topic') > 0,
  'Presence tracking delegates to indexed game membership authorization'
);

select is(
  (select count(*)::integer from pg_catalog.pg_policies
   where schemaname = 'realtime' and tablename = 'messages'
     and policyname in ('game_members_receive_revision_broadcasts', 'game_members_track_presence')),
  2,
  'private game topics have separate read and Presence-track policies'
);

select * from finish();
rollback;
