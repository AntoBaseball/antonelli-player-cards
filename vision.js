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

function visionRand(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function visionProject(w, h, x, y, z) {
  const depth = 0.2 + z * 0.8;
  return {
    x: w * 0.5 + x * (w * 0.08 + depth * w * 0.38),
    y: h * (0.2 + z * 0.62) - y * h * (0.12 + depth * 0.28),
    r: 3.2 + depth * (Math.min(w, h) * 0.045),
  };
}

function visionPlateFromPx(w, h, px, py) {
  const x = ((px / w) - 0.5) / 0.384;
  const y = (0.82 - (py / h)) / 0.344;
  return { x, y };
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
  const book = {
    FB: { x: 0.03, y: 0.05 },
    CB: { x: 0.1, y: -0.52 },
    CH: { x: -0.26, y: -0.16 },
    SL: { x: 0.5, y: -0.06 },
    CUT: { x: 0.22, y: 0.04 },
    SWEEP: { x: 0.62, y: -0.12 },
  };
  const id = profile || visionRand(["FB", "CB", "CH"]);
  const x1 = (Math.random() * 1.35 - 0.68);
  const y1 = 0.28 + Math.random() * 0.5;
  return {
    id,
    breaks: book[id] || book.FB,
    x0: -0.18,
    y0: 0.78,
    x1: Math.max(-0.9, Math.min(0.9, x1)),
    y1: Math.max(0.2, Math.min(0.84, y1)),
    strike: Math.abs(x1) < 0.42 && y1 > 0.36 && y1 < 0.7,
    flight: id === "FB" || id === "CUT" ? 640 : id === "CB" ? 900 : 760,
  };
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
  const mound = visionProject(w, h, 0, 0.12, 0.06);
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
  const plate = [[-0.18, 0.06], [0.18, 0.06], [0.18, 0.2], [0, 0.32], [-0.18, 0.2]].map((pair) => visionProject(w, h, pair[0], pair[1], 1));
  g.fillStyle = "#f7f4ee";
  g.beginPath();
  plate.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(20,16,12,.45)";
  g.lineWidth = 1;
  g.stroke();
  const zone = [
    visionProject(w, h, -0.42, 0.7, 1),
    visionProject(w, h, 0.42, 0.7, 1),
    visionProject(w, h, 0.42, 0.36, 1),
    visionProject(w, h, -0.42, 0.36, 1),
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
    const y = 0.36 + (0.34 * i) / 3;
    const a = visionProject(w, h, -0.42, y, 1);
    const b = visionProject(w, h, 0.42, y, 1);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
    const x = -0.42 + (0.84 * i) / 3;
    const c = visionProject(w, h, x, 0.7, 1);
    const d = visionProject(w, h, x, 0.36, 1);
    g.beginPath();
    g.moveTo(c.x, c.y);
    g.lineTo(d.x, d.y);
    g.stroke();
  }
}

function visionField(ctx, w, h) {
  const key = w + "x" + h;
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
  if (kind === "gauntlet" || kind === "depth" || kind === "rhythm") return [{ id: "go", name: kind === "gauntlet" ? "Swing" : "Tap" }];
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

function visionExitHTML() {
  return "<button type=\"button\" class=\"vision-exit\" id=\"visionExit\">✕ All games</button>";
}

function visionStageHTML(game, mode) {
  const choices = visionChoices(game.kind);
  const cols = choices.length === 1 ? " is-one" : choices.length === 3 ? " is-3" : choices.length >= 4 ? " is-4" : "";
  const pads = choices.map((c) => "<button type=\"button\" data-pick=\"" + c.id + "\">" + visionEsc(c.name) + "</button>").join("");
  if (mode === "intro") {
    return "<div class=\"vision-stage\" data-kind=\"" + game.kind + "\"><div class=\"vision-hud\"><span class=\"vision-kicker\">PITCH RECOGNITION</span>" + visionExitHTML() + "</div><h2>" + visionEsc(game.name) + "</h2><p class=\"vision-copy\">" + visionEsc(game.benefit) + "</p><p class=\"vision-controls-note\">" + visionEsc(game.controls) + "</p>" +
      (game.kind === "rhythm" ? "<p class=\"vision-sound\" id=\"visionSound\">Tap Start to turn sound on.</p>" : "") +
      "<div class=\"vision-actions\"><button class=\"btn btn-red\" type=\"button\" id=\"visionStart\">Start</button><button class=\"btn btn-ghost\" type=\"button\" id=\"visionBack\">All games</button></div></div>";
  }
  return "<div class=\"vision-stage\" data-kind=\"" + game.kind + "\"><div class=\"vision-hud\"><span id=\"visionCount\">1 / " + game.rounds + "</span><span id=\"visionLiveScore\">0</span><span id=\"visionStreak\">Streak 0</span>" + visionExitHTML() + "</div>" +
    (game.kind === "rhythm" ? "<p class=\"vision-sound\" id=\"visionSound\">" + (visionSoundOn ? "Sound on" : "Tap to turn sound on") + "</p>" : "") +
    "<p class=\"vision-call\" id=\"visionCall\"></p>" +
    "<canvas class=\"vision-canvas\" id=\"visionCanvas\" width=\"640\" height=\"480\"></canvas>" +
    (choices.length ? "<div class=\"vision-pad" + cols + "\" id=\"visionPad\">" + pads + (game.kind === "matrix" ? "<button type=\"button\" data-pick=\"go\">Swing</button>" : "") + "</div>" : "<p class=\"vision-controls-note\">Tap the ball.</p>") +
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
  visionStop();
  const hub = document.getElementById("visionHub");
  if (!hub) return;
  hub.dataset.live = "1";
  hub.innerHTML = visionStageHTML(game, "play");
  visionShell(true);
  visionBindLeave();
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
    bang: "", iq: [],
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
    run.phase = "show";
    run.t0 = performance.now();
    run.aim = { x: run.pitch.x1, y: run.pitch.y1 };
    say("Name it before it vanishes");
    const gen = run.gen;
    loop(gen, (now) => {
      const t = (now - run.t0) / run.pitch.flight;
      visionField(ctx, canvas.width, canvas.height);
      if (t < 0.5) {
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
      later(280, () => { run.locked = false; run.alive = true; next(); });
      return;
    }
    if (run.phase !== "locate" || run.locked) return;
    run.locked = true;
    run.alive = false;
    run.asked += 1;
    const typeOk = run.typePick === run.pitch.id;
    let loc = 0;
    if (plate) {
      const dist = Math.hypot(plate.x - run.pitch.x1, (plate.y - run.pitch.y1) * 0.85);
      const prox = 1 - Math.min(1, dist / 1.1);
      loc = Math.round(50 + prox * 150);
    }
    if (typeOk) run.right += 1;
    const typePts = typeOk ? 100 : 0;
    bumpStreak(typeOk);
    run.score += Math.round((typePts + loc) * mult());
    say(typeOk ? "Type +" + typePts + " · location +" + loc : "Missed the type · location +" + loc);
    paintHud();
    run.phase = "wait";
    later(visionReduce() ? 220 : 480, () => { run.locked = false; run.alive = true; next(); });
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
      if (run.flashAt && now - run.flashAt > 1500 && !run.locked) gradeFlash("");
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
      later(visionReduce() ? 200 : 420, () => { run.alive = true; next(); });
      return;
    }
    run.locked = true;
    run.asked += 1;
    const reaction = performance.now() - run.flashAt;
    run.reactions.push(reaction);
    const ok = id === run.pitch.id;
    const factor = 1 / Math.max(0.12, reaction / 1000);
    if (ok) { run.right += 1; bumpStreak(true); run.score += Math.round(100 * factor); say("+" + Math.round(100 * factor)); }
    else { bumpStreak(false); run.score += Math.round(-70 * factor); say("Wrong " + Math.round(-70 * factor)); }
    paintHud();
    later(visionReduce() ? 200 : 420, next);
  };

  const beginGauntlet = () => {
    run.pitch = visionMakePitch(visionRand(["FB", "FB", "SL", "CB", "CH"]));
    run.phase = "live";
    run.t0 = performance.now();
    run.swung = false;
    run.locked = false;
    say(run.pitch.strike ? "" : "");
    say("Swing strikes. Take balls.");
    const gen = run.gen;
    loop(gen, (now) => {
      const t = (now - run.t0) / run.pitch.flight;
      visionField(ctx, canvas.width, canvas.height);
      const s = visionSpot(run.pitch, Math.min(1, t));
      visionBall(ctx, visionProject(canvas.width, canvas.height, s.x, s.y, s.z));
      if (t >= 1 && !run.locked) gradeGauntlet(false);
    });
  };
  const gradeGauntlet = (swung) => {
    if (run.locked) return;
    if (swung && (performance.now() - run.t0) < run.pitch.flight) { run.swung = true; say("Swing"); return; }
    if (!swung && !run.swung && (performance.now() - run.t0) < run.pitch.flight) return;
    run.locked = true;
    run.alive = false;
    run.asked += 1;
    const swing = run.swung;
    const strike = run.pitch.strike;
    if (!strike) { run.chases.balls += 1; if (swing) run.chases.swings += 1; }
    const ok = swing === strike;
    if (ok) { run.right += 1; bumpStreak(true); run.score += 100; say("+100"); }
    else { bumpStreak(false); run.score -= 200; say(swing ? "Chase −200" : "Frozen −200"); }
    paintHud();
    later(visionReduce() ? 120 : 240, () => { run.alive = true; next(); });
  };

  const beginMatrix = () => {
    run.pitch = visionMakePitch("FB");
    run.pitch.x1 = (Math.random() * 0.16 - 0.08);
    run.pitch.y1 = 0.52;
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
    say("Cue " + cue + " · swing the middle");
    const gen = run.gen;
    loop(gen, (now) => {
      const t = (now - run.t0) / 980;
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
      const s = visionSpot(run.pitch, Math.min(1, t));
      visionBall(ctx, visionProject(w, h, s.x, s.y, s.z));
      if (t >= 1.35 && !run.locked) gradeMatrix();
    });
  };
  const gradeMatrix = () => {
    if (run.locked || run.phase !== "live") return;
    run.locked = true;
    run.alive = false;
    run.asked += 1;
    const flashOk = run.flashPick === run.matrix.match;
    const swingOk = run.swung && run.swingAt > 700 && run.swingAt < 1100;
    if (flashOk) run.dualFlash += 1;
    if (swingOk) run.dualSwing += 1;
    if (flashOk && swingOk) run.right += 1;
    bumpStreak(flashOk);
    let pts = (flashOk ? 120 : 0) + (swingOk ? 80 : 0);
    if (flashOk) pts = Math.round(pts * mult());
    run.score += pts;
    say(flashOk ? "Flash held · " + pts : "Flash missed · combo broken");
    paintHud();
    later(visionReduce() ? 200 : 420, () => { run.alive = true; next(); });
  };

  const beginDepth = () => {
    run.phase = "grow";
    run.t0 = performance.now();
    run.dur = 500 + Math.random() * 700;
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
      if (u >= 1 && !run.locked) gradeDepth(run.dur + 80);
    });
  };
  const gradeDepth = (when) => {
    if (run.locked || run.phase !== "grow") return;
    run.locked = true;
    run.alive = false;
    run.asked += 1;
    const target = run.dur * ((1.5 - 0.1) / 1.9);
    const dt = (when == null ? performance.now() - run.t0 : when) - target;
    const abs = Math.abs(dt);
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
    later(visionReduce() ? 200 : 460, () => { run.alive = true; next(); });
  };

  const ghostBalls = (t) => {
    const pitch = run.pitch;
    if (t < 0.5) return [{ id: "true", spot: visionSpot(pitch, t) }];
    const u = Math.min(1, t);
    return [
      { id: "true", spot: visionSpot(pitch, u) },
      { id: "decoy-a", spot: visionSpot(pitch, u, { x: -0.7, y: 0.05 }) },
      { id: "decoy-b", spot: visionSpot(pitch, u, { x: 0.45, y: -0.55 }) },
    ];
  };
  const beginGhost = () => {
    run.pitch = visionMakePitch(visionRand(["SL", "CH", "CB"]));
    run.phase = "live";
    run.t0 = performance.now();
    run.locked = false;
    say("Track the true ball");
    const gen = run.gen;
    loop(gen, (now) => {
      const t = (now - run.t0) / 1100;
      visionField(ctx, canvas.width, canvas.height);
      ghostBalls(Math.min(1.05, t)).forEach((ball) => {
        const p = visionProject(canvas.width, canvas.height, ball.spot.x, ball.spot.y, ball.spot.z);
        visionBall(ctx, p, null, null, ball.id);
        ball.px = p;
      });
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
    const t = (performance.now() - run.t0) / 1100;
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
      later(280, () => { run.alive = true; next(); });
    } else {
      bumpStreak(false);
      run.bang = "out";
      say("Strikeout");
      paintHud();
      later(visionReduce() ? 280 : 720, () => { run.bang = ""; run.alive = false; later(40, () => { run.alive = true; next(); }); });
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
      if (run.popAt && now - run.popAt > 900 && !run.locked) gradeRhythm(false);
    });
  };
  const gradeRhythm = (tapped) => {
    if (run.locked) return;
    if (!run.popAt) { run.locked = true; run.asked += 1; bumpStreak(false); say("Too early"); paintHud(); run.alive = false; later(300, () => { run.alive = true; next(); }); return; }
    if (!tapped) { run.locked = true; run.asked += 1; bumpStreak(false); say("Late"); paintHud(); run.alive = false; later(280, () => { run.alive = true; next(); }); return; }
    run.locked = true;
    run.alive = false;
    run.asked += 1;
    const reaction = performance.now() - run.popAt;
    run.reactions.push(reaction);
    run.right += 1;
    bumpStreak(true);
    const pts = Math.round(180 / Math.max(0.1, reaction / 1000));
    run.score += pts;
    say("+" + pts);
    paintHud();
    later(visionReduce() ? 200 : 400, () => { run.alive = true; next(); });
  };

  const tracerShapes = ["CB", "SWEEP", "CUT"];
  const beginTracer = () => {
    run.pitch = visionMakePitch(tracerShapes[run.index % 3]);
    run.phase = "show";
    run.t0 = performance.now();
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
        const t = (now - run.t0) / 980;
        visionField(ctx, w, h);
        const s = visionSpot(run.pitch, Math.min(1, Math.max(0, t)));
        const p = visionProject(w, h, s.x, s.y, s.z);
        visionBall(ctx, p);
        if (t >= 0 && t <= 1) run.truePath.push({ x: p.x / w, y: p.y / h });
        if (t >= 1.05) { run.phase = "draw"; say("Draw the path, then Done"); }
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
    later(420, () => { run.alive = true; next(); });
  };

  const beginIq = () => {
    const row = run.iq[run.index];
    if (!row) { finish(); return; }
    run.row = row;
    run.phase = "read";
    run.locked = false;
    say(row.text);
    run.pitch = visionMakePitch(row.zone === "pull" ? "FB" : row.zone === "oppo" ? "CH" : "SL");
    if (row.zone === "pull") run.pitch.x1 = -0.35;
    if (row.zone === "oppo") run.pitch.x1 = 0.38;
    if (row.zone === "middle") run.pitch.x1 = 0.02;
    if (row.zone === "ball") { run.pitch.x1 = 0.72; run.pitch.y1 = 0.3; }
    run.t0 = performance.now();
    const gen = run.gen;
    loop(gen, (now) => {
      const t = Math.min(1, (now - run.t0) / 700);
      visionField(ctx, canvas.width, canvas.height);
      if (run.phase === "choose") {
        const s = visionSpot(run.pitch, t);
        visionBall(ctx, visionProject(canvas.width, canvas.height, s.x, s.y, s.z));
      }
      if (run.phase === "read" && now - run.t0 > (visionReduce() ? 700 : 1200)) { run.phase = "choose"; say("Pull, middle, oppo, or take"); }
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
    later(420, () => { run.alive = true; next(); });
  };

  const reflexWindow = () => Math.max(200, 800 - run.level * 100);
  const beginReflex = () => {
    if (run.index === 0) run.level = 0;
    run.phase = "hot";
    run.cell = Math.floor(Math.random() * 16);
    run.t0 = performance.now();
    run.locked = false;
    run.window = reflexWindow();
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
      const tier = run.window <= 250 ? 40 : run.window <= 450 ? 25 : 12;
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
    later(visionReduce() ? 90 : 160, () => { run.alive = true; next(); });
  };

  const begin = () => {
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
        if (k === "arrowleft" || k === "a") run.aim.x -= 0.06;
        if (k === "arrowright" || k === "d") run.aim.x += 0.06;
        if (k === "arrowup" || k === "w") run.aim.y += 0.05;
        if (k === "arrowdown" || k === "s") run.aim.y -= 0.05;
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
    } else if (game.kind === "depth") gradeDepth(performance.now() - run.t0);
    else if (game.kind === "rhythm") gradeRhythm(true);
    else if (game.kind === "matrix") {
      const w = canvas.width;
      const h = canvas.height;
      if (Math.hypot(px - w * 0.5, py - h * 0.5) < Math.min(w, h) * 0.16) {
        if (!run.swingAt) run.swingAt = performance.now() - run.t0;
        run.swung = true;
      }
      const spots = { w: [0.5, 0.16], a: [0.14, 0.48], s: [0.5, 0.84], d: [0.86, 0.48] };
      Object.keys(spots).forEach((key) => {
        const sx = spots[key][0] * w;
        const sy = spots[key][1] * h;
        if (Math.abs(px - sx) < 40 && Math.abs(py - sy) < 40) run.flashPick = key;
      });
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
    } else if (game.kind === "gauntlet") gradeGauntlet(true);
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
  visionStop();
  const game = VISION_GAMES.find((g) => g.id === gameId) || visionFeatured().game;
  const hub = document.getElementById("visionHub");
  if (!hub) return;
  hub.dataset.live = "1";
  hub.innerHTML = visionStageHTML(game, "intro");
  visionShell(true);
  visionBindLeave();
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
