-- A second challenge on the same day still notifies the other player.
-- Challenge notes are unique per recipient, kind, and payload challenge_id.
-- Reactions, crowns, and every other kind stay one note per recipient per UTC day.
-- Not applied yet. Safe to run more than once. Clients still cannot call this function.

create or replace function public.notify_player(recipient text, kind text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  challenge text;
begin
  if notify_player.recipient is null or notify_player.recipient = ''
     or notify_player.kind is null or notify_player.kind = '' then
    return;
  end if;

  if notify_player.kind like 'challenge%' then
    challenge := notify_player.payload->>'challenge_id';
    if exists (
      select 1
      from public.notifications n
      where n.recipient_id = notify_player.recipient
        and n.kind = notify_player.kind
        and n.payload->>'challenge_id' is not distinct from challenge
    ) then
      return;
    end if;
  elsif exists (
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

revoke all on function public.notify_player(text, text, jsonb) from public, anon, authenticated;
