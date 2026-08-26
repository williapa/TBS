-- Forward-only prototype reset: all pre-canonical games and runtime structures are unsupported.
drop function if exists public.create_game(integer, text, text, jsonb);
drop function if exists public.join_game(text, text, text);
drop function if exists public.get_game_snapshot(uuid);
drop function if exists public.get_game_actions(uuid, integer, integer);
drop function if exists public.submit_game_action(
  uuid, uuid, integer, integer, jsonb, jsonb, jsonb, text, text, text
);
drop function if exists public.commit_game_action(
  uuid, uuid, uuid, integer, text, text, integer,
  jsonb, jsonb, jsonb, text, text, text
);
drop table if exists public.game_actions cascade;
drop table if exists public.game_states cascade;
drop table if exists public.game_members cascade;
drop table if exists public.game_sessions cascade;
drop schema if exists private cascade;

create schema private;

create or replace function private.max_state_bytes()
returns integer language sql immutable set search_path = '' as $$ select 1048576; $$;
create or replace function private.max_action_bytes()
returns integer language sql immutable set search_path = '' as $$ select 16384; $$;
create or replace function private.max_event_bytes()
returns integer language sql immutable set search_path = '' as $$ select 65536; $$;
create or replace function private.max_event_list_bytes()
returns integer language sql immutable set search_path = '' as $$ select 262144; $$;
create or replace function private.max_action_history_page_size()
returns integer language sql immutable set search_path = '' as $$ select 100; $$;

create table private.runtime_limits (
  singleton boolean primary key default true check (singleton),
  max_spectators_per_game integer not null check (max_spectators_per_game between 0 and 1000)
);
insert into private.runtime_limits (singleton, max_spectators_per_game) values (true, 20);

create table private.game_retention_policy (
  singleton boolean primary key default true check (singleton),
  waiting_after interval not null check (waiting_after > interval '0'),
  abandoned_after interval not null check (abandoned_after > interval '0'),
  active_after interval check (active_after is null or active_after > interval '0'),
  finished_after interval not null check (finished_after > interval '0')
);
insert into private.game_retention_policy (
  singleton, waiting_after, abandoned_after, active_after, finished_after
) values (true, interval '7 days', interval '30 days', null, interval '90 days');

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
      or candidate ->> 'rulesetVersion' <> 'standard@1'
      or candidate ->> 'contentVersion' <> 'standard@1' then
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
    if candidate #>> '{lifecycle,winnerTeamId}' not in ('orange', 'purple')
        or (candidate -> 'lifecycle') - array['phase', 'winnerTeamId'] <> '{}'::jsonb then
      raise exception using errcode = '22023', message = 'finished lifecycle is invalid';
    end if;
  else
    raise exception using errcode = '22023', message = 'state lifecycle phase is invalid';
  end if;
end;
$$;

create table public.game_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  invite_code_hash text not null unique check (length(btrim(invite_code_hash)) > 0),
  schema_version integer not null default 2 check (schema_version = 2),
  protocol_version integer not null default 2 check (protocol_version = 2),
  ruleset_version text not null default 'standard@1' check (ruleset_version = 'standard@1'),
  content_version text not null default 'standard@1' check (content_version = 'standard@1'),
  revision integer not null default 0 check (revision >= 0),
  lifecycle_phase text not null check (lifecycle_phase in ('waiting', 'active', 'finished')),
  active_team_id text check (active_team_id is null or active_team_id in ('orange', 'purple')),
  winner_team_id text check (winner_team_id is null or winner_team_id in ('orange', 'purple')),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint game_sessions_lifecycle_consistent check (
    (lifecycle_phase = 'waiting' and active_team_id is null and winner_team_id is null)
    or (lifecycle_phase = 'active' and active_team_id is not null and winner_team_id is null)
    or (lifecycle_phase = 'finished' and active_team_id is null and winner_team_id is not null)
  ),
  unique (id, revision)
);

create table public.game_members (
  game_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('orange', 'purple', 'spectator')),
  display_name text not null check (length(btrim(display_name)) between 1 and 64),
  joined_at timestamptz not null default pg_catalog.now(),
  primary key (game_id, user_id)
);
create unique index game_members_one_orange_per_game on public.game_members(game_id) where role = 'orange';
create unique index game_members_one_purple_per_game on public.game_members(game_id) where role = 'purple';
create index game_members_user_id_idx on public.game_members(user_id);

