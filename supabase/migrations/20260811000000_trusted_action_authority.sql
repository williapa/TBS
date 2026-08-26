alter table public.game_sessions
  add column protocol_version integer not null default 1,
  add column ruleset_version text not null default 'standard@1',
  add column content_version text not null default 'standard@1',
  add constraint game_sessions_supported_protocol_version
    check (protocol_version = 1),
  add constraint game_sessions_supported_ruleset_version
    check (ruleset_version = 'standard@1'),
  add constraint game_sessions_supported_content_version
    check (content_version = 'standard@1');

alter table public.game_actions
  add column ruleset_version text not null default 'standard@1',
  add column content_version text not null default 'standard@1',
  add constraint game_actions_supported_ruleset_version
    check (ruleset_version = 'standard@1'),
  add constraint game_actions_supported_content_version
    check (content_version = 'standard@1');

create or replace function private.set_game_state_checksum()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.checksum := pg_catalog.encode(
    extensions.digest(new.state::text, 'sha256'),
    'hex'
  );
  return new;
end;
$$;

update public.game_states
set checksum = pg_catalog.encode(
  extensions.digest(state::text, 'sha256'),
  'hex'
);

alter table public.game_states
  alter column checksum set not null;

create trigger game_states_set_checksum
before insert or update of state on public.game_states
for each row execute function private.set_game_state_checksum();

create or replace function private.max_action_payload_bytes()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 65536;
$$;

create or replace function private.max_event_payload_bytes()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 262144;
$$;

