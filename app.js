/* Antonelli Baseball — Player Profiles & Baseball Cards
   No backend. Data persists in localStorage. All players below are SAMPLE / invented.

   HOW THE OVERALL GRADE WORKS
   ----------------------------
   Hitters and the hitting half of two-way players use Blast Motion swing metrics.
   Published windows live in BLAST_BENCHMARKS (edit that table). The 20–99 scale,
   the five band names, and any cut Blast does not print are Antonelli — see the
   comments on BLAST_BENCHMARKS and gradeBlastMetric. Do not treat those cuts as
   official Blast numbers.

   Pitchers still use the linear METRICS low/high ranges (not Blast).

   1) Each raw metric becomes a 20–99 grade.
   2) Hitter sub-grades (weights in SUBGRADES.hitter — bat speed is 40%):
        BAT  = bat speed                         40%
        PWR  = power 60% + peak hand speed 40%   22%
        PLANE = on-plane 50% + attack angle 30% + vertical bat angle 20%   18%
        QUICK = time to contact 55% + rotational acceleration 45%   14%
        CONN = early connection 50% + connection at impact 50%   6%
      Pitcher: VEL 30, BRK 25, CNTL 30, STM 15.
      Two-way overall is the average of the hitter overall and the pitcher overall.
   3) Overall is rounded and clamped to 20–99.
   4) Tier: Bronze <70, Silver 70–79, Gold 80–89, Diamond 90+.

   Bands from the grade (Antonelli names, not a Blast scale):
     <50 Below Average, 50–64 Average, 65–79 Good, 80–89 Great, 90–99 Elite.
*/

const STORAGE_KEY = "antonelli-player-cards-v2";
const LEGACY_STORAGE_KEY = "antonelli-player-cards-v1";

const AGE_GROUP_ORDER = ["10U", "12U", "14U", "16U", "18U", "College", "Pro"];

/* Official pages used as the source of truth. support.blastmotion.com had no
   benchmark articles when searched (October 2026). */
const BLAST_SOURCES = {
  product: "https://blastmotion.com/products/baseball/",
  faq: "https://blastmotion.com/faq/",
  batSpeedAge: "https://blastmotion.com/blog/what-is-bat-speed-in-baseball/",
  glossary: "https://blastmotion.com/blog/what-does-blast-motion-measure/",
  rotational: "https://blastmotion.com/blog/what-is-rotational-acceleration-in-baseball/",
  handSpeedBlog: "https://blastmotion.com/blog/what-is-hand-speed-in-a-baseball-swing/",
};

const BLAST_KEYS = [
  "batSpeed", "peakHandSpeed", "attackAngle", "verticalBatAngle", "timeToContact",
  "powerKw", "rotationalAcceleration", "onPlaneEfficiency", "earlyConnection", "connectionAtImpact",
];
const PITCHER_KEYS = ["fastballVelo", "spinRate", "strikePct", "whiffPct", "pitchCapacity"];

/*
 * BLAST_BENCHMARKS — published Blast windows by Antonelli age group.
 * lo/hi (and target, where Blast states one) are copied from the pages above.
 * They are NOT 20–99 grades. gradeBlastMetric turns each window into a grade.
 *
 * Age-group map (ours): 10U ages ≤10, 12U 11–12, 14U 13–14 = Middle School,
 * 16U 15–16 = HS JV, 18U 17–18 = HS Varsity, College 19–22, Pro 23+.
 * "Amateur All Levels" on the product page is not one of these groups, so that
 * column is not used.
 *
 * Gaps (Antonelli, not Blast-official) — do not present these as published:
 *   - Five band names and every 20–99 cut inside or beyond a published window.
 *   - Scores above a published high, or faster than a published fast end.
 *   - On-plane cuts at 78 and Elite from 85 up.
 *   - Rotational-acceleration split of the 10–14.99 "medium" bucket at 12.5,
 *     and Elite as the value approaches 20 g.
 *   - Ideal-range peak placement (96 at the target, ~70 at either published edge).
 *     Attack angle and vertical bat angle use the center of the window because
 *     Blast does not print a single peak. Connection metrics use Blast's 90° target.
 *   - Applying the product-page Youth column to BOTH 10U and 12U for every
 *     metric except bat speed. Blast does not split those metrics by 10U vs 12U.
 *     The numbers are the Youth column; the age assignment is ours (sharedYouth).
 *
 * Conflicts kept out of the graded numbers (still official, just not used):
 *   - HS JV bat speed: product page prints 55–56. FAQ and the age blog print 55–65.
 *     Graded window is 55–65.
 *   - College bat speed: product page and FAQ print 66–75. The age blog prints 65–75.
 *     Graded window is 66–75.
 *   - Peak hand speed blog (handSpeedBlog) prints a wider table
 *     (Youth 17–23, MS 18–24, HS JV 19–25, HS Varsity 20–26, College 21–27,
 *     MiLB 22–28, Pro 23–29). Graded windows are the product-page chart so one
 *     table stays consistent. Those blog ranges are not averaged in.
 *   - Rotational acceleration: FAQ / brochure MLB average 15.1 g vs the June 2026
 *     article's 17 g. Graded anchors are the article's buckets (<10 / 10–14.99 / 15+),
 *     not either average.
 *   - Product-page college power prints 5.074 kW. Stored as 5.074.
 *   - Blast iQ Rotation Score (20–80, 50 = average) is not raw rotational
 *     acceleration in g and is not graded.
 */
const Y = true; // sharedYouth marker, repeated below for readability
const BLAST_BENCHMARKS = {
  batSpeed: {
    mode: "higher",
    sources: [BLAST_SOURCES.batSpeedAge, BLAST_SOURCES.product, BLAST_SOURCES.faq],
    bands: {
      // Age blog only — finer than the product-page Youth bucket (40–56).
      "10U": { lo: 30, hi: 45 },
      "12U": { lo: 40, hi: 52 },
      // Product + FAQ + age blog agree.
      "14U": { lo: 46, hi: 62 },
      // FAQ + age blog 55–65. Product page cell "55–56" is not used.
      "16U": { lo: 55, hi: 65, note: "FAQ + age blog; product page prints 55–56" },
      "18U": { lo: 60, hi: 70 },
      // Product + FAQ 66–75. Age blog 65–75 is not used.
      "College": { lo: 66, hi: 75, note: "product page + FAQ; age blog prints 65–75" },
      "Pro": { lo: 66, hi: 78 },
    },
  },
  peakHandSpeed: {
    mode: "higher",
    // Product page chart. The hand-speed blog table is intentionally not used.
    sources: [BLAST_SOURCES.product, BLAST_SOURCES.glossary],
    bands: {
      "10U": { lo: 15, hi: 21, sharedYouth: Y },
      "12U": { lo: 15, hi: 21, sharedYouth: Y },
      "14U": { lo: 17, hi: 21 },
      "16U": { lo: 17, hi: 21 },
      "18U": { lo: 19, hi: 23 },
      "College": { lo: 21, hi: 25 },
      "Pro": { lo: 23, hi: 29 },
    },
  },
  attackAngle: {
    mode: "ideal",
    sources: [BLAST_SOURCES.product, BLAST_SOURCES.glossary],
    // target = center of the published window (Antonelli). MLB avg 8.7° is not the target.
    bands: {
      "10U": { lo: 0, hi: 15, target: 7.5, sharedYouth: Y },
      "12U": { lo: 0, hi: 15, target: 7.5, sharedYouth: Y },
      "14U": { lo: 0, hi: 15, target: 7.5 },
      "16U": { lo: 0, hi: 15, target: 7.5 },
      "18U": { lo: 2, hi: 15, target: 8.5 },
      "College": { lo: 2, hi: 15, target: 8.5 },
      "Pro": { lo: 5, hi: 15, target: 10 },
    },
  },
  verticalBatAngle: {
    mode: "ideal",
    sources: [BLAST_SOURCES.product, BLAST_SOURCES.glossary],
    // One window at every level. target -25 is the center (Antonelli); Blast says VBA depends on pitch location.
    bands: {
      "10U": { lo: -40, hi: -10, target: -25 },
      "12U": { lo: -40, hi: -10, target: -25 },
      "14U": { lo: -40, hi: -10, target: -25 },
      "16U": { lo: -40, hi: -10, target: -25 },
      "18U": { lo: -40, hi: -10, target: -25 },
      "College": { lo: -40, hi: -10, target: -25 },
      "Pro": { lo: -40, hi: -10, target: -25 },
    },
  },
  timeToContact: {
    mode: "lower",
    sources: [BLAST_SOURCES.product, BLAST_SOURCES.glossary],
    // lo is the fast (better) end. hi is the slow end.
    bands: {
      "10U": { lo: 0.17, hi: 0.23, sharedYouth: Y },
      "12U": { lo: 0.17, hi: 0.23, sharedYouth: Y },
      "14U": { lo: 0.16, hi: 0.21 },
      "16U": { lo: 0.15, hi: 0.20 },
      "18U": { lo: 0.15, hi: 0.18 },
      "College": { lo: 0.14, hi: 0.17 },
      "Pro": { lo: 0.13, hi: 0.17 },
    },
  },
  powerKw: {
    mode: "higher",
    sources: [BLAST_SOURCES.product, BLAST_SOURCES.glossary],
    bands: {
      "10U": { lo: 0.90, hi: 2.50, sharedYouth: Y },
      "12U": { lo: 0.90, hi: 2.50, sharedYouth: Y },
      "14U": { lo: 1.40, hi: 3.20 },
      "16U": { lo: 2.17, hi: 3.45 },
      "18U": { lo: 2.81, hi: 4.09 },
      // Product page prints 5.074.
      "College": { lo: 3.83, hi: 5.074 },
      "Pro": { lo: 3.65, hi: 5.65 },
    },
  },
  rotationalAcceleration: {
    mode: "ra",
    sources: [BLAST_SOURCES.rotational, BLAST_SOURCES.faq],
    // Same buckets at every age. lo/hi are the published medium-band edges (10 and 15).
    bands: {
      "10U": { lo: 10, hi: 15 },
      "12U": { lo: 10, hi: 15 },
      "14U": { lo: 10, hi: 15 },
      "16U": { lo: 10, hi: 15 },
      "18U": { lo: 10, hi: 15 },
      "College": { lo: 10, hi: 15 },
      "Pro": { lo: 10, hi: 15 },
    },
  },
  onPlaneEfficiency: {
    mode: "ope",
    sources: [BLAST_SOURCES.product, BLAST_SOURCES.glossary, BLAST_SOURCES.faq],
    // Published anchors: range 65–85, aim 70%+. Same window at every age.
    bands: {
      "10U": { lo: 65, hi: 85, target: 70 },
      "12U": { lo: 65, hi: 85, target: 70 },
      "14U": { lo: 65, hi: 85, target: 70 },
      "16U": { lo: 65, hi: 85, target: 70 },
      "18U": { lo: 65, hi: 85, target: 70 },
      "College": { lo: 65, hi: 85, target: 70 },
      "Pro": { lo: 65, hi: 85, target: 70 },
    },
  },
  earlyConnection: {
    mode: "ideal",
    sources: [BLAST_SOURCES.product, BLAST_SOURCES.glossary],
    // target 90 is Blast's stated aim. The 96-at-target scoring curve is Antonelli.
    bands: {
      "10U": { lo: 80, hi: 105, target: 90 },
      "12U": { lo: 80, hi: 105, target: 90 },
      "14U": { lo: 80, hi: 105, target: 90 },
      "16U": { lo: 80, hi: 105, target: 90 },
      "18U": { lo: 80, hi: 105, target: 90 },
      "College": { lo: 80, hi: 105, target: 90 },
      "Pro": { lo: 80, hi: 105, target: 90 },
    },
  },
  connectionAtImpact: {
    mode: "ideal",
    sources: [BLAST_SOURCES.product, BLAST_SOURCES.glossary],
    bands: {
      "10U": { lo: 80, hi: 95, target: 90 },
      "12U": { lo: 80, hi: 95, target: 90 },
      "14U": { lo: 80, hi: 95, target: 90 },
      "16U": { lo: 80, hi: 95, target: 90 },
      "18U": { lo: 80, hi: 95, target: 90 },
      "College": { lo: 80, hi: 95, target: 90 },
      "Pro": { lo: 80, hi: 95, target: 90 },
    },
  },
};

const METRICS = {
  batSpeed: { label: "Bat Speed", unit: " mph", step: 0.5, blast: true, entryMin: 20, entryMax: 95, help: "Sweet-spot speed at impact, about 6 in from the barrel tip. Higher is better." },
  peakHandSpeed: { label: "Peak Hand Speed", unit: " mph", step: 0.1, blast: true, entryMin: 8, entryMax: 36, help: "Fastest the hands move during the swing. Higher is better." },
  attackAngle: { label: "Attack Angle", unit: "°", step: 0.5, blast: true, entryMin: -15, entryMax: 35, help: "Bat path at impact. Positive is uphill. Inside the published window scores best." },
  verticalBatAngle: { label: "Vertical Bat Angle", unit: "°", step: 0.5, blast: true, entryMin: -55, entryMax: 5, help: "Barrel vs horizontal at impact. Negative means the barrel is below the hands." },
  timeToContact: { label: "Time to Contact", unit: " s", step: 0.001, blast: true, entryMin: 0.08, entryMax: 0.35, help: "Downswing time from the load to impact. Faster (lower) is better." },
  powerKw: { label: "Power", unit: " kW", step: 0.01, blast: true, entryMin: 0.3, entryMax: 8, help: "Bat mass × acceleration × bat speed. Higher is better." },
  rotationalAcceleration: { label: "Rotational Acceleration", unit: " g", step: 0.1, blast: true, entryMin: 1, entryMax: 35, help: "How fast the bat accelerates out of the load, in g. Higher is better unless the swing is casting." },
  onPlaneEfficiency: { label: "On-Plane Efficiency", unit: "%", step: 1, blast: true, entryMin: 30, entryMax: 100, help: "Share of the swing on the plane set by vertical bat angle. Blast's aim is 70%+." },
  earlyConnection: { label: "Early Connection", unit: "°", step: 1, blast: true, entryMin: 40, entryMax: 140, help: "Body tilt vs bat angle as the downswing starts. Blast's target is 90°." },
  connectionAtImpact: { label: "Connection at Impact", unit: "°", step: 1, blast: true, entryMin: 40, entryMax: 140, help: "Body tilt vs bat angle at contact. Blast's target is 90°." },
  // Pitcher metrics — coach benchmarks, not Blast ranges.
  fastballVelo: { label: "Fastball Velocity", unit: " mph", low: 68, high: 96, step: 0.5, help: "Typical top fastball velocity" },
  spinRate: { label: "Fastball Spin Rate", unit: " rpm", low: 1600, high: 2600, step: 10, help: "Fastball spin efficiency / carry" },
  strikePct: { label: "Strike % (Command)", unit: "%", low: 45, high: 76, step: 1, help: "Pitches in / around the strike zone" },
  whiffPct: { label: "Offspeed Whiff %", unit: "%", low: 10, high: 46, step: 1, help: "Swings-and-misses on breaking / offspeed" },
  pitchCapacity: { label: "Pitch Capacity (Stamina)", unit: " pitches", low: 40, high: 110, step: 1, help: "Pitches before velocity / command drops" },
};

const SUBGRADES = {
  hitter: [
    { key: "BAT", label: "Bat Speed", metrics: ["batSpeed"], weights: [1], overallWeight: 0.40 },
    { key: "PWR", label: "Power", metrics: ["powerKw", "peakHandSpeed"], weights: [0.60, 0.40], overallWeight: 0.22 },
    { key: "PLANE", label: "Plane", metrics: ["onPlaneEfficiency", "attackAngle", "verticalBatAngle"], weights: [0.50, 0.30, 0.20], overallWeight: 0.18 },
    { key: "QUICK", label: "Quickness", metrics: ["timeToContact", "rotationalAcceleration"], weights: [0.55, 0.45], overallWeight: 0.14 },
    { key: "CONN", label: "Connection", metrics: ["earlyConnection", "connectionAtImpact"], weights: [0.50, 0.50], overallWeight: 0.06 },
  ],
  pitcher: [
    { key: "VEL", label: "Velocity", metrics: ["fastballVelo"], weights: [1], overallWeight: 0.30 },
    { key: "BRK", label: "Breaking / Offspeed", metrics: ["spinRate", "whiffPct"], weights: [0.45, 0.55], overallWeight: 0.25 },
    { key: "CNTL", label: "Control / Command", metrics: ["strikePct"], weights: [1], overallWeight: 0.30 },
    { key: "STM", label: "Stamina", metrics: ["pitchCapacity"], weights: [1], overallWeight: 0.15 },
  ],
};

const ARCHETYPES = {
  hitter: ["Power Hitter", "Contact / Leadoff", "Gap-to-Gap Hitter", "Speed / Table-Setter", "Middle-of-the-Order Bat"],
  pitcher: ["Ace", "Closer", "Workhorse Starter", "Strikeout Reliever", "Pitch-to-Contact Starter"],
  "two-way": ["Two-Way Player", "Two-Way Athlete", "Utility / Two-Way"],
};

const ARCHETYPE_INFO = {
  "Power Hitter": "Built to drive the ball. Bat speed and power lead the profile; the plan is damage on pitches in the zone, even if swing-and-miss comes with it.",
  "Contact / Leadoff": "Sets the table. Short, quick swing, finds the barrel, works counts and puts pressure on the defense. Power develops later — on-base skills come first.",
  "Gap-to-Gap Hitter": "Line-drive hitter who uses both gaps. Balanced contact and power with a repeatable path through the zone.",
  "Speed / Table-Setter": "Speed changes games. Gets on, steals bases, goes first-to-third, and covers ground defensively.",
  "Middle-of-the-Order Bat": "Run producer in the heart of the lineup. Combines barrel control and power to drive in runs in big spots.",
  "Ace": "Front-of-the-rotation arm. Velocity, pitch quality, and command to handle a lineup multiple times through the order.",
  "Closer": "Short-burst, high-leverage arm. Best stuff in one inning — velocity and a swing-and-miss secondary pitch play up.",
  "Workhorse Starter": "Eats innings efficiently. Pounds the zone, mixes pitches, and stays strong deep into outings.",
  "Strikeout Reliever": "Misses bats out of the bullpen. One elite swing-and-miss pitch can carry the profile.",
  "Pitch-to-Contact Starter": "Lives in the zone early, induces weak contact, and keeps pitch counts low.",
  "Two-Way Player": "Contributes on the mound and at the plate. Workload and development time are split, so efficiency in both areas matters.",
  "Two-Way Athlete": "Athletic two-way contributor valued for versatility, speed, and arm strength.",
  "Utility / Two-Way": "Versatile player who can fill multiple defensive roles while also pitching.",
};

function metricHistory(current, prior) {
  return [...prior, current];
}

