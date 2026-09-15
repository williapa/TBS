alter table public.game_sessions
  drop constraint game_sessions_ruleset_version_check,
  alter column ruleset_version set default 'standard@2',
  add constraint game_sessions_ruleset_version_check
    check (ruleset_version in ('standard@1', 'standard@2')),
  drop constraint game_sessions_lifecycle_consistent,
  add constraint game_sessions_lifecycle_consistent check (
    (lifecycle_phase = 'waiting' and active_team_id is null and winner_team_id is null)
    or (lifecycle_phase = 'active' and active_team_id is not null and winner_team_id is null)
    or (lifecycle_phase = 'finished' and active_team_id is null)
  );

alter table public.game_actions
  drop constraint game_actions_ruleset_version_check,
  add constraint game_actions_ruleset_version_check
    check (ruleset_version in ('standard@1', 'standard@2'));

create or replace function private.assert_current_state(
  candidate jsonb,
  expected_revision integer
)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  lifecycle_phase text;
begin
  if candidate is null or pg_catalog.jsonb_typeof(candidate) <> 'object' then
    raise exception using errcode = '22023', message = 'state must be an object';
  end if;
  if pg_catalog.octet_length(pg_catalog.convert_to(candidate::text, 'UTF8'))
      > private.max_state_bytes() then
    raise exception using errcode = '22023', message = 'state exceeds the 1048576 byte limit';
  end if;
  if candidate - array[
      'schemaVersion', 'rulesetVersion', 'contentVersion', 'revision', 'lifecycle',
      'board', 'entities', 'teams', 'objectives', 'turn'
    ] <> '{}'::jsonb
      or not (
        candidate ?& array[
          'schemaVersion', 'rulesetVersion', 'contentVersion', 'revision', 'lifecycle',
          'board', 'entities', 'teams', 'objectives', 'turn'
        ]
      ) then
    raise exception using errcode = '22023', message = 'state contains unsupported top-level fields';
  end if;
  if candidate -> 'schemaVersion' <> '2'::jsonb
      or candidate ->> 'rulesetVersion' is null
      or candidate ->> 'rulesetVersion' not in ('standard@1', 'standard@2')
      or candidate ->> 'contentVersion' is distinct from 'standard@1' then
    raise exception using errcode = '22023', message = 'state uses unsupported engine versions';
  end if;
  if pg_catalog.jsonb_typeof(candidate -> 'revision') <> 'number'
      or (candidate ->> 'revision')::integer is distinct from expected_revision then
    raise exception using errcode = '22023', message = 'state revision does not match the proposed revision';
  end if;
  if pg_catalog.jsonb_typeof(candidate -> 'lifecycle') <> 'object'
      or pg_catalog.jsonb_typeof(candidate #> '{board,cells}') <> 'object'
      or pg_catalog.jsonb_typeof(candidate -> 'entities') <> 'object'
      or pg_catalog.jsonb_typeof(candidate -> 'teams') <> 'object'
      or pg_catalog.jsonb_typeof(candidate -> 'objectives') <> 'array'
      or pg_catalog.jsonb_typeof(candidate -> 'turn') <> 'object'
      or pg_catalog.jsonb_typeof(candidate #> '{turn,number}') <> 'number' then
    raise exception using errcode = '22023', message = 'state has an invalid normalized structure';
  end if;
  if pg_catalog.jsonb_typeof(candidate #> '{teams,orange}') <> 'object'
      or pg_catalog.jsonb_typeof(candidate #> '{teams,purple}') <> 'object' then
    raise exception using errcode = '22023', message = 'state must contain the standard teams';
  end if;

  lifecycle_phase := candidate #>> '{lifecycle,phase}';
  if lifecycle_phase = 'waiting' then
    if (candidate -> 'lifecycle') - 'phase' <> '{}'::jsonb then
      raise exception using errcode = '22023', message = 'waiting lifecycle contains invalid fields';
    end if;
  elsif lifecycle_phase = 'active' then
    if candidate #>> '{lifecycle,activeTeamId}' not in ('orange', 'purple')
        or (candidate -> 'lifecycle') - array['phase', 'activeTeamId'] <> '{}'::jsonb then
      raise exception using errcode = '22023', message = 'active lifecycle is invalid';
    end if;
  elsif lifecycle_phase = 'finished' then
    if not (
      candidate -> 'lifecycle' = '{"phase":"finished","winnerTeamId":"orange"}'::jsonb
      or candidate -> 'lifecycle' = '{"phase":"finished","winnerTeamId":"purple"}'::jsonb
      or candidate -> 'lifecycle' = '{"phase":"finished","result":"draw"}'::jsonb
    ) then
      raise exception using errcode = '22023', message = 'finished lifecycle is invalid';
    end if;
  else
    raise exception using errcode = '22023', message = 'state lifecycle phase is invalid';
  end if;
end;
$$;

create or replace function public.create_game(display_name text, initial_state jsonb)
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
  if length(btrim(display_name)) not between 1 and 64 then
    raise exception using errcode = '22023', message = 'display name is invalid';
  end if;
  perform private.assert_current_state(initial_state, 0);
  if initial_state #>> '{lifecycle,phase}' <> 'waiting' then
    raise exception using errcode = '22023', message = 'initial state must be waiting';
  end if;
  raw_invite_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.game_sessions (
    invite_code_hash, schema_version, protocol_version, ruleset_version,
    content_version, revision, lifecycle_phase, active_team_id, winner_team_id
  ) values (
    pg_catalog.encode(extensions.digest(raw_invite_token, 'sha256'), 'hex'),
    (initial_state ->> 'schemaVersion')::integer,
    2,
    initial_state ->> 'rulesetVersion',
    initial_state ->> 'contentVersion',
    0, 'waiting', null, null
  ) returning id into created_game_id;
  insert into public.game_members(game_id, user_id, role, display_name)
  values (created_game_id, caller_id, 'orange', display_name);
  insert into public.game_states(game_id, revision, state, checksum)
  values (created_game_id, 0, initial_state, 'pending');
  return query select created_game_id, caller_id, 'orange'::text, raw_invite_token;
end;
$$;

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
    invite_code_hash, map_name, schema_version, protocol_version, ruleset_version,
    content_version, revision, lifecycle_phase, active_team_id, winner_team_id
  ) values (
    pg_catalog.encode(extensions.digest(raw_invite_token, 'sha256'), 'hex'),
    pg_catalog.btrim($3),
    (initial_state ->> 'schemaVersion')::integer,
    2,
    initial_state ->> 'rulesetVersion',
    initial_state ->> 'contentVersion',
    0, 'waiting', null, null
  ) returning id into created_game_id;
  insert into public.game_members(game_id, user_id, role, display_name)
  values (created_game_id, caller_id, 'orange', display_name);
  insert into public.game_states(game_id, revision, state, checksum)
  values (created_game_id, 0, initial_state, 'pending');
  return query select created_game_id, caller_id, 'orange'::text, raw_invite_token;
end;
$$;
