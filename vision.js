/* Pitch Recognition drills for Road to 99.
   Ten games, one featured on a 3-day rotation. XP only — overall never moves.
   Game 7 is the mitt-pop audio drill. Canvas 2D, pitcher-to-plate. */

const VISION_TYPES = [
  { id: "FB", name: "Fastball", velo: 93, rpm: 2250, breakX: 0.04, breakY: 0.06, band: "90+" },
  { id: "SL", name: "Slider", velo: 84, rpm: 2550, breakX: 0.42, breakY: -0.05, band: "80s" },
  { id: "CB", name: "Curve", velo: 74, rpm: 2750, breakX: 0.16, breakY: -0.48, band: "70s" },
  { id: "CH", name: "Change", velo: 81, rpm: 1550, breakX: -0.1, breakY: -0.2, band: "80s" },
];

const VISION_GAMES = [
  { id: "id", name: "Pitch ID", benefit: "Naming the pitch in flight is the same read you use to stay on the fastball and spoil the breaker.", controls: "Tap the pitch, or press 1–4. A W D S match the four buttons.", stat: "ID %", kind: "type" },
  { id: "zone", name: "Strike or Ball", benefit: "Calling strike or ball before it arrives is the benchmark for swinging at strikes and taking balls.", controls: "STRIKE is Space, D, or the right arrow. TAKE is A, S, or the left arrow.", stat: "Zone %", kind: "zone" },
  { id: "location", name: "Location", benefit: "Seeing where the ball finishes trains the barrel to the spot, not just the pitch type.", controls: "Tap a quadrant or the picture. Arrows and W A S D match the four buttons.", stat: "Location %", kind: "quad" },
  { id: "velo", name: "Velocity Read", benefit: "Reading speed is how you time the fastball and stay back on the change.", controls: "Tap the mph band, or press 1–4. A W D S match the buttons.", stat: "MPH off", kind: "velo" },
  { id: "spin", name: "Spin Read", benefit: "Spin separates a riding fastball from a tumbling curve. This is a benchmark, not a projection.", controls: "Tap the RPM band, or press 1–4. A W D S match the buttons.", stat: "RPM off", kind: "spin" },
  { id: "release", name: "Release Point", benefit: "Lock the release window: soft focus on the windup, hard focus at the hand.", controls: "Tap the window that flashes. W up, A arm side, D glove side, S low. Arrows match.", stat: "Reaction ms", kind: "release" },
  { id: "pop", name: "Mitt Pop", benefit: "The catcher's pop is a timing benchmark. Ears and eyes together, you are earlier to the pitch.", controls: "Tap or press Space the instant you hear the pop. Early taps count as a miss.", stat: "Reaction ms", kind: "pop" },
  { id: "tunnel", name: "Tunnel", benefit: "Pitches share a tunnel early. Predicting the finish from the first move is the occlusion benchmark.", controls: "The ball hides. Then tap the finish quadrant. Arrows and W A S D match.", stat: "Location %", kind: "tunnel" },
  { id: "chase", name: "Chase", benefit: "Chase rate is swings at balls. Lower is the better benchmark. It does not predict a roster spot.", controls: "SWING is Space, D, or the right arrow. TAKE is A, S, or the left arrow.", stat: "Chase Rate %", kind: "chase" },
  { id: "sequence", name: "Sequence", benefit: "Holding a sequence is the same skill as sitting on a pitch in a count.", controls: "Watch three pitches, then tap them back in order. 1–4 and A W D S match the buttons.", stat: "Sequence %", kind: "sequence" },
];

const VISION_QUADS = [
  { id: "up-in", name: "Up / in", key: "w" },
  { id: "up-away", name: "Up / away", key: "d" },
  { id: "down-in", name: "Down / in", key: "a" },
  { id: "down-away", name: "Down / away", key: "s" },
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
  osc.frequency.setValueAtTime(480, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.09);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.85, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.14);
  const len = Math.max(1, Math.floor(ctx.sampleRate * 0.045));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  const ng = ctx.createGain();
  src.buffer = buf;
  ng.gain.value = 0.45;
  src.connect(ng);
  ng.connect(ctx.destination);
  src.start(t);
}