create table public.game_states (
  game_id uuid primary key references public.game_sessions(id) on delete cascade,
  revision integer not null check (revision >= 0),
  state jsonb not null check (
    pg_catalog.jsonb_typeof(state) = 'object'
    and state -> 'schemaVersion' = '2'::jsonb
    and pg_catalog.jsonb_typeof(state -> 'revision') = 'number'
    and (state ->> 'revision')::integer = revision
  ),
  checksum text not null,
  updated_at timestamptz not null default pg_catalog.now(),
  constraint game_states_session_revision_fk
    foreign key (game_id, revision)
    references public.game_sessions(id, revision)
    on update cascade
    deferrable initially deferred
);

create table public.game_actions (
  game_id uuid not null references public.game_sessions(id) on delete cascade,
  revision integer not null check (revision > 0),
  protocol_version integer not null check (protocol_version = 2),
  ruleset_version text not null check (ruleset_version = 'standard@1'),
  content_version text not null check (content_version = 'standard@1'),
  action_id uuid not null,
  actor_user_id uuid not null,
  actor_team_id text not null check (actor_team_id in ('orange', 'purple')),
  action jsonb not null check (pg_catalog.jsonb_typeof(action) = 'object'),
  events jsonb not null check (pg_catalog.jsonb_typeof(events) = 'array'),
  result_state_checksum text not null,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (game_id, revision),
  unique (game_id, action_id),
  foreign key (game_id, actor_user_id)
    references public.game_members(game_id, user_id)
);
create index game_actions_actor_user_id_idx on public.game_actions(actor_user_id);

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := pg_catalog.now(); return new; end;
$$;
create trigger game_sessions_set_updated_at before update on public.game_sessions
for each row execute function private.set_updated_at();

create or replace function private.prepare_game_state()
returns trigger language plpgsql set search_path = '' as $$
begin
  perform private.assert_current_state(new.state, new.revision);
  new.checksum := pg_catalog.encode(extensions.digest(new.state::text, 'sha256'), 'hex');
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
create trigger game_states_prepare before insert or update on public.game_states
for each row execute function private.prepare_game_state();

create or replace function private.max_spectators_per_game()
returns integer language sql stable security definer set search_path = '' as $$
  select max_spectators_per_game from private.runtime_limits where singleton;
$$;
create or replace function private.enforce_spectator_limit()
returns trigger language plpgsql set search_path = '' as $$
declare spectator_count integer;
begin
  if new.role <> 'spectator' then return new; end if;
  select count(*) into spectator_count from public.game_members
  where game_id = new.game_id and role = 'spectator';
  if spectator_count >= private.max_spectators_per_game() then
    raise exception using errcode = 'P0001',
      message = pg_catalog.format(
        'spectator limit reached (maximum %s)',
        private.max_spectators_per_game()
      );
  end if;
  return new;
end;
$$;
create trigger game_members_enforce_spectator_limit before insert on public.game_members
for each row execute function private.enforce_spectator_limit();

create or replace function private.is_game_member(target_game_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.game_members
    where game_id = target_game_id and user_id = auth.uid()
  );
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
    invite_code_hash, revision, lifecycle_phase, active_team_id, winner_team_id
  ) values (
    pg_catalog.encode(extensions.digest(raw_invite_token, 'sha256'), 'hex'),
    0, 'waiting', null, null
  ) returning id into created_game_id;
  insert into public.game_members(game_id, user_id, role, display_name)
  values (created_game_id, caller_id, 'orange', display_name);
  insert into public.game_states(game_id, revision, state, checksum)
  values (created_game_id, 0, initial_state, 'pending');
  return query select created_game_id, caller_id, 'orange'::text, raw_invite_token;
end;
$$;

create or replace function public.join_game(
  invite_token text,
  join_intent text,
  requested_display_name text
)
returns table (game_id uuid, member_id uuid, role text, display_name text)
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  target_session public.game_sessions%rowtype;
  assigned_role text;
  stored_display_name text;
  activated_state jsonb;
