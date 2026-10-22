/* ROAD TO 99 — participation loop beside the baseball card.
   Overall stays a pure test grade. Level and Card Evolution are separate.
   A later model can replace RoadCoach.compose without moving the screens. */

var ROAD_XP = {
  training: 100,
  assignment: 40,
  pr: 250,
  weekly: 300,
  monthly: 750,
  streak5: 150,
  team: 500,
  dailyAll: 125,
  minigame: 20,
  minigameCap: 80,
};

var ROAD_MISSIONS = [
  { id: "dry", label: "25 dry swings", gear: "Bat or broom" },
  { id: "med", label: "20 med-ball throws", gear: "Med ball" },
  { id: "push", label: "20 push-ups", gear: "Bodyweight" },
  { id: "sit", label: "30 sit-ups", gear: "Bodyweight" },
  { id: "mob", label: "5-min mobility", gear: "Floor space" },
  { id: "tee", label: "10 min tee work", gear: "Tee and balls" },
  { id: "glove", label: "25 glove transfers", gear: "Glove" },
  { id: "catch", label: "Play catch", gear: "Partner or wall" },
  { id: "sprint", label: "Sprint workout", gear: "Open space" },
  { id: "viz", label: "Visualization", gear: "Quiet spot" },
  { id: "watch", label: "Watch a training video", gear: "Phone" },
  { id: "mind", label: "Mental performance exercise", gear: "Quiet spot" },
  { id: "mini", label: "Training mini-game", gear: "Phone", xp: "minigame" },
];

var ROAD_QUOTES = [
  "Confidence comes from evidence. Go earn some today.",
  "The card only moves when you do.",
  "Stack a day. Then stack another.",
  "Speed is a decision you make in the first step.",
  "A good swing is a repeatable swing.",
  "The benchmark does not care about yesterday's excuse.",
  "Train like the test is tomorrow.",
  "Small gains, kept, become a different player.",
];

function roadClamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

function roadToday() {
  if (typeof todayStamp === "function") return todayStamp();
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function roadPrettyDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!match) return String(value || "");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[Number(match[2]) - 1] || match[2];
  const day = String(Number(match[3]));
  const year = Number(match[1]);
  const nowY = (typeof nowDate === "function" ? nowDate() : new Date()).getFullYear();
  return year === nowY ? (month + " " + day) : (month + " " + day + ", " + year);
}

