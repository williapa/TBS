create or replace function private.max_action_history_page_size()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 100;
$$;

create or replace function public.get_game_snapshot(requested_game_id uuid)
returns table (
  game_id uuid,
  schema_version integer,
  status text,
  revision integer,
  active_team text,
  winner_team text,
  win_condition text,
  players jsonb,
  spectator_count integer,
  gameplay_payload jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  stored_schema_version integer;
  stored_status text;
  stored_revision integer;
  stored_active_team text;
  stored_winner_team text;
  stored_win_condition text;
  stored_payload jsonb;
  stored_players jsonb;
  stored_spectator_count integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if not private.is_game_member(requested_game_id) then
    raise exception using errcode = '42501', message = 'game membership required';
  end if;

  select
    s.schema_version,
    s.status,
    s.revision,
    s.active_team,
    s.winner_team,
    s.win_condition,
    gs.state
  into strict
    stored_schema_version,
    stored_status,
    stored_revision,
    stored_active_team,
    stored_winner_team,
    stored_win_condition,
    stored_payload
  from public.game_sessions s
  join public.game_states gs on gs.game_id = s.id and gs.revision = s.revision
  where s.id = requested_game_id;

  begin
    perform private.assert_gameplay_payload(stored_schema_version, stored_payload);
  exception when others then
    raise exception using
      errcode = '22023',
      message = 'incompatible stored gameplay data',
      detail = sqlerrm;
  end;

  select coalesce(
    pg_catalog.jsonb_object_agg(
      gm.role,
      pg_catalog.jsonb_build_object(
        'memberId', gm.user_id::text,
        'displayName', gm.display_name
      )
    ),
    '{}'::jsonb
  )
  into stored_players
  from public.game_members gm
  where gm.game_id = requested_game_id
    and gm.role in ('orange', 'purple');

  select count(*)::integer
  into stored_spectator_count
  from public.game_members gm
  where gm.game_id = requested_game_id and gm.role = 'spectator';

  return query select
    requested_game_id,
    stored_schema_version,
    stored_status,
    stored_revision,
    stored_active_team,
    stored_winner_team,
    stored_win_condition,
    stored_players,
    stored_spectator_count,
    stored_payload;
exception
  when no_data_found then
    raise exception using errcode = 'P0002', message = 'game snapshot not found';
end;
$$;

comment on function public.get_game_snapshot(uuid) is
  'Returns a membership-scoped provider-neutral snapshot composed from canonical session, member, and gameplay-state owners.';

create or replace function public.get_game_actions(
  requested_game_id uuid,
  after_revision integer,
  requested_limit integer
)
returns table (
  protocol_version integer,
  action_id uuid,
  revision integer,
  actor_team text,
  action jsonb,
  events jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if not private.is_game_member(requested_game_id) then
    raise exception using errcode = '42501', message = 'game membership required';
  end if;
  if after_revision is null or after_revision < 0 then
    raise exception using errcode = '22023', message = 'after_revision must be nonnegative';
  end if;
  if requested_limit is null
      or requested_limit < 1
      or requested_limit > private.max_action_history_page_size() then
    raise exception using errcode = '22023', message = 'requested_limit must be between 1 and 100';
  end if;

  begin
    perform private.assert_supported_protocol_version(ga.protocol_version)
    from public.game_actions ga
    where ga.game_id = requested_game_id
      and ga.revision > after_revision;
  exception when others then
    raise exception using
      errcode = '22023',
      message = 'incompatible stored action history',
      detail = sqlerrm;
  end;

  return query
  select
    ga.protocol_version,
    ga.action_id,
    ga.revision,
    ga.actor_team,
    ga.action,
    ga.events
  from public.game_actions ga
  where ga.game_id = requested_game_id
    and ga.revision > after_revision
  order by ga.revision
  limit requested_limit;
end;
$$;

comment on function public.get_game_actions(uuid, integer, integer) is
  'Returns a bounded membership-scoped page of canonical actions strictly after a client revision.';

revoke all on function public.get_game_snapshot(uuid) from public;
revoke all on function public.get_game_actions(uuid, integer, integer) from public;
grant execute on function public.get_game_snapshot(uuid) to authenticated;
grant execute on function public.get_game_actions(uuid, integer, integer) to authenticated;