begin
  if caller_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if join_intent not in ('player', 'spectator') then
    raise exception using errcode = '22023', message = 'join intent must be player or spectator';
  end if;
  select * into target_session from public.game_sessions
  where invite_code_hash = pg_catalog.encode(
    extensions.digest(coalesce(invite_token, ''), 'sha256'), 'hex'
  ) for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'invalid invite token';
  end if;
  select gm.role, gm.display_name into assigned_role, stored_display_name
  from public.game_members gm
  where gm.game_id = target_session.id and gm.user_id = caller_id;
  if not found then
    if join_intent = 'player'
        and target_session.lifecycle_phase = 'waiting'
        and not exists (
          select 1 from public.game_members available_member
          where available_member.game_id = target_session.id
            and available_member.role = 'purple'
        ) then
      assigned_role := 'purple';
    else
      assigned_role := 'spectator';
    end if;
    stored_display_name := requested_display_name;
    insert into public.game_members(game_id, user_id, role, display_name)
    values (target_session.id, caller_id, assigned_role, stored_display_name);
    if assigned_role = 'purple' then
      select pg_catalog.jsonb_set(
        pg_catalog.jsonb_set(
          stored_state.state,
          '{lifecycle}',
          '{"phase":"active","activeTeamId":"purple"}'::jsonb
        ),
        '{turn}',
        '{"number":1}'::jsonb
      ) into activated_state
      from public.game_states stored_state
      where stored_state.game_id = target_session.id;
      perform private.assert_current_state(activated_state, target_session.revision);
      update public.game_states updated_state set state = activated_state
      where updated_state.game_id = target_session.id;
      update public.game_sessions updated_session set
        lifecycle_phase = 'active', active_team_id = 'purple', winner_team_id = null
      where updated_session.id = target_session.id;
    end if;
  end if;
  return query select target_session.id, caller_id, assigned_role, stored_display_name;
end;
$$;

