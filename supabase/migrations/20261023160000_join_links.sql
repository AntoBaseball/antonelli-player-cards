-- Personal sign-up links. Matt emails these from Gmail.
-- A token is single-use. Public sign-up is rejected unless the email is an open invite.
-- Dashboard and service-role inserts are allowed so Matt's own login can be created by hand.
-- Idempotent: safe to run once on a database that already has init_accounts + harden_functions.

alter table public.player_accounts
  add column if not exists join_token text,
  add column if not exists status text,
  add column if not exists joined_at timestamptz;

update public.player_accounts
set status = 'invited'
where status is null or status = '';

alter table public.player_accounts
  alter column status set default 'invited';

alter table public.player_accounts
  alter column status set not null;

alter table public.player_accounts
  drop constraint if exists player_accounts_status_check;

alter table public.player_accounts
  add constraint player_accounts_status_check
  check (status in ('invited', 'joined'));

create unique index if not exists player_accounts_join_token_key
  on public.player_accounts (join_token)
  where join_token is not null and join_token <> '';

create or replace function public.player_accounts_prepare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.join_token is null or new.join_token = '' then
    -- 32 bytes, URL-safe. Two uuids, dashes removed.
    new.join_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  end if;
  if new.status is null or new.status = '' then
    new.status := 'invited';
  end if;
  if new.invited_at is null and new.status = 'invited' then
    new.invited_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.player_accounts_prepare() from public, anon, authenticated;

drop trigger if exists player_accounts_prepare on public.player_accounts;
create trigger player_accounts_prepare
  before insert or update on public.player_accounts
  for each row execute function public.player_accounts_prepare();

update public.player_accounts
set join_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where join_token is null or join_token = '';

-- Name and player id for one unused token. Also returns that row's email so the
-- sign-up form can lock the field. The link itself does not contain the address.
-- Any other token returns zero rows, so invites cannot be listed or guessed.
create or replace function public.lookup_join_token(token text)
returns table (player_id text, name text, email text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, a.email
  from public.player_accounts a
  join public.players p on p.id = a.player_id
  where a.status = 'invited'
    and a.join_token is not null
    and a.join_token = token
    and char_length(token) >= 32;
$$;

revoke all on function public.lookup_join_token(text) from public;
grant execute on function public.lookup_join_token(text) to anon, authenticated;

create or replace function public.enforce_roster_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Supabase Auth inserts users over its own connection, so no request JWT role is
  -- visible here. Enforce for every insert: the email must be an open invite AND the
  -- sign-up must carry that invite's personal join token (passed as user metadata).
  -- Coaches/admins are added by temporarily disabling this trigger in the SQL editor.
  if exists (
    select 1
    from public.player_accounts a
    where a.status = 'invited'
      and a.email is not null and a.email <> ''
      and lower(a.email) = lower(coalesce(new.email, ''))
      and a.join_token is not null
      and a.join_token = coalesce(new.raw_user_meta_data->>'join_token', '')
  ) then
    return new;
  end if;

  raise exception 'This email is not on the Antonelli roster. Use the sign-up link from your coach.';
end;
$$;

revoke all on function public.enforce_roster_signup() from public, anon, authenticated;

drop trigger if exists enforce_roster_signup on auth.users;
create trigger enforce_roster_signup
  before insert on auth.users
  for each row execute function public.enforce_roster_signup();

-- Still links the card by email. Also burns the invite so the token is single-use.
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

  update public.player_accounts
  set status = 'joined',
      joined_at = coalesce(joined_at, now())
  where lower(email) = lower(new.email)
    and status is distinct from 'joined';

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
