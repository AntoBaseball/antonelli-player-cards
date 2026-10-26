/* Quick Eyes Arcade — eight reaction games on one engine.
   This device keeps every round in localStorage and mirrors it to player.road.arcade.
   Signed-in rounds also insert a score, and a daily round upserts today's best.
   Reads are whatever can_see_player allows: your card, your roster team, or the coach. */

const ARCADE_COLORS = [
  { id: "red", name: "RED", hex: "#E63946", letter: "R" },
  { id: "blue", name: "BLUE", hex: "#2F7DE1", letter: "B" },
  { id: "yellow", name: "YELLOW", hex: "#F4C430", letter: "Y" },
  { id: "green", name: "GREEN", hex: "#2DBE6C", letter: "G" },
  { id: "orange", name: "ORANGE", hex: "#FF7A1A", letter: "O" },
  { id: "purple", name: "PURPLE", hex: "#9B5DE5", letter: "P" },
  { id: "white", name: "WHITE", hex: "#F4F1EA", letter: "W" },
  { id: "pink", name: "PINK", hex: "#FF5DA2", letter: "K" },
];

const ARCADE_GAMES = [
  { id: "color", name: "Color Call", blurb: "Tap only the color that's called.", help: ["A banner names one color.", "Tap baseballs of that color. Let the others go.", "About 4 in 10 balls are the one you want."] },
  { id: "zone", name: "Zone Lights", blurb: "Light it up, knock it out.", help: ["A chalk strike zone sits over the plate.", "Tap the ball that lights up before it fades.", "A red brushback is a take. Don't tap it."] },
  { id: "heater", name: "Heater Hunt", blurb: "Catch the pitch before it gets by you.", help: ["Pitches fly in from the edges.", "Tap the white baseballs before they leave.", "Brown dirt balls are takes."] },
  { id: "mind", name: "Mind Games", blurb: "See the ink, or read the word.", help: ["A color word is painted in ink.", "SEE IT means tap the ink. READ IT means tap the word.", "The row of baseballs is your answer."] },
  { id: "numbers", name: "Number Run", blurb: "1, 2, 3… as fast as you can.", help: ["Tap the numbered baseballs in order.", "Clearing a set pays 20 points a ball.", "A wrong number breaks the combo."] },
  { id: "spin", name: "Spin Spotter", blurb: "Find the red dot.", help: ["Sliders carry a red dot and spinning seams.", "Heaters show stripes rolling backward.", "Hunt only the pitch on the banner."] },
  { id: "popup", name: "Pop-Up Peripheral", blurb: "Eyes in the middle, hands everywhere.", help: ["Watch the glove in the middle.", "Tap baseballs that pop up at the edges.", "When the letter flips to W, tap the glove within a second."] },
  { id: "lightning", name: "Lightning Round", blurb: "The rule changes. You don't get a warning.", help: ["Sixty seconds. The rule flips every few seconds.", "Color, zone, heat, spin, and see-it / read-it.", "The first correct tap after a flip is a clean switch."] },
];

const ARCADE_TIPS = [
  "Short and often wins: 2–3 rounds a day beats one long session a week.",
  "Play before practice or games as a visual warm-up.",
  "Sit or hold the device the same way every time so scores are comparable.",
  "Chase accuracy first, then speed. Wrong taps cost more than slow taps, just like chasing a bad pitch costs more than taking a close one.",
];

const ARCADE_BADGES = [
  { id: "quickHands", name: "Quick Hands", icon: "⚡", tip: "Average reaction under 300 ms in a round." },
  { id: "iceVeins", name: "Ice Veins", icon: "🧊", tip: "A full round with no wrong taps." },
  { id: "onFire", name: "On Fire", icon: "🔥", tip: "A 25-tap combo." },
  { id: "bigLeaguer", name: "Big Leaguer", icon: "🏟️", tip: "Reach level 10 in any game." },
  { id: "dailyGrinder", name: "Daily Grinder", icon: "📅", tip: "Play on 7 days in a row." },
];

const ARCADE_STORE = "antonelli-arcade-v1";

function arcadeEsc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function arcadeToday() {
  return typeof roadToday === "function" ? roadToday() : new Date().toISOString().slice(0, 10);
}

function arcadeDefaultBag() {
  return {
    rounds: [],
    best: {},
    badges: {},
    days: [],
    settings: { seconds: 45, colorblind: false, baseline: null },
    teamCode: "",
  };
}

function arcadeLoad(id) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(ARCADE_STORE) || "{}"); } catch (e) { all = {}; }
  const bag = all[id || "device"];
  if (!bag || typeof bag !== "object") return arcadeDefaultBag();
  const next = arcadeDefaultBag();
  next.rounds = Array.isArray(bag.rounds) ? bag.rounds : [];
  next.best = bag.best && typeof bag.best === "object" ? bag.best : {};
  next.badges = bag.badges && typeof bag.badges === "object" ? bag.badges : {};
  next.days = Array.isArray(bag.days) ? bag.days : [];
  next.settings = Object.assign(next.settings, bag.settings || {});
  next.teamCode = String(bag.teamCode || "");
  return next;
}

function arcadeSave(id, bag) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(ARCADE_STORE) || "{}"); } catch (e) { all = {}; }
  all[id || "device"] = bag;
  try { localStorage.setItem(ARCADE_STORE, JSON.stringify(all)); } catch (e) { /* the round still finished on screen */ }
  return bag;
}

function arcadeBag(player) {
  const id = player && player.id || "device";
  const bag = arcadeLoad(id);
  if (player) {
    if (typeof roadEnsure === "function") roadEnsure(player);
    else player.road = player.road || {};
    player.road.arcade = bag;
  }
  return bag;
}

function arcadePersist(player, bag) {
  arcadeSave(player && player.id, bag);
  if (player && player.road) player.road.arcade = bag;
  if (typeof savePlayers === "function") savePlayers();
}