function visionRand(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function visionMakePitch() {
  const type = visionRand(VISION_TYPES);
  const x1 = (Math.random() * 1.5 - 0.75);
  const y1 = 0.22 + Math.random() * 0.62;
  const strike = Math.abs(x1) < 0.46 && y1 > 0.34 && y1 < 0.7;
  const quad = (y1 >= 0.52 ? "up" : "down") + "-" + (x1 < 0 ? "in" : "away");
  const windows = ["up", "arm", "glove", "low"];
  return {
    type,
    x0: -0.22,
    y0: 0.8,
    x1: Math.max(-0.85, Math.min(0.85, x1)),
    y1: Math.max(0.18, Math.min(0.86, y1)),
    strike,
    quad,
    release: visionRand(windows),
    flight: type.id === "FB" ? 640 : type.id === "CB" ? 920 : 780,
  };
}

function visionSpot(pitch, t) {
  const aimX = pitch.x1 - pitch.type.breakX;
  const aimY = pitch.y1 - pitch.type.breakY;
  const bend = t * t;
  return {
    x: pitch.x0 + (aimX - pitch.x0) * t + pitch.type.breakX * bend,
    y: pitch.y0 + (aimY - pitch.y0) * t + pitch.type.breakY * bend,
    z: t,
  };
}

function visionProject(w, h, x, y, z) {
  const depth = 0.2 + z * 0.8;
  return {
    x: w * 0.5 + x * (w * 0.08 + depth * w * 0.38),
    y: h * (0.2 + z * 0.62) - y * h * (0.12 + depth * 0.28),
    r: 3.2 + depth * (Math.min(w, h) * 0.045),
  };
}

function visionDraw(ctx, w, h, pitch, t, opts) {
  const reduce = visionReduce();
  ctx.clearRect(0, 0, w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#07080c");
  sky.addColorStop(0.45, "#14110c");
  sky.addColorStop(1, "#1a1208");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(242,208,96,.35)";
  ctx.lineWidth = 2;
  const zone = [
    visionProject(w, h, -0.46, 0.7, 1),
    visionProject(w, h, 0.46, 0.7, 1),
    visionProject(w, h, 0.46, 0.34, 1),
    visionProject(w, h, -0.46, 0.34, 1),
  ];
  ctx.beginPath();
  zone.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  const rubber = visionProject(w, h, 0, 0.62, 0.08);
  ctx.strokeStyle = "rgba(255,255,255,.45)";
  ctx.strokeRect(rubber.x - 18, rubber.y - 3, 36, 6);
  if (opts && opts.windows && pitch) {
    const spots = {
      up: visionProject(w, h, -0.22, 0.92, 0.12),
      arm: visionProject(w, h, -0.38, 0.74, 0.12),
      glove: visionProject(w, h, 0.02, 0.74, 0.12),
      low: visionProject(w, h, -0.22, 0.56, 0.12),
    };
    Object.keys(spots).forEach((key) => {
      const p = spots[key];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.strokeStyle = opts.flash === key ? "#f2d060" : "rgba(255,255,255,.25)";
      ctx.lineWidth = opts.flash === key ? 4 : 1.5;
      ctx.stroke();
    });
  }
  if (opts && opts.mitt) {
    const mitt = visionProject(w, h, 0.05, 0.42, 0.92);
    ctx.strokeStyle = "#f2d060";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(mitt.x, mitt.y, 22, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (!pitch || (opts && opts.hideBall)) return;
  const spot = visionSpot(pitch, Math.max(0, Math.min(1, t)));
  const p = visionProject(w, h, spot.x, spot.y, spot.z);
  if (!reduce && t > 0.05) {
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.beginPath();
    const back = visionProject(w, h, visionSpot(pitch, Math.max(0, t - 0.12)).x, visionSpot(pitch, Math.max(0, t - 0.12)).y, Math.max(0, t - 0.12));
    ctx.moveTo(back.x, back.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.fillStyle = "#f7f4ee";
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c4121a";
  ctx.lineWidth = Math.max(1.2, p.r * 0.14);
  const spin = reduce ? 0.4 : (pitch.type.rpm / 2400) * t * 5;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, p.r * 0.72, p.r * 0.28, spin, 0, Math.PI * 2);
  ctx.stroke();
}

let visionRun = null;

function visionStop() {
  if (!visionRun) return;
  if (visionRun.raf) cancelAnimationFrame(visionRun.raf);
  if (visionRun.key) window.removeEventListener("keydown", visionRun.key);
  if (visionRun.timer) clearTimeout(visionRun.timer);
  visionRun = null;
  const hub = document.getElementById("visionHub");
  if (hub) hub.dataset.live = "";
}

function visionChoices(kind) {
  if (kind === "type" || kind === "sequence") return VISION_TYPES.map((t) => ({ id: t.id, name: t.name }));
  if (kind === "zone") return [{ id: "strike", name: "Strike" }, { id: "ball", name: "Take" }];
  if (kind === "quad" || kind === "tunnel") return VISION_QUADS.map((q) => ({ id: q.id, name: q.name }));
  if (kind === "velo") return [{ id: "70s", name: "70s" }, { id: "80s", name: "80s" }, { id: "90+", name: "90+" }, { id: "slow", name: "Under 70" }];
  if (kind === "spin") return [{ id: "1500", name: "1,500" }, { id: "1800", name: "1,800" }, { id: "2200", name: "2,200" }, { id: "2600", name: "2,600" }];
  if (kind === "release") return [{ id: "up", name: "Up" }, { id: "arm", name: "Arm side" }, { id: "glove", name: "Glove side" }, { id: "low", name: "Low" }];
  if (kind === "chase") return [{ id: "swing", name: "Swing" }, { id: "take", name: "Take" }];
  return [{ id: "tap", name: "Tap" }];
}

function visionExpect(kind, pitch) {
  if (kind === "type") return pitch.type.id;
  if (kind === "zone") return pitch.strike ? "strike" : "ball";
  if (kind === "quad" || kind === "tunnel") return pitch.quad;
  if (kind === "velo") return pitch.type.velo >= 90 ? "90+" : pitch.type.velo >= 80 ? "80s" : "70s";
  if (kind === "spin") {
    const rpm = pitch.type.rpm;
    if (rpm < 1700) return "1500";
    if (rpm < 2100) return "1800";
    if (rpm < 2500) return "2200";
    return "2600";
  }
  if (kind === "release") return pitch.release;
  if (kind === "chase") return pitch.strike ? "swing" : "take";
  return "tap";
}

function visionKeyMap(kind, code, key) {
  const k = String(key || "").toLowerCase();
  const arrows = { arrowup: "w", arrowleft: "a", arrowdown: "s", arrowright: "d" };
  const wasd = arrows[k] || k;
  if (kind === "pop") return code === "Space" || k === " " ? "tap" : "";
  if (kind === "zone" || kind === "chase") {
    if (code === "Space" || wasd === "d" || k === "arrowright") return kind === "zone" ? "strike" : "swing";
    if (wasd === "a" || wasd === "s" || k === "arrowleft" || k === "arrowdown") return kind === "zone" ? "ball" : "take";
    return "";
  }
  const four = visionChoices(kind);
  const order = { a: 0, w: 1, d: 2, s: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
  if (kind === "release") {
    const map = { w: "up", arrowup: "up", a: "arm", arrowleft: "arm", d: "glove", arrowright: "glove", s: "low", arrowdown: "low" };
    return map[k] || "";
  }
  if (kind === "quad" || kind === "tunnel") {
    const map = { w: 0, d: 1, a: 2, s: 3, arrowup: 0, arrowright: 1, arrowleft: 2, arrowdown: 3 };
    const idx = map[k];
    return idx == null ? "" : four[idx].id;
  }
  if (order[wasd] == null && order[k] == null) return "";
  const idx = order[k] != null ? order[k] : order[wasd];
  return four[idx] ? four[idx].id : "";
}

function visionStageHTML(game, mode) {
  const choices = visionChoices(game.kind);
  const one = choices.length === 1;
  const pads = choices.map((c) => "<button type=\"button\" data-pick=\"" + c.id + "\">" + visionEsc(c.name) + "</button>").join("");
  if (mode === "intro") {
    return "<div class=\"vision-stage\"><p class=\"vision-kicker\">PITCH RECOGNITION</p><h2>" + visionEsc(game.name) + "</h2><p class=\"vision-copy\">" + visionEsc(game.benefit) + "</p><p class=\"vision-controls-note\">" + visionEsc(game.controls) + "</p>" +
      (game.kind === "pop" ? "<p class=\"vision-sound\" id=\"visionSound\">Tap Start to turn sound on.</p>" : "") +
      "<div class=\"vision-actions\"><button class=\"btn btn-red\" type=\"button\" id=\"visionStart\">Start</button><button class=\"btn btn-ghost\" type=\"button\" id=\"visionBack\">All games</button></div></div>";
  }
  return "<div class=\"vision-stage\"><div class=\"vision-hud\"><span id=\"visionCount\">1 / 8</span><span id=\"visionLiveScore\">0</span><span id=\"visionStreak\">Streak 0</span></div>" +
    (game.kind === "pop" ? "<p class=\"vision-sound\" id=\"visionSound\">" + (visionSoundOn ? "Sound on" : "Tap to turn sound on") + "</p>" : "") +
    "<canvas class=\"vision-canvas\" id=\"visionCanvas\" width=\"640\" height=\"480\"></canvas>" +
    "<div class=\"vision-pad" + (one ? " is-one" : "") + "\" id=\"visionPad\">" + pads + "</div></div>";
}

function visionResultsHTML(game, result, pay) {
  return "<div class=\"vision-stage vision-results\"><p class=\"vision-kicker\">RESULTS · " + visionEsc(game.name) + "</p><h2>Score</h2><p class=\"vision-score\">" + result.score + "</p>" +
    "<div class=\"vision-stats\"><div><b>" + Math.round(result.accuracy * 100) + "%</b><span>Accuracy</span></div><div><b>" + result.streak + "</b><span>Best streak</span></div><div><b>" + visionEsc(result.statText) + "</b><span>" + visionEsc(game.stat) + "</span></div></div>" +
    "<p class=\"vision-copy\">" + visionEsc(pay.note) + " Overall did not change. This is a benchmark, not a recruiting read.</p>" +
    "<p class=\"vision-pb\">Personal best " + (visionBest(result.player, game.id) || result.score) + "</p>" +
    "<div class=\"vision-actions\"><button class=\"btn btn-red\" type=\"button\" id=\"visionAgain\">Play again</button><button class=\"btn btn-ghost\" type=\"button\" id=\"visionBack\">All games</button></div></div>";
}

function visionPlay(player, game) {
  visionStop();
  const hub = document.getElementById("visionHub");
  if (!hub) return;
  hub.dataset.live = "1";
  hub.innerHTML = visionStageHTML(game, "play");
  if (hub.scrollIntoView) hub.scrollIntoView({ block: "start" });
  const canvas = document.getElementById("visionCanvas");
  const ctx = canvas.getContext("2d");
  const fit = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(320, Math.round(rect.width * dpr));
    canvas.height = Math.max(240, Math.round(rect.height * dpr));
  };
  fit();
  const run = {
    player, game, pitches: [], index: 0, score: 0, right: 0, asked: 0, streak: 0, bestStreak: 0,
    errors: [], chases: { swings: 0, balls: 0 }, reactions: [], answered: false, t0: 0, popAt: 0, phase: "pitch",
    raf: 0, timer: 0, key: null, seq: [], seqNeed: [], seqGot: [], gen: 0,
  };
  if (game.kind === "sequence") {
    for (let i = 0; i < 4; i++) run.seq.push([visionMakePitch(), visionMakePitch(), visionMakePitch()]);
  } else {
    for (let i = 0; i < 8; i++) run.pitches.push(visionMakePitch());
  }
  visionRun = run;
  const paintHud = () => {
    const count = document.getElementById("visionCount");
    const score = document.getElementById("visionLiveScore");
    const streak = document.getElementById("visionStreak");
    const total = game.kind === "sequence" ? run.seq.length : run.pitches.length;
    if (count) count.textContent = Math.min(total, run.index + 1) + " / " + total;
    if (score) score.textContent = String(run.score);
    if (streak) streak.textContent = "Streak " + run.streak;
  };
  const finish = () => {
    const asked = Math.max(1, run.asked);
    let statText = Math.round((run.right / asked) * 100) + "%";
    if (game.kind === "velo") statText = (run.errors.length ? Math.round(run.errors.reduce((a, b) => a + b, 0) / run.errors.length) : 0) + "";
    if (game.kind === "spin") statText = (run.errors.length ? Math.round(run.errors.reduce((a, b) => a + b, 0) / run.errors.length) : 0) + "";
    if (game.kind === "release" || game.kind === "pop") statText = (run.reactions.length ? Math.round(run.reactions.reduce((a, b) => a + b, 0) / run.reactions.length) : 0) + "";
    if (game.kind === "chase") statText = (run.chases.balls ? Math.round((run.chases.swings / run.chases.balls) * 100) : 0) + "%";
    const result = {
      player,
      score: run.score,
      accuracy: run.right / asked,
      streak: run.bestStreak,
      statText,
    };
    run.gen = (run.gen || 0) + 1;
    if (run.raf) cancelAnimationFrame(run.raf);
    if (run.timer) clearTimeout(run.timer);
    if (run.key) window.removeEventListener("keydown", run.key);
    visionRun = null;
    visionSaveScore(player, game, result);
    const pay = visionPay(player, game, result);
    const live = document.getElementById("visionHub") || hub;
    live.dataset.live = "1";
    live.innerHTML = visionResultsHTML(game, result, pay);
    const best = live.querySelector(".vision-pb");
    if (best) best.textContent = "Personal best " + (visionBest(player, game.id) || result.score);
    const again = live.querySelector("#visionAgain");
    const back = live.querySelector("#visionBack");
    if (again) again.addEventListener("click", () => visionShowIntro(player, game.id));
    if (back) back.addEventListener("click", () => { live.dataset.live = ""; visionMount(true); });
  };
  const grade = (pick, reaction) => {
    if (run.answered) return;
    run.answered = true;
    const pitch = run.pitches[run.index];
    const expect = visionExpect(game.kind, pitch);
    const correct = pick === expect;
    run.asked += 1;
    if (game.kind === "chase") {
      if (!pitch.strike) {
        run.chases.balls += 1;
        if (pick === "swing") run.chases.swings += 1;
      }
    }
    if (game.kind === "velo") run.errors.push(Math.abs(pitch.type.velo - (pick === "90+" ? 93 : pick === "80s" ? 84 : pick === "70s" ? 74 : 66)));
    if (game.kind === "spin") run.errors.push(Math.abs(pitch.type.rpm - Number(pick || 0)));
    if (game.kind === "release" || game.kind === "pop") run.reactions.push(Math.max(0, Math.round(reaction)));
    if (correct) {
      run.right += 1;
      run.streak += 1;
      run.bestStreak = Math.max(run.bestStreak, run.streak);
      const flight = game.kind === "pop" ? 500 : pitch.flight;
      const speed = Math.max(0, Math.min(1, 1 - reaction / flight));
      run.score += Math.round(100 + speed * 80 + Math.min(run.streak, 6) * 12);
    } else run.streak = 0;
    paintHud();
    if (run.timer) clearTimeout(run.timer);
    run.timer = setTimeout(() => { run.index += 1; run.answered = false; begin(); }, visionReduce() ? 180 : 420);
  };
  const begin = () => {
    paintHud();
    const gen = ++run.gen;
    if (run.raf) cancelAnimationFrame(run.raf);
    if (run.timer) clearTimeout(run.timer);
    if (game.kind === "sequence") { beginSeq(gen); return; }
    if (run.index >= run.pitches.length) { finish(); return; }
    const pitch = run.pitches[run.index];
    run.t0 = performance.now();
    run.popAt = 0;
    run.phase = "live";
    if (game.kind === "pop") {
      const wait = 500 + Math.random() * 900;
      run.timer = setTimeout(() => {
        if (!visionRun || visionRun !== run || run.gen !== gen || run.answered) return;
        visionPopSound();
        run.popAt = performance.now();
        run.phase = "popped";
      }, wait);
    }
    const frame = (now) => {
      if (visionRun !== run || run.gen !== gen) return;
      fit();
      const elapsed = now - run.t0;
      let t = game.kind === "pop" ? 0.15 : elapsed / pitch.flight;
      const hide = game.kind === "tunnel" && t > 0.28 && t < 0.92;
      const flash = game.kind === "release" && elapsed < 180 ? pitch.release : "";
      visionDraw(ctx, canvas.width, canvas.height, pitch, Math.min(1, t), { hideBall: hide || (game.kind === "pop" && run.phase !== "popped"), windows: game.kind === "release", flash, mitt: game.kind === "pop" });
      if (game.kind !== "pop" && t >= 1 && !run.answered) { grade("", pitch.flight + 200); return; }
      if (game.kind === "pop" && run.popAt && now - run.popAt > 850 && !run.answered) { grade("", 900); return; }
      run.raf = requestAnimationFrame(frame);
    };
    run.raf = requestAnimationFrame(frame);
  };
  const beginSeq = (gen) => {
    if (run.index >= run.seq.length) { finish(); return; }
    run.seqNeed = run.seq[run.index].map((p) => p.type.id);
    run.seqGot = [];
    run.phase = "show";
    let step = 0;
    const show = () => {
      if (visionRun !== run || run.gen !== gen) return;
      if (step >= 3) { run.phase = "recall"; run.t0 = performance.now(); return; }
      const pitch = run.seq[run.index][step];
      const started = performance.now();
      const frame = (now) => {
        if (visionRun !== run || run.gen !== gen) return;
        fit();
        const t = (now - started) / 520;
        visionDraw(ctx, canvas.width, canvas.height, pitch, Math.min(1, t), {});
        if (t < 1) run.raf = requestAnimationFrame(frame);
        else { step += 1; run.timer = setTimeout(show, 120); }
      };
      run.raf = requestAnimationFrame(frame);
    };
    show();
  };
  const pick = (id) => {
    if (!visionRun || visionRun !== run) return;
    if (game.kind === "sequence") {
      if (run.phase !== "recall") return;
      run.seqGot.push(id);
      if (run.seqGot.length < 3) return;
      const correct = run.seqGot.every((g, i) => g === run.seqNeed[i]);
      run.asked += 1;
      if (correct) {
        run.right += 1;
        run.streak += 1;
        run.bestStreak = Math.max(run.bestStreak, run.streak);
        run.score += 180 + run.streak * 12;
      } else run.streak = 0;
      paintHud();
      run.phase = "wait";
      run.index += 1;
      run.timer = setTimeout(begin, 360);
      return;
    }
    if (run.answered || run.phase === "wait") return;
    const pitch = run.pitches[run.index];
    if (game.kind === "pop") {
      if (!run.popAt) { grade("early", 0); return; }
      grade("tap", performance.now() - run.popAt);
      return;
    }
    grade(id, performance.now() - run.t0);
  };
  hub.querySelectorAll("[data-pick]").forEach((btn) => btn.addEventListener("click", () => pick(btn.dataset.pick)));
  if (canvas) canvas.addEventListener("pointerdown", (e) => {
    if (game.kind !== "quad" && game.kind !== "tunnel") return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const id = (y < 0.55 ? "up" : "down") + "-" + (x < 0.5 ? "in" : "away");
    pick(id);
  });
  run.key = (e) => {
    const id = visionKeyMap(game.kind, e.code, e.key);
    if (!id) return;
    e.preventDefault();
    pick(id);
  };
  window.addEventListener("keydown", run.key);
  begin();
}

function visionShowIntro(player, gameId) {
  visionStop();
  const game = VISION_GAMES.find((g) => g.id === gameId) || visionFeatured().game;
  const hub = document.getElementById("visionHub");
  if (!hub) return;
  hub.dataset.live = "1";
  hub.innerHTML = visionStageHTML(game, "intro");
  if (hub.scrollIntoView) hub.scrollIntoView({ block: "start" });
  const start = document.getElementById("visionStart");
  if (start) start.addEventListener("click", () => {
    if (game.kind === "pop") {
      visionUnlock();
      const note = document.getElementById("visionSound");
      if (note) note.textContent = visionSoundOn ? "Sound on" : "Sound unavailable — the mitt still flashes.";
    }
    visionPlay(player, game);
  });
  const back = document.getElementById("visionBack");
  if (back) back.addEventListener("click", () => { hub.dataset.live = ""; visionMount(true); });
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
  if (home) home.addEventListener("click", () => { if (typeof roadSetApp === "function") roadSetApp("home"); });
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
globalThis.VISION_GAMES = VISION_GAMES;
