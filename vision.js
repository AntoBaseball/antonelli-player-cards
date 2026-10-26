/* Pitch Recognition — Matt's ten drills.
   One featured game every 3 days. XP only. Overall never moves.
   Situations for game 9 are in vision-iq.json. */

const VISION_GAMES = [
  { id: "vanish", name: "The Vanishing Point", benefit: "The ball vanishes at the hitter's decision point. Naming it, then finding the plate, is the occlusion benchmark.", controls: "Tap Fastball, Curve, or Changeup. Then tap the plate where it would cross. 1–3 match the buttons.", stat: "Location", kind: "vanish", rounds: 8 },
  { id: "flash", name: "Flash-Seam Recognition", benefit: "A 150–200ms color at release is the same early cue as a seam. Red fastball, yellow slider, blue curve.", controls: "Tap the pitch the instant the color flashes. 1–3 match the buttons. A wrong early guess costs more.", stat: "Reaction ms", kind: "flash", rounds: 8 },
  { id: "gauntlet", name: "The Take/Swing Gauntlet", benefit: "Twenty pitches, no time to think. Swing at strikes. Do nothing on balls. Chase rate is the benchmark, not a roster spot.", controls: "SWING is the button, Space, D, or the right arrow. Balls are takes — do not tap.", stat: "Chase Rate %", kind: "gauntlet", rounds: 20 },
  { id: "matrix", name: "Peripheral Matrix", benefit: "The barrel stays on the middle pitch while the edges still get a read. A missed flash breaks the combo.", controls: "Swing the center pitch in the window. Tap the edge panel that matches the cue. W A S D and the arrows match the four buttons.", stat: "Dual %", kind: "matrix", rounds: 8 },
  { id: "depth", name: "Depth Perception Countdown", benefit: "The ball grows into the hitting window. Matching the ring is a timing benchmark for the front of the plate.", controls: "Tap, or press Space, when the ball fills the ring. Perfect is within 20ms. Good is within 50ms.", stat: "Timing", kind: "depth", rounds: 8 },
  { id: "ghost", name: "The Ghost Splitter", benefit: "One pitch stays true and two peel off. Tracking the real ball is the tunnel benchmark.", controls: "After the split, tap the true ball, or Left / Middle / Right. A decoy is a strikeout.", stat: "True %", kind: "ghost", rounds: 8 },
  { id: "rhythm", name: "Audio-Visual Rhythm Swing", benefit: "The mitt pop and the flash arrive together. Ears and eyes on the same beat is the timing benchmark.", controls: "Tap or press Space when you hear the pop and the ball flashes. Early taps miss. Sound turns on at Start.", stat: "Reaction ms", kind: "rhythm", rounds: 8 },
  { id: "tracer", name: "Trajectory Tracer", benefit: "A curve, a sweeper, and a cutter each have a shape. Drawing it back is the path benchmark.", controls: "Watch the pitch. Then draw its path with a finger or the mouse. Done locks the trace.", stat: "Path %", kind: "tracer", rounds: 4 },
  { id: "iq", name: "Situational Hitting IQ Grid", benefit: "The situation comes first. Pull, middle, oppo, or take is the plan. This is a benchmark, not a projection.", controls: "Read the situation, then tap Pull, Middle, Oppo, or Take. 1–4 and A W D S match the buttons.", stat: "IQ %", kind: "iq", rounds: 8 },
  { id: "reflex", name: "The Reflex Grid", benefit: "The zone shrinks the window as the round gets faster. Hits, misses, and the speed tier become a hand-eye score.", controls: "Tap each ball before its bar expires. The window starts at 0.8s and tightens toward 0.2s.", stat: "RPM", kind: "reflex", rounds: 16 },
];

const VISION_SYMBOLS = [
  { id: "circle", name: "Circle" },
  { id: "square", name: "Square" },
  { id: "triangle", name: "Triangle" },
  { id: "diamond", name: "Diamond" },
];

function visionEsc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function visionDayNumber(stamp) {
  const parts = String(stamp || "2026-01-01").slice(0, 10).split("-");
  return Math.floor(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) / 86400000);
}

function visionFeatured(stamp) {
  const day = visionDayNumber(stamp || (typeof roadToday === "function" ? roadToday() : "2026-01-01"));
  const slot = Math.floor(day / 3);
  return { game: VISION_GAMES[slot % VISION_GAMES.length], window: String(slot) };
}

function visionReduce() {
  return typeof motionReduced === "function" ? motionReduced() : (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function visionState(player) {
  const road = typeof roadEnsure === "function" ? roadEnsure(player) : (player.road = player.road || {});
  if (!road.vision || typeof road.vision !== "object") road.vision = {};
  const v = road.vision;
  if (!v.best || typeof v.best !== "object") v.best = {};
  if (!v.history || typeof v.history !== "object") v.history = {};
  if (typeof v.practiceXp !== "number") v.practiceXp = 0;
  return v;
}

function visionBest(player, id) {
  const best = visionState(player).best[id];
  return typeof best === "number" ? best : null;
}

function visionTop(gameId) {
  if (!globalThis.DataLayer) return [];
  const facility = DataLayer.facility();
  const rows = facility.vision && facility.vision[gameId];
  return Array.isArray(rows) ? rows.slice(0, 5) : [];
}

function visionSaveScore(player, game, result) {
  const v = visionState(player);
  const prev = v.best[game.id];
  if (prev == null || result.score > prev) v.best[game.id] = result.score;
  if (!Array.isArray(v.history[game.id])) v.history[game.id] = [];
  v.history[game.id].push({ score: result.score, accuracy: result.accuracy, streak: result.streak, stat: result.statText, at: typeof roadToday === "function" ? roadToday() : "" });
  if (v.history[game.id].length > 20) v.history[game.id] = v.history[game.id].slice(-20);
  if (globalThis.DataLayer) {
    const facility = DataLayer.facility();
    if (!facility.vision) facility.vision = {};
    if (!Array.isArray(facility.vision[game.id])) facility.vision[game.id] = [];
    const rows = facility.vision[game.id];
    let mine = rows.find((row) => row.id === player.id);
    if (!mine) {
      mine = { id: player.id, name: String(player.name || "Player").split(" ")[0], score: result.score };
      rows.push(mine);
    } else if (result.score > mine.score) mine.score = result.score;
    rows.sort((a, b) => b.score - a.score);
    facility.vision[game.id] = rows.slice(0, 12);
    DataLayer.saveFacility(facility);
  }
  if (typeof savePlayers === "function") savePlayers();
}

function visionPay(player, game, result) {
  const featured = visionFeatured();
  const v = visionState(player);
  const isFeatured = featured.game.id === game.id;
  let amount = 0;
  let note = "Practice. No XP this time.";
  if (isFeatured && v.featuredWindow !== featured.window) {
    amount = 150;
    if (result.accuracy >= 0.8) amount += 50;
    v.featuredWindow = featured.window;
    v.featuredClaimed = true;
    const missions = typeof roadTodayMissions === "function" ? roadTodayMissions(player) : [];
    const row = missions.find((m) => m.id === "vision");
    if (row) row.done = true;
    note = amount > 150 ? "+" + amount + " XP · featured drill, strong score." : "+" + amount + " XP · featured drill.";
  } else {
    const today = typeof roadToday === "function" ? roadToday() : "";
    if (v.practiceDay !== today) { v.practiceDay = today; v.practiceXp = 0; }
    const room = Math.max(0, 40 - (v.practiceXp || 0));
    amount = Math.min(10, room);
    v.practiceXp = (v.practiceXp || 0) + amount;
    note = amount ? "+" + amount + " XP · practice. Daily game cap is 40." : "Daily practice cap reached. Score still saved.";
    if (isFeatured) note = "Featured XP already earned this rotation. " + note;
  }
  let gained = 0;
  if (amount && typeof roadAward === "function") gained = (roadAward(player, amount, "vision") || {}).gained || 0;
  if (typeof savePlayers === "function") savePlayers();
  return { gained, note };
}

let visionAudio = null;
let visionSoundOn = false;

function visionUnlock() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  if (!visionAudio) visionAudio = new AC();
  if (visionAudio.state === "suspended") visionAudio.resume();
  visionSoundOn = visionAudio.state === "running" || visionAudio.state === "suspended";
  return visionSoundOn;
}

function visionPopSound() {
  if (!visionAudio) return;
  const ctx = visionAudio;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(520, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.8, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.12);
  const len = Math.max(1, Math.floor(ctx.sampleRate * 0.04));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  const ng = ctx.createGain();
  src.buffer = buf;
  ng.gain.value = 0.4;
  src.connect(ng);
  ng.connect(ctx.destination);
  src.start(t);
}

function visionCrackSound() {
  if (!visionAudio) return;
  const ctx = visionAudio;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.09);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.45, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.13);
  const len = Math.max(1, Math.floor(ctx.sampleRate * 0.07));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = ctx.createBufferSource();
  const ng = ctx.createGain();
  src.buffer = buf;
  ng.gain.value = 0.7;
  src.connect(ng);
  ng.connect(ctx.destination);
  src.start(t);
}

