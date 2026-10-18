/* Antonelli Baseball — Player Profiles & Baseball Cards (Prototype v2, black & gold)
   No backend. Data persists in localStorage. All players below are SAMPLE / invented.

   HOW THE OVERALL GRADE WORKS (transparent formula)
   -------------------------------------------------
   1) Each raw metric is normalized to a 20-99 tool grade against an
      age-appropriate benchmark range for roughly ages 14-18 travel / HS baseball.
      Example: exit velocity 65 mph -> 20, 102 mph -> 99, linearly in between.
      Lower-is-better metrics (60-yard dash) are inverted.
      These ranges are coaching benchmarks for this prototype, NOT national
      percentile data — a coach should tune them by age group in METRICS below.
   2) Tool sub-grades combine 1-2 normalized metrics:
      Hitter:  CON = contact% + bat speed, PWR = exit velo + max distance,
               SPD = 60 time, FLD = fielding score, ARM = arm velo
      Pitcher: VEL = fastball velo, BRK = spin + whiff%, CNTL = strike%,
               STM = pitch capacity
      Two-way: both sets are shown; overall is the average of hitter + pitcher overall.
   3) Overall is a weighted average of the sub-grades (weights in SUBGRADES),
      rounded and clamped to 20-99.
   4) Tier from overall: Bronze <70, Silver 70-79, Gold 80-89, Diamond 90+.
*/

const STORAGE_KEY = "antonelli-player-cards-v1";

const METRICS = {
  // Hitter metrics: low/high = benchmark range mapped to 20..99
  exitVelocity: { label: "Exit Velocity", unit: " mph", low: 65, high: 102, step: 0.5, help: "Hardest / typical top exit velo off bat" },
  batSpeed:     { label: "Bat Speed", unit: " mph", low: 55, high: 82, step: 0.5, help: "Peak bat speed through the zone" },
  contactPct:   { label: "Contact %", unit: "%", low: 50, high: 95, step: 1, help: "Swings that put the ball in play / foul" },
  launchAngle:  { label: "Avg Launch Angle", unit: "°", low: 4, high: 28, step: 0.5, help: "Average launch angle — shown for context, target ~10-20°" },
  maxDistance:  { label: "Max Distance", unit: " ft", low: 260, high: 420, step: 1, help: "Farthest batted ball" },
  sixtyTime:    { label: "60-Yard Dash", unit: " sec", low: 6.4, high: 7.8, step: 0.01, invert: true, help: "Lower is faster" },
  fieldingScore:{ label: "Fielding Score", unit: "/100", low: 40, high: 98, step: 1, help: "Coach-evaluated range, hands, footwork (0-100)" },
  armVelocity:  { label: "Arm Velocity", unit: " mph", low: 55, high: 92, step: 0.5, help: "Top throwing velocity from position" },
  // Pitcher metrics
  fastballVelo: { label: "Fastball Velocity", unit: " mph", low: 68, high: 96, step: 0.5, help: "Typical top fastball velocity" },
  spinRate:     { label: "Fastball Spin Rate", unit: " rpm", low: 1600, high: 2600, step: 10, help: "Fastball spin efficiency / carry" },
  strikePct:    { label: "Strike % (Command)", unit: "%", low: 45, high: 76, step: 1, help: "Pitches in / around the strike zone" },
  whiffPct:     { label: "Offspeed Whiff %", unit: "%", low: 10, high: 46, step: 1, help: "Swings-and-misses on breaking / offspeed" },
  pitchCapacity:{ label: "Pitch Capacity (Stamina)", unit: " pitches", low: 40, high: 110, step: 1, help: "Pitches before velocity / command drops" },
};