function roadAddDays(stamp, days) {
  const p = String(stamp || roadToday()).slice(0, 10).split("-");
  const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  d.setDate(d.getDate() + days);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function roadLevelSpan(level) {
  return 400 + (Math.max(1, level) - 1) * 100;
}

function roadLevelFromXp(xp) {
  let level = 1;
  let into = Math.max(0, Math.floor(Number(xp) || 0));
  const total = into;
  while (level < 99) {
    const span = roadLevelSpan(level);
    if (into < span) return { level, into, span, remain: span - into, xp: total };
    into -= span;
    level += 1;
  }
  const span = roadLevelSpan(99);
  return { level: 99, into: span, span, remain: 0, xp: total };
}

function roadLevel(player) {
  const xp = player && player.road ? player.road.xp : 0;
  return roadLevelFromXp(xp);
}

function roadEnsure(player) {
  if (!player.road || typeof player.road !== "object") player.road = {};
  const r = player.road;
  if (typeof r.xp !== "number") r.xp = 0;
  if (!r.streaks) r.streaks = {};
  ["training", "checkin", "improvement", "goal"].forEach((k) => { if (typeof r.streaks[k] !== "number") r.streaks[k] = 0; });
  if (!r.dates) r.dates = {};
  ["training", "checkin"].forEach((k) => { if (!Array.isArray(r.dates[k])) r.dates[k] = []; });
  if (!Array.isArray(r.missions)) r.missions = [];
  if (!Array.isArray(r.trainingLog)) r.trainingLog = [];
  if (!Array.isArray(r.evolutions)) r.evolutions = [];
  if (!Array.isArray(r.timeline)) r.timeline = [];
  if (!Array.isArray(r.videos)) r.videos = [];
  if (!r.links || typeof r.links !== "object") r.links = {};
  if (typeof r.prs !== "number") r.prs = 0;
  if (typeof r.challenges !== "number") r.challenges = 0;
  if (typeof r.signature !== "string") r.signature = "";
  if (typeof r.celebration !== "string") r.celebration = "";
  if (typeof r.bio !== "string") r.bio = "";
  if (typeof r.scoutingReport !== "string") r.scoutingReport = "";
  if (!Array.isArray(r.streakPaid)) r.streakPaid = [];
  return r;
}

function roadStreakCount(dates, today) {
  const set = new Set((dates || []).map((d) => String(d).slice(0, 10)));
  let cursor = today || roadToday();
  if (!set.has(cursor)) {
    const y = roadAddDays(cursor, -1);
    if (!set.has(y)) return 0;
    cursor = y;
  }
  let n = 0;
  while (set.has(cursor) && n < 400) {
    n += 1;
    cursor = roadAddDays(cursor, -1);
  }
  return n;
}

function roadImprovementRun(player) {
  const log = player && player.readingLog && player.readingLog.exitVelo;
  const rows = Array.isArray(log) ? log.slice().sort((a, b) => String(a.at).localeCompare(String(b.at))) : [];
  let run = 0;
  for (let i = rows.length - 1; i > 0; i--) {
    if (Number(rows[i].value) > Number(rows[i - 1].value)) run += 1;
    else break;
  }
  return run;
}

function roadIsHot(player) {
  if (!player) return false;
  const until = player.road && player.road.hotUntil;
  if (until && String(until).slice(0, 10) >= roadToday()) return true;
  return roadImprovementRun(player) >= 3;
}

function roadRefreshStreaks(player) {
  const r = roadEnsure(player);
  const today = roadToday();
  r.streaks.training = roadStreakCount(r.dates.training, today);
  r.streaks.checkin = roadStreakCount(r.dates.checkin, today);
  r.streaks.improvement = roadImprovementRun(player);
  if (r.streaks.improvement >= 3) {
    const next = roadAddDays(today, 7);
    if (!r.hotUntil || String(r.hotUntil) < next) r.hotUntil = next;
  }
  return r.streaks;
}

function roadDevBonus(player) {
  if (!player) return 0;
  const r = player.road || {};
  const lvl = roadLevelFromXp(r.xp || 0).level;
  const streaks = r.streaks || {};
  let bonus = 0;
  bonus += Math.min(8, lvl / 4);
  bonus += Math.min(6, (streaks.training || 0) / 3);
  bonus += Math.min(6, r.prs || 0);
  bonus += Math.min(4, r.challenges || 0);
  if (roadIsHot(player)) bonus += 4;
  return Math.min(24, bonus);
}

/* Neutral development equals overall, so a quiet card keeps its old tier.
   Bonus sits on top, capped, and Legend still requires a 90+ overall. */
function roadEvolution(player, overall) {
  const ovr = roadClamp(Math.round(Number(overall) || 20), 20, 99);
  const bonus = roadDevBonus(player);
  const dev = roadClamp(ovr + bonus, 20, 120);
  const score = Math.round((0.7 * ovr + 0.3 * dev) * 10) / 10;
  return { score, bonus: Math.round(bonus * 10) / 10, dev, overall: ovr };
}

function roadTierKey(score, overall) {
  const s = Number(score) || 0;
  const ovr = Number(overall) || 0;
  if (s >= 95) return ovr >= 90 ? "legend" : "diamond";
  if (s >= 90) return "diamond";
  if (s >= 80) return "gold";
  if (s >= 70) return "silver";
  return "bronze";
}

function roadTierNeed(overall, player) {
  const evo = roadEvolution(player, overall);
  const key = roadTierKey(evo.score, evo.overall);
  const next = { bronze: 70, silver: 80, gold: 90, diamond: 95 }[key];
  const label = { bronze: "Silver", silver: "Gold", gold: "Diamond", diamond: "Legend" }[key];
  if (!next) return "Legend. This is the top of the road. Overall still has to be earned in testing.";
  const gap = Math.max(0, Math.ceil((next - evo.score) * 10) / 10);
  let line = "Card Evolution " + evo.score.toFixed(1) + ". " + gap + " more points reaches " + label + " (" + next + ").";
  if (key === "diamond") line += " Legend also requires a 90+ overall. Training alone cannot make a Legend.";
  return line;
}

function roadFirstName(player) {
  return String(player && player.name || "Player").trim().split(/\s+/)[0];
}

function roadGreeting() {
  const h = (typeof nowDate === "function" ? nowDate() : new Date()).getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function roadQuote() {
  const day = roadToday();
  let n = 0;
  for (let i = 0; i < day.length; i++) n += day.charCodeAt(i);
  return ROAD_QUOTES[n % ROAD_QUOTES.length];
}

function roadHash(text) {
  let n = 0;
  const s = String(text || "");
  for (let i = 0; i < s.length; i++) n = (n * 33 + s.charCodeAt(i)) >>> 0;
  return n;
}

function roadPickMissions(seed) {
  const bag = ROAD_MISSIONS.slice();
  const ids = [];
  let n = roadHash(seed);
  while (ids.length < 4 && bag.length) {
    n = (n * 1664525 + 1013904223) >>> 0;
    const i = n % bag.length;
    ids.push(bag.splice(i, 1)[0].id);
  }
  return ids;
}

function roadMissionMeta(id) {
  if (id === "vision") return { id: "vision", label: "Featured vision drill", gear: "Phone", xp: "vision" };
  return ROAD_MISSIONS.find((m) => m.id === id) || { id, label: id, gear: "" };
}

function roadTodayMissions(player) {
  const r = roadEnsure(player);
  const today = roadToday();
  if (r.missionDay !== today || !r.missions.length) {
    const ids = Array.isArray(r.coachPlan) && r.coachPlan.length ? r.coachPlan.slice(0, 4) : roadPickMissions(player.id + today);
    r.missions = ids.map((id) => ({ id, done: false }));
    r.missionDay = today;
    r.dailyBonus = false;
  }
  if (!r.missions.some((m) => m.id === "vision")) r.missions.push({ id: "vision", done: false });
  return r.missions;
}

function roadSession() {
  return (globalThis.DataLayer && DataLayer.session) ? DataLayer.session() : { mode: "player", playerId: "sample-jack-morales", mute: true };
}

function roadSignedIn() {
  const session = roadSession();
  const list = (typeof players !== "undefined" && Array.isArray(players)) ? players : [];
  return list.find((p) => p.id === session.playerId) || list[0] || null;
}

function roadCanEdit(player) {
  if (!player) return false;
  const session = roadSession();
  if (session.mode === "coach") return true;
  return session.playerId === player.id;
}

function roadRoster() {
  return (typeof players !== "undefined" && Array.isArray(players)) ? players : [];
}

function roadPercentile(player, key) {
  if (!player || typeof activeAgeGroup !== "function") return null;
  const group = activeAgeGroup(player);
  const mine = player.metrics ? Number(player.metrics[key]) : NaN;
  if (!Number.isFinite(mine)) return null;
  const lowerBetter = key === "tenYard";
  const peers = roadRoster().filter((p) => activeAgeGroup(p) === group && p.metrics && Number.isFinite(Number(p.metrics[key])));
  if (peers.length < 2) return null;
  const worse = peers.filter((p) => lowerBetter ? Number(p.metrics[key]) > mine : Number(p.metrics[key]) < mine).length;
  return Math.round((worse / (peers.length - 1)) * 100);
}

function roadSeries(player, key) {
  const log = player && player.readingLog && player.readingLog[key];
  if (!Array.isArray(log)) return [];
  return log.slice().filter((row) => row && row.at && Number.isFinite(Number(row.value))).sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

function roadDelta(series, days) {
  if (!series.length) return null;
  const last = series[series.length - 1];
  if (days == null) {
    const first = series[0];
    return { from: Number(first.value), to: Number(last.value), delta: Number(last.value) - Number(first.value), fromAt: String(first.at).slice(0, 10), inWindow: true };
  }
  const cutoff = roadAddDays(String(last.at).slice(0, 10), -days);
  let prior = null;
  series.forEach((row) => { if (String(row.at).slice(0, 10) <= cutoff) prior = row; });
  if (!prior) prior = series[0];
  const fromAt = String(prior.at).slice(0, 10);
  const lastAt = String(last.at).slice(0, 10);
  return { from: Number(prior.value), to: Number(last.value), delta: Number(last.value) - Number(prior.value), fromAt, inWindow: fromAt >= roadAddDays(lastAt, -(days + 21)) };
}

function roadSeasonStart(player) {
  const label = player && player.currentSeason;
  const year = typeof seasonStartYear === "function" ? seasonStartYear(label) : null;
  return (year || 2026) + "-09-01";
}

function roadYearDelta(player, key) {
  const series = roadSeries(player, key);
  if (series.length < 2) return null;
  const start = roadSeasonStart(player);
  const inSeason = series.filter((row) => String(row.at).slice(0, 10) >= start);
  const rows = inSeason.length ? inSeason : series;
  return { from: Number(rows[0].value), to: Number(rows[rows.length - 1].value), delta: Number(rows[rows.length - 1].value) - Number(rows[0].value) };
}

var ROAD_CHART_HITTING = [
  { key: "exitVelo", label: "Exit Velo", unit: "MPH", better: "higher", digits: 1 },
  { key: "batSpeed", label: "Bat Speed", unit: "MPH", better: "higher", digits: 1 },
  { key: "tenYard", label: "Sprint", unit: "s", better: "lower", digits: 2 },
  { key: "throwVelo", label: "Throwing Velo", unit: "MPH", better: "higher", digits: 1 },
  { key: "broadJump", label: "Broad Jump", unit: "in", better: "higher", digits: 0 },
  { key: "vertical", label: "Vertical", unit: "in", better: "higher", digits: 0 },
  { key: "flying10", label: "Flying 10", unit: "s", better: "lower", digits: 2 },
  { key: "medBall", label: "Chest Pass", unit: "ft", better: "higher", digits: 1 },
  { key: "gripDominant", label: "Grip", unit: "lbs", better: "higher", digits: 0 },
];
var ROAD_CHART_PITCHING = [
  { key: "fastballVelo", label: "Fastball", unit: "MPH", better: "higher", digits: 1 },
  { key: "spinRate", label: "Spin", unit: "rpm", better: "higher", digits: 0 },
  { key: "strikePct", label: "Strike %", unit: "%", better: "higher", digits: 0 },
  { key: "whiffPct", label: "Whiff %", unit: "%", better: "higher", digits: 0 },
  { key: "pitchCapacity", label: "Capacity", unit: "pitches", better: "higher", digits: 0 },
];

function roadChartCatalog(player) {
  const type = player && player.type;
  const list = type === "pitcher" ? ROAD_CHART_PITCHING : (type === "hitter" ? ROAD_CHART_HITTING : ROAD_CHART_HITTING.concat(ROAD_CHART_PITCHING));
  return list.filter((spec) => {
    const current = player.metrics ? Number(player.metrics[spec.key]) : NaN;
    const hist = player.history && player.history[spec.key];
    const log = player.readingLog && player.readingLog[spec.key];
    return Number.isFinite(current) || (Array.isArray(hist) && hist.length) || (Array.isArray(log) && log.length);
  });
}

function roadFormatStat(spec, value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (spec.digits === 2) return n.toFixed(2);
  const rounded = Math.round(n * 10) / 10;
  if (spec.digits === 0 || Number.isInteger(rounded)) return String(Math.round(n));
  return rounded.toFixed(1);
}

function roadRoundStat(spec, value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return n;
  if (spec.digits === 2) return Math.round(n * 100) / 100;
  if (spec.digits === 0) return Math.round(n);
  return Math.round(n * 10) / 10;
}

function roadMonthShift(month, delta) {
  const parts = String(month || "2026-10").split("-");
  let y = Number(parts[0]);
  let m = Number(parts[1]) + delta;
  while (m <= 0) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return y + "-" + String(m).padStart(2, "0");
}

function roadMonthsEnding(endMonth, count) {
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) out.push(roadMonthShift(endMonth, -i));
  return out;
}

var ROAD_MONTH_SPAN = 6;

function roadSeedTrend(endValue, better, count) {
  const higher = better !== "lower";
  const mag = Math.abs(endValue);
  const step = mag >= 80 ? Math.max(1, Math.round(mag * 0.015)) : (mag >= 8 ? Math.max(0.4, Math.round(mag * 0.02 * 10) / 10) : 0.03);
  const values = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const raw = higher ? endValue - step * i : endValue + step * i;
    values.push(mag < 3 ? Math.round(raw * 100) / 100 : (mag < 20 ? Math.round(raw * 10) / 10 : Math.round(raw)));
  }
  values[values.length - 1] = endValue;
  return values;
}

function roadMonthIndex(month) {
  const parts = String(month).split("-");
  return Number(parts[0]) * 12 + Number(parts[1]) - 1;
}

function roadFillAxis(axis, known, spec) {
  const rows = [...known.entries()].filter((row) => Number.isFinite(row[1])).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (!rows.length) return [];
  return axis.map((month) => {
    const exact = rows.find((row) => row[0] === month);
    if (exact) return { month: month, value: exact[1] };
    let prev = null;
    let next = null;
    rows.forEach((row) => {
      if (row[0] < month) prev = row;
      else if (!next && row[0] > month) next = row;
    });
    let value = next ? next[1] : prev[1];
    if (prev && next) {
      const span = roadMonthIndex(next[0]) - roadMonthIndex(prev[0]);
      const t = span ? (roadMonthIndex(month) - roadMonthIndex(prev[0])) / span : 0;
      value = prev[1] + (next[1] - prev[1]) * t;
    } else if (prev) value = prev[1];
    return { month: month, value: roadRoundStat(spec, value) };
  });
}

function roadMonthlyPoints(player, spec) {
  const todayMonth = roadToday().slice(0, 7);
  const axis = roadMonthsEnding(todayMonth, ROAD_MONTH_SPAN);
  const real = new Map();
  roadSeries(player, spec.key).forEach((row) => {
    const month = String(row.at || "").slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(month)) real.set(month, Number(row.value));
  });
  const current = player.metrics ? Number(player.metrics[spec.key]) : NaN;
  if (real.size) {
    if (Number.isFinite(current)) {
      const latest = [...real.keys()].sort().pop();
      if (!latest || latest <= todayMonth) real.set(todayMonth, current);
    }
    return roadFillAxis(axis, real, spec);
  }
  const hist = Array.isArray(player.history && player.history[spec.key]) ? player.history[spec.key].map(Number).filter(Number.isFinite) : [];
  let values = hist.slice();
  if (Number.isFinite(current) && (!values.length || values[values.length - 1] !== current)) values.push(current);
  if (!Number.isFinite(values[values.length - 1])) return [];
  if (values.length > ROAD_MONTH_SPAN) values = values.slice(-ROAD_MONTH_SPAN);
  if (values.length < ROAD_MONTH_SPAN) {
    const need = ROAD_MONTH_SPAN - values.length;
    values = roadSeedTrend(values[0], spec.better, need + 1).slice(0, need).concat(values);
  }
  return axis.map((month, i) => ({ month: month, value: values[i] }));
}