function visionRand(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const VISION_SPEEDS = {
  learn: { label: "Learn", mult: 2.5 },
  game: { label: "Game", mult: 1.5 },
  real: { label: "Real", mult: 1 },
};
let visionSpeed = "learn";
let visionPlayer = null;
try {
  const savedSpeed = localStorage.getItem("antonelli-vision-speed");
  if (VISION_SPEEDS[savedSpeed]) visionSpeed = savedSpeed;
} catch (e) { /* Learn stays the default */ }

function visionScale() {
  return (VISION_SPEEDS[visionSpeed] || VISION_SPEEDS.learn).mult;
}

function visionReady() {
  return (420 + Math.random() * 80) * Math.min(visionScale(), 1.8);
}

function visionGap() {
  return visionReduce() ? 420 : 1650;
}

function visionBand(player) {
  const group = String((player && player.ageGroup) || "");
  const age = Number(player && player.age) || 0;
  let key = "16U";
  if (/12/.test(group) || (age > 0 && age <= 12)) key = "12U";
  else if (/13|14/.test(group) || (age > 0 && age <= 14)) key = "14U";
  const rows = {
    "12U": { band: "12U", zoneH: 18, zoneBot: 17, distFt: 46, mph: 55, release: 48 },
    "14U": { band: "14U", zoneH: 20, zoneBot: 18, distFt: 57, mph: 65, release: 54 },
    "16U": { band: "16U", zoneH: 22, zoneBot: 19, distFt: 60.5, mph: 80, release: 60 },
  };
  const row = rows[key];
  const dist = row.distFt * 12;
  return {
    band: row.band,
    zoneH: row.zoneH,
    zoneBot: row.zoneBot,
    dist: dist,
    mph: row.mph,
    release: row.release,
    real: row.distFt / (row.mph * 5280 / 3600),
  };
}

function visionFlightMs(band, id) {
  const factor = id === "CB" ? 0.82 : id === "CH" ? 0.88 : (id === "SL" || id === "SWEEP") ? 0.92 : 1;
  return (band.real / factor) * visionScale() * 1000;
}

function visionIsStrike(x, y, band) {
  const ball = 1.45;
  return Math.abs(x) <= 8.5 + ball && y >= band.zoneBot - ball && y <= band.zoneBot + band.zoneH + ball;
}

function visionCross(a, b) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function visionNorm(v) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function visionDot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function visionScene(w, h, player) {
  const band = visionBand(player || visionPlayer);
  const lookY = band.zoneBot + band.zoneH / 2;
  const cam = { x: 0, y: lookY + 14, z: -78 };
  const fwd = visionNorm({ x: 0, y: lookY - cam.y, z: 0 - cam.z });
  const right = visionNorm(visionCross({ x: 0, y: 1, z: 0 }, fwd));
  const up = visionNorm(visionCross(fwd, right));
  const project = (x, y, zIn) => {
    const rel = { x: x - cam.x, y: y - cam.y, z: zIn - cam.z };
    return {
      cx: visionDot(rel, right),
      cy: visionDot(rel, up),
      cz: Math.max(0.01, visionDot(rel, fwd)),
    };
  };
  const edgeL = project(-8.5, lookY, 0);
  const edgeR = project(8.5, lookY, 0);
  const spread = edgeR.cx / edgeR.cz - edgeL.cx / edgeL.cz;
  const top = project(0, band.zoneBot + band.zoneH, 0);
  const point = project(0, 0, -17);
  const release = project(0, band.release, band.dist);
  const topN = top.cy / top.cz;
  const pointN = point.cy / point.cz;
  const rise = Math.abs(topN - pointN) || 0.001;
  const focal = Math.min((0.225 * w) / spread, (0.86 * h) / rise, (0.25 * w) / spread);
  let midN = (topN + pointN) / 2;
  const screenY = (ndc) => h * 0.5 - (ndc - midN) * focal;
  if (screenY(release.cy / release.cz) < h * 0.03) {
    const lifted = release.cy / release.cz - (h * 0.47) / focal;
    if (screenY(pointN) - (lifted - midN) * focal < h * 0.96 && screenY(topN) - (lifted - midN) * focal > h * 0.02) midN = lifted;
  }
  return { band: band, focal: focal, midN: midN, project: project, cam: cam, right: right, up: up, fwd: fwd, lookY: lookY };
}

let visionSceneCache = null;
function visionView(w, h) {
  const band = visionBand(visionPlayer);
  const key = w + "x" + h + ":" + band.band + ":" + band.dist;
  if (!visionSceneCache || visionSceneCache.key !== key) visionSceneCache = { key: key, scene: visionScene(w, h, visionPlayer) };
  return visionSceneCache.scene;
}

function visionProject(w, h, x, y, z) {
  const scene = visionView(w, h);
  const zIn = (1 - z) * scene.band.dist;
  const p = scene.project(x, y, zIn);
  const along = Math.max(0, Math.min(1, z));
  const plate = scene.project(0, scene.lookY, 0);
  const trueR = 1.45 * (scene.focal / p.cz);
  const plateR = 1.45 * (scene.focal / plate.cz);
  return {
    x: w * 0.5 + (p.cx / p.cz) * scene.focal,
    y: h * 0.5 - (p.cy / p.cz - scene.midN) * scene.focal,
    r: Math.max(trueR, plateR * (0.42 + 0.58 * along)),
  };
}

function visionPlateFromPx(w, h, px, py) {
  const scene = visionView(w, h);
  const nx = (px - w * 0.5) / scene.focal;
  const ny = (h * 0.5 - py) / scene.focal + scene.midN;
  const dir = {
    x: scene.right.x * nx + scene.up.x * ny + scene.fwd.x,
    y: scene.right.y * nx + scene.up.y * ny + scene.fwd.y,
    z: scene.right.z * nx + scene.up.z * ny + scene.fwd.z,
  };
  const t = (0 - scene.cam.z) / dir.z;
  return { x: scene.cam.x + dir.x * t, y: scene.cam.y + dir.y * t };
}

function visionSpot(pitch, t, extra) {
  const br = pitch.breaks;
  const bend = t * t;
  const add = extra || { x: 0, y: 0 };
  const aimX = pitch.x1 - br.x;
  const aimY = pitch.y1 - br.y;
  return {
    x: pitch.x0 + (aimX - pitch.x0) * t + (br.x + add.x) * bend,
    y: pitch.y0 + (aimY - pitch.y0) * t + (br.y + add.y) * bend,
    z: Math.max(0, Math.min(1, t)),
  };
}

function visionMakePitch(profile) {
  const band = visionBand(visionPlayer);
  const book = {
    FB: { x: 0.6, y: -2 },
    CB: { x: 2, y: -14 },
    CH: { x: -5, y: -8 },
    SL: { x: 10, y: -3 },
    CUT: { x: 4.5, y: -1 },
    SWEEP: { x: 13, y: -4 },
  };
  const id = profile || visionRand(["FB", "CB", "CH"]);
  const x1 = Math.max(-20, Math.min(20, Math.random() * 36 - 18));
  const y1 = Math.max(band.zoneBot - 8, Math.min(band.zoneBot + band.zoneH + 8, band.zoneBot - 6 + Math.random() * (band.zoneH + 12)));
  return {
    id: id,
    breaks: book[id] || book.FB,
    x0: 0,
    y0: band.release,
    x1: x1,
    y1: y1,
    strike: visionIsStrike(x1, y1, band),
    flight: visionFlightMs(band, id),
  };
}

function visionRestamp(pitch) {
  const band = visionBand(visionPlayer);
  pitch.strike = visionIsStrike(pitch.x1, pitch.y1, band);
  pitch.flight = visionFlightMs(band, pitch.id);
  return pitch;
}

function visionPaintStadium(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#071018");
  sky.addColorStop(0.38, "#122033");
  sky.addColorStop(0.62, "#1a140e");
  sky.addColorStop(1, "#24180f");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  const glow = g.createRadialGradient(w * 0.5, h * 0.02, 10, w * 0.5, h * 0.28, w * 0.7);
  glow.addColorStop(0, "rgba(242,208,96,.18)");
  glow.addColorStop(1, "rgba(242,208,96,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#0b121c";
  g.beginPath();
  g.moveTo(0, h * 0.36);
  g.lineTo(w * 0.14, h * 0.2);
  g.lineTo(w * 0.86, h * 0.2);
  g.lineTo(w, h * 0.36);
  g.lineTo(w, h * 0.5);
  g.lineTo(0, h * 0.5);
  g.closePath();
  g.fill();
  for (let row = 0; row < 6; row++) {
    const y = h * (0.24 + row * 0.034);
    const inset = w * (0.12 + row * 0.018);
    for (let i = 0; i < 22; i++) {
      if ((i + row * 2) % 3) continue;
      const x = inset + (w - inset * 2) * (i / 21);
      g.fillStyle = (i + row) % 2 ? "rgba(242,208,96,.45)" : "rgba(255,255,255,.28)";
      g.fillRect(x, y, 2, 2);
    }
  }
  g.fillStyle = "#124628";
  g.beginPath();
  g.moveTo(w * 0.3, h * 0.42);
  g.lineTo(w * 0.7, h * 0.42);
  g.lineTo(w * 0.94, h * 0.86);
  g.lineTo(w * 0.06, h * 0.86);
  g.closePath();
  g.fill();
  g.fillStyle = "#6d4c2b";
  g.beginPath();
  g.moveTo(w * 0.4, h * 0.5);
  g.lineTo(w * 0.6, h * 0.5);
  g.lineTo(w * 0.82, h * 0.94);
  g.lineTo(w * 0.18, h * 0.94);
  g.closePath();
  g.fill();
  const mound = visionProject(w, h, 0, 10, 0.03);
  g.fillStyle = "#8d6840";
  g.beginPath();
  g.ellipse(mound.x, mound.y + h * 0.012, w * 0.085, Math.max(6, h * 0.02), 0, 0, Math.PI * 2);
  g.fill();
  const s = Math.min(w, h) * 0.042;
  const px = mound.x;
  const py = mound.y;
  g.fillStyle = "#07080c";
  g.beginPath();
  g.arc(px, py - s * 2.35, s * 0.52, 0, Math.PI * 2);
  g.fill();
  g.fillRect(px - s * 0.42, py - s * 1.85, s * 0.84, s * 1.55);
  g.fillRect(px - s * 0.1, py - s * 2.82, s * 0.95, s * 0.16);
  g.beginPath();
  g.moveTo(px + s * 0.2, py - s * 1.35);
  g.lineTo(px + s * 1.45, py - s * 0.25);
  g.lineTo(px + s * 1.15, py);
  g.lineTo(px + s * 0.05, py - s * 1.0);
  g.closePath();
  g.fill();
  g.fillRect(px - s * 0.36, py - s * 0.32, s * 0.26, s * 1.05);
  g.fillRect(px + s * 0.08, py - s * 0.32, s * 0.26, s * 1.05);
  const band = visionBand(visionPlayer);
  const zSide = 1 + 8.5 / band.dist;
  const zPoint = 1 + 17 / band.dist;
  const plate = [[-8.5, 0, 1], [8.5, 0, 1], [8.5, 0, zSide], [0, 0, zPoint], [-8.5, 0, zSide]].map((pair) => visionProject(w, h, pair[0], pair[1], pair[2]));
  g.fillStyle = "#f7f4ee";
  g.beginPath();
  plate.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(20,16,12,.45)";
  g.lineWidth = 1;
  g.stroke();
  const zoneTop = band.zoneBot + band.zoneH;
  const zone = [
    visionProject(w, h, -8.5, zoneTop, 1),
    visionProject(w, h, 8.5, zoneTop, 1),
    visionProject(w, h, 8.5, band.zoneBot, 1),
    visionProject(w, h, -8.5, band.zoneBot, 1),
  ];
  g.strokeStyle = "rgba(242,208,96,.9)";
  g.lineWidth = Math.max(2, w * 0.004);
  g.beginPath();
  zone.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.closePath();
  g.stroke();
  g.strokeStyle = "rgba(242,208,96,.28)";
  g.lineWidth = 1;
  for (let i = 1; i <= 2; i++) {
    const y = band.zoneBot + (band.zoneH * i) / 3;
    const a = visionProject(w, h, -8.5, y, 1);
    const b = visionProject(w, h, 8.5, y, 1);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
    const x = -8.5 + (17 * i) / 3;
    const c = visionProject(w, h, x, zoneTop, 1);
    const d = visionProject(w, h, x, band.zoneBot, 1);
    g.beginPath();
    g.moveTo(c.x, c.y);
    g.lineTo(d.x, d.y);
    g.stroke();
  }
}

function visionField(ctx, w, h) {
  const band = visionBand(visionPlayer);
  const key = w + "x" + h + ":" + band.band + ":" + band.zoneH + ":" + band.dist;
  if (!visionField.layer || visionField.key !== key) {
    const layer = document.createElement("canvas");
    layer.width = w;
    layer.height = h;
    visionPaintStadium(layer.getContext("2d"), w, h);
    visionField.layer = layer;
    visionField.key = key;
  }
  ctx.drawImage(visionField.layer, 0, 0);
}

function visionDim(ctx, w, h, alpha) {
  visionField(ctx, w, h);
  ctx.fillStyle = "rgba(5,6,10," + alpha + ")";
  ctx.fillRect(0, 0, w, h);
}

function visionTrailReset() {
  visionBall.trails = {};
}

function visionBall(ctx, p, fill, seam, trailId) {
  const id = trailId || "main";
  if (!visionBall.trails) visionBall.trails = {};
  const trail = visionBall.trails[id] || (visionBall.trails[id] = []);
  if (!visionReduce()) {
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      ctx.globalAlpha = ((i + 1) / (trail.length + 1)) * 0.32;
      ctx.fillStyle = fill || "#f7f4ee";
      ctx.beginPath();
      ctx.arc(t.x, t.y, Math.max(1, t.r * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    trail.push({ x: p.x, y: p.y, r: p.r });
    if (trail.length > 5) trail.shift();
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fillStyle = fill || "#f7f4ee";
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = seam || "#c4121a";
  ctx.lineWidth = Math.max(1, p.r * 0.18);
  ctx.beginPath();
  ctx.arc(p.x - p.r * 0.22, p.y, p.r * 0.95, -1.05, 1.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(p.x + p.r * 0.22, p.y, p.r * 0.95, Math.PI - 1.05, Math.PI + 1.05);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,.4)";
  ctx.beginPath();
  ctx.arc(p.x - p.r * 0.28, p.y - p.r * 0.3, Math.max(1, p.r * 0.26), 0, Math.PI * 2);
  ctx.fill();
}

function visionSymbol(ctx, id, x, y, s, color) {
  ctx.strokeStyle = color || "#f2d060";
  ctx.fillStyle = color || "#f2d060";
  ctx.lineWidth = 3;
  if (id === "circle") {
    ctx.beginPath();
    ctx.arc(x, y, s * 0.38, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === "square") {
    ctx.strokeRect(x - s * 0.32, y - s * 0.32, s * 0.64, s * 0.64);
  } else if (id === "triangle") {
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.38);
    ctx.lineTo(x + s * 0.36, y + s * 0.3);
    ctx.lineTo(x - s * 0.36, y + s * 0.3);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.4);
    ctx.lineTo(x + s * 0.32, y);
    ctx.lineTo(x, y + s * 0.4);
    ctx.lineTo(x - s * 0.32, y);
    ctx.closePath();
    ctx.stroke();
  }
}

function visionResample(points, n) {
  if (!points.length) return [];
  if (points.length === 1) return Array.from({ length: n }, () => ({ x: points[0].x, y: points[0].y }));
  const seg = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    seg.push(d);
    total += d;
  }
  if (total < 0.0001) return Array.from({ length: n }, () => ({ x: points[0].x, y: points[0].y }));
  const out = [];
  for (let k = 0; k < n; k++) {
    let need = (total * k) / (n - 1);
    let i = 0;
    while (i < seg.length - 1 && need > seg[i]) { need -= seg[i]; i += 1; }
    const d = seg[i] || 1;
    const t = d ? need / d : 0;
    out.push({
      x: points[i].x + (points[i + 1].x - points[i].x) * t,
      y: points[i].y + (points[i + 1].y - points[i].y) * t,
    });
  }
  return out;
}

function visionFrechet(a, b) {
  const n = a.length;
  const m = b.length;
  if (!n || !m) return 1;
  const ca = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const d = Math.hypot(a[i].x - b[j].x, a[i].y - b[j].y);
      if (i === 0 && j === 0) ca[i][j] = d;
      else if (i === 0) ca[i][j] = Math.max(ca[0][j - 1], d);
      else if (j === 0) ca[i][j] = Math.max(ca[i - 1][0], d);
      else ca[i][j] = Math.max(Math.min(ca[i - 1][j], ca[i - 1][j - 1], ca[i][j - 1]), d);
    }
  }
  return ca[n - 1][m - 1];
}

function visionIqList() {
  if (visionIqList.cache) return Promise.resolve(visionIqList.cache);
  return fetch("vision-iq.json?v=20261022h").then((res) => {
    if (!res.ok) throw new Error("iq");
    return res.json();
  }).then((rows) => {
    visionIqList.cache = Array.isArray(rows) ? rows : [];
    return visionIqList.cache;
  }).catch(() => {
    visionIqList.cache = [];
    return visionIqList.cache;
  });
}

function visionChoices(kind) {
  if (kind === "vanish") return [{ id: "FB", name: "Fastball" }, { id: "CB", name: "Curve" }, { id: "CH", name: "Changeup" }];
  if (kind === "flash") return [{ id: "FB", name: "Fastball" }, { id: "SL", name: "Slider" }, { id: "CB", name: "Curve" }];
  if (kind === "gauntlet" || kind === "depth" || kind === "rhythm") return [{ id: "go", name: "SWING" }];
  if (kind === "matrix") return [{ id: "w", name: "Up" }, { id: "a", name: "Left" }, { id: "s", name: "Down" }, { id: "d", name: "Right" }];
  if (kind === "ghost") return [{ id: "left", name: "Left" }, { id: "mid", name: "Middle" }, { id: "right", name: "Right" }];
  if (kind === "tracer") return [{ id: "clear", name: "Clear" }, { id: "done", name: "Done" }];
  if (kind === "iq") return [{ id: "pull", name: "Pull" }, { id: "middle", name: "Middle" }, { id: "oppo", name: "Oppo" }, { id: "take", name: "Take" }];
  return [];
}

function visionKeyMap(kind, code, key) {
  const k = String(key || "").toLowerCase();
  const arrows = { arrowup: "w", arrowleft: "a", arrowdown: "s", arrowright: "d" };
  const wasd = arrows[k] || k;
  if (kind === "gauntlet") return (code === "Space" || wasd === "d") ? "go" : "";
  if (kind === "depth" || kind === "rhythm") return (code === "Space" || k === " ") ? "go" : "";
  if (kind === "matrix") {
    if (code === "Space") return "go";
    return ["w", "a", "s", "d"].includes(wasd) ? wasd : "";
  }
  if (kind === "tracer") return (code === "Enter") ? "done" : "";
  const four = visionChoices(kind);
  if (!four.length) return "";
  if (kind === "vanish" && (code === "Space" || ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k))) return "aim:" + k;
  const order = { a: 0, w: 1, d: 2, s: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
  if (kind === "flash") {
    const map = { r: 0, "1": 0, y: 1, "2": 1, b: 2, "3": 2, a: 0, w: 1, d: 2 };
    const idx = map[k];
    return idx == null ? "" : four[idx].id;
  }
  if (order[k] == null && order[wasd] == null) return "";
  const idx = order[k] != null ? order[k] : order[wasd];
  return four[idx] ? four[idx].id : "";
}

function visionSpeedHTML() {
  return "<div class=\"vision-speeds\" id=\"visionSpeeds\">" + ["learn", "game", "real"].map((id) => "<button type=\"button\" data-speed=\"" + id + "\"" + (id === visionSpeed ? " class=\"is-on\"" : "") + ">" + VISION_SPEEDS[id].label + "</button>").join("") + "</div>";
}

function visionBindSpeed(root) {
  if (!root) return;
  root.querySelectorAll("[data-speed]").forEach((btn) => {
    btn.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      const next = btn.dataset.speed;
      if (!VISION_SPEEDS[next]) return;
      visionSpeed = next;
      try { localStorage.setItem("antonelli-vision-speed", visionSpeed); } catch (e) { /* the button still shows the choice */ }
      root.querySelectorAll("[data-speed]").forEach((b) => b.classList.toggle("is-on", b === btn));
    });
  });
}

