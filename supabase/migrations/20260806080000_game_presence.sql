create policy game_members_track_presence
on realtime.messages
for insert
to authenticated
with check (
  extension = 'presence'
  and (select private.can_receive_game_topic(realtime.topic()))
);

comment on policy game_members_track_presence on realtime.messages is
  'Allows authenticated game members, including spectators, to track only Presence on their private game topic.';