function roadMonthLabel(month, withYear) {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = String(month).split("-");
  const name = names[Number(parts[1]) - 1] || parts[1];
  return withYear ? name + " '" + parts[0].slice(2) : name;
}

function roadChangeCall(spec, from, to) {
  const raw = to - from;
  const mag = roadFormatStat(spec, Math.abs(raw));
  if (Math.abs(raw) < 0.001) return { num: "0", unit: spec.unit, note: "no change", kind: "flat" };
  if (spec.better === "lower") return { num: mag, unit: spec.unit, note: raw < 0 ? "faster" : "slower", kind: raw < 0 ? "up" : "down" };
  return { num: (raw > 0 ? "+" : "−") + mag, unit: spec.unit, note: "", kind: raw > 0 ? "up" : "down" };
}

function roadMonthSVG(points, spec) {
  const w = 360;
  const h = 168;
  const left = 46;
  const right = 14;
  const top = 14;
  const bottom = 32;
  const vals = points.map((p) => p.value);
  let lo = Math.min.apply(null, vals);
  let hi = Math.max.apply(null, vals);
  const pad = (hi - lo) * 0.18 || Math.max(Math.abs(hi) * 0.04, spec.digits === 2 ? 0.04 : 1);
  lo -= pad;
  hi += pad;
  const span = hi - lo || 1;
  const innerW = w - left - right;
  const innerH = h - top - bottom;
  const xy = points.map((p, i) => {
    const x = points.length === 1 ? left + innerW / 2 : left + (i / (points.length - 1)) * innerW;
    const y = top + (1 - (p.value - lo) / span) * innerH;
    return { x: x, y: y };
  });
  const years = new Set(points.map((p) => p.month.slice(0, 4)));
  const withYear = years.size > 1;
  const ticks = [hi - pad, (lo + hi) / 2, lo + pad];
  const yLabels = ticks.map((tick) => {
    const y = top + (1 - (tick - lo) / span) * innerH;
    return "<text x=\"4\" y=\"" + y.toFixed(1) + "\" fill=\"#b7ad96\" font-size=\"11\" font-family=\"system-ui,sans-serif\">" + roadFormatStat(spec, tick) + "</text>";
  }).join("");
  const xLabels = points.map((p, i) => {
    return "<text x=\"" + xy[i].x.toFixed(1) + "\" y=\"" + (h - 8) + "\" text-anchor=\"middle\" fill=\"#d9d0b8\" font-size=\"11\" font-family=\"system-ui,sans-serif\">" + roadMonthLabel(p.month, withYear) + "</text>";
  }).join("");
  const line = xy.map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
  const dots = xy.map((p, i) => {
    const last = i === xy.length - 1;
    return "<circle cx=\"" + p.x.toFixed(1) + "\" cy=\"" + p.y.toFixed(1) + "\" r=\"" + (last ? 6 : 3.5) + "\" fill=\"" + (last ? "#fff" : "#f2d060") + "\" stroke=\"#f2d060\" stroke-width=\"" + (last ? 3 : 0) + "\"" + (last ? " class=\"is-now\"" : "") + "/>";
  }).join("");
  const grid = ticks.map((tick) => {
    const y = top + (1 - (tick - lo) / span) * innerH;
    return "<line x1=\"" + left + "\" y1=\"" + y.toFixed(1) + "\" x2=\"" + (w - right) + "\" y2=\"" + y.toFixed(1) + "\" stroke=\"rgba(212,175,55,.18)\"/>";
  }).join("");
  return "<svg class=\"month-svg\" viewBox=\"0 0 " + w + " " + h + "\" role=\"img\" aria-label=\"" + roadEsc(spec.label) + " by month\">" + grid + yLabels + xLabels +
    "<polyline fill=\"none\" stroke=\"#f2d060\" stroke-width=\"3\" stroke-linejoin=\"round\" stroke-linecap=\"round\" points=\"" + line + "\"/>" + dots + "</svg>";
}

function roadMonthCard(player, spec) {
  const points = roadMonthlyPoints(player, spec);
  if (points.length < 2) return "";
  const from = points[0].value;
  const to = points[points.length - 1].value;
  const change = roadChangeCall(spec, from, to);
  const note = change.note ? "<em>" + roadEsc(change.note) + "</em>" : "";
  return "<article class=\"month-chart\"><h3>" + roadEsc(spec.label) + "</h3><p class=\"month-unit\">" + roadEsc(spec.unit) + "</p>" +
    "<div class=\"month-facts\"><p><span>Start</span><b>" + roadFormatStat(spec, from) + "<small>" + roadEsc(spec.unit) + "</small></b></p>" +
    "<p><span>Now</span><b>" + roadFormatStat(spec, to) + "<small>" + roadEsc(spec.unit) + "</small></b></p>" +
    "<p><span>Change</span><b class=\"is-" + change.kind + "\">" + change.num + "<small>" + roadEsc(change.unit) + "</small>" + note + "</b></p></div>" +
    roadMonthSVG(points, spec) + "</article>";
}

function roadMonthSection(player) {
  const cards = roadChartCatalog(player).map((spec) => roadMonthCard(player, spec)).filter(Boolean).join("");
  if (!cards) return "";
  return "<h3 class=\"month-sub\">Month by month</h3><div class=\"month-grid\">" + cards + "</div>";
}

function roadChartSVG(series) {
  if (!series.length) return "<p class=\"muted\">No readings yet.</p>";
  const vals = series.map((r) => Number(r.value));
  const lo = Math.min.apply(null, vals);
  const hi = Math.max.apply(null, vals);
  const span = hi - lo || 1;
  const w = 320;
  const h = 120;
  const xy = series.map((row, i) => {
    const x = series.length === 1 ? w / 2 : (i / (series.length - 1)) * (w - 28) + 14;
    const y = h - 18 - ((Number(row.value) - lo) / span) * (h - 36);
    return { x: x, y: y };
  });
  const pts = xy.map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
  const start = xy[0];
  const end = xy[xy.length - 1];
  return "<svg class=\"chart-svg\" viewBox=\"0 0 " + w + " " + h + "\" role=\"img\" aria-label=\"Progress line\">" +
    "<polyline fill=\"none\" stroke=\"#f2d060\" stroke-width=\"3\" points=\"" + pts + "\"/>" +
    "<circle cx=\"" + start.x.toFixed(1) + "\" cy=\"" + start.y.toFixed(1) + "\" r=\"4\" fill=\"#fff\"/>" +
    "<circle cx=\"" + end.x.toFixed(1) + "\" cy=\"" + end.y.toFixed(1) + "\" r=\"5\" fill=\"#f2d060\"/>" +
    "</svg>";
}

