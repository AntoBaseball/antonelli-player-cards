/* ROAD TO 99 phase 2 — quests, boards, rivalries, trophies.
   Shared facility state lives in DataLayer.facility() on this browser.
   A backend replaces that object; the screens stay. */

var COMPETE_REACTIONS = ["🔥", "🥶", "💣", "🚀", "💪", "👑", "😳", "⚾"];
var COMPETE_METRICS = [
  { key: "batSpeed", label: "Bat Speed", unit: "MPH", better: "higher" },
  { key: "exitVelo", label: "Exit Velo", unit: "MPH", better: "higher" },
  { key: "tenYard", label: "Sprint", unit: "s", better: "lower" },
  { key: "throwVelo", label: "Throwing Velo", unit: "MPH", better: "higher" },
  { key: "broadJump", label: "Broad Jump", unit: "in", better: "higher" },
  { key: "vertical", label: "Vertical", unit: "in", better: "higher" },
  { key: "flying10", label: "Flying 10", unit: "s", better: "lower" },
];

/* A rivalry alert only fires inside these gaps. Velocities use 2 MPH or 3%. Sprints use 0.05 s. */
var COMPETE_CLOSE = {
  batSpeed: { abs: 2, pct: 0.03 },
  exitVelo: { abs: 2, pct: 0.03 },
  throwVelo: { abs: 2, pct: 0.03 },
  tenYard: { abs: 0.05 },
  flying10: { abs: 0.05 },
  broadJump: { abs: 3, pct: 0.03 },
  vertical: { abs: 1.5, pct: 0.03 },
};

var COMPETE_BOOK = [
  { age: 12, key: "exitVelo", name: "Luis Ortega", value: 72 },
  { age: 16, key: "exitVelo", name: "Luis Ortega", value: 91 },
  { age: 18, key: "exitVelo", name: "Luis Ortega", value: 101 },
  { age: 11, key: "tenYard", name: "Ava Brooks", value: 1.98 },
  { age: 16, key: "tenYard", name: "Ava Brooks", value: 1.62 },
  { age: 15, key: "throwVelo", name: "Chris Nguyen", value: 74 },
  { age: 18, key: "throwVelo", name: "Chris Nguyen", value: 91 },
];

var COMPETE_ALUMNI = [
  { name: "Luis Ortega", pos: "OF", college: "State U", start: "72 MPH EV at 12", end: "101 MPH EV", ovr: 91 },
  { name: "Chris Nguyen", pos: "RHP", college: "City College", start: "74 MPH FB at 15", end: "91 MPH FB", ovr: 88 },
  { name: "Ava Brooks", pos: "SS", college: "—", start: "1.98s 10-yd at 11", end: "1.62s 10-yd", ovr: 86 },
];

function competeEsc(s) {
  return typeof esc === "function" ? esc(s) : String(s ?? "");
}

function competeRoster() {
  return typeof roadRoster === "function" ? roadRoster() : [];
}

function competeToday() {
  return typeof roadToday === "function" ? roadToday() : "2026-10-21";
}

function competeMonday(stamp) {
  const p = String(stamp || competeToday()).slice(0, 10).split("-").map(Number);
  const d = new Date(p[0], p[1] - 1, p[2]);
  const back = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - back);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function competeFacility() {
  const data = DataLayer.facility();
  if (!Array.isArray(data.challenges)) data.challenges = [];
  if (!data.reactions) data.reactions = {};
  if (!data.claims) data.claims = {};
  if (!data.kings) data.kings = {};
  if (!data.seeded) {
    data.challenges.push({
      id: "seed-eli-jack",
      from: "sample-eli-ramirez",
      to: "sample-jack-morales",
      metric: "exitVelo",
      deadline: "2026-10-28",
      status: "pending",
      at: "2026-10-20",
    });
    data.reactions["sample-jack-morales"] = [{ from: "sample-mason-carter", emoji: "🔥", at: "2026-10-20" }, { from: "sample-jake-ellis", emoji: "🚀", at: "2026-10-21" }];
    data.seeded = true;
    DataLayer.saveFacility(data);
  }
  if (!data.h2hSeed) {
    data.challenges.push({
      id: "seed-jake-jack",
      from: "sample-jake-ellis",
      to: "sample-jack-morales",
      metric: "exitVelo",
      deadline: "2026-11-04",
      status: "accepted",
      at: "2026-10-18",
    });
    data.h2hSeed = true;
    DataLayer.saveFacility(data);
  }
  if (!data.crownDays) data.crownDays = {};
  return data;
}

function competeGapOk(key, a, b) {
  const rule = COMPETE_CLOSE[key];
  if (!rule || a == null || b == null) return false;
  const gap = Math.abs(a - b);
  if (rule.abs != null && gap <= rule.abs) return true;
  if (rule.pct != null && gap / Math.max(Math.abs(a), Math.abs(b), 0.001) <= rule.pct) return true;
  return false;
}

function competeLead(spec, mine, theirs) {
  if (spec.better === "lower") return mine < theirs;
  return mine > theirs;
}

function competeNum(player, key) {
  const n = player && player.metrics ? Number(player.metrics[key]) : NaN;
  return Number.isFinite(n) ? n : null;
}