function arcadeSeed(text) {
  let h = 2166136261;
  const s = String(text || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function arcadeRng(seed) {
  let s = (seed >>> 0) || 1;
  return function rand() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function arcadeFormula(reactionMs, combo, level, speedScale) {
  const speed = Math.max(0, 100 - reactionMs / 10) * (speedScale || 1);
  const mult = combo >= 20 ? 3 : combo >= 10 ? 2 : combo >= 5 ? 1.5 : 1;
  const bonus = 1 + (Math.max(1, level) - 1) * 0.1;
  return Math.round((100 + speed) * mult * bonus);
}

function arcadeVision(accuracy, highest) {
  const v = Math.round(accuracy * 60 + ((Math.max(1, highest) - 1) / 9) * 39);
  return Math.max(0, Math.min(99, v));
}

function arcadeGrade(vision) {
  if (vision >= 90) return "S";
  if (vision >= 80) return "A";
  if (vision >= 70) return "B";
  if (vision >= 60) return "C";
  return "D";
}

function arcadeStreak(days, today) {
  const set = {};
  (days || []).forEach((d) => { set[d] = 1; });
  if (!set[today]) return 0;
  let n = 0;
  let cursor = today;
  while (set[cursor]) {
    n += 1;
    const parts = cursor.split("-");
    const dt = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    dt.setUTCDate(dt.getUTCDate() - 1);
    cursor = dt.toISOString().slice(0, 10);
  }
  return n;
}

let arcadeAudio = null;

function arcadeUnlock() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!arcadeAudio) arcadeAudio = new AC();
  if (arcadeAudio.state === "suspended") arcadeAudio.resume();
}

function arcadeTone(freq, dur, type, volume) {
  if (!arcadeAudio) return;
  const ctx = arcadeAudio;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || "triangle";
  osc.frequency.setValueAtTime(Math.max(40, freq), t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume || 0.2, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function arcadeNoise(dur, volume, freq) {
  if (!arcadeAudio) return;
  const ctx = arcadeAudio;
  const t = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = freq || 400;
  const gain = ctx.createGain();
  gain.gain.value = volume || 0.2;
  src.buffer = buf;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t);
}

function arcadeReduced() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let arcadePlayer = null;
let arcadeLive = null;
let arcadeView = "home";

function arcadeShell(on) {
  document.documentElement.classList.toggle("arcade-playing", !!on);
  if (document.body) document.body.classList.toggle("arcade-playing", !!on);
}

function arcadeStop() {
  if (arcadeLive) {
    arcadeLive.alive = false;
    if (arcadeLive.raf) cancelAnimationFrame(arcadeLive.raf);
    arcadeLive = null;
  }
  arcadeShell(false);
}

function arcadeColor(i) {
  return ARCADE_COLORS[Math.abs(i) % ARCADE_COLORS.length];
}

function arcadePlace(S, r, bias) {
  const w = S.w;
  const h = S.h;
  const top = 8;
  const rand = S.rand;
  for (let n = 0; n < 18; n++) {
    let x = r + 6 + rand() * Math.max(1, w - r * 2 - 12);
    let y = top + r + rand() * Math.max(1, h - top - r * 2 - 8);
    if (bias === "edge") {
      const side = Math.floor(rand() * 4);
      if (side === 0) x = r + 4;
      if (side === 1) x = w - r - 4;
      if (side === 2) y = top + r;
      if (side === 3) y = h - r - 4;
      if (S.level >= 7 && rand() < 0.5) {
        x = rand() < 0.5 ? r + 4 : w - r - 4;
        y = rand() < 0.5 ? top + r : h - r - 4;
      }
    }
    if (bias === "ring") {
      const reach = S.level <= 2 ? 0.28 : S.level <= 4 ? 0.34 : S.level <= 6 ? 0.42 : 0.46;
      const ang = rand() * Math.PI * 2;
      x = w * 0.5 + Math.cos(ang) * Math.min(w, h) * reach;
      y = h * 0.52 + Math.sin(ang) * Math.min(w, h) * reach * 0.72;
    }
    if (S.lastTap && Math.hypot(x - S.lastTap.x, y - S.lastTap.y) < r * 2.8) continue;
    let hit = false;
    for (let i = 0; i < S.balls.length; i++) {
      const b = S.balls[i];
      if (Math.hypot(b.x - x, b.y - y) < b.r + r + 8) { hit = true; break; }
    }
    if (!hit) return { x: x, y: y };
  }
  return null;
}

function arcadeAddBall(S, ball) {
  ball.id = ++S.seq;
  ball.born = S.now;
  S.balls.push(ball);
  return ball;
}

function arcadeDrawBall(g, b, assist, now) {
  g.save();
  if (b.shake) {
    const mag = b.shake * (1 - Math.min(1, (now - (b.shakeAt || now)) / 180));
    g.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }
  g.beginPath();
  g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  g.fillStyle = b.fill || "#F4F1EA";
  g.fill();
  g.save();
  g.clip();
  g.strokeStyle = b.seam || "#C4121A";
  g.lineWidth = Math.max(1.5, b.r * 0.12);
  if (b.spin === "heater") {
    const stripes = b.stripes || 4;
    const shift = ((now - b.born) / 1000) * b.r * (b.spinRate || 1.4);
    for (let i = 0; i < stripes; i++) {
      const y = b.y - b.r + ((i * b.r * 2) / stripes + shift) % (b.r * 2);
      g.beginPath();
      g.moveTo(b.x - b.r, y);
      g.lineTo(b.x + b.r, y);
      g.stroke();
    }
  } else if (b.spin === "slider") {
    g.translate(b.x, b.y);
    g.rotate(((now - b.born) / 1000) * (b.spinRate || 2));
    g.beginPath();
    g.arc(0, 0, b.r * 0.72, 0.3, 2.4);
    g.stroke();
    g.beginPath();
    g.arc(0, 0, b.r * 0.72, Math.PI + 0.3, Math.PI + 2.4);
    g.stroke();
  } else {
    g.beginPath();
    g.arc(b.x - b.r * 0.22, b.y, b.r * 0.92, -1.05, 1.05);
    g.stroke();
    g.beginPath();
    g.arc(b.x + b.r * 0.22, b.y, b.r * 0.92, Math.PI - 1.05, Math.PI + 1.05);
    g.stroke();
  }
  g.restore();
  if (b.spin === "slider") {
    g.beginPath();
    g.arc(b.x, b.y, Math.max(3, b.r * (b.dot || 0.3)), 0, Math.PI * 2);
    g.fillStyle = "#E63946";
    g.fill();
  }
  if (b.n != null && !b.hideNum) {
    g.fillStyle = "#1a120c";
    g.font = "700 " + Math.round(b.r * (b.smallNum ? 0.62 : 0.78)) + "px Impact, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(b.n), b.x, b.y + 1);
  } else if (b.letter && (assist || b.kind === "glove")) arcadeLetter(g, b);
  g.restore();
}

function arcadeLetter(g, b) {
  g.fillStyle = b.fill === "#F4F1EA" || b.id === "white" ? "#1a120c" : "#fff";
  g.font = "700 " + Math.round(b.r * 0.62) + "px Impact, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(b.letter, b.x, b.y + 1);
}

function arcadeFloat(S, text, x, y) {
  S.floats.push({ text: text, x: x, y: y, born: S.now });
}

function arcadeBurst(S, x, y, color) {
  if (arcadeReduced()) return;
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    S.bits.push({ x: x, y: y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, born: S.now, color: color || "#F4C430" });
  }
}

function arcadeSide(S, y) {
  if (!S.h2h) return S;
  return y < S.h * 0.5 ? S : S.guest;
}

function arcadeAward(S, side, reaction, x, y) {
  side.combo += 1;
  side.bestCombo = Math.max(side.bestCombo || 0, side.combo);
  side.correct += 1;
  side.reactions.push(reaction);
  const pts = arcadeFormula(reaction, side.combo, S.level, S.speedScale);
  side.score += pts;
  S.progress += 1;
  arcadeFloat(S, "+" + pts + " · " + Math.round(reaction) + "ms", x, y);
  arcadeTone(520 + Math.min(side.combo, 24) * 26, 0.08, "triangle", 0.22);
  arcadeBurst(S, x, y, "#F4C430");
  arcadeLevelCheck(S);
  return pts;
}

function arcadePenalize(S, side, kind, x, y, skipProgress) {
  const loss = kind === "center" ? 75 : kind === "wrong" ? 50 : 25;
  side.combo = 0;
  if (kind === "wrong") side.wrong += 1;
  else side.missed += 1;
  side.score = Math.max(0, side.score - loss);
  if (!skipProgress) S.progress -= 2;
  if (kind === "wrong") {
    S.flash = 1;
    S.shake = 8;
    arcadeNoise(0.12, 0.28, 220);
    if (x != null) arcadeFloat(S, "−" + loss, x, y);
  } else {
    arcadeNoise(0.08, 0.12, kind === "center" ? 140 : 180);
    if (kind === "center" && x != null) arcadeFloat(S, "−" + loss, x, y);
  }
  if (!skipProgress) arcadeLevelCheck(S);
}

function arcadeLevelCheck(S) {
  if (S.progress >= 8 && S.level < 10) {
    S.level += 1;
    S.highest = Math.max(S.highest, S.level);
    S.progress = 0;
    S.bannerUntil = S.now + 900;
    S.bannerText = "LEVEL " + S.level;
    arcadeTone(660, 0.1, "sawtooth", 0.12);
    arcadeTone(880, 0.16, "triangle", 0.16);
  } else if (S.progress <= -5 && S.level > 1) {
    S.level -= 1;
    S.progress = 0;
  }
}

function arcadeAccuracy(side) {
  const den = side.correct + side.wrong + side.missed;
  return den ? side.correct / den : 0;
}

function arcadeFreshSide() {
  return { score: 0, combo: 0, bestCombo: 0, correct: 0, wrong: 0, missed: 0, reactions: [] };
}

function arcadeProfile(game, level) {
  if (game === "color") {
    if (level <= 2) return { colors: 3, life: 1800, speed: 0, max: 3, radius: 0.09, flip: 0 };
    if (level <= 4) return { colors: level === 3 ? 4 : 5, life: 1500, speed: 0.12, max: 4, radius: 0.075, flip: 0 };
    if (level <= 6) return { colors: level === 5 ? 5 : 6, life: 1200, speed: 0.22, max: 5, radius: 0.062, flip: 12000 };
    if (level <= 8) return { colors: 7, life: 1000, speed: 0.34, max: 6, radius: 0.054, flip: 8000, similar: true };
    return { colors: 8, life: 800, speed: 0.46, max: 6, radius: 0.046, flip: 6000, jitter: true };
  }
  if (game === "zone") {
    const grid = level >= 6 ? 4 : 3;
    let life = 1400;
    let gap = 250;
    let decoy = 0;
    let dual = false;
    if (level <= 3) { life = 1400 - (level - 1) * 150; gap = 250; }
    else if (level <= 5) { life = level === 4 ? 1000 : 900; gap = 200; decoy = 0.25; }
    else if (level <= 7) { life = level === 6 ? 800 : 700; gap = 150; decoy = 0.25; dual = true; }
    else { life = level === 8 ? 600 : level === 9 ? 520 : 450; gap = 100; decoy = 0.3; dual = "always"; }
    return { grid: grid, life: life, gap: gap, decoy: decoy, dual: dual };
  }
  if (game === "heater") {
    if (level <= 2) return { cross: 3, max: 1, curve: 0, decoy: 0, change: 0, late: 0, radius: 0.055 };
    if (level <= 4) return { cross: 2, max: 2, curve: 0.45, decoy: 0, change: 0, late: 0, radius: 0.05 };
    if (level <= 6) return { cross: 1.5, max: level === 5 ? 2 : 3, curve: 0.7, decoy: 0.15, change: 0, late: 0, radius: 0.046 };
    if (level <= 8) return { cross: 1.1, max: 3, curve: 0.8, decoy: 0, change: 0.28, late: 1, radius: 0.044 };
    return { cross: 0.8, max: 4, curve: 1, decoy: 0.2, change: 0.2, late: 1, radius: 0.036 };
  }
  if (game === "mind") {
    if (level <= 2) return { n: 4, time: 2500, trick: 0.3, rule: "see", shuffle: false, slide: 0 };
    if (level === 3) return { n: 4, time: 2200, trick: 0.6, rule: "see", shuffle: false, slide: 0 };
    if (level <= 5) return { n: 5, time: 1900, trick: 0.8, rule: "either", shuffle: false, slide: 0 };
    if (level <= 7) return { n: 5, time: 1500, trick: 0.85, rule: "either", shuffle: true, slide: 0 };
    return { n: 6, time: level === 8 ? 1200 : level === 9 ? 1050 : 900, trick: 0.9, rule: "either", shuffle: true, slide: 0.08 };
  }
  if (game === "numbers") {
    if (level <= 2) return { n: level === 1 ? 5 : 6, speed: 0, small: false, flash: 0 };
    if (level <= 4) return { n: level === 3 ? 7 : 8, speed: 0, small: true, flash: 0 };
    if (level <= 6) return { n: level === 5 ? 9 : 10, speed: 0.06, small: true, flash: 0 };
    if (level <= 8) return { n: level === 7 ? 11 : 12, speed: 0.12, small: true, flash: 0 };
    return { n: level === 9 ? 12 : 14, speed: 0.12, small: true, flash: 1500 };
  }
  if (game === "spin") {
    if (level <= 2) return { life: 1800, dot: 0.3, rate: 1.2, speed: 0, max: 3, radius: 0.08, flip: 0, blur: 0 };
    if (level <= 4) return { life: 1500, dot: 0.22, rate: 2, speed: 0.08, max: 4, radius: 0.07, flip: 0, blur: 0 };
    if (level <= 6) return { life: 1200, dot: 0.16, rate: 3.1, speed: 0.16, max: 4, radius: 0.062, flip: 15000, blur: 0 };
    if (level <= 8) return { life: 1000, dot: 0.12, rate: 4, speed: 0.2, max: 5, radius: 0.055, flip: 10000, blur: 1 };
    return { life: 800, dot: 0.09, rate: 5.4, speed: 0.32, max: 5, radius: 0.046, flip: 8000, blur: 1 };
  }
  if (game === "popup") {
    if (level <= 2) return { life: 1200, gap: [6000, 8000], decoy: 0, radius: 0.055 };
    if (level <= 4) return { life: 900, gap: [5000, 7000], decoy: 0, radius: 0.05 };
    if (level <= 6) return { life: 700, gap: [4000, 6000], decoy: 0.2, radius: 0.046 };
    if (level <= 8) return { life: 500, gap: [3000, 5000], decoy: 0.25, radius: 0.042 };
    return { life: 350, gap: [3000, 4000], decoy: 0.3, radius: 0.036 };
  }
  return {};
}

function arcadeWantTarget(S) {
  let targets = 0;
  S.balls.forEach((b) => { if (b.role === "target") targets += 1; });
  return targets;
}

function arcadeTickColor(S, dt) {
  const p = arcadeProfile("color", S.level);
  const unit = Math.min(S.w, S.h);
  if (S.called == null) S.called = Math.floor(S.rand() * Math.min(3, p.colors));
  if (p.flip) {
    if (!S.flippedAt) S.flippedAt = S.now;
    else if (S.now - S.flippedAt > p.flip) {
      const prev = S.called;
      S.called = Math.floor(S.rand() * p.colors);
      if (S.called === prev) S.called = (S.called + 1) % p.colors;
      S.flippedAt = S.now;
      S.bannerText = "TAP: " + arcadeColor(S.called).name;
      S.bannerUntil = S.now + 700;
      S.balls.forEach((b) => {
        if (b.colorIndex == null) return;
        b.role = b.colorIndex === S.called ? "target" : "decoy";
      });
    }
  }
  if (!S.bannerText) S.bannerText = "TAP: " + arcadeColor(S.called).name;
  S.balls.forEach((b) => {
    b.x += b.vx * dt / 1000;
    b.y += b.vy * dt / 1000;
    if (b.x < b.r || b.x > S.w - b.r) b.vx *= -1;
    if (b.y < b.r || b.y > S.h - b.r) b.vy *= -1;
    if (p.jitter && b.jitterAt && S.now >= b.jitterAt) {
      const a = S.rand() * Math.PI * 2;
      b.vx = Math.cos(a) * p.speed * unit;
      b.vy = Math.sin(a) * p.speed * unit;
      b.jitterAt = S.now + 420 + S.rand() * 480;
    }
  });
  if (S.balls.length < p.max && S.now >= (S.nextSpawn || 0)) {
    const spot = arcadePlace(S, unit * p.radius);
    if (spot) {
      const target = S.rand() < 0.4;
      let idx = target ? S.called : Math.floor(S.rand() * p.colors);
      if (!target && idx === S.called) idx = (idx + 1 + Math.floor(S.rand() * (p.colors - 1))) % p.colors;
      if (p.similar && !target && S.rand() < 0.55) {
        const family = (p.colors > 7 ? [0, 4, 7] : [0, 4, 2]).filter((n) => n < p.colors && n !== S.called);
        if (family.length) idx = family[Math.floor(S.rand() * family.length)];
      }
      if (!target && idx === S.called) idx = (idx + 1) % p.colors;
      const c = arcadeColor(idx);
      const ang = S.rand() * Math.PI * 2;
      arcadeAddBall(S, {
        x: spot.x, y: spot.y, r: unit * p.radius,
        vx: Math.cos(ang) * p.speed * unit, vy: Math.sin(ang) * p.speed * unit,
        fill: c.hex, seam: "#fff", letter: c.letter, colorIndex: idx,
        role: target ? "target" : "decoy",
        life: p.life, jitterAt: p.jitter ? S.now + 420 : 0,
      });
    }
    S.nextSpawn = S.now + 280 + S.rand() * 360;
  }
}

function arcadeTickZone(S) {
  const p = arcadeProfile("zone", S.level);
  if (S.balls.length && S.now < (S.zoneHold || 0)) return;
  if (S.now < (S.nextSpawn || 0)) return;
  if (S.game.id === "zone" && !(S.bannerUntil && S.now < S.bannerUntil)) S.bannerText = "HIT THE LIT BALL";
  const n = p.grid;
  const unit = Math.min(S.w, S.h);
  const size = unit * (n === 3 ? 0.62 : 0.72);
  const left = (S.w - size) / 2;
  const top = S.h * 0.22;
  const cell = size / n;
  S.zone = { n: n, left: left, top: top, cell: cell };
  const lights = p.dual === "always" || (p.dual && S.rand() < 0.55) ? 2 : 1;
  const used = {};
  for (let k = 0; k < lights; k++) {
    let cellId = Math.floor(S.rand() * n * n);
    let guard = 0;
    while (used[cellId] && guard < 8) { cellId = Math.floor(S.rand() * n * n); guard += 1; }
    used[cellId] = 1;
    const decoy = S.rand() < p.decoy;
    const col = cellId % n;
    const row = Math.floor(cellId / n);
    arcadeAddBall(S, {
      x: left + col * cell + cell / 2,
      y: top + row * cell + cell / 2,
      r: cell * 0.34,
      vx: 0, vy: 0,
      fill: decoy ? "#E63946" : "#F4F1EA",
      seam: decoy ? "#3a0c10" : "#C4121A",
      letter: decoy ? "" : "",
      role: decoy ? "decoy" : "target",
      life: p.life,
      zoneId: cellId,
    });
  }
  S.zoneHold = S.now + p.life;
  S.nextSpawn = S.now + p.life + p.gap;
}

function arcadeTickHeater(S, dt) {
  const p = arcadeProfile("heater", S.level);
  const alive = S.balls.length;
  if (alive < p.max && S.now >= (S.nextSpawn || 0)) {
    const r = Math.min(S.w, S.h) * p.radius;
    const fromLeft = S.rand() < 0.5;
    const y = r + 10 + S.rand() * (S.h - r * 2 - 16);
    const dirt = S.rand() < p.decoy;
    const change = !dirt && S.rand() < p.change;
    const cross = (change ? p.cross * 1.65 : p.cross) * 1000;
    const dist = S.w + r * 2;
    const speed = dist / (cross / 1000);
    const curve = !dirt && S.rand() < p.curve;
    arcadeAddBall(S, {
      x: fromLeft ? -r : S.w + r,
      y: y,
      r: r,
      vx: (fromLeft ? 1 : -1) * speed,
      vy: 0,
      fill: dirt ? "#6b4a2a" : "#F4F1EA",
      seam: dirt ? "#2a1c10" : "#C4121A",
      role: dirt ? "decoy" : "target",
      life: cross + 400,
      curve: curve ? (S.rand() < 0.5 ? -1 : 1) * S.h * 0.22 : 0,
      late: p.late && curve ? 1 : 0,
      baseY: y,
      cross: cross,
      trail: [],
    });
    S.nextSpawn = S.now + 280 + S.rand() * 420;
  }
  S.balls.forEach((b) => {
    const age = (S.now - b.born) / (b.cross || 1000);
    const bend = b.late ? Math.max(0, age - 0.62) / 0.38 : age;
    b.x += b.vx * dt / 1000;
    if (b.curve) b.y = b.baseY + b.curve * bend * bend;
    if (!b.trail) b.trail = [];
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 6) b.trail.shift();
  });
}

