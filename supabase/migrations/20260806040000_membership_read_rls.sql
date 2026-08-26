create or replace function private.is_game_member(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.game_members gm
    where gm.game_id = target_game_id
      and gm.user_id = auth.uid()
  );
$$;

comment on function private.is_game_member(uuid) is
  'RLS helper owned by the migration role so game_members policies do not recurse.';

revoke all on all functions in schema private from public;
grant usage on schema private to authenticated;
grant execute on function private.is_game_member(uuid) to authenticated;

alter table public.game_sessions enable row level security;
alter table public.game_members enable row level security;
alter table public.game_states enable row level security;
alter table public.game_actions enable row level security;

create policy game_sessions_members_read
on public.game_sessions
for select
to authenticated
using (private.is_game_member(id));

create policy game_members_members_read
on public.game_members
for select
to authenticated
using (private.is_game_member(game_id));

create policy game_states_members_read
on public.game_states
for select
to authenticated
using (private.is_game_member(game_id));

create policy game_actions_members_read
on public.game_actions
for select
to authenticated
using (private.is_game_member(game_id));

revoke all on table public.game_sessions from anon, authenticated;
revoke all on table public.game_members from anon, authenticated;
revoke all on table public.game_states from anon, authenticated;
revoke all on table public.game_actions from anon, authenticated;

grant select on table public.game_sessions to authenticated;
grant select on table public.game_members to authenticated;
grant select on table public.game_states to authenticated;
grant select on table public.game_actions to authenticated;