create or replace function public.commit_game_action(
  requested_game_id uuid,
  requested_caller_id uuid,
  submitted_action_id uuid,
  submitted_protocol_version integer,
  submitted_ruleset_version text,
  submitted_content_version text,
  expected_revision integer,
  submitted_action jsonb,
  submitted_events jsonb,
  candidate_gameplay_payload jsonb,
  proposed_status text,
  proposed_active_team text,
  proposed_winner_team text
)
returns table (
  idempotent boolean,
  committed_action_revision integer,
  protocol_version integer,
  ruleset_version text,
  content_version text,
  action_id uuid,
  actor_team text,
  action jsonb,
  events jsonb,
  schema_version integer,
  status text,
  snapshot_revision integer,
  active_team text,
  winner_team text,
  win_condition text,
  gameplay_payload jsonb,
  state_checksum text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  locked_session public.game_sessions%rowtype;
  prior_action public.game_actions%rowtype;
  next_revision integer;
begin
  if requested_caller_id is null then
    raise exception using errcode = '28000', message = 'authenticated caller ID is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(requested_game_id::text, 0)
  );

  select gm.role
  into caller_role
  from public.game_members gm
  where gm.game_id = requested_game_id
    and gm.user_id = requested_caller_id;

  if not found then
    raise exception using errcode = '42501', message = 'game membership required';
  end if;
  if caller_role = 'spectator' then
    raise exception using errcode = '42501', message = 'spectators cannot submit actions';
  end if;

  select s.*
  into locked_session
  from public.game_sessions s
  where s.id = requested_game_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'game not found';
  end if;

  select ga.*
  into prior_action
  from public.game_actions ga
  where ga.game_id = requested_game_id
    and ga.action_id = submitted_action_id;

  if found then
    if prior_action.actor_user_id <> requested_caller_id
        or prior_action.protocol_version <> submitted_protocol_version
        or prior_action.ruleset_version <> submitted_ruleset_version
        or prior_action.content_version <> submitted_content_version
        or prior_action.revision - 1 <> expected_revision
        or prior_action.action <> submitted_action
        or prior_action.events <> submitted_events then
      raise exception using
        errcode = '23505',
        message = 'action ID conflicts with a previously committed action';
    end if;

    return query
    select
      true,
      prior_action.revision,
      prior_action.protocol_version,
      prior_action.ruleset_version,
      prior_action.content_version,
      prior_action.action_id,
      prior_action.actor_team,
      prior_action.action,
      prior_action.events,
      s.schema_version,
      s.status,
      s.revision,
      s.active_team,
      s.winner_team,
      s.win_condition,
      gs.state,
      gs.checksum
    from public.game_sessions s
    join public.game_states gs
      on gs.game_id = s.id and gs.revision = s.revision
    where s.id = requested_game_id;
    return;
  end if;

  perform private.assert_supported_protocol_version(submitted_protocol_version);
  if submitted_ruleset_version is distinct from locked_session.ruleset_version
      or submitted_content_version is distinct from locked_session.content_version
      or submitted_protocol_version is distinct from locked_session.protocol_version then
    raise exception using
      errcode = '22023',
      message = 'submitted engine versions do not match the pinned game versions';
  end if;
  if submitted_action_id is null then
    raise exception using errcode = '22023', message = 'action ID is required';
  end if;
  if expected_revision is null or expected_revision < 0 then
    raise exception using errcode = '22023', message = 'expected revision must be nonnegative';
  end if;
  if locked_session.revision <> expected_revision then
    raise exception using
      errcode = 'PT409',
      message = format(
        'stale game revision: expected %s but current revision is %s',
        expected_revision,
        locked_session.revision
      );
  end if;
  if locked_session.status = 'finished' then
    raise exception using errcode = '55000', message = 'game is already finished';
  end if;
  if locked_session.status <> 'active' then
    raise exception using errcode = '55000', message = 'game is not active';
  end if;
  if locked_session.active_team <> caller_role then
    raise exception using errcode = '42501', message = 'caller does not own the active turn';
  end if;
  if pg_catalog.jsonb_typeof(submitted_action) <> 'object' then
    raise exception using errcode = '22023', message = 'submitted action must be an object';
  end if;
  if pg_catalog.octet_length(pg_catalog.convert_to(submitted_action::text, 'UTF8'))
      > private.max_action_payload_bytes() then
    raise exception using errcode = '22023', message = 'submitted action exceeds the 65536 byte limit';
  end if;
  if pg_catalog.jsonb_typeof(submitted_events) <> 'array' then
    raise exception using errcode = '22023', message = 'submitted events must be an array';
  end if;
  if pg_catalog.octet_length(pg_catalog.convert_to(submitted_events::text, 'UTF8'))
      > private.max_event_payload_bytes() then
    raise exception using errcode = '22023', message = 'submitted events exceed the 262144 byte limit';
  end if;

  perform private.assert_gameplay_payload(
    locked_session.schema_version,
    candidate_gameplay_payload
  );
  perform private.assert_game_transition(
    locked_session.status,
    proposed_status,
    proposed_active_team,
    proposed_winner_team
  );

  next_revision := locked_session.revision + 1;

  insert into public.game_actions (
    game_id,
    revision,
    protocol_version,
    ruleset_version,
    content_version,
    action_id,
    actor_user_id,
    actor_team,
    action,
    events
  ) values (
    requested_game_id,
    next_revision,
    submitted_protocol_version,
    submitted_ruleset_version,
    submitted_content_version,
    submitted_action_id,
    requested_caller_id,
    caller_role,
    submitted_action,
    submitted_events
  );

  update public.game_sessions
  set
    revision = next_revision,
    status = proposed_status,
    active_team = proposed_active_team,
    winner_team = proposed_winner_team
  where id = requested_game_id;

  update public.game_states
  set state = candidate_gameplay_payload
  where game_id = requested_game_id;

  return query
  select
    false,
    next_revision,
    submitted_protocol_version,
    submitted_ruleset_version,
    submitted_content_version,
    submitted_action_id,
    caller_role,
    submitted_action,
    submitted_events,
    locked_session.schema_version,
    proposed_status,
    next_revision,
    proposed_active_team,
    proposed_winner_team,
    locked_session.win_condition,
    candidate_gameplay_payload,
    gs.checksum
  from public.game_states gs
  where gs.game_id = requested_game_id;
end;
$$;

comment on function public.commit_game_action(
  uuid, uuid, uuid, integer, text, text, integer,
  jsonb, jsonb, jsonb, text, text, text
) is
  'Service-only atomic commit for a trusted engine result; repeats identity, version, turn, revision, idempotency, lifecycle, and payload checks.';

revoke all on function public.submit_game_action(
  uuid, uuid, integer, integer, jsonb, jsonb, jsonb, text, text, text
) from public, anon, authenticated;

revoke all on function public.commit_game_action(
  uuid, uuid, uuid, integer, text, text, integer,
  jsonb, jsonb, jsonb, text, text, text
) from public, anon, authenticated;
grant execute on function public.commit_game_action(
  uuid, uuid, uuid, integer, text, text, integer,
  jsonb, jsonb, jsonb, text, text, text
) to service_role;
