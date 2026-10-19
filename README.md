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
- **5 sample players** (see note below), covering Power Hitter, Contact/Leadoff, Ace, Closer, and Two-Way archetypes across Bronze–Diamond tiers.
- **Profile detail view** — click any player for: archetype explanation ("what type of player is he?"), strengths, areas to improve, a metrics table (current, previous, change, history sparkline, per-metric grade), and the large baseball card side-by-side.
- **Baseball card (front, v2 — Topps / MLB The Show style)** — vertical portrait card (5:7, the classic 2.5"×3.5" ratio). The player visual fills the card over a geometric black & gold background with a stitched/dashed frame edge:
  - **Diamond-shaped overall badge** (rotated diamond, clip-path) in the **top-right** with the overall number.
  - **Player name in bold italic uppercase at bottom-right**, with a gold position bar under it (`CF - R/R` = position + bats/throws), team/age line, and a small archetype label.
  - **Antonelli star + team code watermark at bottom-left** (star redrawn as clean inline SVG — see Brand assets; team code derived from the team name, e.g. `Antonelli 17U` → `A17U`).
  - **Sub-grade strip** across the bottom of the card so tool grades stay readable without cluttering the visual.
  - **Tier design (all in the black & gold family)** so crossing 70/80/90 is obvious: Bronze <70 = muted bronze-gold, darker; Silver 70–79 = silver-grey with a gold frame; Gold 80–89 = rich, bright gold; Diamond 90+ = black card with bright gold glow/trim and the **only cyan accent in the app — the diamond badge** — so Diamond still pops like the reference card.
- **Photo upload + silhouette fallback** — in Add/Edit, upload a player photo (JPG/PNG). It is read in the browser, downscaled to max 800px, stored as a data URL with the player in `localStorage`, and shown full-bleed on the card and profile. **Clear photo / use silhouette** removes it. With no photo, the card shows a solid filled silhouette: a hitter in a loaded stance for hitters and two-way players, mirrored when bats is L (bats R, bats S, or a missing bats value uses the right-handed stance), and a pitcher at leg lift for pitchers (black on lighter Silver/Gold tiers, gold on dark Bronze/Diamond). All 5 sample players have `photo: ""`, so they demonstrate the silhouette.
- **Edit / Add player** — "Edit Metrics / Profile" on a profile, or "+ Add Player" in the header. Metrics use synced sliders + number inputs; the overall, sub-grades, and tier update **live** in the form preview before you save. Saving a changed metric appends it to that metric's history, so the previous value, delta arrow, and sparkline show progress.
- **Persistence** — all changes save to browser `localStorage` (key: `antonelli-player-cards-v1`), so a refresh keeps your edits. **Reset Sample Data** (header) restores the original 5 sample players.
- **Responsive** — works on mobile; cards and profile stack cleanly on small screens.

## Brand: black & gold

Antonelli Baseball's main colors are **black and gold** (`#d4af37` / `#c9a227`, pale gold `#f7ecc8`). The whole UI follows it: black header/hero, gold buttons and accents, cream page background, bold italic athletic headings, and gold-outlined dark lettering inspired by the logos. UI chrome keeps that black/gold identity in every tier; only the card backgrounds/badges vary by tier (above).

### Logo assets (`assets/`)

| File | What it is | How it's used |
|---|---|---|
| `assets/antonelli-block.png` | ANTONELLI in black italic block letters with gold outline (dark grunge banner) | Header logo (shown at natural aspect ratio, never distorted) |
| `assets/antonelli-script.png` | Antonelli in black script with gold outline + swoosh (cream/pale-gold banner) | Hero brand banner |
| `assets/antonelli-star.png` | White star with black/gold outline | Cropped from the source banner to the star only — the original banner's `#TEAMTRITON`/sponsor text is **not** used anywhere. On cards and in the header the star is actually drawn as a clean inline SVG (white fill, black outline, gold inner outline) matching this asset, so it stays crisp and transparent at any size. |