const SAMPLE_PLAYERS = [
  {
    id: "sample-mason-carter", name: "Mason Carter", age: 17, ageGroup: "18U", classYear: "Junior / 11th",
    team: "Antonelli 17U", position: "OF", secondaryPosition: "1B", height: "6'1\"", weight: "190 lbs", hometown: "Tampa, FL", bats: "L", throws: "L", type: "hitter", archetype: "Power Hitter", photo: "",
    strengths: ["Drives the ball in the air to the pull side with real carry", "Strong, physical swing — top bat speed on the team", "Patient in hitter's counts; hunts pitches he can lift"],
    improvements: ["Stay on plane against breaking balls down and away", "Shorten the two-strike swing without giving up bat speed", "First-step quickness on outfield reads"],
    coachQuirks: ["dead-red", "unfazed"],
    metrics: { batSpeed: 69, peakHandSpeed: 22, attackAngle: 12, verticalBatAngle: -28, timeToContact: 0.155, powerKw: 3.9, rotationalAcceleration: 16, onPlaneEfficiency: 76, earlyConnection: 92, connectionAtImpact: 88 },
    history: {
      batSpeed: metricHistory(69, [63, 65, 67]), peakHandSpeed: metricHistory(22, [20, 20.5, 21]),
      attackAngle: metricHistory(12, [11, 11.5, 12]), verticalBatAngle: metricHistory(-28, [-26, -27, -27]),
      timeToContact: metricHistory(0.155, [0.160, 0.158, 0.156]), powerKw: metricHistory(3.9, [3.2, 3.5, 3.7]),
      rotationalAcceleration: metricHistory(16, [13, 14, 15]), onPlaneEfficiency: metricHistory(76, [73, 74, 75]),
      earlyConnection: metricHistory(92, [90, 91, 91]), connectionAtImpact: metricHistory(88, [86, 87, 87]),
    },
  },
  {
    id: "sample-eli-ramirez", name: "Eli Ramirez", age: 15, ageGroup: "16U", classYear: "Sophomore / 10th",
    team: "Antonelli 15U", position: "SS", secondaryPosition: "2B", height: "5'9\"", weight: "155 lbs", hometown: "Miami, FL", bats: "R", throws: "R", type: "hitter", archetype: "Contact / Leadoff", photo: "",
    strengths: ["Short, quick swing that finds the barrel", "Advanced strike-zone awareness for his age", "Instinctive base runner; quick first step out of the box"],
    improvements: ["Add strength so bat speed can climb toward varsity range", "Keep the bat on plane against high fastballs", "Stay connected when he tries to drive a pitch"],
    coachQuirks: ["table-setter", "first-pitch"],
    metrics: { batSpeed: 58, peakHandSpeed: 19, attackAngle: 8, verticalBatAngle: -22, timeToContact: 0.17, powerKw: 2.4, rotationalAcceleration: 11, onPlaneEfficiency: 72, earlyConnection: 90, connectionAtImpact: 89 },
    history: {
      batSpeed: metricHistory(58, [56, 57, 57.5]), peakHandSpeed: metricHistory(19, [18, 18.5, 18.5]),
      attackAngle: metricHistory(8, [5, 6, 7]), verticalBatAngle: metricHistory(-22, [-20, -21, -22]),
      timeToContact: metricHistory(0.17, [0.19, 0.182, 0.176]), powerKw: metricHistory(2.4, [2.25, 2.3, 2.35]),
      rotationalAcceleration: metricHistory(11, [10, 10.5, 10.5]), onPlaneEfficiency: metricHistory(72, [66, 68, 70]),
      earlyConnection: metricHistory(90, [86, 88, 89]), connectionAtImpact: metricHistory(89, [85, 86, 88]),
    },
  },
  {
    id: "sample-noah-bennett", name: "Noah Bennett", age: 16, ageGroup: "16U", classYear: "Junior / 11th",
    team: "Antonelli 16U", position: "RHP", secondaryPosition: "", height: "6'2\"", weight: "185 lbs", hometown: "Orlando, FL", bats: "R", throws: "R", type: "pitcher", archetype: "Ace", photo: "",
    strengths: ["Fastball carries through the top of the zone", "Repeats delivery and pounds the strike zone", "Breaking ball lands for strikes and chase swings"],
    improvements: ["Hold velocity deeper into outings (5th-6th inning)", "Develop a firm changeup vs. left-handed hitters", "Quicker move to hold runners at first"],
    coachQuirks: ["outlier-1", "pressure-cooker"],
    metrics: { fastballVelo: 90, spinRate: 2450, strikePct: 69, whiffPct: 38, pitchCapacity: 95 },
    history: {
      fastballVelo: metricHistory(90, [83, 86, 88]), spinRate: metricHistory(2450, [2150, 2280, 2380]),
      strikePct: metricHistory(69, [60, 64, 67]), whiffPct: metricHistory(38, [34, 35, 37]),
      pitchCapacity: metricHistory(95, [85, 88, 92]),
    },
  },
  {
    id: "sample-connor-walsh", name: "Connor Walsh", age: 17, ageGroup: "18U", classYear: "Senior / 12th",
    team: "Antonelli 17U", position: "RHP", secondaryPosition: "", height: "6'3\"", weight: "200 lbs", hometown: "Jacksonville, FL", bats: "R", throws: "R", type: "pitcher", archetype: "Closer", photo: "",
    strengths: ["Electric one-inning stuff; fastball jumps on hitters", "Slider generates swing-and-miss in leverage counts", "Attacks hitters — not afraid of contact in the zone"],
    improvements: ["Command can scatter when he overthrows", "Throw first-pitch strikes more consistently", "Build routine for back-to-back days"],
    coachQuirks: ["stopper", "outlier-2"],
    metrics: { fastballVelo: 91, spinRate: 2480, strikePct: 61, whiffPct: 41, pitchCapacity: 52 },
    history: {
      fastballVelo: metricHistory(91, [89.5, 90, 90.5]), spinRate: metricHistory(2480, [2300, 2360, 2420]),
      strikePct: metricHistory(61, [57, 59, 60]), whiffPct: metricHistory(41, [34, 36, 39]),
      pitchCapacity: metricHistory(52, [45, 48, 50]),
    },
  },
  {
    id: "sample-dylan-brooks", name: "Dylan Brooks", age: 14, ageGroup: "14U", classYear: "Freshman / 9th",
    team: "Antonelli 14U", position: "C", secondaryPosition: "RHP", height: "5'10\"", weight: "160 lbs", hometown: "Sarasota, FL", bats: "R", throws: "R", type: "two-way", archetype: "Two-Way Player", photo: "",
    strengths: ["Strong arm behind the plate and on the mound", "Competitive at-bats; battles with two strikes", "Athletic frame with room to add strength"],
    improvements: ["Receiving and blocking consistency behind the plate", "Bat speed — stay connected through the turn", "Pitching mechanics: stay closed longer to improve command"],
    coachQuirks: ["pop-time", "unfazed"],
    metrics: {
      batSpeed: 51, peakHandSpeed: 17, attackAngle: 6, verticalBatAngle: -25, timeToContact: 0.19, powerKw: 1.8, rotationalAcceleration: 8.5, onPlaneEfficiency: 64, earlyConnection: 78, connectionAtImpact: 84,
      fastballVelo: 76, spinRate: 1950, strikePct: 58, whiffPct: 22, pitchCapacity: 62,
    },
    history: {
      batSpeed: metricHistory(51, [48, 49, 50]), peakHandSpeed: metricHistory(17, [16, 16.5, 16.5]),
      attackAngle: metricHistory(6, [4, 5, 5]), verticalBatAngle: metricHistory(-25, [-22, -23, -24]),
      timeToContact: metricHistory(0.19, [0.205, 0.200, 0.195]), powerKw: metricHistory(1.8, [1.55, 1.65, 1.7]),
      rotationalAcceleration: metricHistory(8.5, [7.5, 8, 8.2]), onPlaneEfficiency: metricHistory(64, [60, 61, 63]),
      earlyConnection: metricHistory(78, [74, 75, 77]), connectionAtImpact: metricHistory(84, [80, 81, 82]),
      fastballVelo: metricHistory(76, [73, 74, 75]), spinRate: metricHistory(1950, [1850, 1880, 1920]),
      strikePct: metricHistory(58, [54, 55, 57]), whiffPct: metricHistory(22, [18, 19, 21]),
      pitchCapacity: metricHistory(62, [52, 56, 59]),
    },
  },
];

/* ---------- Grade math ---------- */
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

function ageGroupFromAge(age) {
  const n = Number(age);
  if (!Number.isFinite(n) || n <= 10) return "10U";
  if (n <= 12) return "12U";
  if (n <= 14) return "14U";
  if (n <= 16) return "16U";
  if (n <= 18) return "18U";
  if (n <= 22) return "College";
  return "Pro";
}

function activeAgeGroup(player) {
  const g = player && player.ageGroup;
  if (AGE_GROUP_ORDER.includes(g)) return g;
  return ageGroupFromAge(player && player.age);
}

function bandForGrade(grade) {
  if (grade == null || Number.isNaN(grade)) return null;
  if (grade < 50) return { key: "below", label: "Below Average" };
  if (grade < 65) return { key: "average", label: "Average" };
  if (grade < 80) return { key: "good", label: "Good" };
  if (grade < 90) return { key: "great", label: "Great" };
  return { key: "elite", label: "Elite" };
}

/* Higher-better. Published lo starts Average (50). Midpoint starts Good (65).
   Published hi starts Great (80). One full span above hi reaches 99.
   The cuts past the published anchors are Antonelli. */
function gradeHigher(v, lo, hi) {
  const span = hi - lo;
  const mid = (lo + hi) / 2;
  if (!(span > 0)) return 60;
  if (v < lo) return clamp(20 + clamp((v - (lo - span)) / span, 0, 1) * 29, 20, 49);
  if (v < mid) return 50 + ((v - lo) / (mid - lo)) * 14;
  if (v < hi) return 65 + ((v - mid) / (hi - mid)) * 14;
  return clamp(80 + clamp((v - hi) / span, 0, 1) * 19, 80, 99);
}

/* Lower-better. `fast` is the published quick end and scores like a published high. */
function gradeLower(v, fast, slow) {
  const span = slow - fast;
  const mid = (fast + slow) / 2;
  if (!(span > 0)) return 60;
  if (v > slow) return clamp(49 - clamp((v - slow) / span, 0, 1) * 29, 20, 49);
  if (v > mid) return 50 + ((slow - v) / (slow - mid)) * 14;
  if (v > fast) return 65 + ((mid - v) / (mid - fast)) * 14;
  return clamp(80 + clamp((fast - v) / span, 0, 1) * 19, 80, 99);
}

/* Ideal window. 96 at the target, ~70 at either published edge, then down to 20
   one full span outside. Peak placement is Antonelli; lo/hi/target are not. */
function gradeIdeal(v, lo, hi, target) {
  const span = Math.max(hi - lo, 0.0001);
  const center = target == null ? (lo + hi) / 2 : target;
  if (v >= lo && v <= hi) {
    const edge = v < center ? (center - lo) : (hi - center);
    const t = edge === 0 ? 0 : Math.abs(v - center) / edge;
    return clamp(96 - t * 26, 70, 96);
  }
  const outside = v < lo ? (lo - v) : (v - hi);
  return clamp(69 - (outside / span) * 49, 20, 69);
}

/* On-plane. Official anchors are 65, 70, and 85. The 78 cut and Elite from 85
   upward are Antonelli. Same function at every age. */
function gradeOnPlane(v) {
  if (v < 65) return clamp(20 + clamp((v - 45) / 20, 0, 1) * 29, 20, 49);
  if (v < 70) return 50 + ((v - 65) / 5) * 14;
  if (v < 78) return 65 + ((v - 70) / 8) * 14;
  if (v < 85) return 80 + ((v - 78) / 7) * 9;
  return clamp(90 + clamp((v - 85) / 10, 0, 1) * 9, 90, 99);
}

function gradeBlastMetric(key, value, ageGroup) {
  const spec = BLAST_BENCHMARKS[key];
  if (!spec || value == null || Number.isNaN(Number(value))) return { grade: null, band: null, window: null };
  const group = AGE_GROUP_ORDER.includes(ageGroup) ? ageGroup : "16U";
  const window = spec.bands[group];
  const v = Number(value);
  let raw;
  if (spec.mode === "ope") raw = gradeOnPlane(v);
  else if (spec.mode === "ra") raw = gradeHigher(v, window.lo, window.hi);
  else if (spec.mode === "lower") raw = gradeLower(v, window.lo, window.hi);
  else if (spec.mode === "ideal") raw = gradeIdeal(v, window.lo, window.hi, window.target);
  else raw = gradeHigher(v, window.lo, window.hi);
  const grade = clamp(Math.round(raw), 20, 99);
  return { grade, band: bandForGrade(grade), window };
}

function normalizeMetric(key, value, ageGroup) {
  const m = METRICS[key];
  if (!m || value == null || Number.isNaN(Number(value))) return null;
  if (m.blast) return gradeBlastMetric(key, value, ageGroup).grade;
  let pct = (Number(value) - m.low) / (m.high - m.low);
  if (m.invert) pct = 1 - pct;
  return Math.round(clamp(20 + pct * 79, 20, 99));
}

function subGradesFor(player, kind) {
  const ageGroup = activeAgeGroup(player);
  return SUBGRADES[kind].map((sg) => {
    let totalWeight = 0, sum = 0;
    sg.metrics.forEach((mk, i) => {
      const g = normalizeMetric(mk, player.metrics && player.metrics[mk], ageGroup);
      if (g != null) { sum += g * sg.weights[i]; totalWeight += sg.weights[i]; }
    });
    const grade = totalWeight ? Math.round(sum / totalWeight) : null;
    return { ...sg, grade };
  });
}

function overallFromSubgrades(subs) {
  let tw = 0, sum = 0;
  subs.forEach((s) => { if (s.grade != null) { sum += s.grade * s.overallWeight; tw += s.overallWeight; } });
  return tw ? clamp(Math.round(sum / tw), 20, 99) : 20;
}

function gradesFor(player) {
  if (player.type === "pitcher") {
    const subs = subGradesFor(player, "pitcher");
    return { subs, overall: overallFromSubgrades(subs) };
  }
  if (player.type === "two-way") {
    const h = subGradesFor(player, "hitter");
    const p = subGradesFor(player, "pitcher");
    const overall = clamp(Math.round((overallFromSubgrades(h) + overallFromSubgrades(p)) / 2), 20, 99);
    return { subs: [...h, ...p], overall, hitterSubs: h, pitcherSubs: p };
  }
  const subs = subGradesFor(player, "hitter");
  return { subs, overall: overallFromSubgrades(subs) };
}

function tierFor(overall) {
  if (overall >= 90) return { key: "diamond", label: "DIAMOND" };
  if (overall >= 80) return { key: "gold", label: "GOLD" };
  if (overall >= 70) return { key: "silver", label: "SILVER" };
  return { key: "bronze", label: "BRONZE" };
}

const TIER_RANK = { bronze: 0, silver: 1, gold: 2, diamond: 3 };
const TIER_LABEL = { bronze: "BRONZE", silver: "SILVER", gold: "GOLD", diamond: "DIAMOND" };

function gradeSnapshot(player) {
  const overall = gradesFor(player).overall;
  const tier = tierFor(overall).key;
  return { overall, tier };
}

/* Seasons run Sept 1 through Aug 31. 2025-09-01 .. 2026-08-31 is "2025-26".
   There is no date of birth. Age advances from the stored number, and the
   season stamp on the player decides when a year has passed. */
let seasonClock = null;
function nowDate() {
  return seasonClock ? new Date(seasonClock) : new Date();
}
function seasonLabel(date) {
  const d = date instanceof Date ? date : new Date(date || nowDate());
  const when = Number.isNaN(d.getTime()) ? nowDate() : d;
  const startYear = when.getMonth() >= 8 ? when.getFullYear() : when.getFullYear() - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}
function seasonStartYear(label) {
  const n = parseInt(String(label || "").slice(0, 4), 10);
  return Number.isFinite(n) ? n : null;
}
function seasonsBetween(fromLabel, toLabel) {
  const a = seasonStartYear(fromLabel);
  const b = seasonStartYear(toLabel);
  if (a == null || b == null) return 0;
  return b - a;
}
function addSeasons(label, count) {
  const start = seasonStartYear(label);
  const y = (start == null ? seasonStartYear(seasonLabel(nowDate())) : start) + count;
  return `${y}-${String(y + 1).slice(-2)}`;
}

function ensureSeasonFields(player) {
  let changed = false;
  if (!player.currentSeason) {
    player.currentSeason = seasonLabel(nowDate());
    changed = true;
  }
  if (!Array.isArray(player.cardCollection)) {
    player.cardCollection = [];
    changed = true;
  }
  if (typeof player.ageGroupPinned !== "boolean") {
    const mapped = ageGroupFromAge(player.age);
    player.ageGroupPinned = AGE_GROUP_ORDER.includes(player.ageGroup) && player.ageGroup !== mapped;
    changed = true;
  }
  return changed;
}

function nextAgeState(player, years) {
  const age = (Number(player.age) || 0) + years;
  const ageGroup = player.ageGroupPinned ? activeAgeGroup(player) : ageGroupFromAge(age);
  return { age, ageGroup };
}

function projectRollover(player, years) {
  const steps = years > 0 ? years : 1;
  const from = gradesFor(player);
  const next = nextAgeState(player, steps);
  const projectedPlayer = { ...player, age: next.age, ageGroup: next.ageGroup, ageGroupPinned: false };
  const to = gradesFor(projectedPlayer);
  return {
    years: steps,
    fromSeason: player.currentSeason,
    toSeason: addSeasons(player.currentSeason, steps),
    fromAge: Number(player.age) || 0,
    toAge: next.age,
    fromGroup: activeAgeGroup(player),
    toGroup: next.ageGroup,
    fromOverall: from.overall,
    fromTier: tierFor(from.overall).key,
    toOverall: to.overall,
    toTier: tierFor(to.overall).key,
    pinned: !!player.ageGroupPinned,
  };
}

function archiveCurrentCard(player, archivedAt) {
  const graded = gradesFor(player);
  const ageGroup = activeAgeGroup(player);
  const metricGrades = {};
  metricKeysFor(player.type).forEach((key) => {
    const value = player.metrics ? player.metrics[key] : null;
    const grade = normalizeMetric(key, value, ageGroup);
    let band = null;
    if (METRICS[key] && METRICS[key].blast) {
      const scored = gradeBlastMetric(key, value, ageGroup);
      band = scored.band ? { key: scored.band.key, label: scored.band.label } : null;
    } else {
      const fromGrade = bandForGrade(grade);
      band = fromGrade ? { key: fromGrade.key, label: fromGrade.label } : null;
    }
    metricGrades[key] = { value, grade, band };
  });
  const perksEarned = (player.earnedQuirks || []).map((rec) => {
    const q = TRAINING_BY_ID[rec.id];
    return {
      id: rec.id,
      name: q ? q.name : rec.id,
      icon: q ? q.icon : "",
      milestone: rec.milestone || (q ? q.description : ""),
      earnedAt: rec.earnedAt || "",
    };
  });
  const assignedPerks = (player.coachQuirks || []).map((id) => {
    const q = SHOW_BY_ID[id];
    return { id, name: q ? q.name : id, icon: q ? q.icon : "", description: q ? q.description : "" };
  });
  return {
    seasonLabel: player.currentSeason,
    age: player.age,
    ageGroup,
    archivedAt: archivedAt || new Date().toISOString(),
    overall: graded.overall,
    tier: tierFor(graded.overall).key,
    subGrades: graded.subs.map((s) => ({ key: s.key, label: s.label, grade: s.grade })),
    metrics: structuredClone(player.metrics || {}),
    metricGrades,
    history: structuredClone(player.history || {}),
    perksEarned,
    assignedPerks,
    strengths: (player.strengths || []).slice(),
    improvements: (player.improvements || []).slice(),
    archetype: player.archetype || "",
    photo: player.photo || "",
    name: player.name,
    position: player.position || "",
    secondaryPosition: player.secondaryPosition || "",
    height: player.height || "",
    weight: player.weight || "",
    hometown: player.hometown || "",
    bats: player.bats || "",
    throws: player.throws || "",
    type: player.type,
    team: player.team || "",
    classYear: player.classYear || "",
  };
}

function applyRollover(player, years) {
  ensureSeasonFields(player);
  const preview = projectRollover(player, years);
  if (!Array.isArray(player.cardCollection)) player.cardCollection = [];
  player.cardCollection.push(archiveCurrentCard(player));
  player.age = preview.toAge;
  if (!player.ageGroupPinned) player.ageGroup = preview.toGroup;
  player.currentSeason = preview.toSeason;
  const baseline = {};
  metricKeysFor(player.type).forEach((key) => {
    const value = player.metrics && player.metrics[key];
    if (value == null || Number.isNaN(Number(value))) return;
    baseline[key] = [Number(value)];
  });
  player.history = baseline;
  player.earnedQuirks = [];
  player.seasonReveal = {
    seasonLabel: preview.toSeason,
    retiredSeason: preview.fromSeason,
    retiredGroup: preview.fromGroup,
    retiredOverall: preview.fromOverall,
    retiredTier: preview.fromTier,
    ageGroup: preview.toGroup,
    age: preview.toAge,
    overall: preview.toOverall,
    tier: preview.toTier,
  };
  return preview;
}

function rolloverIfDue(player) {
  ensureSeasonFields(player);
  const elapsed = seasonsBetween(player.currentSeason, seasonLabel(nowDate()));
  if (elapsed > 0) return applyRollover(player, elapsed);
  return null;
}

function ackSeasonReveal(player) {
  if (!player || !player.seasonReveal) return;
  player.gradeSeen = { overall: player.seasonReveal.overall, tier: player.seasonReveal.tier };
  delete player.seasonReveal;
}

function careerSummary(player) {
  const cards = Array.isArray(player.cardCollection) ? player.cardCollection : [];
  const live = gradesFor(player);
  const liveTier = tierFor(live.overall).key;
  const overalls = cards.map((c) => c.overall).concat(live.overall);
  const goldPlus = cards.filter((c) => TIER_RANK[c.tier] >= TIER_RANK.gold).length + (TIER_RANK[liveTier] >= TIER_RANK.gold ? 1 : 0);
  return {
    seasons: cards.length + 1,
    retired: cards.length,
    best: overalls.length ? Math.max(...overalls) : live.overall,
    goldPlus,
  };
}

/* Pure decision for overall / tier celebrations. `seen` is the last acknowledged
   overall and tier. A missing seen is a silent init. A higher tier is a tier-up
   (the overall jump rides along). A higher overall inside the same tier is an
   overall-up. Any drop is a silent baseline move. */
function planGradeCelebration(seen, next) {
  const valid = seen && typeof seen.overall === "number" && Object.prototype.hasOwnProperty.call(TIER_RANK, seen.tier);
  if (!valid) return { kind: "init", mark: { overall: next.overall, tier: next.tier } };
  if (TIER_RANK[next.tier] > TIER_RANK[seen.tier]) {
    return { kind: "tier-up", fromOverall: seen.overall, toOverall: next.overall, fromTier: seen.tier, toTier: next.tier, delta: next.overall - seen.overall };
  }
  if (next.overall > seen.overall) {
    return { kind: "overall-up", fromOverall: seen.overall, toOverall: next.overall, fromTier: seen.tier, toTier: next.tier, delta: next.overall - seen.overall };
  }
  if (next.overall < seen.overall || TIER_RANK[next.tier] < TIER_RANK[seen.tier]) {
    return { kind: "silent", mark: { overall: next.overall, tier: next.tier } };
  }
  return { kind: "same" };
}

function takeGradeCelebration(player) {
  if (player && player.seasonReveal) return { kind: "season-hold" };
  const plan = planGradeCelebration(player.gradeSeen, gradeSnapshot(player));
  if (plan.mark) player.gradeSeen = plan.mark;
  return plan;
}

