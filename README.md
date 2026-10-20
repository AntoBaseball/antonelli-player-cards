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

- **Roster view** — all players as baseball cards, with search and filters by player type (hitter / pitcher / two-way), team, plus sorting by overall, name, or age. A tier legend under the roster title shows Bronze, Silver, Gold, and Diamond. Diamond's swatch and any Diamond pill are sapphire blue. The other three keep their current colors.
- **5 sample players** (see note below), covering Power Hitter, Contact/Leadoff, Ace, Closer, and Two-Way archetypes. Tiers follow the grades: with the sample Blast numbers, the roster spans Bronze, Silver, and Gold.
- **Profile detail view** — **View Profile** on a roster card opens a dark player screen: large card, huge name, position diamond, quick facts, and tabs for Attributes, Metrics & History, Player Perks, Strengths & Growth, and Collection. Clicking the card itself flips it. See [Player profile](#player-profile) and [Seasons](#seasons).
- **Player Perks** — up to three perks on the card front. Training perks unlock from milestones and stay once earned. A new perk opens a sealed pack once. Show perks are coach-awarded. See [Player Perks](#player-perks).
- **Celebrations** — an overall climb plays a short card bounce and count-up. Crossing into Silver, Gold, or Diamond takes over the screen. See [Celebrations](#celebrations).
- **Showdown** — compare two current-season cards, category by category, with a short face-off and chase targets. See [Showdown](#showdown).
- **Baseball card (front, v2 — Topps / MLB The Show style)** — vertical portrait card (5:7, the classic 2.5"×3.5" ratio). The player visual fills the card over a geometric black & gold background with a stitched/dashed frame edge:
  - **Diamond-shaped overall badge** (rotated diamond, clip-path) in the **top-right** with the overall number.
  - **Player name in bold italic uppercase**, with the archetype above it and a gold position bar under it (`OF / 1B - L/L` = position + bats/throws). Team, age, age group, and class are on the **card back**, not the front.
  - **No small star or team-code mark** on the card front. The big A-star still fills the photo area when a player has no photo.
  - **Sub-grade strip** across the bottom. Hitters and two-way players show five grades, in order: **POW, CON, SPD, THW, STR**. Pitchers show **VEL, BRK, CNTL, STM**. A missing athletic grade prints as a dash.
  - **Tier design** so crossing 70/80/90 is obvious: Bronze <70 = muted bronze-gold, darker; Silver 70–79 = silver-grey with a gold frame; Gold 80–89 = rich, bright gold. Those three stay in the black-and-gold family. Diamond 90+ is a sapphire card: deep blue through icy electric blue, with a blue-and-white foil and sparkle. The name and the A-star keep their gold outlines, and a thin gold ring stays on the frame, so a Diamond card still reads as Antonelli.
- **Photo upload + logo placeholder** — in Add/Edit, upload a player photo (JPG/PNG). It is read in the browser, downscaled to max 800px, stored as a data URL with the player in `localStorage`, and shown full-bleed on the card and profile. **Clear photo / use logo** removes it. With no photo, the card and profile show the Antonelli A-star (`assets/antonelli-a-star.png`) centered in the photo area, at its natural aspect ratio, over the tier gradient. All 5 sample players have `photo: ""`, so they show the logo.
- **Card back** — click or tap the roster card, the big profile card, or a retired card to flip it. Enter or Space does the same when the card has focus. The back lists team, age and age group, class, height, weight, hometown, bats/throws, positions, season, the sub-grade breakdown, and the key raw numbers (bat speed, exit velocity with its Antonelli band, 10-yard dash with its Antonelli band, crow-hop throw with its band, seated chest pass with its band, dominant-hand grip with its band, and pitcher tools when those apply). **View Profile** on the roster card back, and the same button under the roster blurb, opens the profile. Collection thumbnails stay buttons that open the retired card; they do not flip. Showdown and celebrations stay on the front. `prefers-reduced-motion` swaps the face instantly, with no 3D turn. See [Card back](#card-back).
- **Edit / Add player** — "Edit Metrics / Profile" on a profile, or "+ Add Player" in the header. Metrics use synced sliders + number inputs; the overall, sub-grades, and tier update **live** in the form preview before you save. Saving a changed metric appends it to that metric's history, so the previous value, delta arrow, and sparkline show progress.
- **Persistence** — all changes save to browser `localStorage` (key: `antonelli-player-cards-v2`), so a refresh keeps your edits. Cards saved under the older key `antonelli-player-cards-v1` are migrated once: hitter exit-velocity / contact / speed / fielding / arm fields are replaced with Blast metrics, bat speed is kept when it was between 25 and 95 mph, other hitting numbers start at the middle of that age group's published window, and pitcher metrics are kept. A one-time banner explains the reset. **Reset Sample Data** (header) restores the original 5 sample players.
- **Responsive** — works on mobile; cards and profile stack cleanly on small screens.

## Brand: black & gold

Antonelli Baseball's main colors are **black and gold** (`#d4af37` / `#c9a227`, pale gold `#f7ecc8`). The whole UI follows it: black header/hero, gold buttons and accents, cream page background, bold italic athletic headings, and gold-outlined dark lettering inspired by the logos. UI chrome keeps that black/gold identity. Bronze, Silver, and Gold cards stay in that family. Diamond is the exception: the card face is sapphire to icy blue, while the name, logo, and frame ring stay gold.

### Logo assets (`assets/`)

| File | What it is | How it's used |
|---|---|---|
| `assets/antonelli-block.png` | ANTONELLI in black italic block letters with gold outline (dark grunge banner) | Header logo (shown at natural aspect ratio, never distorted) |
| `assets/antonelli-script.png` | Antonelli in black script with gold outline + swoosh (cream/pale-gold banner) | Hero brand banner |
| `assets/antonelli-star.png` | White star with black/gold outline | Cropped from the source banner to the star only — the original banner's `#TEAMTRITON`/sponsor text is **not** used anywhere. The header draws a matching inline SVG. The card front does not use this small star. The no-photo placeholder is the A-star below. |
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

Bat speed is the largest piece of the hitter overall, and it stays **40%** whenever a bat-speed grade exists. SPD, THW, STR, and exit velocity are left out when that test has no number. They are not zeros. Exit velocity, when it is present, takes **12%**, and that 12% comes out of the non-bat-speed Blast buckets in their old 22:18:14:6 ratio. SPD, THW, and STR stay at 6% / 5% / 5%.

| Piece | What it uses | Every optional blank | SPD, THW, and STR filled, no exit velo | All four filled |
|---|---|---|---|---|
| Bat speed | Bat speed grade | **40%** | **40%** | **40%** |
| `PWR` | Power 60% + peak hand speed 40% | 22% | 16.1% | 11.7% |
| `PLANE` | On-plane 50% + attack angle 30% + vertical bat angle 20% | 18% | 13.2% | 9.6% |
| `QUICK` | Time to contact 55% + rotational acceleration 45% | 14% | 10.3% | 7.5% |
| `CONN` | Early connection 50% + connection at impact 50% | 6% | 4.4% | 3.2% |
| `SPD` | 10-yard dash, Antonelli age table | left out | 6% | 6% |
| `THW` | Crow-hop throw, Antonelli age table | left out | 5% | 5% |
| `STR` | Average of strength tests that have a number | left out | 5% | 5% |
| Exit velo | Antonelli age-by-age table | left out | left out | 12% |

With no 10-yard, throw, strength, or exit-velocity numbers, and every Blast bucket present, the overall matches the older 40 / 22 / 18 / 14 / 6 formula. A saved `sixtyYard` is ignored. It is not turned into a 10-yard time, so SPD stays blank. A saved legacy `exitVelocity` is the old pre-Blast field. It is not copied onto `exitVelo`.

The **front of the card** does not print BAT / PWR / PLANE / QUICK / CONN. It prints five face grades:

| Face | Built from | Notes |
|---|---|---|
| `POW` | Bat speed 40% + exit velo 30% + Blast power 18% + rotational acceleration 12% | Display only. The overall still uses the bat-speed grade at 40%, plus the exit-velo grade at 12% when that number exists. If exit velo is blank, the other three POW pieces are reweighted and exit velo stays out of the overall. |
| `CON` | Time to contact 28% + attack angle 18% + vertical bat angle 12% + on-plane 22% + early connection 10% + connection at impact 10% | Missing pieces are dropped and the rest are reweighted. |
| `SPD` | 10-yard dash, lower is better | Antonelli's age-by-age table below. Not Blast, and not the 10U/12U groups. |
| `THW` | Crow-hop throw, higher is better | Antonelli's age-by-age table below. Not the pitcher fastball scale. |
| `STR` | Average of graded `STRENGTH_TESTS` | Seated 2 kg chest pass and dominant-hand grip. Blank tests are skipped. |

Pitchers are unchanged: `VEL` 30% · `BRK` (spin 45% + whiff 55%) 25% · `CNTL` 30% · `STM` 15%. Two-way overall is the average of the hitter overall and the pitcher overall. A two-way front shows the five hitter grades. Pitching tools are on the back, the profile, and in Showdown.

To retune Blast grades, edit `BLAST_BENCHMARKS` and `gradeBlastMetric` / `gradeHigher` / `gradeLower` / `gradeIdeal` / `gradeOnPlane`. To retune the 10-yard dash, edit `TEN_YARD_TABLE`. To retune the crow-hop throw, edit `THROW_TABLE`. To retune the chest pass, edit `MED_BALL_TABLE`. To retune grip, edit `GRIP_TABLE`. Pitcher fastball velocity stays on the linear `METRICS` low/high scale.

### Crow-hop throw, chest pass, and grip

These three are **Antonelli age-in-years tables**, the same rule as exit velocity and the 10-yard dash. The row is the player's age in whole years (`Math.floor`). **Ages under 8 use the 8 row. Ages over 18, including college and pro, use the 18 row.** They are not Blast windows and not the 10U / 12U groups. Pitcher fastball velocity is a different scale and is not graded on the crow-hop table.

Higher is better. Inside each band the grade is a straight line:

| Band | Grade |
|---|---|
| Below Avg | under 50. One Average-band width below the Average line is 20. Worse than that stays at 20. The grade does not round up to 50. |
| Average | 50–64 |
| Above Avg | 65–74 |
| Good | 75–84 |
| Great | 85 at the Great threshold, then 99 a fixed amount past it, then capped at 99 |

**Crow-hop throw (mph).** Stored as `throwVelo`. This is the hitter throw. 99 is about 5 mph past the Great threshold. The card back prints a short line such as `84 mph · Good · crow-hop`.

| Age | Below Avg | Average | Above Avg | Good | Great | 99 at |
|---|---|---|---|---|---|---|
| 8 | <34 | 34–37 | 38–40 | 41–44 | 45+ | 50 |
| 9 | <38 | 38–41 | 42–44 | 45–48 | 49+ | 54 |
| 10 | <42 | 42–45 | 46–48 | 49–52 | 53+ | 58 |
| 11 | <46 | 46–49 | 50–52 | 53–56 | 57+ | 62 |
| 12 | <50 | 50–54 | 55–57 | 58–61 | 62+ | 67 |
| 13 | <55 | 55–59 | 60–62 | 63–66 | 67+ | 72 |
| 14 | <60 | 60–64 | 65–67 | 68–71 | 72+ | 77 |
| 15 | <64 | 64–69 | 70–73 | 74–77 | 78+ | 83 |
| 16 | <69 | 69–74 | 75–78 | 79–82 | 83+ | 88 |
| 17 | <73 | 73–78 | 79–82 | 83–86 | 87+ | 92 |
| 18 | <76 | 76–81 | 82–85 | 86–89 | 90+ | 95 |

The sample crow-hop numbers stay where they were, because they still sit in a believable band for each age: Mason (17) at 84 mph is Good, Eli (15) at 74 mph is the first mph of Good, and Dylan (14) at 70 mph is Good.

**Seated 2 kg chest pass (feet).** Stored as `medBall`. The protocol is seated against a wall at 90 degrees. The default note, in the form, the profile, and here, is **Seated 2 kg chest pass (wall, 90 degrees)**. The card back does not print that full sentence. It prints a short line such as `24.0 ft · Good · 2 kg seated chest`. 99 is about 2.0 ft past the Great threshold.

| Age | Below Avg | Average | Above Avg | Good | Great | 99 at |
|---|---|---|---|---|---|---|
| 8 | <7.8 | 7.8–9.1 | 9.2–10.0 | 10.1–11.1 | 11.2+ | 13.2 |
| 9 | <8.8 | 8.8–10.2 | 10.3–11.1 | 11.2–12.4 | 12.5+ | 14.5 |
| 10 | <10.0 | 10.0–11.6 | 11.7–12.7 | 12.8–14.1 | 14.2+ | 16.2 |
| 11 | <11.2 | 11.2–13.0 | 13.1–14.2 | 14.3–15.8 | 15.9+ | 17.9 |
| 12 | <12.1 | 12.1–14.0 | 14.1–15.4 | 15.5–17.1 | 17.2+ | 19.2 |
| 13 | <13.3 | 13.3–15.5 | 15.6–16.9 | 17.0–18.8 | 18.9+ | 20.9 |
| 14 | <14.5 | 14.5–16.9 | 17.0–18.4 | 18.5–20.5 | 20.6+ | 22.6 |
| 15 | <15.7 | 15.7–18.2 | 18.3–20.0 | 20.1–22.2 | 22.3+ | 24.3 |
| 16 | <16.9 | 16.9–19.7 | 19.8–21.5 | 21.6–23.9 | 24.0+ | 26.0 |
| 17 | <17.8 | 17.8–20.7 | 20.8–22.6 | 22.7–25.2 | 25.3+ | 27.3 |
| 18 | <18.4 | 18.4–21.4 | 21.5–23.4 | 23.5–26.0 | 26.1+ | 28.1 |

Sample chest-pass distances were lowered so they match a seated 2 kg pass: Mason 24.0 ft (Good), Eli 17.0 ft (Average), Dylan 15.5 ft (Average).

**Grip strength (lbs), dominant hand only.** Stored as `gripDominant`. The form has one field. The coach enters the best of 2–3 trials. The label is **Dominant hand · Jamar-style dynamometer · best of 2–3**. A saved `gripOther` is ignored, even when it is higher or is the only number. The card back prints a short line such as `118 lbs · Good · dom hand`. 99 is about 10 lbs past the Great threshold.

| Age | Below Avg | Average | Above Avg | Good | Great | 99 at |
|---|---|---|---|---|---|---|
| 8 | <30 | 30–35 | 36–39 | 40–43 | 44+ | 54 |
| 9 | <34 | 34–40 | 41–44 | 45–49 | 50+ | 60 |
| 10 | <39 | 39–46 | 47–50 | 51–56 | 57+ | 67 |
| 11 | <44 | 44–52 | 53–57 | 58–63 | 64+ | 74 |
| 12 | <50 | 50–59 | 60–65 | 66–72 | 73+ | 83 |
| 13 | <58 | 58–68 | 69–75 | 76–83 | 84+ | 94 |
| 14 | <68 | 68–80 | 81–88 | 89–97 | 98+ | 108 |
| 15 | <75 | 75–90 | 91–98 | 99–109 | 110+ | 120 |
| 16 | <81 | 81–97 | 98–106 | 107–118 | 119+ | 129 |
| 17 | <85 | 85–101 | 102–111 | 112–123 | 124+ | 134 |
| 18 | <89 | 89–106 | 107–116 | 117–129 | 130+ | 140 |

Sample dominant-hand grips: Mason 118 lbs (Good), Eli 84 lbs (Average), Dylan 76 lbs (Average). Each save still has a lower other-hand number so the ignore rule can be checked. That other hand is not graded.

`STR` is the unweighted average of the strength tests that have a grade. With only a chest pass, STR is that grade. With only grip, STR is the grip grade. With both, STR is the average. With neither, STR is a dash and it is left out of the overall.

The card back, the profile bars, the metrics table, the add/edit form, and Showdown all print the band label (Below Avg, Average, Above Avg, Good, Great) next to the crow-hop, chest-pass, and grip readings.

### Exit velocity

Exit velocity is **Antonelli's table**, not Blast, and not the 10U / 12U age groups. The row is the player's age in whole years (`Math.floor`). **Ages under 8 use the 8 row. Ages over 18, including college and pro, use the 18 row.** The stored key is `exitVelo`. The old field `exitVelocity` still means "this save used the pre-Blast formula" and is never copied onto `exitVelo`.

Higher is better. Inside each band the grade is a straight line from the low mph to the high mph:

| Band | Grade |
|---|---|
| Below Avg | under 50. One Average-band width below the Average line is 20. Slower than that stays at 20. The grade does not round up to 50. |
| Average | 50–64 |
| Above Avg | 65–74 |
| Good | 75–84 |
| Great | 85 at the Great threshold, 99 five mph above it, then capped at 99 |

| Age | Below Avg | Average | Above Avg | Good | Great | 99 at |
|---|---|---|---|---|---|---|
| 8 | <40 | 40–46 | 47–51 | 52–56 | 57+ | 62 |
| 9 | <45 | 45–50 | 51–55 | 56–60 | 61+ | 66 |
| 10 | <49 | 49–54 | 55–59 | 60–64 | 65+ | 70 |
| 11 | <53 | 53–58 | 59–63 | 64–68 | 69+ | 74 |
| 12 | <57 | 57–62 | 63–67 | 68–72 | 73+ | 78 |
| 13 | <62 | 62–67 | 68–72 | 73–77 | 78+ | 83 |
| 14 | <67 | 67–72 | 73–78 | 79–83 | 84+ | 89 |
| 15 | <72 | 72–77 | 78–82 | 83–87 | 88+ | 93 |
| 16 | <76 | 76–81 | 82–86 | 87–91 | 92+ | 97 |
| 17 | <79 | 79–84 | 85–89 | 90–94 | 95+ | 100 |
| 18 | <82 | 82–87 | 88–92 | 93–97 | 98+ | 103 |

The card back, the profile bar, the metrics table, the add/edit form, and Showdown all print that band label (Below Avg, Average, Above Avg, Good, Great) next to the mph. A blank field leaves POW without that piece and leaves the 12% out of the overall.

### 10-yard dash

The 10-yard dash is **Antonelli's table**, not Blast, and not the 10U / 12U age groups. The row is the player's age in whole years (`Math.floor`). **Ages under 8 use the 8 row. Ages over 18, including college and pro, use the 18 row.** The stored key is `tenYard`. A saved `sixtyYard` is ignored and is never copied onto `tenYard`.

Lower is better. Inside each band the grade is a straight line from the slow time to the fast time:

| Band | Grade |
|---|---|
| Below Avg | under 50. One Average-band width slower than the Average line is 20. Slower than that stays at 20. The grade does not round up to 50. |
| Average | 50–64 |
| Above Avg | 65–74 |
| Good | 75–84 |
| Great | 85 just faster than the Great threshold, 99 about 0.10 s faster than that threshold, then capped at 99 |

| Age | Below Avg | Average | Above Avg | Good | Great | 99 at |
|---|---|---|---|---|---|---|
| 8 | >2.55 | 2.35–2.55 | 2.20–2.34 | 2.05–2.19 | <2.05 | 1.95 |
| 9 | >2.45 | 2.25–2.45 | 2.12–2.24 | 1.98–2.11 | <1.98 | 1.88 |
| 10 | >2.35 | 2.15–2.35 | 2.03–2.14 | 1.90–2.02 | <1.90 | 1.80 |
| 11 | >2.28 | 2.08–2.28 | 1.97–2.07 | 1.85–1.96 | <1.85 | 1.75 |
| 12 | >2.20 | 2.02–2.20 | 1.91–2.01 | 1.80–1.90 | <1.80 | 1.70 |
| 13 | >2.12 | 1.95–2.12 | 1.85–1.94 | 1.75–1.84 | <1.75 | 1.65 |
| 14 | >2.05 | 1.89–2.05 | 1.80–1.88 | 1.70–1.79 | <1.70 | 1.60 |
| 15 | >1.99 | 1.84–1.99 | 1.75–1.83 | 1.66–1.74 | <1.66 | 1.56 |
| 16 | >1.94 | 1.80–1.94 | 1.72–1.79 | 1.63–1.71 | <1.63 | 1.53 |
| 17 | >1.90 | 1.77–1.90 | 1.69–1.76 | 1.60–1.68 | <1.60 | 1.50 |
| 18 | >1.87 | 1.74–1.87 | 1.66–1.73 | 1.58–1.65 | <1.58 | 1.48 |

The card back, the profile bar, the metrics table, the add/edit form, and Showdown all print that band label (Below Avg, Average, Above Avg, Good, Great) next to the time. A blank field leaves SPD as a dash and leaves the 6% out of the overall.

The sample times stay where they were. Against this table they still read like the players they are: Mason (17) at 1.84 s is Average, a power hitter whose next step is first-step quickness. Eli (15) at 1.68 s is Good, a leadoff runner just short of Great. Dylan (14) at 2.08 s is just Below Avg, a developing two-way player 0.03 s the wrong side of the Average line.

### Adding a strength test

`STRENGTH_TESTS` in `app.js` is the list. Adding a test means adding **one object**:

- `id` — the number is stored at `player.metrics[id]`
- `label`, `unit`, `mode` (`"higher"` or `"lower"`), `step`, `entryMin`, `entryMax`, `help`
- `bands` — one `{ lo, hi }` for each age group (`10U` through `Pro`)

The add/edit form, the metrics table, history, the card back, and the STR average pick that entry up. No other list has to be edited for a normal test. Grip is the special case already in the list: it sets `hands: ["gripDominant"]` because the grade reads the dominant hand only. A saved `gripOther` is not graded. A new single-number test should not set `hands`. The chest pass and the grip already use age-year tables, so a new test that should do the same needs its own grader rather than age-group `bands`.

A brand-new player form starts the 10-yard dash, exit velocity, crow-hop throw, chest pass, and dominant-hand grip at the middle of the Average band for that age, so the sliders are not empty. Clearing a field and saving leaves that grade off the card. Migrating an old save does not invent a 10-yard time, a throw, or a strength number, and it does not copy `sixtyYard` into `tenYard`.

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
- Hitter sub-grade groups and the 40 / 22 / 18 / 14 / 6 Blast weights, plus the modest 6% / 5% / 5% for SPD / THW / STR when those tests exist.
- The face composites POW and CON, and the age-year tables for the crow-hop throw, the seated 2 kg chest pass, dominant-hand grip, the 10-yard dash, and exit velocity (including the 12% exit-velo share and the Below Avg floor).
- Pitcher velocity, spin, strike %, whiff %, and pitch-capacity ranges. Those stayed in `METRICS` and were never Blast numbers.

## Card back

Clicking a roster card flips it. It does not open the profile. **View Profile** sits on the card back and again under the roster blurb, so the profile is still one click away. The big card on the profile flips the same way, and so does the big card on a retired season. Enter or Space flips the card that has keyboard focus. Clicking again returns to the front.

The back is a black and gold face: team, age and age group, class, height, weight, hometown, bats/throws, positions, season, every sub-grade, and the raw bat speed, exit velocity with its Antonelli band label, 10-yard dash with its Antonelli band label, crow-hop throw (short line such as 84 mph · Good · crow-hop), seated chest pass (short line such as 24.0 ft · Good · 2 kg seated chest), dominant-hand grip (short line such as 118 lbs · Good · dom hand), and pitcher readings when the player has them. Hitters and two-way players also get a gold **Personal Bests** block (see below). A Diamond card back uses the same sapphire gradient as the front, with the gold name outline kept. The metrics area scrolls if it needs to, and View Profile stays below every row.

Collection thumbnails are still buttons. A click opens that retired card. The thumbnail itself does not flip. Showdown and the celebration overlays stay on the front so the clash and the count-up are not interrupted.

`prefers-reduced-motion` does not spin the card. The front and back swap immediately.

## Personal bests

Hitters and two-way players show five career records. Pitchers do not.

| Record | Unit | Best is |
|---|---|---|
| Top Exit Velo | mph | higher |
| Top Bat Speed | mph | higher |
| Top Throw | mph | higher (crow-hop) |
| Fastest 10-Yd | seconds | lower |
| Longest Hit | feet | higher |

Batted-ball distance is a new optional hitter field. It is display only. It is not graded, and it is not part of POW or the overall.

The card back prints a compact gold block, one line per record (`Top Exit Velo 95 mph`), or `--` when nothing is on file. The profile shows a Personal Bests panel above the tabs: this season, the career best, and the date that career best was set when the date is known. A coach override that supplied the number is marked `coach`. A save that sets a new career best tags that row `NEW PB` until the profile is closed. That badge is not part of the celebration queue.

How a best is chosen:

- **This season** is the sparkline history plus the current metric. That history stays capped at the last six readings and resets to the current number when a season rolls over.
- **Career** also reads an untrimmed `readingLog` (`{ key: [{ value, at }] }`). Every save appends the new number with a `YYYY-MM-DD` date. The reading date on the form defaults to today. A future date is rejected and is not written into the log. The log is not cleared on rollover. Retired cards are scanned too: their history, their metrics, and any log archived with them. A retired value that has no reading date uses that card's `archivedAt`. An unknown date prints `--`.
- Sample logs stop on 2026-10-18. This season opened 2026-09-01, so the check-ins that make up this season's best sit between 2026-09-01 and that day. Older career bests stay in the previous season.
- A coach **manual override** (`manualBests`) replaces the career best only when it is better. A slower 10-yard time does not count. An empty override clears that key.
- The first time an older save has no `readingLog`, the app seeds one from the current history and from every retired card. Dates that were never stored stay blank.

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

Every card carries a foil sheen and a diagonal glare that sweeps across it every few seconds. The loop is staggered per player, so a roster does not flash in unison. Bronze is a faint gold wash. Silver is brighter. Gold adds a richer gold glitter. Diamond uses a blue-and-white holographic sheen and white/ice sparkles, not a rainbow. Small star glints twinkle on the frame, with more of them on higher tiers. The name, overall, and sub-grades sit above the shine so they stay readable.

On a desktop with a fine pointer, moving the cursor tilts the card and slides the glare with it. On a phone, a tap runs one quick shine. If the browser allows device orientation, tilting the phone moves the glare. A denied or missing gyroscope leaves the ambient loop running. Retired collection cards use the same foil, quieter and slower. Sheen, glare, and sparkles run only while the card is near the viewport. `prefers-reduced-motion` keeps a still foil wash and turns the sweep, sparkle, tilt, and gyroscope off.

A new Player Perk opens as a sealed black-and-gold foil pack (A-star, “PLAYER PERKS”, a shimmer). Nothing tears until the player clicks **Open Pack**. The top rip, a shine burst, and the perk card slide out, then the card flips to the name, description, milestone, and player. Several new perks are in one pack: after the open, **Next Perk** walks through them, and the last button is **Add to my card**. **Open again** on the profile replays that pack and does not clear the seen flag. `prefers-reduced-motion` turns the card sweep, sparkle, tilt, badge glow, pack shimmer, rip, and flip off. The card keeps a still foil wash. Open Pack then fades straight to the perk face. There is no tear.

## Celebrations

The card remembers the last overall and tier the player has already been shown (`gradeSeen` on the player, saved with everything else in `localStorage`).

- The first time a player is seen — samples, a new card, or an older save with no `gradeSeen` — the app stores the current overall and tier and stays quiet.
- **Overall up** plays when the overall number rises and the tier does not. The card bounces, the sheen speeds up, the badge counts from the old number to the new one, a +N line pops, and a few gold bits fly. About 2 seconds, then **Collect**.
- **Tier up** plays only when the tier rises: Silver at 70, Gold at 80, Diamond at 90. The screen goes black, a spotlight hits the card, the card shakes and then shakes harder, a flash and particle burst hit, and the card comes back in the new tier color with the tier name and the new overall. Silver and Gold burst gold. Diamond bursts blue and white, and the spotlight is ice blue. About 4 seconds. **Skip** jumps to that payoff. **Collect** is what marks it seen. A season reveal that climbs into Diamond uses that same blue spotlight.
- A drop in overall or tier updates `gradeSeen` immediately and does not celebrate.
- Collect writes the new overall and tier into `gradeSeen`. Reload before Collect plays the same celebration again. After Collect, that value does not play again.
- **Preview overall-up** and **Preview tier-up** on the profile replay the motion for a coach. They do not change `gradeSeen`.

One save can earn a tier, an overall jump, and new perks. The order is tier-up, then overall-up, then the Player Perks pack. A tier-up already shows the new overall, so that save does not also open an overall-up. Nothing is dropped: each step stays queued until its Collect (or, for a perk, Open Pack and Add to my card). `prefers-reduced-motion` skips the shake, bounce, count-up, flash, and particles and shows the new number and tier immediately.

## Player profile

The screen that opens from a card is laid out like a baseball-game player page, in Antonelli black and gold. It does not use MLB or The Show logos.

The header puts the animated card on the left, the last name large beside it, a rotated position badge, team, archetype, and a facts grid: overall, tier, bats, throws, secondary position, height, weight, age and age group, team, class/year, and hometown. Diamond is labeled in icy blue there, and again in Showdown's tier row. The big card flips to the same back as the roster card. Hitters and two-way players show a Personal Bests panel under the header, before the tabs, with this season, the career best, and the date. Overall includes a small chip when the grade moved since the previous saved check-in. That chip is the overall now minus the overall computed from the prior history point on each metric. It is labeled “since last assessment.”

Optional fields added to the player and the add/edit form: `secondaryPosition`, `height`, `weight`, `hometown`. Blank fields show —. Older saves in `localStorage` keep working; missing fields stay blank. The card and roster still print `OF / 1B` when a secondary position is set.

Tabs, left to right:

| Tab | What it holds |
|---|---|
| Attributes | Tall bars. Hitters get POW, CON, SPD, THW, STR, then exit velocity with its Antonelli band label, then the 10-yard dash, the crow-hop throw, the seated chest pass, and dominant-hand grip, each with its Antonelli band label, then the Blast metric grades. Pitchers get VEL, BRK, CNTL, STM plus fastball, spin, strike %, whiff %, and capacity. Two-way players get both groups, labeled. A retired card keeps the tool keys it was saved with. |
| Metrics & History | The existing table: current, previous, change, sparkline, band, grade. |
| Player Perks | Earned and coach-awarded perks, Open again, and click-to-replay. |
| Strengths & Growth | Archetype note, how the grade is built, strengths, and areas to improve. |
| Collection | Current card plus every retired season, oldest first. Click a retired card for its frozen snapshot. |

Bar fill is the 20–99 grade as a percent of 99. Color follows the band: red Below Average (under 50), bronze Average (50–64), gold Good (65–79), green Great (80–89), cyan Elite (90–99). Hover a bar for the band name. Bars grow from the bottom when the profile opens. `prefers-reduced-motion` shows them at full height with no grow. On a narrow screen the bar row scrolls sideways.

The right rail is a Blast snapshot for hitters (raw mph, degrees, seconds, and the age-group band) and a pitch-metric list with a short meter for pitchers. Two-way players get both. Edit, preview overall-up, preview tier-up, Start New Season, and delete stay in the header. Back to roster stays above the screen.

## Seasons

A season runs from September 1 through August 31. September 1, 2025 through August 31, 2026 is labeled `2025-26`. The app does not store a date of birth. It keeps a numeric age, an age group, and `currentSeason`.

On load, each player is compared with today's season. The first time an older save has no season stamp, it is marked with the season that is already underway and nothing is archived. After that, if today's season is later, the app rolls the player forward automatically. A coach can also press **Start New Season (Sept 1 Rollover)** on the profile. That button always moves one season, even before September 1, so the archive can be demoed. The confirm dialog previews the card being retired and the projected overall and tier of the new one.

Rollover does four things:

1. The current card is copied into `cardCollection`. The copy stores the final overall, tier, sub-grades, raw metrics, the grade and band for each metric, the metric history, the career `readingLog`, any coach `manualBests`, training perks (id and name), coach-awarded perks, strengths, improvements, archetype, photo, and the season and age group (`2025-26 - 16U`). That copy is never graded again, even if the Blast windows change later.
2. Age increases by the number of seasons that elapsed. One press of the button is one year. If the app was closed for two Septembers, age jumps by two and only the card they actually had is archived — missing seasons are not invented.
3. Age group follows the Blast map (10U through Pro) unless a coach pinned a different group. A group is pinned when the saved age group does not match the age. Changing age in the form keeps a pinned group put; a group that already matches age moves with the birthday. College and Pro still archive every year. An unpinned 22-year-old College player becomes Pro at 23. Pro stays Pro.
4. The new card keeps the same name, photo, positions, and the metric numbers. Those numbers are the new season's baseline: live history restarts at that single value so improvement perks measure this season, and the retired card keeps the old history. `readingLog` stays on the player, so career personal bests carry across the rollover even after the sparkline resets. The numbers are then graded on the new age group's windows. Pitcher ranges are not age-banded, so a pitcher overall usually holds while a hitter's overall can drop when the windows get harder. A drop does not play a downgrade celebration.

Training perks are season-scoped. They are stored on the retired card and cleared on the new card. A milestone that is still true on the carried baseline (for example Gold Standard, if the new grade is still gold) can be earned again. A perk that needs a gain waits for new check-ins after the baseline. Coach-awarded Show perks stay on the player. The retired card also remembers which ones were on the card that season.

After rollover, a **New Season, New Chase** reveal shows the retired card and the new card. If the new tier is higher, the spotlight from the tier-up celebration is used. If the overall is lower, the copy stays on the new chase and no sad animation plays. **Start the chase** writes `gradeSeen` to the new overall and tier. Reload before that button shows the reveal again and does not mark a downgrade. The roster keeps showing only the current card.

The Collection tab lists seasons with Antonelli, the best overall, and how many seasons were Gold or better. Mason's sample roster includes a fictional `2025-26` 16U card (final overall frozen at Gold). Dylan's includes a fictional `2024-25` 12U card. Those two cards ship with a fresh sample roster or Reset Sample Data. They are not added to a browser that already had players saved.

## Showdown

Showdown puts two **current-season** cards against each other. Retired collection cards are not in it. Open it from **Showdown** on the roster, or **Challenge in Showdown** on a profile (that player is already Player A). The same player cannot be picked twice.

The intro slams a huge **SHOWDOWN** title, then the cards rush in from off-screen and collide in the center. A flash, sparks, and a short shake mark the hit. The cards settle side by side with the Antonelli star **VS** badge between them and square up once more before the results. It lasts about two and a half seconds. **Skip** jumps to the results. `prefers-reduced-motion` skips the battle and opens the results immediately. Buttons and headings use the word SHOWDOWN in capitals.

Each shared category shows both grades, the raw reading when there is one, and the gap. The center says `A +5` or `B +3`. The leader’s chip is `+N` and the trailer’s chip is `-N`. A tie says `EVEN`. Overall and tier are always shared. Tool grades (POW, CON, SPD, THW, STR, VEL, BRK, CNTL, STM) and metric grades are shared only when both cards have that category. A dash, including a blank SPD, THW, STR, or exit velocity, is not a loss. A hitter against a pitcher still compares overall and tier. A two-way player brings both sets; the opponent is scored only on the rows they also have. Chase lines for Speed, Throw, and Exit Velocity add the raw gap (seconds quicker, or mph). The exit-velocity, 10-yard, crow-hop, chest-pass, and grip rows also print the Antonelli band label and the age row. Strength chase stays on the grade, because STR averages the chest pass and the grip.

Grades are versus each player’s own age group, except exit velocity, the 10-yard dash, the crow-hop throw, the seated chest pass, and dominant-hand grip, which use Antonelli’s age-in-years tables. Pitcher fastball velocity stays on the coach scale. Raw mph, degrees, and seconds are the absolute readings, shown beside the grade so a harder window is visible.

The banner follows the overall: the higher overall leads, and the same overall is **Dead Even Showdown**. Under that, the tally counts shared categories only (`Mason takes 6 of 9 categories`). Ties count in the 9 and for neither player.

**Perks earned this season** is an exhibition row. The counts and the names are shown, and they are not part of the tally, so a longer perk list cannot decide the showdown.

**Chase targets** are the three closest categories the trailer can flip, smallest grade gap first. Copy stays on the chase (`+4 Bat Speed to catch Eli`). When the raw number is a simple higher-or-lower reading, the line adds the raw gap (`+3 mph`). Ideal-window metrics (attack angle, connection, on-plane) stay on the grade, because “closer” is not a straight add.

**Rematch** runs the face-off again. **Change players** returns to the picker. **View profile** opens that player’s current card. Showdowns are not saved.

## Sample data note

⚠️ **All 5 players are invented for this prototype** (Mason Carter, Eli Ramirez, Noah Bennett, Connor Walsh, Dylan Brooks). Names, metrics, strengths, and history are fictional and do not represent real people. The app labels this in a banner on the page itself.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure: roster, profile, add/edit modal |
| `styles.css` | Antonelli black & gold branding, v2 portrait-card tiers, responsive layout |
| `app.js` | Sample data, Blast benchmarks, Player Perks, celebrations, seasons, Showdown, grade formula, card rendering, localStorage persistence |
| `assets/` | Antonelli block, script, and star logos (see Brand assets) |
| `README.md` | This file |

## Suggested next steps

1. **Accounts / login** — coach, player, and parent accounts so each player sees their own card and progress.
2. **Coach vs. player permissions** — coaches edit metrics and evaluations; players/parents get read-only views (this matters so grades stay trusted).
3. **Real database** — replace `localStorage` with a backend (e.g. Supabase/Firebase or a small API) so data syncs across devices and coaches.
4. **Photo management** — ~~photo upload~~ ✅ done in v2 (browser-side, in localStorage). Next: cloud photo storage, cropping/positioning, and background removal so photos cut out over the card art like the reference.
5. **Age-group Blast windows** — done for hitters (10U through Pro). Next: let a coach save their own window edits, and add a source tag (tee / front toss / game) on each metric entry.
6. **Metric entry workflow** — session-based entries (date, coach, source: radar/Blast/TrackMan/game) with notes, instead of editing a single current value.
7. **Card back + sharing** — the flip is in. Next: export or share the card as an image for social posts.
8. **Deploy to GitHub Pages** — see [GitHub Pages](#github-pages) above. Settings → Pages → deploy from the `main` branch, folder `/ (root)`. No server is needed until accounts or a database are added.

## Notes / limitations (v2)

- Data is per-browser (`localStorage`) — clearing browser data or switching devices loses edits unless you reset/re-enter them.
- Grades are a development guide, not a scouting or recruiting guarantee.
- No login or multi-coach sync yet — see next steps above. Photos are stored per-browser in localStorage (downscaled to max 800px); very large rosters with many photos can hit the browser storage limit, which the app warns about on save.
