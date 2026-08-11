create schema if not exists private;

create or replace function private.assert_supported_schema_version(candidate integer)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if candidate is distinct from 1 then
    raise exception using
      errcode = '22023',
      message = format('unsupported game schema version: %s', candidate);
  end if;
end;
$$;

create or replace function private.assert_supported_protocol_version(candidate integer)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if candidate is distinct from 1 then
    raise exception using
      errcode = '22023',
      message = format('unsupported game protocol version: %s', candidate);
  end if;
end;
$$;

comment on function private.assert_supported_schema_version(integer) is
  'Shared guard for RPC boundaries that accept versioned gameplay payloads.';

comment on function private.assert_supported_protocol_version(integer) is
  'Shared guard for RPC boundaries that accept action envelopes.';

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  invite_code_hash text not null unique,
  schema_version integer not null,
  status text not null,
  revision integer not null default 0,
  active_team text,
  winner_team text,
  win_condition text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_sessions_invite_code_hash_not_blank
    check (length(btrim(invite_code_hash)) > 0),
  constraint game_sessions_supported_schema_version
    check (schema_version = 1),
  constraint game_sessions_status_valid
    check (status in ('waiting', 'active', 'finished')),
  constraint game_sessions_revision_nonnegative
    check (revision >= 0),
  constraint game_sessions_active_team_valid
    check (active_team is null or active_team in ('orange', 'purple')),
  constraint game_sessions_winner_team_valid
    check (winner_team is null or winner_team in ('orange', 'purple')),
  constraint game_sessions_win_condition_valid
    check (win_condition in ('capital-or-combat-elimination', 'combat-elimination')),
  constraint game_sessions_lifecycle_consistent check (
    (status = 'waiting' and active_team is null and winner_team is null)
    or (status = 'active' and active_team is not null and winner_team is null)
    or (status = 'finished' and active_team is null and winner_team is not null)
  ),
  unique (id, revision)
);

comment on table public.game_sessions is
  'Canonical owner of schema version, win condition, lifecycle, revision, active team, winner, invite metadata, and timestamps.';

create table public.game_members (
  game_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (game_id, user_id),
  constraint game_members_role_valid
    check (role in ('orange', 'purple', 'spectator')),
  constraint game_members_display_name_valid
    check (length(btrim(display_name)) between 1 and 64)
);

comment on table public.game_members is
  'Canonical owner of game membership, player seats, roles, and display names.';

create unique index game_members_one_orange_per_game
  on public.game_members (game_id)
  where role = 'orange';

create unique index game_members_one_purple_per_game
  on public.game_members (game_id)
  where role = 'purple';

create index game_members_user_id_idx
  on public.game_members (user_id);

create table public.game_states (
  game_id uuid primary key references public.game_sessions(id) on delete cascade,
  revision integer not null,
  state jsonb not null,
  checksum text,
  updated_at timestamptz not null default now(),
  constraint game_states_revision_nonnegative
    check (revision >= 0),
  constraint game_states_payload_shape check (
    jsonb_typeof(state) = 'object'
    and jsonb_typeof(state -> 'map') = 'array'
    and jsonb_typeof(state -> 'money') = 'object'
    and jsonb_typeof(state #> '{money,orange}') = 'number'
    and jsonb_typeof(state #> '{money,purple}') = 'number'
    and state - array['map', 'money'] = '{}'::jsonb
  ),
  constraint game_states_session_revision_fk
    foreign key (game_id, revision)
    references public.game_sessions(id, revision)
    on update cascade
);

comment on table public.game_states is
  'Canonical schema-versioned gameplay payload (map and money only); its revision must match game_sessions at transaction commit.';

create table public.game_actions (
  game_id uuid not null references public.game_sessions(id) on delete cascade,
  revision integer not null,
  protocol_version integer not null,
  action_id uuid not null,
  actor_user_id uuid not null,
  actor_team text not null,
  action jsonb not null,
  events jsonb not null,
  created_at timestamptz not null default now(),
  primary key (game_id, revision),
  constraint game_actions_action_id_unique unique (game_id, action_id),
  constraint game_actions_actor_membership_fk
    foreign key (game_id, actor_user_id)
    references public.game_members(game_id, user_id),
  constraint game_actions_revision_positive
    check (revision > 0),
  constraint game_actions_supported_protocol_version
    check (protocol_version = 1),
  constraint game_actions_actor_team_valid
    check (actor_team in ('orange', 'purple')),
  constraint game_actions_action_shape
    check (jsonb_typeof(action) = 'object'),
  constraint game_actions_events_shape
    check (jsonb_typeof(events) = 'array')
);

comment on table public.game_actions is
  'Canonical ordered action/event history; protocol version selects the runtime action and event parsers.';

create index game_actions_actor_user_id_idx
  on public.game_actions (actor_user_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger game_sessions_set_updated_at
before update on public.game_sessions
for each row execute function private.set_updated_at();

create trigger game_states_set_updated_at
before update on public.game_states
for each row execute function private.set_updated_at();