function competeBetter(key, a, b) {
  const spec = COMPETE_METRICS.find((m) => m.key === key);
  if (a == null) return false;
  if (b == null) return true;
  return spec && spec.better === "lower" ? a < b : a > b;
}

function competeTeam(player) {
  return player && player.team || "";
}

function competeGroup(player) {
  return typeof activeAgeGroup === "function" ? activeAgeGroup(player) : "";
}

function competeExitDelta(player, days) {
  if (typeof roadSeries !== "function" || typeof roadDelta !== "function") return 0;
  const row = roadDelta(roadSeries(player, "exitVelo"), days);
  return row ? row.delta : 0;
}

function competeWeekQuest(player) {
  const monday = competeMonday(competeToday());
  const dates = (player.road && player.road.dates && player.road.dates.training) || [];
  const sessions = dates.filter((d) => d >= monday && d <= competeToday()).length;
  const catalog = [
    { id: "speed", name: "Speed Week", detail: "2 sprint or training sessions", target: 2, progress: sessions },
    { id: "barrel", name: "Barrel Week", detail: "Raise exit velo from your first test this month", target: 1, progress: competeExitDelta(player, 30) > 0 ? 1 : 0 },
    { id: "consistency", name: "Consistency", detail: "Train 5 days this week", target: 5, progress: sessions },
    { id: "batprs", name: "Bat-speed PRs", detail: "Stack personal bests", target: 3, progress: Math.min(3, (player.road && player.road.prs) || 0) },
  ];
  const week = Number(monday.slice(-2)) % catalog.length;
  return catalog[week];
}

function competeMonthQuest(player) {
  const delta = competeExitDelta(player, 30);
  return { id: "power-surge", name: "POWER SURGE", detail: "+2 MPH exit velo this month", target: 2, progress: Math.round(delta * 10) / 10, done: delta >= 2 };
}

function competeEvent() {
  const month = Number(competeToday().slice(5, 7));
  const table = [
    { id: "spring", name: "Spring Training Challenge", months: [3, 4], blurb: "Sessions, homework, and testing." },
    { id: "summer", name: "Summer Power Surge", months: [6, 7, 8], blurb: "Bat speed, exit velo, strength." },
    { id: "fall", name: "Fall Speed Challenge", months: [9, 10, 11], blurb: "10-yard, flying 10, broad jump." },
    { id: "winter", name: "Winter Warrior", months: [12, 1, 2], blurb: "Show up. Keep the streak." },
  ];
  return table.find((e) => e.months.indexOf(month) >= 0) || table[2];
}

function competeEventPoints(player) {
  const month = competeToday().slice(0, 7);
  const dates = (player.road && player.road.dates && player.road.dates.training) || [];
  const sessions = dates.filter((d) => String(d).slice(0, 7) === month).length;
  return sessions * 20 + ((player.road && player.road.prs) || 0) * 15;
}

function competeTeamChallenge(team) {
  const members = competeRoster().filter((p) => competeTeam(p) === team && p.type !== "pitcher");
  const gained = members.reduce((sum, p) => sum + Math.max(0, competeExitDelta(p, 30)), 0);
  return { name: "TEAM POWER CHALLENGE", detail: "exit velo gained this month", progress: Math.round(gained * 10) / 10, target: 40, team: team };
}

function competeChemistry(player) {
  const team = competeTeam(player);
  const members = competeRoster().filter((p) => competeTeam(p) === team);
  if (!members.length) return { pct: 0, glow: false, perfect: false };
  const monday = competeMonday(competeToday());
  const done = members.filter((p) => {
    const dates = (p.road && p.road.dates && p.road.dates.training) || [];
    return dates.some((d) => d >= monday && d <= competeToday());
  }).length;
  const pct = Math.round((done / members.length) * 100);
  return { pct: pct, glow: pct >= 70, perfect: pct === 100, done: done, size: members.length };
}

function competeSorted(key) {
  return competeRoster().filter((p) => competeNum(p, key) != null).sort((a, b) => {
    const av = competeNum(a, key);
    const bv = competeNum(b, key);
    const spec = COMPETE_METRICS.find((m) => m.key === key);
    return spec && spec.better === "lower" ? av - bv : bv - av;
  });
}

function competeKing(key, scope, value) {
  const list = competeRoster().filter((p) => (scope ? (competeTeam(p) === scope || competeGroup(p) === scope) : true) && competeNum(p, key) != null);
  return list.sort((a, b) => competeBetter(key, competeNum(a, key), competeNum(b, key)) ? -1 : 1)[0] || null;
}

function competeIsKing(player, key) {
  if (!player) return false;
  const king = competeKing(key, competeGroup(player));
  return !!(king && king.id === player.id);
}