function arcadeMindPrompt(S) {
  const p = arcadeProfile("mind", S.level);
  const unit = Math.min(S.w, S.h);
  const colors = ARCADE_COLORS.slice(0, Math.max(p.n, 4));
  const word = colors[Math.floor(S.rand() * colors.length)];
  let ink = word;
  if (S.rand() < p.trick) {
    ink = colors[Math.floor(S.rand() * colors.length)];
    if (ink.id === word.id) ink = colors[(colors.indexOf(word) + 1) % colors.length];
  }
  let rule = "see";
  if (p.rule === "either") rule = S.rand() < 0.5 ? "see" : "read";
  if (S.mindRule && rule !== S.mindRule) S.bannerUntil = S.now + 500;
  S.mindRule = rule;
  S.mindWord = word;
  S.mindInk = ink;
  S.mindAnswer = rule === "see" ? ink.id : word.id;
  S.bannerText = rule === "see" ? "SEE IT" : "READ IT";
  const row = colors.slice(0, p.n);
  if (p.shuffle) {
    for (let i = row.length - 1; i > 0; i--) {
      const j = Math.floor(S.rand() * (i + 1));
      const tmp = row[i];
      row[i] = row[j];
      row[j] = tmp;
    }
  }
  S.balls = S.balls.filter((b) => b.kind !== "mind");
  const r = unit * 0.055;
  const gap = r * 2.3;
  const width = gap * row.length;
  row.forEach((c, i) => {
    arcadeAddBall(S, {
      x: S.w * 0.5 - width / 2 + gap * i + r,
      y: S.h * 0.78,
      r: r,
      vx: p.slide ? (i % 2 ? 1 : -1) * unit * p.slide : 0,
      vy: 0,
      fill: c.hex,
      seam: "#fff",
      letter: c.letter,
      role: c.id === S.mindAnswer ? "target" : "decoy",
      life: 0,
      kind: "mind",
      colorId: c.id,
    });
  });
  S.mindUntil = S.now + p.time;
}