/*
 * Player Perks (inspired by MLB The Show quirks; the on-screen name is Player Perks).
 * Show names and effects are the MLB The Show 26 active list on
 * https://showzone.gg/players/quirks (21 quirks, all written as situational
 * boosts). None of those 21 are penalties, so none were dropped. Descriptions
 * below are rewritten for youth coaching. Show perks are coach-awarded
 * because this app does not have in-game situation data.
 * TRAINING_QUIRKS are original Antonelli badges. They unlock from milestones
 * in this table and stay once earned (earnedQuirks on the player).
 */
const SHOW_QUIRKS = [
  { id: "dead-red", name: "Dead Red", icon: "🔴", category: "Hitting", criteria: "Award when he does his best work against fastballs.", description: "Hunts velocity and squares up fastballs when he is on time." },
  { id: "breaking-ball", name: "Breaking Ball Hitter", icon: "🪝", category: "Hitting", criteria: "Award when he stays through spin instead of bailing out.", description: "Handles breaking balls — stays in the zone and lets the ball travel." },
  { id: "bad-ball", name: "Bad Ball Hitter", icon: "🎯", category: "Hitting", criteria: "Award when he can still do damage on a pitch just off the plate.", description: "Spoils a close pitch and still finds the barrel when it is a little out of the zone." },
  { id: "first-pitch", name: "First-Pitch Hitter", icon: "1️⃣", category: "Hitting", criteria: "Award when he attacks a good first pitch instead of watching a strike.", description: "Ready on the first pitch and jumps a strike he can drive." },
  { id: "unfazed", name: "Unfazed", icon: "😤", category: "Hitting", criteria: "Award for a calm, dangerous two-strike at-bat.", description: "Shortens up with two strikes and still competes — the at-bat is not over." },
  { id: "situational", name: "Situational Hitter", icon: "🥉", category: "Hitting", criteria: "Award when he moves a runner from third with less than two outs.", description: "Puts the ball in play with a runner on third and gets the run in." },
  { id: "table-setter", name: "Table Setter", icon: "🧹", category: "Hitting", criteria: "Award for getting on with nobody on and starting an inning.", description: "Gets the line moving — a tough out when the bases are empty." },
  { id: "pinch-hitter", name: "Pinch Hitter", icon: "🔔", category: "Hitting", criteria: "Award when he produces in a one at-bat role off the bench.", description: "Walks up cold and still has a quality at-bat." },
  { id: "outlier-1", name: "Outlier I", icon: "💨", category: "Pitching", criteria: "Award when the fastball plays above the group and misses bats up.", description: "Fastball has extra life — it plays above the usual velocity for his age." },
  { id: "outlier-2", name: "Outlier II", icon: "2️⃣", category: "Pitching", criteria: "Award when a second pitch has its own swing-and-miss velocity or bite.", description: "The second pitch is a weapon, not just a show-me pitch." },
  { id: "break-outlier", name: "Break Outlier", icon: "🌀", category: "Pitching", criteria: "Award when the breaking ball still snaps late in the outing.", description: "Breaker keeps its shape when he is tired — it does not hang." },
  { id: "pressure-cooker", name: "Pressure Cooker", icon: "🔥", category: "Pitching", criteria: "Award when he pitches better with runners on than with the bases empty.", description: "Settles in with traffic on the bases and makes the next pitch." },
  { id: "stopper", name: "Stopper", icon: "🛑", category: "Pitching", criteria: "Award when he takes the ball while the team is behind and stops the inning.", description: "Wants the ball when the team is chasing a lead." },
  { id: "pickoff", name: "Pick Off Artist", icon: "👈", category: "Pitching", criteria: "Award for a pickoff move that actually holds runners.", description: "Holds runners with a quick, legal move. They stop leaning." },
  { id: "pop-time", name: "Catcher Pop Time", icon: "🧤", category: "Fielding", criteria: "Award when his exchange and throw keep runners honest.", description: "Gets the ball out of the glove quickly and throws a strike to second." },
  { id: "fighter", name: "Fighter", icon: "⚔️", category: "Intangibles", criteria: "Award for his best baseball late in close games.", description: "Plays his best when the game is late and the score is tight." },
  { id: "rally-monkey", name: "Rally Monkey", icon: "🐒", category: "Intangibles", criteria: "Award when he sparks a rally while the team is behind.", description: "Energy goes up when the team is trailing — he starts the comeback." },
  { id: "homebody", name: "Homebody", icon: "🏠", category: "Intangibles", criteria: "Award when he plays his best in home games.", description: "Feeds off a home crowd and plays loose in his own park." },
  { id: "road-warrior", name: "Road Warrior", icon: "🚌", category: "Intangibles", criteria: "Award when he travels well and plays the same game on the road.", description: "Same routine, same energy, on the road as at home." },
  { id: "day-player", name: "Day Player", icon: "☀️", category: "Intangibles", criteria: "Award when day games are his best version.", description: "Shows up ready for an early first pitch." },
  { id: "night-player", name: "Night Player", icon: "🌙", category: "Intangibles", criteria: "Award when night games are his best version.", description: "Settles in under the lights and plays free." },
];

function histOf(player, key) {
  const raw = player && player.history && player.history[key];
  if (Array.isArray(raw) && raw.length) return raw.map(Number).filter((n) => !Number.isNaN(n));
  const v = player && player.metrics && player.metrics[key];
  return v == null || Number.isNaN(Number(v)) ? [] : [Number(v)];
}
function gainOf(player, key) {
  const h = histOf(player, key);
  if (h.length < 2) return null;
  return h[h.length - 1] - h[0];
}
function spreadOf(player, key) {
  const h = histOf(player, key);
  if (h.length < 4) return null;
  return Math.max(...h) - Math.min(...h);
}
function logsOf(player, key) { return histOf(player, key).length; }
function roundedGain(n, places) {
  const f = 10 ** places;
  const v = Math.round(n * f) / f;
  return (v > 0 ? "+" : "") + String(v);
}
function closerBy(player, key, target, minDeg) {
  const h = histOf(player, key);
  if (h.length < 2 || target == null) return false;
  return (Math.abs(h[0] - target) - Math.abs(h[h.length - 1] - target)) >= minDeg - 1e-9;
}

const TRAINING_QUIRKS = [
  { id: "heat-check", name: "Heat Check", icon: "🔥", category: "Training", priority: 96, description: "Bat speed jumped at least 5 mph across this training block.",
    test: (p) => { const g = gainOf(p, "batSpeed"); return g != null && g >= 5; },
    milestone: (p) => `Earned: Bat Speed ${roundedGain(gainOf(p, "batSpeed"), 1)} mph this training block` },
  { id: "bat-speed-builder", name: "Bat Speed Builder", icon: "⚡", category: "Training", priority: 74, description: "Bat speed is up at least 3 mph from the first logged swing.",
    test: (p) => { const g = gainOf(p, "batSpeed"); return g != null && g >= 3 && g < 5; },
    milestone: (p) => `Earned: Bat Speed ${roundedGain(gainOf(p, "batSpeed"), 1)} mph this training block` },
  { id: "power-surge", name: "Power Surge", icon: "💥", category: "Training", priority: 88, description: "Power is up at least 0.40 kW — more bat speed and acceleration into the ball.",
    test: (p) => { const g = gainOf(p, "powerKw"); return g != null && g >= 0.4; },
    milestone: (p) => `Earned: Power ${roundedGain(gainOf(p, "powerKw"), 2)} kW this training block` },
  { id: "plane-climber", name: "Plane Climber", icon: "📐", category: "Training", priority: 78, description: "On-plane efficiency climbed at least 5 points. More of the swing is on the barrel plane.",
    test: (p) => { const g = gainOf(p, "onPlaneEfficiency"); return g != null && g >= 5; },
    milestone: (p) => `Earned: On-Plane Efficiency ${roundedGain(gainOf(p, "onPlaneEfficiency"), 0)} points` },
  { id: "quick-trigger", name: "Quick Trigger", icon: "⏱️", category: "Training", priority: 76, description: "Time to contact got at least 0.015 seconds faster.",
    test: (p) => { const g = gainOf(p, "timeToContact"); return g != null && Math.round(g * 1000) <= -15; },
    milestone: (p) => `Earned: Time to Contact ${roundedGain(gainOf(p, "timeToContact"), 3)} s` },
  { id: "fast-twitch", name: "Fast Twitch", icon: "🌀", category: "Training", priority: 80, description: "Rotational acceleration is up at least 2 g. The barrel gets to speed sooner.",
    test: (p) => { const g = gainOf(p, "rotationalAcceleration"); return g != null && g >= 2; },
    milestone: (p) => `Earned: Rotational Acceleration ${roundedGain(gainOf(p, "rotationalAcceleration"), 1)} g` },
  { id: "quick-hands", name: "Quick Hands", icon: "✋", category: "Training", priority: 64, description: "Peak hand speed is up at least 2 mph.",
    test: (p) => { const g = gainOf(p, "peakHandSpeed"); return g != null && g >= 2; },
    milestone: (p) => `Earned: Peak Hand Speed ${roundedGain(gainOf(p, "peakHandSpeed"), 1)} mph` },
  { id: "metronome", name: "Metronome", icon: "🎯", category: "Training", priority: 56, description: "Four or more check-ins, and bat speed or fastball velocity stayed inside a 2.5 mph window.",
    test: (p) => {
      const key = p.type === "pitcher" ? "fastballVelo" : "batSpeed";
      const s = spreadOf(p, key);
      return s != null && s <= 2.5;
    },
    milestone: (p) => {
      const key = p.type === "pitcher" ? "fastballVelo" : "batSpeed";
      const label = key === "batSpeed" ? "Bat speed" : "Fastball";
      return `Earned: ${label} stayed within ${roundedGain(spreadOf(p, key), 1).replace("+", "")} mph across ${logsOf(p, key)} check-ins`;
    } },
  { id: "added-gas", name: "Added Gas", icon: "🚀", category: "Training", priority: 86, description: "Fastball velocity is up at least 3 mph.",
    test: (p) => { const g = gainOf(p, "fastballVelo"); return g != null && g >= 3; },
    milestone: (p) => `Earned: Fastball ${roundedGain(gainOf(p, "fastballVelo"), 1)} mph` },
  { id: "spin-lab", name: "Spin Lab", icon: "🧲", category: "Training", priority: 68, description: "Fastball spin is up at least 150 rpm.",
    test: (p) => { const g = gainOf(p, "spinRate"); return g != null && g >= 150; },
    milestone: (p) => `Earned: Spin ${roundedGain(gainOf(p, "spinRate"), 0)} rpm` },
  { id: "strike-painter", name: "Strike Painter", icon: "🎨", category: "Training", priority: 66, description: "Strike percentage is up at least 5 points.",
    test: (p) => { const g = gainOf(p, "strikePct"); return g != null && g >= 5; },
    milestone: (p) => `Earned: Strike % ${roundedGain(gainOf(p, "strikePct"), 0)} points` },
  { id: "whiff-maker", name: "Whiff Maker", icon: "💨", category: "Training", priority: 70, description: "Offspeed whiff rate is up at least 6 points.",
    test: (p) => { const g = gainOf(p, "whiffPct"); return g != null && g >= 6; },
    milestone: (p) => `Earned: Whiff % ${roundedGain(gainOf(p, "whiffPct"), 0)} points` },
  { id: "deep-start", name: "Deep Start", icon: "🔋", category: "Training", priority: 58, description: "Pitch capacity is up at least 12 pitches before stuff fades.",
    test: (p) => { const g = gainOf(p, "pitchCapacity"); return g != null && g >= 12; },
    milestone: (p) => `Earned: Pitch capacity ${roundedGain(gainOf(p, "pitchCapacity"), 0)} pitches` },
  { id: "both-sides", name: "Both Sides", icon: "⚔️", category: "Training", priority: 84, description: "A two-way player who got better on the mound and in the batter's box in the same block.",
    test: (p) => {
      if (p.type !== "two-way") return false;
      const hit = (gainOf(p, "batSpeed") || 0) >= 2 || (gainOf(p, "powerKw") || 0) >= 0.25 || (gainOf(p, "onPlaneEfficiency") || 0) >= 3;
      const pit = (gainOf(p, "fastballVelo") || 0) >= 2 || (gainOf(p, "strikePct") || 0) >= 3 || (gainOf(p, "spinRate") || 0) >= 100;
      return hit && pit;
    },
    milestone: () => "Earned: a real gain on both the hitting side and the pitching side" },
  { id: "diamond-standard", name: "Diamond Standard", icon: "💎", category: "Training", priority: 98, description: "Overall grade reached Diamond (90+).",
    test: (p) => gradesFor(p).overall >= 90,
    milestone: (p) => `Earned: overall ${gradesFor(p).overall} hit Diamond` },
  { id: "gold-standard", name: "Gold Standard", icon: "🥇", category: "Training", priority: 94, description: "Overall grade reached Gold (80–89).",
    test: (p) => { const o = gradesFor(p).overall; return o >= 80 && o < 90; },
    milestone: (p) => `Earned: overall ${gradesFor(p).overall} hit Gold` },
  { id: "silver-standard", name: "Silver Standard", icon: "🥈", category: "Training", priority: 72, description: "Overall grade reached Silver (70–79).",
    test: (p) => { const o = gradesFor(p).overall; return o >= 70 && o < 80; },
    milestone: (p) => `Earned: overall ${gradesFor(p).overall} hit Silver` },
  { id: "elite-barrel", name: "Elite Barrel", icon: "👑", category: "Training", priority: 100, description: "Bat speed graded Elite for his age group.",
    test: (p) => { const g = normalizeMetric("batSpeed", p.metrics && p.metrics.batSpeed, activeAgeGroup(p)); return g != null && g >= 90; },
    milestone: (p) => `Earned: Bat Speed ${p.metrics.batSpeed} mph is Elite at ${activeAgeGroup(p)}` },
  { id: "great-barrel", name: "Great Barrel", icon: "🌟", category: "Training", priority: 92, description: "Bat speed graded Great for his age group.",
    test: (p) => { const g = normalizeMetric("batSpeed", p.metrics && p.metrics.batSpeed, activeAgeGroup(p)); return g != null && g >= 80 && g < 90; },
    milestone: (p) => `Earned: Bat Speed ${p.metrics.batSpeed} mph is Great at ${activeAgeGroup(p)}` },
  { id: "stay-connected", name: "Stay Connected", icon: "🤝", category: "Training", priority: 62, description: "Early connection or connection at impact moved at least 4° closer to 90°.",
    test: (p) => closerBy(p, "earlyConnection", 90, 4) || closerBy(p, "connectionAtImpact", 90, 4),
    milestone: (p) => closerBy(p, "earlyConnection", 90, 4) ? "Earned: Early Connection moved at least 4° closer to 90°" : "Earned: Connection at Impact moved at least 4° closer to 90°" },
  { id: "path-finder", name: "Path Finder", icon: "↗️", category: "Training", priority: 60, description: "Attack angle moved at least 2° closer to the Blast window's center for his age group.",
    test: (p) => {
      const band = BLAST_BENCHMARKS.attackAngle.bands[activeAgeGroup(p)];
      return !!(band && closerBy(p, "attackAngle", band.target, 2));
    },
    milestone: (p) => `Earned: Attack angle moved closer to the ${activeAgeGroup(p)} target` },
  { id: "three-tool-climb", name: "Three-Tool Climb", icon: "📈", category: "Training", priority: 82, description: "Bat speed, power, and on-plane efficiency all moved up in the same block.",
    test: (p) => (gainOf(p, "batSpeed") || 0) >= 2 && (gainOf(p, "powerKw") || 0) >= 0.3 && (gainOf(p, "onPlaneEfficiency") || 0) >= 4,
    milestone: () => "Earned: bat speed, power, and on-plane efficiency all climbed together" },
  { id: "cage-rat", name: "Cage Rat", icon: "🏋️", category: "Training", priority: 40, description: "Four or more check-ins logged on at least four different metrics. The work is on the card.",
    test: (p) => metricKeysFor(p.type).filter((k) => logsOf(p, k) >= 4).length >= 4,
    milestone: (p) => `Earned: 4+ check-ins on ${metricKeysFor(p.type).filter((k) => logsOf(p, k) >= 4).length} metrics` },
];

const SHOW_BY_ID = Object.fromEntries(SHOW_QUIRKS.map((q) => [q.id, q]));
const TRAINING_BY_ID = Object.fromEntries(TRAINING_QUIRKS.map((q) => [q.id, q]));

function todayStamp() {
  try { return new Date().toISOString().slice(0, 10); } catch (e) { return "2026-01-01"; }
}

function syncEarnedQuirks(player, earnedAt) {
  if (!player.earnedQuirks || !Array.isArray(player.earnedQuirks)) player.earnedQuirks = [];
  const have = new Set(player.earnedQuirks.map((e) => e && e.id));
  const stamp = earnedAt || todayStamp();
  const added = [];
  TRAINING_QUIRKS.forEach((q) => {
    if (have.has(q.id) || !q.test(player)) return;
    let milestone = q.description;
    try { milestone = q.milestone(player); } catch (e) { /* keep description */ }
    const rec = { id: q.id, milestone, earnedAt: stamp, seen: false };
    player.earnedQuirks.push(rec);
    added.push(rec);
  });
  return added;
}

function markQuirkSeen(player, id) {
  const rec = (player.earnedQuirks || []).find((e) => e && e.id === id);
  if (!rec || rec.seen) return false;
  rec.seen = true;
  return true;
}

function unseenEarns(player) {
  return (player.earnedQuirks || []).filter((e) => e && e.seen !== true && TRAINING_BY_ID[e.id]);
}

function displayQuirks(player) {
  const earned = (player.earnedQuirks || []).map((rec) => {
    const q = TRAINING_BY_ID[rec.id];
    if (!q) return null;
    return { ...q, kind: "earned", milestone: rec.milestone, earnedAt: rec.earnedAt };
  }).filter(Boolean).sort((a, b) => b.priority - a.priority);
  const coach = (player.coachQuirks || []).map((id) => {
    const q = SHOW_BY_ID[id];
    return q ? { ...q, kind: "coach", milestone: q.criteria } : null;
  }).filter(Boolean);
  return [...earned, ...coach];
}