const SUBGRADES = {
  hitter: [
    { key: "CON", label: "Contact", metrics: ["contactPct", "batSpeed"], weights: [0.7, 0.3], overallWeight: 0.25 },
    { key: "PWR", label: "Power", metrics: ["exitVelocity", "maxDistance"], weights: [0.65, 0.35], overallWeight: 0.25 },
    { key: "SPD", label: "Speed", metrics: ["sixtyTime"], weights: [1], overallWeight: 0.15 },
    { key: "FLD", label: "Fielding", metrics: ["fieldingScore"], weights: [1], overallWeight: 0.15 },
    { key: "ARM", label: "Arm", metrics: ["armVelocity"], weights: [1], overallWeight: 0.20 },
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
  "Power Hitter": "Built to drive the ball in the air with authority. Exit velocity and distance lead the profile; the plan is damage on pitches in the zone, even if swing-and-miss comes with it.",
  "Contact / Leadoff": "Sets the table. Short, quick swing, high contact, works counts and puts pressure on the defense. Power develops later — on-base skills come first.",
  "Gap-to-Gap Hitter": "Line-drive hitter who uses both gaps. Balanced contact and power with a repeatable, level-to-uphill path.",
  "Speed / Table-Setter": "Speed changes games. Gets on, steals bases, goes first-to-third, and covers ground defensively.",
  "Middle-of-the-Order Bat": "Run producer in the heart of the lineup. Combines contact and power to drive in runs in big spots.",
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
  // prior: array of earlier values (oldest -> newest before current)
  return [...prior, current];
}

const SAMPLE_PLAYERS = [
  {
    id: "sample-mason-carter", name: "Mason Carter", age: 17, classYear: "Junior / 11th",
    team: "Antonelli 17U", position: "OF / 1B", bats: "L", throws: "L", type: "hitter", archetype: "Power Hitter", photo: "",
    strengths: ["Drives the ball in the air to the pull side with real carry", "Strong, physical swing — top exit velocities on the team", "Patient in hitter's counts; hunts fastballs he can lift"],
    improvements: ["Improve contact on breaking balls down and away", "Shorten two-strike approach without giving up power", "First-step quickness on outfield reads"],
    metrics: { exitVelocity: 96, batSpeed: 74, contactPct: 82, launchAngle: 16, maxDistance: 395, sixtyTime: 6.90, fieldingScore: 85, armVelocity: 87 },
    history: {
      exitVelocity: metricHistory(96, [88, 91, 94]), batSpeed: metricHistory(74, [68, 70, 72]),
      contactPct: metricHistory(82, [74, 77, 80]), launchAngle: metricHistory(16, [12, 14, 15]),
      maxDistance: metricHistory(395, [350, 368, 382]), sixtyTime: metricHistory(6.90, [7.25, 7.12, 7.00]),
      fieldingScore: metricHistory(85, [74, 79, 82]), armVelocity: metricHistory(87, [80, 83, 85]),
    },
  },
  {
    id: "sample-eli-ramirez", name: "Eli Ramirez", age: 15, classYear: "Sophomore / 10th",
    team: "Antonelli 15U", position: "SS / 2B", bats: "R", throws: "R", type: "hitter", archetype: "Contact / Leadoff", photo: "",
    strengths: ["Short, quick swing with consistent barrel contact", "Advanced strike-zone awareness for his age", "Instinctive base runner; quick first step out of the box"],
    improvements: ["Add strength to turn singles into gap power", "Keep bat path flatter on high fastballs", "Arm strength on throws from deep shortstop"],
    metrics: { exitVelocity: 85, batSpeed: 68, contactPct: 90, launchAngle: 11, maxDistance: 330, sixtyTime: 6.68, fieldingScore: 88, armVelocity: 78 },
    history: {
      exitVelocity: metricHistory(85, [76, 80, 83]), batSpeed: metricHistory(68, [61, 64, 66]),
      contactPct: metricHistory(90, [84, 87, 89]), launchAngle: metricHistory(11, [9, 10, 11]),
      maxDistance: metricHistory(330, [285, 305, 320]), sixtyTime: metricHistory(6.68, [6.95, 6.84, 6.75]),
      fieldingScore: metricHistory(88, [80, 84, 86]), armVelocity: metricHistory(78, [69, 73, 76]),
    },
  },
  {
    id: "sample-noah-bennett", name: "Noah Bennett", age: 16, classYear: "Junior / 11th",
    team: "Antonelli 16U", position: "RHP", bats: "R", throws: "R", type: "pitcher", archetype: "Ace", photo: "",
    strengths: ["Fastball carries through the top of the zone", "Repeats delivery and pounds the strike zone", "Breaking ball lands for strikes and chase swings"],
    improvements: ["Hold velocity deeper into outings (5th-6th inning)", "Develop a firm changeup vs. left-handed hitters", "Quicker move to hold runners at first"],
    metrics: { fastballVelo: 90, spinRate: 2450, strikePct: 69, whiffPct: 38, pitchCapacity: 95 },
    history: {
      fastballVelo: metricHistory(90, [83, 86, 88]), spinRate: metricHistory(2450, [2150, 2280, 2380]),
      strikePct: metricHistory(69, [60, 64, 67]), whiffPct: metricHistory(38, [27, 31, 35]),
      pitchCapacity: metricHistory(95, [70, 80, 88]),
    },
  },
  {
    id: "sample-connor-walsh", name: "Connor Walsh", age: 17, classYear: "Senior / 12th",
    team: "Antonelli 17U", position: "RHP", bats: "R", throws: "R", type: "pitcher", archetype: "Closer", photo: "",
    strengths: ["Electric one-inning stuff; fastball jumps on hitters", "Slider generates swing-and-miss in leverage counts", "Attacks hitters — not afraid of contact in the zone"],
    improvements: ["Command can scatter when he overthrows", "Throw first-pitch strikes more consistently", "Build routine for back-to-back days"],
    metrics: { fastballVelo: 91, spinRate: 2480, strikePct: 61, whiffPct: 41, pitchCapacity: 52 },
    history: {
      fastballVelo: metricHistory(91, [87, 89, 90]), spinRate: metricHistory(2480, [2300, 2400, 2450]),
      strikePct: metricHistory(61, [57, 59, 60]), whiffPct: metricHistory(41, [34, 37, 39]),
      pitchCapacity: metricHistory(52, [45, 48, 50]),
    },
  },
  {
    id: "sample-dylan-brooks", name: "Dylan Brooks", age: 14, classYear: "Freshman / 9th",
    team: "Antonelli 14U", position: "C / RHP", bats: "R", throws: "R", type: "two-way", archetype: "Two-Way Player", photo: "",
    strengths: ["Strong arm behind the plate and on the mound", "Competitive at-bats; battles with two strikes", "Athletic frame with room to add strength"],
    improvements: ["Receiving and blocking consistency behind the plate", "Bat speed — stay connected through the turn", "Pitching mechanics: stay closed longer to improve command"],
    metrics: {
      exitVelocity: 78, batSpeed: 62, contactPct: 74, launchAngle: 12, maxDistance: 295, sixtyTime: 7.30, fieldingScore: 72, armVelocity: 76,
      fastballVelo: 76, spinRate: 1950, strikePct: 58, whiffPct: 22, pitchCapacity: 62,
    },
    history: {
      exitVelocity: metricHistory(78, [72, 75, 77]), batSpeed: metricHistory(62, [58, 60, 61]),
      contactPct: metricHistory(74, [70, 72, 73]), launchAngle: metricHistory(12, [10, 11, 12]),
      maxDistance: metricHistory(295, [265, 280, 290]), sixtyTime: metricHistory(7.30, [7.50, 7.42, 7.36]),
      fieldingScore: metricHistory(72, [66, 69, 71]), armVelocity: metricHistory(76, [71, 73, 75]),
      fastballVelo: metricHistory(76, [71, 73, 75]), spinRate: metricHistory(1950, [1800, 1880, 1920]),
      strikePct: metricHistory(58, [52, 55, 57]), whiffPct: metricHistory(22, [17, 19, 21]),
      pitchCapacity: metricHistory(62, [50, 55, 59]),
    },
  },
];

/* ---------- Grade math ---------- */
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

function normalizeMetric(key, value) {
  const m = METRICS[key];
  if (!m || value == null || isNaN(value)) return null;
  let pct = (Number(value) - m.low) / (m.high - m.low);
  if (m.invert) pct = 1 - pct;
  return Math.round(clamp(20 + pct * 79, 20, 99));
}

function subGradesFor(player, kind) {
  return SUBGRADES[kind].map((sg) => {
    let totalWeight = 0, sum = 0;
    sg.metrics.forEach((mk, i) => {
      const g = normalizeMetric(mk, player.metrics[mk]);
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

function metricKeysFor(type) {
  const hitterKeys = ["exitVelocity", "batSpeed", "contactPct", "launchAngle", "maxDistance", "sixtyTime", "fieldingScore", "armVelocity"];
  const pitcherKeys = ["fastballVelo", "spinRate", "strikePct", "whiffPct", "pitchCapacity"];
  if (type === "pitcher") return pitcherKeys;
  if (type === "two-way") return [...hitterKeys, ...pitcherKeys];
  return hitterKeys;
}

function typeLabel(type) { return { hitter: "Hitter", pitcher: "Pitcher", "two-way": "Two-Way" }[type] || type; }
function teamCode(team) {
  const parts = String(team || "Antonelli").trim().split(/\s+/);
  const code = parts.map((w) => (/^\d/.test(w) ? w : w[0])).join("").toUpperCase();
  return code.slice(0, 4) || "AB";
}
// Clean Antonelli star (white star, black outline, gold inner outline) redrawn as SVG —
// the source banner contained sponsor text, so the banner itself is not used on cards.
function starSVG(cls) {
  return `<svg class="${cls || "card-star"}" viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,3 62,37 98,37 69,58 80,96 50,73 20,96 31,58 2,37 38,37" fill="#ffffff" stroke="#0a0a0a" stroke-width="5" stroke-linejoin="round"/><polygon points="50,3 62,37 98,37 69,58 80,96 50,73 20,96 31,58 2,37 38,37" transform="translate(50 50) scale(0.8) translate(-50 -50)" fill="none" stroke="#d4af37" stroke-width="3" stroke-linejoin="round"/></svg>`;
}
// Inline SVG silhouettes (no external images). Thick-stroke athletic figures.
function silhouetteSVG(type, cls) {
  const klass = cls || "card-silhouette";
  if (type === "pitcher") {
    return `<svg class="${klass}" viewBox="0 0 200 240" role="img" aria-label="Pitcher silhouette"><circle class="sil-fill" cx="102" cy="30" r="14"/><path class="sil-body" stroke-width="15" d="M100 48 L94 116 L60 164 L40 210 M94 116 L126 156 L138 212 M100 60 L138 26 M138 26 L160 42 M98 72 L62 98"/><circle class="sil-fill" cx="164" cy="46" r="7"/></svg>`;
  }
  // hitter + two-way use the batter
  return `<svg class="${klass}" viewBox="0 0 200 240" role="img" aria-label="Batter silhouette"><circle class="sil-fill" cx="118" cy="32" r="14"/><path class="sil-body" stroke-width="15" d="M112 50 L88 112 L62 168 L52 214 M88 112 L118 154 L142 208 M110 64 L142 46"/><path class="sil-body" stroke-width="8" d="M142 46 L180 10"/></svg>`;
}
function initials(name) { return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "AB"; }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function linesToArray(text) { return String(text || "").split(/\n|,/).map((s) => s.trim()).filter(Boolean); }

/* ---------- Storage ---------- */
function loadPlayers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed) && parsed.length) return parsed; }
  } catch (e) { /* fall through to sample data */ }
  return structuredClone(SAMPLE_PLAYERS);
}
function savePlayers() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(players)); }
  catch (e) { alert("Could not save — browser storage is full. Try a smaller photo, or clear a photo and save again."); }
}

