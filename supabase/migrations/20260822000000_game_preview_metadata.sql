alter table public.game_sessions
  add column map_name text not null default 'Battlefield',
  add constraint game_sessions_map_name_valid
    check (pg_catalog.length(pg_catalog.btrim(map_name)) between 1 and 120);

create or replace function public.create_game_with_metadata(
  display_name text,
  initial_state jsonb,
  map_name text
)
returns table (game_id uuid, member_id uuid, role text, invite_token text)
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  created_game_id uuid;
  raw_invite_token text;
begin
  if caller_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if pg_catalog.length(pg_catalog.btrim(display_name)) not between 1 and 64 then
    raise exception using errcode = '22023', message = 'display name is invalid';
  end if;
  if pg_catalog.length(pg_catalog.btrim(map_name)) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'map name is invalid';
  end if;
  perform private.assert_current_state(initial_state, 0);
  if initial_state #>> '{lifecycle,phase}' <> 'waiting' then
    raise exception using errcode = '22023', message = 'initial state must be waiting';
  end if;
  raw_invite_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.game_sessions (
    invite_code_hash, map_name, revision, lifecycle_phase, active_team_id, winner_team_id
  ) values (
    pg_catalog.encode(extensions.digest(raw_invite_token, 'sha256'), 'hex'),
    pg_catalog.btrim($3),
    0, 'waiting', null, null
  ) returning id into created_game_id;
  insert into public.game_members(game_id, user_id, role, display_name)
  values (created_game_id, caller_id, 'orange', display_name);
  insert into public.game_states(game_id, revision, state, checksum)
  values (created_game_id, 0, initial_state, 'pending');
  return query select created_game_id, caller_id, 'orange'::text, raw_invite_token;
end;
$$;

comment on function public.create_game_with_metadata(text, jsonb, text) is
  'Creates a game with persisted map metadata for invite previews.';

revoke all on function public.create_game_with_metadata(text, jsonb, text) from public, anon;
grant execute on function public.create_game_with_metadata(text, jsonb, text) to authenticated;

drop function public.get_game_invite_preview(text);

create function public.get_game_invite_preview(invite_token text)
returns table (
  game_id uuid,
  state jsonb,
  map_name text,
  creator_display_name text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if invite_token is null
      or pg_catalog.length(invite_token) <> 64
      or invite_token !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'P0002', message = 'invalid invite token';
  end if;
  return query
  select game_session.id, stored_state.state, game_session.map_name, creator.display_name
  from public.game_sessions game_session
  join public.game_states stored_state
    on stored_state.game_id = game_session.id
    and stored_state.revision = game_session.revision
  join public.game_members creator
    on creator.game_id = game_session.id
    and creator.role = 'orange'
  where game_session.invite_code_hash = pg_catalog.encode(
    extensions.digest(invite_token, 'sha256'), 'hex'
  );
  if not found then
    raise exception using errcode = 'P0002', message = 'invalid invite token';
  end if;
end;
$$;

comment on function public.get_game_invite_preview(text) is
  'Returns canonical battlefield and creator metadata for an authenticated bearer of a valid invite without creating membership.';

revoke all on function public.get_game_invite_preview(text) from public, anon;
grant execute on function public.get_game_invite_preview(text) to authenticated;