function competeAwards() {
  const pool = competeRoster().slice();
  const used = new Set();
  const take = (list) => {
    const pick = list.find((p) => p && !used.has(p.id));
    if (pick) used.add(pick.id);
    return pick || null;
  };
  const byExit = competeSorted("exitVelo");
  const bySpeed = competeSorted("tenYard");
  const byJump = competeSorted("broadJump");
  const byStreak = pool.slice().sort((a, b) => ((b.road && b.road.streaks && b.road.streaks.training) || 0) - ((a.road && a.road.streaks && a.road.streaks.training) || 0));
  const byGain = pool.slice().sort((a, b) => competeExitDelta(b, 30) - competeExitDelta(a, 30));
  const byXp = pool.slice().sort((a, b) => ((b.road && b.road.xp) || 0) - ((a.road && a.road.xp) || 0));
  return [
    { id: "power", name: "Power King", icon: "💥", tip: "Highest exit velo in the facility.", player: take(byExit) },
    { id: "speed", name: "Speed King", icon: "⚡", tip: "Fastest 10-yard in the facility.", player: take(bySpeed) },
    { id: "improved", name: "Most Improved", icon: "📈", tip: "Biggest exit-velo gain this month, after the power leader.", player: take(byGain) },
    { id: "iron", name: "Iron Man", icon: "🧱", tip: "Longest current training streak.", player: take(byStreak) },
    { id: "worker", name: "Hardest Worker", icon: "🛠️", tip: "Most XP banked. Development, not just the test.", player: take(byXp) },
    { id: "jump", name: "Broad Jump", icon: "🦘", tip: "Longest standing broad jump. Not part of overall.", player: take(byJump) },
    { id: "potw", name: "Player of the Week", icon: "⭐", tip: "Training days this week. Spread so one star does not take the row.", player: take(byStreak) },
    { id: "potm", name: "Player of the Month", icon: "🗓️", tip: "A permanent monthly card. This month's development pick.", player: take(byGain) },
  ].filter((row) => row.player);
}

function competePlayerAwards(player) {
  return competeAwards().filter((row) => row.player && player && row.player.id === player.id);
}

function competeAchievements(player) {
  const exit = competeNum(player, "exitVelo") || 0;
  const bat = competeNum(player, "batSpeed") || 0;
  const prs = (player.road && player.road.prs) || 0;
  const streak = (player.road && player.road.streaks && player.road.streaks.training) || 0;
  const sessions = ((player.road && player.road.dates && player.road.dates.training) || []).length;
  const defs = [
    { id: "first-pr", name: "First PR", icon: "🏅", hidden: false, on: prs >= 1 },
    { id: "ev70", name: "70 MPH Exit", icon: "💥", hidden: false, on: exit >= 70 },
    { id: "ev80", name: "80 Club", icon: "💥", hidden: false, on: exit >= 80 },
    { id: "ev90", name: "90 Club", icon: "💎", hidden: false, on: exit >= 90 },
    { id: "ev100", name: "100 Club", icon: "👑", hidden: true, on: exit >= 100 },
    { id: "bat60", name: "60 MPH Bat Speed", icon: "🪵", hidden: false, on: bat >= 60 },
    { id: "bat70", name: "70 MPH Bat Speed", icon: "🪵", hidden: true, on: bat >= 70 },
    { id: "sessions50", name: "50 Sessions", icon: "📅", hidden: false, on: sessions >= 50 },
    { id: "sessions100", name: "100 Sessions", icon: "📅", hidden: true, on: sessions >= 100 },
    { id: "streak30", name: "30-day Streak", icon: "🔥", hidden: false, on: streak >= 30 },
    { id: "king", name: "King of the Hill", icon: "👑", hidden: false, on: competeIsKing(player, "exitVelo") || competeIsKing(player, "tenYard") },
    { id: "five-pr", name: "Five-PR Season", icon: "🎯", hidden: true, on: prs >= 5 },
  ];
  const hiddenLeft = defs.filter((d) => d.hidden && !d.on).length;
  const shown = defs.filter((d) => d.on || !d.hidden);
  shown.hiddenLeft = hiddenLeft;
  return shown;
}

function competeCardOfDay() {
  const list = competeRoster();
  if (!list.length) return null;
  const day = competeToday();
  let n = 0;
  for (let i = 0; i < day.length; i++) n += day.charCodeAt(i);
  const reasons = [
    { id: "streak", text: "Longest live training streak." },
    { id: "gain", text: "Biggest exit-velo gain this month." },
    { id: "pr", text: "Personal bests on the card." },
    { id: "random", text: "Card of the day." },
  ];
  const reason = reasons[n % reasons.length];
  let player = list[n % list.length];
  if (reason.id === "streak") player = list.slice().sort((a, b) => ((b.road && b.road.streaks && b.road.streaks.training) || 0) - ((a.road && a.road.streaks && a.road.streaks.training) || 0))[0];
  if (reason.id === "gain") player = list.slice().sort((a, b) => competeExitDelta(b, 30) - competeExitDelta(a, 30))[0];
  if (reason.id === "pr") player = list.slice().sort((a, b) => ((b.road && b.road.prs) || 0) - ((a.road && a.road.prs) || 0))[0];
  return { player: player, reason: reason.text };
}

function competeRival(player) {
  if (!player || !player.road || !player.road.rivalry) return null;
  const peers = competeRoster().filter((p) => p.id !== player.id && competeGroup(p) === competeGroup(player));
  let best = null;
  COMPETE_METRICS.forEach((spec) => {
    const mine = competeNum(player, spec.key);
    if (mine == null) return;
    peers.forEach((other) => {
      const theirs = competeNum(other, spec.key);
      if (!competeGapOk(spec.key, mine, theirs)) return;
      const abs = Math.abs(theirs - mine);
      const rel = abs / Math.max(Math.abs(mine), 0.001);
      if (!best || rel < best.rel) {
        best = {
          other: other,
          spec: spec,
          mine: mine,
          theirs: theirs,
          abs: Math.round(abs * 100) / 100,
          rel: rel,
          iLead: competeLead(spec, mine, theirs),
        };
      }
    });
  });
  return best;
}

