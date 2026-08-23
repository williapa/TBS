create or replace function public.get_game_invite_preview(invite_token text)
returns table (game_id uuid, state jsonb)
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
  select game_session.id, stored_state.state
  from public.game_sessions game_session
  join public.game_states stored_state
    on stored_state.game_id = game_session.id
    and stored_state.revision = game_session.revision
  where game_session.invite_code_hash = pg_catalog.encode(
    extensions.digest(invite_token, 'sha256'), 'hex'
  );
  if not found then
    raise exception using errcode = 'P0002', message = 'invalid invite token';
  end if;
end;
$$;

comment on function public.get_game_invite_preview(text) is
  'Returns bounded canonical battlefield state for an authenticated bearer of a valid invite without creating membership.';

revoke all on function public.get_game_invite_preview(text) from public, anon;
grant execute on function public.get_game_invite_preview(text) to authenticated;