function arcadeTickMind(S, dt) {
  const p = arcadeProfile("mind", S.level);
  if (!S.mindUntil || S.now >= S.mindUntil) {
    if (S.mindUntil) {
      S.balls.forEach((b) => {
        if (b.kind === "mind" && b.role === "target") {
          arcadePenalize(S, S, "miss", b.x, b.y);
          if (S.h2h) arcadePenalize(S, S.guest, "miss", b.x, b.y, true);
        }
      });
    }
    S.balls = S.balls.filter((b) => b.kind !== "mind");
    arcadeMindPrompt(S);
  }
  if (!p.slide) return;
  S.balls.forEach((b) => {
    if (b.kind !== "mind") return;
    b.x += b.vx * dt / 1000;
    if (b.x < b.r || b.x > S.w - b.r) b.vx *= -1;
  });
}

function arcadeNumbersSet(S) {
  const p = arcadeProfile("numbers", S.level);
  S.setLevel = S.level;
  S.highest = Math.max(S.highest, S.level);
  const unit = Math.min(S.w, S.h);
  const r = unit * (p.small ? 0.042 : 0.055);
  S.balls = [];
  S.need = 1;
  for (let n = 1; n <= p.n; n++) {
    const spot = arcadePlace(S, r);
    if (!spot) break;
    const ang = S.rand() * Math.PI * 2;
    arcadeAddBall(S, {
      x: spot.x, y: spot.y, r: r,
      vx: Math.cos(ang) * p.speed * unit,
      vy: Math.sin(ang) * p.speed * unit,
      fill: "#F4F1EA", seam: "#C4121A",
      n: n, smallNum: p.small,
      role: n === 1 ? "target" : "decoy",
      life: 600000,
      flash: p.flash,
      kind: "num",
    });
  }
  S.setBorn = S.now;
  S.lastGood = S.now;
  S.bannerText = "TAP 1";
}

function arcadeTickNumbers(S, dt) {
  const p = arcadeProfile("numbers", S.setLevel || S.level);
  S.balls.forEach((b) => {
    b.x += (b.vx || 0) * dt / 1000;
    b.y += (b.vy || 0) * dt / 1000;
    if (b.x < b.r || b.x > S.w - b.r) b.vx *= -1;
    if (b.y < b.r || b.y > S.h - b.r) b.vy *= -1;
    b.hideNum = p.flash && S.now - S.setBorn > p.flash && b.n !== S.peek;
  });
}

function arcadeTickSpin(S, dt) {
  const p = arcadeProfile("spin", S.level);
  const unit = Math.min(S.w, S.h);
  if (S.hunt == null) S.hunt = "slider";
  if (p.flip) {
    if (!S.flippedAt) S.flippedAt = S.now;
    else if (S.now - S.flippedAt > p.flip) {
      S.hunt = S.hunt === "slider" ? "heater" : "slider";
      S.flippedAt = S.now;
      S.bannerUntil = S.now + 700;
      S.bannerText = S.game.id === "spin" ? (S.hunt === "slider" ? "HUNT: SLIDER" : "HUNT: HEATER") : "FIND THE DOT";
      S.balls.forEach((b) => {
        if (!b.spin) return;
        b.role = b.spin === S.hunt ? "target" : "decoy";
      });
    }
  }
  const huntLabel = S.hunt === "slider" ? "HUNT: SLIDER" : "HUNT: HEATER";
  if (S.game.id === "spin" && !(S.bannerUntil && S.now < S.bannerUntil)) S.bannerText = huntLabel;
  else if ((S.game.id === "lightning" || S.warmup) && S.rule !== "color" && S.warmRule !== "color" && !(S.bannerUntil && S.now < S.bannerUntil)) {
    S.bannerText = "FIND THE DOT";
  }
  if (S.balls.length < p.max && S.now >= (S.nextSpawn || 0)) {
    const spot = arcadePlace(S, unit * p.radius);
    if (spot) {
      const slider = S.rand() < 0.42;
      const ang = S.rand() * Math.PI * 2;
      arcadeAddBall(S, {
        x: spot.x, y: spot.y, r: unit * p.radius,
        vx: Math.cos(ang) * p.speed * unit,
        vy: Math.sin(ang) * p.speed * unit,
        fill: "#F4F1EA",
        seam: slider ? "#a32028" : "#C4121A",
        spin: slider ? "slider" : "heater",
        dot: p.dot,
        spinRate: p.rate,
        stripes: 3 + Math.floor(S.rand() * 2),
        role: (slider ? "slider" : "heater") === S.hunt ? "target" : "decoy",
        life: p.life,
        blur: p.blur,
      });
    }
    S.nextSpawn = S.now + 260 + S.rand() * 340;
  }
  S.balls.forEach((b) => {
    b.x += b.vx * dt / 1000;
    b.y += b.vy * dt / 1000;
    if (b.x < b.r || b.x > S.w - b.r) b.vx *= -1;
    if (b.y < b.r || b.y > S.h - b.r) b.vy *= -1;
  });
}

function arcadeTickPopup(S) {
  const p = arcadeProfile("popup", S.level);
  const unit = Math.min(S.w, S.h);
  if (!S.glove) {
    arcadeAddBall(S, {
      x: S.w * 0.5, y: S.h * 0.5, r: unit * 0.07,
      fill: "#c4552a", seam: "#f2d3b0", letter: "K",
      role: "prop", life: 9999999, kind: "glove",
    });
    S.glove = 1;
    S.letter = "K";
    S.nextEdge = S.now + 400;
    S.nextLetter = S.now + p.gap[0] + S.rand() * (p.gap[1] - p.gap[0]);
  }
  const glove = S.balls.filter((b) => b.kind === "glove")[0];
  if (glove) {
    glove.letter = S.letter;
    glove.role = S.letter === "W" ? "target" : "prop";
    glove.x = S.w * 0.5;
    glove.y = S.h * 0.5;
  }
  if (S.letter === "W" && S.now > S.letterUntil) {
    arcadeMissCenter(S);
    S.letter = "K";
  }
  if (S.letter !== "W" && S.now >= S.nextLetter) {
    S.letter = "W";
    S.letterBorn = S.now;
    S.letterUntil = S.now + 1000;
    S.bannerText = "TAP THE GLOVE";
    S.bannerUntil = S.now + 1000;
    S.nextLetter = S.now + p.gap[0] + S.rand() * (p.gap[1] - p.gap[0]);
  }
  const edges = S.balls.filter((b) => b.kind === "edge").length;
  if (edges < 2 && S.now >= (S.nextEdge || 0)) {
    const spot = arcadePlace(S, unit * p.radius, S.level >= 5 ? "edge" : "ring");
    if (spot) {
      const decoy = S.rand() < p.decoy;
      arcadeAddBall(S, {
        x: spot.x, y: spot.y, r: unit * p.radius,
        fill: decoy ? "#E63946" : "#F4F1EA",
        seam: decoy ? "#3a0c10" : "#C4121A",
        role: decoy ? "decoy" : "target",
        life: p.life,
        kind: "edge",
      });
    }
    S.nextEdge = S.now + 280 + S.rand() * 360;
  }
  if (!S.bannerText) S.bannerText = "EDGES. WATCH THE GLOVE.";
}

function arcadeMissTargets(S) {
  const gone = [];
  S.balls.forEach((b) => {
    if (b.role === "target" && b.kind !== "glove") gone.push(b);
  });
  gone.forEach((b) => {
    arcadePenalize(S, S, "miss");
    if (S.h2h) arcadePenalize(S, S.guest, "miss");
  });
}

function arcadeMissCenter(S) {
  arcadePenalize(S, S, "center", S.w * 0.5, S.h * 0.42);
  if (S.h2h) arcadePenalize(S, S.guest, "center", S.w * 0.5, S.h * 0.58, true);
}

function arcadeExpire(S) {
  const keep = [];
  S.balls.forEach((b) => {
    const off = b.x < -b.r * 2 || b.x > S.w + b.r * 2 || b.y < -b.r * 2 || b.y > S.h + b.r * 2;
    const old = b.life && S.now - b.born > b.life && b.kind !== "glove" && b.kind !== "num";
    if (off || old) {
      if (b.role === "target") {
        arcadePenalize(S, S, "miss", b.x, b.y);
        if (S.h2h) arcadePenalize(S, S.guest, "miss", b.x, b.y, true);
        arcadeBurst(S, b.x, b.y, "#888");
      }
      return;
    }
    keep.push(b);
  });
  S.balls = keep;
}

function arcadeTapBall(S, b, x, y) {
  const side = arcadeSide(S, y);
  if (b.kind === "num") {
    b.hideNum = false;
    S.peek = b.n;
    if (b.n !== S.need) {
      arcadePenalize(S, side, "wrong", x, y);
      b.shake = 8;
      b.shakeAt = S.now;
      return;
    }
    const reaction = S.now - (S.lastGood || b.born);
    arcadeAward(S, side, reaction, x, y);
    S.zoneTimes = S.zoneTimes || {};
    S.balls = S.balls.filter((item) => item !== b);
    S.need += 1;
    S.lastGood = S.now;
    S.bannerText = "TAP " + S.need;
    const left = S.balls.filter((item) => item.kind === "num");
    if (!left.length) {
      const bonus = (S.need - 1) * 20;
      side.score += bonus;
      arcadeFloat(S, "SET +" + bonus, S.w * 0.5, S.h * 0.4);
      arcadeTone(740, 0.12, "triangle", 0.2);
      S.need = 0;
      S.nextSpawn = S.now + 350;
      return;
    }
    left.forEach((item) => { item.role = item.n === S.need ? "target" : "decoy"; });
    return;
  }
  if (b.kind === "glove") {
    if (S.letter !== "W") return;
    const reaction = S.now - (S.letterBorn || S.now);
    arcadeAward(S, side, reaction, x, y);
    S.letter = "K";
    S.bannerText = "EDGES. WATCH THE GLOVE.";
    return;
  }
  if (b.role === "decoy") {
    arcadePenalize(S, side, "wrong", x, y);
    b.shake = 8;
    b.shakeAt = S.now;
    return;
  }
  if (b.role !== "target") return;
  const reaction = Math.max(0, S.now - b.born);
  if (S.clean) {
    side.score += 100;
    arcadeFloat(S, "CLEAN +100", x, y - 28);
    S.clean = false;
  }
  arcadeAward(S, side, reaction, x, y);
  if (b.zoneId != null) {
    if (!S.zoneTimes[b.zoneId]) S.zoneTimes[b.zoneId] = [];
    S.zoneTimes[b.zoneId].push(reaction);
  }
  arcadeBurst(S, b.x, b.y, b.fill);
  S.balls = S.balls.filter((item) => item !== b);
  if (b.kind === "mind") {
    S.mindUntil = S.now;
    S.balls = S.balls.filter((item) => item.kind !== "mind");
  }
}