const SAMPLE_CAREER = {
  "sample-mason-carter": [
    {
      "seasonLabel": "2025-26",
      "age": 16,
      "ageGroup": "16U",
      "archivedAt": "2026-09-01T12:00:00.000Z",
      "overall": 82,
      "tier": "gold",
      "subGrades": [
        {
          "key": "BAT",
          "label": "Bat Speed",
          "grade": 84
        },
        {
          "key": "PWR",
          "label": "Power",
          "grade": 82
        },
        {
          "key": "PLANE",
          "label": "Plane",
          "grade": 80
        },
        {
          "key": "QUICK",
          "label": "Quickness",
          "grade": 78
        },
        {
          "key": "CONN",
          "label": "Connection",
          "grade": 91
        }
      ],
      "metrics": {
        "batSpeed": 67,
        "peakHandSpeed": 21,
        "attackAngle": 12,
        "verticalBatAngle": -27,
        "timeToContact": 0.156,
        "powerKw": 3.7,
        "rotationalAcceleration": 15,
        "onPlaneEfficiency": 75,
        "earlyConnection": 91,
        "connectionAtImpact": 87
      },
      "metricGrades": {
        "batSpeed": {
          "value": 67,
          "grade": 84,
          "band": {
            "key": "great",
            "label": "Great"
          }
        },
        "peakHandSpeed": {
          "value": 21,
          "grade": 80,
          "band": {
            "key": "great",
            "label": "Great"
          }
        },
        "attackAngle": {
          "value": 12,
          "grade": 80,
          "band": {
            "key": "great",
            "label": "Great"
          }
        },
        "verticalBatAngle": {
          "value": -27,
          "grade": 93,
          "band": {
            "key": "elite",
            "label": "Elite"
          }
        },
        "timeToContact": {
          "value": 0.156,
          "grade": 76,
          "band": {
            "key": "good",
            "label": "Good"
          }
        },
        "powerKw": {
          "value": 3.7,
          "grade": 84,
          "band": {
            "key": "great",
            "label": "Great"
          }
        },
        "rotationalAcceleration": {
          "value": 15,
          "grade": 80,
          "band": {
            "key": "great",
            "label": "Great"
          }
        },
        "onPlaneEfficiency": {
          "value": 75,
          "grade": 74,
          "band": {
            "key": "good",
            "label": "Good"
          }
        },
        "earlyConnection": {
          "value": 91,
          "grade": 94,
          "band": {
            "key": "elite",
            "label": "Elite"
          }
        },
        "connectionAtImpact": {
          "value": 87,
          "grade": 88,
          "band": {
            "key": "great",
            "label": "Great"
          }
        }
      },
      "history": {
        "batSpeed": [
          63,
          65,
          67
        ],
        "peakHandSpeed": [
          20,
          20.5,
          21
        ],
        "attackAngle": [
          11,
          11.5,
          12
        ],
        "verticalBatAngle": [
          -26,
          -27,
          -27
        ],
        "timeToContact": [
          0.16,
          0.158,
          0.156
        ],
        "powerKw": [
          3.2,
          3.5,
          3.7
        ],
        "rotationalAcceleration": [
          13,
          14,
          15
        ],
        "onPlaneEfficiency": [
          73,
          74,
          75
        ],
        "earlyConnection": [
          90,
          91,
          91
        ],
        "connectionAtImpact": [
          86,
          87,
          87
        ]
      },
      "perksEarned": [
        {
          "id": "bat-speed-builder",
          "name": "Bat Speed Builder",
          "icon": "\u26a1",
          "milestone": "Earned: Bat Speed +4 mph this training block",
          "earnedAt": "2026-05-01"
        },
        {
          "id": "power-surge",
          "name": "Power Surge",
          "icon": "\ud83d\udca5",
          "milestone": "Earned: Power +0.5 kW this training block",
          "earnedAt": "2026-05-01"
        },
        {
          "id": "fast-twitch",
          "name": "Fast Twitch",
          "icon": "\ud83c\udf00",
          "milestone": "Earned: Rotational Acceleration +2 g",
          "earnedAt": "2026-05-01"
        },
        {
          "id": "gold-standard",
          "name": "Gold Standard",
          "icon": "\ud83e\udd47",
          "milestone": "Earned: overall 82 hit Gold",
          "earnedAt": "2026-05-01"
        },
        {
          "id": "great-barrel",
          "name": "Great Barrel",
          "icon": "\ud83c\udf1f",
          "milestone": "Earned: Bat Speed 67 mph is Great at 16U",
          "earnedAt": "2026-05-01"
        }
      ],
      "assignedPerks": [
        {
          "id": "dead-red",
          "name": "Dead Red",
          "icon": "\ud83d\udd34",
          "description": "Hunts velocity and squares up fastballs when he is on time."
        },
        {
          "id": "unfazed",
          "name": "Unfazed",
          "icon": "\ud83d\ude24",
          "description": "Shortens up with two strikes and still competes \u2014 the at-bat is not over."
        }
      ],
      "strengths": [
        "Drives the ball in the air to the pull side with real carry",
        "Strong, physical swing \u2014 top bat speed on the team",
        "Patient in hitter's counts; hunts pitches he can lift"
      ],
      "improvements": [
        "Stay on plane against breaking balls down and away",
        "Shorten the two-strike swing without giving up bat speed",
        "First-step quickness on outfield reads"
      ],
      "archetype": "Power Hitter",
      "photo": "",
      "name": "Mason Carter",
      "position": "OF",
      "secondaryPosition": "1B",
      "height": "6'1\"",
      "weight": "190 lbs",
      "hometown": "Tampa, FL",
      "bats": "L",
      "throws": "L",
      "type": "hitter",
      "team": "Antonelli 17U",
      "classYear": "Sophomore / 10th",
      "sample": true
    }
  ],
  "sample-dylan-brooks": [
    {
      "seasonLabel": "2024-25",
      "age": 12,
      "ageGroup": "12U",
      "archivedAt": "2025-09-01T12:00:00.000Z",
      "overall": 56,
      "tier": "bronze",
      "subGrades": [
        {
          "key": "BAT",
          "label": "Bat Speed",
          "grade": 74
        },
        {
          "key": "PWR",
          "label": "Power",
          "grade": 62
        },
        {
          "key": "PLANE",
          "label": "Plane",
          "grade": 68
        },
        {
          "key": "QUICK",
          "label": "Quickness",
          "grade": 54
        },
        {
          "key": "CONN",
          "label": "Connection",
          "grade": 69
        },
        {
          "key": "VEL",
          "label": "Velocity",
          "grade": 40
        },
        {
          "key": "BRK",
          "label": "Breaking / Offspeed",
          "grade": 44
        },
        {
          "key": "CNTL",
          "label": "Control / Command",
          "grade": 51
        },
        {
          "key": "STM",
          "label": "Stamina",
          "grade": 41
        }
      ],
      "metrics": {
        "batSpeed": 50,
        "peakHandSpeed": 16.5,
        "attackAngle": 5,
        "verticalBatAngle": -24,
        "timeToContact": 0.195,
        "powerKw": 1.7,
        "rotationalAcceleration": 8.2,
        "onPlaneEfficiency": 63,
        "earlyConnection": 77,
        "connectionAtImpact": 82,
        "fastballVelo": 75,
        "spinRate": 1920,
        "strikePct": 57,
        "whiffPct": 21,
        "pitchCapacity": 59
      },
      "metricGrades": {
        "batSpeed": {
          "value": 50,
          "grade": 74,
          "band": {
            "key": "good",
            "label": "Good"
          }
        },
        "peakHandSpeed": {
          "value": 16.5,
          "grade": 57,
          "band": {
            "key": "average",
            "label": "Average"
          }
        },
        "attackAngle": {
          "value": 5,
          "grade": 87,
          "band": {
            "key": "great",
            "label": "Great"
          }
        },
        "verticalBatAngle": {
          "value": -24,
          "grade": 94,
          "band": {
            "key": "elite",
            "label": "Elite"
          }
        },
        "timeToContact": {
          "value": 0.195,
          "grade": 67,
          "band": {
            "key": "good",
            "label": "Good"
          }
        },
        "powerKw": {
          "value": 1.7,
          "grade": 65,
          "band": {
            "key": "good",
            "label": "Good"
          }
        },
        "rotationalAcceleration": {
          "value": 8.2,
          "grade": 39,
          "band": {
            "key": "below",
            "label": "Below Average"
          }
        },
        "onPlaneEfficiency": {
          "value": 63,
          "grade": 46,
          "band": {
            "key": "below",
            "label": "Below Average"
          }
        },
        "earlyConnection": {
          "value": 77,
          "grade": 63,
          "band": {
            "key": "average",
            "label": "Average"
          }
        },
        "connectionAtImpact": {
          "value": 82,
          "grade": 75,
          "band": {
            "key": "good",
            "label": "Good"
          }
        },
        "fastballVelo": {
          "value": 75,
          "grade": 40,
          "band": {
            "key": "below",
            "label": "Below Average"
          }
        },
        "spinRate": {
          "value": 1920,
          "grade": 45,
          "band": {
            "key": "below",
            "label": "Below Average"
          }
        },
        "strikePct": {
          "value": 57,
          "grade": 51,
          "band": {
            "key": "average",
            "label": "Average"
          }
        },
        "whiffPct": {
          "value": 21,
          "grade": 44,
          "band": {
            "key": "below",
            "label": "Below Average"
          }
        },
        "pitchCapacity": {
          "value": 59,
          "grade": 41,
          "band": {
            "key": "below",
            "label": "Below Average"
          }
        }
      },
      "history": {
        "batSpeed": [
          48,
          49,
          50
        ],
        "peakHandSpeed": [
          16,
          16.5,
          16.5
        ],
        "attackAngle": [
          4,
          5,
          5
        ],
        "verticalBatAngle": [
          -22,
          -23,
          -24
        ],
        "timeToContact": [
          0.205,
          0.2,
          0.195
        ],
        "powerKw": [
          1.55,
          1.65,
          1.7
        ],
        "rotationalAcceleration": [
          7.5,
          8,
          8.2
        ],
        "onPlaneEfficiency": [
          60,
          61,
          63
        ],
        "earlyConnection": [
          74,
          75,
          77
        ],
        "connectionAtImpact": [
          80,
          81,
          82
        ],
        "fastballVelo": [
          73,
          74,
          75
        ],
        "spinRate": [
          1850,
          1880,
          1920
        ],
        "strikePct": [
          54,
          55,
          57
        ],
        "whiffPct": [
          18,
          19,
          21
        ],
        "pitchCapacity": [
          52,
          56,
          59
        ]
      },
      "perksEarned": [
        {
          "id": "both-sides",
          "name": "Both Sides",
          "icon": "\u2694\ufe0f",
          "milestone": "Earned: a real gain on both the hitting side and the pitching side",
          "earnedAt": "2025-05-01"
        }
      ],
      "assignedPerks": [
        {
          "id": "pop-time",
          "name": "Catcher Pop Time",
          "icon": "\ud83e\udde4",
          "description": "Gets the ball out of the glove quickly and throws a strike to second."
        },
        {
          "id": "unfazed",
          "name": "Unfazed",
          "icon": "\ud83d\ude24",
          "description": "Shortens up with two strikes and still competes \u2014 the at-bat is not over."
        }
      ],
      "strengths": [
        "Strong arm behind the plate and on the mound",
        "Competitive at-bats; battles with two strikes",
        "Athletic frame with room to add strength"
      ],
      "improvements": [
        "Receiving and blocking consistency behind the plate",
        "Bat speed \u2014 stay connected through the turn",
        "Pitching mechanics: stay closed longer to improve command"
      ],
      "archetype": "Two-Way Player",
      "photo": "",
      "name": "Dylan Brooks",
      "position": "C",
      "secondaryPosition": "RHP",
      "height": "5'10\"",
      "weight": "160 lbs",
      "hometown": "Sarasota, FL",
      "bats": "R",
      "throws": "R",
      "type": "two-way",
      "team": "Antonelli 14U",
      "classYear": "7th grade",
      "sample": true
    }
  ]
};

function seedSampleEarns() {
  SAMPLE_PLAYERS.forEach((p) => {
    p.coachQuirks = p.coachQuirks || [];
    p.earnedQuirks = [];
    syncEarnedQuirks(p, "2026-05-01");
    p.earnedQuirks.forEach((e) => { e.seen = true; });
    p.gradeSeen = gradeSnapshot(p);
    p.currentSeason = "2026-27";
    p.ageGroupPinned = false;
    p.cardCollection = SAMPLE_CAREER[p.id] ? structuredClone(SAMPLE_CAREER[p.id]) : [];
    delete p.seasonReveal;
  });
}
seedSampleEarns();

function metricKeysFor(type) {
  if (type === "pitcher") return PITCHER_KEYS;
  if (type === "two-way") return [...BLAST_KEYS, ...PITCHER_KEYS];
  return BLAST_KEYS;
}

function defaultBlastMetrics(ageGroup) {
  const group = AGE_GROUP_ORDER.includes(ageGroup) ? ageGroup : "16U";
  const out = {};
  BLAST_KEYS.forEach((k) => {
    const spec = BLAST_BENCHMARKS[k];
    const b = spec.bands[group];
    if (spec.mode === "ideal") out[k] = b.target;
    else if (spec.mode === "ope") out[k] = 70;
    else if (spec.mode === "ra") out[k] = 12.5;
    else if (spec.mode === "lower") out[k] = Math.round(((b.lo + b.hi) / 2) * 1000) / 1000;
    else out[k] = Math.round(((b.lo + b.hi) / 2) * 100) / 100;
  });
  return out;
}

function defaultPitcherMetrics() {
  return { fastballVelo: 78, spinRate: 2000, strikePct: 58, whiffPct: 22, pitchCapacity: 60 };
}

function defaultMetrics(type, ageGroup) {
  const blast = defaultBlastMetrics(ageGroup || "16U");
  const pitch = defaultPitcherMetrics();
  const out = {};
  metricKeysFor(type).forEach((k) => { out[k] = BLAST_KEYS.includes(k) ? blast[k] : pitch[k]; });
  return out;
}

function benchmarkCaption(key, ageGroup) {
  const m = METRICS[key];
  if (!m.blast) return `Benchmark ${m.low}–${m.high}${m.unit}`;
  const spec = BLAST_BENCHMARKS[key];
  const b = spec.bands[ageGroup] || spec.bands["16U"];
  const bits = [`Blast ${ageGroup}: ${formatMetric(key, b.lo)}–${formatMetric(key, b.hi)}${m.unit}`];
  if (b.sharedYouth) bits.push("Youth column for both 10U and 12U");
  if (spec.mode === "ideal") bits.push(`peak at ${formatMetric(key, b.target)} is Antonelli`);
  if (spec.mode === "ope") bits.push("78 and Elite-above-85 cuts are Antonelli");
  if (spec.mode === "ra") bits.push("12.5 and Elite near 20 are Antonelli");
  if (b.note) bits.push(b.note);
  return bits.join(" · ");
}

function formatMetric(key, value) {
  if (value == null || value === "" || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  if (key === "timeToContact") return n.toFixed(3);
  if (key === "powerKw") {
    const rounded = Math.round(n * 1000) / 1000;
    return String(rounded);
  }
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100) / 100);
}

function typeLabel(type) { return { hitter: "Hitter", pitcher: "Pitcher", "two-way": "Two-Way" }[type] || type; }
function positionLine(player) {
  const primary = (player && player.position) || "—";
  const secondary = player && String(player.secondaryPosition || "").trim();
  return secondary ? `${primary} / ${secondary}` : primary;
}
function nameParts(name) {
  const bits = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (bits.length < 2) return { first: "", last: (bits[0] || "Player").toUpperCase() };
  return { first: bits.slice(0, -1).join(" ").toUpperCase(), last: bits[bits.length - 1].toUpperCase() };
}
function showOrDash(value) {
  const text = String(value ?? "").trim();
  return text ? esc(text) : "—";
}
function teamCode(team) {
  const parts = String(team || "Antonelli").trim().split(/\s+/);
  const code = parts.map((w) => (/^\d/.test(w) ? w : w[0])).join("").toUpperCase();
  return code.slice(0, 4) || "AB";
}
function starSVG(cls) {
  return `<svg class="${cls || "card-star"}" viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,3 62,37 98,37 69,58 80,96 50,73 20,96 31,58 2,37 38,37" fill="#ffffff" stroke="#0a0a0a" stroke-width="5" stroke-linejoin="round"/><polygon points="50,3 62,37 98,37 69,58 80,96 50,73 20,96 31,58 2,37 38,37" transform="translate(50 50) scale(0.8) translate(-50 -50)" fill="none" stroke="#d4af37" stroke-width="3" stroke-linejoin="round"/></svg>`;
}
function logoPlaceholder() {
  return `<img class="card-logo" src="assets/antonelli-a-star.png" alt="Antonelli Baseball">`;
}
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function linesToArray(text) { return String(text || "").split(/\n|,/).map((s) => s.trim()).filter(Boolean); }

/* ---------- Storage ---------- */
function hittingLooksLegacy(p) {
  if (!p || p.type === "pitcher") return false;
  const m = p.metrics || {};
  return m.onPlaneEfficiency == null || m.powerKw == null || m.exitVelocity != null || m.contactPct != null;
}

function migratePlayer(p) {
  const copy = structuredClone(p);
  copy.ageGroup = AGE_GROUP_ORDER.includes(copy.ageGroup) ? copy.ageGroup : ageGroupFromAge(copy.age);
  if (copy.type === "pitcher") return copy;
  const old = copy.metrics || {};
  const oldHist = copy.history || {};
  // Old formula stored exit velocity / contact. Those cards are rebuilt.
  // A partial Blast card (no exit velocity) keeps any Blast keys it already has.
  const legacyFormula = old.exitVelocity != null || old.contactPct != null;
  const metrics = defaultBlastMetrics(copy.ageGroup);
  const history = {};
  BLAST_KEYS.forEach((k) => {
    const numeric = old[k] != null && !Number.isNaN(Number(old[k]));
    const keepBat = k === "batSpeed" && numeric && Number(old.batSpeed) >= 25 && Number(old.batSpeed) <= 95;
    const keepExisting = !legacyFormula && numeric;
    if (keepBat || keepExisting) metrics[k] = Number(old[k]);
    if (keepBat && Array.isArray(oldHist.batSpeed) && oldHist.batSpeed.length) {
      history.batSpeed = oldHist.batSpeed.map(Number).filter((n) => !Number.isNaN(n));
      if (history.batSpeed[history.batSpeed.length - 1] !== metrics.batSpeed) history.batSpeed.push(metrics.batSpeed);
    } else if (keepExisting && Array.isArray(oldHist[k]) && oldHist[k].length) {
      history[k] = oldHist[k].map(Number).filter((n) => !Number.isNaN(n));
    } else {
      history[k] = [metrics[k]];
    }
  });
  if (copy.type === "two-way") {
    const pitchDefaults = defaultPitcherMetrics();
    PITCHER_KEYS.forEach((k) => {
      metrics[k] = old[k] != null && !Number.isNaN(Number(old[k])) ? Number(old[k]) : pitchDefaults[k];
      history[k] = Array.isArray(oldHist[k]) && oldHist[k].length ? oldHist[k] : [metrics[k]];
    });
  }
  copy.metrics = metrics;
  copy.history = history;
  return copy;
}

function loadPlayers() {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (Array.isArray(parsed) && parsed.length) {
        if (parsed.some(hittingLooksLegacy)) return { players: parsed.map(migratePlayer), migrated: true };
        return { players: parsed, migrated: false };
      }
    }
    const rawV1 = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV1) {
      const parsed = JSON.parse(rawV1);
      if (Array.isArray(parsed) && parsed.length) return { players: parsed.map(migratePlayer), migrated: true };
    }
  } catch (e) { /* sample data */ }
  return { players: structuredClone(SAMPLE_PLAYERS), migrated: false };
}

const loadedState = loadPlayers();
let players = loadedState.players;
let migrationNotice = loadedState.migrated;
if (migrationNotice) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(players)); } catch (e) { /* banner still explains the in-memory reset */ }
}
let selectedId = null;

function savePlayers() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(players)); }
  catch (e) { alert("Could not save — browser storage is full. Try a smaller photo, or clear a photo and save again."); }
}

/* ---------- Sparkline ---------- */
function metricImproved(key, before, after, ageGroup) {
  const m = METRICS[key];
  if (!m) return after > before;
  if (m.blast) {
    const spec = BLAST_BENCHMARKS[key];
    if (spec.mode === "lower") return after < before;
    if (spec.mode === "ideal") {
      const target = (spec.bands[ageGroup] || spec.bands["16U"]).target;
      return Math.abs(after - target) < Math.abs(before - target);
    }
    return after > before;
  }
  return m.invert ? after < before : after > before;
}

function sparkline(values, key, ageGroup) {
  if (!values || values.length < 2) return '<span class="muted">—</span>';
  const w = 92, h = 28, pad = 3;
  const min = Math.min(...values), max = Math.max(...values), range = (max - min) || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const first = values[0], last = values[values.length - 1];
  const improved = metricImproved(key, first, last, ageGroup);
  const flat = first === last || !metricImproved(key, first, last, ageGroup) && !metricImproved(key, last, first, ageGroup);
  const color = flat ? "#667085" : (improved ? "#14804a" : "#c8102e");
  const end = pts.split(" ").pop().split(",");
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${end[0]}" cy="${end[1]}" r="3" fill="${color}"/></svg>`;
}

function deltaHTML(key, history, ageGroup) {
  if (!history || history.length < 2) return '<span class="delta-flat">—</span>';
  const cur = history[history.length - 1], prev = history[history.length - 2];
  const diff = Math.round((cur - prev) * 1000) / 1000;
  if (diff === 0) return '<span class="delta-flat">0</span>';
  const good = metricImproved(key, prev, cur, ageGroup);
  return `<span class="${good ? "delta-up" : "delta-down"}">${diff > 0 ? "▲ +" : "▼ "}${diff}</span>`;
}

function bandHTML(key, value, ageGroup) {
  if (!METRICS[key] || !METRICS[key].blast) return "—";
  const scored = gradeBlastMetric(key, value, ageGroup);
  if (!scored.band) return "—";
  return `<span class="band-chip band-${scored.band.key}">${esc(scored.band.label)}</span>`;
}

/* ---------- Card rendering ---------- */
function cardHTML(player, large, face) {
  const graded = gradesFor(player);
  const overall = face && face.overall != null ? face.overall : graded.overall;
  const tier = face && face.tier ? { key: face.tier, label: TIER_LABEL[face.tier] || tierFor(overall).label } : tierFor(overall);
  const subs = face && Array.isArray(face.subs) ? face.subs : graded.subs;
  const shownSubs = player.type === "two-way" && !large ? subs.slice(0, 5) : subs;
  const visual = player.photo
    ? `<img class="card-photo" src="${esc(player.photo)}" alt="Photo of ${esc(player.name)}">`
    : logoPlaceholder();
  const group = face && face.ageGroup ? face.ageGroup : activeAgeGroup(player);
  const ageShown = face && face.age != null ? face.age : player.age;
  const classShown = face && face.classYear != null ? face.classYear : player.classYear;
  const quirkList = face && Array.isArray(face.quirks) ? face.quirks : displayQuirks(player);
  const quirkShown = quirkList.slice(0, 3);
  const quirkExtra = quirkList.length - quirkShown.length;
  const quirkHTML = quirkShown.length ? `<div class="card-quirks">${quirkShown.map((q) => `<span class="q-badge ${q.kind === "coach" ? "q-coach" : "q-earned"}" title="${esc(q.name)}">${q.icon} ${esc(q.name)}</span>`).join("")}${quirkExtra > 0 ? `<span class="q-badge q-more">+${quirkExtra}</span>` : ""}</div>` : "";
  return `
  <div class="bb-card tier-${tier.key} ${large ? "large" : ""} ${player.photo ? "" : "logo-placeholder"}">
    <div class="card-visual">${visual}</div>
    <div class="card-holo" aria-hidden="true"></div>
    <div class="card-brand"><b>ANTONELLI</b><span>${tier.label}</span></div>
    ${quirkHTML}
    <div class="overall-diamond"><div><b>${overall}</b><span>OVR</span></div></div>
    <div class="card-bottom">
      <div class="card-meta-row">
        <div class="team-mark">${starSVG()}<span class="team-code">${esc(teamCode(player.team))}</span></div>
        <div class="card-name">
          <span class="archetype">${esc(player.archetype)}</span>
          <${large ? "h2" : "h3"}>${esc(player.name)}</${large ? "h2" : "h3"}>
          <span class="pos-bar">${esc(positionLine(player))} - ${esc(player.bats)}/${esc(player.throws)}</span>
          <span class="card-teamline">${esc(player.team)} • Age ${esc(ageShown)} • ${esc(group)} • ${esc(classShown)}</span>
        </div>
      </div>
      <div class="subgrades">${shownSubs.map((x) => `<div class="subgrade"><b>${x.grade ?? "—"}</b><span>${x.key}</span></div>`).join("")}</div>
    </div>
  </div>`;
}

