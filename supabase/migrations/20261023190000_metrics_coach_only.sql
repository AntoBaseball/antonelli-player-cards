-- A signed-in player can still update their private row (quests, reading log, XP).
-- They cannot change metrics or the metric history. Coaches can.
-- The full player document also carries a copy of metrics and history; those copies are blocked too.
-- Not applied yet. Safe to run more than once.
-- search_path is pinned. The SQL editor and the service role have no auth.uid(), so they can still write.

create or replace function public.guard_player_metrics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_coach() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.metrics, '{}'::jsonb) <> '{}'::jsonb
       or coalesce(new.document->'metrics', '{}'::jsonb) <> '{}'::jsonb
       or coalesce(new.history, '{}'::jsonb) <> '{}'::jsonb
       or coalesce(new.document->'history', '{}'::jsonb) <> '{}'::jsonb then
      raise exception 'metrics are coach only';
    end if;
    return new;
  end if;

  if new.metrics is distinct from old.metrics
     or coalesce(new.document->'metrics', '{}'::jsonb) is distinct from coalesce(old.document->'metrics', '{}'::jsonb)
     or new.history is distinct from old.history
     or coalesce(new.document->'history', '{}'::jsonb) is distinct from coalesce(old.document->'history', '{}'::jsonb) then
    raise exception 'metrics are coach only';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_player_metrics() from public, anon, authenticated;

drop trigger if exists player_private_metrics_guard on public.player_private;
create trigger player_private_metrics_guard
  before insert or update on public.player_private
  for each row execute function public.guard_player_metrics();