function competeRivalLine(rival) {
  if (!rival) return "No teammate is close enough for a rivalry alert.";
  const unit = rival.spec.unit;
  const label = rival.spec.label;
  const name = rival.other.name;
  const n = rival.abs;
  if (rival.mine === rival.theirs) return "Tied with " + name + " in " + label + ".";
  if (rival.iLead) return "WATCH YOUR BACK · you lead " + name + " by " + n + " " + unit + " in " + label + ".";
  return "RIVAL ALERT · " + n + " " + unit + " behind " + name + " in " + label + ".";
}

function competeRecords(player, key) {
  const spec = COMPETE_METRICS.find((m) => m.key === (key || "exitVelo")) || { key: "exitVelo", label: "Exit Velo", unit: "MPH", better: "higher" };
  const age = player ? Number(player.age) : 0;
  const rows = [];
  COMPETE_BOOK.filter((row) => row.age === age && row.key === spec.key).forEach((row) => {
    rows.push({ name: row.name, value: row.value, alumni: true });
  });
  competeRoster().forEach((p) => {
    if (Number(p.age) !== age) return;
    const value = competeNum(p, spec.key);
    if (value == null) return;
    rows.push({ name: p.name, id: p.id, value: value });
  });
  rows.sort((a, b) => spec.better === "lower" ? a.value - b.value : b.value - a.value);
  const rank = rows.findIndex((row) => player && row.id === player.id);
  return { age: age, spec: spec, board: rows.slice(0, 8), rank: rank >= 0 ? rank + 1 : null };
}

function competeCrowns(key, scope) {
  const facility = competeFacility();
  const slot = (scope || "all") + ":" + key;
  if (!facility.crownDays[slot] && scope === "16U" && key === "exitVelo") {
    facility.crownDays[slot] = {
      holder: "sample-jake-ellis",
      since: "2026-10-14",
      totals: { "sample-jack-morales": 9, "sample-eli-ramirez": 4 },
    };
    DataLayer.saveFacility(facility);
  }
  if (!facility.crownDays[slot]) facility.crownDays[slot] = { holder: null, since: competeToday(), totals: {} };
  const row = facility.crownDays[slot];
  const king = competeKing(key, scope);
  const today = competeToday();
  if (king && row.holder && row.holder !== king.id) {
    const held = Math.max(1, Math.round((new Date(today) - new Date(row.since)) / 86400000));
    row.totals[row.holder] = (row.totals[row.holder] || 0) + held;
    DataLayer.notify(king.id, "new-king", "NEW KING · " + key + ", " + scope + ".");
    DataLayer.notify(row.holder, "crown-taken", "The crown moved.");
    row.holder = king.id;
    row.since = today;
    DataLayer.saveFacility(facility);
  } else if (king && !row.holder) {
    row.holder = king.id;
    row.since = today;
  }
  const soFar = row.since ? Math.max(0, Math.round((new Date(today) - new Date(row.since)) / 86400000)) : 0;
  const board = Object.keys(row.totals || {}).map((id) => ({
    id: id,
    days: (row.totals[id] || 0) + (id === (king && king.id) ? soFar : 0),
  }));
  if (king && !board.some((item) => item.id === king.id)) board.push({ id: king.id, days: soFar });
  board.sort((a, b) => b.days - a.days);
  return { king: king, board: board, days: king ? soFar : 0 };
}

function competeTimeline(player) {
  const rows = (player.road && player.road.timeline) ? player.road.timeline.slice() : [];
  const log = typeof roadSeries === "function" ? roadSeries(player, "exitVelo") : [];
  const first70 = log.find((row) => Number(row.value) >= 70);
  if (first70) rows.push({ at: String(first70.at).slice(0, 10), text: "First 70 MPH exit velo." });
  const cards = player.cardCollection || [];
  cards.forEach((card) => rows.push({ at: String(card.archivedAt || card.seasonLabel || "").slice(0, 10), text: "Retired " + (card.seasonLabel || "") + " " + (card.ageGroup || "") + " card at " + card.overall + "." }));
  rows.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return rows;
}

function competeCardClass(player) {
  const chem = competeChemistry(player);
  return chem.perfect ? "is-perfect" : chem.glow ? "is-chem" : "";
}

function competeMarks(player) {
  const bits = [];
  if (competeIsKing(player, "exitVelo") || competeIsKing(player, "tenYard") || competeIsKing(player, "broadJump")) bits.push("<span class=\"crown-mark\" title=\"King of the Hill\">👑</span>");
  const awards = competePlayerAwards(player).slice(0, 2);
  if (awards.length) {
    const tip = awards.map((a) => a.name + " — " + a.tip).join(" · ");
    bits.push("<span class=\"award-pin\" tabindex=\"0\">" + awards.map((a) => a.icon).join(" ") + "<span class=\"award-tip\" role=\"tooltip\">" + competeEsc(tip) + "</span></span>");
  }
  const reacts = ((competeFacility().reactions || {})[player.id] || []).map((r) => r.emoji);
  if (reacts.length) bits.push("<span class=\"react-mark\">" + reacts.slice(-4).join(" ") + "</span>");
  return bits.join("");
}

