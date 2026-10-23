-- A signed-in player may change only the allowlisted document keys, and only the
-- allowlisted keys inside road. Everything else (age, position, photo, coach
-- quirks, the coach plan, bio, and the rest of the profile) stays with the coach.
-- Metrics and history stay coach-only, same as 20261023190000.
--
-- On update, compare new.document minus the allowlist with old.document minus
-- the allowlist. Keys the player did not send are filled from the stored row
-- first, so a payload of only allowlisted keys matches and does not wipe coach
-- fields. A sent key that differs is rejected. Inserts may contain only
-- allowlisted keys, and only those may be non-empty.
--
-- Not applied yet. Safe to run more than once.
-- search_path is pinned. The SQL editor and the service role have no auth.uid().

create or replace function public.jsonb_is_blank(value jsonb)
returns boolean
language sql
immutable
as $$
  select value is null
    or value = 'null'::jsonb
    or value = '{}'::jsonb
    or value = '[]'::jsonb
    or value = '""'::jsonb;
$$;

revoke all on function public.jsonb_is_blank(jsonb) from public, anon, authenticated;

-- True when every key outside the allowlist is blank.
create or replace function public.jsonb_only_allowed(doc jsonb, allowed text[])
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  rest jsonb;
  item record;
begin
  if doc is not null and jsonb_typeof(doc) is distinct from 'object' then
    return false;
  end if;
  rest := coalesce(doc, '{}'::jsonb) - allowed;
  for item in select value from jsonb_each(rest) loop
    if not public.jsonb_is_blank(item.value) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

revoke all on function public.jsonb_only_allowed(jsonb, text[]) from public, anon, authenticated;

-- Player-owned keys inside road. Keep this list in sync with AntonelliAuth.roadKeys in auth.js.
create or replace function public.player_road_keys()
returns text[]
language sql
immutable
as $$
  select array[
    'xp', 'streaks', 'dates', 'missions', 'missionDay', 'dailyBonus',
    'trainingLog', 'miniDay', 'miniXp', 'streakPaid', 'hotUntil',
    'prs', 'challenges', 'trophies', 'rivalry', 'videos', 'vision',
    'skin', 'celebration', 'signature', 'autograph', 'autographTier'
  ];
$$;

revoke all on function public.player_road_keys() from public, anon, authenticated;

-- Player-owned keys on the document. road is checked again with player_road_keys().
-- Keep this list in sync with AntonelliAuth.documentKeys in auth.js.
create or replace function public.player_document_keys()
returns text[]
language sql
immutable
as $$
  select array['readingLog', 'earnedQuirks', 'gradeSeen', 'road'];
$$;

revoke all on function public.player_document_keys() from public, anon, authenticated;

-- Keep coach-owned road keys. Reject a player value that differs. Overlay the allowlist.
create or replace function public.player_road_keep(old_road jsonb, new_road jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  allowed text[] := public.player_road_keys();
  old_obj jsonb := coalesce(old_road, '{}'::jsonb);
  new_obj jsonb := coalesce(new_road, '{}'::jsonb);
  old_rest jsonb;
  new_rest jsonb;
  merged jsonb;
  key text;
begin
  if jsonb_typeof(old_obj) is distinct from 'object' then
    old_obj := '{}'::jsonb;
  end if;
  if jsonb_typeof(new_obj) is distinct from 'object' then
    new_obj := '{}'::jsonb;
  end if;
  old_rest := old_obj - allowed;
  new_rest := old_rest || (new_obj - allowed);
  if new_rest is distinct from old_rest then
    raise exception 'that field stays with the coach';
  end if;
  merged := old_obj;
  foreach key in array allowed loop
    if new_obj ? key then
      merged := jsonb_set(merged, array[key], new_obj->key, true);
    end if;
  end loop;
  return merged;
end;
$$;

revoke all on function public.player_road_keep(jsonb, jsonb) from public, anon, authenticated;

-- Keep coach-owned document keys. road is merged with the road allowlist.
create or replace function public.player_document_keep(old_doc jsonb, new_doc jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  allowed text[] := public.player_document_keys();
  old_obj jsonb := coalesce(old_doc, '{}'::jsonb);
  new_obj jsonb := coalesce(new_doc, '{}'::jsonb);
  old_rest jsonb;
  new_rest jsonb;
  merged jsonb;
  key text;
begin
  if jsonb_typeof(old_obj) is distinct from 'object' then
    old_obj := '{}'::jsonb;
  end if;
  if jsonb_typeof(new_obj) is distinct from 'object' then
    new_obj := '{}'::jsonb;
  end if;
  old_rest := old_obj - allowed;
  new_rest := old_rest || (new_obj - allowed);
  if new_rest is distinct from old_rest then
    raise exception 'that field stays with the coach';
  end if;
  merged := old_obj;
  foreach key in array allowed loop
    if key = 'road' then
      if new_obj ? 'road' then
        merged := jsonb_set(merged, '{road}', public.player_road_keep(old_obj->'road', new_obj->'road'), true);
      end if;
    elsif new_obj ? key then
      merged := jsonb_set(merged, array[key], new_obj->key, true);
    end if;
  end loop;
  return merged;
end;
$$;

revoke all on function public.player_document_keep(jsonb, jsonb) from public, anon, authenticated;

create or replace function public.guard_player_metrics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  doc_keys text[] := public.player_document_keys();
  road_keys text[] := public.player_road_keys();
begin
  if auth.uid() is null or public.is_coach() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.metrics, '{}'::jsonb) <> '{}'::jsonb
       or coalesce(new.history, '{}'::jsonb) <> '{}'::jsonb
       or not public.jsonb_only_allowed(new.document, doc_keys)
       or not public.jsonb_only_allowed(coalesce(new.document->'road', '{}'::jsonb), road_keys)
       or not public.jsonb_only_allowed(new.road, road_keys) then
      raise exception 'that field stays with the coach';
    end if;
    return new;
  end if;

  if new.metrics is distinct from old.metrics
     or new.history is distinct from old.history then
    raise exception 'metrics are coach only';
  end if;

  new.road := public.player_road_keep(old.road, new.road);
  new.document := public.player_document_keep(old.document, new.document);
  return new;
end;
$$;

revoke all on function public.guard_player_metrics() from public, anon, authenticated;

drop trigger if exists player_private_metrics_guard on public.player_private;
create trigger player_private_metrics_guard
  before insert or update on public.player_private
  for each row execute function public.guard_player_metrics();