function roadBenchmarkLine(player) {
  if (!player || player.type === "pitcher" || typeof exitVeloCuts !== "function") {
    return "At your current rate you're trending toward the upper range of our age-group benchmarks.";
  }
  const cuts = exitVeloCuts(player.age);
  const now = player.metrics ? Number(player.metrics.exitVelo) : NaN;
  if (!cuts || !Number.isFinite(now)) return "Log an exit-velocity test and the benchmark line will sit next to it.";
  const gap = Math.round((cuts.great - now) * 10) / 10;
  if (gap <= 0) return "You are inside our High Performance benchmark for your age. At your current rate you're trending toward the upper range of our age-group benchmarks.";
  return "You are " + gap + " MPH from our High Performance benchmark for your age.";
}

function roadNextUpgrade(player) {
  if (!player || typeof gradesFor !== "function" || typeof structuredClone !== "function") return null;
  const base = gradesFor(player);
  const faceOf = (g) => Object.fromEntries(((g && (g.hitterSubs || g.subs)) || []).map((s) => [s.key, s.grade]));
  const startFace = faceOf(base);
  const probes = player.type === "pitcher"
    ? [{ key: "fastballVelo", step: 0.1, dir: 1, unit: "MPH", label: "Fastball", max: 6, face: "VEL" }]
    : [
      { key: "batSpeed", step: 0.1, dir: 1, unit: "MPH", label: "Bat Speed", max: 6 },
      { key: "exitVelo", step: 0.1, dir: 1, unit: "MPH", label: "Exit Velo", max: 6 },
      { key: "tenYard", step: 0.05, dir: -1, unit: "s", label: "10-Yard", max: 0.4 },
      { key: "throwVelo", step: 0.5, dir: 1, unit: "MPH", label: "Crow-hop", max: 6 },
      { key: "medBall", step: 0.5, dir: 1, unit: "ft", label: "Chest pass", max: 6 },
      { key: "gripDominant", step: 1, dir: 1, unit: "lbs", label: "Grip", max: 20 },
    ];
  let best = null;
  probes.forEach((probe) => {
    const current = player.metrics ? Number(player.metrics[probe.key]) : NaN;
    if (!Number.isFinite(current)) return;
    const steps = Math.round(probe.max / probe.step);
    for (let i = 1; i <= steps; i++) {
      const delta = Math.round(probe.step * i * probe.dir * 1000) / 1000;
      const clone = structuredClone(player);
      clone.metrics[probe.key] = Math.round((current + delta) * 1000) / 1000;
      const g = gradesFor(clone);
      const face = faceOf(g);
      let raised = null;
      Object.keys(startFace).forEach((k) => {
        if (raised) return;
        if (startFace[k] != null && face[k] != null && face[k] > startFace[k]) raised = { key: k, from: startFace[k], to: face[k] };
      });
      if (!raised && g.overall > base.overall) raised = { key: "OVR", from: base.overall, to: g.overall };
      if (!raised) continue;
      const abs = Math.abs(delta);
      const rel = abs / Math.max(0.2, Math.abs(current));
      if (!best || rel < best.rel) {
        best = { abs, rel, delta, probe, raised, overall: g.overall };
      }
      break;
    }
  });
  if (!best) return { text: "Every tracked grade is already at the next step. Keep the streak while the next test window opens.", plan: "Stay on the daily mission list." };
  const shown = best.probe.unit === "s" ? best.abs.toFixed(2) : (Math.round(best.abs * 10) / 10).toFixed(1);
  const signed = (best.delta < 0 ? "−" : "+") + shown;
  const gain = signed + " " + best.probe.unit;
  const text = "NEXT UPGRADE · " + gain + " " + best.probe.label + " → " + best.raised.key + " " + best.raised.from + " → " + best.raised.to;
  const plan = best.probe.key === "batSpeed" || best.probe.key === "exitVelo"
    ? "Tee work and med-ball throws this week."
    : best.probe.key === "tenYard"
      ? "Sprint workout plus the first-step starts."
      : "One focused block on " + best.probe.label + " before the next test.";
  return { text, plan, gain, probe: best.probe, raised: best.raised, overall: base.overall };
}

function roadNextMarkup(next) {
  if (!next) return "";
  if (!next.gain) return "<p class=\"coach-line\">" + roadEsc(next.text) + "</p>";
  return "<p class=\"next-kicker\">NEXT UPGRADE</p>" +
    "<div class=\"coach-stat\"><b>" + roadEsc(next.gain) + "</b><span>" + roadEsc(next.probe.label) + "</span></div>" +
    "<div class=\"coach-stats\">" +
    "<div class=\"coach-stat\"><b>" + next.raised.from + "</b><span>" + roadEsc(next.raised.key) + " now</span></div>" +
    "<div class=\"coach-stat\"><b>" + next.raised.to + "</b><span>" + roadEsc(next.raised.key) + " next</span></div>" +
    "</div>" +
    "<p class=\"coach-line\">" + roadEsc(next.plan || "") + "</p>";
}

var RoadCoach = {
  provider: null,
  compose(player) {
    const lines = [];
    const name = roadFirstName(player);
    const r = player.road || {};
    const streaks = r.streaks || {};
    const exit = roadSeries(player, "exitVelo");
    const six = roadDelta(exit, 42);
    const month = roadDelta(exit, 30);
    const lastTrain = (r.dates && r.dates.checkin && r.dates.checkin.slice().sort().pop()) || "";
    const idle = lastTrain ? Math.round((new Date(roadToday()) - new Date(lastTrain)) / 86400000) : 0;
    if (six && six.delta >= 1 && six.inWindow) {
      lines.push("You just added " + (Math.round(six.delta * 10) / 10) + " MPH of exit velocity over six weeks. Keep stacking days.");
    } else {
      const year = roadYearDelta(player, "exitVelo");
      if (year && year.delta >= 1) lines.push("Exit velocity is up " + (Math.round(year.delta * 10) / 10) + " MPH since this season's first test. Keep stacking days.");
    }
    if (month && Math.abs(month.delta) < 0.4 && exit.length >= 2) {
      lines.push("No exit velo gain in 30 days. That's okay, progress isn't linear. Let's attack your Power Plan this week.");
    }
    if (idle >= 5 && streaks.checkin) {
      lines.push("It's been " + idle + " days since your last check-in. Your " + streaks.checkin + "-day streak is waiting.");
    }
    if (roadIsHot(player)) lines.push("Hot streak is live, " + name + ". The card knows. Don't give the glow back.");
    if ((streaks.training || 0) >= 5) lines.push(streaks.training + " training days in a row. That is how a level actually moves.");
    const next = roadNextUpgrade(player);
    if (next && next.text) lines.push(next.text);
    if (!lines.length) lines.push(name + ", log today's work. The next card is built out of days like this.");
    lines.push(roadBenchmarkLine(player));
    return lines.slice(0, 3);
  },
};

function roadAward(player, amount, reason) {
  if (!player || !amount) return { gained: 0 };
  const r = roadEnsure(player);
  let gain = Math.round(amount);
  if (reason === "minigame") {
    const today = roadToday();
    if (r.miniDay !== today) { r.miniDay = today; r.miniXp = 0; }
    const room = Math.max(0, ROAD_XP.minigameCap - (r.miniXp || 0));
    gain = Math.min(gain, room);
    r.miniXp = (r.miniXp || 0) + gain;
  }
  if (gain <= 0) return { gained: 0, capped: true };
  const before = roadLevelFromXp(r.xp);
  r.xp += gain;
  const after = roadLevelFromXp(r.xp);
  if (reason) r.trainingLog.push({ at: new Date().toISOString(), amount: gain, reason });
  if (r.trainingLog.length > 40) r.trainingLog = r.trainingLog.slice(-40);
  if (typeof savePlayers === "function") savePlayers();
  roadFloat("+" + gain + " XP");
  roadPing("beep");
  if (after.level > before.level) {
    roadFloat("LEVEL " + after.level);
    roadPing("cheer");
    if (globalThis.DataLayer) DataLayer.notify(player.id, "level", "Level " + after.level + " is live. " + after.remain + " XP to the next one.");
  }
  if (typeof roadPaint === "function") roadPaint();
  return { gained: gain, level: after.level, leveled: after.level > before.level };
}

function roadMarkDate(player, bucket) {
  const r = roadEnsure(player);
  const today = roadToday();
  if (!r.dates[bucket].includes(today)) r.dates[bucket].push(today);
  roadRefreshStreaks(player);
  if (bucket === "training") {
    const n = r.streaks.training;
    if (n >= 5 && n % 5 === 0 && r.streakPaid.indexOf(n) < 0) {
      r.streakPaid.push(n);
      roadAward(player, ROAD_XP.streak5, "streak");
    }
  }
}