function competeDaysLeft(deadline) {
  const a = String(competeToday()).slice(0, 10).split("-").map(Number);
  const b = String(deadline || competeToday()).slice(0, 10).split("-").map(Number);
  const from = Date.UTC(a[0], a[1] - 1, a[2]);
  const to = Date.UTC(b[0], b[1] - 1, b[2]);
  return Math.round((to - from) / 86400000);
}

function competeClaim(player, key, amount, note) {
  const facility = competeFacility();
  const id = player.id + ":" + key;
  if (facility.claims[id]) return;
  facility.claims[id] = competeToday();
  DataLayer.saveFacility(facility);
  if (amount && typeof roadAward === "function") roadAward(player, amount, key);
  if (note) DataLayer.notify(player.id, key, note);
  if (!player.road.trophies) player.road.trophies = [];
  player.road.trophies.push({ id: key, at: competeToday(), note: note || key });
  if (typeof savePlayers === "function") savePlayers();
}

function competeSettle() {
  const facility = competeFacility();
  const today = competeToday();
  facility.challenges.forEach((ch) => {
    if (ch.status !== "accepted" || ch.deadline >= today) return;
    const a = competeRoster().find((p) => p.id === ch.from);
    const b = competeRoster().find((p) => p.id === ch.to);
    if (!a || !b) return;
    const winner = competeBetter(ch.metric, competeNum(a, ch.metric), competeNum(b, ch.metric)) ? a : b;
    ch.status = "done";
    ch.winner = winner.id;
    if (!winner.road.trophies) winner.road.trophies = [];
    winner.road.trophies.push({ id: "challenge-" + ch.id, at: today, note: "Won the " + ch.metric + " challenge." });
    DataLayer.notify(winner.id, "challenge-win", "Challenge won. Trophy is in the case.");
    DataLayer.notify(winner.id === a.id ? b.id : a.id, "challenge-loss", "Challenge closed. The trophy went the other way. Next rep.");
  });
  DataLayer.saveFacility(facility);
}