let visionHand = "R";
let visionHandPinned = false;
try {
  const savedHand = localStorage.getItem("antonelli-vision-hand");
  if (savedHand === "L" || savedHand === "R") { visionHand = savedHand; visionHandPinned = true; }
} catch (e) { /* right-handed stays the default */ }

function visionHandFor(player) {
  const bats = String((player && player.bats) || "R").toUpperCase();
  return bats.charAt(0) === "L" ? "L" : "R";
}

function visionUseHand(player) {
  if (!visionHandPinned) visionHand = visionHandFor(player);
}

function visionHandHTML() {
  return "<div class=\"vision-hands\" id=\"visionHands\">" + ["R", "L"].map((id) => "<button type=\"button\" data-hand=\"" + id + "\"" + (id === visionHand ? " class=\"is-on\"" : "") + ">" + (id === "R" ? "RHB" : "LHB") + "</button>").join("") + "</div>";
}

function visionTuneHTML() {
  return "<div class=\"vision-tune\">" + visionSpeedHTML() + visionHandHTML() + "</div>";
}

function visionBindHand(root) {
  if (!root) return;
  root.querySelectorAll("[data-hand]").forEach((btn) => {
    btn.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      const next = btn.dataset.hand;
      if (next !== "L" && next !== "R") return;
      visionHand = next;
      visionHandPinned = true;
      try { localStorage.setItem("antonelli-vision-hand", visionHand); } catch (e) { /* the button still shows the side */ }
      root.querySelectorAll("[data-hand]").forEach((b) => b.classList.toggle("is-on", b === btn));
    });
  });
}