function roadCompleteMission(player, id) {
  if (!roadCanEdit(player)) return;
  const missions = roadTodayMissions(player);
  const row = missions.find((m) => m.id === id && !m.done);
  if (!row) return;
  row.done = true;
  const meta = roadMissionMeta(id);
  const origin = typeof document !== "undefined" ? document.querySelector('[data-mission="' + id + '"]') : null;
  roadFloatFrom = origin ? origin.getBoundingClientRect() : null;
  roadAward(player, meta.xp === "minigame" ? ROAD_XP.minigame : ROAD_XP.assignment, meta.xp === "minigame" ? "minigame" : "assignment");
  const r = roadEnsure(player);
  const core = missions.filter((m) => m.id !== "vision");
  if (!r.dailyBonus && core.length && core.every((m) => m.done)) {
    r.dailyBonus = true;
    r.streaks.goal = (r.streaks.goal || 0) + 1;
    roadAward(player, ROAD_XP.dailyAll, "daily");
    roadPing("cheer");
  }
  if (typeof savePlayers === "function") savePlayers();
  roadPaint();
}

function roadTrain(player) {
  if (!player || !roadCanEdit(player)) return;
  roadMarkDate(player, "training");
  roadMarkDate(player, "checkin");
  const r = roadEnsure(player);
  roadAward(player, ROAD_XP.training, "training");
  if (globalThis.DataLayer) DataLayer.notify(player.id, "train", "Training logged. " + r.streaks.training + "-day training streak.");
  roadPaint();
}

function roadCheckIn(player) {
  if (!player) return;
  const r = roadEnsure(player);
  const today = roadToday();
  if (r.dates.checkin.indexOf(today) >= 0) return;
  r.dates.checkin.push(today);
  roadRefreshStreaks(player);
  if (typeof savePlayers === "function") savePlayers();
}

function roadAfterSave(player, info) {
  if (!player) return;
  roadEnsure(player);
  const fresh = player.pbFresh || {};
  const prs = Object.keys(fresh).filter((k) => fresh[k]);
  if (prs.length) {
    player.road.prs = (player.road.prs || 0) + prs.length;
    roadAward(player, ROAD_XP.pr, "pr");
    if (typeof stylePlayCele === "function") stylePlayCele(player, { pr: true });
    roadConfetti();
    roadPing("crack");
    roadPing("cheer");
    if (globalThis.DataLayer) DataLayer.notify(player.id, "pr", "New personal best. The card heard it.");
  }
  const before = info && info.beforeTier;
  const after = info && info.afterTier;
  if (before && after && typeof TIER_RANK !== "undefined" && TIER_RANK[after] > TIER_RANK[before]) {
    const graded = typeof gradesFor === "function" ? gradesFor(player) : { overall: 0 };
    const moment = {
      id: "evo-" + Date.now().toString(36),
      at: new Date().toISOString(),
      fromTier: before,
      toTier: after,
      overall: graded.overall,
      score: roadEvolution(player, graded.overall).score,
    };
    player.road.evolutions.push(moment);
    player.road.timeline.push({ at: moment.at.slice(0, 10), text: "Card evolved to " + (TIER_LABEL[after] || after) + "." });
    if (typeof savePlayers === "function") savePlayers();
    roadPlayEvolution(player, moment);
  }
}

let roadAudio = null;
function roadAudioCtx() {
  if (roadAudio) return roadAudio;
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Ctx) return null;
  roadAudio = new Ctx();
  return roadAudio;
}

function roadPing(kind) {
  if (roadSession().mute) return;
  const ctx = roadAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "cheer" ? 0.45 : 0.18));
  if (kind === "crack") { osc.type = "square"; osc.frequency.setValueAtTime(180, now); osc.frequency.exponentialRampToValueAtTime(60, now + 0.12); }
  else if (kind === "cheer") { osc.type = "sawtooth"; osc.frequency.setValueAtTime(440, now); osc.frequency.linearRampToValueAtTime(660, now + 0.3); }
  else if (kind === "pack") { osc.type = "triangle"; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.25); }
  else { osc.type = "sine"; osc.frequency.setValueAtTime(880, now); }
  osc.start(now);
  osc.stop(now + 0.5);
}

let roadFloatFrom = null;
function roadFloat(text) {
  if (typeof document === "undefined") return;
  const from = roadFloatFrom;
  roadFloatFrom = null;
  const el = document.createElement("div");
  el.className = "xp-float";
  el.textContent = text;
  if (from) {
    el.style.left = Math.round(from.left + from.width - 54) + "px";
    el.style.top = Math.round(from.top + 6) + "px";
  }
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    const bar = document.getElementById("xpTrack") || document.getElementById("xpReadout");
    if (!bar) return;
    const to = bar.getBoundingClientRect();
    const startX = from ? from.left + from.width - 54 : to.left;
    const startY = from ? from.top + 6 : to.top + 28;
    el.style.setProperty("--xp-x", Math.round((to.left + to.width * 0.72) - startX) + "px");
    el.style.setProperty("--xp-y", Math.round((to.top + to.height / 2) - startY) + "px");
  });
  setTimeout(() => el.remove(), 1200);
}

function roadConfetti() {
  if (typeof document === "undefined" || (typeof motionReduced === "function" && motionReduced())) return;
  const box = document.createElement("div");
  box.className = "confetti";
  for (let i = 0; i < 18; i++) {
    const bit = document.createElement("i");
    bit.style.left = (Math.random() * 100) + "vw";
    bit.style.background = i % 2 ? "#f2d060" : "#e11d48";
    bit.style.animationDelay = (Math.random() * 0.2) + "s";
    box.appendChild(bit);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 1500);
}

function roadEsc(s) {
  if (typeof esc === "function") return esc(s);
  return String(s ?? "");
}

function roadBackExtra(player) {
  if (!player || typeof gradesFor !== "function") return "";
  roadEnsure(player);
  const g = gradesFor(player);
  const evo = roadEvolution(player, g.overall);
  const lvl = roadLevel(player);
  const key = player.type === "pitcher" ? "fastballVelo" : "exitVelo";
  const pct = roadPercentile(player, key);
  const tier = roadTierKey(evo.score, g.overall);
  const tierName = (typeof TIER_LABEL !== "undefined" && TIER_LABEL[tier]) || tier;
  return "<section class=\"pb-block road-back\"><h4>Road to 99</h4><div class=\"pb-grid\">" +
    "<div class=\"pb-row\"><span>Level</span><b>" + lvl.level + "</b></div>" +
    "<div class=\"pb-row\"><span>Evolution</span><b>" + evo.score.toFixed(1) + " " + roadEsc(tierName) + "</b></div>" +
    "<div class=\"pb-row\"><span>Age-group rank</span><b>" + (pct == null ? "--" : ("P" + pct)) + "</b></div>" +
    "</div></section>";
}

function roadChangeList(player) {
  const key = player.type === "pitcher" ? "fastballVelo" : "exitVelo";
  const unit = player.type === "pitcher" ? "MPH FB" : "MPH EV";
  const series = roadSeries(player, key);
  const year = roadYearDelta(player, key);
  const bits = [
    ["30-day", roadDelta(series, 30)],
    ["90-day", roadDelta(series, 90)],
    ["1-year", roadDelta(series, 365)],
    ["Career", roadDelta(series, null)],
  ];
  const rows = bits.map(([label, row]) => {
    if (!row) return "<div class=\"chart-row\"><span>" + label + "</span><b>--</b></div>";
    const sign = row.delta > 0 ? "+" : "";
    return "<div class=\"chart-row\"><span>" + label + "</span><b>" + sign + (Math.round(row.delta * 10) / 10) + "</b><small>" + unit + "</small></div>";
  }).join("");
  const banner = year ? "<p class=\"year-banner\">" + (year.delta > 0 ? "+" : "") + (Math.round(year.delta * 10) / 10) + " " + unit + " THIS YEAR</p>" : "";
  let compare = "<p class=\"muted\">Log two tests and the line appears.</p>";
  if (series.length) {
    const a = series[0];
    const b = series[series.length - 1];
    compare = "<div class=\"chart-compare\"><div><span>WHERE I STARTED</span><b>" + a.value + "</b><small>" + roadEsc(roadPrettyDate(a.at)) + "</small></div><div><span>WHERE I AM</span><b>" + b.value + "</b><small>" + roadEsc(roadPrettyDate(b.at)) + "</small></div></div>";
  }
  return "<div class=\"chart-block\">" + compare + banner + roadChartSVG(series) + "<div class=\"chart-windows\">" + rows + "</div></div>";
}