/* ---------- Roster ---------- */
const $ = (id) => document.getElementById(id);

function renderHeroStats() {
  const overalls = players.map((p) => gradesFor(p).overall);
  const avg = overalls.length ? Math.round(overalls.reduce((a, b) => a + b, 0) / overalls.length) : 0;
  const top = players.length ? players.reduce((a, b) => (gradesFor(a).overall >= gradesFor(b).overall ? a : b)) : null;
  $("heroStats").innerHTML = `
    <div class="stat"><b>${players.length}</b><span>Players</span></div>
    <div class="stat"><b>${avg}</b><span>Avg Overall</span></div>
    <div class="stat"><b>${overalls.filter((o) => o >= 80).length}</b><span>Gold or Better</span></div>
    <div class="stat"><b>${top ? esc(top.name.split(" ")[0]) : "—"}</b><span>Top Card ${top ? "(" + gradesFor(top).overall + ")" : ""}</span></div>`;
}

function renderTeamFilter() {
  const teams = [...new Set(players.map((p) => p.team).filter(Boolean))].sort();
  const cur = $("teamFilter").value;
  $("teamFilter").innerHTML = '<option value="all">All teams</option>' + teams.map((t) => `<option ${t === cur ? "selected" : ""}>${esc(t)}</option>`).join("");
}