function visionUmp(text) {
  const el = document.getElementById("visionUmp");
  if (el) el.textContent = text || "";
}

function visionPaintAb(run) {
  const el = document.getElementById("visionAb");
  if (el && run && run.ab) el.textContent = run.ab.b + "–" + run.ab.s;
}

function visionWord(result) {
  if (!result) return "";
  if (result.id === "take") return result.strike ? "TAKE · STRIKE!" : "TAKE · BALL";
  if (result.id === "chase") return "CHASE";
  if (result.id === "barrel") return "BARREL";
  if (result.id === "squared") return "SQUARED UP";
  if (result.id === "early") return "EARLY · pulled foul";
  if (result.id === "whiff") return "LATE · whiff";
  return "LATE · foul";
}

function visionTiming(dt) {
  const scale = visionScale();
  const tight = 28 * scale;
  const band = 55 * scale;
  const miss = 120 * scale;
  if (dt < -band) return { id: "early", contact: true, foul: true, spray: -1 };
  if (dt < -tight) return { id: "squared", contact: true, foul: false, spray: -0.35 };
  if (dt <= tight) return { id: "barrel", contact: true, foul: false, spray: 0.08 };
  if (dt <= miss) return { id: "late-foul", contact: true, foul: true, spray: 1 };
  return { id: "whiff", contact: false, foul: false, spray: 0 };
}

function visionBumpCount(run, result) {
  const ab = run.ab;
  if (!ab) return;
  if (result.id === "barrel" || result.id === "squared") { ab.b = 0; ab.s = 0; }
  else if (result.id === "take" && !result.strike) ab.b += 1;
  else if (result.foul) { if (ab.s < 2) ab.s += 1; }
  else ab.s += 1;
  if (ab.b >= 4 || ab.s >= 3) ab.pending = true;
  visionPaintAb(run);
}

function visionSettle(run, now) {
  if (run.batJudged) return run.batResult;
  run.batJudged = true;
  const strike = !!(run.pitch && run.pitch.strike);
  let result;
  if (!run.swung && !run.batSwing) result = { id: "take", contact: false, foul: false, strike: strike, spray: 0 };
  else {
    const swing = run.batSwing;
    const arrival = run.arriveAt || now;
    const contactAt = swing ? swing.t0 + swing.dur * 0.45 : arrival;
    result = visionTiming(contactAt - arrival);
    result.strike = strike;
    if (!strike) result.id = "chase";
  }
    run.batResult = result;
  if (result.contact) visionCrackSound();
  else visionPopSound();
  if (result.contact && run.pitch && run.game && (run.game.kind === "gauntlet" || run.game.kind === "matrix")) {
    const sign = visionHand === "L" ? -1 : 1;
    const band = visionBand(visionPlayer);
    run.fly = {
      t0: now,
      dur: 720,
      x: result.spray * sign * 1.5,
      y: band.zoneBot + band.zoneH * 0.55,
      z: 1,
      vx: result.spray * sign * 36,
      vy: result.foul ? 14 : 42,
      vz: result.foul ? -0.25 : -0.7,
    };
    run.hidePitch = true;
  }
  visionBumpCount(run, result);
  const ump = result.id === "take" ? (result.strike ? "STRIKE!" : "BALL")
    : (result.id === "whiff" || (result.id === "chase" && !result.contact)) ? "STRIKE!"
    : (result.foul || result.id === "early" || result.id === "late-foul") ? "FOUL"
    : result.id === "barrel" ? "BARREL"
    : result.id === "squared" ? "SQUARED UP"
    : result.id === "chase" ? "CHASE"
    : "STRIKE!";
  visionUmp(ump);
  return result;
}

function visionTrack(run, now) {
  if (!run || run.batJudged || !run.arriveAt || run.phase === "ready") return;
  if (run.batSwing) {
    if (now < run.batSwing.t0 + run.batSwing.dur * 0.45) return;
    visionSettle(run, now);
    return;
  }
  if (now >= run.arriveAt) visionSettle(run, now);
}

function visionStartSwing(run) {
  if (!run || run.phase === "ready" || run.batJudged) return false;
  const now = performance.now();
  if (run.batSwing && now - run.batSwing.t0 < run.batSwing.dur * 0.75) return false;
  run.batSwing = { t0: now, dur: 200 * visionScale() };
  run.swung = true;
  if (!run.swingAt) run.swingAt = now - (run.t0 || now);
  return true;
}