let players = loadPlayers();
let selectedId = null;

/* ---------- Sparkline ---------- */
function sparkline(values, invert) {
  if (!values || values.length < 2) return '<span class="muted">—</span>';
  const w = 92, h = 28, pad = 3;
  const min = Math.min(...values), max = Math.max(...values), range = (max - min) || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const improved = invert ? values[values.length - 1] < values[0] : values[values.length - 1] > values[0];
  const color = improved ? "#14804a" : (values[values.length - 1] === values[0] ? "#667085" : "#c8102e");
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${pts.split(" ").pop().split(",")[0]}" cy="${pts.split(" ").pop().split(",")[1]}" r="3" fill="${color}"/></svg>`;
}

function deltaHTML(key, history) {
  if (!history || history.length < 2) return '<span class="delta-flat">—</span>';
  const cur = history[history.length - 1], prev = history[history.length - 2];
  const diff = Math.round((cur - prev) * 100) / 100;
  if (diff === 0) return '<span class="delta-flat">0</span>';
  const good = METRICS[key].invert ? diff < 0 : diff > 0;
  return `<span class="${good ? "delta-up" : "delta-down"}">${diff > 0 ? "▲ +" : "▼ "}${diff}</span>`;
}

/* ---------- Card rendering (v2 portrait card) ---------- */
function cardHTML(player, large) {
  const { subs, overall } = gradesFor(player);
  const tier = tierFor(overall);
  const shownSubs = player.type === "two-way" && !large ? subs.slice(0, 5) : subs;
  const visual = player.photo
    ? `<img class="card-photo" src="${esc(player.photo)}" alt="Photo of ${esc(player.name)}">`
    : silhouetteSVG(player.type);
  return `
  <div class="bb-card tier-${tier.key} ${large ? "large" : ""}">
    <div class="card-visual">${visual}</div>
    <div class="card-brand"><b>ANTONELLI</b><span>${tier.label}</span></div>
    <div class="overall-diamond"><div><b>${overall}</b><span>OVR</span></div></div>
    <div class="card-bottom">
      <div class="card-meta-row">
        <div class="team-mark">${starSVG()}<span class="team-code">${esc(teamCode(player.team))}</span></div>
        <div class="card-name">
          <span class="archetype">${esc(player.archetype)}</span>
          <${large ? "h2" : "h3"}>${esc(player.name)}</${large ? "h2" : "h3"}>
          <span class="pos-bar">${esc(player.position)} - ${esc(player.bats)}/${esc(player.throws)}</span>
          <span class="card-teamline">${esc(player.team)} • Age ${esc(player.age)} • ${esc(player.classYear)}</span>
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
      const hay = `${p.name} ${p.position} ${p.archetype} ${p.team} ${p.classYear} ${typeLabel(p.type)}`.toLowerCase();
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
        <div class="meta">${esc(p.position)} • ${esc(p.team)} • Age ${esc(p.age)} • ${esc(p.classYear)}<br>Bats ${esc(p.bats)} / Throws ${esc(p.throws)} • Overall ${overall}</div>
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
}

/* ---------- Profile ---------- */
function metricsTable(player) {
  const keys = metricKeysFor(player.type);
  const rows = keys.map((k) => {
    const m = METRICS[k], hist = (player.history && player.history[k]) || [player.metrics[k]];
    const prev = hist.length > 1 ? hist[hist.length - 2] : "—";
    const grade = normalizeMetric(k, player.metrics[k]);
    return `<tr>
      <td><strong>${m.label}</strong><br><span class="muted" style="font-size:12px">${esc(m.help)}</span></td>
      <td><strong>${esc(player.metrics[k])}${esc(m.unit)}</strong></td>
      <td>${prev === "—" ? "—" : esc(prev) + esc(m.unit)}</td>
      <td>${deltaHTML(k, hist)}</td>
      <td>${sparkline(hist, m.invert)}</td>
      <td><span class="grade-chip">${grade ?? "—"}</span></td>
    </tr>`;
  }).join("");
  return `<table><thead><tr><th>Metric</th><th>Current</th><th>Previous</th><th>Change</th><th>History</th><th>Grade</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="muted small">Grade = each metric normalized to 20–99 against the benchmark ranges in app.js (see README). History updates when you save an edited metric.</p>`;
}

function openProfile(id) {
  const p = players.find((x) => x.id === id);
  if (!p) return;
  selectedId = id;
  const { subs, overall } = gradesFor(p);
  const tier = tierFor(overall);
  $("rosterView").hidden = true;
  $("profileView").hidden = false;
  $("profileContent").innerHTML = `
    <div>
      ${cardHTML(p, true)}
      <div class="profile-actions">
        <button class="btn btn-red" type="button" id="editProfileBtn">Edit Metrics / Profile</button>
        <button class="btn btn-ghost" type="button" id="deleteProfileBtn">Delete Player</button>
      </div>
      <div class="panel" style="margin-top:16px">
        <h3>How this grade is built</h3>
        <p class="small" style="line-height:1.6">Overall <strong>${overall} (${tier.label})</strong> is a weighted average of these tool grades (each 20–99):</p>
        <div class="pills">${subs.map((s) => `<span class="pill">${s.key} ${s.grade ?? "—"} — ${esc(s.label)}</span>`).join("")}</div>
        <p class="muted small">Bronze &lt;70 • Silver 70–79 • Gold 80–89 • Diamond 90+. Edit metrics to see this card upgrade live.</p>
      </div>
    </div>
    <div class="profile-main">
      <div class="panel">
        <p class="eyebrow" style="color:var(--red)">${esc(p.archetype.toUpperCase())} • ${typeLabel(p.type).toUpperCase()}</p>
        <h2 style="margin-bottom:6px">${esc(p.name)}</h2>
        <p class="muted">${esc(p.position)} • ${esc(p.team)} • Age ${esc(p.age)} • ${esc(p.classYear)} • Bats ${esc(p.bats)} / Throws ${esc(p.throws)}</p>
        <h3>What type of ${p.type === "pitcher" ? "pitcher" : "player"} is he?</h3>
        <p style="line-height:1.65">${esc(ARCHETYPE_INFO[p.archetype] || "A developing player whose archetype will sharpen as metrics and game performance grow.")}</p>
      </div>
      <div class="two-col">
        <div class="panel"><h3>✓ What he does well</h3><ul class="list good">${(p.strengths || []).map((s) => `<li>${esc(s)}</li>`).join("") || "<li>—</li>"}</ul></div>
        <div class="panel"><h3>◎ What to improve</h3><ul class="list work">${(p.improvements || []).map((s) => `<li>${esc(s)}</li>`).join("") || "<li>—</li>"}</ul></div>
      </div>
      <div class="panel"><h3>Metrics &amp; Progress</h3>${metricsTable(p)}</div>
    </div>`;
  $("editProfileBtn").addEventListener("click", () => openModal(p));
  $("deleteProfileBtn").addEventListener("click", () => {
    if (confirm(`Delete ${p.name}? This cannot be undone (Reset Sample Data only restores the 5 sample players).`)) {
      players = players.filter((x) => x.id !== p.id);
      savePlayers(); closeProfile(); renderRoster();
    }
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
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
    el.innerHTML = silhouetteSVG($("f-type") ? $("f-type").value : "hitter", "photo-silhouette") + "<span>No photo — silhouette</span>";
  }
}

function handlePhotoFile(file) {
  if (!file) return;
  if (!/^image\//.test(file.type)) { alert("Please choose an image file."); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // Downscale to max 800px so localStorage does not fill up
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

function defaultMetrics(type) {
  const base = { exitVelocity: 80, batSpeed: 64, contactPct: 75, launchAngle: 12, maxDistance: 300, sixtyTime: 7.1, fieldingScore: 70, armVelocity: 72, fastballVelo: 78, spinRate: 2000, strikePct: 58, whiffPct: 22, pitchCapacity: 60 };
  const out = {};
  metricKeysFor(type).forEach((k) => { out[k] = base[k]; });
  return out;
}

function renderMetricFields(playerLike) {
  const keys = metricKeysFor(playerLike.type);
  $("metricFields").innerHTML = keys.map((k) => {
    const m = METRICS[k], val = playerLike.metrics[k] ?? defaultMetrics(playerLike.type)[k];
    // Slider bounds: a bit wider than benchmark so coaches can enter out-of-range values
    const sliderMin = m.invert ? m.low - 0.4 : Math.floor(m.low - (m.high - m.low) * 0.15);
    const sliderMax = m.invert ? m.high + 0.4 : Math.ceil(m.high + (m.high - m.low) * 0.08);
    return `<div class="metric-row">
      <label for="m-${k}">${m.label} <small>${esc(m.help)} • Benchmark ${m.low}–${m.high}${esc(m.unit)}</small></label>
      <div class="metric-inputs">
        <input type="range" id="range-${k}" data-metric="${k}" min="${sliderMin}" max="${sliderMax}" step="${m.step}" value="${val}">
        <input type="number" id="m-${k}" data-metric="${k}" step="${m.step}" value="${val}">
        <span class="muted small">${esc(m.unit.trim())}</span>
        <span class="grade-chip" id="grade-${k}">${normalizeMetric(k, val)}</span>
      </div>
    </div>`;
  }).join("");
  document.querySelectorAll("[data-metric]").forEach((input) => {
    input.addEventListener("input", () => {
      const k = input.dataset.metric;
      const range = $(`range-${k}`), num = $(`m-${k}`);
      if (input.type === "range") num.value = input.value; else range.value = input.value;
      $(`grade-${k}`).textContent = normalizeMetric(k, num.value) ?? "—";
      updateLivePreview();
    });
  });
}

function formPlayerLike() {
  const type = $("f-type").value;
  const metrics = {};
  metricKeysFor(type).forEach((k) => { const el = $(`m-${k}`); if (el) metrics[k] = parseFloat(el.value); });
  return {
    id: $("f-id").value || "temp", name: $("f-name").value || "New Player", age: parseInt($("f-age").value, 10) || 16,
    classYear: $("f-class").value, team: $("f-team").value || "Antonelli Baseball", position: $("f-position").value || "—",
    bats: $("f-bats").value, throws: $("f-throws").value, type, archetype: $("f-archetype").value,
    strengths: linesToArray($("f-strengths").value), improvements: linesToArray($("f-improvements").value),
    photo: pendingPhotoData || "",
    metrics, history: {},
  };
}

function updateLivePreview() {
  const like = formPlayerLike();
  const { subs, overall } = gradesFor(like);
  const tier = tierFor(overall);
  $("livePreview").innerHTML = `<div>Live Overall<br><b>${overall}</b> <span class="tier-badge">${tier.label}</span></div><div class="pills" style="margin:0">${subs.map((s) => `<span class="pill">${s.key} ${s.grade ?? "—"}</span>`).join("")}</div>`;
}

function openModal(player) {
  const isEdit = !!player;
  $("modalTitle").textContent = isEdit ? `Edit — ${player.name}` : "Add Player";
  $("f-id").value = isEdit ? player.id : "";
  $("f-name").value = isEdit ? player.name : "";
  $("f-age").value = isEdit ? player.age : 16;
  $("f-class").value = isEdit ? player.classYear : "";
  $("f-team").value = isEdit ? player.team : "Antonelli 16U";
  $("f-position").value = isEdit ? player.position : "";
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
  renderMetricFields(isEdit ? player : { type: "hitter", metrics: defaultMetrics("hitter") });
  updateLivePreview();
  $("playerModal").hidden = false;
}

function closeModal() { $("playerModal").hidden = true; }

/* ---------- Events ---------- */
["searchInput", "typeFilter", "teamFilter", "sortSelect"].forEach((id) => {
  $(id).addEventListener("input", renderRoster);
  $(id).addEventListener("change", renderRoster);
});
$("backBtn").addEventListener("click", () => { closeProfile(); renderRoster(); });
$("addPlayerBtn").addEventListener("click", () => openModal(null));
$("closeModalBtn").addEventListener("click", closeModal);
$("cancelBtn").addEventListener("click", closeModal);
$("modalBackdrop").addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

$("f-type").addEventListener("change", () => {
  fillArchetypes($("f-type").value);
  const like = editingDefaults && editingDefaults.type === $("f-type").value ? editingDefaults : { type: $("f-type").value, metrics: defaultMetrics($("f-type").value) };
  renderMetricFields(like);
  updateLivePreview();
  updatePhotoPreview();
});
$("playerForm").addEventListener("input", updateLivePreview);
$("f-photo").addEventListener("change", (e) => handlePhotoFile(e.target.files && e.target.files[0]));
$("clearPhotoBtn").addEventListener("click", () => { pendingPhotoData = ""; $("f-photo").value = ""; updatePhotoPreview(); });

$("playerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const like = formPlayerLike();
  if (!like.name.trim()) { alert("Please enter a player name."); return; }
  const existing = players.find((p) => p.id === like.id);
  if (existing) {
    // Append changed metrics to history so progress / sparkline is visible
    const history = structuredClone(existing.history || {});
    Object.entries(like.metrics).forEach(([k, v]) => {
      if (v == null || isNaN(v)) return;
      if (!history[k]) history[k] = [existing.metrics[k]];
      if (history[k][history[k].length - 1] !== v) history[k].push(v);
      history[k] = history[k].slice(-6);
    });
    Object.assign(existing, like, { history });
  } else {
    like.id = "player-" + Date.now().toString(36);
    like.history = {};
    Object.entries(like.metrics).forEach(([k, v]) => { like.history[k] = [v]; });
    players.push(like);
  }
  savePlayers();
  closeModal();
  renderRoster();
  if (selectedId) openProfile(selectedId);
  else if (!existing) openProfile(like.id);
});

$("resetBtn").addEventListener("click", () => {
  if (confirm("Reset to the 5 sample players? Any players you added or edits you made will be removed.")) {
    players = structuredClone(SAMPLE_PLAYERS);
    savePlayers(); closeProfile(); renderRoster();
  }
});

/* ---------- Init ---------- */
renderRoster();