function arcadeRuleName(id) {
  return { color: "TAP THE CALLED COLOR", zone: "HIT THE ZONE", heater: "CATCH THE HEAT", spin: "FIND THE DOT", mind: "SEE IT / READ IT" }[id] || "";
}

function arcadeTickRule(S, dt, id) {
  if (id === "color") arcadeTickColor(S, dt);
  else if (id === "zone") arcadeTickZone(S);
  else if (id === "heater") arcadeTickHeater(S, dt);
  else if (id === "mind") arcadeTickMind(S, dt);
  else if (id === "numbers") {
    if (!S.need && S.now >= (S.nextSpawn || 0)) arcadeNumbersSet(S);
    arcadeTickNumbers(S, dt);
  } else if (id === "spin") arcadeTickSpin(S, dt);
  else if (id === "popup") arcadeTickPopup(S);
}

function arcadeTickLightning(S, dt) {
  if (!S.ruleUntil) {
    const order = ["color", "zone", "heater", "spin", "mind"];
    S.rule = order[Math.floor(S.rand() * order.length)];
    S.ruleUntil = S.now + 8000 + S.rand() * 2000;
    S.switchUntil = 0;
    S.called = Math.floor(S.rand() * 3);
    S.bannerText = arcadeRuleName(S.rule);
  }
  if (S.switchUntil && S.now < S.switchUntil) {
    S.balls = [];
    S.bannerText = arcadeRuleName(S.rule);
    return;
  }
  if (S.now >= S.ruleUntil) {
    const order = ["color", "zone", "heater", "spin", "mind"];
    let next = order[Math.floor(S.rand() * order.length)];
    if (next === S.rule) next = order[(order.indexOf(next) + 1) % order.length];
    S.rule = next;
    S.ruleUntil = S.now + 8000 + S.rand() * 2000;
    S.switchUntil = S.now + 1000;
    S.clean = true;
    S.balls = [];
    S.mindUntil = 0;
    S.zoneHold = 0;
    S.nextSpawn = S.now + 1000;
    S.flippedAt = S.now;
    S.bannerText = arcadeRuleName(next);
    S.bannerUntil = S.now + 1000;
    return;
  }
  arcadeTickRule(S, dt, S.rule);
}

function arcadeTick(S, dt) {
  const id = S.game.id;
  if (S.warmup) {
    const slot = Math.floor((S.now - S.started) / 60000) % 3;
    const name = ["color", "zone", "heater"][slot];
    if (name !== S.warmRule) {
      S.warmRule = name;
      S.balls = [];
      S.mindUntil = 0;
      S.nextSpawn = S.now + 200;
      S.bannerText = arcadeRuleName(name);
    }
    arcadeTickRule(S, dt, S.warmRule);
    return;
  }
  if (id === "lightning") arcadeTickLightning(S, dt);
  else arcadeTickRule(S, dt, id);
}

function arcadeDrawPlate(g, S) {
  if (!S.zone) return;
  const z = S.zone;
  const mid = z.left + (z.cell * z.n) / 2;
  const bottom = z.top + z.cell * z.n + 8;
  g.fillStyle = "rgba(244,241,234,.9)";
  g.beginPath();
  g.moveTo(mid - z.cell * 0.7, bottom);
  g.lineTo(mid + z.cell * 0.7, bottom);
  g.lineTo(mid + z.cell * 0.7, bottom + z.cell * 0.28);
  g.lineTo(mid, bottom + z.cell * 0.7);
  g.lineTo(mid - z.cell * 0.7, bottom + z.cell * 0.28);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(244,241,234,.85)";
  g.lineWidth = 2;
  g.strokeRect(z.left, z.top, z.cell * z.n, z.cell * z.n);
  for (let i = 1; i < z.n; i++) {
    g.beginPath();
    g.moveTo(z.left + i * z.cell, z.top);
    g.lineTo(z.left + i * z.cell, z.top + z.cell * z.n);
    g.moveTo(z.left, z.top + i * z.cell);
    g.lineTo(z.left + z.cell * z.n, z.top + i * z.cell);
    g.stroke();
  }
}