function visionDrawBat(ctx, w, h, now, run) {
  if (!run || !run.game || run.game.kind === "reflex") return;
  visionTrack(run, now);
  const band = visionBand(visionPlayer);
  const sign = visionHand === "L" ? -1 : 1;
  const pivotX = sign * 16;
  const pivotY = band.zoneBot + band.zoneH * 0.42;
  const len = 18;
  const swing = run.batSwing;
  const u = swing ? Math.max(0, Math.min(1, (now - swing.t0) / swing.dur)) : 0;
  const readyA = Math.atan2(0.42, 0.72);
  const contactA = Math.PI;
  const followA = Math.PI + 0.95;
  let angle = readyA;
  if (u > 0 && u < 0.45) angle = readyA + (contactA - readyA) * (u / 0.45);
  else if (u >= 0.45) angle = contactA + (followA - contactA) * ((u - 0.45) / 0.55);
  if (sign < 0) angle = Math.PI - angle;
  const barrelX = pivotX + Math.cos(angle) * len;
  const barrelY = pivotY + Math.sin(angle) * len;
  const z = 1.012;
  const grip = visionProject(w, h, pivotX, pivotY, z);
  const barrel = visionProject(w, h, barrelX, barrelY, z);
  const dx = barrel.x - grip.x;
  const dy = barrel.y - grip.y;
  const mag = Math.hypot(dx, dy) || 1;
  const nx = -dy / mag;
  const ny = dx / mag;
  const hw0 = Math.max(2.5, grip.r * 0.22);
  const hw1 = Math.max(4, barrel.r * 0.62);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(grip.x + nx * hw0, grip.y + ny * hw0);
  ctx.lineTo(barrel.x + nx * hw1, barrel.y + ny * hw1);
  ctx.lineTo(barrel.x - nx * hw1, barrel.y - ny * hw1);
  ctx.lineTo(grip.x - nx * hw0, grip.y - ny * hw0);
  ctx.closePath();
  ctx.fillStyle = "#d39245";
  ctx.fill();
  ctx.strokeStyle = "rgba(40,22,8,.85)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#f3e6c8";
  ctx.beginPath();
  ctx.arc(barrel.x, barrel.y, hw1 * 0.92, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const fly = run.fly;
  if (fly) {
    const sec = (now - fly.t0) / 1000;
    if (sec >= 0 && sec < fly.dur / 1000) {
      const x = fly.x + fly.vx * sec;
      const y = fly.y + fly.vy * sec - 48 * sec * sec;
      const zf = Math.max(0.02, fly.z + fly.vz * sec);
      visionBall(ctx, visionProject(w, h, x, y, zf));
    }
  }
}

function visionExitHTML() {
  return "<button type=\"button\" class=\"vision-exit\" id=\"visionExit\">✕ All games</button>";
}

function visionStageHTML(game, mode) {
  const choices = visionChoices(game.kind);
  const cols = choices.length === 1 ? " is-one" : choices.length === 3 ? " is-3" : choices.length >= 4 ? " is-4" : "";
  const pads = choices.map((c) => "<button type=\"button\" class=\"" + (c.id === "go" ? "vision-swing" : "") + "\" data-pick=\"" + c.id + "\">" + visionEsc(c.name) + "</button>").join("");
  const swingExtra = game.kind === "reflex" || choices.some((c) => c.id === "go") || game.kind === "matrix" ? "" : "<button type=\"button\" class=\"vision-swing\" id=\"visionSwing\">SWING</button>";
  if (mode === "intro") {
    return "<div class=\"vision-stage\" data-kind=\"" + game.kind + "\"><div class=\"vision-hud\"><span class=\"vision-kicker\">PITCH RECOGNITION</span>" + visionExitHTML() + "</div><h2>" + visionEsc(game.name) + "</h2>" + visionTuneHTML() + "<p class=\"vision-copy\">" + visionEsc(game.benefit) + "</p><p class=\"vision-controls-note\">" + visionEsc(game.controls) + "</p>" +
      (game.kind === "rhythm" ? "<p class=\"vision-sound\" id=\"visionSound\">Tap Start to turn sound on.</p>" : "") +
      "<div class=\"vision-actions\"><button class=\"btn btn-red\" type=\"button\" id=\"visionStart\">Start</button><button class=\"btn btn-ghost\" type=\"button\" id=\"visionBack\">All games</button></div></div>";
  }
  return "<div class=\"vision-stage\" data-kind=\"" + game.kind + "\"><div class=\"vision-hud\"><span id=\"visionCount\">1 / " + game.rounds + "</span><span id=\"visionAb\">0–0</span><span id=\"visionLiveScore\">0</span><span id=\"visionStreak\">Streak 0</span>" + visionExitHTML() + "</div>" + visionTuneHTML() +
    (game.kind === "rhythm" ? "<p class=\"vision-sound\" id=\"visionSound\">" + (visionSoundOn ? "Sound on" : "Tap to turn sound on") + "</p>" : "") +
    "<p class=\"vision-ump\" id=\"visionUmp\"></p><p class=\"vision-call\" id=\"visionCall\"></p>" +
    "<canvas class=\"vision-canvas\" id=\"visionCanvas\" width=\"640\" height=\"480\"></canvas>" +
    swingExtra +
    (choices.length ? "<div class=\"vision-pad" + cols + "\" id=\"visionPad\">" + pads + (game.kind === "matrix" ? "<button type=\"button\" class=\"vision-swing\" data-pick=\"go\">SWING</button>" : "") + "</div>" : (game.kind === "reflex" ? "<p class=\"vision-controls-note\">Tap the ball.</p>" : "")) +
    "</div>";
}

function visionResultsHTML(game, result, pay) {
  return "<div class=\"vision-stage vision-results\" data-kind=\"" + game.kind + "\"><div class=\"vision-hud\"><span class=\"vision-kicker\">RESULTS · " + visionEsc(game.name) + "</span>" + visionExitHTML() + "</div><h2>Score</h2><p class=\"vision-score\">" + result.score + "</p>" +
    "<div class=\"vision-stats\"><div><b>" + Math.round(result.accuracy * 100) + "%</b><span>Accuracy</span></div><div><b>" + result.streak + "</b><span>Best streak</span></div><div><b>" + visionEsc(result.statText) + "</b><span>" + visionEsc(game.stat) + "</span></div></div>" +
    "<p class=\"vision-copy\">" + visionEsc(pay.note) + " Overall did not change. This is a benchmark, not a recruiting read.</p>" +
    "<p class=\"vision-pb\">Personal best " + result.score + "</p>" +
    "<div class=\"vision-actions\"><button class=\"btn btn-red\" type=\"button\" id=\"visionAgain\">Play again</button><button class=\"btn btn-ghost\" type=\"button\" id=\"visionBack\">All games</button></div></div>";
}

function visionShell(on) {
  document.documentElement.classList.toggle("vision-playing", !!on);
  if (document.body) document.body.classList.toggle("vision-playing", !!on);
}

function visionLeave() {
  visionStop();
  visionShell(false);
  const hub = document.getElementById("visionHub");
  if (hub) hub.dataset.live = "";
  visionMount(true);
}

function visionBindLeave() {
  const exit = document.getElementById("visionExit");
  if (exit) exit.addEventListener("click", visionLeave);
  const back = document.getElementById("visionBack");
  if (back) back.addEventListener("click", visionLeave);
}

let visionRun = null;

function visionStop() {
  if (!visionRun) return;
  visionRun.gen += 1;
  visionRun.alive = false;
  if (visionRun.raf) cancelAnimationFrame(visionRun.raf);
  if (visionRun.key) window.removeEventListener("keydown", visionRun.key);
  if (visionRun.timer) clearTimeout(visionRun.timer);
  visionRun = null;
  const hub = document.getElementById("visionHub");
  if (hub) hub.dataset.live = "";
}

function visionPlay(player, game) {
  visionPlayer = player;
  visionUseHand(player);
  visionStop();
  const hub = document.getElementById("visionHub");
  if (!hub) return;
  hub.dataset.live = "1";
  hub.innerHTML = visionStageHTML(game, "play");
  visionShell(true);
  visionBindLeave();
  visionBindSpeed(hub);
  visionBindHand(hub);
  const canvas = document.getElementById("visionCanvas");
  const ctx = canvas.getContext("2d");
  const fit = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(320, Math.round(rect.width * dpr));
    const h = Math.max(240, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  };
  const run = {
    player, game, gen: 1, alive: true, index: 0, score: 0, right: 0, asked: 0, streak: 0, bestStreak: 0,
    phase: "boot", t0: 0, pitch: null, call: "", raf: 0, timer: 0, key: null,
    reactions: [], chases: { swings: 0, balls: 0 }, pathScores: [], words: [],
    hits: 0, misses: 0, speedSum: 0, dualFlash: 0, dualSwing: 0,
    aim: { x: 0, y: 0.5 }, stroke: [], truePath: [], drawing: false,
    bang: "", iq: [], ab: { b: 0, s: 0, pending: false },
    batSwing: null, batJudged: false, batResult: null, fly: null, hidePitch: false, arriveAt: 0,
  };
  visionRun = run;
  const say = (text) => {
    run.call = text;
    const el = document.getElementById("visionCall");
    if (el) el.textContent = text;
  };
  const paintHud = () => {
    const count = document.getElementById("visionCount");
    const score = document.getElementById("visionLiveScore");
    const streak = document.getElementById("visionStreak");
    if (count) count.textContent = Math.min(game.rounds, run.index + 1) + " / " + game.rounds;
    if (score) score.textContent = String(run.score);
    if (streak) streak.textContent = "Streak " + run.streak;
    visionPaintAb(run);
  };
  const later = (ms, fn) => {
    if (run.timer) clearTimeout(run.timer);
    const gen = run.gen;
    run.timer = setTimeout(() => { if (visionRun === run && run.gen === gen) fn(); }, ms);
  };
  const loop = (gen, frame) => {
    const step = (now) => {
      if (visionRun !== run || run.gen !== gen || !run.alive) return;
      fit();
      frame(now);
      if (visionRun === run && run.gen === gen && run.alive) run.raf = requestAnimationFrame(step);
    };
    if (run.raf) cancelAnimationFrame(run.raf);
    run.raf = requestAnimationFrame(step);
  };
  const mult = () => 1 + 0.15 * Math.min(run.streak, 6);
  const bumpStreak = (ok) => {
    if (ok) { run.streak += 1; run.bestStreak = Math.max(run.bestStreak, run.streak); }
    else run.streak = 0;
  };
  const finish = () => {
    run.alive = false;
    run.gen += 1;
    if (run.raf) cancelAnimationFrame(run.raf);
    if (run.timer) clearTimeout(run.timer);
    if (run.key) window.removeEventListener("keydown", run.key);
    const asked = Math.max(1, run.asked);
    let statText = Math.round((run.right / asked) * 100) + "%";
    let accuracy = run.right / asked;
    if (game.kind === "flash" || game.kind === "rhythm") statText = (run.reactions.length ? Math.round(run.reactions.reduce((a, b) => a + b, 0) / run.reactions.length) : 0) + "";
    if (game.kind === "gauntlet") statText = (run.chases.balls ? Math.round((run.chases.swings / run.chases.balls) * 100) : 0) + "%";
    if (game.kind === "depth") statText = run.words.filter((w) => w === "Perfect").length + " Perfect";
    if (game.kind === "tracer") {
      const avg = run.pathScores.length ? run.pathScores.reduce((a, b) => a + b, 0) / run.pathScores.length : 0;
      statText = Math.round(avg) + "%";
      accuracy = avg / 100;
    }
    if (game.kind === "matrix") accuracy = (run.dualFlash + run.dualSwing) / Math.max(1, run.asked * 2);
    if (game.kind === "reflex") {
      const rpm = Math.max(0, Math.round(1100 + run.hits * 55 + run.speedSum - run.misses * 40));
      statText = String(rpm);
      accuracy = run.hits / Math.max(1, run.hits + run.misses);
      run.right = run.hits;
    }
    const result = { player, score: run.score, accuracy, streak: run.bestStreak, statText };
    visionRun = null;
    visionSaveScore(player, game, result);
    const pay = visionPay(player, game, result);
    const live = document.getElementById("visionHub") || hub;
    live.dataset.live = "1";
    live.innerHTML = visionResultsHTML(game, result, pay);
    visionShell(true);
    visionBindLeave();
    const best = live.querySelector(".vision-pb");
    if (best) best.textContent = "Personal best " + (visionBest(player, game.id) || result.score);
    const again = live.querySelector("#visionAgain");
    if (again) again.addEventListener("click", () => visionShowIntro(player, game.id));
  };
  const next = () => {
    run.index += 1;
    if (run.index >= game.rounds) finish();
    else begin();
  };

  const beginVanish = () => {
    run.pitch = visionMakePitch(visionRand(["FB", "CB", "CH"]));
    run.phase = "ready";
    run.t0 = performance.now();
    run.readyFor = visionReady();
    run.aim = { x: run.pitch.x1, y: run.pitch.y1 };
    say("Ready");
    const gen = run.gen;
    loop(gen, (now) => {
      if (run.phase === "ready") {
        visionField(ctx, canvas.width, canvas.height);
        visionDrawBat(ctx, canvas.width, canvas.height, now, run);
        if (now - run.t0 < run.readyFor) return;
        run.phase = "show";
        run.t0 = now;
        run.arriveAt = now + run.pitch.flight * 0.5;
        say("Name it before it vanishes");
      }
      const t = (now - run.t0) / run.pitch.flight;
      visionField(ctx, canvas.width, canvas.height);
      if (!run.hidePitch && t < 0.5) {
        const s = visionSpot(run.pitch, t);
        visionBall(ctx, visionProject(canvas.width, canvas.height, s.x, s.y, s.z));
      } else if (run.phase === "show") {
        run.phase = "type";
        say("Fastball, curve, or changeup");
      }
      if (run.phase === "locate") {
        const mark = visionProject(canvas.width, canvas.height, run.aim.x, run.aim.y, 1);
        ctx.strokeStyle = "#f2d060";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mark.x, mark.y, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (!run.locked && run.phase === "type" && t > 2.2) gradeVanish("", null);
      if (!run.locked && run.phase === "locate" && t > 3.5) gradeVanish(run.typePick, null);
      visionDrawBat(ctx, canvas.width, canvas.height, now, run);
    });
  };
  const gradeVanish = (typeId, plate) => {
    if ((run.phase === "type" || run.phase === "show") && typeId && plate == null && typeId.indexOf("aim:") !== 0) {
      run.phase = "locate";
      run.typePick = typeId;
      say("Tap where it crosses the plate");
      return;
    }
    if (run.phase === "type" && !typeId) {
      run.locked = true;
      run.alive = false;
      run.asked += 1;
      bumpStreak(false);
      say("Late");
      paintHud();
      later(visionGap(), () => { run.locked = false; run.alive = true; next(); });
      return;
    }
    if (run.phase !== "locate" || run.locked) return;
    run.locked = true;
    run.alive = false;
    run.asked += 1;
    const typeOk = run.typePick === run.pitch.id;
    let loc = 0;
    if (plate) {
      const dist = Math.hypot(plate.x - run.pitch.x1, plate.y - run.pitch.y1);
      const prox = 1 - Math.min(1, dist / 24);
      loc = Math.round(50 + prox * 150);
    }
    if (typeOk) run.right += 1;
    const typePts = typeOk ? 100 : 0;
    bumpStreak(typeOk);
    run.score += Math.round((typePts + loc) * mult());
    say(typeOk ? "Type +" + typePts + " · location +" + loc : "Missed the type · location +" + loc);
    paintHud();
    run.phase = "wait";
    later(visionGap(), () => { run.locked = false; run.alive = true; next(); });
  };

  const beginFlash = () => {
    const ids = ["FB", "SL", "CB"];
    run.pitch = visionMakePitch(visionRand(ids));
    run.phase = "arm";
    run.t0 = performance.now();
    run.flashAt = 0;
    run.flashFor = 150 + Math.random() * 50;
    run.locked = false;
    const colors = { FB: "#e10600", SL: "#f2d060", CB: "#3ec4ff" };
    say("Wait for the color");
    const gen = run.gen;
    loop(gen, (now) => {
      const elapsed = now - run.t0;
      visionField(ctx, canvas.width, canvas.height);
      const show = elapsed > 80 && elapsed < 80 + run.flashFor;
      if (show && !run.flashAt) run.flashAt = now;
      const s = visionSpot(run.pitch, 0.12);
      const p = visionProject(canvas.width, canvas.height, s.x, s.y, s.z);
      visionBall(ctx, p, show ? colors[run.pitch.id] : "#f7f4ee", show ? "#111" : "#c4121a");
      visionDrawBat(ctx, canvas.width, canvas.height, now, run);
      if (run.flashAt && now - run.flashAt > 1500 * visionScale() && !run.locked) gradeFlash("");
    });
  };
  const gradeFlash = (id) => {
    if (run.locked) return;
    if (!run.flashAt) {
      run.locked = true;
      run.alive = false;
      run.asked += 1;
      bumpStreak(false);
      run.score -= 70;
      say("Early −70");
      paintHud();
      later(visionGap(), () => { run.alive = true; next(); });
      return;
    }
    run.locked = true;
    run.asked += 1;
    const reaction = (performance.now() - run.flashAt) / visionScale();
    run.reactions.push(reaction);
    const ok = id === run.pitch.id;
    const factor = 1 / Math.max(0.12, reaction / 1000);
    if (ok) { run.right += 1; bumpStreak(true); run.score += Math.round(100 * factor); say("+" + Math.round(100 * factor)); }
    else { bumpStreak(false); run.score += Math.round(-70 * factor); say("Wrong " + Math.round(-70 * factor)); }
    paintHud();
    later(visionGap(), next);
  };

  const beginGauntlet = () => {
    run.pitch = visionMakePitch(visionRand(["FB", "FB", "SL", "CB", "CH"]));
    run.phase = "ready";
    run.t0 = performance.now();
    run.readyFor = visionReady();
    run.swung = false;
    run.locked = false;
    say("Ready");
    const gen = run.gen;
    loop(gen, (now) => {
      visionField(ctx, canvas.width, canvas.height);
      if (run.phase === "ready") {
        visionDrawBat(ctx, canvas.width, canvas.height, now, run);
        if (now - run.t0 < run.readyFor) return;
        run.phase = "live";
        run.t0 = now;
        run.arriveAt = now + run.pitch.flight;
        say("Swing strikes. Take balls.");
      }
      const t = (now - run.t0) / run.pitch.flight;
      if (!run.hidePitch) {
        const s = visionSpot(run.pitch, Math.min(1, t));
        visionBall(ctx, visionProject(canvas.width, canvas.height, s.x, s.y, s.z));
      }
      visionDrawBat(ctx, canvas.width, canvas.height, now, run);
      if (t >= 1 && !run.locked) gradeGauntlet(false);
    });
  };
  const gradeGauntlet = (swung) => {
    if (run.phase === "ready") return;
    if (swung && !run.batJudged && (performance.now() - run.t0) < run.pitch.flight) { run.swung = true; return; }
    if (run.locked) return;
    if (!run.swung && (performance.now() - run.t0) < run.pitch.flight) return;
    run.locked = true;
    const result = visionSettle(run, performance.now());
    run.asked += 1;
    const swing = !!run.swung;
    const strike = !!run.pitch.strike;
    if (!strike) { run.chases.balls += 1; if (swing) run.chases.swings += 1; }
    const ok = swing === strike;
    const pts = ok ? 100 : -200;
    if (ok) { run.right += 1; bumpStreak(true); run.score += 100; }
    else { bumpStreak(false); run.score -= 200; }
    say(visionWord(result) + (pts > 0 ? " +" + pts : " −" + Math.abs(pts)));
    paintHud();
    later(visionGap(), () => { run.locked = false; run.alive = true; next(); });
  };

  const beginMatrix = () => {
    run.pitch = visionRestamp(visionMakePitch("FB"));
    const band = visionBand(visionPlayer);
    run.pitch.x1 = Math.random() * 3 - 1.5;
    run.pitch.y1 = band.zoneBot + band.zoneH * 0.5;
    visionRestamp(run.pitch);
    run.phase = "live";
    run.t0 = performance.now();
    run.locked = false;
    run.swung = false;
    run.swingAt = 0;
    run.flashPick = "";
    const cue = visionRand(VISION_SYMBOLS).id;
    const panels = ["w", "a", "s", "d"];
    const match = visionRand(panels);
    const used = VISION_SYMBOLS.map((s) => s.id);
    const assigned = {};
    panels.forEach((p) => {
      assigned[p] = p === match ? cue : used.find((id) => id !== cue && !Object.values(assigned).includes(id)) || cue;
    });
    run.matrix = { cue, match, assigned };
    run.arriveAt = run.t0 + 980 * visionScale();
    say("Cue " + cue + " · swing the middle");
    const gen = run.gen;
    loop(gen, (now) => {
      const t = (now - run.t0) / (980 * visionScale());
      const w = canvas.width;
      const h = canvas.height;
      visionField(ctx, w, h);
      const spots = {
        w: { x: w * 0.5, y: h * 0.16 },
        a: { x: w * 0.14, y: h * 0.48 },
        s: { x: w * 0.5, y: h * 0.84 },
        d: { x: w * 0.86, y: h * 0.48 },
      };
      const flashing = t < 0.8;
      Object.keys(spots).forEach((key) => {
        const p = spots[key];
        ctx.strokeStyle = "rgba(242,208,96,.45)";
        ctx.strokeRect(p.x - 28, p.y - 28, 56, 56);
        if (flashing) visionSymbol(ctx, run.matrix.assigned[key], p.x, p.y, 54, "#fff");
      });
      visionSymbol(ctx, run.matrix.cue, w * 0.5, h * 0.08, 28, "#f2d060");
      if (!run.hidePitch) {
        const s = visionSpot(run.pitch, Math.min(1, t));
        visionBall(ctx, visionProject(w, h, s.x, s.y, s.z));
      }
      visionDrawBat(ctx, w, h, now, run);
      if (t >= 1.35 && !run.locked) gradeMatrix();
    });
  };
  const gradeMatrix = () => {
    if (run.locked || run.phase !== "live") return;
    run.locked = true;
    run.alive = false;
    run.asked += 1;
    const flashOk = run.flashPick === run.matrix.match;
    const swingOk = run.swung && run.swingAt > 700 * visionScale() && run.swingAt < 1100 * visionScale();
    if (flashOk) run.dualFlash += 1;
    if (swingOk) run.dualSwing += 1;
    if (flashOk && swingOk) run.right += 1;
    bumpStreak(flashOk);
    let pts = (flashOk ? 120 : 0) + (swingOk ? 80 : 0);
    if (flashOk) pts = Math.round(pts * mult());
    run.score += pts;
    say(flashOk ? "Flash held · " + pts : "Flash missed · combo broken");
    paintHud();
    later(visionGap(), () => { run.alive = true; next(); });
  };

  const beginDepth = () => {
    run.phase = "grow";
    run.t0 = performance.now();
    run.dur = (500 + Math.random() * 700) * visionScale();
    run.locked = false;
    say("Tap when the ball fills the ring");
    const gen = run.gen;
    loop(gen, (now) => {
      const w = canvas.width;
      const h = canvas.height;
      visionField(ctx, w, h);
      const u = Math.min(1, (now - run.t0) / run.dur);
      const scale = 0.1 + u * 1.9;
      const base = Math.min(w, h) * 0.08;
      ctx.strokeStyle = "rgba(242,208,96,.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.48, base * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      visionBall(ctx, { x: w * 0.5, y: h * 0.48, r: base * scale });
      visionDrawBat(ctx, w, h, now, run);
      if (u >= 1 && !run.locked) gradeDepth(run.dur + 80);
    });
  };
  const gradeDepth = (when) => {
    if (run.locked || run.phase !== "grow") return;
    run.locked = true;
    run.asked += 1;
    const target = run.dur * ((1.5 - 0.1) / 1.9);
    const dt = (when == null ? performance.now() - run.t0 : when) - target;
    const abs = Math.abs(dt) / visionScale();
    let word = "Late";
    let pts = 0;
    if (abs <= 20) { word = "Perfect"; pts = 220; run.right += 1; }
    else if (abs <= 50) { word = "Good"; pts = 130; run.right += 1; }
    else word = dt < 0 ? "Early" : "Late";
    run.words.push(word);
    bumpStreak(word === "Perfect" || word === "Good");
    run.score += Math.round(pts * (pts ? mult() : 1));
    say(word + (pts ? " +" + pts : ""));
    paintHud();
    later(visionGap(), () => { run.alive = true; next(); });
  };

  const ghostBalls = (t) => {
    const pitch = run.pitch;
    if (t < 0.5) return [{ id: "true", spot: visionSpot(pitch, t) }];
    const u = Math.min(1, t);
    return [
      { id: "true", spot: visionSpot(pitch, u) },
      { id: "decoy-a", spot: visionSpot(pitch, u, { x: -14, y: 2 }) },
      { id: "decoy-b", spot: visionSpot(pitch, u, { x: 11, y: -12 }) },
    ];
  };
  const beginGhost = () => {
    run.pitch = visionMakePitch(visionRand(["SL", "CH", "CB"]));
    run.phase = "live";
    run.t0 = performance.now();
    run.arriveAt = run.t0 + 1100 * visionScale();
    run.locked = false;
    say("Track the true ball");
    const gen = run.gen;
    loop(gen, (now) => {
      const t = (now - run.t0) / (1100 * visionScale());
      visionField(ctx, canvas.width, canvas.height);
      if (!run.hidePitch) ghostBalls(Math.min(1.05, t)).forEach((ball) => {
        const p = visionProject(canvas.width, canvas.height, ball.spot.x, ball.spot.y, ball.spot.z);
        visionBall(ctx, p, null, null, ball.id);
        ball.px = p;
      });
      visionDrawBat(ctx, canvas.width, canvas.height, now, run);
      run.ghost = ghostBalls(Math.min(1, Math.max(0.5, t)));
      if (run.bang) {
        ctx.fillStyle = "rgba(0,0,0,.55)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "700 42px Impact, sans-serif";
        ctx.fillText("STRIKEOUT", canvas.width / 2, canvas.height * 0.42);
        ctx.fillStyle = "#f2d060";
        ctx.font = "700 28px Impact, sans-serif";
        ctx.fillText("BROKEN BAT", canvas.width / 2, canvas.height * 0.56);
      }
      if (t > 1.15 && !run.locked) gradeGhost("miss");
    });
  };
  const gradeGhost = (which) => {
    if (run.locked || run.phase !== "live") return;
    const t = (performance.now() - run.t0) / (1100 * visionScale());
    if (t < 0.5) return;
    run.locked = true;
    run.asked += 1;
    const ok = which === "true";
    if (ok) {
      run.right += 1;
      bumpStreak(true);
      const pts = Math.round(160 * mult());
      run.score += pts;
      say("True ball +" + pts);
      paintHud();
      run.alive = false;
      later(visionGap(), () => { run.alive = true; next(); });
    } else {
      bumpStreak(false);
      run.bang = "out";
      say("Strikeout");
      paintHud();
      later(visionGap(), () => { run.bang = ""; run.alive = false; later(40, () => { run.alive = true; next(); }); });
    }
  };

  const beginRhythm = () => {
    run.phase = "wait";
    run.t0 = performance.now();
    run.popAt = 0;
    run.locked = false;
    run.wait = 1500 + Math.random() * 1500;
    say(visionSoundOn ? "Sound on · wait for the pop" : "Sound on");
    later(run.wait, () => {
      if (run.phase !== "wait" || run.locked) return;
      visionPopSound();
      run.popAt = performance.now();
      run.phase = "go";
      say("Swing");
    });
    const gen = run.gen;
    loop(gen, (now) => {
      const w = canvas.width;
      const h = canvas.height;
      visionDim(ctx, w, h, 0.78);
      ctx.strokeStyle = "rgba(242,208,96,.7)";
      ctx.strokeRect(w * 0.28, h * 0.34, w * 0.44, h * 0.28);
      if (run.popAt && now - run.popAt < 280) visionBall(ctx, { x: w * 0.5, y: h * 0.48, r: Math.min(w, h) * 0.07 }, "#f2d060", "#111");
      visionDrawBat(ctx, w, h, now, run);
      if (run.popAt && now - run.popAt > 900 * visionScale() && !run.locked) gradeRhythm(false);
    });
  };
  const gradeRhythm = (tapped) => {
    if (run.locked) return;
    if (!run.popAt) { run.locked = true; run.asked += 1; bumpStreak(false); say("Too early"); paintHud(); run.alive = false; later(300, () => { run.alive = true; next(); }); return; }
    if (!tapped) { run.locked = true; run.asked += 1; bumpStreak(false); say("Late"); paintHud(); later(280, () => { run.alive = true; next(); }); return; }
    run.locked = true;
    run.asked += 1;
    const reaction = (performance.now() - run.popAt) / visionScale();
    run.reactions.push(reaction);
    run.right += 1;
    bumpStreak(true);
    const pts = Math.round(180 / Math.max(0.1, reaction / 1000));
    run.score += pts;
    say("+" + pts);
    paintHud();
    later(visionGap(), () => { run.alive = true; next(); });
  };

  const tracerShapes = ["CB", "SWEEP", "CUT"];
  const beginTracer = () => {
    run.pitch = visionMakePitch(tracerShapes[run.index % 3]);
    run.phase = "show";
    run.t0 = performance.now();
    run.arriveAt = run.t0 + 980 * visionScale();
    run.truePath = [];
    run.stroke = [];
    run.locked = false;
    const names = { CB: "12–6 curve", SWEEP: "Sweeping slider", CUT: "Cutter" };
    say(names[run.pitch.id] || "Watch");
    const gen = run.gen;
    loop(gen, (now) => {
      const w = canvas.width;
      const h = canvas.height;
      if (run.phase === "show") {
        const t = (now - run.t0) / (980 * visionScale());
        visionField(ctx, w, h);
        const s = visionSpot(run.pitch, Math.min(1, Math.max(0, t)));
        const p = visionProject(w, h, s.x, s.y, s.z);
        if (!run.hidePitch) {
          visionBall(ctx, p);
          if (t >= 0 && t <= 1) run.truePath.push({ x: p.x / w, y: p.y / h });
        }
        if (t >= 1.05) { run.phase = "draw"; say("Draw the path, then Done"); }
        visionDrawBat(ctx, w, h, now, run);
      } else {
        visionDim(ctx, w, h, 0.4);
        ctx.strokeStyle = "rgba(242,208,96,.55)";
        ctx.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        run.stroke.forEach((p, i) => (i ? ctx.lineTo(p.x * w, p.y * h) : ctx.moveTo(p.x * w, p.y * h)));
        ctx.stroke();
      }
    });
  };
  const gradeTracer = () => {
    if (run.locked || run.phase !== "draw") return;
    run.locked = true;
    run.alive = false;
    run.asked += 1;
    const truth = visionResample(run.truePath, 24);
    const drawn = visionResample(run.stroke, 24);
    let pct = 0;
    if (truth.length && drawn.length) {
      const dist = visionFrechet(truth, drawn);
      pct = Math.round(Math.max(0, Math.min(100, 100 * (1 - dist / 0.42))));
    }
    run.pathScores.push(pct);
    if (pct >= 60) { run.right += 1; bumpStreak(true); }
    else bumpStreak(false);
    run.score += Math.round(pct * (pct >= 60 ? mult() : 1));
    say("Path " + pct + "%");
    paintHud();
    later(visionGap(), () => { run.alive = true; next(); });
  };

  const beginIq = () => {
    const row = run.iq[run.index];
    if (!row) { finish(); return; }
    run.row = row;
    run.phase = "read";
    run.locked = false;
    say(row.text);
    run.pitch = visionMakePitch(row.zone === "pull" ? "FB" : row.zone === "oppo" ? "CH" : "SL");
    const band = visionBand(visionPlayer);
    if (row.zone === "pull") run.pitch.x1 = -7;
    if (row.zone === "oppo") run.pitch.x1 = 7.5;
    if (row.zone === "middle") run.pitch.x1 = 0.4;
    if (row.zone === "ball") { run.pitch.x1 = 14.5; run.pitch.y1 = band.zoneBot - 4; }
    visionRestamp(run.pitch);
    run.t0 = performance.now();
    const gen = run.gen;
    loop(gen, (now) => {
      const t = Math.min(1, (now - run.t0) / (700 * visionScale()));
      visionField(ctx, canvas.width, canvas.height);
      if (run.phase === "choose" && !run.hidePitch) {
        const s = visionSpot(run.pitch, t);
        visionBall(ctx, visionProject(canvas.width, canvas.height, s.x, s.y, s.z));
      }
      if (run.phase === "read" && now - run.t0 > (visionReduce() ? 700 : 1200) * visionScale()) {
        run.phase = "choose";
        run.arriveAt = now + 420 * Math.min(visionScale(), 1.8);
        say("Pull, middle, oppo, or take");
      }
      visionDrawBat(ctx, canvas.width, canvas.height, now, run);
    });
  };
  const gradeIq = (pick) => {
    if (run.locked || run.phase !== "choose") return;
    run.locked = true;
    run.alive = false;
    run.asked += 1;
    const contextual = pick === run.row.correct;
    const execution = pick === run.row.zone || (run.row.correct === "take" && pick === "take");
    if (contextual) run.right += 1;
    bumpStreak(contextual);
    let pts = (contextual ? 140 : 0) + (execution ? 50 : 0);
    if (contextual) pts = Math.round(pts * mult());
    run.score += pts;
    say((contextual ? "Plan +" : "Off the plan") + (execution ? " · executed" : "") + " " + pts);
    paintHud();
    later(visionGap(), () => { run.alive = true; next(); });
  };

  const reflexWindow = () => Math.max(200, 800 - run.level * 100);
  const beginReflex = () => {
    if (run.index === 0) run.level = 0;
    run.phase = "hot";
    run.cell = Math.floor(Math.random() * 16);
    run.t0 = performance.now();
    run.locked = false;
    run.windowRaw = reflexWindow();
    run.window = run.windowRaw * visionScale();
    say("Level " + (run.level + 1));
    const gen = run.gen;
    loop(gen, (now) => {
      const w = canvas.width;
      const h = canvas.height;
      visionDim(ctx, w, h, 0.62);
      const pad = 16;
      const gw = w - pad * 2;
      const gh = h - pad * 2 - 18;
      const cw = gw / 4;
      const ch = gh / 4;
      for (let i = 0; i < 16; i++) {
        const c = i % 4;
        const r = Math.floor(i / 4);
        ctx.strokeStyle = "rgba(242,208,96,.28)";
        ctx.strokeRect(pad + c * cw + 4, 18 + pad + r * ch + 4, cw - 8, ch - 8);
      }
      const left = (1 - Math.min(1, (now - run.t0) / run.window));
      ctx.fillStyle = "#1c1c1c";
      ctx.fillRect(pad, 8, gw, 8);
      ctx.fillStyle = left < 0.28 ? "#e10600" : "#f2d060";
      ctx.fillRect(pad, 8, gw * left, 8);
      const c = run.cell % 4;
      const r = Math.floor(run.cell / 4);
      visionBall(ctx, { x: pad + c * cw + cw / 2, y: 18 + pad + r * ch + ch / 2, r: Math.min(cw, ch) * 0.22 });
      if (now - run.t0 > run.window && !run.locked) gradeReflex(-1);
    });
  };
  const gradeReflex = (cell) => {
    if (run.locked || run.phase !== "hot") return;
    run.locked = true;
    run.alive = false;
    run.asked += 1;
    const ok = cell === run.cell;
    if (ok) {
      run.hits += 1;
      run.right += 1;
      bumpStreak(true);
      const tier = run.windowRaw <= 250 ? 40 : run.windowRaw <= 450 ? 25 : 12;
      run.speedSum += tier;
      run.score += 10 + tier + run.streak * 4;
      if (run.hits % 3 === 0) run.level = Math.min(6, run.level + 1);
      say("+" + (10 + tier));
    } else {
      run.misses += 1;
      bumpStreak(false);
      run.score -= 10;
      say("Miss");
    }
    paintHud();
    later(Math.round(220 * visionScale()), () => { run.alive = true; next(); });
  };

  const begin = () => {
    if (run.ab && run.ab.pending) { run.ab.b = 0; run.ab.s = 0; run.ab.pending = false; }
    run.batSwing = null;
    run.batJudged = false;
    run.batResult = null;
    run.fly = null;
    run.hidePitch = false;
    run.arriveAt = 0;
    run.swung = false;
    visionUmp("");
    paintHud();
    visionTrailReset();
    run.gen += 1;
    if (run.raf) cancelAnimationFrame(run.raf);
    if (run.timer) clearTimeout(run.timer);
    run.alive = true;
    if (game.kind === "vanish") return beginVanish();
    if (game.kind === "flash") return beginFlash();
    if (game.kind === "gauntlet") return beginGauntlet();
    if (game.kind === "matrix") return beginMatrix();
    if (game.kind === "depth") return beginDepth();
    if (game.kind === "ghost") return beginGhost();
    if (game.kind === "rhythm") return beginRhythm();
    if (game.kind === "tracer") return beginTracer();
    if (game.kind === "iq") return beginIq();
    if (game.kind === "reflex") return beginReflex();
    finish();
  };

  const pick = (id) => {
    if (!visionRun || visionRun !== run) return;
    if (game.kind === "vanish") {
      if (id && id.indexOf("aim:") === 0) {
        const k = id.slice(4);
        if (run.phase !== "locate") return;
        if (k === "arrowleft" || k === "a") run.aim.x -= 1.5;
        if (k === "arrowright" || k === "d") run.aim.x += 1.5;
        if (k === "arrowup" || k === "w") run.aim.y += 1.2;
        if (k === "arrowdown" || k === "s") run.aim.y -= 1.2;
        return;
      }
      if (run.phase === "locate") return;
      if (run.phase === "type" || run.phase === "show") gradeVanish(id, null);
      return;
    }
    if (game.kind === "flash") return gradeFlash(id);
    if (game.kind === "gauntlet") return gradeGauntlet(true);
    if (game.kind === "matrix") {
      if (id === "go") {
        if (!run.swingAt) run.swingAt = performance.now() - run.t0;
        run.swung = true;
        return;
      }
      run.flashPick = id;
      return;
    }
    if (game.kind === "depth") return gradeDepth(performance.now() - run.t0);
    if (game.kind === "ghost") {
      const balls = (run.ghost || []).slice().sort((a, b) => a.spot.x - b.spot.x);
      const map = { left: balls[0], mid: balls[1], right: balls[2] };
      const ball = map[id];
      if (ball) gradeGhost(ball.id);
      return;
    }
    if (game.kind === "rhythm") return gradeRhythm(true);
    if (game.kind === "tracer") {
      if (id === "clear") { run.stroke = []; return; }
      if (id === "done") gradeTracer();
      return;
    }
    if (game.kind === "iq") return gradeIq(id);
  };

  hub.querySelectorAll("[data-pick]").forEach((btn) => btn.addEventListener("click", () => pick(btn.dataset.pick)));
  const swingBtn = document.getElementById("visionSwing");
  if (swingBtn) swingBtn.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    visionStartSwing(run);
  });
  hub.querySelectorAll("[data-pick='go']").forEach((btn) => btn.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    visionStartSwing(run);
    pick("go");
  }));
  canvas.addEventListener("pointerdown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (game.kind === "vanish" && run.phase === "locate") {
      gradeVanish(run.typePick, visionPlateFromPx(canvas.width, canvas.height, px, py));
    } else if (game.kind === "ghost" && run.ghost) {
      let best = null;
      run.ghost.forEach((ball) => {
        const p = visionProject(canvas.width, canvas.height, ball.spot.x, ball.spot.y, ball.spot.z);
        const d = Math.hypot(p.x - px, p.y - py);
        if (!best || d < best.d) best = { d, id: ball.id };
      });
      if (best && best.d < 80) gradeGhost(best.id);
      else visionStartSwing(run);
    } else if (game.kind === "depth") {
      visionStartSwing(run);
      gradeDepth(performance.now() - run.t0);
    } else if (game.kind === "rhythm") {
      visionStartSwing(run);
      gradeRhythm(true);
    } else if (game.kind === "matrix") {
      const w = canvas.width;
      const h = canvas.height;
      let symbol = false;
      const spots = { w: [0.5, 0.16], a: [0.14, 0.48], s: [0.5, 0.84], d: [0.86, 0.48] };
      Object.keys(spots).forEach((key) => {
        const sx = spots[key][0] * w;
        const sy = spots[key][1] * h;
        if (Math.abs(px - sx) < 40 && Math.abs(py - sy) < 40) { run.flashPick = key; symbol = true; }
      });
      if (!symbol && Math.hypot(px - w * 0.5, py - h * 0.5) < Math.min(w, h) * 0.22) visionStartSwing(run);
    } else if (game.kind === "tracer" && run.phase === "draw") {
      run.drawing = true;
      run.stroke.push({ x: px / canvas.width, y: py / canvas.height });
    } else if (game.kind === "reflex") {
      const pad = 16;
      const gw = canvas.width - pad * 2;
      const gh = canvas.height - pad * 2 - 18;
      const c = Math.floor((px - pad) / (gw / 4));
      const r = Math.floor((py - 18 - pad) / (gh / 4));
      if (c >= 0 && c < 4 && r >= 0 && r < 4) gradeReflex(r * 4 + c);
    } else if (game.kind === "gauntlet") {
      visionStartSwing(run);
      gradeGauntlet(true);
    } else if (game.kind !== "reflex") visionStartSwing(run);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (game.kind !== "tracer" || !run.drawing || run.phase !== "draw") return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    run.stroke.push({ x: px / canvas.width, y: py / canvas.height });
  });
  const up = () => { run.drawing = false; };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointerleave", up);
  run.key = (e) => {
    if (e.repeat) return;
    const locate = game.kind === "vanish" && run.phase === "locate" && (e.code === "Space" || e.key === " ");
    if ((e.code === "Space" || e.key === " ") && !locate) {
      e.preventDefault();
      visionStartSwing(run);
    }
    const id = visionKeyMap(game.kind, e.code, e.key);
    if (!id) return;
    e.preventDefault();
    if (id.indexOf("aim:") === 0 && e.code === "Space") { if (run.phase === "locate") gradeVanish(run.typePick, run.aim); }
    else pick(id);
  };
  window.addEventListener("keydown", run.key);
  if (game.kind === "iq") {
    say("Loading situations");
    visionIqList().then((rows) => {
      if (visionRun !== run) return;
      const bag = rows.slice();
      run.iq = [];
      while (run.iq.length < game.rounds && bag.length) {
        const i = Math.floor(Math.random() * bag.length);
        run.iq.push(bag.splice(i, 1)[0]);
      }
      if (!run.iq.length) { say("Situations did not load"); return; }
      begin();
    });
  } else begin();
}