function competePaint() {
  const mount = document.getElementById("competeHome");
  if (!mount || typeof roadSignedIn !== "function") return;
  const me = roadSignedIn();
  if (!me) { mount.innerHTML = ""; return; }
  roadEnsure(me);
  const quest = competeWeekQuest(me);
  const month = competeMonthQuest(me);
  const event = competeEvent();
  const points = competeEventPoints(me);
  const team = competeTeamChallenge(competeTeam(me));
  const chem = competeChemistry(me);
  const cotd = competeCardOfDay();
  const rival = competeRival(me);
  const boards = ["exitVelo", "batSpeed", "tenYard", "throwVelo", "broadJump"].map((key) => {
    const spec = COMPETE_METRICS.find((m) => m.key === key) || { label: key, unit: "" };
    const rows = competeSorted(key).slice(0, 5).map((p, i) => "<div class=\"lb-row\"><span>" + (i + 1) + ". " + competeEsc(p.name) + "</span><b>" + competeNum(p, key) + " " + spec.unit + "</b></div>").join("");
    return "<div class=\"trophy-card\"><h3>" + spec.label + "</h3>" + rows + "</div>";
  }).join("");
  const improved = competeRoster().slice().sort((a, b) => competeExitDelta(b, 30) - competeExitDelta(a, 30)).slice(0, 5);
  const awards = competeAwards().map((row) => "<div class=\"award-row\" tabindex=\"0\"><span>" + row.icon + " " + competeEsc(row.name) + "</span><b>" + competeEsc(row.player.name.split(" ")[0]) + "</b><span class=\"award-tip\" role=\"tooltip\">" + competeEsc(row.tip) + "</span></div>").join("");
  const facility = competeFacility();
  const incoming = facility.challenges.filter((ch) => ch.to === me.id && ch.status === "pending");
  const mine = facility.challenges.filter((ch) => (ch.from === me.id || ch.to === me.id) && ch.status === "accepted");
  const incomingHTML = incoming.map((ch) => {
    const from = competeRoster().find((p) => p.id === ch.from);
    return "<div class=\"lb-row\"><span>" + competeEsc(from ? from.name : "Teammate") + " challenged your " + competeEsc(ch.metric) + " · due " + competeEsc(ch.deadline) + "</span><span><button class=\"btn btn-red\" type=\"button\" data-accept=\"" + competeEsc(ch.id) + "\">Accept</button> <button class=\"btn btn-ghost\" type=\"button\" data-decline=\"" + competeEsc(ch.id) + "\">Decline</button></span></div>";
  }).join("");
  const h2h = mine.map((ch) => {
    const a = competeRoster().find((p) => p.id === ch.from);
    const b = competeRoster().find((p) => p.id === ch.to);
    const spec = COMPETE_METRICS.find((m) => m.key === ch.metric) || { label: ch.metric, unit: "" };
    const left = competeDaysLeft(ch.deadline);
    return "<div class=\"h2h\"><div><b>" + (a ? competeNum(a, ch.metric) : "—") + "</b><div>" + competeEsc(a ? a.name : "") + "</div></div><div class=\"h2h-mid\"><span>HEAD TO HEAD</span><strong>" + competeEsc(spec.label) + "</strong><small>" + left + " DAYS LEFT</small></div><div><b>" + (b ? competeNum(b, ch.metric) : "—") + "</b><div>" + competeEsc(b ? b.name : "") + "</div></div></div>";
  }).join("");
  const options = competeRoster().filter((p) => p.id !== me.id).map((p) => "<option value=\"" + competeEsc(p.id) + "\">" + competeEsc(p.name) + "</option>").join("");
  const metrics = COMPETE_METRICS.map((m) => "<option value=\"" + m.key + "\">" + m.label + "</option>").join("");
  const card = cotd && typeof cardHTML === "function" ? "<div class=\"mini-card\">" + cardHTML(cotd.player, true) + "</div>" : "";
  const crowns = competeCrowns("exitVelo", competeGroup(me));
  const king = crowns.king;
  const crownRows = crowns.board.map((row) => {
    const who = competeRoster().find((p) => p.id === row.id);
    return "<div class=\"lb-row\"><span>" + competeEsc(who ? who.name : "Alumni") + "</span><b>" + row.days + " days</b></div>";
  }).join("");
  const rivalLine = me.road.rivalry ? competeRivalLine(rival) : "Rivalries are off. Turn them on if you want the chase.";
  const h2hBlock = h2h || "<div class=\"h2h\"><div><b>—</b><div>You</div></div><div class=\"h2h-mid\"><span>HEAD TO HEAD</span><strong>No live challenge</strong></div><div><b>—</b><div>Teammate</div></div></div>";
  mount.innerHTML = "<div class=\"compete-stack\">" +
    "<div class=\"compete-board\" id=\"challengeBoard\"><p class=\"compete-kicker\">HEAD TO HEAD</p><div id=\"h2hBoard\">" + h2hBlock + "</div>" +
    (incomingHTML ? "<p class=\"compete-kicker\">INCOMING</p>" + incomingHTML : "<p>No pending challenges.</p>") +
    "<div class=\"road-actions\"><select id=\"chWho\">" + options + "</select><select id=\"chMetric\">" + metrics + "</select><input id=\"chDeadline\" type=\"date\" value=\"" + competeToday() + "\"><button class=\"btn btn-red\" type=\"button\" id=\"chSend\">Challenge</button></div></div>" +
    "<div class=\"compete-board lb-board\"><p class=\"compete-kicker\">LEADERBOARD</p><div class=\"trophy-grid\">" + boards + "</div>" +
    "<h3>Most improved this month</h3>" + improved.map((p, i) => "<div class=\"lb-row\"><span>" + (i + 1) + ". " + competeEsc(p.name) + "</span><b>" + (competeExitDelta(p, 30) > 0 ? "+" : "") + (Math.round(competeExitDelta(p, 30) * 10) / 10) + " MPH</b></div>").join("") +
    "<h3>Awards</h3>" + awards +
    "<p class=\"compete-kicker\">KING OF THE HILL · " + competeEsc(competeGroup(me)) + " EXIT</p><p class=\"king-line\">" + (king ? "👑 " + competeEsc(king.name) + " · " + crowns.days + " days on the throne" : "—") + "</p>" +
    "<h3>Days holding the crown</h3>" + crownRows +
    "</div>" +
    "<div class=\"compete-board cotd-board\"><p class=\"compete-kicker\">CARD OF THE DAY</p><div class=\"cotd\">" + card + "<div class=\"cotd-copy\"><h3>" + competeEsc(cotd ? cotd.player.name : "") + "</h3><p>" + competeEsc(cotd ? cotd.reason : "") + "</p></div></div></div>" +
    "<div class=\"compete-board quest-board\">" +
    "<h3>" + quest.name + "</h3><p>" + quest.detail + "</p><div class=\"road-track\"><span style=\"width:" + Math.min(100, Math.round((quest.progress / quest.target) * 100)) + "%\"></span></div><p>" + quest.progress + " / " + quest.target + "</p>" +
    "<h3>" + month.name + "</h3><p>" + month.detail + " · " + month.progress + " MPH</p>" +
    "<h3>" + event.name + "</h3><p>" + event.blurb + " · " + points + " event points. The event card does not come back.</p>" +
    "<h3>" + team.name + "</h3><p>" + team.detail + " · " + team.team + "</p><div class=\"road-track\"><span style=\"width:" + Math.min(100, Math.round((team.progress / team.target) * 100)) + "%\"></span></div><p>" + team.progress + " / " + team.target + "</p>" +
    "<p>Team chemistry " + chem.pct + "% · " + (chem.perfect ? "PERFECT TEAM WEEK" : chem.glow ? "Chemistry glow is on." : "70% of the team trains and the cards glow.") + "</p>" +
    "<p class=\"coach-line\">" + competeEsc(rivalLine) + "</p>" +
    "<label><input id=\"rivalToggle\" type=\"checkbox\"" + (me.road.rivalry ? " checked" : "") + (roadCanEdit(me) ? "" : " disabled") + "> Opt in to rivalries</label></div></div>";
  const toggle = document.getElementById("rivalToggle");
  if (toggle) toggle.addEventListener("change", () => {
    me.road.rivalry = toggle.checked;
    if (typeof savePlayers === "function") savePlayers();
    competePaint();
  });
  mount.querySelectorAll("[data-accept]").forEach((btn) => btn.addEventListener("click", () => competeAnswer(btn.dataset.accept, "accepted")));
  mount.querySelectorAll("[data-decline]").forEach((btn) => btn.addEventListener("click", () => competeAnswer(btn.dataset.decline, "declined")));
  const send = document.getElementById("chSend");
  if (send) send.addEventListener("click", () => {
    const facilityNow = competeFacility();
    const deadline = document.getElementById("chDeadline").value || competeToday();
    const max = typeof roadAddDays === "function" ? roadAddDays(competeToday(), 31) : deadline;
    facilityNow.challenges.push({
      id: "ch-" + Date.now().toString(36),
      from: me.id,
      to: document.getElementById("chWho").value,
      metric: document.getElementById("chMetric").value,
      deadline: deadline > max ? max : deadline,
      status: "pending",
      at: competeToday(),
    });
    DataLayer.saveFacility(facilityNow);
    DataLayer.notify(document.getElementById("chWho").value, "challenge", me.name.split(" ")[0] + " challenged you. Accept or decline.");
    competePaint();
  });
  const claimRow = (done, id, amount, label) => (done && !facility.claims[me.id + ":" + id]) ? "<button class=\"btn btn-red\" type=\"button\" data-claim=\"" + id + "\" data-amount=\"" + amount + "\">" + label + "</button>" : "";
  mount.insertAdjacentHTML("beforeend", "<div class=\"road-actions\">" +
    claimRow(month.done, "month-" + competeToday().slice(0, 7), 750, "Claim Power Surge +750 XP") +
    claimRow(quest.progress >= quest.target, "week-" + competeMonday(competeToday()) + "-" + quest.id, 300, "Claim " + quest.name + " +300 XP") +
    claimRow(points >= 80, "event-" + event.id + "-" + competeToday().slice(0, 4), 0, "Claim " + event.name + " card") +
    "</div>");
  mount.querySelectorAll("[data-claim]").forEach((btn) => btn.addEventListener("click", () => {
    competeClaim(me, btn.dataset.claim, Number(btn.dataset.amount) || 0, btn.textContent);
  }));
}

