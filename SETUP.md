# Accounts setup

The site stays a static GitHub Pages app. The live Supabase project ref is `cqmzxrhoxnktjrzqtdsi` (`https://cqmzxrhoxnktjrzqtdsi.supabase.co`). `config.js` already has that URL and the public anon key.

Done on the live project:

- `supabase/migrations/20261023140000_init_accounts.sql` is applied.
- `supabase/migrations/20261023150000_harden_functions.sql` is applied (`touch_updated_at` search_path cleared, `is_coach()` execute revoked from anon). The file is in the repo so it matches the database.
- Edge function `invite-players` is deployed with `verify_jwt = false`.

Until `players` has a row, logged-out visitors still see the invented sample cards, with a banner that says the shared roster is empty. The first real row replaces those cards. Clearing both config strings turns accounts off and keeps the sample roster only.

## 1. Project

Authentication → Providers → Email should stay on. The site has no public sign-up form. Turn off public sign-up if it is still on. Invites still work with sign-up disabled.

Authentication → URL configuration: add the Pages URL `https://antobaseball.github.io/antonelli-player-cards/` and `http://127.0.0.1:8765` as redirect URLs so password resets land back on the site.

## 2. Migrations

Already applied. Do not run them again. They created:

- `players` — public card fields (name, team, OVR, tier, category grades). Readable without a login.
- `player_private` — metrics, reading log, history, XP, and the full player document. Readable only by that player’s login and by coaches.
- `player_accounts` — the invite email. Coach-only. A 12U account uses a parent’s email and still maps to that one player. One email can map to one player; a second child needs a second address.
- `profiles` — `coach` or `player`, plus the linked `player_id`.
- `is_coach()` and the new-user trigger. The trigger always creates a `player` profile. It links the card only when the email matches `player_accounts`. It never trusts a signup payload that says `role: coach`.

## 3. Anon key

Already in `config.js` for project `cqmzxrhoxnktjrzqtdsi`. The anon key is public. Do not put the service role key in `config.js` or anywhere the browser can download.

## 4. Invites

Already deployed. The browser cannot send invite email. `supabase/functions/invite-players` checks the caller’s JWT, confirms `profiles.role = 'coach'`, then uses the service role inside the function. Redeploy with:

```bash
supabase functions deploy invite-players --project-ref cqmzxrhoxnktjrzqtdsi
```

`supabase/config.toml` sets `verify_jwt = false` for this function so the browser preflight is not rejected. The function still requires a signed-in coach: it reads the caller’s JWT, checks `profiles.role`, and only then uses the service role.

Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into the function. Do not copy that service key into the repo.

## 5. Make Matt the coach

The live project has no auth users yet. The sign-in screen does not create accounts, and invites require a coach, so Matt’s first login has to be added in the Supabase dashboard (Authentication → Users → Add user, and confirm the email). Then in the SQL editor:

```sql
update public.profiles
set role = 'coach'
where id = (select id from auth.users where email = 'matt@example.com');
```

Role changes from the browser are ignored. Only the service role (SQL editor or the invite function) can change `profiles.role`.

## 6. Fill the roster

Signed in as coach, the settings menu has:

- **Add one player** — name, team, age group, position, email. Sends one invite.
- **CSV** — header row `name,team,ageGroup,position,email`. Up to 200 rows. Each email gets a Supabase invite.
- **Upload this browser’s roster** — one-time copy of the sample or local roster into `players` and `player_private`. Sample cards have no emails, so this does not send invites. Add emails and invite after.

A player who accepts the invite lands on their own card and personal page. Coaches can open every card, enter tests, and edit the roster.

## What stays on this browser

Head-to-head challenges, reactions, King of the Hill claims, the inbox, and highlight video files still use this browser’s storage (`antonelli-road-facility-v1`, `antonelli-road-inbox-v1`, and IndexedDB). The public pages (roster, card faces, leaderboards, Card of the Day, King of the Hill standings that are computed from public grades, awards on the card) read the shared `players` rows. While that table is empty they keep showing the sample cards instead of a blank roster. The personal page (My Game Plan, Where I Started, the reading log, missions, XP, Development Coach) reads `player_private`, which row-level security hides from everyone except that player and coaches.