function roadProfileHTML(player) {
  roadEnsure(player);
  const g = typeof gradesFor === "function" ? gradesFor(player) : { overall: 0 };
  const lvl = roadLevel(player);
  const evo = roadEvolution(player, g.overall);
  const next = roadNextUpgrade(player);
  const coach = RoadCoach.compose(player).map((line) => "<p class=\"coach-line\">" + roadEsc(line) + "</p>").join("");
  const pct = (label, key) => {
    const n = roadPercentile(player, key);
    return "<div class=\"chart-row\"><span>" + label + "</span><b>" + (n == null ? "--" : ("P" + n)) + "</b></div>";
  };
  const videos = (player.road.videos || []).map((v) => "<li><a href=\"" + roadEsc(v.url) + "\" target=\"_blank\" rel=\"noopener\">" + roadEsc(v.label || v.url) + "</a></li>").join("") || "<li>No clips yet.</li>";
  const evos = (player.road.evolutions || []).map((m) => "<li><button type=\"button\" class=\"btn btn-ghost\" data-replay-evo=\"" + roadEsc(m.id) + "\">Replay " + roadEsc(m.toTier) + "</button> <button type=\"button\" class=\"btn btn-ghost\" data-export-evo=\"" + roadEsc(m.id) + "\">PNG</button></li>").join("") || "<li>No evolution yet. Cross a tier and it lives here.</li>";
  const timeline = (player.road.timeline || []).map((t) => "<li><b>" + roadEsc(roadPrettyDate(t.at)) + "</b> " + roadEsc(t.text) + "</li>").join("") || "<li>The story starts with the next session.</li>";
  const links = player.road.links || {};
  const can = roadCanEdit(player);
  const edit = can ? "<div class=\"road-actions\"><input id=\"roadVideoUrl\" placeholder=\"YouTube, Instagram, or Hudl link\"><button class=\"btn btn-ghost\" type=\"button\" id=\"roadAddVideo\">Add link</button><input id=\"roadVideoFile\" type=\"file\" accept=\"video/*\"><button class=\"btn btn-red\" type=\"button\" id=\"roadEvoPreview\">Preview Legend evolution</button></div>" : "<p class=\"muted\">Read only. Switch to this player, or to coach mode, to log work.</p>";
  const width = Math.round((lvl.into / lvl.span) * 100);
  return "<div class=\"panel road-card\"><h3>Road to 99</h3>" +
    "<div class=\"road-xp-line\"><span>LEVEL " + lvl.level + "</span><span>" + lvl.into.toLocaleString() + " / " + lvl.span.toLocaleString() + " XP</span><span>" + lvl.remain.toLocaleString() + " XP TO LEVEL " + Math.min(99, lvl.level + 1) + "</span></div>" +
    "<div class=\"road-track\"><span style=\"width:" + width + "%\"></span></div>" +
    "<p class=\"tier-need\">" + roadEsc(roadTierNeed(g.overall, player)) + " Evolution " + evo.score.toFixed(1) + " · bonus " + evo.bonus + ".</p>" +
    "<p class=\"next-num\">" + g.overall + " OVR</p><p>Road to 99: " + (99 - g.overall) + " overall points left. Overall never moves from XP.</p>" +
    edit +
    "<h3>Development coach</h3>" + coach +
    roadNextMarkup(next) +
    "<h3>Where I started</h3>" + roadChangeList(player) +
    "<h3>Age-group percentiles</h3>" + pct("Exit velo", "exitVelo") + pct("Bat speed", "batSpeed") + pct("10-yard", "tenYard") + pct("Throw", "throwVelo") +
    "<h3>Videos</h3><ul>" + videos + "</ul>" +
    "<h3>Bio</h3><p>" + roadEsc(player.road.bio || "—") + "</p>" +
    "<h3>Player scouting report</h3><p>" + roadEsc(player.road.scoutingReport || "—") + "</p>" +
    "<h3>External profiles</h3><p>" +
      (links.perfectGame ? "<a href=\"" + roadEsc(links.perfectGame) + "\" target=\"_blank\" rel=\"noopener\">Perfect Game</a> " : "") +
      (links.pbr ? "<a href=\"" + roadEsc(links.pbr) + "\" target=\"_blank\" rel=\"noopener\">Prep Baseball</a>" : "") +
      (!links.perfectGame && !links.pbr ? "—" : "") + "</p>" +
    "<h3 id=\"roadTrophies\">Trophy case</h3><ul>" + evos + "</ul>" +
    "<h3>Career timeline</h3><ul>" + timeline + "</ul></div>";
}

function roadWireProfile(player) {
  if (typeof document === "undefined") return;
  document.querySelectorAll("[data-replay-evo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const moment = (player.road.evolutions || []).find((m) => m.id === btn.dataset.replayEvo);
      if (moment) roadPlayEvolution(player, moment);
    });
  });
  document.querySelectorAll("[data-export-evo]").forEach((btn) => {
    btn.addEventListener("click", () => roadExportPoster(player));
  });
  const add = document.getElementById("roadAddVideo");
  if (add) add.addEventListener("click", () => {
    const input = document.getElementById("roadVideoUrl");
    const url = input && input.value.trim();
    if (!url) return;
    roadEnsure(player).videos.push({ label: url.replace(/^https?:\/\//, "").slice(0, 42), url });
    if (typeof savePlayers === "function") savePlayers();
    if (typeof openProfile === "function") openProfile(player.id, { tab: "road" });
  });
  const file = document.getElementById("roadVideoFile");
  if (file) file.addEventListener("change", () => {
    const clip = file.files && file.files[0];
    if (!clip || !globalThis.DataLayer) return;
    DataLayer.saveVideo(player.id, clip).then((saved) => {
      roadEnsure(player).videos.push({ label: saved.name, fileId: saved.id, url: "#" });
      if (typeof savePlayers === "function") savePlayers();
      if (typeof openProfile === "function") openProfile(player.id, { tab: "road" });
    }).catch((err) => alert(err.message || "That clip could not be saved."));
  });
  const preview = document.getElementById("roadEvoPreview");
  if (preview) preview.addEventListener("click", () => roadPreviewLegend(player));
  if (typeof competeWire === "function") competeWire(player);
  if (typeof styleWire === "function") styleWire(player);
}

function roadHomeHTML(player) {
  if (!player) return "";
  roadEnsure(player);
  roadRefreshStreaks(player);
  const g = typeof gradesFor === "function" ? gradesFor(player) : { overall: 0 };
  const lvl = roadLevel(player);
  const missions = roadTodayMissions(player);
  const coreMissions = missions.filter((m) => m.id !== "vision");
  const done = coreMissions.filter((m) => m.done).length;
  const widthXp = Math.round((lvl.into / lvl.span) * 100);
  const can = roadCanEdit(player);
  const list = missions.map((m) => {
    const meta = roadMissionMeta(m.id);
    const xp = meta.xp === "vision" ? 150 : meta.xp === "minigame" ? ROAD_XP.minigame : ROAD_XP.assignment;
    const hit = "<span class=\"check-circle\" aria-hidden=\"true\"></span><span class=\"mission-copy\"><b>" + roadEsc(meta.label) + "</b><small>" + roadEsc(meta.gear) + "</small></span><span class=\"mission-xp\">+" + xp + " XP</span>";
    if (can && !m.done) return "<li class=\"mission-row\"><button class=\"mission-hit\" type=\"button\" data-mission=\"" + roadEsc(m.id) + "\">" + hit + "</button></li>";
    return "<li class=\"mission-row" + (m.done ? " is-done" : "") + "\"><div class=\"mission-hit\">" + hit + "</div></li>";
  }).join("");
  const coach = RoadCoach.compose(player)[0] || "";
  const next = roadNextUpgrade(player);
  const hot = roadIsHot(player) ? " · 🔥 HOT STREAK ACTIVATED" : "";
  const coachTools = roadSession().mode === "coach" ? "<div class=\"road-actions\"><label for=\"roadCoachPlan\">Assign today's four</label><select id=\"roadCoachPlan\" multiple size=\"4\">" + ROAD_MISSIONS.map((m) => "<option value=\"" + m.id + "\">" + roadEsc(m.label) + "</option>").join("") + "</select><button class=\"btn btn-ghost\" type=\"button\" id=\"roadAssign\">Assign</button></div>" : "";
  return "<div class=\"road-hero\">" +
    "<h2 class=\"road-title\">ROAD TO <b>99</b></h2>" +
    "<div class=\"road-stage\">" +
    "<div class=\"road-own\">" + (typeof cardHTML === "function" ? cardHTML(player, true, null, { flip: true }) : "") + "</div>" +
    "<div class=\"road-meters\">" +
    "<div class=\"road-99\"><div class=\"road-xp-line\"><span>LEVEL " + lvl.level + "</span><span id=\"xpReadout\">" + lvl.into.toLocaleString() + " / " + lvl.span.toLocaleString() + " XP</span><span>" + lvl.remain.toLocaleString() + " XP TO LEVEL " + Math.min(99, lvl.level + 1) + "</span></div>" +
    "<div class=\"road-track\" id=\"xpTrack\"><span style=\"width:" + widthXp + "%\"></span></div></div></div></div>" +
    "<h3 class=\"road-hello\">" + roadEsc(roadGreeting()) + ", " + roadEsc(roadFirstName(player)) + "</h3>" +
    "<p class=\"road-streak\">DAY " + (player.road.streaks.training || 0) + " STREAK 🔥" + hot + "</p>" +
    ((roadSession().mode === "coach" || player.id === "sample-mason-carter") ? "<div class=\"road-actions vision-try\"><button class=\"btn btn-red\" type=\"button\" id=\"visionTry\">Pitch Recognition</button></div>" : "") +
    "<p class=\"road-quote\">" + roadEsc(roadQuote()) + "</p>" +
    "<div class=\"road-grid\">" +
    "<div class=\"road-card road-missions\"><h3>Today's mission <b>" + done + "/4</b></h3><ul class=\"mission-list\">" + list + "</ul>" +
    "<div class=\"road-actions\"><button class=\"btn btn-red\" type=\"button\" id=\"roadTrain\"" + (can ? "" : " disabled") + ">Log training</button></div>" + coachTools + "</div>" +
    "<div class=\"road-card road-coach\"><h2 class=\"day-title\">DEVELOPMENT COACH</h2><p class=\"coach-line\">" + roadEsc(coach) + "</p>" +
    roadNextMarkup(next) +
    "<p class=\"tier-need\">" + roadEsc(roadTierNeed(g.overall, player)) + "</p>" +
    "<p class=\"road-bench\">" + roadEsc(roadBenchmarkLine(player)) + "</p></div></div>" +
    "<div class=\"road-card road-chart-card\" id=\"whereStarted\"><h2 class=\"day-title\">WHERE I STARTED</h2>" + roadChangeList(player) + roadMonthSection(player) +
    "<button class=\"btn btn-ghost\" type=\"button\" id=\"roadTilt\">Enable card tilt</button></div></div>";
}

let roadPaintLock = false;
let roadLastBar = null;
function roadPaint() {
  if (typeof document === "undefined" || roadPaintLock) return;
  const mount = document.getElementById("roadHome");
  if (!mount) return;
  const player = roadSignedIn();
  if (player) {
    roadTodayMissions(player);
    roadRefreshStreaks(player);
  }
  const lvlNow = player ? roadLevel(player) : null;
  const nextPct = lvlNow ? Math.round((lvlNow.into / lvlNow.span) * 100) : 0;
  mount.innerHTML = roadHomeHTML(player);
  const track = mount.querySelector("#xpTrack > span");
  if (track && player && roadLastBar && roadLastBar.id === player.id && roadLastBar.pct !== nextPct) {
    track.style.transition = "none";
    track.style.width = roadLastBar.pct + "%";
    requestAnimationFrame(() => {
      track.style.transition = "";
      track.style.width = nextPct + "%";
    });
  }
  if (player) roadLastBar = { id: player.id, pct: nextPct };
  if (typeof wireCardFlips === "function") wireCardFlips(mount);
  if (typeof watchCardMotion === "function") watchCardMotion();
  if (typeof competePaint === "function") competePaint();
  if (typeof styleDrawQrs === "function") styleDrawQrs(document);
  if (typeof styleTrainMount === "function") styleTrainMount();
  if (typeof visionMount === "function") visionMount();
  mount.querySelectorAll("[data-mission]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.mission === "vision") {
        if (typeof visionOpen === "function") visionOpen(player, { featured: true });
        return;
      }
      if (btn.classList.contains("is-checking")) return;
      btn.classList.add("is-checking");
      const reduced = typeof motionReduced === "function" && motionReduced();
      const wait = reduced ? 0 : 420;
      setTimeout(() => roadCompleteMission(player, btn.dataset.mission), wait);
    });
  });
  const tryGames = document.getElementById("visionTry");
  if (tryGames) tryGames.addEventListener("click", () => { if (typeof visionOpen === "function") visionOpen(player); });
  const train = document.getElementById("roadTrain");
  if (train) train.addEventListener("click", () => roadTrain(player));
  const tilt = document.getElementById("roadTilt");
  if (tilt) {
    const needsPrompt = typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function";
    tilt.hidden = !needsPrompt;
    tilt.addEventListener("click", () => { if (typeof askGyro === "function") askGyro(); });
  }
  const assign = document.getElementById("roadAssign");
  if (assign) assign.addEventListener("click", () => {
    const sel = document.getElementById("roadCoachPlan");
    const ids = [...sel.selectedOptions].map((o) => o.value).slice(0, 4);
    if (ids.length < 4 || !player) return;
    roadEnsure(player).coachPlan = ids;
    player.road.missionDay = "";
    roadTodayMissions(player);
    if (typeof savePlayers === "function") savePlayers();
    if (globalThis.DataLayer) DataLayer.notify(player.id, "mission", "Coach assigned today's mission.");
    roadPaint();
  });
  roadPaintChrome();
}

