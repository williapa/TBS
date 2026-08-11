create table private.runtime_limits (
  singleton boolean primary key default true check (singleton),
  max_spectators_per_game integer not null check (max_spectators_per_game between 0 and 1000)
);

insert into private.runtime_limits (singleton, max_spectators_per_game)
values (true, 20);

revoke all on table private.runtime_limits from public, anon, authenticated;

comment on table private.runtime_limits is
  'Operator-configurable runtime limits. The singleton row is intentionally inaccessible to browser roles.';

create or replace function private.max_spectators_per_game()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select max_spectators_per_game from private.runtime_limits where singleton;
$$;

create or replace function private.max_map_rows()
returns integer
language sql
immutable
set search_path = ''
as $$ select 49; $$;

create or replace function private.max_map_columns()
returns integer
language sql
immutable
set search_path = ''
as $$ select 49; $$;

create or replace function private.enforce_gameplay_resource_limits()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  map_row jsonb;
begin
  if pg_catalog.octet_length(pg_catalog.convert_to(new.state::text, 'UTF8'))
      > private.max_gameplay_payload_bytes() then
    raise exception using errcode = '22023', message = 'gameplay payload exceeds the 1048576 byte limit';
  end if;
  if pg_catalog.jsonb_typeof(new.state -> 'map') = 'array'
      and pg_catalog.jsonb_array_length(new.state -> 'map') > private.max_map_rows() then
    raise exception using errcode = '22023', message = 'gameplay map exceeds the 49 row limit';
  end if;
  if pg_catalog.jsonb_typeof(new.state -> 'map') = 'array' then
    for map_row in select value from pg_catalog.jsonb_array_elements(new.state -> 'map') loop
      if pg_catalog.jsonb_typeof(map_row) = 'array'
          and pg_catalog.jsonb_array_length(map_row) > private.max_map_columns() then
        raise exception using errcode = '22023', message = 'gameplay map exceeds the 49 column limit';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

create trigger game_states_enforce_resource_limits
before insert or update of state on public.game_states
for each row execute function private.enforce_gameplay_resource_limits();

create or replace function private.enforce_spectator_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  spectator_count integer;
  spectator_limit integer := private.max_spectators_per_game();
begin
  if new.role <> 'spectator' then return new; end if;
  select count(*) into spectator_count
  from public.game_members
  where game_id = new.game_id and role = 'spectator';
  if spectator_count >= spectator_limit then
    raise exception using
      errcode = 'P0001',
      message = pg_catalog.format('spectator limit reached (maximum %s)', spectator_limit);
  end if;
  return new;
end;
$$;

create trigger game_members_enforce_spectator_limit
before insert on public.game_members
for each row execute function private.enforce_spectator_limit();

comment on function private.max_spectators_per_game() is
  'Returns the configurable durable spectator-membership cap used by the insert trigger.';
