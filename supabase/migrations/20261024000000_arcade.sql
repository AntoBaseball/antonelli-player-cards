-- Quick Eyes Arcade shared scores, the daily challenge, and team boards.
-- Safe to run more than once.
-- search_path is pinned on every function. Policies use (select auth.uid()).
-- A player inserts only their own scores. Nobody updates a score row, and only a coach deletes one.
-- Reads follow the social tables: your own card, your roster team, or the coach (can_see_player).
-- An arcade team code is a board inside a roster team. You can join a code only when you can see
-- the player who made it, so a code never opens another roster team's scores.
-- The daily seed is the date, not a client secret.
-- The arcade road key is added separately in 20261024000100_arcade_road_key.sql.

create or replace function public.arcade_daily_seed(day date)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'arcade-daily-' || to_char(day, 'YYYY-MM-DD');
$$;

revoke all on function public.arcade_daily_seed(date) from public, anon, authenticated;
grant execute on function public.arcade_daily_seed(date) to authenticated;

-- Scores are capped well above what a 3-minute round can reach.
create table if not exists public.arcade_scores (
  id bigint generated always as identity primary key,
  player_id text not null references public.players (id) on delete cascade,
  game text not null,
  played_on date not null,
  seed text not null default '',
  score integer not null,
  accuracy numeric(4,3) not null,
  avg_ms integer not null,
  fastest_ms integer not null,
  highest_level integer not null,
  best_combo integer not null,
  vision integer not null,
  grade text not null,
  created_at timestamptz not null default now(),
  constraint arcade_scores_game_check check (
    game in ('color', 'zone', 'heater', 'mind', 'numbers', 'spin', 'popup', 'lightning', 'warmup')
  ),
  constraint arcade_scores_score_check check (score between 0 and 1000000),
  constraint arcade_scores_accuracy_check check (accuracy >= 0 and accuracy <= 1),
  constraint arcade_scores_ms_check check (
    avg_ms between 0 and 60000
    and fastest_ms between 0 and 60000
    and fastest_ms <= avg_ms
  ),
  constraint arcade_scores_level_check check (highest_level between 1 and 10),
  constraint arcade_scores_combo_check check (best_combo between 0 and 10000),
  constraint arcade_scores_vision_check check (vision between 0 and 99),
  constraint arcade_scores_grade_check check (
    grade = case
      when vision >= 90 then 'S'
      when vision >= 80 then 'A'
      when vision >= 70 then 'B'
      when vision >= 60 then 'C'
      else 'D'
    end
  ),
  constraint arcade_scores_seed_check check (
    seed = '' or seed = public.arcade_daily_seed(played_on)
  )
);

create index if not exists arcade_scores_player_idx on public.arcade_scores (player_id, played_on desc);
create index if not exists arcade_scores_day_idx on public.arcade_scores (played_on, score desc);

create table if not exists public.arcade_daily (
  played_on date not null,
  player_id text not null references public.players (id) on delete cascade,
  game text not null,
  score integer not null,
  seed text not null default '',
  created_at timestamptz not null default now(),
  primary key (played_on, player_id),
  constraint arcade_daily_game_check check (
    game in ('color', 'zone', 'heater', 'mind', 'numbers', 'spin', 'popup', 'lightning')
  ),
  constraint arcade_daily_score_check check (score between 0 and 1000000),
  constraint arcade_daily_seed_check check (seed = public.arcade_daily_seed(played_on))
);

create index if not exists arcade_daily_score_idx on public.arcade_daily (played_on, score desc);
create index if not exists arcade_daily_player_idx on public.arcade_daily (player_id);

create table if not exists public.arcade_teams (
  code text primary key,
  name text not null default '',
  created_by text not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint arcade_teams_code_check check (code ~ '^[A-Z0-9]{4,8}$'),
  constraint arcade_teams_name_check check (char_length(name) <= 40)
);

create index if not exists arcade_teams_created_by_idx on public.arcade_teams (created_by);