function visionShowIntro(player, gameId) {
  visionPlayer = player;
  visionUseHand(player);
  visionStop();
  const game = VISION_GAMES.find((g) => g.id === gameId) || visionFeatured().game;
  const hub = document.getElementById("visionHub");
  if (!hub) return;
  hub.dataset.live = "1";
  hub.innerHTML = visionStageHTML(game, "intro");
  visionShell(true);
  visionBindLeave();
  visionBindSpeed(hub);
  visionBindHand(hub);
  const start = document.getElementById("visionStart");
  if (start) start.addEventListener("click", () => {
    if (game.kind === "rhythm") {
      visionUnlock();
      const note = document.getElementById("visionSound");
      if (note) note.textContent = visionSoundOn ? "Sound on" : "Sound unavailable — the ball still flashes.";
    }
    visionPlay(player, game);
  });
}

function visionHubHTML(player) {
  const featured = visionFeatured();
  const tiles = VISION_GAMES.map((game, i) => {
    const best = visionBest(player, game.id);
    const on = game.id === featured.game.id;
    return "<article class=\"vision-tile" + (on ? " is-featured" : "") + "\"><p class=\"vision-kicker\">" + String(i + 1).padStart(2, "0") + (on ? " · FEATURED" : " · PRACTICE") + "</p><h3>" + visionEsc(game.name) + "</h3><p>" + visionEsc(game.benefit) + "</p><p class=\"vision-pb\">" + (best == null ? "No score yet" : "Best " + best) + "</p><button class=\"btn btn-red\" type=\"button\" data-vision-play=\"" + game.id + "\">Play</button></article>";
  }).join("");
  const top = visionTop(featured.game.id);
  const board = "<div class=\"vision-board\"><h3>Team top 5 · " + visionEsc(featured.game.name) + "</h3>" +
    (top.length ? "<ol>" + top.map((row) => "<li>" + visionEsc(row.name) + " · " + row.score + "</li>").join("") + "</ol>" : "<p class=\"vision-copy\">No scores on this browser yet.</p>") +
    "<p class=\"vision-copy\">Saved on this browser.</p></div>";
  return "<p class=\"vision-kicker\">TRAIN</p><h2>Pitch Recognition</h2><p class=\"vision-lead\">Same featured drill for every player, three days at a time. Featured completion is +150 XP once per rotation, +50 more at 80% accuracy. Practice pays a little, and it cannot be farmed. Overall never moves.</p><div class=\"vision-grid\">" + tiles + "</div>" + board + "<div class=\"vision-actions\"><button class=\"btn btn-ghost\" type=\"button\" id=\"visionHome\">Home</button></div>";
}

