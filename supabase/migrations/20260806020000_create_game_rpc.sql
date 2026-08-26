create or replace function private.max_gameplay_payload_bytes()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 1048576;
$$;

comment on function private.max_gameplay_payload_bytes() is
  'Central serialized gameplay payload limit: 1 MiB in UTF-8 JSON form.';

create or replace function private.assert_gameplay_payload(
  requested_schema_version integer,
  payload jsonb
)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  map_row jsonb;
  map_cell jsonb;
begin
  perform private.assert_supported_schema_version(requested_schema_version);

  if payload is null or pg_catalog.jsonb_typeof(payload) <> 'object' then
    raise exception using errcode = '22023', message = 'gameplay payload must be an object';
  end if;
  if pg_catalog.octet_length(pg_catalog.convert_to(payload::text, 'UTF8'))
      > private.max_gameplay_payload_bytes() then
    raise exception using errcode = '22023', message = 'gameplay payload exceeds the 1048576 byte limit';
  end if;
  if payload - array['map', 'money'] <> '{}'::jsonb
      or not (payload ? 'map' and payload ? 'money') then
    raise exception using errcode = '22023', message = 'gameplay payload may contain only map and money';
  end if;
  if pg_catalog.jsonb_typeof(payload -> 'map') <> 'array'
      or pg_catalog.jsonb_array_length(payload -> 'map') = 0 then
    raise exception using errcode = '22023', message = 'gameplay map must be a non-empty row array';
  end if;
  if pg_catalog.jsonb_typeof(payload -> 'money') <> 'object'
      or (payload -> 'money') - array['orange', 'purple'] <> '{}'::jsonb
      or not ((payload -> 'money') ? 'orange' and (payload -> 'money') ? 'purple')
      or pg_catalog.jsonb_typeof(payload #> '{money,orange}') <> 'number'
      or pg_catalog.jsonb_typeof(payload #> '{money,purple}') <> 'number' then
    raise exception using errcode = '22023', message = 'gameplay money must contain numeric orange and purple values';
  end if;

  for map_row in select value from pg_catalog.jsonb_array_elements(payload -> 'map') loop
    if pg_catalog.jsonb_typeof(map_row) <> 'array'
        or pg_catalog.jsonb_array_length(map_row) = 0 then
      raise exception using errcode = '22023', message = 'each gameplay map row must be a non-empty array';
    end if;
    for map_cell in select value from pg_catalog.jsonb_array_elements(map_row) loop
      if pg_catalog.jsonb_typeof(map_cell) <> 'object'
          or pg_catalog.jsonb_typeof(map_cell -> 'row') <> 'number'
          or pg_catalog.jsonb_typeof(map_cell -> 'column') <> 'number'
          or pg_catalog.jsonb_typeof(map_cell -> 'index') <> 'number'
          or pg_catalog.jsonb_typeof(map_cell -> 'terrain') <> 'string'
          or pg_catalog.jsonb_typeof(map_cell -> 'unit') <> 'string'
          or pg_catalog.jsonb_typeof(map_cell -> 'team') <> 'string' then
        raise exception using errcode = '22023', message = 'gameplay map contains an invalid cell';
      end if;
    end loop;
  end loop;
end;
$$;

comment on function private.assert_gameplay_payload(integer, jsonb) is
  'RPC-boundary structural and size validation selected by requested schema version; clients still apply the full shared runtime parser.';

create or replace function public.create_game(
  requested_schema_version integer,
  display_name text,
  requested_win_condition text,
  initial_gameplay_payload jsonb
)
returns table (
  game_id uuid,
  member_id uuid,
  role text,
  invite_token text,
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
  created_game_id uuid;
  raw_invite_token text;
begin
  if caller_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  perform private.assert_gameplay_payload(requested_schema_version, initial_gameplay_payload);
  raw_invite_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.game_sessions (
    invite_code_hash,
    schema_version,
    status,
    revision,
    active_team,
    winner_team,
    win_condition
  ) values (
    pg_catalog.encode(extensions.digest(raw_invite_token, 'sha256'), 'hex'),
    requested_schema_version,
    'waiting',
    0,
    null,
    null,
    requested_win_condition
  ) returning id into created_game_id;

  insert into public.game_members (game_id, user_id, role, display_name)
  values (created_game_id, caller_id, 'orange', display_name);

  insert into public.game_states (game_id, revision, state)
  values (created_game_id, 0, initial_gameplay_payload);

  return query
  select
    created_game_id,
    caller_id,
    'orange'::text,
    raw_invite_token,
    requested_schema_version,
    'waiting'::text,
    0,
    null::text,
    null::text,
    requested_win_condition,
    initial_gameplay_payload;
end;
$$;

comment on function public.create_game(integer, text, text, jsonb) is
  'Atomically creates a waiting game, orange creator membership, revision-zero state, and one-time raw invite token.';

revoke all on function public.create_game(integer, text, text, jsonb) from public;
grant execute on function public.create_game(integer, text, text, jsonb) to authenticated;