create table if not exists public.arcade_team_members (
  code text not null references public.arcade_teams (code) on delete cascade,
  player_id text not null references public.players (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (code, player_id)
);

create index if not exists arcade_team_members_player_idx on public.arcade_team_members (player_id);

create table if not exists public.arcade_h2h (
  id bigint generated always as identity primary key,
  player_id text not null references public.players (id) on delete cascade,
  game text not null,
  played_on date not null default (timezone('utc', now()))::date,
  seed text not null default '',
  score_a integer not null,
  score_b integer not null,
  created_at timestamptz not null default now(),
  constraint arcade_h2h_game_check check (
    game in ('color', 'zone', 'heater', 'mind', 'numbers', 'spin', 'popup', 'lightning')
  ),
  constraint arcade_h2h_score_check check (
    score_a between 0 and 1000000 and score_b between 0 and 1000000
  ),
  constraint arcade_h2h_seed_check check (
    seed = '' or seed = public.arcade_daily_seed(played_on)
  )
);

create index if not exists arcade_h2h_player_idx on public.arcade_h2h (player_id, played_on desc);

alter table public.arcade_scores enable row level security;
alter table public.arcade_daily enable row level security;
alter table public.arcade_teams enable row level security;
alter table public.arcade_team_members enable row level security;
alter table public.arcade_h2h enable row level security;

-- The browser sends its local date. Allow one day either side of UTC today, nothing older or later.
create or replace function public.arcade_date_ok(day date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select day is not null
    and day between (timezone('utc', now()))::date - 1 and (timezone('utc', now()))::date + 1;
$$;

revoke all on function public.arcade_date_ok(date) from public, anon, authenticated;

create or replace function public.arcade_scores_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'sign in required';
  end if;
  if tg_op <> 'INSERT' then
    raise exception 'a score stays put';
  end if;
  if new.player_id is distinct from public.my_player_id() then
    raise exception 'scores stay on your card';
  end if;
  if not public.arcade_date_ok(new.played_on) then
    raise exception 'scores are for today';
  end if;
  if new.seed is distinct from '' and new.seed is distinct from public.arcade_daily_seed(new.played_on) then
    raise exception 'the daily seed comes from the date';
  end if;
  new.created_at := now();
  return new;
end;
$$;

create or replace function public.arcade_daily_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'sign in required';
  end if;
  if new.player_id is distinct from public.my_player_id() then
    raise exception 'scores stay on your card';
  end if;
  if tg_op = 'INSERT' then
    if not public.arcade_date_ok(new.played_on) then
      raise exception 'the daily is for today';
    end if;
    new.created_at := now();
  end if;
  if tg_op = 'UPDATE' then
    if new.played_on is distinct from old.played_on
       or new.player_id is distinct from old.player_id then
      raise exception 'that daily row stays put';
    end if;
    new.created_at := old.created_at;
    if new.score < old.score then
      new.score := old.score;
      new.game := old.game;
    end if;
  end if;
  new.seed := public.arcade_daily_seed(new.played_on);
  return new;
end;
$$;

create or replace function public.arcade_teams_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'sign in required';
  end if;
  if tg_op = 'UPDATE' then
    raise exception 'a team code stays put';
  end if;
  if new.created_by is distinct from public.my_player_id() then
    raise exception 'team codes stay on your card';
  end if;
  new.created_at := now();
  return new;
end;
$$;

-- Join as yourself, and only a code made by someone on your roster team.
-- An upsert of the same row is a no-op; moving a row to another code or player is not allowed.
create or replace function public.arcade_members_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  maker text;
begin
  if (select auth.uid()) is null then
    raise exception 'sign in required';
  end if;
  if new.player_id is distinct from public.my_player_id() then
    raise exception 'join the team as yourself';
  end if;
  if tg_op = 'UPDATE' then
    if new.code is distinct from old.code or new.player_id is distinct from old.player_id then
      raise exception 'leave the code and join the new one';
    end if;
    new.joined_at := old.joined_at;
    return new;
  end if;
  select t.created_by into maker from public.arcade_teams t where t.code = new.code;
  if maker is null or not public.can_see_player(maker) then
    raise exception 'that code belongs to another team';
  end if;
  new.joined_at := now();
  return new;
end;
$$;

create or replace function public.arcade_h2h_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'sign in required';
  end if;
  if tg_op <> 'INSERT' then
    raise exception 'a score stays put';
  end if;
  if new.player_id is distinct from public.my_player_id() then
    raise exception 'scores stay on your card';
  end if;
  if not public.arcade_date_ok(new.played_on) then
    raise exception 'scores are for today';
  end if;
  new.created_at := now();
  return new;
end;
$$;

revoke all on function public.arcade_scores_guard() from public, anon, authenticated;
revoke all on function public.arcade_daily_guard() from public, anon, authenticated;
revoke all on function public.arcade_teams_guard() from public, anon, authenticated;
revoke all on function public.arcade_members_guard() from public, anon, authenticated;
revoke all on function public.arcade_h2h_guard() from public, anon, authenticated;

drop trigger if exists arcade_scores_guard on public.arcade_scores;
create trigger arcade_scores_guard
  before insert or update on public.arcade_scores
  for each row execute function public.arcade_scores_guard();

drop trigger if exists arcade_daily_guard on public.arcade_daily;
create trigger arcade_daily_guard
  before insert or update on public.arcade_daily
  for each row execute function public.arcade_daily_guard();

drop trigger if exists arcade_teams_guard on public.arcade_teams;
create trigger arcade_teams_guard
  before insert or update on public.arcade_teams
  for each row execute function public.arcade_teams_guard();

drop trigger if exists arcade_members_guard on public.arcade_team_members;
create trigger arcade_members_guard
  before insert or update on public.arcade_team_members
  for each row execute function public.arcade_members_guard();

drop trigger if exists arcade_h2h_guard on public.arcade_h2h;
create trigger arcade_h2h_guard
  before insert or update on public.arcade_h2h
  for each row execute function public.arcade_h2h_guard();

-- No policy reads arcade_team_members from inside its own policy, so there is no RLS recursion.
drop policy if exists arcade_scores_select on public.arcade_scores;
create policy arcade_scores_select on public.arcade_scores
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.can_see_player(player_id)
  );

drop policy if exists arcade_scores_insert on public.arcade_scores;
create policy arcade_scores_insert on public.arcade_scores
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and player_id = (select public.my_player_id())
  );

