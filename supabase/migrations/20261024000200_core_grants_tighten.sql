-- Tighten table rights for anon and authenticated in public.
-- New public tables got every privilege by default (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
-- included). TRUNCATE ignores RLS, so a signed-in user, or anyone with the anon key, could empty
-- the roster. RLS still decides which rows each role sees; these grants only decide which
-- statements a role may run at all.
--
-- What the browser uses (auth.js, social.js, arcade.js):
--   anon:          select on players (public cards, the join page), rpc lookup_join_token.
--   authenticated: players and player_private reads and upserts (player self-save, coach edits),
--                  player_accounts (coach invites and join links), profiles read, the social and
--                  arcade tables, and Realtime on challenges and notifications (select + RLS).
-- Sign-up runs through security-definer triggers on auth.users, so it needs no client grant.
--
-- Safe to run more than once.

-- Core tables: start from nothing, then grant what 20261023140000_init_accounts intended.
-- A table-level revoke also clears the stray column-level grants on profiles.
revoke all on public.players from anon, authenticated;
revoke all on public.player_private from anon, authenticated;
revoke all on public.player_accounts from anon, authenticated;
revoke all on public.profiles from anon, authenticated;

grant select on public.players to anon, authenticated;
grant insert, update, delete on public.players to authenticated;
grant select, insert, update, delete on public.player_private to authenticated;
grant select, insert, update, delete on public.player_accounts to authenticated;
grant select, update on public.profiles to authenticated;

-- Every public table and view, now and from earlier migrations: no TRUNCATE, REFERENCES,
-- TRIGGER or MAINTAIN for client roles, and no writes for anon.
do $$
declare
  rel record;
  extra text := case when current_setting('server_version_num')::int >= 170000 then ', maintain' else '' end;
begin
  for rel in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm', 'f')
  loop
    execute format('revoke truncate, references, trigger%s on public.%I from anon, authenticated', extra, rel.relname);
    execute format('revoke insert, update, delete on public.%I from anon', rel.relname);
  end loop;
end $$;

-- Sequences: anon inserts nothing, so it needs none. authenticated keeps usage/select where granted.
revoke all on all sequences in schema public from anon;
revoke update on all sequences in schema public from authenticated;

-- Future tables created by postgres (apply_migration and the SQL editor) in public.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from anon, authenticated;
