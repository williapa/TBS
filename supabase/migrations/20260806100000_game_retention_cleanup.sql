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

revoke all on table private.game_retention_policy from public, anon, authenticated;

comment on table private.game_retention_policy is
  'Operator-reviewed retention intervals. NULL active_after preserves resumable games indefinitely by default.';

create or replace function private.preview_game_cleanup(as_of timestamptz default pg_catalog.now())
returns table (
  game_id uuid,
  category text,
  status text,
  updated_at timestamptz,
  eligible boolean,
  member_rows bigint,
  action_rows bigint,
  state_rows bigint,
  estimated_bytes bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with inventory as (
    select
      s.id as game_id,
      s.status,
      s.updated_at,
      case
        when s.status = 'waiting' then 'waiting'
        when s.status = 'finished' then 'finished'
        when s.status = 'active' and actions.action_rows = 0 then 'abandoned'
        else 'active'
      end as category,
      members.member_rows,
      actions.action_rows,
      states.state_rows,
      pg_catalog.pg_column_size(s)::bigint
        + members.member_bytes + actions.action_bytes + states.state_bytes as estimated_bytes
    from public.game_sessions s
    cross join private.game_retention_policy policy
    cross join lateral (
      select count(*)::bigint as member_rows,
        coalesce(sum(pg_catalog.pg_column_size(member)), 0)::bigint as member_bytes
      from public.game_members member where member.game_id = s.id
    ) members
    cross join lateral (
      select count(*)::bigint as action_rows,
        coalesce(sum(pg_catalog.pg_column_size(action_row)), 0)::bigint as action_bytes
      from public.game_actions action_row where action_row.game_id = s.id
    ) actions
    cross join lateral (
      select count(*)::bigint as state_rows,
        coalesce(sum(pg_catalog.pg_column_size(state_row)), 0)::bigint as state_bytes
      from public.game_states state_row where state_row.game_id = s.id
    ) states
    where policy.singleton
  )
  select
    inventory.game_id,
    inventory.category,
    inventory.status,
    inventory.updated_at,
    case inventory.category
      when 'waiting' then inventory.updated_at <= as_of - policy.waiting_after
      when 'abandoned' then inventory.updated_at <= as_of - policy.abandoned_after
      when 'active' then policy.active_after is not null and inventory.updated_at <= as_of - policy.active_after
      when 'finished' then inventory.updated_at <= as_of - policy.finished_after
      else false
    end as eligible,
    inventory.member_rows,
    inventory.action_rows,
    inventory.state_rows,
    inventory.estimated_bytes
  from inventory
  cross join private.game_retention_policy policy
  where policy.singleton
  order by inventory.updated_at, inventory.game_id;
$$;

create or replace function private.cleanup_games(
  as_of timestamptz default pg_catalog.now(),
  dry_run boolean default true
)
returns table (
  game_id uuid,
  category text,
  status text,
  updated_at timestamptz,
  member_rows bigint,
  action_rows bigint,
  state_rows bigint,
  estimated_bytes bigint,
  was_deleted boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if dry_run then
    return query
    select p.game_id, p.category, p.status, p.updated_at,
      p.member_rows, p.action_rows, p.state_rows, p.estimated_bytes, false
    from private.preview_game_cleanup(as_of) p
    where p.eligible;
    return;
  end if;

  return query
  with candidates as materialized (
    select * from private.preview_game_cleanup(as_of) where eligible
  ), locked as materialized (
    select s.id
    from public.game_sessions s
    join candidates c on c.game_id = s.id and c.updated_at = s.updated_at
    for update of s skip locked
  ), deleted as (
    delete from public.game_sessions s
    using candidates c, locked l
    where s.id = c.game_id and s.id = l.id and s.updated_at = c.updated_at
    returning c.game_id, c.category, c.status, c.updated_at,
      c.member_rows, c.action_rows, c.state_rows, c.estimated_bytes
  )
  select deleted.*, true from deleted;
end;
$$;

revoke all on function private.preview_game_cleanup(timestamptz) from public, anon, authenticated;
revoke all on function private.cleanup_games(timestamptz, boolean) from public, anon, authenticated;

comment on function private.preview_game_cleanup(timestamptz) is
  'Read-only lifecycle classification, eligibility, row counts, and approximate tuple bytes for operator review.';
comment on function private.cleanup_games(timestamptz, boolean) is
  'Defaults to dry-run. Execute with dry_run=false only after reviewing preview output; changed or locked sessions are skipped.';