drop policy if exists arcade_scores_delete on public.arcade_scores;
create policy arcade_scores_delete on public.arcade_scores
  for delete to authenticated
  using (
    (select auth.uid()) is not null
    and (select public.is_coach())
  );

drop policy if exists arcade_daily_select on public.arcade_daily;
create policy arcade_daily_select on public.arcade_daily
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.can_see_player(player_id)
  );

drop policy if exists arcade_daily_insert on public.arcade_daily;
create policy arcade_daily_insert on public.arcade_daily
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and player_id = (select public.my_player_id())
  );

drop policy if exists arcade_daily_update on public.arcade_daily;
create policy arcade_daily_update on public.arcade_daily
  for update to authenticated
  using (
    (select auth.uid()) is not null
    and player_id = (select public.my_player_id())
  )
  with check (
    (select auth.uid()) is not null
    and player_id = (select public.my_player_id())
  );

drop policy if exists arcade_teams_select on public.arcade_teams;
create policy arcade_teams_select on public.arcade_teams
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.can_see_player(created_by)
  );

drop policy if exists arcade_teams_insert on public.arcade_teams;
create policy arcade_teams_insert on public.arcade_teams
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and created_by = (select public.my_player_id())
  );

drop policy if exists arcade_members_select on public.arcade_team_members;
create policy arcade_members_select on public.arcade_team_members
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.can_see_player(player_id)
  );

drop policy if exists arcade_members_insert on public.arcade_team_members;
create policy arcade_members_insert on public.arcade_team_members
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and player_id = (select public.my_player_id())
  );

-- The browser joins with an upsert, which needs UPDATE on the sent columns. The guard keeps the row as it was.
drop policy if exists arcade_members_update on public.arcade_team_members;
create policy arcade_members_update on public.arcade_team_members
  for update to authenticated
  using (
    (select auth.uid()) is not null
    and player_id = (select public.my_player_id())
  )
  with check (
    (select auth.uid()) is not null
    and player_id = (select public.my_player_id())
  );

drop policy if exists arcade_members_delete on public.arcade_team_members;
create policy arcade_members_delete on public.arcade_team_members
  for delete to authenticated
  using (
    (select auth.uid()) is not null
    and (
      player_id = (select public.my_player_id())
      or (select public.is_coach())
    )
  );

drop policy if exists arcade_h2h_select on public.arcade_h2h;
create policy arcade_h2h_select on public.arcade_h2h
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.can_see_player(player_id)
  );

drop policy if exists arcade_h2h_insert on public.arcade_h2h;
create policy arcade_h2h_insert on public.arcade_h2h
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and player_id = (select public.my_player_id())
  );

-- security_invoker: the views see only what the table policies let the caller see.
create or replace view public.arcade_week_board
with (security_invoker = true) as
select
  m.code,
  p.name,
  s.player_id,
  s.game,
  s.played_on,
  s.score,
  s.vision,
  s.grade
from public.arcade_scores s
join public.arcade_team_members m on m.player_id = s.player_id
join public.players p on p.id = s.player_id
where s.played_on >= (date_trunc('week', timezone('utc', now())))::date;

create or replace view public.arcade_daily_board
with (security_invoker = true) as
select
  d.played_on,
  d.game,
  d.score,
  d.seed,
  d.player_id,
  p.name
from public.arcade_daily d
join public.players p on p.id = d.player_id;

-- New public tables get every privilege (TRUNCATE included) by default. Start from nothing.
revoke all on public.arcade_scores from public, anon, authenticated;
revoke all on public.arcade_daily from public, anon, authenticated;
revoke all on public.arcade_teams from public, anon, authenticated;
revoke all on public.arcade_team_members from public, anon, authenticated;
revoke all on public.arcade_h2h from public, anon, authenticated;
revoke all on public.arcade_week_board from public, anon, authenticated;
revoke all on public.arcade_daily_board from public, anon, authenticated;
revoke all on sequence public.arcade_scores_id_seq from public, anon, authenticated;
revoke all on sequence public.arcade_h2h_id_seq from public, anon, authenticated;

grant select, insert, delete on public.arcade_scores to authenticated;
grant select, insert, update (played_on, player_id, game, score) on public.arcade_daily to authenticated;
grant select, insert on public.arcade_teams to authenticated;
grant select, insert, delete on public.arcade_team_members to authenticated;
grant update (code, player_id) on public.arcade_team_members to authenticated;
grant select, insert on public.arcade_h2h to authenticated;
grant select on public.arcade_week_board to authenticated;
grant select on public.arcade_daily_board to authenticated;
grant usage, select on sequence public.arcade_scores_id_seq to authenticated;
grant usage, select on sequence public.arcade_h2h_id_seq to authenticated;