function competeAnswer(id, status) {
  const facility = competeFacility();
  const ch = facility.challenges.find((row) => row.id === id);
  if (!ch) return;
  ch.status = status;
  DataLayer.saveFacility(facility);
  DataLayer.notify(ch.from, "challenge-" + status, "Your challenge was " + status + ".");
  competePaint();
}

function competeProfileHTML(player) {
  const awards = competePlayerAwards(player).map((a) => "<div class=\"trophy-card\" tabindex=\"0\"><b>" + a.icon + " " + competeEsc(a.name) + "</b><p>" + competeEsc(a.tip) + "</p><span class=\"award-tip\" role=\"tooltip\">" + competeEsc(a.tip) + "</span></div>").join("") || "<p>No hardware yet. The month is still open.</p>";
  const defs = competeAchievements(player);
  const ach = defs.map((a) => "<div class=\"trophy-card" + (a.on ? "" : " locked-ach") + "\"><b>" + (a.on ? a.icon + " " + competeEsc(a.name) : "Locked") + "</b></div>").join("");
  const hiddenNote = defs.hiddenLeft ? "<p>" + defs.hiddenLeft + " hidden badges stay invisible until they are earned.</p>" : "";
  const reactions = (competeFacility().reactions[player.id] || []).map((r) => r.emoji).join(" ") || "No reactions yet.";
  const viewer = typeof roadSignedIn === "function" ? roadSignedIn() : null;
  const reactBtns = viewer && viewer.id !== player.id ? COMPETE_REACTIONS.map((emoji) => "<button class=\"react-btn\" type=\"button\" data-react=\"" + emoji + "\">" + emoji + "</button>").join(" ") : "<p>Reactions are for teammates. Switch signed-in player to leave one.</p>";
  const timeline = competeTimeline(player).map((row) => "<li><b>" + competeEsc(row.at) + "</b><span>" + competeEsc(row.text) + "</span></li>").join("");
  const records = competeRecords(player, "exitVelo");
  const board = records.board.map((row, i) => "<div class=\"lb-row\"><span>" + (i + 1) + ". " + competeEsc(row.name) + (row.alumni ? " · alumni" : "") + "</span><b>" + row.value + " " + records.spec.unit + "</b></div>").join("");
  const ages = ((player.road && player.road.ageCards) || []).map((card) => "<article class=\"age-card\"><b>" + card.overall + "</b><span>AGE " + card.age + "</span><small>" + competeEsc(card.season || "") + "</small></article>").join("");
  const ageNote = ages ? "<p class=\"coach-line\">A lower overall on an older age card means the standard for that age was different. It does not mean the player got worse.</p>" : "";
  const alumni = COMPETE_ALUMNI.map((a) => "<div class=\"trophy-card\"><b>" + competeEsc(a.name) + " · " + competeEsc(a.pos) + "</b><p>" + competeEsc(a.start) + " → " + competeEsc(a.end) + "</p><p>" + competeEsc(a.college) + " · final card " + a.ovr + "</p></div>").join("");
  const evos = ((player.road && player.road.evolutions) || []).map((m) => "<button type=\"button\" class=\"btn btn-ghost\" data-replay-evo=\"" + competeEsc(m.id) + "\">Replay " + competeEsc(m.toTier) + "</button>").join(" ") || "<p>No evolution yet. Cross a tier and the replay lands here.</p>";
  const trophies = ((player.road && player.road.trophies) || []).map((t) => "<div class=\"lb-row\"><span>" + competeEsc(t.at) + "</span><b>" + competeEsc(t.note) + "</b></div>").join("") || "<p>Win a challenge, a quest, or an event and it lands here.</p>";
  const you = records.rank ? "<p class=\"rank-line\">YOU ARE #" + records.rank + " ALL-TIME</p><p>Age " + records.age + " · " + competeEsc(records.spec.label) + ", inside this facility.</p>" : "";
  return "<div class=\"panel compete-board\" id=\"trophyCase\"><h3>My trophy case</h3><div class=\"trophy-grid\">" + awards + "</div><h3>Achievements</h3><div class=\"trophy-grid\">" + ach + "</div>" + hiddenNote +
    "<h3>Evolutions</h3><div class=\"road-actions\">" + evos + "</div><h3>Quests, events, challenges</h3>" + trophies +
    "<h3>Reactions</h3><p class=\"react-row\">" + reactions + "</p><div class=\"road-actions\">" + reactBtns + "</div>" +
    "<h3>Career card collection</h3><div class=\"age-row\">" + (ages || "<p>No age cards yet.</p>") + "</div>" + ageNote +
    "<h3>Career timeline</h3><ol class=\"story\">" + timeline + "</ol>" +
    "<h3>Antonelli records · age " + records.age + "</h3>" + you + board +
    "<h3>Antonelli legends</h3><div class=\"trophy-grid\">" + alumni + "</div></div>";
}