function renderRoster() {
  renderHeroStats(); renderTeamFilter();
  const q = $("searchInput").value.trim().toLowerCase();
  const tf = $("typeFilter").value, team = $("teamFilter").value, sort = $("sortSelect").value;
  let list = players.filter((p) => {
    if (tf !== "all" && p.type !== tf) return false;
    if (team !== "all" && p.team !== team) return false;
    if (q) {
      const hay = `${p.name} ${positionLine(p)} ${p.archetype} ${p.team} ${p.classYear} ${p.hometown || ""} ${typeLabel(p.type)} ${activeAgeGroup(p)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  list.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "age-desc") return b.age - a.age;
    if (sort === "age-asc") return a.age - b.age;
    if (sort === "overall-asc") return gradesFor(a).overall - gradesFor(b).overall;
    return gradesFor(b).overall - gradesFor(a).overall;
  });
  $("rosterCount").textContent = `(${list.length})`;
  $("emptyState").hidden = list.length > 0;
  $("rosterGrid").innerHTML = list.map((p) => {
    const { overall } = gradesFor(p);
    return `
    <article class="roster-card" tabindex="0" role="button" data-open="${esc(p.id)}" aria-label="Open profile for ${esc(p.name)}">
      ${cardHTML(p, false)}
      <div class="roster-info">
        <h3>${esc(p.name)}</h3>
        <div class="meta">${esc(positionLine(p))} • ${esc(p.team)} • Age ${esc(p.age)} • ${esc(activeAgeGroup(p))} • ${esc(p.classYear)}<br>Bats ${esc(p.bats)} / Throws ${esc(p.throws)} • Overall ${overall}</div>
        <div class="pills"><span class="pill red">${esc(p.archetype)}</span><span class="pill">${typeLabel(p.type)}</span><span class="pill">${tierFor(overall).label}</span></div>
        <p class="snippet"><strong>Does well:</strong> ${esc((p.strengths || [])[0] || "—")}</p>
        <p class="snippet"><strong>Work on:</strong> ${esc((p.improvements || [])[0] || "—")}</p>
      </div>
    </article>`;
  }).join("");
  document.querySelectorAll("[data-open]").forEach((el) => {
    el.addEventListener("click", () => openProfile(el.dataset.open));
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProfile(el.dataset.open); } });
  });
  watchCardMotion();
}

let cardMotionObserver = null;
function watchCardMotion() {
  if (cardMotionObserver) cardMotionObserver.disconnect();
  const cards = [...document.querySelectorAll(".bb-card")];
  if (!cards.length || typeof IntersectionObserver === "undefined") {
    cards.forEach((el) => el.classList.add("card-live"));
    return;
  }
  cardMotionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle("card-live", entry.isIntersecting));
  }, { rootMargin: "120px" });
  cards.forEach((el) => cardMotionObserver.observe(el));
}

/* ---------- Profile ---------- */
function metricsTable(player) {
  const keys = metricKeysFor(player.type);
  const ageGroup = activeAgeGroup(player);
  const rows = keys.map((k) => {
    const m = METRICS[k];
    const hist = (player.history && player.history[k]) || [player.metrics[k]];
    const prev = hist.length > 1 ? hist[hist.length - 2] : null;
    const grade = normalizeMetric(k, player.metrics[k], ageGroup);
    return `<tr>
      <td><strong>${m.label}</strong><br><span class="muted" style="font-size:12px">${esc(m.help)}</span></td>
      <td><strong>${formatMetric(k, player.metrics[k])}${esc(m.unit)}</strong></td>
      <td>${prev == null ? "—" : formatMetric(k, prev) + esc(m.unit)}</td>
      <td>${deltaHTML(k, hist, ageGroup)}</td>
      <td>${sparkline(hist, k, ageGroup)}</td>
      <td>${bandHTML(k, player.metrics[k], ageGroup)}</td>
      <td><span class="grade-chip">${grade ?? "—"}</span></td>
    </tr>`;
  }).join("");
  const note = player.type === "pitcher"
    ? "Pitcher grades are 20–99 against the coach benchmarks in METRICS. Those ranges are not published Blast numbers."
    : `Hitting bands use the published Blast window for <strong>${esc(ageGroup)}</strong> in BLAST_BENCHMARKS. Below Average / Average / Good / Great / Elite, and the 20–99 cuts, are Antonelli. Coaches edit the windows in that table and the curves in gradeBlastMetric.`;
  return `<div class="table-scroll"><table><thead><tr><th>Metric</th><th>Current</th><th>Previous</th><th>Change</th><th>History</th><th>Band</th><th>Grade</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="muted small">${note}</p>`;
}

function quirksPanel(player) {
  const earned = displayQuirks(player).filter((q) => q.kind === "earned");
  const coach = displayQuirks(player).filter((q) => q.kind === "coach");
  const row = (q) => `<button type="button" class="quirk-row" data-replay="${esc(q.id)}">
      <span class="q-badge ${q.kind === "coach" ? "q-coach" : "q-earned"}">${q.icon}</span>
      <span><strong>${esc(q.name)}</strong> <span class="quirk-tag">${q.kind === "coach" ? "Coach Awarded" : "Earned"}</span> <span class="quirk-tag">${esc(q.category)}</span><br>
      <span class="muted small">${esc(q.description)}</span><br>
      <span class="small">${esc(q.milestone || "")}</span></span>
    </button>`;
  const earnedHTML = earned.length ? earned.map(row).join("") : `<p class="muted small">No training perks yet. They appear automatically when a milestone is crossed, and they stay on the card.</p>`;
  const coachHTML = coach.length ? coach.map(row).join("") : `<p class="muted small">No coach-awarded perks. Add them in Edit.</p>`;
  return `<p class="muted small">Earned perks come from training milestones and stay once unlocked. Coach Awarded perks are pinned by a coach. Click an earned perk to open its pack again.</p>
    <div class="quirk-actions"><button class="btn btn-ghost" type="button" id="previewRevealBtn">Open again</button></div>
    <h4 class="quirk-sub">Earned</h4>${earnedHTML}
    <h4 class="quirk-sub">Coach Awarded</h4>${coachHTML}`;
}

let revealQueue = [];
let revealPos = 0;
let revealReplay = false;

function replayQuirk(playerId, quirkId) {
  const player = players.find((p) => p.id === playerId);
  const q = (player && displayQuirks(player).find((item) => item.id === quirkId)) || TRAINING_BY_ID[quirkId] || SHOW_BY_ID[quirkId];
  if (!player || !q) return;
  revealReplay = true;
  packOpened = false;
  clearPackTimers();
  revealQueue = [{ playerId, quirkId, name: player.name, quirk: q }];
  revealPos = 0;
  showRevealStep();
}

function previewReveal(playerId) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return;
  const earned = displayQuirks(player).filter((q) => q.kind === "earned");
  if (earned.length) { replayQuirk(playerId, earned[0].id); return; }
  revealReplay = true;
  packOpened = false;
  clearPackTimers();
  revealQueue = [{
    playerId, quirkId: "heat-check", name: player.name,
    quirk: { ...TRAINING_BY_ID["heat-check"], kind: "earned", milestone: "Preview: this is how a new training perk looks when the pack opens." },
  }];
  revealPos = 0;
  showRevealStep();
}

function startReveal(items) {
  revealReplay = false;
  packOpened = false;
  clearPackTimers();
  revealQueue = items.filter((item) => item && item.playerId && item.quirkId);
  revealPos = 0;
  if (!revealQueue.length) return;
  showRevealStep();
}

let packOpened = false;
let packTimers = [];

function motionReduced() {
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function clearPackTimers() {
  packTimers.forEach((id) => clearTimeout(id));
  packTimers = [];
}

function later(fn, ms) {
  const id = setTimeout(fn, ms);
  packTimers.push(id);
  return id;
}

function revealButtonLabel() {
  if (!packOpened) return "Open Pack";
  const more = revealPos < revealQueue.length - 1;
  if (revealReplay) return "Close";
  return more ? "Next Perk" : "Add to my card";
}

function fillRevealFace(quirk, player, item) {
  $("quirkRevealFace").innerHTML = `<span class="q-badge q-earned q-lg">${quirk.icon || "⭐"}</span>
    <p class="quirk-face-cat">${esc(quirk.category || "Training")}</p>
    <h3>${esc(quirk.name)}</h3>
    <p>${esc(quirk.description || "")}</p>
    <p class="quirk-face-mile">${esc(quirk.milestone || "")}</p>
    <p class="quirk-face-who">${esc((player && player.name) || item.name || "")}</p>`;
}

function showRevealStep() {
  const root = document.getElementById && document.getElementById("quirkReveal");
  if (!root) return;
  const item = revealQueue[revealPos];
  if (!item) { closeReveal(); return; }
  const player = players.find((p) => p.id === item.playerId);
  const quirk = item.quirk || (player && displayQuirks(player).find((q) => q.id === item.quirkId)) || TRAINING_BY_ID[item.quirkId];
  if (!quirk) { revealPos += 1; showRevealStep(); return; }
  const count = revealQueue.length;
  const stage = $("perkStage");
  const flip = $("quirkFlip");
  const btn = $("quirkCollectBtn");
  $("quirkRevealPlayer").textContent = (player && player.name) || item.name || "";
  const packCount = $("perkPackCount");
  if (packCount) packCount.textContent = count === 1 ? "1 PERK INSIDE" : `${count} PERKS INSIDE`;
  stage.classList.toggle("has-many", count > 1);
  root.hidden = false;
  btn.disabled = false;
  if (!packOpened) {
    clearPackTimers();
    stage.classList.remove("is-tearing", "is-open");
    fillRevealFace(quirk, player, item);
    flip.classList.remove("is-revealed");
    $("quirkRevealTitle").textContent = "Player Perks";
    $("quirkRevealCount").textContent = count > 1 ? `${count} perks in this pack` : "1 perk in this pack";
    btn.textContent = "Open Pack";
    btn.focus();
    return;
  }
  $("quirkRevealTitle").textContent = "Player Perk";
  $("quirkRevealCount").textContent = count > 1 ? `${revealPos + 1} of ${count}` : "";
  btn.textContent = revealButtonLabel();
  flip.classList.remove("is-revealed");
  fillRevealFace(quirk, player, item);
  const showFace = () => { flip.classList.add("is-revealed"); btn.focus(); };
  if (motionReduced()) showFace();
  else later(showFace, 60);
}

function openPack() {
  if (packOpened) return;
  const stage = $("perkStage");
  const flip = $("quirkFlip");
  const btn = $("quirkCollectBtn");
  if (!stage || !btn || btn.disabled) return;
  btn.disabled = true;
  const done = () => {
    packOpened = true;
    btn.disabled = false;
    btn.textContent = revealButtonLabel();
    $("quirkRevealTitle").textContent = "Player Perk";
    $("quirkRevealCount").textContent = revealQueue.length > 1 ? `${revealPos + 1} of ${revealQueue.length}` : "";
    btn.focus();
  };
  if (motionReduced()) {
    stage.classList.add("is-open");
    flip.classList.add("is-revealed");
    done();
    return;
  }
  stage.classList.add("is-tearing");
  later(() => stage.classList.add("is-open"), 680);
  later(() => flip.classList.add("is-revealed"), 1180);
  later(done, 1850);
}

function closeReveal() {
  clearPackTimers();
  packOpened = false;
  const root = document.getElementById && document.getElementById("quirkReveal");
  if (root) root.hidden = true;
  const flip = document.getElementById && document.getElementById("quirkFlip");
  if (flip) flip.classList.remove("is-revealed");
  const stage = document.getElementById && document.getElementById("perkStage");
  if (stage) stage.classList.remove("is-tearing", "is-open", "has-many");
  const btn = document.getElementById && document.getElementById("quirkCollectBtn");
  if (btn) { btn.disabled = false; btn.textContent = "Open Pack"; }
  revealQueue = [];
  revealPos = 0;
}

function onRevealButton() {
  if (!packOpened) { openPack(); return; }
  collectReveal();
}

function collectReveal() {
  const item = revealQueue[revealPos];
  if (item && !revealReplay) {
    const player = players.find((p) => p.id === item.playerId);
    if (player && markQuirkSeen(player, item.quirkId)) savePlayers();
  }
  if (revealPos < revealQueue.length - 1) {
    revealPos += 1;
    showRevealStep();
    return;
  }
  closeReveal();
  if (selectedId) openProfile(selectedId);
  else renderRoster();
}

function topGainText(player) {
  const age = activeAgeGroup(player);
  let best = null;
  metricKeysFor(player.type).forEach((key) => {
    const h = histOf(player, key);
    if (h.length < 2) return;
    const before = h[h.length - 2];
    const after = h[h.length - 1];
    if (before === after || !metricImproved(key, before, after, age)) return;
    const g0 = normalizeMetric(key, before, age);
    const g1 = normalizeMetric(key, after, age);
    const gain = g0 == null || g1 == null ? 0 : g1 - g0;
    if (!best || gain > best.gain) best = { key, before, after, gain };
  });
  if (!best) return "";
  const meta = METRICS[best.key];
  return `${meta.label} ${formatMetric(best.key, best.before)} → ${formatMetric(best.key, best.after)}${meta.unit || ""}`;
}

let celebrateQueue = [];
let celebratePos = 0;
let celebrateReplay = false;
let celebrateTimers = [];
let celebrateAfter = null;
let celebrateTicking = null;

function clearCelebTimers() {
  celebrateTimers.forEach((id) => clearTimeout(id));
  celebrateTimers = [];
  if (celebrateTicking) { clearInterval(celebrateTicking); celebrateTicking = null; }
}

function laterCeleb(fn, ms) {
  const id = setTimeout(fn, ms);
  celebrateTimers.push(id);
}

function paintCelebrateCard(player, overall, tier) {
  const slot = $("celebrateCard");
  if (!slot) return;
  slot.innerHTML = cardHTML(player, true, { overall, tier });
  const card = slot.querySelector(".bb-card");
  if (card) card.classList.add("card-live");
}

function burstBits(count) {
  const fx = $("celebrateFx");
  if (!fx) return;
  fx.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const el = document.createElement("i");
    el.className = i % 5 === 0 ? "cele-bit cele-ray" : "cele-bit";
    el.style.setProperty("--rot", (Math.random() * 360).toFixed(0) + "deg");
    el.style.setProperty("--dist", (80 + Math.random() * 150).toFixed(0) + "px");
    el.style.animationDelay = (Math.random() * 0.1).toFixed(2) + "s";
    fx.appendChild(el);
  }
}

function landCelebration(player, item) {
  clearCelebTimers();
  const root = $("celebrate");
  if (!root) return;
  root.classList.add("is-done");
  root.classList.remove("is-shake", "is-shake-hard");
  paintCelebrateCard(player, item.toOverall, item.toTier);
  const delta = item.toOverall - item.fromOverall;
  $("celebrateScore").textContent = `${item.fromOverall} → ${item.toOverall}${delta > 0 ? "  +" + delta : ""}`;
  $("celebrateTierName").textContent = item.kind === "tier-up" ? (TIER_LABEL[item.toTier] || "") : "";
  $("celebrateTitle").textContent = item.kind === "tier-up" ? "Tier up" : "Overall up";
  $("celebrateCollect").hidden = false;
  $("celebrateSkip").hidden = true;
  $("celebrateCollect").focus();
}

function tickOverall(item, done) {
  let n = item.fromOverall;
  const end = item.toOverall;
  const write = () => {
    const badge = document.querySelector("#celebrateCard .overall-diamond b");
    if (badge) badge.textContent = String(n);
    $("celebrateScore").textContent = n >= end ? `${item.fromOverall} → ${end}  +${end - item.fromOverall}` : `${item.fromOverall} → ${n}`;
  };
  write();
  if (n >= end) { done(); return; }
  const stepMs = Math.min(160, Math.max(50, Math.round(800 / Math.max(1, end - n))));
  celebrateTicking = setInterval(() => {
    n += 1;
    write();
    if (n >= end) {
      clearInterval(celebrateTicking);
      celebrateTicking = null;
      done();
    }
  }, stepMs);
}

function runOverallUp(player, item) {
  $("celebrate").classList.add("is-energized");
  laterCeleb(() => tickOverall(item, () => {
    burstBits(18);
    landCelebration(player, item);
  }), 650);
}

function runTierUp(player, item) {
  const root = $("celebrate");
  laterCeleb(() => root.classList.add("is-shake"), 700);
  laterCeleb(() => root.classList.add("is-shake-hard"), 1500);
  laterCeleb(() => {
    root.classList.add("is-boom");
    burstBits(40);
    paintCelebrateCard(player, item.toOverall, item.toTier);
    $("celebrateTierName").textContent = TIER_LABEL[item.toTier] || "";
    $("celebrateScore").textContent = `${item.fromOverall} → ${item.toOverall}  +${item.delta}`;
  }, 2300);
  laterCeleb(() => landCelebration(player, item), 3100);
}

function showCelebration() {
  const item = celebrateQueue[celebratePos];
  if (!item) { endCelebrationQueue(); return; }
  const player = players.find((p) => p.id === item.playerId);
  if (!player) { celebratePos += 1; showCelebration(); return; }
  clearCelebTimers();
  const root = $("celebrate");
  root.hidden = false;
  root.className = "celebrate " + (item.kind === "tier-up" ? "is-tier" : "is-overall");
  if (motionReduced()) root.classList.add("is-reduced");
  $("celebratePlayer").textContent = player.name;
  $("celebrateReason").textContent = item.reason || "";
  $("celebrateTitle").textContent = item.kind === "tier-up" ? "New tier" : "Overall up";
  $("celebrateTierName").textContent = "";
  $("celebrateScore").textContent = item.kind === "overall-up" ? String(item.fromOverall) : "";
  $("celebrateSkip").hidden = false;
  $("celebrateCollect").hidden = true;
  $("celebrateCollect").textContent = celebrateReplay ? "Close" : "Collect";
  const fx = $("celebrateFx");
  if (fx) fx.innerHTML = "";
  paintCelebrateCard(player, item.fromOverall, item.fromTier);
  if (motionReduced()) { landCelebration(player, item); return; }
  if (item.kind === "tier-up") runTierUp(player, item);
  else runOverallUp(player, item);
}

function closeCelebration() {
  clearCelebTimers();
  const root = document.getElementById && document.getElementById("celebrate");
  if (root) {
    root.hidden = true;
    root.className = "celebrate";
  }
  celebrateQueue = [];
  celebratePos = 0;
  celebrateReplay = false;
}

function endCelebrationQueue() {
  const after = celebrateAfter;
  celebrateAfter = null;
  closeCelebration();
  if (selectedId) openProfile(selectedId);
  else renderRoster();
  if (after) after();
}

function beginCelebrations(items, after) {
  celebrateAfter = after || null;
  celebrateReplay = false;
  celebrateQueue = (items || []).slice();
  celebratePos = 0;
  if (!celebrateQueue.length) {
    const fn = celebrateAfter;
    celebrateAfter = null;
    if (fn) fn();
    return;
  }
  showCelebration();
}

function ackCelebration(item) {
  const player = players.find((p) => p.id === item.playerId);
  if (!player) return;
  player.gradeSeen = { overall: item.toOverall, tier: item.toTier };
  savePlayers();
}

function collectCelebration() {
  const item = celebrateQueue[celebratePos];
  if (item && !celebrateReplay) ackCelebration(item);
  if (celebrateReplay) { closeCelebration(); return; }
  celebratePos += 1;
  if (celebratePos < celebrateQueue.length) { showCelebration(); return; }
  endCelebrationQueue();
}

function skipCelebration() {
  const item = celebrateQueue[celebratePos];
  const player = item && players.find((p) => p.id === item.playerId);
  if (!item || !player) { collectCelebration(); return; }
  if ($("celebrate").classList.contains("is-done")) { collectCelebration(); return; }
  landCelebration(player, item);
}

function previewOverallUp(playerId) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return;
  const snap = gradeSnapshot(player);
  const fromOverall = Math.max(20, snap.overall - 3);
  celebrateReplay = true;
  celebrateAfter = null;
  celebrateQueue = [{
    kind: "overall-up",
    playerId,
    fromOverall,
    toOverall: snap.overall,
    fromTier: snap.tier,
    toTier: snap.tier,
    delta: snap.overall - fromOverall,
    reason: "Preview: the card celebrates when the overall climbs.",
  }];
  celebratePos = 0;
  showCelebration();
}

function previewTierUp(playerId) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return;
  const snap = gradeSnapshot(player);
  const order = ["bronze", "silver", "gold", "diamond"];
  const idx = order.indexOf(snap.tier);
  let fromTier = snap.tier;
  let toTier = order[Math.min(order.length - 1, idx + 1)];
  let fromOverall = snap.overall;
  let toOverall = snap.overall;
  if (idx >= order.length - 1) {
    fromTier = "gold";
    toTier = "diamond";
    fromOverall = Math.min(89, snap.overall - 1);
    toOverall = snap.overall;
  } else {
    toOverall = toTier === "silver" ? Math.max(snap.overall, 70) : toTier === "gold" ? Math.max(snap.overall, 80) : Math.max(snap.overall, 90);
    if (toOverall <= fromOverall) toOverall = fromOverall + 1;
  }
  celebrateReplay = true;
  celebrateAfter = null;
  celebrateQueue = [{
    kind: "tier-up",
    playerId,
    fromOverall,
    toOverall,
    fromTier,
    toTier,
    delta: toOverall - fromOverall,
    reason: "Preview: crossing 70, 80, or 90 rebuilds the card.",
  }];
  celebratePos = 0;
  showCelebration();
}

const HITTER_BAR_KEYS = [
  ["BAT SPD", "batSpeed"], ["HAND", "peakHandSpeed"], ["POWER", "powerKw"], ["PLANE", "onPlaneEfficiency"],
  ["ATK", "attackAngle"], ["VBA", "verticalBatAngle"], ["TTC", "timeToContact"], ["ROT", "rotationalAcceleration"],
  ["EARLY", "earlyConnection"], ["IMPACT", "connectionAtImpact"],
];
const PITCH_BAR_KEYS = [
  ["FB VEL", "fastballVelo"], ["SPIN", "spinRate"], ["STR%", "strikePct"], ["WHIFF", "whiffPct"], ["CAP", "pitchCapacity"],
];

function gradeTone(grade) {
  if (grade == null || Number.isNaN(grade)) return "tone-empty";
  if (grade >= 90) return "tone-elite";
  if (grade >= 80) return "tone-great";
  if (grade >= 65) return "tone-good";
  if (grade >= 50) return "tone-avg";
  return "tone-low";
}

function attrBar(label, grade, title) {
  const band = bandForGrade(grade);
  const h = grade == null ? 0 : Math.max(8, Math.round((Number(grade) / 99) * 100));
  const tip = `${title}${band ? " · " + band.label : ""}`;
  return `<div class="attr-col" title="${esc(tip)}" role="img" aria-label="${esc(tip)} ${grade ?? ""}">
    <div class="attr-num">${grade == null ? "—" : grade}</div>
    <div class="attr-track" aria-hidden="true"><i class="attr-fill ${gradeTone(grade)}" style="--h:${h}%"></i></div>
    <div class="attr-key">${esc(label)}</div>
  </div>`;
}

function toolBars(subs) {
  return (subs || []).map((s) => attrBar(s.key, s.grade, s.label)).join("");
}

function metricBars(player, pairs) {
  const age = activeAgeGroup(player);
  return pairs.map(([label, key]) => attrBar(label, normalizeMetric(key, player.metrics && player.metrics[key], age), METRICS[key].label)).join("");
}

function attributePanel(player) {
  const g = gradesFor(player);
  const groups = [];
  if (player.type !== "pitcher") {
    groups.push({ title: player.type === "two-way" ? "Hitting tools" : "Tools", bars: toolBars(g.hitterSubs || g.subs) });
    groups.push({ title: "Blast grades", bars: metricBars(player, HITTER_BAR_KEYS) });
  }
  if (player.type !== "hitter") {
    groups.push({ title: player.type === "two-way" ? "Pitching tools" : "Tools", bars: toolBars(g.pitcherSubs || g.subs) });
    groups.push({ title: "Pitch grades", bars: metricBars(player, PITCH_BAR_KEYS) });
  }
  return groups.map((group) => `<section class="attr-group"><h3>${esc(group.title)}</h3><div class="attr-strip">${group.bars}</div></section>`).join("")
    + `<p class="muted small">Bar height is the 20–99 grade. Red is Below Average, bronze is Average, gold is Good, green is Great, cyan is Elite. Hover a bar for the band name.</p>`;
}

function assessmentDelta(player) {
  const now = gradesFor(player).overall;
  const prevMetrics = { ...(player.metrics || {}) };
  let changed = false;
  metricKeysFor(player.type).forEach((key) => {
    const hist = player.history && player.history[key];
    if (!hist || hist.length < 2) return;
    prevMetrics[key] = hist[hist.length - 2];
    if (hist[hist.length - 2] !== hist[hist.length - 1]) changed = true;
  });
  if (!changed) return { now, prev: null, delta: null };
  const prev = gradesFor({ ...player, metrics: prevMetrics }).overall;
  return { now, prev, delta: now - prev };
}

function deltaChip(delta) {
  if (delta == null) return "";
  const up = delta > 0;
  const sign = delta > 0 ? "+" : "";
  const arrow = up ? "↑ " : delta < 0 ? "↓ " : "";
  return `<em class="delta-chip ${up ? "up" : delta < 0 ? "down" : "flat"}" title="Overall change since the previous saved assessment">${arrow}${sign}${delta}</em>`;
}

function blastSnapshot(player) {
  const age = activeAgeGroup(player);
  const rows = BLAST_KEYS.map((key) => {
    const meta = METRICS[key];
    return `<div class="snap-row"><span>${esc(meta.label)}</span><b>${formatMetric(key, player.metrics[key])}${esc(meta.unit)}</b>${bandHTML(key, player.metrics[key], age)}</div>`;
  }).join("");
  return `<aside class="side-panel"><h3>Blast snapshot</h3><p class="small muted">${esc(age)} raw numbers</p>${rows}</aside>`;
}

function pitchPanel(player) {
  const age = activeAgeGroup(player);
  const rows = PITCHER_KEYS.map((key) => {
    const grade = normalizeMetric(key, player.metrics[key], age);
    const width = grade == null ? 0 : Math.round((grade / 99) * 100);
    const meta = METRICS[key];
    return `<div class="meter-row"><span>${esc(meta.label)}</span><div class="meter" title="${esc(meta.label)} grade ${grade ?? "—"}"><i class="${gradeTone(grade)}" style="--w:${width}%"></i></div><b>${formatMetric(key, player.metrics[key])}${esc(meta.unit)}</b></div>`;
  }).join("");
  return `<aside class="side-panel"><h3>Pitch metrics</h3>${rows}</aside>`;
}

function sidePanels(player) {
  if (player.type === "pitcher") return pitchPanel(player);
  if (player.type === "two-way") return blastSnapshot(player) + pitchPanel(player);
  return blastSnapshot(player);
}

function growAttrBars() {
  const strips = [...document.querySelectorAll(".attr-strip")];
  strips.forEach((strip) => strip.classList.remove("is-in"));
  requestAnimationFrame(() => requestAnimationFrame(() => strips.forEach((strip) => strip.classList.add("is-in"))));
}

function playerFromArchive(card) {
  return {
    name: card.name, age: card.age, ageGroup: card.ageGroup, team: card.team, archetype: card.archetype,
    photo: card.photo || "", position: card.position, secondaryPosition: card.secondaryPosition || "",
    bats: card.bats, throws: card.throws, type: card.type, classYear: card.classYear || "",
    metrics: card.metrics || {}, earnedQuirks: [], coachQuirks: [],
  };
}

function faceFromArchive(card) {
  const quirks = (card.perksEarned || []).map((q) => ({ ...q, kind: "earned" }))
    .concat((card.assignedPerks || []).map((q) => ({ ...q, kind: "coach" })));
  return {
    overall: card.overall, tier: card.tier, subs: card.subGrades || [],
    ageGroup: card.ageGroup, age: card.age, classYear: card.classYear || "", quirks,
  };
}

function archiveBars(card) {
  const stored = card.metricGrades || {};
  const hitKeys = ["BAT", "PWR", "PLANE", "QUICK", "CONN"];
  const pitchKeys = ["VEL", "BRK", "CNTL", "STM"];
  const subs = card.subGrades || [];
  const groups = [];
  const fromSubs = (keys) => subs.filter((s) => keys.includes(s.key)).map((s) => attrBar(s.key, s.grade, s.label)).join("");
  const fromMetrics = (pairs) => pairs.map(([label, key]) => {
    const row = stored[key];
    const title = (METRICS[key] && METRICS[key].label) || label;
    return attrBar(label, row ? row.grade : null, title + (row && row.band ? " · " + row.band.label : ""));
  }).join("");
  if (card.type !== "pitcher") {
    groups.push({ title: card.type === "two-way" ? "Hitting tools" : "Tools", bars: fromSubs(hitKeys) });
    groups.push({ title: "Blast grades", bars: fromMetrics(HITTER_BAR_KEYS) });
  }
  if (card.type !== "hitter") {
    groups.push({ title: card.type === "two-way" ? "Pitching tools" : "Tools", bars: fromSubs(pitchKeys) });
    groups.push({ title: "Pitch grades", bars: fromMetrics(PITCH_BAR_KEYS) });
  }
  return groups.map((group) => `<section class="attr-group"><h3>${esc(group.title)}</h3><div class="attr-strip">${group.bars}</div></section>`).join("")
    + `<p class="muted small">These numbers were saved at retirement. Editing the live card, or the benchmark tables, does not change them.</p>`;
}

function archiveMetricsTable(card) {
  const rows = metricKeysFor(card.type).map((key) => {
    const meta = METRICS[key];
    const row = (card.metricGrades || {})[key] || {};
    const band = row.band ? `<span class="band-chip band-${esc(row.band.key)}">${esc(row.band.label)}</span>` : "—";
    return `<tr><td><strong>${esc(meta.label)}</strong></td><td>${formatMetric(key, row.value)}${esc(meta.unit)}</td><td>${band}</td><td><span class="grade-chip">${row.grade ?? "—"}</span></td></tr>`;
  }).join("");
  return `<div class="table-scroll"><table><thead><tr><th>Metric</th><th>Value at retirement</th><th>Band</th><th>Grade</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="muted small">Grades and bands are the copy stored on ${esc(card.seasonLabel)}. They are not calculated again.</p>`;
}

function archivePerks(card) {
  const row = (q, kind) => `<div class="quirk-row quirk-static"><span class="q-badge ${kind === "Coach Awarded" ? "q-coach" : "q-earned"}">${q.icon || ""}</span><span><strong>${esc(q.name)}</strong> <span class="quirk-tag">${kind}</span><br><span class="small">${esc(q.milestone || q.description || "")}</span></span></div>`;
  const earned = (card.perksEarned || []).map((q) => row(q, "Earned")).join("") || `<p class="muted small">No training perks were earned that season.</p>`;
  const coach = (card.assignedPerks || []).map((q) => row(q, "Coach Awarded")).join("") || `<p class="muted small">No coach-awarded perks on this snapshot.</p>`;
  return `<p class="muted small">Snapshot of that season. Training perks start over on the new card. Coach-awarded perks stay on the current card too.</p><h4 class="quirk-sub">Earned that season</h4>${earned}<h4 class="quirk-sub">Coach Awarded</h4>${coach}`;
}

function archiveSide(card) {
  const rows = metricKeysFor(card.type).map((key) => {
    const meta = METRICS[key];
    const row = (card.metricGrades || {})[key] || {};
    const band = row.band ? `<span class="band-chip band-${esc(row.band.key)}">${esc(row.band.label)}</span>` : "";
    return `<div class="snap-row"><span>${esc(meta.label)}</span><b>${formatMetric(key, row.value)}${esc(meta.unit)}</b>${band}</div>`;
  }).join("");
  const title = card.type === "pitcher" ? "Pitch snapshot" : "Frozen metrics";
  return `<aside class="side-panel"><h3>${title}</h3><p class="small muted">${esc(card.seasonLabel)} · ${esc(card.ageGroup)}</p>${rows}</aside>`;
}

function collectionPanel(player) {
  const summary = careerSummary(player);
  const cards = player.cardCollection || [];
  const retired = cards.map((card, i) => `<button type="button" class="collection-item" data-archive="${i}" aria-label="Open retired card ${esc(card.seasonLabel)} ${esc(card.ageGroup)} overall ${card.overall}">
      <div class="collection-ribbon"><span>${esc(card.seasonLabel)} · ${esc(card.ageGroup)}</span><span class="ribbon-retired">RETIRED${card.sample ? " · SAMPLE" : ""}</span></div>
      <div class="collection-thumb">${cardHTML(playerFromArchive(card), false, faceFromArchive(card))}</div>
    </button>`).join("");
  const current = `<div class="collection-item is-current">
      <div class="collection-ribbon"><span>${esc(player.currentSeason || "")} · ${esc(activeAgeGroup(player))}</span><span class="ribbon-current">CURRENT</span></div>
      <div class="collection-thumb">${cardHTML(player, false)}</div>
    </div>`;
  const empty = cards.length ? "" : `<p class="muted">No retired cards yet. On September 1 the current card is archived. Start New Season runs that rollover now so you can see it before then.</p>`;
  return `<div class="career-summary">
      <div class="career-stat"><b>${summary.seasons}</b><span>Seasons with Antonelli</span></div>
      <div class="career-stat"><b>${summary.best}</b><span>Best overall</span></div>
      <div class="career-stat"><b>${summary.goldPlus}</b><span>Gold+ seasons</span></div>
    </div>
    ${empty}
    <div class="collection-grid">${retired}${current}</div>
    <p class="muted small">Oldest season first. The roster shows only the current card. A retired card keeps its overall, tier, metrics, bands, perks, and notes.</p>`;
}

function openProfile(id, opts) {
  const p = players.find((x) => x.id === id);
  if (!p) return;
  selectedId = id;
  const { subs, overall } = gradesFor(p);
  const tier = tierFor(overall);
  const group = activeAgeGroup(p);
  const names = nameParts(p.name);
  const delta = assessmentDelta(p);
  const pos = String(p.position || "—").split(/[/,]/)[0].trim().slice(0, 4).toUpperCase() || "—";
  const built = p.type === "pitcher"
    ? "Pitcher overall uses velocity 30%, breaking stuff 25%, command 30%, and stamina 15%."
    : p.type === "two-way"
      ? `Hitting half is graded at <strong>${esc(group)}</strong> on Blast windows. Bat speed is 40% of that half. Overall is the average of the hitter grade and the pitcher grade.`
      : `Graded at <strong>${esc(group)}</strong> on Blast Motion windows. Bat speed is 40% of the hitter overall — the largest weight.`;
  const fact = (label, value) => `<div class="show-fact"><b>${value}</b><span>${label}</span></div>`;
  $("rosterView").hidden = true;
  $("profileView").hidden = false;
  $("profileContent").innerHTML = `
    <div class="show-top">
      <div class="show-card">${cardHTML(p, true)}</div>
      <div class="show-identity">
        <h2 class="show-name">${names.first ? `<span class="first">${esc(names.first)}</span>` : ""}<span class="last">${esc(names.last)}</span></h2>
        <div class="show-posrow">
          <div class="pos-diamond" title="${esc(p.position || "")}"><span>${esc(pos)}</span></div>
          <div>
            <div class="show-team">${esc(p.team || "—")}</div>
            <div class="show-arch">${esc(p.archetype || "—")} · ${esc(typeLabel(p.type))} · ${esc(group)} · ${esc(p.currentSeason || "")}</div>
          </div>
        </div>
        <div class="show-facts">
          <div class="show-fact show-fact-overall"><b>${overall}</b>${deltaChip(delta.delta)}<span>Overall${delta.delta == null ? "" : " · since last assessment"}</span></div>
          ${fact("Tier", esc(tier.label))}
          ${fact("Bats", esc(p.bats || "—"))}
          ${fact("Throws", esc(p.throws || "—"))}
          ${fact("Secondary position", showOrDash(p.secondaryPosition))}
          ${fact("Height", showOrDash(p.height))}
          ${fact("Weight", showOrDash(p.weight))}
          ${fact("Age / group", `${esc(p.age)} · ${esc(group)}`)}
          ${fact("Season", esc(p.currentSeason || "—"))}
          ${fact("Team", esc(p.team || "—"))}
          ${fact("Class / year", showOrDash(p.classYear))}
          ${fact("Hometown", showOrDash(p.hometown))}
        </div>
        <div class="profile-actions">
          <button class="btn btn-red" type="button" id="editProfileBtn">Edit Metrics / Profile</button>
          <button class="btn btn-ghost" type="button" id="previewOverallBtn">Preview overall-up</button>
          <button class="btn btn-ghost" type="button" id="previewTierBtn">Preview tier-up</button>
          <button class="btn btn-ghost" type="button" id="showdownProfileBtn">Challenge in SHOWDOWN</button>
          <button class="btn btn-ghost" type="button" id="rolloverBtn">Start New Season (Sept 1 Rollover)</button>
          <button class="btn btn-ghost" type="button" id="deleteProfileBtn">Delete Player</button>
        </div>
      </div>
      <div class="show-side">${sidePanels(p)}</div>
    </div>
    <div class="show-tabs" role="tablist">
      <button class="show-tab is-on" type="button" role="tab" aria-selected="true" data-tab="attributes">Attributes</button>
      <button class="show-tab" type="button" role="tab" aria-selected="false" data-tab="metrics">Metrics &amp; History</button>
      <button class="show-tab" type="button" role="tab" aria-selected="false" data-tab="perks">Player Perks</button>
      <button class="show-tab" type="button" role="tab" aria-selected="false" data-tab="growth">Strengths &amp; Growth</button>
      <button class="show-tab" type="button" role="tab" aria-selected="false" data-tab="collection">Collection</button>
    </div>
    <div class="show-panel" data-panel="attributes">${attributePanel(p)}</div>
    <div class="show-panel" data-panel="metrics" hidden>
      <div class="panel"><h3>Metrics &amp; progress</h3>${metricsTable(p)}</div>
    </div>
    <div class="show-panel" data-panel="perks" hidden>
      <div class="panel"><h3>Player Perks</h3>${quirksPanel(p)}</div>
    </div>
    <div class="show-panel" data-panel="growth" hidden>
      <div class="panel">
        <h3>What type of ${p.type === "pitcher" ? "pitcher" : "player"} is he?</h3>
        <p style="line-height:1.65">${esc(ARCHETYPE_INFO[p.archetype] || "A developing player whose archetype will sharpen as metrics and game performance grow.")}</p>
        <p class="small" style="line-height:1.6">Overall <strong>${overall} (${tier.label})</strong>. ${built}</p>
        <div class="pills">${subs.map((s) => `<span class="pill">${s.key} ${s.grade ?? "—"} — ${esc(s.label)}</span>`).join("")}</div>
      </div>
      <div class="two-col">
        <div class="panel"><h3>What he does well</h3><ul class="list good">${(p.strengths || []).map((s) => `<li>${esc(s)}</li>`).join("") || "<li>—</li>"}</ul></div>
        <div class="panel"><h3>What to improve</h3><ul class="list work">${(p.improvements || []).map((s) => `<li>${esc(s)}</li>`).join("") || "<li>—</li>"}</ul></div>
      </div>
    </div>
    <div class="show-panel" data-panel="collection" hidden>
      <div class="panel"><h3>Card collection</h3>${collectionPanel(p)}</div>
    </div>`;
  document.querySelectorAll(".show-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".show-tab").forEach((tab) => {
        const on = tab === btn;
        tab.classList.toggle("is-on", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll(".show-panel").forEach((panel) => {
        panel.hidden = panel.dataset.panel !== btn.dataset.tab;
      });
      if (btn.dataset.tab === "attributes") growAttrBars();
    });
  });
  $("editProfileBtn").addEventListener("click", () => openModal(p));
  document.querySelectorAll("[data-replay]").forEach((btn) => {
    btn.addEventListener("click", () => replayQuirk(p.id, btn.dataset.replay));
  });
  const previewBtn = $("previewRevealBtn");
  if (previewBtn) previewBtn.addEventListener("click", () => previewReveal(p.id));
  $("previewOverallBtn").addEventListener("click", () => previewOverallUp(p.id));
  $("previewTierBtn").addEventListener("click", () => previewTierUp(p.id));
  $("rolloverBtn").addEventListener("click", () => askRollover(p.id));
  const showdownProfileBtn = $("showdownProfileBtn");
  if (showdownProfileBtn) showdownProfileBtn.addEventListener("click", () => openShowdownPicker(p.id));
  document.querySelectorAll("[data-archive]").forEach((btn) => {
    btn.addEventListener("click", () => openRetired(p.id, Number(btn.dataset.archive)));
  });
  $("deleteProfileBtn").addEventListener("click", () => {
    if (confirm(`Delete ${p.name}? This cannot be undone (Reset Sample Data only restores the 5 sample players).`)) {
      players = players.filter((x) => x.id !== p.id);
      savePlayers(); closeProfile(); renderRoster();
    }
  });
  growAttrBars();
  if (opts && opts.tab) {
    const tabBtn = document.querySelector(`.show-tab[data-tab="${opts.tab}"]`);
    if (tabBtn) tabBtn.click();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openRetired(id, index) {
  const p = players.find((x) => x.id === id);
  const card = p && p.cardCollection && p.cardCollection[index];
  if (!p || !card) return;
  selectedId = id;
  const names = nameParts(card.name || p.name);
  const tierLabel = TIER_LABEL[card.tier] || "";
  const fact = (label, value) => `<div class="show-fact"><b>${value}</b><span>${label}</span></div>`;
  const pos = String(card.position || "—").split(/[/,]/)[0].trim().slice(0, 4).toUpperCase() || "—";
  const like = playerFromArchive(card);
  const face = faceFromArchive(card);
  const sampleNote = card.sample ? " Sample career card from the fictional roster." : "";
  $("rosterView").hidden = true;
  $("profileView").hidden = false;
  $("profileContent").innerHTML = `
    <div class="retired-banner">
      <div><strong>Retired — ${esc(card.seasonLabel)} ${esc(card.ageGroup)} — Final overall ${card.overall} ${esc(tierLabel)}</strong><span>${esc(sampleNote)} Read-only. Later benchmark edits do not change this card.</span></div>
      <button class="btn btn-ghost" type="button" id="backCurrentBtn">Back to current card</button>
    </div>
    <div class="show-top">
      <div class="show-card">${cardHTML(like, true, face)}</div>
      <div class="show-identity">
        <h2 class="show-name">${names.first ? `<span class="first">${esc(names.first)}</span>` : ""}<span class="last">${esc(names.last)}</span></h2>
        <div class="show-posrow">
          <div class="pos-diamond" title="${esc(card.position || "")}"><span>${esc(pos)}</span></div>
          <div>
            <div class="show-team">${esc(card.team || "—")}</div>
            <div class="show-arch">${esc(card.archetype || "—")} · ${esc(typeLabel(card.type))} · ${esc(card.ageGroup)} · ${esc(card.seasonLabel)}</div>
          </div>
        </div>
        <div class="show-facts">
          ${fact("Final overall", String(card.overall))}
          ${fact("Tier", esc(tierLabel))}
          ${fact("Bats", esc(card.bats || "—"))}
          ${fact("Throws", esc(card.throws || "—"))}
          ${fact("Secondary position", showOrDash(card.secondaryPosition))}
          ${fact("Height", showOrDash(card.height))}
          ${fact("Weight", showOrDash(card.weight))}
          ${fact("Age / group", `${esc(card.age)} · ${esc(card.ageGroup)}`)}
          ${fact("Season", esc(card.seasonLabel || "—"))}
          ${fact("Team", esc(card.team || "—"))}
          ${fact("Class / year", showOrDash(card.classYear))}
          ${fact("Hometown", showOrDash(card.hometown))}
        </div>
      </div>
      <div class="show-side">${archiveSide(card)}</div>
    </div>
    <div class="show-tabs" role="tablist">
      <button class="show-tab is-on" type="button" role="tab" aria-selected="true" data-tab="attributes">Attributes</button>
      <button class="show-tab" type="button" role="tab" aria-selected="false" data-tab="metrics">Metrics &amp; History</button>
      <button class="show-tab" type="button" role="tab" aria-selected="false" data-tab="perks">Player Perks</button>
      <button class="show-tab" type="button" role="tab" aria-selected="false" data-tab="growth">Strengths &amp; Growth</button>
    </div>
    <div class="show-panel" data-panel="attributes">${archiveBars(card)}</div>
    <div class="show-panel" data-panel="metrics" hidden><div class="panel"><h3>Metrics at retirement</h3>${archiveMetricsTable(card)}</div></div>
    <div class="show-panel" data-panel="perks" hidden><div class="panel"><h3>Player Perks that season</h3>${archivePerks(card)}</div></div>
    <div class="show-panel" data-panel="growth" hidden>
      <div class="panel">
        <h3>${esc(card.archetype || "Player")}</h3>
        <p style="line-height:1.65">${esc(ARCHETYPE_INFO[card.archetype] || "Snapshot of how this player was described when the card was retired.")}</p>
      </div>
      <div class="two-col">
        <div class="panel"><h3>What he did well</h3><ul class="list good">${(card.strengths || []).map((s) => `<li>${esc(s)}</li>`).join("") || "<li>—</li>"}</ul></div>
        <div class="panel"><h3>What to improve</h3><ul class="list work">${(card.improvements || []).map((s) => `<li>${esc(s)}</li>`).join("") || "<li>—</li>"}</ul></div>
      </div>
    </div>`;
  document.querySelectorAll(".show-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".show-tab").forEach((tab) => {
        const on = tab === btn;
        tab.classList.toggle("is-on", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll(".show-panel").forEach((panel) => {
        panel.hidden = panel.dataset.panel !== btn.dataset.tab;
      });
      if (btn.dataset.tab === "attributes") growAttrBars();
    });
  });
  $("backCurrentBtn").addEventListener("click", () => openProfile(id, { tab: "collection" }));
  growAttrBars();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

let pendingRolloverId = null;
let seasonQueue = [];
let seasonPos = 0;
let seasonAfter = null;

function askRollover(playerId) {
  const player = players.find((p) => p.id === playerId);
  if (!player || !$("seasonConfirm")) return;
  if (player.seasonReveal) {
    beginSeasonReveals([player.id]);
    return;
  }
  pendingRolloverId = playerId;
  const preview = projectRollover(player, 1);
  const pinNote = preview.pinned ? ` Age group stays ${preview.toGroup} because it is pinned.` : "";
  const dropNote = preview.toOverall < preview.fromOverall ? " A lower overall is the new age-group window, not a step back. No downgrade animation plays." : "";
  const upNote = TIER_RANK[preview.toTier] > TIER_RANK[preview.fromTier] ? ` The new card reaches ${TIER_LABEL[preview.toTier]}. The reveal spotlights that tier.` : "";
  $("seasonConfirmCopy").innerHTML = `<p>Retire <strong>${esc(preview.fromSeason)} · ${esc(preview.fromGroup)} · ${preview.fromOverall} ${esc(TIER_LABEL[preview.fromTier])}</strong>.</p>
    <p>New card <strong>${esc(preview.toSeason)} · ${esc(preview.toGroup)} · projected ${preview.toOverall} ${esc(TIER_LABEL[preview.toTier])}</strong>. Age ${preview.fromAge} → ${preview.toAge}.${esc(pinNote)}</p>
    <p>Metrics carry over and get graded for the new season. Training perks from this season are saved on the retired card, then cleared so they can be earned again. Coach-awarded perks stay on the player. The retired card is never re-graded.</p>
    <p>${esc(dropNote)}${esc(upNote)}</p>`;
  $("seasonConfirm").hidden = false;
}

function closeSeasonConfirm() {
  pendingRolloverId = null;
  const box = $("seasonConfirm");
  if (box) box.hidden = true;
}

function confirmRollover() {
  const player = players.find((p) => p.id === pendingRolloverId);
  closeSeasonConfirm();
  if (!player) return;
  applyRollover(player, 1);
  const added = syncEarnedQuirks(player);
  savePlayers();
  openProfile(player.id, { tab: "collection" });
  beginSeasonReveals([player.id], () => {
    if (added.length) startReveal(added.map((rec) => ({ playerId: player.id, quirkId: rec.id })));
  });
}

function beginSeasonReveals(ids, after) {
  seasonQueue = (ids || []).slice();
  seasonPos = 0;
  seasonAfter = after || null;
  if (!seasonQueue.length) {
    const fn = seasonAfter;
    seasonAfter = null;
    if (fn) fn();
    return;
  }
  showSeasonReveal();
}

function showSeasonReveal() {
  const id = seasonQueue[seasonPos];
  const player = players.find((p) => p.id === id);
  const box = $("seasonReveal");
  if (!player || !player.seasonReveal || !box) {
    finishSeasonQueue();
    return;
  }
  const info = player.seasonReveal;
  const retired = (player.cardCollection || []).slice().reverse().find((c) => c.seasonLabel === info.retiredSeason) || (player.cardCollection || []).slice(-1)[0];
  const tierUp = TIER_RANK[info.tier] > TIER_RANK[info.retiredTier];
  const dropped = info.overall < info.retiredOverall;
  box.classList.toggle("is-tier", tierUp);
  box.classList.toggle("is-reduced", motionReduced());
  $("seasonRevealPlayer").textContent = player.name;
  $("seasonRevealTier").textContent = tierUp ? (TIER_LABEL[info.tier] || "") : "New Season, New Chase";
  $("seasonRevealScore").textContent = `${info.retiredOverall} ${TIER_LABEL[info.retiredTier]} → ${info.overall} ${TIER_LABEL[info.tier]}`;
  $("seasonRevealReason").textContent = dropped
    ? `${info.seasonLabel} · ${info.ageGroup}. The new windows are harder. Same player, new chase.`
    : `${info.seasonLabel} · ${info.ageGroup}. Metrics carried over. Chase Diamond in this age group.`;
  $("seasonRevealCards").innerHTML = `
    <div class="season-col"><p class="celebrate-kicker">Retired ${esc(info.retiredSeason)} · ${esc(info.retiredGroup)}</p>${retired ? cardHTML(playerFromArchive(retired), true, faceFromArchive(retired)) : ""}</div>
    <div class="season-col"><p class="celebrate-kicker">New card ${esc(info.seasonLabel)} · ${esc(info.ageGroup)}</p>${cardHTML(player, true, { overall: info.overall, tier: info.tier, age: info.age, ageGroup: info.ageGroup })}</div>`;
  box.hidden = false;
}

function finishSeasonQueue() {
  const fn = seasonAfter;
  seasonAfter = null;
  seasonQueue = [];
  seasonPos = 0;
  const box = $("seasonReveal");
  if (box) box.hidden = true;
  if (fn) fn();
}

function collectSeasonReveal() {
  const id = seasonQueue[seasonPos];
  const player = id && players.find((p) => p.id === id);
  if (player) {
    ackSeasonReveal(player);
    savePlayers();
  }
  seasonPos += 1;
  if (seasonPos < seasonQueue.length) {
    showSeasonReveal();
    return;
  }
  if (selectedId && player) openProfile(selectedId, { tab: "collection" });
  finishSeasonQueue();
}

function closeProfile() {
  selectedId = null;
  $("profileView").hidden = true;
  $("rosterView").hidden = false;
}

/* ---------- Add / Edit modal ---------- */
let editingDefaults = null;
let pendingPhotoData = "";

function updatePhotoPreview() {
  const el = $("photoPreview");
  if (!el) return;
  if (pendingPhotoData) {
    el.innerHTML = `<img src="${esc(pendingPhotoData)}" alt="Selected player photo preview">`;
  } else {
    el.innerHTML = `<img class="preview-logo" src="assets/antonelli-a-star.png" alt="Antonelli Baseball"><span>No photo — logo</span>`;
  }
}

function handlePhotoFile(file) {
  if (!file) return;
  if (!/^image\//.test(file.type)) { alert("Please choose an image file."); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 800, scale = Math.min(1, max / Math.max(img.width, img.height));
      if (scale < 1) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        pendingPhotoData = canvas.toDataURL("image/jpeg", 0.85);
      } else { pendingPhotoData = String(reader.result); }
      updatePhotoPreview();
    };
    img.onerror = () => { pendingPhotoData = String(reader.result); updatePhotoPreview(); };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

function fillArchetypes(type, selected) {
  const opts = ARCHETYPES[type] || ARCHETYPES.hitter;
  $("f-archetype").innerHTML = opts.map((a) => `<option ${a === selected ? "selected" : ""}>${esc(a)}</option>`).join("");
}

function sliderBounds(key) {
  const m = METRICS[key];
  if (m.blast) return { min: m.entryMin, max: m.entryMax };
  const sliderMin = m.invert ? m.low - 0.4 : Math.floor(m.low - (m.high - m.low) * 0.15);
  const sliderMax = m.invert ? m.high + 0.4 : Math.ceil(m.high + (m.high - m.low) * 0.08);
  return { min: sliderMin, max: sliderMax };
}

function renderMetricFields(playerLike) {
  const keys = metricKeysFor(playerLike.type);
  const ageGroup = activeAgeGroup(playerLike);
  const defaults = defaultMetrics(playerLike.type, ageGroup);
  $("metricFields").innerHTML = keys.map((k) => {
    const m = METRICS[k];
    const val = playerLike.metrics[k] ?? defaults[k];
    const bounds = sliderBounds(k);
    const scored = m.blast ? gradeBlastMetric(k, val, ageGroup) : null;
    const grade = normalizeMetric(k, val, ageGroup);
    const band = scored && scored.band
      ? `<span class="band-chip band-${scored.band.key}" id="band-${k}">${esc(scored.band.label)}</span>`
      : "";
    return `<div class="metric-row">
      <label for="m-${k}">${m.label} <small>${esc(m.help)} • ${esc(benchmarkCaption(k, ageGroup))}</small></label>
      <div class="metric-inputs">
        <input type="range" id="range-${k}" data-metric="${k}" min="${bounds.min}" max="${bounds.max}" step="${m.step}" value="${val}">
        <input type="number" id="m-${k}" data-metric="${k}" step="${m.step}" value="${val}">
        <span class="muted small">${esc(m.unit.trim())}</span>
        <span class="grade-chip" id="grade-${k}">${grade ?? "—"}</span>
        ${band}
      </div>
    </div>`;
  }).join("");
  document.querySelectorAll("[data-metric]").forEach((input) => {
    input.addEventListener("input", () => {
      const k = input.dataset.metric;
      const range = $(`range-${k}`), num = $(`m-${k}`);
      if (input.type === "range") num.value = input.value; else range.value = input.value;
      const group = $("f-ageGroup").value;
      const grade = normalizeMetric(k, num.value, group);
      $(`grade-${k}`).textContent = grade ?? "—";
      const bandEl = $(`band-${k}`);
      if (bandEl && METRICS[k].blast) {
        const band = bandForGrade(grade);
        bandEl.textContent = band ? band.label : "—";
        bandEl.className = band ? `band-chip band-${band.key}` : "band-chip";
      }
      updateLivePreview();
    });
  });
}

function checkedCoachQuirks() {
  return [...document.querySelectorAll("#quirkFields input[data-quirk]:checked")].map((el) => el.value);
}

function renderQuirkFields(selected) {
  const box = $("quirkFields");
  if (!box) return;
  const picked = new Set(selected || []);
  const cats = [...new Set(SHOW_QUIRKS.map((q) => q.category))];
  box.innerHTML = cats.map((cat) => `<fieldset class="quirk-set"><legend>${esc(cat)}</legend>${
    SHOW_QUIRKS.filter((q) => q.category === cat).map((q) => `<label class="quirk-check"><input type="checkbox" data-quirk value="${esc(q.id)}" ${picked.has(q.id) ? "checked" : ""}> <span>${q.icon} ${esc(q.name)}</span><small>${esc(q.criteria)}</small></label>`).join("")
  }</fieldset>`).join("");
}

function provisionalPlayer() {
  const like = formPlayerLike();
  const existing = players.find((p) => p.id === like.id) || editingDefaults;
  const history = existing && existing.history ? structuredClone(existing.history) : {};
  Object.entries(like.metrics).forEach(([k, v]) => {
    if (v == null || Number.isNaN(v)) return;
    const base = history[k] ? history[k].slice() : (existing && existing.metrics && existing.metrics[k] != null ? [existing.metrics[k]] : [v]);
    if (base[base.length - 1] !== v) base.push(v);
    history[k] = base.slice(-6);
  });
  like.history = history;
  like.earnedQuirks = existing && existing.earnedQuirks ? structuredClone(existing.earnedQuirks) : [];
  like.coachQuirks = checkedCoachQuirks();
  return like;
}

function renderEarnPreview() {
  const el = $("quirkEarnPreview");
  if (!el || !$("f-type")) return;
  const like = provisionalPlayer();
  const have = new Set((like.earnedQuirks || []).map((e) => e.id));
  const fresh = TRAINING_QUIRKS.filter((q) => !have.has(q.id) && q.test(like));
  const kept = (like.earnedQuirks || []).map((e) => TRAINING_BY_ID[e.id]).filter(Boolean);
  const freshTxt = fresh.length ? fresh.map((q) => q.name).join(", ") : "none yet";
  const keptTxt = kept.length ? kept.map((q) => q.name).join(", ") : "none";
  el.innerHTML = `<strong>Training perks</strong> unlock on their own and stay after they are earned. Already earned: ${esc(keptTxt)}. New if you save now: ${esc(freshTxt)}.`;
}

function formPlayerLike() {
  const type = $("f-type").value;
  const metrics = {};
  metricKeysFor(type).forEach((k) => { const el = $(`m-${k}`); if (el) metrics[k] = parseFloat(el.value); });
  return {
    id: $("f-id").value || "temp", name: $("f-name").value || "New Player",
    age: parseInt($("f-age").value, 10) || 16,
    ageGroup: $("f-ageGroup").value || ageGroupFromAge($("f-age").value),
    classYear: $("f-class").value, team: $("f-team").value || "Antonelli Baseball", position: $("f-position").value || "—",
    secondaryPosition: $("f-secondary").value.trim(), height: $("f-height").value.trim(), weight: $("f-weight").value.trim(), hometown: $("f-hometown").value.trim(),
    bats: $("f-bats").value, throws: $("f-throws").value, type, archetype: $("f-archetype").value,
    strengths: linesToArray($("f-strengths").value), improvements: linesToArray($("f-improvements").value),
    photo: pendingPhotoData || "",
    metrics, history: {},
    ageGroupPinned: ($("f-ageGroup").value || "") !== ageGroupFromAge(parseInt($("f-age").value, 10) || 16),
  };
}

function updateLivePreview() {
  const like = formPlayerLike();
  const { subs, overall } = gradesFor(like);
  const tier = tierFor(overall);
  const groupNote = like.type === "pitcher" ? "" : ` · ${esc(activeAgeGroup(like))}`;
  $("livePreview").innerHTML = `<div>Live Overall${groupNote}<br><b>${overall}</b> <span class="tier-badge">${tier.label}</span></div><div class="pills" style="margin:0">${subs.map((s) => `<span class="pill">${s.key} ${s.grade ?? "—"}</span>`).join("")}</div>`;
  renderEarnPreview();
}

function openModal(player) {
  const isEdit = !!player;
  $("modalTitle").textContent = isEdit ? `Edit — ${player.name}` : "Add Player";
  $("f-id").value = isEdit ? player.id : "";
  $("f-name").value = isEdit ? player.name : "";
  $("f-age").value = isEdit ? player.age : 16;
  $("f-age").dataset.prevAge = String(isEdit ? player.age : 16);
  $("f-ageGroup").value = isEdit ? activeAgeGroup(player) : ageGroupFromAge(16);
  $("f-class").value = isEdit ? player.classYear : "";
  $("f-team").value = isEdit ? player.team : "Antonelli 16U";
  $("f-position").value = isEdit ? player.position : "";
  $("f-secondary").value = isEdit ? (player.secondaryPosition || "") : "";
  $("f-height").value = isEdit ? (player.height || "") : "";
  $("f-weight").value = isEdit ? (player.weight || "") : "";
  $("f-hometown").value = isEdit ? (player.hometown || "") : "";
  $("f-bats").value = isEdit ? player.bats : "R";
  $("f-throws").value = isEdit ? player.throws : "R";
  $("f-type").value = isEdit ? player.type : "hitter";
  fillArchetypes($("f-type").value, isEdit ? player.archetype : undefined);
  $("f-strengths").value = isEdit ? (player.strengths || []).join("\n") : "";
  $("f-improvements").value = isEdit ? (player.improvements || []).join("\n") : "";
  editingDefaults = isEdit ? structuredClone(player) : null;
  pendingPhotoData = isEdit ? (player.photo || "") : "";
  const photoInput = $("f-photo"); if (photoInput) photoInput.value = "";
  updatePhotoPreview();
  const seed = isEdit ? player : { type: "hitter", age: 16, ageGroup: "16U", metrics: defaultMetrics("hitter", "16U") };
  renderQuirkFields(isEdit ? (player.coachQuirks || []) : []);
  renderMetricFields(seed);
  updateLivePreview();
  $("playerModal").hidden = false;
}

function closeModal() { $("playerModal").hidden = true; }

const SHOWDOWN_TOOLS = [
  ["BAT", "Bat Speed"], ["PWR", "Power"], ["PLANE", "Plane"], ["QUICK", "Quickness"], ["CONN", "Connection"],
  ["VEL", "Velocity"], ["BRK", "Breaking / Offspeed"], ["CNTL", "Control"], ["STM", "Stamina"],
];

function sdCompare(aGrade, bGrade) {
  if (aGrade == null || bGrade == null || Number.isNaN(Number(aGrade)) || Number.isNaN(Number(bGrade))) {
    return { winner: null, delta: null, aSign: null, bSign: null, shared: false };
  }
  const diff = Number(aGrade) - Number(bGrade);
  if (diff === 0) return { winner: "tie", delta: 0, aSign: 0, bSign: 0, shared: true };
  return { winner: diff > 0 ? "a" : "b", delta: Math.abs(diff), aSign: diff, bSign: -diff, shared: true };
}

function sdRow(fields) {
  const cmp = sdCompare(fields.aGrade, fields.bGrade);
  const counted = fields.exhibit ? false : cmp.shared;
  return { ...fields, ...cmp, counted };
}

function sdRawGap(key, trailer, leader) {
  const meta = METRICS[key];
  if (!meta) return "";
  const mode = (BLAST_BENCHMARKS[key] && BLAST_BENCHMARKS[key].mode) || "higher";
  if (mode === "ideal" || mode === "ope") return "";
  const have = (player) => player.metrics && player.metrics[key] != null && !Number.isNaN(Number(player.metrics[key]));
  if (!have(trailer) || !have(leader)) return "";
  const need = mode === "lower" ? Number(trailer.metrics[key]) - Number(leader.metrics[key]) : Number(leader.metrics[key]) - Number(trailer.metrics[key]);
  if (!(need > 0)) return "";
  const shown = formatMetric(key, need);
  return mode === "lower" ? ` · ${shown}${meta.unit} quicker` : ` · +${shown}${meta.unit}`;
}

function sdChase(rows, trailerSide, trailer, leader) {
  const first = String(leader.name || "them").split(" ")[0];
  return rows
    .filter((row) => row.counted && row.winner && row.winner !== "tie" && row.winner !== trailerSide)
    .sort((x, y) => x.delta - y.delta || x.label.localeCompare(y.label))
    .slice(0, 3)
    .map((row) => {
      const raw = row.metricKey ? sdRawGap(row.metricKey, trailer, leader) : "";
      return { id: row.id, delta: row.delta, label: row.label, text: `+${row.delta} ${row.label} to catch ${first}${raw}` };
    });
}

function sdTally(a, b, aWins, bWins, compared) {
  const an = String(a.name || "A").split(" ")[0];
  const bn = String(b.name || "B").split(" ")[0];
  if (!compared) return "No shared categories to tally.";
  if (aWins === bWins) return aWins === 0 ? `Dead even across ${compared} categories.` : `Split showdown, ${aWins} categories each.`;
  return aWins > bWins ? `${an} takes ${aWins} of ${compared} categories.` : `${bn} takes ${bWins} of ${compared} categories.`;
}

function buildShowdown(a, b) {
  if (!a || !b || !a.id || !b.id || a.id === b.id) return { ok: false, reason: "same" };
  const ga = gradesFor(a);
  const gb = gradesFor(b);
  const ta = tierFor(ga.overall);
  const tb = tierFor(gb.overall);
  const aSubs = Object.fromEntries(ga.subs.map((s) => [s.key, s.grade]));
  const bSubs = Object.fromEntries(gb.subs.map((s) => [s.key, s.grade]));
  const rows = [
    sdRow({ id: "overall", label: "Overall", section: "card", aGrade: ga.overall, bGrade: gb.overall, aText: String(ga.overall), bText: String(gb.overall) }),
    sdRow({ id: "tier", label: "Tier", section: "card", aGrade: TIER_RANK[ta.key], bGrade: TIER_RANK[tb.key], aText: ta.label, bText: tb.label }),
  ];
  SHOWDOWN_TOOLS.forEach(([key, label]) => {
    const aHas = Object.prototype.hasOwnProperty.call(aSubs, key);
    const bHas = Object.prototype.hasOwnProperty.call(bSubs, key);
    if (!aHas && !bHas) return;
    rows.push(sdRow({
      id: key, label, section: "tools", metricKey: null,
      aGrade: aHas ? aSubs[key] : null, bGrade: bHas ? bSubs[key] : null,
      aText: aHas && aSubs[key] != null ? String(aSubs[key]) : "—",
      bText: bHas && bSubs[key] != null ? String(bSubs[key]) : "—",
    }));
  });
  [...BLAST_KEYS, ...PITCHER_KEYS].forEach((key) => {
    const meta = METRICS[key];
    const aOn = metricKeysFor(a.type).includes(key);
    const bOn = metricKeysFor(b.type).includes(key);
    if (!aOn && !bOn) return;
    const aGrade = aOn ? normalizeMetric(key, a.metrics && a.metrics[key], activeAgeGroup(a)) : null;
    const bGrade = bOn ? normalizeMetric(key, b.metrics && b.metrics[key], activeAgeGroup(b)) : null;
    const raw = (player, on) => !on || !player.metrics ? "" : `${formatMetric(key, player.metrics[key])}${meta.unit} · ${activeAgeGroup(player)}`;
    rows.push(sdRow({
      id: key, label: meta.label, section: BLAST_KEYS.includes(key) ? "hit" : "pitch", metricKey: key,
      aGrade, bGrade,
      aText: aGrade == null ? "—" : String(aGrade),
      bText: bGrade == null ? "—" : String(bGrade),
      aRaw: raw(a, aOn), bRaw: raw(b, bOn),
    }));
  });
  const aPerks = (a.earnedQuirks || []).filter((rec) => TRAINING_BY_ID[rec.id]);
  const bPerks = (b.earnedQuirks || []).filter((rec) => TRAINING_BY_ID[rec.id]);
  rows.push(sdRow({
    id: "perks", label: "Perks earned", section: "exhibit", exhibit: true,
    aGrade: aPerks.length, bGrade: bPerks.length,
    aText: String(aPerks.length), bText: String(bPerks.length),
    aNames: aPerks.map((rec) => TRAINING_BY_ID[rec.id].name),
    bNames: bPerks.map((rec) => TRAINING_BY_ID[rec.id].name),
  }));
  const scored = rows.filter((row) => row.counted);
  const aWins = scored.filter((row) => row.winner === "a").length;
  const bWins = scored.filter((row) => row.winner === "b").length;
  const ties = scored.filter((row) => row.winner === "tie").length;
  const overall = rows.find((row) => row.id === "overall");
  const overallWinner = overall && overall.winner !== "tie" ? overall.winner : "tie";
  const an = String(a.name || "A").split(" ")[0];
  const bn = String(b.name || "B").split(" ")[0];
  const note = "Grades are vs each player's own age group. Raw numbers are the actual readings, side by side."
    + (a.type !== b.type ? " Only categories on both cards are scored. A dash is not on that card, and it is not a loss." : "");
  return {
    ok: true,
    aId: a.id, bId: b.id, aName: a.name, bName: b.name,
    aGroup: activeAgeGroup(a), bGroup: activeAgeGroup(b),
    rows, aWins, bWins, ties, compared: scored.length,
    tally: sdTally(a, b, aWins, bWins, scored.length),
    overallWinner,
    headline: overallWinner === "tie" ? "Dead Even SHOWDOWN" : `${overallWinner === "a" ? an : bn} leads the SHOWDOWN`,
    note,
    chaseA: sdChase(rows, "a", a, b),
    chaseB: sdChase(rows, "b", b, a),
  };
}

let showdownTimers = [];
function clearShowdownTimers() {
  showdownTimers.forEach((id) => clearTimeout(id));
  showdownTimers = [];
}

function sdOptions(selectedId) {
  return players.slice().sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
    const overall = gradesFor(p).overall;
    return `<option value="${esc(p.id)}" ${p.id === selectedId ? "selected" : ""}>${esc(p.name)} · ${esc(activeAgeGroup(p))} · ${overall}</option>`;
  }).join("");
}

function sdRefreshWarn() {
  const a = $("sd-a");
  const b = $("sd-b");
  const start = $("sd-start");
  const warn = $("sd-warn");
  if (!a || !b || !start || !warn) return;
  const same = a.value && a.value === b.value;
  warn.hidden = !same;
  start.disabled = !a.value || !b.value || same;
}

function openShowdownPicker(preselectId) {
  const box = $("showdown");
  if (!box) return;
  clearShowdownTimers();
  box.hidden = false;
  box.scrollTop = 0;
  const previousB = $("sd-b") ? $("sd-b").value : "";
  box.classList.remove("is-go", "is-clash", "is-results", "is-reduced");
  $("showdownPick").hidden = false;
  $("showdownFace").hidden = true;
  $("showdownResults").hidden = true;
  const ids = players.map((p) => p.id);
  const aId = preselectId && ids.includes(preselectId) ? preselectId : (players[0] && players[0].id);
  const fallback = players.find((p) => p.id !== aId);
  const bId = previousB && previousB !== aId && ids.includes(previousB) ? previousB : (fallback && fallback.id);
  $("sd-a").innerHTML = sdOptions(aId);
  $("sd-b").innerHTML = sdOptions(bId || aId);
  sdRefreshWarn();
}

function closeShowdown() {
  clearShowdownTimers();
  const box = $("showdown");
  if (box) {
    box.hidden = true;
    box.classList.remove("is-go", "is-clash", "is-results", "is-reduced");
  }
}

function sdChip(row, side) {
  if (!row.shared) return "";
  if (row.winner === "tie") return `<em class="sd-chip even">EVEN</em>`;
  const sign = side === "a" ? row.aSign : row.bSign;
  const text = `${sign > 0 ? "+" : ""}${sign}`;
  return `<em class="sd-chip ${sign > 0 ? "up" : "down"}">${text}</em>`;
}

function sdCenter(row) {
  if (!row.shared) return "—";
  if (row.winner === "tie") return "EVEN";
  return `${row.winner === "a" ? "A" : "B"} +${row.delta}`;
}

function renderShowdownResults() {
  const a = players.find((p) => p.id === $("sd-a").value);
  const b = players.find((p) => p.id === $("sd-b").value);
  const result = buildShowdown(a, b);
  const host = $("showdownResults");
  if (!host) return;
  if (!result.ok) {
    host.innerHTML = `<p>Pick two different current-season cards.</p>`;
    host.hidden = false;
    return;
  }
  const sections = [["card", "The card"], ["tools", "Tools"], ["hit", "Hitting metrics"], ["pitch", "Pitch metrics"], ["exhibit", "Exhibition"]];
  const body = sections.map(([key, title]) => {
    const list = result.rows.filter((row) => row.section === key);
    if (!list.length) return "";
    const rows = list.map((row) => `<div class="sd-row ${row.exhibit ? "is-exhibit" : ""} ${row.winner === "a" ? "lead-a" : row.winner === "b" ? "lead-b" : ""}">
        <div class="sd-side a ${row.winner === "a" ? "is-lead" : ""}"><b>${esc(row.aText)}</b>${row.aRaw ? `<small>${esc(row.aRaw)}</small>` : ""}${sdChip(row, "a")}</div>
        <div class="sd-mid"><span>${esc(row.label)}</span><strong>${esc(sdCenter(row))}</strong></div>
        <div class="sd-side b ${row.winner === "b" ? "is-lead" : ""}">${sdChip(row, "b")}${row.bRaw ? `<small>${esc(row.bRaw)}</small>` : ""}<b>${esc(row.bText)}</b></div>
      </div>`).join("");
    const extra = key === "exhibit" ? `<p class="sd-note">Training perks earned this season. The count is not part of the tally.</p>
      <div class="sd-perk-lists"><div><h4>${esc(result.aName.split(" ")[0])}</h4><p>${esc((list[0].aNames || []).join(", ") || "None yet")}</p></div><div><h4>${esc(result.bName.split(" ")[0])}</h4><p>${esc((list[0].bNames || []).join(", ") || "None yet")}</p></div></div>` : "";
    return `<section class="sd-section"><h3>${title}</h3>${rows}${extra}</section>`;
  }).join("");
  const chaseList = (items, name) => items.length
    ? `<ol>${items.map((item) => `<li>${esc(item.text)}</li>`).join("")}</ol>`
    : `<p>No chase targets. ${esc(name)} is even or ahead in the scored categories.</p>`;
  host.innerHTML = `
    <div class="sd-banner">
      <p class="celebrate-kicker">SHOWDOWN</p>
      <h2>${esc(result.headline)}</h2>
      <p class="sd-tally">${esc(result.tally)}</p>
      <p class="sd-note">${esc(result.note)} Current season cards only.</p>
    </div>
    <div class="sd-names"><span>${esc(result.aName)} · ${esc(result.aGroup)}</span><span>VS</span><span>${esc(result.bName)} · ${esc(result.bGroup)}</span></div>
    ${body}
    <div class="sd-chase-grid">
      <section class="sd-chase"><h3>${esc(result.aName.split(" ")[0])}'s chase targets</h3>${chaseList(result.chaseA, result.aName.split(" ")[0])}</section>
      <section class="sd-chase"><h3>${esc(result.bName.split(" ")[0])}'s chase targets</h3>${chaseList(result.chaseB, result.bName.split(" ")[0])}</section>
    </div>
    <div class="sd-actions">
      <button class="btn btn-red" type="button" id="sd-rematch">Rematch</button>
      <button class="btn btn-ghost" type="button" id="sd-change">Change players</button>
      <button class="btn btn-ghost" type="button" id="sd-view-a">View ${esc(result.aName.split(" ")[0])}</button>
      <button class="btn btn-ghost" type="button" id="sd-view-b">View ${esc(result.bName.split(" ")[0])}</button>
      <button class="btn btn-ghost" type="button" id="sd-close">Close</button>
    </div>`;
  host.hidden = false;
  $("sd-rematch").addEventListener("click", runShowdownFaceoff);
  $("sd-change").addEventListener("click", () => openShowdownPicker($("sd-a").value));
  $("sd-view-a").addEventListener("click", () => { const id = $("sd-a").value; closeShowdown(); openProfile(id); });
  $("sd-view-b").addEventListener("click", () => { const id = $("sd-b").value; closeShowdown(); openProfile(id); });
  $("sd-close").addEventListener("click", closeShowdown);
}

function revealShowdownResults() {
  clearShowdownTimers();
  const box = $("showdown");
  if (!box) return;
  box.scrollTop = 0;
  box.classList.add("is-results");
  $("showdownFace").hidden = true;
  $("showdownPick").hidden = true;
  renderShowdownResults();
}

function skipShowdown() { revealShowdownResults(); }

function runShowdownFaceoff() {
  const a = players.find((p) => p.id === $("sd-a").value);
  const b = players.find((p) => p.id === $("sd-b").value);
  const check = buildShowdown(a, b);
  if (!check.ok) { sdRefreshWarn(); return; }
  const box = $("showdown");
  clearShowdownTimers();
  box.scrollTop = 0;
  box.classList.remove("is-go", "is-clash", "is-results", "is-reduced");
  $("showdownPick").hidden = true;
  $("showdownResults").hidden = true;
  $("showdownFace").hidden = false;
  $("sd-card-a").innerHTML = cardHTML(a, true);
  $("sd-card-b").innerHTML = cardHTML(b, true);
  $("sd-card-a").querySelectorAll(".bb-card").forEach((card) => card.classList.add("card-live"));
  $("sd-card-b").querySelectorAll(".bb-card").forEach((card) => card.classList.add("card-live"));
  if (motionReduced()) {
    box.classList.add("is-reduced", "is-results");
    revealShowdownResults();
    return;
  }
  requestAnimationFrame(() => box.classList.add("is-go"));
  showdownTimers.push(setTimeout(revealShowdownResults, 2700));
}

function bindApp() {
  if (typeof document === "undefined" || !document.getElementById || !document.getElementById("rosterGrid")) return;
  const banner = document.getElementById("migrationBanner");
  if (banner && migrationNotice) banner.hidden = false;

  ["searchInput", "typeFilter", "teamFilter", "sortSelect"].forEach((id) => {
    $(id).addEventListener("input", renderRoster);
    $(id).addEventListener("change", renderRoster);
  });
  $("backBtn").addEventListener("click", () => { closeProfile(); renderRoster(); });
  $("addPlayerBtn").addEventListener("click", () => openModal(null));
  $("closeModalBtn").addEventListener("click", closeModal);
  $("cancelBtn").addEventListener("click", closeModal);
  $("modalBackdrop").addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeModal();
    closeSeasonConfirm();
    closeShowdown();
  });

  $("f-type").addEventListener("change", () => {
    fillArchetypes($("f-type").value);
    const group = $("f-ageGroup").value || "16U";
    const like = editingDefaults && editingDefaults.type === $("f-type").value
      ? editingDefaults
      : { type: $("f-type").value, ageGroup: group, metrics: defaultMetrics($("f-type").value, group) };
    renderMetricFields(like);
    updateLivePreview();
    updatePhotoPreview();
  });
  $("f-age").addEventListener("input", () => {
    const age = parseInt($("f-age").value, 10);
    const next = ageGroupFromAge(age);
    const prevMapped = ageGroupFromAge(Number($("f-age").dataset.prevAge));
    if ($("f-ageGroup").value === prevMapped && $("f-ageGroup").value !== next) {
      $("f-ageGroup").value = next;
      renderMetricFields(formPlayerLike());
    }
    $("f-age").dataset.prevAge = String(age);
    updateLivePreview();
  });
  $("f-ageGroup").addEventListener("change", () => {
    renderMetricFields(formPlayerLike());
    updateLivePreview();
  });
  $("playerForm").addEventListener("input", updateLivePreview);
  $("f-photo").addEventListener("change", (e) => handlePhotoFile(e.target.files && e.target.files[0]));
  $("clearPhotoBtn").addEventListener("click", () => { pendingPhotoData = ""; $("f-photo").value = ""; updatePhotoPreview(); });

  $("playerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const like = formPlayerLike();
    like.coachQuirks = checkedCoachQuirks();
    if (!like.name.trim()) { alert("Please enter a player name."); return; }
    const existing = players.find((p) => p.id === like.id);
    let saved = existing;
    if (existing) {
      const history = structuredClone(existing.history || {});
      Object.entries(like.metrics).forEach(([k, v]) => {
        if (v == null || Number.isNaN(v)) return;
        if (!history[k]) history[k] = [existing.metrics[k]];
        if (history[k][history[k].length - 1] !== v) history[k].push(v);
        history[k] = history[k].slice(-6);
      });
      like.earnedQuirks = structuredClone(existing.earnedQuirks || []);
      Object.assign(existing, like, { history });
      saved = existing;
    } else {
      like.id = "player-" + Date.now().toString(36);
      like.history = {};
      like.earnedQuirks = [];
      like.currentSeason = seasonLabel(nowDate());
      like.cardCollection = [];
      Object.entries(like.metrics).forEach(([k, v]) => { like.history[k] = [v]; });
      players.push(like);
      saved = like;
    }
    const plan = takeGradeCelebration(saved);
    const added = syncEarnedQuirks(saved);
    savePlayers();
    closeModal();
    renderRoster();
    if (selectedId) openProfile(selectedId);
    else if (!existing) openProfile(like.id);
    const celeb = (plan.kind === "tier-up" || plan.kind === "overall-up")
      ? [{ ...plan, playerId: saved.id, reason: topGainText(saved) }]
      : [];
    beginCelebrations(celeb, () => {
      if (added.length) startReveal(added.map((rec) => ({ playerId: saved.id, quirkId: rec.id })));
    });
  });

  $("resetBtn").addEventListener("click", () => {
    if (confirm("Reset to the 5 sample players? Any players you added or edits you made will be removed.")) {
      players = structuredClone(SAMPLE_PLAYERS);
      migrationNotice = false;
      if (banner) banner.hidden = true;
      savePlayers(); closeProfile(); renderRoster();
    }
  });

  const collectBtn = $("quirkCollectBtn");
  if (collectBtn) collectBtn.addEventListener("click", onRevealButton);
  const celebCollect = $("celebrateCollect");
  const celebSkip = $("celebrateSkip");
  if (celebCollect) celebCollect.addEventListener("click", collectCelebration);
  if (celebSkip) celebSkip.addEventListener("click", skipCelebration);
  const seasonGo = $("seasonConfirmGo");
  const seasonCancel = $("seasonConfirmCancel");
  const seasonBackdrop = $("seasonConfirmBackdrop");
  const seasonCollect = $("seasonRevealCollect");
  if (seasonGo) seasonGo.addEventListener("click", confirmRollover);
  if (seasonCancel) seasonCancel.addEventListener("click", closeSeasonConfirm);
  if (seasonBackdrop) seasonBackdrop.addEventListener("click", closeSeasonConfirm);
  if (seasonCollect) seasonCollect.addEventListener("click", collectSeasonReveal);
  const showdownBtn = $("showdownBtn");
  if (showdownBtn) showdownBtn.addEventListener("click", () => openShowdownPicker(null));
  if ($("sd-start")) $("sd-start").addEventListener("click", runShowdownFaceoff);
  if ($("sd-cancel")) $("sd-cancel").addEventListener("click", closeShowdown);
  if ($("sd-skip")) $("sd-skip").addEventListener("click", skipShowdown);
  if ($("sd-a")) $("sd-a").addEventListener("change", sdRefreshWarn);
  if ($("sd-b")) $("sd-b").addEventListener("change", sdRefreshWarn);
  let earnedDirty = false;
  const pendingReveal = [];
  const pendingCeleb = [];
  const pendingSeason = [];
  players.forEach((p) => {
    if (!Array.isArray(p.coachQuirks)) p.coachQuirks = [];
    if (ensureSeasonFields(p)) earnedDirty = true;
    if (rolloverIfDue(p)) earnedDirty = true;
    if (p.seasonReveal) pendingSeason.push(p.id);
    else {
      const plan = takeGradeCelebration(p);
      if (plan.mark) earnedDirty = true;
      if (plan.kind === "tier-up" || plan.kind === "overall-up") {
        pendingCeleb.push({ ...plan, playerId: p.id, reason: topGainText(p) });
      }
    }
    if (syncEarnedQuirks(p).length) earnedDirty = true;
    unseenEarns(p).forEach((rec) => pendingReveal.push({ playerId: p.id, quirkId: rec.id }));
  });
  pendingCeleb.sort((a, b) => (a.kind === "tier-up" ? 0 : 1) - (b.kind === "tier-up" ? 0 : 1));
  if (earnedDirty) savePlayers();
  renderRoster();
  beginSeasonReveals(pendingSeason, () => {
    beginCelebrations(pendingCeleb, () => {
      if (pendingReveal.length) startReveal(pendingReveal);
    });
  });
}

bindApp();