create or replace function public.get_game_snapshot(requested_game_id uuid)
returns table (game_id uuid, players jsonb, spectator_count integer, state jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if not private.is_game_member(requested_game_id) then
    raise exception using errcode = '42501', message = 'game membership required';
  end if;
  return query
  select
    s.id,
    coalesce((
      select pg_catalog.jsonb_object_agg(
        gm.role,
        pg_catalog.jsonb_build_object(
          'memberId', gm.user_id::text,
          'displayName', gm.display_name
        )
      ) from public.game_members gm
      where gm.game_id = s.id and gm.role in ('orange', 'purple')
    ), '{}'::jsonb),
    (select count(*)::integer from public.game_members gm
      where gm.game_id = s.id and gm.role = 'spectator'),
    gs.state
  from public.game_sessions s
  join public.game_states gs on gs.game_id = s.id and gs.revision = s.revision
  where s.id = requested_game_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'game snapshot not found';
  end if;
end;
$$;

create or replace function public.get_game_actions(
  requested_game_id uuid,
  after_revision integer,
  requested_limit integer
)
returns table (
  protocol_version integer,
  action_id uuid,
  revision integer,
  actor_team_id text,
  action jsonb,
  events jsonb
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if not private.is_game_member(requested_game_id) then
    raise exception using errcode = '42501', message = 'game membership required';
  end if;
  if after_revision is null or after_revision < 0
      or requested_limit is null or requested_limit < 1
      or requested_limit > private.max_action_history_page_size() then
    raise exception using errcode = '22023', message = 'invalid action history bounds';
  end if;
  return query select
    ga.protocol_version, ga.action_id, ga.revision, ga.actor_team_id, ga.action, ga.events
  from public.game_actions ga
  where ga.game_id = requested_game_id and ga.revision > after_revision
  order by ga.revision limit requested_limit;
end;
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
  proposed_state jsonb
)
returns table (
  idempotent boolean,
  committed_action_revision integer,
  protocol_version integer,
  action_id uuid,
  actor_team_id text,
  action jsonb,
  events jsonb,
  state jsonb
)
language plpgsql security definer set search_path = '' as $$
declare
  caller_role text;
  locked_session public.game_sessions%rowtype;
  prior_action public.game_actions%rowtype;
  next_revision integer;
  proposed_phase text;
  proposed_active_team text;
  proposed_winner_team text;
  proposed_checksum text;
  event_value jsonb;
begin
  if requested_caller_id is null then
    raise exception using errcode = '28000', message = 'authenticated caller ID is required';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(requested_game_id::text, 0)
  );
  select gm.role into caller_role from public.game_members gm
  where gm.game_id = requested_game_id and gm.user_id = requested_caller_id;
  if not found then
    raise exception using errcode = '42501', message = 'game membership required';
  end if;
  if caller_role = 'spectator' then
    raise exception using errcode = '42501', message = 'spectators cannot submit actions';
  end if;
  select * into locked_session from public.game_sessions
  where id = requested_game_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'game not found';
  end if;

  select ga.* into prior_action from public.game_actions ga
  where ga.game_id = requested_game_id and ga.action_id = submitted_action_id;
  if found then
    if prior_action.actor_user_id <> requested_caller_id
        or prior_action.protocol_version <> submitted_protocol_version
        or prior_action.ruleset_version <> submitted_ruleset_version
        or prior_action.content_version <> submitted_content_version
        or prior_action.revision - 1 <> expected_revision
        or prior_action.action <> submitted_action
        or prior_action.events <> submitted_events then
      raise exception using errcode = '23505',
        message = 'action ID conflicts with a previously committed action';
    end if;
    return query select
      true, prior_action.revision, prior_action.protocol_version,
      prior_action.action_id, prior_action.actor_team_id,
      prior_action.action, prior_action.events, gs.state
    from public.game_states gs where gs.game_id = requested_game_id;
    return;
  end if;

  if submitted_protocol_version <> 2
      or submitted_ruleset_version <> locked_session.ruleset_version
      or submitted_content_version <> locked_session.content_version
      or submitted_protocol_version <> locked_session.protocol_version then
    raise exception using errcode = '22023',
      message = 'submitted engine versions do not match the pinned game versions';
  end if;
  if locked_session.revision <> expected_revision then
    raise exception using errcode = 'PT409', message = pg_catalog.format(
      'stale game revision: expected %s but current revision is %s',
      expected_revision, locked_session.revision
    );
  end if;
  if locked_session.lifecycle_phase <> 'active' then
    raise exception using errcode = '55000', message = 'game is not active';
  end if;
  if locked_session.active_team_id <> caller_role then
    raise exception using errcode = '42501', message = 'caller does not own the active turn';
  end if;
  if pg_catalog.jsonb_typeof(submitted_action) <> 'object'
      or pg_catalog.octet_length(pg_catalog.convert_to(submitted_action::text, 'UTF8'))
        > private.max_action_bytes() then
    raise exception using errcode = '22023', message = 'submitted action is invalid or too large';
  end if;
  if pg_catalog.jsonb_typeof(submitted_events) <> 'array'
      or pg_catalog.octet_length(pg_catalog.convert_to(submitted_events::text, 'UTF8'))
        > private.max_event_list_bytes() then
    raise exception using errcode = '22023', message = 'submitted events are invalid or too large';
  end if;
  for event_value in select value from pg_catalog.jsonb_array_elements(submitted_events) loop
    if pg_catalog.octet_length(pg_catalog.convert_to(event_value::text, 'UTF8'))
        > private.max_event_bytes() then
      raise exception using errcode = '22023', message = 'submitted event is too large';
    end if;
  end loop;

  next_revision := locked_session.revision + 1;
  perform private.assert_current_state(proposed_state, next_revision);
  proposed_phase := proposed_state #>> '{lifecycle,phase}';
  proposed_active_team := case when proposed_phase = 'active'
    then proposed_state #>> '{lifecycle,activeTeamId}' else null end;
  proposed_winner_team := case when proposed_phase = 'finished'
    then proposed_state #>> '{lifecycle,winnerTeamId}' else null end;
  proposed_checksum := pg_catalog.encode(
    extensions.digest(proposed_state::text, 'sha256'), 'hex'
  );

  insert into public.game_actions (
    game_id, revision, protocol_version, ruleset_version, content_version,
    action_id, actor_user_id, actor_team_id, action, events, result_state_checksum
  ) values (
    requested_game_id, next_revision, submitted_protocol_version,
    submitted_ruleset_version, submitted_content_version, submitted_action_id,
    requested_caller_id, caller_role, submitted_action, submitted_events, proposed_checksum
  );
  update public.game_states committed_state
  set revision = next_revision, state = proposed_state
  where committed_state.game_id = requested_game_id;
  update public.game_sessions committed_session set
    revision = next_revision,
    lifecycle_phase = proposed_phase,
    active_team_id = proposed_active_team,
    winner_team_id = proposed_winner_team
  where committed_session.id = requested_game_id;

  return query select
    false, next_revision, submitted_protocol_version, submitted_action_id,
    caller_role, submitted_action, submitted_events, proposed_state;
end;
$$;

