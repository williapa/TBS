create or replace function public.join_game(
  invite_token text,
  join_intent text,
  requested_display_name text
)
returns table (
  game_id uuid,
  member_id uuid,
  role text,
  display_name text,
  schema_version integer,
  status text,
  revision integer,
  active_team text,
  winner_team text,
  win_condition text,
  gameplay_payload jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_session public.game_sessions%rowtype;
  assigned_role text;
  stored_display_name text;
begin
  if caller_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if join_intent is null or join_intent not in ('player', 'spectator') then
    raise exception using errcode = '22023', message = 'join intent must be player or spectator';
  end if;

  select s.*
  into target_session
  from public.game_sessions s
  where s.invite_code_hash = pg_catalog.encode(
    extensions.digest(coalesce(invite_token, ''), 'sha256'),
    'hex'
  )
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'invalid invite token';
  end if;

  select gm.role, gm.display_name
  into assigned_role, stored_display_name
  from public.game_members gm
  where gm.game_id = target_session.id and gm.user_id = caller_id;

  if not found then
    if join_intent = 'player'
        and target_session.status = 'waiting'
        and not exists (
          select 1 from public.game_members gm
          where gm.game_id = target_session.id and gm.role = 'purple'
        ) then
      assigned_role := 'purple';
    else
      assigned_role := 'spectator';
    end if;
    stored_display_name := requested_display_name;

    insert into public.game_members (game_id, user_id, role, display_name)
    values (target_session.id, caller_id, assigned_role, stored_display_name);

    if assigned_role = 'purple' then
      update public.game_sessions
      set status = 'active', active_team = 'purple'
      where id = target_session.id;
    end if;
  end if;

  return query
  select
    s.id,
    caller_id,
    assigned_role,
    stored_display_name,
    s.schema_version,
    s.status,
    s.revision,
    s.active_team,
    s.winner_team,
    s.win_condition,
    gs.state
  from public.game_sessions s
  join public.game_states gs on gs.game_id = s.id and gs.revision = s.revision
  where s.id = target_session.id;
end;
$$;

comment on function public.join_game(text, text, text) is
  'Atomically reconnects an existing member, claims the single purple seat in a waiting game, or adds a spectator by hashed bearer invite.';

revoke all on function public.join_game(text, text, text) from public;
grant execute on function public.join_game(text, text, text) to authenticated;