function arcadeDrawWorld(S, g) {
  const w = S.w;
  const h = S.h;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#07111c");
  sky.addColorStop(0.55, "#0c2418");
  sky.addColorStop(1, "#07140e");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(244,241,234,.16)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(w * 0.08, h * 0.92);
  g.lineTo(w * 0.5, h * 0.42);
  g.lineTo(w * 0.92, h * 0.92);
  g.stroke();
  if (S.shake && !arcadeReduced()) {
    const m = S.shake;
    g.setTransform(1, 0, 0, 1, (Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    S.shake = Math.max(0, S.shake - 0.7);
  }
  if (S.game.id === "zone" || S.rule === "zone" || (S.warmup && S.warmRule === "zone")) arcadeDrawPlate(g, S);
  if (S.h2h) {
    g.strokeStyle = "rgba(244,196,48,.7)";
    g.beginPath();
    g.moveTo(16, h * 0.5);
    g.lineTo(w - 16, h * 0.5);
    g.stroke();
  }
  const assist = S.assist;
  S.balls.forEach((b) => {
    if (b.trail && b.trail.length) {
      b.trail.forEach((t, i) => {
        g.globalAlpha = (i + 1) / (b.trail.length + 2) * 0.35;
        g.fillStyle = b.fill || "#fff";
        g.beginPath();
        g.arc(t.x, t.y, b.r * 0.7, 0, Math.PI * 2);
        g.fill();
      });
      g.globalAlpha = 1;
    }
    if (b.blur && !arcadeReduced()) g.globalAlpha = 0.92;
    arcadeDrawBall(g, b, assist, S.now);
    g.globalAlpha = 1;
  });
  S.bits = S.bits.filter((bit) => S.now - bit.born < 320);
  S.bits.forEach((bit) => {
    const u = (S.now - bit.born) / 320;
    g.globalAlpha = 1 - u;
    g.fillStyle = bit.color;
    g.fillRect(bit.x + bit.vx * u, bit.y + bit.vy * u, 4, 4);
  });
  g.globalAlpha = 1;
  S.floats = S.floats.filter((f) => S.now - f.born < 700);
  S.floats.forEach((f) => {
    const u = (S.now - f.born) / 700;
    g.globalAlpha = 1 - u;
    g.fillStyle = "#F4C430";
    g.font = "700 " + Math.round(Math.min(w, h) * 0.045) + "px Impact, sans-serif";
    g.textAlign = "center";
    g.fillText(f.text, f.x, f.y - u * 28);
  });
  g.globalAlpha = 1;
  if (S.game.id === "mind" || S.rule === "mind") {
    const ink = S.mindInk;
    const word = S.mindWord;
    if (ink && word) {
      g.fillStyle = "rgba(0,0,0,.45)";
      g.fillRect(w * 0.2, h * 0.16, w * 0.6, h * 0.16);
      g.strokeStyle = "rgba(244,196,48,.8)";
      g.strokeRect(w * 0.2, h * 0.16, w * 0.6, h * 0.16);
      g.fillStyle = ink.hex;
      g.font = "700 " + Math.round(Math.min(w, h) * 0.09) + "px Impact, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(word.name, w * 0.5, h * 0.24);
    }
  }
  if (S.bannerUntil && S.now < S.bannerUntil && S.bannerText) {
    g.fillStyle = "rgba(244,196,48,.95)";
    g.font = "italic 700 " + Math.round(Math.min(w, h) * 0.07) + "px Impact, sans-serif";
    g.textAlign = "center";
    g.fillText(S.bannerText, w * 0.5, h * 0.14);
  }
  if (S.flash > 0) {
    g.fillStyle = "rgba(230,57,70," + (0.28 * S.flash) + ")";
    g.fillRect(0, 0, w, h);
    S.flash = Math.max(0, S.flash - 0.04);
  }
}

function arcadePaintHud(S) {
  const time = document.getElementById("arcadeTime");
  const score = document.getElementById("arcadeScore");
  const level = document.getElementById("arcadeLevel");
  const combo = document.getElementById("arcadeCombo");
  const banner = document.getElementById("arcadeBanner");
  const left = Math.max(0, S.ends - S.now);
  if (time) {
    time.textContent = (left / 1000).toFixed(1);
    time.classList.toggle("is-late", left <= 5000);
  }
  if (score) score.textContent = S.h2h ? S.score + " · " + S.guest.score : String(S.score);
  if (level) level.textContent = "L" + S.level;
  if (combo) combo.style.width = Math.min(100, (S.combo / 20) * 100) + "%";
  if (banner) {
    let text = S.bannerText || "";
    if (S.game.id === "color" || S.rule === "color") {
      const c = arcadeColor(S.called || 0);
      text = "TAP: " + c.name;
      banner.style.color = c.hex;
    } else banner.style.color = "";
    banner.textContent = text;
  }
  if (left <= 5000 && S.tickAt !== Math.ceil(left / 1000)) {
    S.tickAt = Math.ceil(left / 1000);
    if (S.tickAt > 0 && S.tickAt <= 5) arcadeTone(180 + S.tickAt * 40, 0.05, "square", 0.08);
  }
}

function arcadeFinish(S) {
  if (!S.alive) return;
  S.alive = false;
  if (S.raf) cancelAnimationFrame(S.raf);
  arcadeLive = null;
  arcadeShell(true);
  const bag = arcadeBag(arcadePlayer);
  const today = arcadeToday();
  if (bag.days.indexOf(today) < 0) bag.days.push(today);
  const streak = arcadeStreak(bag.days, today);
  const saveSide = (side, label) => {
    const acc = arcadeAccuracy(side);
    const avg = side.reactions.length ? Math.round(side.reactions.reduce((a, b) => a + b, 0) / side.reactions.length) : 0;
    const fastest = side.reactions.length ? Math.round(Math.min.apply(null, side.reactions)) : 0;
    const vision = arcadeVision(acc, S.highest);
    const grade = arcadeGrade(vision);
    const row = {
      game: S.warmup ? "warmup" : S.game.id,
      label: label || "",
      date: today,
      startLevel: S.startLevel,
      highest: S.highest,
      score: side.score,
      accuracy: Math.round(acc * 1000) / 1000,
      avg: avg,
      fastest: fastest,
      bestCombo: side.bestCombo,
      vision: vision,
      grade: grade,
      daily: S.daily ? 1 : 0,
    };
    const prev = bag.best[row.game] || 0;
    const best = label !== "guest" && !S.warmup && side.score > prev;
    if (label === "guest") return { row: row, best: false, acc: acc, avg: avg, fastest: fastest, vision: vision, grade: grade };
    bag.rounds.push(row);
    if (bag.rounds.length > 60) bag.rounds = bag.rounds.slice(-60);
    if (best) bag.best[S.game.id] = side.score;
    if (label !== "guest") {
      if (avg && avg < 300) bag.badges.quickHands = 1;
      if (side.wrong === 0 && side.correct > 0) bag.badges.iceVeins = 1;
      if (side.bestCombo >= 25) bag.badges.onFire = 1;
      if (S.highest >= 10) bag.badges.bigLeaguer = 1;
      if (streak >= 7) bag.badges.dailyGrinder = 1;
    }
    return { row: row, best: best, acc: acc, avg: avg, fastest: fastest, vision: vision, grade: grade };
  };
  const main = saveSide(S, "you");
  const guest = S.h2h ? saveSide(S.guest, "guest") : null;
  arcadePersist(arcadePlayer, bag);
  arcadePublish(S, main.row);
  arcadeShowResults(S, main, guest, bag, streak);
}

function arcadeLoop(S) {
  const step = (now) => {
    if (!S.alive || arcadeLive !== S) return;
    const dt = Math.min(34, now - (S.frame || now));
    S.frame = now;
    S.now = now;
    const canvas = document.getElementById("arcadeCanvas");
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(280, Math.round(rect.width * dpr));
      const h = Math.max(220, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        const sx = canvas.width ? w / canvas.width : 1;
        const sy = canvas.height ? h / canvas.height : 1;
        if (canvas.width && S.balls.length) {
          S.balls.forEach((b) => { b.x *= sx; b.y *= sy; b.r *= (sx + sy) / 2; });
        }
        canvas.width = w;
        canvas.height = h;
      }
      S.w = w;
      S.h = h;
    }
    S.speedScale = (S.game.id === "heater" || S.rule === "heater" || S.warmRule === "heater") ? 2 : 1;
    S.acc = (S.acc || 0) + dt;
    while (S.acc >= 16) {
      arcadeTick(S, 16);
      arcadeExpire(S);
      S.acc -= 16;
    }
    if (canvas) arcadeDrawWorld(S, canvas.getContext("2d"));
    arcadePaintHud(S);
    if (now >= S.ends) { arcadeFinish(S); return; }
    S.raf = requestAnimationFrame(step);
  };
  S.raf = requestAnimationFrame(step);
}

function arcadePointer(ev) {
  const S = arcadeLive;
  const canvas = document.getElementById("arcadeCanvas");
  if (!S || !canvas || S.phase !== "play") return;
  ev.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
  const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
  S.lastTap = { x: x, y: y };
  S.now = performance.now();
  for (let i = S.balls.length - 1; i >= 0; i--) {
    const b = S.balls[i];
    if (Math.hypot(b.x - x, b.y - y) <= b.r * 1.15) {
      arcadeTapBall(S, b, x, y);
      return;
    }
  }
}

function arcadeAuth() {
  if (typeof AntonelliAuth !== "undefined") return AntonelliAuth;
  return globalThis.AntonelliAuth || null;
}

function arcadePublish(S, row) {
  const auth = arcadeAuth();
  if (!auth || !auth.client || !auth.user || auth.holdingSample || !auth.playerId) return;
  const avg = Math.max(0, Math.min(60000, Math.round(row.avg || 0)));
  const fastest = Math.max(0, Math.min(avg, Math.round(row.fastest || 0)));
  const vision = Math.max(0, Math.min(99, Math.round(row.vision || 0)));
  const payload = {
    player_id: auth.playerId,
    game: row.game,
    played_on: row.date,
    seed: S.daily ? "arcade-daily-" + row.date : "",
    score: Math.max(0, Math.min(1000000, Math.round(row.score || 0))),
    accuracy: Math.max(0, Math.min(1, Math.round((Number(row.accuracy) || 0) * 1000) / 1000)),
    avg_ms: avg,
    fastest_ms: fastest,
    highest_level: Math.max(1, Math.min(10, Math.round(row.highest || 1))),
    best_combo: Math.max(0, Math.min(10000, Math.round(row.bestCombo || 0))),
    vision: vision,
    grade: arcadeGrade(vision),
  };
  auth.client.from("arcade_scores").insert(payload).then(function () {}, function () {});
  if (S.h2h && S.guest && row.game !== "warmup") {
    auth.client.from("arcade_h2h").insert({
      player_id: auth.playerId,
      game: row.game,
      played_on: row.date,
      seed: payload.seed,
      score_a: row.score,
      score_b: Math.max(0, Math.round(S.guest.score || 0)),
    }).then(function () {}, function () {});
  }
  if (S.daily && row.game !== "warmup") {
    auth.client.from("arcade_daily").upsert({
      played_on: row.date,
      player_id: auth.playerId,
      game: row.game,
      score: row.score,
    }, { onConflict: "played_on,player_id" }).then(function () {}, function () {});
  }
}

function arcadeMount(player) {
  arcadePlayer = player || (typeof roadSignedIn === "function" ? roadSignedIn() : null);
  const hub = document.getElementById("arcadeHub");
  if (!hub) return;
  if (arcadeLive) return;
  arcadeShell(false);
  arcadeView = "home";
  hub.innerHTML = arcadeHomeHTML(arcadePlayer);
  arcadeWireHome(hub);
}

function arcadeHomeHTML(player) {
  const bag = arcadeBag(player);
  const cards = ARCADE_GAMES.map((game) => {
    const best = bag.best[game.id];
    return "<button type=\"button\" class=\"arcade-card\" data-game=\"" + game.id + "\"><b>" + arcadeEsc(game.name) + "</b><span>" + arcadeEsc(game.blurb) + "</span><em>" + (best ? "Best " + best : "No score yet") + "</em></button>";
  }).join("");
  const tips = ARCADE_TIPS.map((tip) => "<li>" + arcadeEsc(tip) + "</li>").join("");
  const seconds = bag.settings.seconds || 45;
  return "<p class=\"arcade-kicker\">TRAIN</p><h2>Quick Eyes</h2><p class=\"arcade-lead\">Eight reaction games. Tap the right baseball as fast as you can. Speed and accuracy both count. The night gets harder when you stay sharp.</p>" +
    "<div class=\"arcade-grid\">" + cards + "</div>" +
    "<div class=\"arcade-actions\"><button type=\"button\" class=\"btn btn-red\" id=\"arcadeDaily\">Daily Challenge</button><button type=\"button\" class=\"btn btn-ghost\" id=\"arcadeWarm\">Warm-Up</button><button type=\"button\" class=\"btn btn-ghost\" id=\"arcadeProgress\">Progress</button></div><div id=\"arcadeDailyBoard\"></div>" +
    "<div class=\"arcade-settings\"><p class=\"arcade-kicker\">ROUND</p><div class=\"arcade-pills\" id=\"arcadeSeconds\">" +
    [30, 45, 60].map((n) => "<button type=\"button\" data-seconds=\"" + n + "\"" + (n === seconds ? " class=\"is-on\"" : "") + ">" + n + "s</button>").join("") +
    "</div><button type=\"button\" class=\"btn btn-ghost\" id=\"arcadeBlind\">" + (bag.settings.colorblind ? "Color letters on" : "Color letters off") + "</button><button type=\"button\" class=\"btn btn-ghost\" id=\"arcadeCal\">Calibrate" + (bag.settings.baseline ? " · " + bag.settings.baseline + " ms" : "") + "</button></div>" +
    "<div class=\"arcade-team\"><p class=\"arcade-kicker\">TEAM BOARD</p><p class=\"arcade-note\">A 4–8 letter code keeps this week's scores with players you already share a roster with.</p><form id=\"arcadeTeamForm\"><input id=\"arcadeTeamCode\" maxlength=\"8\" placeholder=\"Team code\" value=\"" + arcadeEsc(bag.teamCode) + "\"><button class=\"btn btn-ghost\" type=\"submit\">Save code</button></form><div id=\"arcadeBoard\"></div></div>" +
    "<h3>Coaching tips</h3><ul class=\"arcade-tips\">" + tips + "</ul>";
}

function arcadeWireHome(hub) {
  hub.querySelectorAll("[data-game]").forEach((btn) => {
    btn.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      arcadeUnlock();
      arcadePre(btn.dataset.game, {});
    });
  });
  const daily = document.getElementById("arcadeDaily");
  if (daily) daily.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    const key = arcadeToday();
    const seed = arcadeSeed("arcade-daily-" + key);
    const game = ARCADE_GAMES[seed % ARCADE_GAMES.length];
    arcadePre(game.id, { daily: 1, seed: seed, level: 1 });
  });
  const warm = document.getElementById("arcadeWarm");
  if (warm) warm.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    arcadeStart(ARCADE_GAMES[0], { warmup: 1, level: 1 });
  });
  const progress = document.getElementById("arcadeProgress");
  if (progress) progress.addEventListener("pointerdown", (ev) => { ev.preventDefault(); arcadeShowProgress(); });
  hub.querySelectorAll("[data-seconds]").forEach((btn) => {
    btn.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      const bag = arcadeBag(arcadePlayer);
      bag.settings.seconds = Number(btn.dataset.seconds);
      arcadePersist(arcadePlayer, bag);
      hub.querySelectorAll("[data-seconds]").forEach((b) => b.classList.toggle("is-on", b === btn));
    });
  });
  const blind = document.getElementById("arcadeBlind");
  if (blind) blind.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    const bag = arcadeBag(arcadePlayer);
    bag.settings.colorblind = !bag.settings.colorblind;
    arcadePersist(arcadePlayer, bag);
    blind.textContent = bag.settings.colorblind ? "Color letters on" : "Color letters off";
  });
  const cal = document.getElementById("arcadeCal");
  if (cal) cal.addEventListener("pointerdown", (ev) => { ev.preventDefault(); arcadeCalibrate(); });
  const form = document.getElementById("arcadeTeamForm");
  if (form) form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const bag = arcadeBag(arcadePlayer);
    bag.teamCode = String(document.getElementById("arcadeTeamCode").value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    arcadePersist(arcadePlayer, bag);
    arcadeJoinTeam(bag.teamCode);
    arcadePaintBoard();
  });
  arcadePaintBoard();
  arcadePaintDaily();
}

