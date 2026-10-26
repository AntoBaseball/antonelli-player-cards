-- Quick Eyes Arcade shared scores. Not applied to the live database.
-- Safe to run more than once.
-- search_path is pinned on every function. Policies use (select auth.uid()).
-- A player inserts only their own scores. The daily seed is the date, not a client secret.
-- Adds road key arcade to player_road_keys(). The browser does not send that key until auth.js is updated.

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
  constraint arcade_scores_score_check check (score >= 0),
  constraint arcade_scores_accuracy_check check (accuracy >= 0 and accuracy <= 1),
  constraint arcade_scores_ms_check check (avg_ms >= 0 and fastest_ms >= 0),
  constraint arcade_scores_level_check check (highest_level between 1 and 10),
  constraint arcade_scores_combo_check check (best_combo >= 0),
  constraint arcade_scores_vision_check check (vision between 0 and 99),
  constraint arcade_scores_grade_check check (grade in ('S', 'A', 'B', 'C', 'D')),
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
  constraint arcade_daily_score_check check (score >= 0),
  constraint arcade_daily_seed_check check (seed = public.arcade_daily_seed(played_on))
);

create index if not exists arcade_daily_score_idx on public.arcade_daily (played_on, score desc);

create table if not exists public.arcade_teams (
  code text primary key,
  name text not null default '',
  created_by text not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint arcade_teams_code_check check (code ~ '^[A-Z0-9]{4,8}$'),
  constraint arcade_teams_name_check check (char_length(name) <= 40)
);

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
  constraint arcade_h2h_score_check check (score_a >= 0 and score_b >= 0),
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
  if new.player_id is distinct from public.my_player_id() then
    raise exception 'scores stay on your card';
  end if;
  if new.seed is distinct from '' and new.seed is distinct from public.arcade_daily_seed(new.played_on) then
    raise exception 'the daily seed comes from the date';
  end if;
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
  new.seed := public.arcade_daily_seed(new.played_on);
  if tg_op = 'UPDATE' then
    if new.played_on is distinct from old.played_on then
      raise exception 'that daily row stays put';
    end if;
    if new.score < old.score then
      new.score := old.score;
      new.game := old.game;
    end if;
  end if;
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
  if tg_op = 'INSERT' and new.created_by is distinct from public.my_player_id() then
    raise exception 'team codes stay on your card';
  end if;
  if tg_op = 'UPDATE' then
    raise exception 'a team code stays put';
  end if;
  return new;
end;
$$;

create or replace function public.arcade_members_guard()
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
    raise exception 'join the team as yourself';
  end if;
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
  if new.player_id is distinct from public.my_player_id() then
    raise exception 'scores stay on your card';
  end if;
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
  before insert on public.arcade_scores
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
  before insert on public.arcade_h2h
  for each row execute function public.arcade_h2h_guard();

drop policy if exists arcade_scores_select on public.arcade_scores;
create policy arcade_scores_select on public.arcade_scores
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and (
      public.can_see_player(player_id)
      or exists (
        select 1
        from public.arcade_team_members mine
        join public.arcade_team_members theirs on theirs.code = mine.code
        where mine.player_id = public.my_player_id()
          and theirs.player_id = arcade_scores.player_id
      )
    )
  );

drop policy if exists arcade_scores_insert on public.arcade_scores;
create policy arcade_scores_insert on public.arcade_scores
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and player_id = public.my_player_id()
  );

drop policy if exists arcade_scores_delete on public.arcade_scores;
create policy arcade_scores_delete on public.arcade_scores
  for delete to authenticated
  using (
    (select auth.uid()) is not null
    and public.is_coach()
  );

drop policy if exists arcade_daily_select on public.arcade_daily;
create policy arcade_daily_select on public.arcade_daily
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and (
      public.can_see_player(player_id)
      or exists (
        select 1
        from public.arcade_team_members mine
        join public.arcade_team_members theirs on theirs.code = mine.code
        where mine.player_id = public.my_player_id()
          and theirs.player_id = arcade_daily.player_id
      )
    )
  );

drop policy if exists arcade_daily_insert on public.arcade_daily;
create policy arcade_daily_insert on public.arcade_daily
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and player_id = public.my_player_id()
  );

drop policy if exists arcade_daily_update on public.arcade_daily;
create policy arcade_daily_update on public.arcade_daily
  for update to authenticated
  using (
    (select auth.uid()) is not null
    and player_id = public.my_player_id()
  )
  with check (
    (select auth.uid()) is not null
    and player_id = public.my_player_id()
  );

drop policy if exists arcade_teams_select on public.arcade_teams;
create policy arcade_teams_select on public.arcade_teams
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and (
      public.is_coach()
      or created_by = public.my_player_id()
      or public.can_see_player(created_by)
      or exists (
        select 1 from public.arcade_team_members mine
        where mine.code = arcade_teams.code
          and mine.player_id = public.my_player_id()
      )
    )
  );

drop policy if exists arcade_teams_insert on public.arcade_teams;
create policy arcade_teams_insert on public.arcade_teams
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and created_by = public.my_player_id()
  );

drop policy if exists arcade_members_select on public.arcade_team_members;
create policy arcade_members_select on public.arcade_team_members
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and (
      public.is_coach()
      or public.can_see_player(player_id)
      or exists (
        select 1 from public.arcade_team_members mine
        where mine.code = arcade_team_members.code
          and mine.player_id = public.my_player_id()
      )
    )
  );

drop policy if exists arcade_members_insert on public.arcade_team_members;
create policy arcade_members_insert on public.arcade_team_members
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and player_id = public.my_player_id()
  );

drop policy if exists arcade_members_delete on public.arcade_team_members;
create policy arcade_members_delete on public.arcade_team_members
  for delete to authenticated
  using (
    (select auth.uid()) is not null
    and (
      player_id = public.my_player_id()
      or public.is_coach()
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
    and player_id = public.my_player_id()
  );

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

revoke all on public.arcade_scores from public, anon;
revoke all on public.arcade_daily from public, anon;
revoke all on public.arcade_teams from public, anon;
revoke all on public.arcade_team_members from public, anon;
revoke all on public.arcade_h2h from public, anon;
revoke all on public.arcade_week_board from public, anon;
revoke all on public.arcade_daily_board from public, anon;

grant select, insert, delete on public.arcade_scores to authenticated;
grant select, insert, update on public.arcade_daily to authenticated;
grant select, insert on public.arcade_teams to authenticated;
grant select, insert, delete on public.arcade_team_members to authenticated;
grant select, insert on public.arcade_h2h to authenticated;
grant select on public.arcade_week_board to authenticated;
grant select on public.arcade_daily_board to authenticated;
grant usage, select on sequence public.arcade_scores_id_seq to authenticated;
grant usage, select on sequence public.arcade_h2h_id_seq to authenticated;

-- Player-owned road keys. Adds arcade. Keep in sync with AntonelliAuth.roadKeys after this file is applied.
create or replace function public.player_road_keys()
returns text[]
language sql
immutable
as $$
  select array[
    'xp', 'streaks', 'dates', 'missions', 'missionDay', 'dailyBonus',
    'trainingLog', 'miniDay', 'miniXp', 'streakPaid', 'hotUntil',
    'prs', 'challenges', 'trophies', 'rivalry', 'videos', 'vision',
    'skin', 'celebration', 'signature', 'autograph', 'autographTier',
    'arcade'
  ];
$$;

alter function public.player_road_keys() set search_path = '';
revoke all on function public.player_road_keys() from public, anon, authenticated;
