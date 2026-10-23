# Accounts setup

The site stays a static GitHub Pages app. With `config.js` empty, it keeps the sample roster in this browser. Fill in the URL and anon key after the Supabase project exists, then run the migration and deploy the invite function.

## 1. Create the project

In Supabase, create a project. Authentication → Providers → Email should stay on. Turn off public sign-up if you want every player to arrive through a coach invite. Invites still work with sign-up disabled.

Authentication → URL configuration: add the Pages URL and `http://127.0.0.1:8765` as redirect URLs so password resets land back on the site.

## 2. Run the migration

Apply `supabase/migrations/20261023140000_init_accounts.sql` in the SQL editor, or from the CLI:

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

That file creates:

- `players` — public card fields (name, team, OVR, tier, category grades). Readable without a login.
- `player_private` — metrics, reading log, history, XP, and the full player document. Readable only by that player’s login and by coaches.
- `player_accounts` — the invite email. Coach-only. A 12U account uses a parent’s email and still maps to that one player. One email can map to one player; a second child needs a second address.
- `profiles` — `coach` or `player`, plus the linked `player_id`.
- `is_coach()` and the new-user trigger. The trigger always creates a `player` profile. It links the card only when the email matches `player_accounts`. It never trusts a signup payload that says `role: coach`.

## 3. Publish the anon key

In `config.js`:

```js
const ANTONELLI_CONFIG = {
  SUPABASE_URL: "https://YOUR_REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_ANON_KEY",
};
```

The anon key is public. Do not put the service role key in `config.js` or anywhere the browser can download.

## 4. Deploy invites

The browser cannot send invite email. `supabase/functions/invite-players` checks the caller’s JWT, confirms `profiles.role = 'coach'`, then uses the service role inside the function.

```bash
supabase functions deploy invite-players
```

`supabase/config.toml` sets `verify_jwt = false` for this function so the browser preflight is not rejected. The function still requires a signed-in coach: it reads the caller’s JWT, checks `profiles.role`, and only then uses the service role.

Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into the function. Do not copy that service key into the repo.

## 5. Make Matt the coach

Sign up or invite Matt’s own email once, then in the SQL editor:

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

Head-to-head challenges, reactions, King of the Hill claims, the inbox, and highlight video files still use this browser’s storage (`antonelli-road-facility-v1`, `antonelli-road-inbox-v1`, and IndexedDB). The public pages (roster, card faces, leaderboards, Card of the Day, King of the Hill standings that are computed from public grades, awards on the card) read the shared `players` rows once config is set. The personal page (My Game Plan, Where I Started, the reading log, missions, XP, Development Coach) reads `player_private`, which row-level security hides from everyone except that player and coaches.