function roadInitials(player) {
  const parts = String(player && player.name || "P").trim().split(/\s+/);
  return ((parts[0] && parts[0][0]) || "P") + (parts[1] ? parts[1][0] : "");
}

function roadSyncTabs() {
  const name = document.body ? (document.body.dataset.app || "home") : "home";
  document.querySelectorAll(".app-tabs button").forEach((btn) => {
    const on = btn.dataset.app === name;
    btn.classList.toggle("is-on", on);
    if (on) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
}

function roadSetApp(name) {
  if (typeof document === "undefined") return;
  if (typeof styleClearCele === "function") styleClearCele();
  const tab = name || "home";
  document.body.dataset.app = tab;
  roadSyncTabs();
  const sheet = document.getElementById("settingsSheet");
  if (sheet) sheet.classList.remove("is-open");
  const menu = document.getElementById("menuBtn");
  if (menu) menu.setAttribute("aria-expanded", "false");
  if (tab === "card" || tab === "trophies") {
    const player = roadSignedIn();
    if (player && typeof openProfile === "function") {
      openProfile(player.id, tab === "trophies" ? { tab: "road", focus: "trophyCase" } : { tab: "attributes" });
    }
    return;
  }
  if (typeof closeProfile === "function") closeProfile();
  window.scrollTo(0, 0);
}

function roadBanner() {
  const banner = document.getElementById("sampleBanner");
  if (!banner) return;
  let gone = false;
  try { gone = localStorage.getItem("antonelli-sample-dismissed") === "1"; } catch (e) { gone = false; }
  banner.hidden = gone;
  const btn = document.getElementById("sampleDismiss");
  if (btn && !btn.dataset.wired) {
    btn.dataset.wired = "1";
    btn.addEventListener("click", () => {
      banner.hidden = true;
      try { localStorage.setItem("antonelli-sample-dismissed", "1"); } catch (e) { /* the line stays hidden for this view */ }
    });
  }
}

function roadPaintChrome() {
  const session = roadSession();
  const player = roadSignedIn();
  const sel = document.getElementById("roadPlayer");
  if (sel) {
    const list = roadRoster();
    sel.innerHTML = list.map((p) => "<option value=\"" + roadEsc(p.id) + "\">" + roadEsc(p.name) + "</option>").join("");
    if (session.playerId) sel.value = session.playerId;
  }
  const mode = document.getElementById("roadMode");
  if (mode) mode.value = session.mode || "player";
  const mute = document.getElementById("roadMute");
  if (mute) mute.textContent = session.mute ? "Sound off" : "Sound on";
  const add = document.getElementById("addPlayerBtn");
  if (add) add.hidden = session.mode !== "coach";
  const avatar = document.getElementById("menuBtn");
  if (avatar) avatar.textContent = roadInitials(player).toUpperCase();
  const count = document.getElementById("roadBellCount");
  if (count && globalThis.DataLayer) {
    const n = DataLayer.unread(session.playerId).length;
    count.hidden = n === 0;
    count.textContent = String(n);
  }
  roadSyncTabs();
}

function roadPlayEvolution(player, moment) {
  const box = typeof document !== "undefined" && document.getElementById("evoShow");
  if (!box || !player) return;
  const face = { overall: moment.overall, tier: moment.toTier };
  const card = typeof cardHTML === "function" ? cardHTML(player, true, face) : "";
  box.innerHTML = "<div class=\"evo-stage\">" + card + "<div class=\"evo-particles\">" + "<i></i>".repeat(10) + "</div></div>" +
    "<div class=\"evo-copy\"><p class=\"road-kicker\">CARD EVOLUTION</p><h2>" + roadEsc((TIER_LABEL && TIER_LABEL[moment.toTier]) || "") + "</h2>" +
    "<p id=\"evoOvr\">OVR " + moment.overall + "</p><div class=\"road-actions\"><button class=\"btn btn-red\" type=\"button\" id=\"evoClose\">Collect</button><button class=\"btn btn-ghost\" type=\"button\" id=\"evoSave\">Save PNG</button></div></div>";
  box.hidden = false;
  box.classList.remove("is-float", "is-crack", "is-reveal");
  const reduced = typeof motionReduced === "function" && motionReduced();
  roadPing("pack");
  if (reduced) box.classList.add("is-reveal");
  else {
    requestAnimationFrame(() => box.classList.add("is-float"));
    setTimeout(() => box.classList.add("is-crack"), 700);
    setTimeout(() => { box.classList.add("is-reveal"); roadPing("cheer"); }, 1200);
  }
  const close = document.getElementById("evoClose");
  if (close) close.addEventListener("click", () => { box.hidden = true; });
  const save = document.getElementById("evoSave");
  if (save) save.addEventListener("click", () => roadExportPoster(player, moment));
  const clip = document.createElement("button");
  clip.className = "btn btn-ghost";
  clip.type = "button";
  clip.textContent = "Save clip";
  clip.addEventListener("click", () => roadExportWebm(player, Object.assign({}, moment, { download: true })));
  const actions = box.querySelector(".road-actions");
  if (actions) actions.appendChild(clip);
}

function roadPreviewLegend(player) {
  const moment = { id: "preview", at: new Date().toISOString(), fromTier: "diamond", toTier: "legend", overall: 96, score: 96, preview: true };
  roadPlayEvolution(player, moment);
}

function roadPosterCanvas(player, moment) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  const tier = moment && moment.toTier || "silver";
  const grd = ctx.createLinearGradient(0, 0, 0, 1350);
  if (tier === "legend") { grd.addColorStop(0, "#2a0408"); grd.addColorStop(0.6, "#e11d48"); grd.addColorStop(1, "#ffd0d4"); }
  else if (tier === "diamond") { grd.addColorStop(0, "#041428"); grd.addColorStop(1, "#7dd3fc"); }
  else { grd.addColorStop(0, "#14110c"); grd.addColorStop(1, "#d4af37"); }
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 18;
  ctx.strokeRect(48, 48, 984, 1254);
  ctx.fillStyle = "#fff";
  ctx.font = "italic 84px Impact, sans-serif";
  ctx.fillText("ROAD TO 99", 90, 220);
  ctx.font = "italic 64px Impact, sans-serif";
  ctx.fillStyle = "#f2d060";
  ctx.fillText(String(player.name || "").toUpperCase(), 90, 540);
  ctx.fillStyle = "#fff";
  ctx.font = "italic 180px Impact, sans-serif";
  ctx.fillText(String(moment && moment.overall || ""), 90, 820);
  ctx.font = "700 42px sans-serif";
  ctx.fillText((TIER_LABEL && TIER_LABEL[tier]) || tier, 90, 900);
  ctx.fillStyle = "#f2d060";
  ctx.fillText("ANTONELLI BASEBALL", 90, 1180);
  return canvas;
}

function roadExportPoster(player, moment) {
  if (typeof document === "undefined") return;
  const canvas = roadPosterCanvas(player, moment || { overall: gradesFor(player).overall, toTier: "silver" });
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "road-to-99-" + (player.id || "card") + ".png";
  a.click();
}

function roadExportWebm(player, moment) {
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") return;
  if (roadSession().mute && moment && moment.preview) return;
  try {
    const canvas = roadPosterCanvas(player, moment);
    const stream = canvas.captureStream(12);
    const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : undefined });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const r = roadEnsure(player);
      r.lastWebm = true;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "evolution-" + (player.id || "card") + ".webm";
      if (moment && moment.download) a.click();
    };
    rec.start();
    setTimeout(() => { if (rec.state === "recording") rec.stop(); }, 900);
  } catch (e) { /* recording is optional */ }
}