create or replace function private.can_receive_game_topic(candidate_topic text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare topic_game_id uuid;
begin
  if candidate_topic is null
      or candidate_topic !~ '^game:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  topic_game_id := pg_catalog.substr(candidate_topic, 6)::uuid;
  return private.is_game_member(topic_game_id);
end;
$$;

create policy game_members_receive_revision_broadcasts on realtime.messages
for select to authenticated using ((select private.can_receive_game_topic(realtime.topic())));
create policy game_members_track_presence on realtime.messages
for insert to authenticated with check (
  extension = 'presence'
  and (select private.can_receive_game_topic(realtime.topic()))
);

create or replace function private.broadcast_game_action_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into realtime.messages(payload, event, topic, private, extension)
  values (
    pg_catalog.jsonb_build_object(
      'gameId', new.game_id::text,
      'revision', new.revision,
      'actionId', new.action_id::text
    ),
    'revision', 'game:' || new.game_id::text, true, 'broadcast'
  );
  return new;
end;
$$;
create trigger game_actions_broadcast_revision after insert on public.game_actions
for each row execute function private.broadcast_game_action_revision();

alter table public.game_sessions enable row level security;
alter table public.game_members enable row level security;
alter table public.game_states enable row level security;
alter table public.game_actions enable row level security;
create policy game_sessions_members_read on public.game_sessions for select to authenticated
using (private.is_game_member(id));
create policy game_members_members_read on public.game_members for select to authenticated
using (private.is_game_member(game_id));
create policy game_states_members_read on public.game_states for select to authenticated
using (private.is_game_member(game_id));
create policy game_actions_members_read on public.game_actions for select to authenticated
using (private.is_game_member(game_id));

revoke all on table public.game_sessions, public.game_members, public.game_states,
  public.game_actions from anon, authenticated;
grant select on table public.game_sessions, public.game_members, public.game_states,
  public.game_actions to authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_game_member(uuid) to authenticated;
grant execute on function private.can_receive_game_topic(text) to authenticated;

revoke all on function public.create_game(text, jsonb) from public, anon;
revoke all on function public.join_game(text, text, text) from public, anon;
revoke all on function public.get_game_snapshot(uuid) from public, anon;
revoke all on function public.get_game_actions(uuid, integer, integer) from public, anon;
grant execute on function public.create_game(text, jsonb) to authenticated;
grant execute on function public.join_game(text, text, text) to authenticated;
grant execute on function public.get_game_snapshot(uuid) to authenticated;
grant execute on function public.get_game_actions(uuid, integer, integer) to authenticated;
revoke all on function public.commit_game_action(
  uuid, uuid, uuid, integer, text, text, integer, jsonb, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.commit_game_action(
  uuid, uuid, uuid, integer, text, text, integer, jsonb, jsonb, jsonb
) to service_role;

create or replace function private.preview_game_cleanup(as_of timestamptz default pg_catalog.now())
returns table (
  game_id uuid, category text, lifecycle_phase text, updated_at timestamptz,
  eligible boolean, member_rows bigint, action_rows bigint, state_rows bigint
)
language sql stable security definer set search_path = '' as $$
  select
    s.id,
    case
      when s.lifecycle_phase = 'waiting' then 'waiting'
      when s.lifecycle_phase = 'finished' then 'finished'
      when s.lifecycle_phase = 'active' and actions.action_rows = 0 then 'abandoned'
      else 'active'
    end,
    s.lifecycle_phase,
    s.updated_at,
    case
      when s.lifecycle_phase = 'waiting' then s.updated_at <= as_of - policy.waiting_after
      when s.lifecycle_phase = 'finished' then s.updated_at <= as_of - policy.finished_after
      when s.lifecycle_phase = 'active' and actions.action_rows = 0
        then s.updated_at <= as_of - policy.abandoned_after
      when s.lifecycle_phase = 'active' and policy.active_after is not null
        then s.updated_at <= as_of - policy.active_after
      else false
    end,
    (select count(*) from public.game_members where game_id = s.id),
    actions.action_rows,
    (select count(*) from public.game_states where game_id = s.id)
  from public.game_sessions s
  cross join private.game_retention_policy policy
  cross join lateral (
    select count(*)::bigint as action_rows from public.game_actions where game_id = s.id
  ) actions
  where policy.singleton
  order by s.updated_at, s.id;
$$;

create or replace function private.cleanup_games(
  as_of timestamptz default pg_catalog.now(),
  dry_run boolean default true
)
returns table (game_id uuid, category text, was_deleted boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if dry_run then
    return query select p.game_id, p.category, false
    from private.preview_game_cleanup(as_of) p where p.eligible;
    return;
  end if;
  return query
  with candidates as materialized (
    select p.game_id, p.category from private.preview_game_cleanup(as_of) p where p.eligible
  ), deleted as (
    delete from public.game_sessions s using candidates c
    where s.id = c.game_id returning s.id
  )
  select c.game_id, c.category, true from candidates c join deleted d on d.id = c.game_id;
end;
$$;
revoke all on function private.preview_game_cleanup(timestamptz) from public, anon, authenticated;
revoke all on function private.cleanup_games(timestamptz, boolean) from public, anon, authenticated;