function visionMount(force) {
  const mount = document.getElementById("trainGames");
  if (!mount || typeof roadSignedIn !== "function") return;
  const player = roadSignedIn();
  if (!player) return;
  let hub = document.getElementById("visionHub");
  if (hub && hub.dataset.live === "1" && !force) return;
  if (hub && !force && hub.dataset.player === player.id && hub.querySelector("[data-vision-play]")) return;
  if (hub) hub.remove();
  hub = document.createElement("section");
  hub.id = "visionHub";
  hub.className = "vision-hub";
  hub.dataset.player = player.id;
  hub.innerHTML = visionHubHTML(player);
  mount.prepend(hub);
  hub.querySelectorAll("[data-vision-play]").forEach((btn) => btn.addEventListener("click", () => visionShowIntro(player, btn.dataset.visionPlay)));
  const home = document.getElementById("visionHome");
  if (home) home.addEventListener("click", () => { visionShell(false); if (typeof roadSetApp === "function") roadSetApp("home"); });
}

function visionOpen(player, opts) {
  if (typeof roadSetApp === "function") roadSetApp("train");
  const hub = document.getElementById("visionHub");
  if (hub) hub.dataset.live = "";
  visionMount(true);
  if (opts && opts.featured) visionShowIntro(player || (typeof roadSignedIn === "function" ? roadSignedIn() : null), visionFeatured().game.id);
  else {
    const next = document.getElementById("visionHub");
    if (next && next.scrollIntoView) next.scrollIntoView({ block: "start" });
  }
}

globalThis.visionMount = visionMount;
globalThis.visionOpen = visionOpen;
globalThis.visionStop = visionStop;
globalThis.VISION_GAMES = VISION_GAMES;