function roadSeedNotes(player) {
  if (!player || !globalThis.DataLayer) return;
  const lvl = roadLevel(player);
  if (lvl.remain > 0 && lvl.remain <= 200) DataLayer.notify(player.id, "xp-close", lvl.remain + " XP from Level " + (lvl.level + 1) + ".");
  const streak = player.road && player.road.streaks ? player.road.streaks.training : 0;
  if (streak >= 5) DataLayer.notify(player.id, "streak", streak + "-day streak. Don't lose it.");
  const g = typeof gradesFor === "function" ? gradesFor(player) : null;
  if (g) {
    const evo = roadEvolution(player, g.overall);
    const gap = Math.max(0, Math.ceil((({ bronze: 70, silver: 80, gold: 90, diamond: 95 }[roadTierKey(evo.score, g.overall)] || 100) - evo.score) * 10) / 10);
    if (gap > 0 && gap < 3) DataLayer.notify(player.id, "tier-close", gap + " evolution points from the next tier.");
  }
}

function roadOpenInbox() {
  const box = document.getElementById("inbox");
  if (!box) return;
  const session = roadSession();
  const notes = DataLayer.inbox().filter((n) => n.playerId === session.playerId).slice().reverse();
  box.innerHTML = "<strong>Inbox</strong><ul>" + (notes.map((n) => "<li>" + roadEsc(n.text) + "</li>").join("") || "<li>Nothing new. Go earn a note.</li>") + "</ul>";
  box.hidden = false;
  DataLayer.markRead(session.playerId);
  roadPaintChrome();
}

function roadBoot() {
  if (typeof document === "undefined") return;
  const player = roadSignedIn();
  if (player && roadCanEdit(player)) roadCheckIn(player);
  roadRoster().forEach((p) => roadRefreshStreaks(p));
  if (player) roadSeedNotes(player);
  const sel = document.getElementById("roadPlayer");
  const mode = document.getElementById("roadMode");
  const mute = document.getElementById("roadMute");
  const bell = document.getElementById("roadBell");
  if (sel && !sel.dataset.wired) {
    sel.dataset.wired = "1";
    sel.addEventListener("change", () => {
      const session = roadSession();
      session.playerId = sel.value;
      DataLayer.saveSession(session);
      const tab = document.body.dataset.app || "home";
      if (tab === "card" || tab === "trophies") roadSetApp(tab);
      else {
        roadPaint();
        if (typeof renderRoster === "function") renderRoster();
      }
    });
  }
  if (mode && !mode.dataset.wired) {
    mode.dataset.wired = "1";
    mode.addEventListener("change", () => {
      const session = roadSession();
      session.mode = mode.value;
      DataLayer.saveSession(session);
      roadPaint();
    });
  }
  if (mute && !mute.dataset.wired) {
    mute.dataset.wired = "1";
    mute.addEventListener("click", () => {
      const session = roadSession();
      session.mute = !session.mute;
      DataLayer.saveSession(session);
      if (!session.mute) roadAudioCtx();
      roadPaintChrome();
    });
  }
  const visionNav = document.getElementById("visionNav");
  if (visionNav && !visionNav.dataset.wired) {
    visionNav.dataset.wired = "1";
    visionNav.addEventListener("click", () => {
      if (typeof visionOpen === "function") visionOpen(roadSignedIn());
    });
  }
  if (bell && !bell.dataset.wired) {
    bell.dataset.wired = "1";
    bell.addEventListener("click", () => {
      const box = document.getElementById("inbox");
      if (box && !box.hidden) box.hidden = true;
      else roadOpenInbox();
    });
  }
  const menu = document.getElementById("menuBtn");
  if (menu && !menu.dataset.wired) {
    menu.dataset.wired = "1";
    menu.addEventListener("click", () => {
      const sheet = document.getElementById("settingsSheet");
      if (!sheet) return;
      const open = sheet.classList.toggle("is-open");
      menu.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  document.querySelectorAll(".app-tabs button").forEach((btn) => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", () => roadSetApp(btn.dataset.app));
  });
  roadBanner();
  roadPaint();
  if (typeof competeBoot === "function") competeBoot();
  if (typeof styleBoot === "function") styleBoot();
}

globalThis.ROAD_XP = ROAD_XP;
globalThis.roadLevelFromXp = roadLevelFromXp;
globalThis.roadLevel = roadLevel;
globalThis.roadEvolution = roadEvolution;
globalThis.roadTierKey = roadTierKey;
globalThis.roadDevBonus = roadDevBonus;
globalThis.roadIsHot = roadIsHot;
globalThis.roadCanEdit = roadCanEdit;
globalThis.roadBackExtra = roadBackExtra;
globalThis.roadProfileHTML = roadProfileHTML;
globalThis.roadWireProfile = roadWireProfile;
globalThis.roadAward = roadAward;
globalThis.roadAfterSave = roadAfterSave;
globalThis.roadBoot = roadBoot;
globalThis.roadPaint = roadPaint;
globalThis.roadPrettyDate = roadPrettyDate;
globalThis.roadSetApp = roadSetApp;
globalThis.roadSyncTabs = roadSyncTabs;
globalThis.roadEnsure = roadEnsure;
globalThis.roadRefreshStreaks = roadRefreshStreaks;
globalThis.RoadCoach = RoadCoach;
globalThis.roadPreviewLegend = roadPreviewLegend;