function competeWire(player) {
  const mount = document.querySelector("[data-panel=\"road\"]");
  if (!mount) return;
  if (!mount.querySelector("#trophyCase")) mount.insertAdjacentHTML("beforeend", competeProfileHTML(player));
  const box = mount.querySelector("#trophyCase");
  if (!box || box.dataset.wired) return;
  box.dataset.wired = "1";
  box.querySelectorAll("[data-replay-evo]").forEach((btn) => btn.addEventListener("click", () => {
    const moment = (player.road.evolutions || []).find((m) => m.id === btn.dataset.replayEvo);
    if (moment && typeof roadPlayEvolution === "function") roadPlayEvolution(player, moment);
  }));
  box.querySelectorAll("[data-react]").forEach((btn) => btn.addEventListener("click", () => {
    const me = typeof roadSignedIn === "function" ? roadSignedIn() : null;
    if (!me || me.id === player.id) return;
    const facility = competeFacility();
    if (!facility.reactions[player.id]) facility.reactions[player.id] = [];
    const today = competeToday();
    if (facility.reactions[player.id].some((r) => r.from === me.id && r.at === today && r.emoji === btn.dataset.react)) return;
    facility.reactions[player.id].push({ from: me.id, emoji: btn.dataset.react, at: today });
    facility.reactions[player.id] = facility.reactions[player.id].slice(-12);
    DataLayer.saveFacility(facility);
    DataLayer.notify(player.id, "reaction", me.name.split(" ")[0] + " reacted " + btn.dataset.react + " on your card.");
    const old = mount.querySelector("#trophyCase");
    if (old) old.remove();
    competeWire(player);
  }));
}

function competeBoot() {
  if (competeBoot.done) return;
  competeBoot.done = true;
  competeSettle();
  const me = typeof roadSignedIn === "function" ? roadSignedIn() : null;
  if (!me) return;
  const rival = competeRival(me);
  if (rival && !rival.iLead) DataLayer.notify(me.id, "rival", "RIVAL ALERT · " + rival.abs + " " + rival.spec.unit + " behind " + rival.other.name + " in " + rival.spec.label + ".");
  if (rival && rival.iLead && rival.other.road && rival.other.road.rivalry) DataLayer.notify(rival.other.id, "rival-back", "WATCH YOUR BACK · " + me.name.split(" ")[0] + " is " + rival.abs + " " + rival.spec.unit + " behind you in " + rival.spec.label + ".");
  const team = competeTeamChallenge(competeTeam(me));
  const left = Math.round((team.target - team.progress) * 10) / 10;
  if (left > 0 && left <= 8) DataLayer.notify(me.id, "team-close", "The team is " + left + " MPH from the power challenge.");
  const king = competeKing("exitVelo", competeGroup(me));
  const facility = competeFacility();
  const slot = competeGroup(me) + ":exitVelo";
  if (king && facility.kings[slot] && facility.kings[slot] !== king.id) {
    DataLayer.notify(king.id, "new-king", "NEW KING · exit velo, " + competeGroup(me) + ".");
    DataLayer.notify(facility.kings[slot], "crown-taken", "The exit-velo crown moved.");
  }
  if (king) facility.kings[slot] = king.id;
  DataLayer.saveFacility(facility);
  if (typeof roadPaintChrome === "function") roadPaintChrome();
}

globalThis.competeCardClass = competeCardClass;
globalThis.competeMarks = competeMarks;
globalThis.competePaint = competePaint;
globalThis.competeWire = competeWire;
globalThis.competeBoot = competeBoot;
globalThis.competeAwards = competeAwards;
