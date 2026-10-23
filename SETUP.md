# Accounts setup

The site stays a static GitHub Pages app. The live Supabase project ref is `cqmzxrhoxnktjrzqtdsi` (`https://cqmzxrhoxnktjrzqtdsi.supabase.co`). `config.js` already has that URL and the public anon key.

Done on the live project: every file in [Migrations](#2-migrations), in that order. Edge function `invite-players` is deployed with `verify_jwt = false`. It is no longer the way players join.

Until `players` has a row, logged-out visitors still see the invented sample cards, with a banner that says the shared roster is empty. The first real row replaces those cards. Clearing both config strings turns accounts off and keeps the sample roster only.

## 1. Project

Authentication → Providers → Email stays on. Turn **Confirm email** off so a player who opens a sign-up link is signed in immediately and lands on their page. If confirmation stays on, the page tells them to open the confirmation email instead of signing them in.

Public sign-up can stay enabled. The trigger rejects a sign-up unless that email is an open invite and the sign-up carries that invite's join token. Coach and admin logins cannot be created from the dashboard while the trigger is on.

Authentication → URL configuration: add the Pages URL `https://antobaseball.github.io/antonelli-player-cards/` and `http://127.0.0.1:8765` as redirect URLs so password resets land back on the site.

## 2. Migrations

Already applied, in this order. Do not run them again.

1. `supabase/migrations/20261023140000_init_accounts.sql` — accounts. Public `players`, private `player_private`, invite rows, `profiles`, and `is_coach()`.
2. `supabase/migrations/20261023150000_harden_functions.sql` — `touch_updated_at` search_path cleared, and anon execute revoked on `is_coach()`.
3. `supabase/migrations/20261023160000_join_links.sql` — a new `auth.users` row must match an open invite email and join token. Supabase Auth inserts users on its own connection, so the trigger does not look at `auth.role()`.
4. `supabase/migrations/20261023170000_social.sql` — challenges, reactions, crowns, notifications, and highlights.
5. `supabase/migrations/20261023180000_notify_dedupe.sql` — challenge notes are unique per challenge. Reactions stay one note per player per UTC day.
6. `supabase/migrations/20261023190000_metrics_coach_only.sql` — a player cannot change `metrics` or `history`.
7. `supabase/migrations/20261023200000_document_allowlist.sql` — a player can change only `readingLog`, `earnedQuirks`, `gradeSeen`, and the player-owned keys inside `road`.
8. `supabase/migrations/20261023210000_pin_helper_search_path.sql` — empty `search_path` on `jsonb_is_blank`, `player_road_keys`, and `player_document_keys`.

The first migration created:

- `players` — public card fields (name, team, OVR, tier, category grades). Readable without a login.
- `player_private` — metrics, reading log, history, XP, and the full player document. Readable only by that player’s login and by coaches.
- `player_accounts` — the invite email, join token, and status (`invited` or `joined`). Coach-only. A 12U account uses a parent’s email and still maps to that one player. One email can map to one player; a second child needs a second address.
- `profiles` — `coach` or `player`, plus the linked `player_id`.
- `is_coach()` and the new-user trigger. The trigger always creates a `player` profile. It links the card only when the email matches `player_accounts`. It never trusts a signup payload that says `role: coach`.

## 3. Anon key

Already in `config.js` for project `cqmzxrhoxnktjrzqtdsi`. The anon key is public. Do not put the service role key in `config.js` or anywhere the browser can download.

## 4. Sign-up links

Players do not get a Supabase invite email. The built-in mailer cannot send a couple hundred of them. A coach adds players (one at a time, or a CSV with `name,team,ageGroup,position,email`, up to 200). Each row gets a random join token.

**Sign-up links** lists every player with their status and a personal link:

`https://antobaseball.github.io/antonelli-player-cards/?join=<token>`

Copy one link, or download a CSV (`name,email,team,link`) and mail-merge it from Gmail. Opening the link shows that player's name and card and a locked email. They choose a password. The token works once.

`supabase/functions/invite-players` is still in the repo if a single Supabase invite is ever needed. The coach screen does not call it. Do not put the service role key in the browser.

## 5. Coach login

Matt's coach login already exists: `mattantonelli9@gmail.com`, role `coach`. Role changes from the browser are ignored.

To add another coach or admin, pause the sign-up trigger in the SQL editor, create the user, then turn the trigger back on:

```sql
alter table auth.users disable trigger enforce_roster_signup;
-- create the user in the dashboard, then:
alter table auth.users enable trigger enforce_roster_signup;
```

```sql
update public.profiles
set role = 'coach'
where id = (select id from auth.users where email = 'coach@example.com');
```

## 6. Fill the roster

Signed in as coach, the settings menu has:

- **Sign-up links** — name, email, invited or joined, the personal link, Copy, and Download CSV.
- **Add one player** — name, team, age group, position, email. Creates the card and a link. It does not send mail.
- **CSV** — header row `name,team,ageGroup,position,email`. Up to 200 rows. Same result as adding one player.
- **Upload this browser’s roster** — one-time copy of the sample or local roster into `players` and `player_private`. Sample cards have no emails, so this does not create links. Add a player with an email after.

A player who finishes the sign-up link lands on their own card and personal page. Coaches can open every card, enter tests, and edit the roster.

## 7. Shared challenges, reactions, crowns, inbox, highlights

`supabase/migrations/20261023170000_social.sql` is applied. A signed-in player reads and writes the shared tables. Do not run the older account migrations again.

What that migration added:

- `challenges` — from player, to player, category, end date, status, server-picked winner. You cannot challenge yourself. Only the challenged player can accept or decline. When the end date has passed, `settle_due_challenges()` scores it from `player_private`. The browser cannot set the winner.
- `reactions` — one emoji per player per card per day, and at most 8 reactions a day. Not on your own card.
- `koth_claims` — King of the Hill. `refresh_koth()` reads private metrics and writes a row only when the age-group leader changes. Players do not insert crowns.
- `notifications` — written only by those triggers. A player reads and marks their own. One kind per player per UTC day. The coach can delete any row.
- `highlights` — a link or a file in the private Storage bucket `highlights`. Uploads go in a folder named with that user's id. Cap is 50 MB. Types are MP4, WebM, MOV, and OGG.

Row-level security uses `is_coach()` and `(select auth.uid())`. A player reads social rows for their own card and for players with the same `team` value. Crown rows are also readable inside the same age group, so the throne is visible when the holder is listed on another team string. The coach can moderate and delete. Logged-out visitors still see only public cards.

Realtime is on for `notifications` and `challenges` only. Reactions, crowns, and highlights refresh when the page loads and after the signed-in player saves one.

`supabase/migrations/20261023180000_notify_dedupe.sql` is applied. A second challenge on the same day notifies. Reactions stay one note per day.

`supabase/migrations/20261023190000_metrics_coach_only.sql` and `supabase/migrations/20261023200000_document_allowlist.sql` are applied. A player cannot change `metrics` or `history`. A player update may change only `readingLog`, `earnedQuirks`, `gradeSeen`, and the player-owned keys inside `road` (missions, quest totals, XP, streaks, highlights, card lab). Age, position, photo, coach quirks, the coach plan, bio, and the rest of the profile stay with the coach. The signed-in player save sends only those keys.

`supabase/migrations/20261023210000_pin_helper_search_path.sql` is applied. `jsonb_is_blank`, `player_road_keys`, and `player_document_keys` use an empty `search_path`.

Demo mode (empty config, or signed out) does not call these tables. Sample challenges, reactions, and the Cage session link stay in `localStorage`. Demo highlight files stay in IndexedDB and still cap at about 1.2 MB. Quest XP claims and personal reminders (streak, XP close, rival) stay on the device even after the migration, because they are not team posts.

The public pages (roster, card faces, leaderboards, Card of the Day) read the shared `players` rows. While that table is empty they keep showing the sample cards. The personal page (My Game Plan, Where I Started, the reading log, missions, XP, Development Coach) reads `player_private`.