function arcadePaintBoard() {
  const box = document.getElementById("arcadeBoard");
  if (!box) return;
  const bag = arcadeBag(arcadePlayer);
  const code = bag.teamCode;
  if (!code) { box.innerHTML = "<p class=\"arcade-note\">No code yet. Coaches can invent one and hand it out.</p>"; return; }
  const week = arcadeToday().slice(0, 8);
  const mine = (bag.rounds || []).filter((r) => String(r.date || "").slice(0, 8) === week);
  const best = mine.reduce((m, r) => Math.max(m, r.score || 0), 0);
  box.innerHTML = "<p class=\"arcade-note\">Code " + arcadeEsc(code) + ". This browser, this week: " + (best ? "best " + best : "no rounds yet") + ".</p>";
  const auth = arcadeAuth();
  if (!auth || !auth.client || !auth.user || auth.holdingSample) return;
  auth.client.from("arcade_week_board").select("name, player_id, score, game, played_on, code").eq("code", code).order("score", { ascending: false }).limit(20).then((res) => {
    if (!res || res.error || !box.isConnected) return;
    const rows = res.data || [];
    if (!rows.length) return;
    box.innerHTML += "<ol class=\"arcade-board\">" + rows.map((r) => "<li>" + arcadeEsc(r.name || r.player_id) + " · " + r.score + "</li>").join("") + "</ol>";
  }, function () {});
}

function arcadeJoinTeam(code) {
  const auth = arcadeAuth();
  if (!code || code.length < 4 || !auth || !auth.client || !auth.user || auth.holdingSample || !auth.playerId) return;
  const join = () => {
    auth.client.from("arcade_team_members").upsert({ code: code, player_id: auth.playerId }, { onConflict: "code,player_id" }).then(function () {}, function () {});
  };
  auth.client.from("arcade_teams").insert({ code: code, name: code, created_by: auth.playerId }).then(join, join);
}

function arcadePaintDaily() {
  const box = document.getElementById("arcadeDailyBoard");
  if (!box) return;
  const day = arcadeToday();
  const head = "<p class=\"arcade-kicker\">TODAY'S BOARD</p>";
  const auth = arcadeAuth();
  if (!auth || !auth.client || !auth.user || auth.holdingSample) {
    box.innerHTML = head + "<p class=\"arcade-note\">Sign in to see your team's scores for " + arcadeEsc(day) + ".</p>";
    return;
  }
  box.innerHTML = head + "<p class=\"arcade-note\">Loading " + arcadeEsc(day) + ".</p>";
  auth.client.from("arcade_daily_board").select("name, player_id, score, game").eq("played_on", day).order("score", { ascending: false }).limit(10).then((res) => {
    if (!box.isConnected) return;
    if (!res || res.error) {
      box.innerHTML = head + "<p class=\"arcade-note\">Today's board did not load.</p>";
      return;
    }
    const rows = res.data || [];
    if (!rows.length) {
      box.innerHTML = head + "<p class=\"arcade-note\">No scores yet for " + arcadeEsc(day) + ".</p>";
      return;
    }
    box.innerHTML = head + "<ol class=\"arcade-board\">" + rows.map((r) => "<li>" + arcadeEsc(r.name || r.player_id) + " · " + r.score + "</li>").join("") + "</ol>";
  }, function () {
    if (box.isConnected) box.innerHTML = head + "<p class=\"arcade-note\">Today's board did not load.</p>";
  });
}

function arcadePre(id, opts) {
  const game = ARCADE_GAMES.filter((g) => g.id === id)[0] || ARCADE_GAMES[0];
  const hub = document.getElementById("arcadeHub");
  if (!hub) return;
  arcadeView = "pre";
  const phone = game.id === "popup" ? "<p class=\"arcade-note\">On a phone, a laptop or tablet makes the edges easier to see.</p>" : "";
  hub.innerHTML = "<p class=\"arcade-kicker\">" + (opts.daily ? "DAILY" : "HOW TO PLAY") + "</p><h2>" + arcadeEsc(game.name) + "</h2><ul class=\"arcade-help\">" +
    game.help.map((line) => "<li>" + arcadeEsc(line) + "</li>").join("") + "</ul>" + phone +
    "<p class=\"arcade-kicker\">STARTING LEVEL</p><div class=\"arcade-pills\" id=\"arcadeLevels\"><button type=\"button\" data-level=\"1\" class=\"is-on\">Rookie</button><button type=\"button\" data-level=\"3\">Varsity</button><button type=\"button\" data-level=\"5\">Pro</button></div>" +
    "<label class=\"arcade-check\"><input type=\"checkbox\" id=\"arcadeH2H\"> Head-to-head, same tablet</label>" +
    "<div class=\"arcade-actions\"><button type=\"button\" class=\"btn btn-red\" id=\"arcadePlay\">Play</button><button type=\"button\" class=\"btn btn-ghost\" id=\"arcadePreHome\">Home</button></div>";
  let level = opts.level || 1;
  hub.querySelectorAll("[data-level]").forEach((btn) => {
    btn.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      level = Number(btn.dataset.level);
      hub.querySelectorAll("[data-level]").forEach((b) => b.classList.toggle("is-on", b === btn));
    });
  });
  document.getElementById("arcadePlay").addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    arcadeUnlock();
    const h2h = document.getElementById("arcadeH2H").checked;
    arcadeStart(game, { level: opts.daily ? 1 : level, daily: opts.daily, seed: opts.seed, h2h: h2h });
  });
  document.getElementById("arcadePreHome").addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    arcadeMount(arcadePlayer);
  });
}

function arcadeStart(game, opts) {
  const hub = document.getElementById("arcadeHub");
  if (!hub) return;
  arcadeStop();
  const bag = arcadeBag(arcadePlayer);
  const seconds = game.id === "lightning" ? 60 : opts.warmup ? 180 : (bag.settings.seconds || 45);
  const seed = opts.seed || arcadeSeed(game.id + ":" + Date.now() + ":" + Math.random());
  const S = Object.assign(arcadeFreshSide(), {
    game: game,
    alive: true,
    phase: "count",
    level: opts.level || 1,
    startLevel: opts.level || 1,
    highest: opts.level || 1,
    progress: 0,
    balls: [],
    bits: [],
    floats: [],
    seq: 0,
    rand: arcadeRng(seed),
    daily: opts.daily || 0,
    dailyKey: opts.daily ? arcadeToday() : "",
    h2h: !!opts.h2h,
    guest: arcadeFreshSide(),
    warmup: opts.warmup || 0,
    assist: !!bag.settings.colorblind,
    speedScale: game.id === "heater" ? 2 : 1,
    bannerText: "",
    zoneTimes: {},
    w: 800,
    h: 600,
    now: performance.now(),
    roundMs: seconds * 1000,
  });
  arcadeLive = S;
  arcadeView = "play";
  hub.innerHTML = "<div class=\"arcade-stage\"><div class=\"arcade-hud\"><button type=\"button\" id=\"arcadeQuit\" aria-label=\"Quit\">✕</button><span id=\"arcadeTime\">" + seconds.toFixed(1) + "</span><span id=\"arcadeScore\">0</span><span id=\"arcadeLevel\">L" + S.level + "</span><span class=\"arcade-flame\" aria-hidden=\"true\"><i id=\"arcadeCombo\"></i></span></div><p id=\"arcadeBanner\" class=\"arcade-banner\"></p><canvas id=\"arcadeCanvas\" class=\"arcade-canvas\" width=\"800\" height=\"600\"></canvas><p id=\"arcadeCount\" class=\"arcade-count\">3</p></div>";
  arcadeShell(true);
  document.getElementById("arcadeQuit").addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    arcadeStop();
    arcadeMount(arcadePlayer);
  });
  const canvas = document.getElementById("arcadeCanvas");
  canvas.addEventListener("pointerdown", arcadePointer);
  const count = document.getElementById("arcadeCount");
  const words = ["3", "2", "1", "PLAY BALL"];
  let step = 0;
  const beat = () => {
    if (arcadeLive !== S) return;
    count.textContent = words[step];
    arcadeTone(440 + step * 90, 0.12, "sine", 0.16);
    step += 1;
    if (step < words.length) {
      setTimeout(beat, 700);
      return;
    }
    setTimeout(() => {
      if (arcadeLive !== S) return;
      count.remove();
      const start = performance.now();
      S.phase = "play";
      S.started = start;
      S.ends = start + S.roundMs;
      S.now = start;
      S.frame = start;
      if (game.id === "heater") S.speedScale = 2;
      arcadeLoop(S);
    }, 700);
  };
  beat();
}

