create or replace function private.can_receive_game_topic(candidate_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  topic_game_id uuid;
begin
  if candidate_topic is null
      or candidate_topic !~ '^game:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  topic_game_id := pg_catalog.substr(candidate_topic, 6)::uuid;
  return private.is_game_member(topic_game_id);
end;
$$;

comment on function private.can_receive_game_topic(text) is
  'Realtime Authorization predicate for private game:<uuid> topics.';

grant execute on function private.can_receive_game_topic(text) to authenticated;

create policy game_members_receive_revision_broadcasts
on realtime.messages
for select
to authenticated
using (
  (select private.can_receive_game_topic(realtime.topic()))
);

create or replace function private.broadcast_game_action_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into realtime.messages (
    payload,
    event,
    topic,
    private,
    extension
  ) values (
    pg_catalog.jsonb_build_object(
      'gameId', new.game_id::text,
      'revision', new.revision,
      'actionId', new.action_id::text
    ),
    'revision',
    'game:' || new.game_id::text,
    true,
    'broadcast'
  );
  return new;
end;
$$;

comment on function private.broadcast_game_action_revision() is
  'Writes one private three-field Realtime notice after each action insert; transaction rollback removes the notice.';

create trigger game_actions_broadcast_revision
after insert on public.game_actions
for each row execute function private.broadcast_game_action_revision();