## How the overall grade is calculated

The formula lives in `app.js` (top comment + `METRICS` / `SUBGRADES`) and is fully transparent:

1. **Normalize each raw metric to a 20–99 grade** against an age-appropriate benchmark range for roughly ages 14–18 travel / high-school baseball. Example: exit velocity maps 65 mph → 20 and 102 mph → 99, linearly in between. Lower-is-better metrics (60-yard dash) are inverted. These ranges are coaching benchmarks for this prototype — **not** national percentile data — and a coach can tune them per age group in the `METRICS` table in `app.js`.
2. **Combine into tool sub-grades:**
   - Hitters: `CON` = Contact% (70%) + Bat Speed (30%) · `PWR` = Exit Velocity (65%) + Max Distance (35%) · `SPD` = 60 time · `FLD` = coach Fielding Score · `ARM` = Arm Velocity
   - Pitchers: `VEL` = Fastball Velocity · `BRK` = Spin Rate (45%) + Offspeed Whiff% (55%) · `CNTL` = Strike% · `STM` = Pitch Capacity
   - Launch angle is tracked and graded in the metrics table for context (target ~10–20°) but does not feed a sub-grade, since "higher" is not simply "better."
3. **Overall = weighted average of sub-grades**, rounded and clamped to 20–99:
   - Hitters: CON 25% · PWR 25% · SPD 15% · FLD 15% · ARM 20%
   - Pitchers: VEL 30% · BRK 25% · CNTL 30% · STM 15%
   - Two-way players: overall is the average of their hitter and pitcher overalls; both sub-grade sets are shown.
4. **Tier from overall:** Bronze <70, Silver 70–79, Gold 80–89, Diamond 90+.

Because grades are calculated — never stored — editing any metric immediately recalculates the sub-grades, overall, tier, and card color everywhere.

## Sample data note

⚠️ **All 5 players are invented for this prototype** (Mason Carter, Eli Ramirez, Noah Bennett, Connor Walsh, Dylan Brooks). Names, metrics, strengths, and history are fictional and do not represent real people. The app labels this in a banner on the page itself.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure: roster, profile, add/edit modal |
| `styles.css` | Antonelli black & gold branding, v2 portrait-card tiers, responsive layout |
| `app.js` | Sample data, grade formula, card/silhouette/photo rendering, localStorage persistence |
| `assets/` | Antonelli block, script, and star logos (see Brand assets) |
| `README.md` | This file |

## Suggested next steps

1. **Accounts / login** — coach, player, and parent accounts so each player sees their own card and progress.
2. **Coach vs. player permissions** — coaches edit metrics and evaluations; players/parents get read-only views (this matters so grades stay trusted).
3. **Real database** — replace `localStorage` with a backend (e.g. Supabase/Firebase or a small API) so data syncs across devices and coaches.
4. **Photo management** — ~~photo upload~~ ✅ done in v2 (browser-side, in localStorage). Next: cloud photo storage, cropping/positioning, and background removal so photos cut out over the card art like the reference.
5. **Age-group benchmark sets** — selectable 12U/14U/16U/18U/college ranges so a 13-year-old is not graded against 17-year-olds.
6. **Metric entry workflow** — session-based entries (date, coach, source: radar/Blast/TrackMan/game) with notes, instead of editing a single current value.
7. **Card back + sharing** — flip the card for full metrics/history; export/share as an image for social posts.
8. **Deploy to GitHub Pages** — see [GitHub Pages](#github-pages) above. Settings → Pages → deploy from the `main` branch, folder `/ (root)`. No server is needed until accounts or a database are added.

## Notes / limitations (v2)

- Data is per-browser (`localStorage`) — clearing browser data or switching devices loses edits unless you reset/re-enter them.
- Grades are a development guide, not a scouting or recruiting guarantee.
- No login or multi-coach sync yet — see next steps above. Photos are stored per-browser in localStorage (downscaled to max 800px); very large rosters with many photos can hit the browser storage limit, which the app warns about on save.