function arcadeShowResults(S, main, guest, bag, streak) {
  const hub = document.getElementById("arcadeHub");
  if (!hub) return;
  arcadeView = "results";
  const heat = arcadeHeatHTML(S);
  const base = bag.settings.baseline;
  hub.innerHTML = "<p class=\"arcade-kicker\">RESULTS · " + arcadeEsc(S.game.name) + "</p><h2>" + main.grade + "</h2>" +
    "<p class=\"arcade-score\">" + main.row.score + "</p>" +
    (main.best ? "<p class=\"arcade-best\">New personal best</p>" : "") +
    (guest ? "<p class=\"arcade-note\">Guest " + guest.row.score + " · grade " + guest.grade + "</p>" : "") +
    "<div class=\"arcade-stats\"><div><b>" + Math.round(main.acc * 100) + "%</b><span>Accuracy</span></div><div><b>" + main.avg + "</b><span>Avg ms</span></div><div><b>" + main.fastest + "</b><span>Fastest</span></div><div><b>" + main.row.highest + "</b><span>Top level</span></div><div><b>" + main.row.bestCombo + "</b><span>Best streak</span></div><div><b>" + main.vision + "</b><span>Vision</span></div></div>" +
    heat +
    "<p class=\"arcade-note\">Vision Score is accuracy and how high the round climbed. It does not move your overall." +
    (base ? " Device baseline " + base + " ms. Scores are the raw tap, so a slow phone is visible instead of hidden." : "") +
    (streak ? " Day streak " + streak + "." : "") + "</p>" +
    "<div class=\"arcade-actions\"><button type=\"button\" class=\"btn btn-red\" id=\"arcadeAgain\">Play again</button><button type=\"button\" class=\"btn btn-ghost\" id=\"arcadeHome\">Home</button></div>";
  document.getElementById("arcadeAgain").addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    arcadeUnlock();
    arcadeStart(S.game, { level: S.startLevel, daily: S.daily, seed: S.daily ? arcadeSeed("arcade-daily-" + arcadeToday()) : 0, h2h: S.h2h, warmup: S.warmup });
  });
  document.getElementById("arcadeHome").addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    arcadeShell(false);
    arcadeMount(arcadePlayer);
  });
}

function arcadeHeatHTML(S) {
  if (!S.zoneTimes || !Object.keys(S.zoneTimes).length || !S.zone) return "";
  const n = S.zone.n;
  let cells = "";
  for (let i = 0; i < n * n; i++) {
    const list = S.zoneTimes[i] || [];
    const avg = list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0;
    cells += "<i>" + (avg ? avg : "·") + "</i>";
  }
  return "<p class=\"arcade-kicker\">ZONE HEAT · AVG MS</p><div class=\"arcade-heat\" style=\"grid-template-columns:repeat(" + n + ",1fr)\">" + cells + "</div>";
}

function arcadeShowProgress() {
  const hub = document.getElementById("arcadeHub");
  const bag = arcadeBag(arcadePlayer);
  const rounds = bag.rounds || [];
  const month = arcadeToday().slice(0, 7);
  const monthRows = rounds.filter((r) => String(r.date || "").slice(0, 7) === month && r.avg);
  let trend = "Play a few rounds and the month starts to show.";
  if (monthRows.length >= 2) {
    const first = monthRows[0].avg;
    const last = monthRows[monthRows.length - 1].avg;
    if (last < first) trend = "Your average reaction dropped from " + first + " ms to " + last + " ms this month.";
    else trend = "Average reaction this month moved from " + first + " ms to " + last + " ms.";
  }
  const lines = ARCADE_GAMES.map((game) => {
    const mine = rounds.filter((r) => r.game === game.id);
    const best = bag.best[game.id] || 0;
    const high = mine.reduce((m, r) => Math.max(m, r.highest || 0), 0);
    const last = mine.length ? mine[mine.length - 1] : null;
    return "<li><b>" + arcadeEsc(game.name) + "</b><span>Best " + (best || "—") + " · level " + (high || "—") + (last ? " · last vision " + last.vision : "") + "</span></li>";
  }).join("");
  const bars = monthRows.slice(-8).map((r) => "<i title=\"" + r.avg + " ms\" style=\"height:" + Math.max(8, Math.min(80, 4000 / Math.max(80, r.avg))) + "px\"></i>").join("");
  hub.innerHTML = "<p class=\"arcade-kicker\">PROGRESS</p><h2>Your eyes</h2><p class=\"arcade-lead\">" + arcadeEsc(trend) + "</p><div class=\"arcade-bars\">" + (bars || "<span>No month yet.</span>") + "</div><ul class=\"arcade-progress\">" + lines + "</ul><div class=\"arcade-actions\"><button type=\"button\" class=\"btn btn-ghost\" id=\"arcadeHome\">Home</button></div>";
  document.getElementById("arcadeHome").addEventListener("pointerdown", (ev) => { ev.preventDefault(); arcadeMount(arcadePlayer); });
}

function arcadeCalibrate() {
  const hub = document.getElementById("arcadeHub");
  const samples = [];
  let trial = 0;
  let armed = 0;
  hub.innerHTML = "<p class=\"arcade-kicker\">CALIBRATION</p><h2>Tap the flash</h2><p class=\"arcade-lead\" id=\"arcadeCalText\">Ten flashes. Tap as soon as the screen lights. This is your device, not a score.</p><div id=\"arcadeCalPad\" class=\"arcade-cal\">Wait</div><div class=\"arcade-actions\"><button type=\"button\" class=\"btn btn-ghost\" id=\"arcadeHome\">Cancel</button></div>";
  const pad = document.getElementById("arcadeCalPad");
  const text = document.getElementById("arcadeCalText");
  const queue = () => {
    if (trial >= 10) {
      const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
      const bag = arcadeBag(arcadePlayer);
      bag.settings.baseline = avg;
      arcadePersist(arcadePlayer, bag);
      text.textContent = "Baseline " + avg + " ms across " + samples.length + " taps. Scores stay raw so this number stays honest.";
      pad.textContent = avg + " ms";
      pad.classList.remove("is-hot");
      return;
    }
    pad.classList.remove("is-hot");
    pad.textContent = trial + 1 + " / 10";
    armed = 0;
    const wait = 600 + Math.random() * 1100;
    setTimeout(() => {
      if (!pad.isConnected) return;
      armed = performance.now();
      pad.classList.add("is-hot");
      pad.textContent = "TAP";
    }, wait);
  };
  pad.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    arcadeUnlock();
    if (!armed) return;
    samples.push(performance.now() - armed);
    armed = 0;
    trial += 1;
    pad.classList.remove("is-hot");
    queue();
  });
  document.getElementById("arcadeHome").addEventListener("pointerdown", (ev) => { ev.preventDefault(); arcadeMount(arcadePlayer); });
  queue();
}

function arcadeTipsHTML() {
  return "<h3>Quick Eyes</h3><ul class=\"arcade-tips\">" + ARCADE_TIPS.map((tip) => "<li>" + arcadeEsc(tip) + "</li>").join("") + "</ul>";
}

function arcadeTrophyHTML(player) {
  const bag = arcadeBag(player);
  return ARCADE_BADGES.map((badge) => {
    const on = bag.badges && bag.badges[badge.id];
    return "<div class=\"trophy-card" + (on ? "" : " locked-ach") + "\" tabindex=\"0\"><b>" + badge.icon + " " + arcadeEsc(badge.name) + (on ? "" : " · Locked") + "</b><p>" + arcadeEsc(badge.tip) + "</p><span class=\"award-tip\" role=\"tooltip\">" + arcadeEsc(badge.tip) + "</span></div>";
  }).join("");
}

function arcadeOpen(player) {
  if (document.body) document.body.dataset.app = "eyes";
  if (typeof roadSyncTabs === "function") roadSyncTabs();
  const hub = document.getElementById("arcadeHub");
  if (hub) hub.hidden = false;
  arcadeMount(player || arcadePlayer);
  if (hub && hub.scrollIntoView) hub.scrollIntoView({ block: "start" });
}

Object.defineProperty(globalThis, "arcadeLive", {
  configurable: true,
  get() { return arcadeLive; },
});
globalThis.arcadeOpen = arcadeOpen;
globalThis.arcadeStop = arcadeStop;
globalThis.arcadeMount = arcadeMount;
globalThis.arcadeTipsHTML = arcadeTipsHTML;
globalThis.arcadeTrophyHTML = arcadeTrophyHTML;
globalThis.arcadeFormula = arcadeFormula;
globalThis.arcadeVision = arcadeVision;
globalThis.arcadeGrade = arcadeGrade;
globalThis.ARCADE_GAMES = ARCADE_GAMES;
