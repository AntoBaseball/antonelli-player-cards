# Antonelli Baseball — Player Profiles & Baseball Cards

A polished, self-contained static web app prototype (v2) for Antonelli Baseball player profiles. Each player has a profile showing what type of hitter/pitcher they are, what they do well, what they need to improve, their metrics and progress — and a baseball card with an MLB The Show-style overall grade (20–99) that improves as metrics improve.

**No build step, no backend, no external images.** Plain HTML/CSS/JS.

## How to open / run

From the root of this repository (the folder that contains `index.html`).

Option A — just open the file:

```
Open index.html in any modern browser (double-click it).
```

Option B — serve it locally (recommended, closest to how it would be deployed):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Stop the server with `Ctrl+C`.

## GitHub Pages

This site is static. GitHub Pages can host it from the `main` branch with no build command.

1. Open this repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Set the branch to **main** and the folder to **/ (root)**, then save.

After the first deploy finishes, the site is published at:

```
https://antobaseball.github.io/antonelli-player-cards/
```

Pages only serves what is on `main`. If the app landed through a pull request, merge that pull request first, then follow the steps above.

## What's built

- **Roster view** — all players as baseball cards, with search and filters by player type (hitter / pitcher / two-way), team, plus sorting by overall, name, or age.
- **5 sample players** (see note below), covering Power Hitter, Contact/Leadoff, Ace, Closer, and Two-Way archetypes. Tiers follow the grades: with the sample Blast numbers, the roster spans Bronze, Silver, and Gold.
- **Profile detail view** — click a card for a dark player screen: large card, huge name, position diamond, quick facts, and tabs for Attributes, Metrics & History, Player Perks, and Strengths & Growth. See [Player profile](#player-profile).
- **Player Perks** — up to three perks on the card front. Training perks unlock from milestones and stay once earned. A new perk opens a sealed pack once. Show perks are coach-awarded. See [Player Perks](#player-perks).
- **Celebrations** — an overall climb plays a short card bounce and count-up. Crossing into Silver, Gold, or Diamond takes over the screen. See [Celebrations](#celebrations).
- **Baseball card (front, v2 — Topps / MLB The Show style)** — vertical portrait card (5:7, the classic 2.5"×3.5" ratio). The player visual fills the card over a geometric black & gold background with a stitched/dashed frame edge:
  - **Diamond-shaped overall badge** (rotated diamond, clip-path) in the **top-right** with the overall number.
  - **Player name in bold italic uppercase at bottom-right**, with a gold position bar under it (`CF - R/R` = position + bats/throws), team/age line, and a small archetype label.
  - **Antonelli star + team code watermark at bottom-left** (star redrawn as clean inline SVG — see Brand assets; team code derived from the team name, e.g. `Antonelli 17U` → `A17U`).
  - **Sub-grade strip** across the bottom of the card so tool grades stay readable without cluttering the visual.
  - **Tier design (all in the black & gold family)** so crossing 70/80/90 is obvious: Bronze <70 = muted bronze-gold, darker; Silver 70–79 = silver-grey with a gold frame; Gold 80–89 = rich, bright gold; Diamond 90+ = black card with bright gold glow/trim and the **only cyan accent in the app — the diamond badge** — so Diamond still pops like the reference card.
- **Photo upload + logo placeholder** — in Add/Edit, upload a player photo (JPG/PNG). It is read in the browser, downscaled to max 800px, stored as a data URL with the player in `localStorage`, and shown full-bleed on the card and profile. **Clear photo / use logo** removes it. With no photo, the card and profile show the Antonelli A-star (`assets/antonelli-a-star.png`) centered in the photo area, at its natural aspect ratio, over the tier gradient. The small team-code star stays in the name bar, drawn a little smaller so it does not compete with the logo. All 5 sample players have `photo: ""`, so they show the logo.
- **Edit / Add player** — "Edit Metrics / Profile" on a profile, or "+ Add Player" in the header. Metrics use synced sliders + number inputs; the overall, sub-grades, and tier update **live** in the form preview before you save. Saving a changed metric appends it to that metric's history, so the previous value, delta arrow, and sparkline show progress.
- **Persistence** — all changes save to browser `localStorage` (key: `antonelli-player-cards-v2`), so a refresh keeps your edits. Cards saved under the older key `antonelli-player-cards-v1` are migrated once: hitter exit-velocity / contact / speed / fielding / arm fields are replaced with Blast metrics, bat speed is kept when it was between 25 and 95 mph, other hitting numbers start at the middle of that age group's published window, and pitcher metrics are kept. A one-time banner explains the reset. **Reset Sample Data** (header) restores the original 5 sample players.
- **Responsive** — works on mobile; cards and profile stack cleanly on small screens.

## Brand: black & gold

Antonelli Baseball's main colors are **black and gold** (`#d4af37` / `#c9a227`, pale gold `#f7ecc8`). The whole UI follows it: black header/hero, gold buttons and accents, cream page background, bold italic athletic headings, and gold-outlined dark lettering inspired by the logos. UI chrome keeps that black/gold identity in every tier; only the card backgrounds/badges vary by tier (above).

### Logo assets (`assets/`)

| File | What it is | How it's used |
|---|---|---|
| `assets/antonelli-block.png` | ANTONELLI in black italic block letters with gold outline (dark grunge banner) | Header logo (shown at natural aspect ratio, never distorted) |
| `assets/antonelli-script.png` | Antonelli in black script with gold outline + swoosh (cream/pale-gold banner) | Hero brand banner |
| `assets/antonelli-star.png` | White star with black/gold outline | Cropped from the source banner to the star only — the original banner's `#TEAMTRITON`/sponsor text is **not** used anywhere. On cards and in the header the star is actually drawn as a clean inline SVG (white fill, black outline, gold inner outline) matching this asset, so it stays crisp and transparent at any size. |
| `assets/antonelli-a-star.png` | Black star, gold outline, white “A” | Placeholder on a card or profile when the player has no uploaded photo. Shown centered, unstretched, over the tier background. |

## How the overall grade is calculated

The formula lives in `app.js`. Hitters use `BLAST_BENCHMARKS` and `gradeBlastMetric`. Pitchers still use `METRICS` low/high. Weights live in `SUBGRADES`. Grades are calculated, never stored, so editing a metric **or the age group** recalculates the card everywhere.

**Age groups** (from age, unless the Age Group field is set): 10U (≤10), 12U (11–12), 14U (13–14, Blast Middle School), 16U (15–16, HS JV), 18U (17–18, HS Varsity), College (19–22), Pro (23+).

**Band names** come from the 20–99 grade. These names and cuts are Antonelli, not a Blast scale:

| Grade | Band |
|---|---|
| 20–49 | Below Average |
| 50–64 | Average |
| 65–79 | Good |
| 80–89 | Great |
| 90–99 | Elite |

**Tier from overall:** Bronze <70, Silver 70–79, Gold 80–89, Diamond 90+.

### Hitter weights

Bat speed is the largest piece of the hitter overall (40%).

| Sub-grade | What it uses | Weight of overall |
|---|---|---|
| `BAT` | Bat speed | **40%** |
| `PWR` | Power 60% + peak hand speed 40% | 22% |
| `PLANE` | On-plane efficiency 50% + attack angle 30% + vertical bat angle 20% | 18% |
| `QUICK` | Time to contact 55% + rotational acceleration 45% | 14% |
| `CONN` | Early connection 50% + connection at impact 50% | 6% |

Exit velocity, launch angle, contact %, 60 time, fielding, and throwing velocity are **not** part of the hitter grade. Pitchers are unchanged: `VEL` 30% · `BRK` (spin 45% + whiff 55%) 25% · `CNTL` 30% · `STM` 15%. Two-way overall is the average of the hitter overall and the pitcher overall.

To retune hitting grades, edit `BLAST_BENCHMARKS` (the published windows) and `gradeBlastMetric` / `gradeHigher` / `gradeLower` / `gradeIdeal` / `gradeOnPlane` (how a window becomes 20–99).

### Where the Blast numbers come from

Searched blastmotion.com (product page, FAQ, metric glossary, bat-speed / hand-speed / rotational-acceleration articles). `support.blastmotion.com` returned no benchmark pages. The product-page chart is [How Do You Measure Up?](https://blastmotion.com/products/baseball/). Its "View More" control did not expose extra rows. The "Amateur All Levels" column is real and is **not** mapped to an age group.

| Source | URL | What we took from it |
|---|---|---|
| Product benchmarks | https://blastmotion.com/products/baseball/ | Level chart for bat speed, attack angle, vertical bat angle, time to contact, peak hand speed, power. All-level windows for on-plane (65–85%, aim 70%+), early connection (90°, 80–105°), connection at impact (90°, 80–95°). |
| FAQ | https://blastmotion.com/faq/ | The 10 hitter metrics, bat-speed chart by level, MLB averages (bat speed 71.6 mph, attack angle 8.7°, time to contact 0.149 s, peak hand speed 22.3 mph, power 4.5 kW, on-plane 68.6%, rotational acceleration 15.1 g). |
| Bat speed by age | https://blastmotion.com/blog/what-is-bat-speed-in-baseball/ | 10U and 12U bat speed, and a second copy of the older-level bat-speed chart (400M+ swings, 29 May 2026). |
| Metric glossary | https://blastmotion.com/blog/what-does-blast-motion-measure/ | Confirms youth/pro endpoints and the all-level connection, on-plane, and vertical-bat-angle targets. Points back at the product-page chart. |
| Rotational acceleration | https://blastmotion.com/blog/what-is-rotational-acceleration-in-baseball/ | Not by age: below 10 g low, 10–14.99 g medium, 15+ g high. Article MLB average 17 g. |
| Hand-speed article | https://blastmotion.com/blog/what-is-hand-speed-in-a-baseball-swing/ | A **different** hand-speed table. Cited, not used. See conflicts below. |

### Published windows that are graded

`lo`–`hi` below are copied from those pages. 10U and 12U bat speed come from the age article. Every other 10U and 12U row is the product-page **Youth** column applied to both groups, because Blast does not split that metric. That reuse is marked in code with `sharedYouth`.

**Bat speed (mph), higher is better**

| Group | Blast level | Window | Which page |
|---|---|---|---|
| 10U | 8–10 (8U–10U) | 30–45 | Age article only (finer than Youth 40–56) |
| 12U | 11–12 | 40–52 | Age article only |
| 14U | Middle School | 46–62 | Product page, FAQ, and age article |
| 16U | HS JV | **55–65** | FAQ and age article |
| 18U | HS Varsity | 60–70 | Product page, FAQ, and age article |
| College | College | **66–75** | Product page and FAQ |
| Pro | Pro / MLB | 66–78 | Product page, FAQ, and age article |

**Attack angle (degrees), ideal window.** Peak used for scoring is the center of the window (Antonelli). Blast does not print a single target. MLB average 8.7° is context only.

| Group | Window |
|---|---|
| 10U, 12U | 0–15 (Youth column on both) |
| 14U, 16U | 0–15 |
| 18U, College | 2–15 |
| Pro | 5–15 |

**Vertical bat angle:** −40° to −10° at every level (product page and glossary). Pitch-location specific. Scoring peaks at −25°, the center — that peak is Antonelli.

**Time to contact (seconds), lower is better.** Fast end is `lo`.

| Group | Window |
|---|---|
| 10U, 12U | 0.17–0.23 (Youth column on both) |
| 14U | 0.16–0.21 |
| 16U | 0.15–0.20 |
| 18U | 0.15–0.18 |
| College | 0.14–0.17 |
| Pro | 0.13–0.17 |

**Peak hand speed (mph), higher is better.** Product-page chart.

| Group | Window |
|---|---|
| 10U, 12U | 15–21 (Youth column on both) |
| 14U, 16U | 17–21 |
| 18U | 19–23 |
| College | 21–25 |
| Pro | 23–29 |

**Power (kW), higher is better.** Product-page chart. College high is the printed 5.074.

| Group | Window |
|---|---|
| 10U, 12U | 0.90–2.50 (Youth column on both) |
| 14U | 1.40–3.20 |
| 16U | 2.17–3.45 |
| 18U | 2.81–4.09 |
| College | 3.83–5.074 |
| Pro | 3.65–5.65 |

**On-plane efficiency:** 65–85% at every age, aim 70%+ (product page, glossary, FAQ). No age split.

**Early connection:** 80–105°, target 90°, every age.

**Connection at impact:** 80–95°, target 90°, every age.

**Rotational acceleration:** the same buckets at every age — below 10 g low, 10–14.99 g medium, 15+ g high. Not an age table.

### Official numbers we did not grade against

These are real Blast figures. They disagree with the table above, so they are not silently averaged in.

- **HS JV bat speed.** The product page prints **55–56 mph**. The FAQ and the age article both print **55–65**. The graded window is 55–65. A 1 mph "range" on that one cell looks like a bad print.
- **College bat speed.** The product page and FAQ print **66–75**. The age article prints **65–75**. The graded window is 66–75.
- **Peak hand speed article** prints Youth 17–23, Middle School 18–24, HS JV 19–25, HS Varsity 20–26, College 21–27, MiLB 22–28, Pro 23–29. The graded windows are the product-page chart (Youth 15–21 through Pro 23–29). MiLB is not an age group here.
- **Rotational acceleration averages disagree:** FAQ 15.1 g, June 2026 article 17 g. Neither average is a band edge. The article's low / medium / high buckets are.
- **Blast iQ Rotation Score** ("above 50 for your level", 20–80 scale) is not raw rotational acceleration in g, so it is not a hitter metric here.
- **Amateur All Levels** (product page: bat speed 55–65, attack angle 0–15, time to contact 0.15–0.20, hand speed 17–21, power 2.17–3.45) is not used as its own age group.

### Antonelli gaps — not Blast-official

Blast publishes the windows. It does not publish these scoring choices:

- The five band names and every 20–99 cut. For a higher-better metric, the published low starts Average (50), the midpoint starts Good (65), and the published high starts Great (80). One full span past the published high reaches 99. Lower-better mirrors that, so the fast end scores like the high end. Coaches change this in `gradeHigher` and `gradeLower`.
- Anything above a published high, or faster than a published fast end.
- On-plane internal cuts: under 65 Below Average, 65–70 Average, 70–78 Good, 78–85 Great, 85 and up Elite. **78** and **Elite from 85 up** are Antonelli. 65, 70, and 85 are Blast.
- Rotational acceleration: 10 g starts Average and 15 g starts Great, using the higher-better curve. The split of the medium bucket at **12.5 g**, and Elite as the number approaches **20 g**, are Antonelli.
- Ideal-range curve: 96 on the target, about 70 on either published edge, then down toward 20 outside the window. Attack angle and vertical bat angle peak at the **center** because Blast does not name a single target. Early connection and connection at impact peak at Blast's **90°**.
- Putting the Youth column on both 10U and 12U for attack angle, vertical bat angle, time to contact, peak hand speed, and power. The mph / degrees / seconds / kW are the Youth column. Calling them "10U" and "12U" separately is ours. Bat speed is the exception: 30–45 and 40–52 are published by age.
- Hitter sub-grade groups and the 40 / 22 / 18 / 14 / 6 weights.
- Pitcher velocity, spin, strike %, whiff %, and pitch-capacity ranges. Those stayed in `METRICS` and were never Blast numbers.

## Player Perks

Player Perks are earned badges on the card, inspired by MLB The Show quirks (called Player Perks here). The Show names and effects come from the MLB The Show 26 active list on [ShowZone](https://showzone.gg/players/quirks) (21 quirks). That page describes every one of them as a situational boost. None are penalties, so **0 were excluded**. "Bad Ball Hitter" stays, because it means he can still do damage on a pitch just off the plate.

Two kinds of perks, labeled differently:

- **Earned** — original Antonelli training perks. Checked live from metrics, age-group bands, overall tier, and metric history. The first time a milestone is true, the perk is stored on the player (`earnedQuirks`: id, milestone text, date, `seen`). **Once earned, it stays** even if the number later drops. A new earn opens the pack once. **Add to my card** marks `seen`, so a reload does not show that perk again. Click an earned perk on the profile, or **Open again**, to replay the pack.
- **Coach Awarded** — the Show list. A coach checks them in Add/Edit. This app does not have at-bat situations (day game, runner on third, fastball vs breaker), so these are not auto-scored.

The card front shows up to 3 perks (earned ones first) plus a +N count. The profile lists every perk, the category, and the milestone.

Training is the largest category (23). The +5 mph bat-speed perk (Heat Check) is separate from the +3 mph perk (Bat Speed Builder): a jump straight to +5 earns Heat Check. If a player already earned +3 and later reaches +5, both stay.

### Training milestones

Edit the thresholds in `TRAINING_QUIRKS` in `app.js`.

| Perk | Milestone |
|---|---|
| Heat Check | Bat speed gain ≥ 5 mph from the first logged check-in |
| Bat Speed Builder | Bat speed gain ≥ 3 mph and under 5 mph |
| Power Surge | Power gain ≥ 0.40 kW |
| Plane Climber | On-plane efficiency gain ≥ 5 points |
| Quick Trigger | Time to contact faster by ≥ 0.015 s |
| Fast Twitch | Rotational acceleration gain ≥ 2 g |
| Quick Hands | Peak hand speed gain ≥ 2 mph |
| Metronome | 4+ check-ins and bat speed (hitters / two-way) or fastball (pitchers) stays inside a 2.5 mph window |
| Added Gas | Fastball gain ≥ 3 mph |
| Spin Lab | Spin gain ≥ 150 rpm |
| Strike Painter | Strike % gain ≥ 5 points |
| Whiff Maker | Whiff % gain ≥ 6 points |
| Deep Start | Pitch capacity gain ≥ 12 pitches |
| Both Sides | Two-way player with a hitting gain and a pitching gain in the same block |
| Diamond Standard | Overall ≥ 90 |
| Gold Standard | Overall 80–89 |
| Silver Standard | Overall 70–79 |
| Elite Barrel | Bat speed grades Elite for the age group |
| Great Barrel | Bat speed grades Great for the age group |
| Stay Connected | Early connection or connection at impact moves ≥ 4° closer to 90° |
| Path Finder | Attack angle moves ≥ 2° closer to the age-group target |
| Three-Tool Climb | Bat speed ≥ +2 mph, power ≥ +0.30 kW, and on-plane ≥ +4 points |
| Cage Rat | 4+ check-ins on at least 4 different metrics |

### Show perks (coach awarded)

Hitting: Dead Red, Breaking Ball Hitter, Bad Ball Hitter, First-Pitch Hitter, Unfazed, Situational Hitter, Table Setter, Pinch Hitter.

Pitching: Outlier I, Outlier II, Break Outlier, Pressure Cooker, Stopper, Pick Off Artist.

Fielding: Catcher Pop Time.

Intangibles: Fighter, Rally Monkey, Homebody, Road Warrior, Day Player, Night Player.

### Motion

Cards carry a slow gold sheen while they are on screen. On a desktop that can hover, and when the user has not asked for reduced motion, hovering a card tilts it slightly and speeds the sheen. Gold and Diamond overall badges glow while the card is on screen; Diamond is the stronger glow. Sheen and badge glow run only while the card is near the viewport.

A new Player Perk opens as a sealed black-and-gold foil pack (A-star, “PLAYER PERKS”, a shimmer). Nothing tears until the player clicks **Open Pack**. The top rip, a shine burst, and the perk card slide out, then the card flips to the name, description, milestone, and player. Several new perks are in one pack: after the open, **Next Perk** walks through them, and the last button is **Add to my card**. **Open again** on the profile replays that pack and does not clear the seen flag. `prefers-reduced-motion` turns the sheen, tilt, glow, pack shimmer, rip, and flip off. Open Pack then fades straight to the perk face. There is no tear.

## Celebrations

The card remembers the last overall and tier the player has already been shown (`gradeSeen` on the player, saved with everything else in `localStorage`).

- The first time a player is seen — samples, a new card, or an older save with no `gradeSeen` — the app stores the current overall and tier and stays quiet.
- **Overall up** plays when the overall number rises and the tier does not. The card bounces, the sheen speeds up, the badge counts from the old number to the new one, a +N line pops, and a few gold bits fly. About 2 seconds, then **Collect**.
- **Tier up** plays only when the tier rises: Silver at 70, Gold at 80, Diamond at 90. The screen goes black, a spotlight hits the card, the card shakes and then shakes harder, a flash and particle burst hit, and the card comes back in the new tier color with the tier name and the new overall. About 4 seconds. **Skip** jumps to that payoff. **Collect** is what marks it seen.
- A drop in overall or tier updates `gradeSeen` immediately and does not celebrate.
- Collect writes the new overall and tier into `gradeSeen`. Reload before Collect plays the same celebration again. After Collect, that value does not play again.
- **Preview overall-up** and **Preview tier-up** on the profile replay the motion for a coach. They do not change `gradeSeen`.

One save can earn a tier, an overall jump, and new perks. The order is tier-up, then overall-up, then the Player Perks pack. A tier-up already shows the new overall, so that save does not also open an overall-up. Nothing is dropped: each step stays queued until its Collect (or, for a perk, Open Pack and Add to my card). `prefers-reduced-motion` skips the shake, bounce, count-up, flash, and particles and shows the new number and tier immediately.

## Player profile

The screen that opens from a card is laid out like a baseball-game player page, in Antonelli black and gold. It does not use MLB or The Show logos.

The header puts the animated card on the left, the last name large beside it, a rotated position badge, team, archetype, and a facts grid: overall, tier, bats, throws, secondary position, height, weight, age and age group, team, class/year, and hometown. Overall includes a small chip when the grade moved since the previous saved check-in. That chip is the overall now minus the overall computed from the prior history point on each metric. It is labeled “since last assessment.”

Optional fields added to the player and the add/edit form: `secondaryPosition`, `height`, `weight`, `hometown`. Blank fields show —. Older saves in `localStorage` keep working; missing fields stay blank. The card and roster still print `OF / 1B` when a secondary position is set.

Tabs, left to right:

| Tab | What it holds |
|---|---|
| Attributes | Tall bars. Hitters get hitting tools (BAT, PWR, PLANE, QUICK, CONN) and Blast grades (bat speed, hand speed, power, plane, attack, vertical bat angle, time to contact, rotational acceleration, both connections). Pitchers get VEL, BRK, CNTL, STM plus fastball, spin, strike %, whiff %, and capacity. Two-way players get both groups, labeled. |
| Metrics & History | The existing table: current, previous, change, sparkline, band, grade. |
| Player Perks | Earned and coach-awarded perks, Open again, and click-to-replay. |
| Strengths & Growth | Archetype note, how the grade is built, strengths, and areas to improve. |

Bar fill is the 20–99 grade as a percent of 99. Color follows the band: red Below Average (under 50), bronze Average (50–64), gold Good (65–79), green Great (80–89), cyan Elite (90–99). Hover a bar for the band name. Bars grow from the bottom when the profile opens. `prefers-reduced-motion` shows them at full height with no grow. On a narrow screen the bar row scrolls sideways.

The right rail is a Blast snapshot for hitters (raw mph, degrees, seconds, and the age-group band) and a pitch-metric list with a short meter for pitchers. Two-way players get both. Edit, preview overall-up, preview tier-up, and delete stay in the header. Back to roster stays above the screen.

## Sample data note

⚠️ **All 5 players are invented for this prototype** (Mason Carter, Eli Ramirez, Noah Bennett, Connor Walsh, Dylan Brooks). Names, metrics, strengths, and history are fictional and do not represent real people. The app labels this in a banner on the page itself.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure: roster, profile, add/edit modal |
| `styles.css` | Antonelli black & gold branding, v2 portrait-card tiers, responsive layout |
| `app.js` | Sample data, Blast benchmarks, Player Perks, celebrations, grade formula, card rendering, localStorage persistence |
| `assets/` | Antonelli block, script, and star logos (see Brand assets) |
| `README.md` | This file |

## Suggested next steps

1. **Accounts / login** — coach, player, and parent accounts so each player sees their own card and progress.
2. **Coach vs. player permissions** — coaches edit metrics and evaluations; players/parents get read-only views (this matters so grades stay trusted).
3. **Real database** — replace `localStorage` with a backend (e.g. Supabase/Firebase or a small API) so data syncs across devices and coaches.
4. **Photo management** — ~~photo upload~~ ✅ done in v2 (browser-side, in localStorage). Next: cloud photo storage, cropping/positioning, and background removal so photos cut out over the card art like the reference.
5. **Age-group Blast windows** — done for hitters (10U through Pro). Next: let a coach save their own window edits, and add a source tag (tee / front toss / game) on each metric entry.
6. **Metric entry workflow** — session-based entries (date, coach, source: radar/Blast/TrackMan/game) with notes, instead of editing a single current value.
7. **Card back + sharing** — flip the card for full metrics/history; export/share as an image for social posts.
8. **Deploy to GitHub Pages** — see [GitHub Pages](#github-pages) above. Settings → Pages → deploy from the `main` branch, folder `/ (root)`. No server is needed until accounts or a database are added.

## Notes / limitations (v2)

- Data is per-browser (`localStorage`) — clearing browser data or switching devices loses edits unless you reset/re-enter them.
- Grades are a development guide, not a scouting or recruiting guarantee.
- No login or multi-coach sync yet — see next steps above. Photos are stored per-browser in localStorage (downscaled to max 800px); very large rosters with many photos can hit the browser storage limit, which the app warns about on save.
