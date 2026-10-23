-- Antonelli Baseball accounts.
-- Public card rows are readable without a login.
-- Test numbers, logs, XP, and the game plan live in player_private.
-- Run this in the Supabase SQL editor or with `supabase db push`.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'player' check (role in ('coach', 'player')),
  player_id text,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.players (
  id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  team text,
  age integer,
  age_group text,
  position text,
  secondary_position text,
  bats text,
  throws text,
  player_type text,
  archetype text,
  height text,
  weight text,
  hometown text,
  class_year text,
  photo text,
  overall integer,
  tier text,
  subgrades jsonb not null default '[]'::jsonb,
  public_card jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_private (
  player_id text primary key references public.players (id) on delete cascade,
  metrics jsonb not null default '{}'::jsonb,
  reading_log jsonb not null default '{}'::jsonb,
  history jsonb not null default '{}'::jsonb,
  road jsonb not null default '{}'::jsonb,
  document jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Parent email for 12U and younger still maps to one player.
-- Email is not on the public players row.
create table public.player_accounts (
  player_id text primary key references public.players (id) on delete cascade,
  email text,
  invited_at timestamptz,
  created_at timestamptz not null default now()
);

create index players_team_idx on public.players (team);
create index players_user_idx on public.players (user_id);
create unique index player_accounts_email_key
  on public.player_accounts (lower(email))
  where email is not null and email <> '';

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger players_touch
  before update on public.players
  for each row execute function public.touch_updated_at();

create trigger player_private_touch
  before update on public.player_private
  for each row execute function public.touch_updated_at();

-- Security definer so the policy on profiles does not call itself.
create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'coach'
  );
$$;

revoke all on function public.is_coach() from public;
grant execute on function public.is_coach() to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linked text;
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'player',
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  -- Link only when the invited email matches the player row.
  -- Signup metadata cannot grant coach, and cannot claim someone else's card.
  update public.players p
  set user_id = new.id
  from public.player_accounts a
  where a.player_id = p.id
    and lower(a.email) = lower(new.email)
    and (p.user_id is null or p.user_id = new.id)
  returning p.id into linked;

  if linked is not null then
    update public.profiles
    set player_id = linked
    where id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SQL editor and the service role have no signed-in user, so they can set coach.
  -- A signed-in browser session cannot change its own role.
  if auth.uid() is not null and auth.role() is distinct from 'service_role' then
    new.role = old.role;
    if not public.is_coach() then
      new.player_id = old.player_id;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_role() from public, anon, authenticated;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.player_private enable row level security;
alter table public.player_accounts enable row level security;

create policy profiles_read_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_coach());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_coach())
  with check (id = auth.uid() or public.is_coach());

create policy players_public_read on public.players
  for select to anon, authenticated
  using (true);

create policy players_coach_write on public.players
  for insert to authenticated
  with check (public.is_coach());

create policy players_coach_update on public.players
  for update to authenticated
  using (public.is_coach())
  with check (public.is_coach());

create policy players_coach_delete on public.players
  for delete to authenticated
  using (public.is_coach());

create policy private_read on public.player_private
  for select to authenticated
  using (
    public.is_coach()
    or exists (
      select 1 from public.players p
      where p.id = player_private.player_id
        and p.user_id = auth.uid()
    )
  );

create policy private_insert on public.player_private
  for insert to authenticated
  with check (
    public.is_coach()
    or exists (
      select 1 from public.players p
      where p.id = player_private.player_id
        and p.user_id = auth.uid()
    )
  );

create policy private_update on public.player_private
  for update to authenticated
  using (
    public.is_coach()
    or exists (
      select 1 from public.players p
      where p.id = player_private.player_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    public.is_coach()
    or exists (
      select 1 from public.players p
      where p.id = player_private.player_id
        and p.user_id = auth.uid()
    )
  );

create policy accounts_coach on public.player_accounts
  for all to authenticated
  using (public.is_coach())
  with check (public.is_coach());

grant select on public.players to anon, authenticated;
grant insert, update, delete on public.players to authenticated;
grant select, insert, update, delete on public.player_private to authenticated;
grant select, insert, update, delete on public.player_accounts to authenticated;
grant select, update on public.profiles to authenticated;
