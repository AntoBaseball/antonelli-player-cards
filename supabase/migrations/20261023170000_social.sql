-- Shared facility: challenges, reactions, King of the Hill, notifications, highlights.
-- Safe to run more than once.
-- search_path is pinned on every function. Policies use (select auth.uid()).
-- Clients cannot insert notifications or crown rows. Triggers and security-definer
-- functions write those, so a browser cannot spoof a challenge note or a crown.

create table if not exists public.challenges (
  id text primary key,
  from_player text not null references public.players (id) on delete cascade,
  to_player text not null references public.players (id) on delete cascade,
  category text not null,
  ends_on date not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'done')),
  winner_id text references public.players (id) on delete set null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint challenges_not_self check (from_player <> to_player),
  constraint challenges_category_check check (
    category in ('batSpeed', 'exitVelo', 'tenYard', 'throwVelo', 'broadJump', 'vertical', 'flying10')
  )
);

create index if not exists challenges_to_idx on public.challenges (to_player, status);
create index if not exists challenges_from_idx on public.challenges (from_player);
create index if not exists challenges_winner_idx on public.challenges (winner_id);

create table if not exists public.reactions (
  id bigint generated always as identity primary key,
  target_player text not null references public.players (id) on delete cascade,
  from_player text not null references public.players (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  created_on date not null default (timezone('utc', now()))::date,
  created_at timestamptz not null default now(),
  constraint reactions_not_self check (from_player <> target_player),
  constraint reactions_once_per_day unique (target_player, from_player, emoji, created_on)
);

create index if not exists reactions_target_idx on public.reactions (target_player, created_at desc);
create index if not exists reactions_from_day_idx on public.reactions (from_player, created_on);

-- scope is the age group (16U, 14U, …). The crown is one number, not the private test sheet.
create table if not exists public.koth_claims (
  id bigint generated always as identity primary key,
  category text not null,
  scope text not null default '',
  holder_id text not null references public.players (id) on delete cascade,
  value numeric,
  claimed_at timestamptz not null default now()
);

create index if not exists koth_lookup_idx on public.koth_claims (category, scope, claimed_at desc);
create index if not exists koth_holder_idx on public.koth_claims (holder_id);

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  recipient_id text not null references public.players (id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_id, kind, created_at desc);

create table if not exists public.highlights (
  id text primary key,
  player_id text not null references public.players (id) on delete cascade,
  storage_path text,
  url text,
  caption text not null default '' check (char_length(caption) <= 140),
  created_at timestamptz not null default now(),
  constraint highlights_has_media check (
    (storage_path is not null and storage_path <> '')
    or (url is not null and url <> '')
  )
);

create index if not exists highlights_player_idx on public.highlights (player_id, created_at desc);

alter table public.challenges enable row level security;
alter table public.reactions enable row level security;
alter table public.koth_claims enable row level security;
alter table public.notifications enable row level security;
alter table public.highlights enable row level security;

alter table public.challenges replica identity full;
alter table public.notifications replica identity full;

-- Who is signed in, and which card is theirs.
create or replace function public.my_player_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.players p
  where p.user_id = (select auth.uid())
  limit 1;
$$;

-- Same team string, or your own card. Coaches see every card.
-- An empty team only matches yourself, so a blank team is not a free pass.
create or replace function public.can_see_player(pid text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_coach()
    or exists (
      select 1
      from public.players me
      join public.players them on them.id = pid
      where me.user_id = (select auth.uid())
        and (
          me.id = them.id
          or (
            me.team is not null
            and me.team <> ''
            and me.team = them.team
          )
        )
    );
$$;

create or replace function public.metric_number(doc jsonb, key text)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when doc->>key ~ '^-?[0-9]+(\.[0-9]+)?$' then (doc->>key)::numeric
    else null
  end;
$$;

-- Tie goes to the player who was challenged, matching the browser rule.
create or replace function public.challenge_outcome(a text, b text, category text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  av numeric;
  bv numeric;
  winner text;
begin
  select public.metric_number(metrics, category) into av
  from public.player_private where player_id = a;
  select public.metric_number(metrics, category) into bv
  from public.player_private where player_id = b;
  if av is null and bv is null then
    winner := null;
  elsif av is null then
    winner := b;
  elsif bv is null then
    winner := a;
  elsif category in ('tenYard', 'flying10') then
    winner := case when av < bv then a else b end;
  else
    winner := case when av > bv then a else b end;
  end if;
  return jsonb_build_object('from', av, 'to', bv, 'winner_id', winner);
end;
$$;

-- One kind per recipient per UTC day. Clients cannot call this.
create or replace function public.notify_player(recipient text, kind text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if notify_player.recipient is null or notify_player.recipient = ''
     or notify_player.kind is null or notify_player.kind = '' then
    return;
  end if;
  if exists (
    select 1
    from public.notifications n
    where n.recipient_id = notify_player.recipient
      and n.kind = notify_player.kind
      and (n.created_at at time zone 'utc')::date = (timezone('utc', now()))::date
  ) then
    return;
  end if;
  insert into public.notifications (recipient_id, kind, payload)
  values (notify_player.recipient, notify_player.kind, coalesce(notify_player.payload, '{}'::jsonb));
end;
$$;

create or replace function public.player_first_name(pid text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(split_part(p.name, ' ', 1), ''), 'Teammate')
  from public.players p
  where p.id = pid;
$$;

create or replace function public.challenges_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  outcome jsonb;
begin
  if tg_op = 'INSERT' then
    if new.from_player = new.to_player then
      raise exception 'you cannot challenge yourself';
    end if;
    if not public.is_coach() then
      if new.from_player is distinct from public.my_player_id() then
        raise exception 'challenges are sent as yourself';
      end if;
      if not public.can_see_player(new.to_player) then
        raise exception 'challenge a teammate on your team';
      end if;
      new.status := 'pending';
      new.winner_id := null;
      new.result := '{}'::jsonb;
    end if;
    return new;
  end if;

  new.id := old.id;
  new.from_player := old.from_player;
  new.to_player := old.to_player;
  new.category := old.category;
  new.created_at := old.created_at;

  if public.is_coach() then
    if new.status = 'done' and old.status is distinct from 'done' then
      outcome := public.challenge_outcome(old.from_player, old.to_player, old.category);
      new.winner_id := outcome->>'winner_id';
      new.result := outcome;
    end if;
    return new;
  end if;

  -- Settlement. No session setting is trusted: only an accepted challenge whose end date
  -- has passed can close, and the winner always comes from challenge_outcome().
  if old.status = 'accepted'
     and new.status = 'done'
     and old.ends_on < (timezone('utc', now()))::date then
    outcome := public.challenge_outcome(old.from_player, old.to_player, old.category);
    new.ends_on := old.ends_on;
    new.winner_id := outcome->>'winner_id';
    new.result := outcome;
    return new;
  end if;

  if public.my_player_id() = old.to_player
     and old.status = 'pending'
     and new.status in ('accepted', 'declined') then
    new.ends_on := old.ends_on;
    new.winner_id := null;
    new.result := old.result;
    return new;
  end if;

  raise exception 'that challenge update is not allowed';
end;
$$;

create or replace function public.challenges_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fname text;
  loser text;
begin
  if tg_op = 'INSERT' then
    fname := public.player_first_name(new.from_player);
    perform public.notify_player(
      new.to_player,
      'challenge',
      jsonb_build_object(
        'text', fname || ' challenged you. Accept or decline.',
        'challenge_id', new.id,
        'category', new.category
      )
    );
    return new;
  end if;

  if old.status is not distinct from new.status then
    return new;
  end if;

  if new.status in ('accepted', 'declined') then
    perform public.notify_player(
      new.from_player,
      'challenge-' || new.status,
      jsonb_build_object(
        'text', 'Your challenge was ' || new.status || '.',
        'challenge_id', new.id
      )
    );
  elsif new.status = 'done' and new.winner_id is not null then
    loser := case when new.winner_id = new.from_player then new.to_player else new.from_player end;
    perform public.notify_player(
      new.winner_id,
      'challenge-win',
      jsonb_build_object('text', 'Challenge won. Trophy is in the case.', 'challenge_id', new.id)
    );
    perform public.notify_player(
      loser,
      'challenge-loss',
      jsonb_build_object('text', 'Challenge closed. The trophy went the other way. Next rep.', 'challenge_id', new.id)
    );
  end if;
  return new;
end;
$$;

-- Eight reactions a day from one player. One emoji per card per day (unique key).
create or replace function public.reactions_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if new.from_player = new.target_player then
    raise exception 'you cannot react to your own card';
  end if;
  if not public.is_coach() and new.from_player is distinct from public.my_player_id() then
    raise exception 'reactions are posted as yourself';
  end if;
  if not public.is_coach() and not public.can_see_player(new.target_player) then
    raise exception 'react to a teammate on your team';
  end if;
  new.created_on := (timezone('utc', now()))::date;
  if not public.is_coach() then
    -- Serialize one sender's inserts so two parallel requests cannot both pass the cap.
    perform pg_advisory_xact_lock(hashtext('reactions:' || new.from_player));
    select count(*) into n
    from public.reactions r
    where r.from_player = new.from_player
      and r.created_on = new.created_on;
    if n >= 8 then
      raise exception 'reaction limit reached for today';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.reactions_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_player(
    new.target_player,
    'reaction',
    jsonb_build_object(
      'text', public.player_first_name(new.from_player) || ' reacted ' || new.emoji || ' on your card.',
      'emoji', new.emoji
    )
  );
  return new;
end;
$$;

create or replace function public.notifications_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_coach() then
    return new;
  end if;
  if new.recipient_id is distinct from old.recipient_id
     or new.kind is distinct from old.kind
     or new.payload is distinct from old.payload
     or new.created_at is distinct from old.created_at
     or new.id is distinct from old.id then
    raise exception 'only read state can change';
  end if;
  return new;
end;
$$;

create or replace function public.highlights_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  folder text;
begin
  if not public.is_coach() and new.player_id is distinct from public.my_player_id() then
    raise exception 'highlights are posted on your card';
  end if;
  if new.url is not null and new.url <> '' and new.url !~ '^https://|^http://' then
    raise exception 'highlight links have to start with http';
  end if;
  if not public.is_coach() and new.storage_path is not null and new.storage_path <> '' then
    folder := split_part(new.storage_path, '/', 1);
    if folder is distinct from (select auth.uid())::text then
      raise exception 'upload into your own folder';
    end if;
  end if;
  return new;
end;
$$;

-- Reads private metrics and writes a claim only when the holder changes.
-- Any signed-in user may run it. The insert bypasses RLS because this function is definer.
create or replace function public.refresh_koth()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  prev text;
  label text;
begin
  if (select auth.uid()) is null then
    raise exception 'sign in required';
  end if;

  for rec in
    with ranked as (
      select
        p.id,
        coalesce(p.age_group, '') as scope,
        m.key,
        public.metric_number(pp.metrics, m.key) as value,
        m.better,
        row_number() over (
          partition by coalesce(p.age_group, ''), m.key
          order by
            case
              when m.better = 'lower' then public.metric_number(pp.metrics, m.key)
            end asc nulls last,
            case
              when m.better = 'higher' then public.metric_number(pp.metrics, m.key)
            end desc nulls last,
            p.id
        ) as rn
      from public.players p
      join public.player_private pp on pp.player_id = p.id
      cross join (
        values
          ('batSpeed', 'higher'),
          ('exitVelo', 'higher'),
          ('tenYard', 'lower'),
          ('throwVelo', 'higher'),
          ('broadJump', 'higher'),
          ('vertical', 'higher'),
          ('flying10', 'lower')
      ) as m(key, better)
      where public.metric_number(pp.metrics, m.key) is not null
    )
    select id, scope, key, value
    from ranked
    where rn = 1
  loop
    prev := null;
    select c.holder_id into prev
    from public.koth_claims c
    where c.category = rec.key
      and c.scope = rec.scope
    order by c.claimed_at desc
    limit 1;

    if prev is not distinct from rec.id then
      update public.koth_claims
      set value = rec.value
      where id = (
        select c.id
        from public.koth_claims c
        where c.category = rec.key
          and c.scope = rec.scope
        order by c.claimed_at desc
        limit 1
      )
        and value is distinct from rec.value;
    else
      insert into public.koth_claims (category, scope, holder_id, value)
      values (rec.key, rec.scope, rec.id, rec.value);
      if prev is not null then
        label := case rec.key
          when 'batSpeed' then 'Bat Speed'
          when 'exitVelo' then 'Exit Velo'
          when 'tenYard' then 'Sprint'
          when 'throwVelo' then 'Throwing Velo'
          when 'broadJump' then 'Broad Jump'
          when 'vertical' then 'Vertical'
          when 'flying10' then 'Flying 10'
          else rec.key
        end;
        perform public.notify_player(
          rec.id,
          'new-king',
          jsonb_build_object('text', 'NEW KING · ' || label || ', ' || rec.scope || '.', 'category', rec.key, 'scope', rec.scope)
        );
        perform public.notify_player(
          prev,
          'crown-taken',
          jsonb_build_object('text', 'The crown moved.', 'category', rec.key, 'scope', rec.scope)
        );
      end if;
    end if;
  end loop;
end;
$$;

-- Closes accepted challenges whose end date is already in the past.
-- The guard sets the winner from private metrics. The browser cannot pass a winner.
create or replace function public.settle_due_challenges()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'sign in required';
  end if;
  update public.challenges
  set status = 'done'
  where status = 'accepted'
    and ends_on < (timezone('utc', now()))::date;
end;
$$;

revoke all on function public.my_player_id() from public, anon;
revoke all on function public.can_see_player(text) from public, anon;
revoke all on function public.metric_number(jsonb, text) from public, anon, authenticated;
revoke all on function public.challenge_outcome(text, text, text) from public, anon, authenticated;
revoke all on function public.notify_player(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.player_first_name(text) from public, anon, authenticated;
revoke all on function public.challenges_guard() from public, anon, authenticated;
revoke all on function public.challenges_notify() from public, anon, authenticated;
revoke all on function public.reactions_guard() from public, anon, authenticated;
revoke all on function public.reactions_notify() from public, anon, authenticated;
revoke all on function public.notifications_guard() from public, anon, authenticated;
revoke all on function public.highlights_guard() from public, anon, authenticated;
revoke all on function public.refresh_koth() from public, anon;
revoke all on function public.settle_due_challenges() from public, anon;

grant execute on function public.my_player_id() to authenticated;
grant execute on function public.can_see_player(text) to authenticated;
grant execute on function public.refresh_koth() to authenticated;
grant execute on function public.settle_due_challenges() to authenticated;

drop trigger if exists challenges_guard on public.challenges;
create trigger challenges_guard
  before insert or update on public.challenges
  for each row execute function public.challenges_guard();

drop trigger if exists challenges_notify on public.challenges;
create trigger challenges_notify
  after insert or update on public.challenges
  for each row execute function public.challenges_notify();

drop trigger if exists reactions_guard on public.reactions;
create trigger reactions_guard
  before insert on public.reactions
  for each row execute function public.reactions_guard();

drop trigger if exists reactions_notify on public.reactions;
create trigger reactions_notify
  after insert on public.reactions
  for each row execute function public.reactions_notify();

drop trigger if exists notifications_guard on public.notifications;
create trigger notifications_guard
  before update on public.notifications
  for each row execute function public.notifications_guard();

drop trigger if exists highlights_guard on public.highlights;
create trigger highlights_guard
  before insert or update on public.highlights
  for each row execute function public.highlights_guard();

drop policy if exists challenges_select on public.challenges;
create policy challenges_select on public.challenges
  for select to authenticated
  using (
    public.can_see_player(from_player)
    or public.can_see_player(to_player)
  );

drop policy if exists challenges_insert on public.challenges;
create policy challenges_insert on public.challenges
  for insert to authenticated
  with check (
    public.is_coach()
    or (
      from_player = public.my_player_id()
      and from_player <> to_player
      and public.can_see_player(to_player)
    )
  );

drop policy if exists challenges_update on public.challenges;
create policy challenges_update on public.challenges
  for update to authenticated
  using (
    public.is_coach()
    or to_player = public.my_player_id()
    or from_player = public.my_player_id()
  )
  with check (
    public.is_coach()
    or to_player = public.my_player_id()
    or from_player = public.my_player_id()
  );

drop policy if exists challenges_delete on public.challenges;
create policy challenges_delete on public.challenges
  for delete to authenticated
  using (public.is_coach());

drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions
  for select to authenticated
  using (public.can_see_player(target_player));

drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions
  for insert to authenticated
  with check (
    public.is_coach()
    or (
      from_player = public.my_player_id()
      and from_player <> target_player
      and public.can_see_player(target_player)
    )
  );

drop policy if exists reactions_delete on public.reactions;
create policy reactions_delete on public.reactions
  for delete to authenticated
  using (
    public.is_coach()
    or from_player = public.my_player_id()
  );

-- Crowns are per age group. A player can read a crown in their own age group
-- even when the holder is listed on another team string. Other social rows stay team-scoped.
drop policy if exists koth_select on public.koth_claims;
create policy koth_select on public.koth_claims
  for select to authenticated
  using (
    public.can_see_player(holder_id)
    or exists (
      select 1
      from public.players me
      join public.players holder on holder.id = koth_claims.holder_id
      where me.user_id = (select auth.uid())
        and me.age_group is not null
        and me.age_group <> ''
        and me.age_group = holder.age_group
    )
  );

drop policy if exists koth_delete on public.koth_claims;
create policy koth_delete on public.koth_claims
  for delete to authenticated
  using (public.is_coach());

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (
    public.is_coach()
    or recipient_id = public.my_player_id()
  );

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (
    public.is_coach()
    or recipient_id = public.my_player_id()
  )
  with check (
    public.is_coach()
    or recipient_id = public.my_player_id()
  );

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated
  using (public.is_coach());

drop policy if exists highlights_select on public.highlights;
create policy highlights_select on public.highlights
  for select to authenticated
  using (public.can_see_player(player_id));

drop policy if exists highlights_insert on public.highlights;
create policy highlights_insert on public.highlights
  for insert to authenticated
  with check (
    public.is_coach()
    or player_id = public.my_player_id()
  );

drop policy if exists highlights_update on public.highlights;
create policy highlights_update on public.highlights
  for update to authenticated
  using (public.is_coach() or player_id = public.my_player_id())
  with check (public.is_coach() or player_id = public.my_player_id());

drop policy if exists highlights_delete on public.highlights;
create policy highlights_delete on public.highlights
  for delete to authenticated
  using (
    public.is_coach()
    or player_id = public.my_player_id()
  );

-- Supabase default privileges grant ALL (including TRUNCATE, which ignores RLS) to anon
-- and authenticated on new tables. Start from nothing, then grant only what is used.
revoke all on public.challenges from public, anon, authenticated;
revoke all on public.reactions from public, anon, authenticated;
revoke all on public.koth_claims from public, anon, authenticated;
revoke all on public.notifications from public, anon, authenticated;
revoke all on public.highlights from public, anon, authenticated;
revoke all on sequence public.reactions_id_seq from public, anon, authenticated;
revoke all on sequence public.koth_claims_id_seq from public, anon, authenticated;
revoke all on sequence public.notifications_id_seq from public, anon, authenticated;

grant select, insert, update, delete on public.challenges to authenticated;
grant select, insert, delete on public.reactions to authenticated;
grant select, delete on public.koth_claims to authenticated;
grant select, update (read_at) on public.notifications to authenticated;
grant select, insert, update, delete on public.highlights to authenticated;

-- Identity inserts need the sequence. Crown and inbox rows are written by definer functions.
grant usage, select on sequence public.reactions_id_seq to authenticated;

-- Private bucket. 50 MB is the free-plan object cap. Video types only.
-- Reads: your own folder, a teammate's folder, or the coach. Uploads only into a folder named with that user's id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'highlights',
  'highlights',
  false,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists highlights_storage_select on storage.objects;
create policy highlights_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'highlights'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_coach()
      or exists (
        select 1
        from public.players p
        where p.user_id::text = (storage.foldername(objects.name))[1]
          and public.can_see_player(p.id)
      )
    )
  );

drop policy if exists highlights_storage_insert on storage.objects;
create policy highlights_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'highlights'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists highlights_storage_update on storage.objects;
create policy highlights_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'highlights'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'highlights'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists highlights_storage_delete on storage.objects;
create policy highlights_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'highlights'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_coach()
    )
  );

-- Realtime only where a teammate is waiting on the other phone.
-- Reactions, crowns, and highlight rows refresh when the page loads.
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.challenges;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
