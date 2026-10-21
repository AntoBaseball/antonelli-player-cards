/* ROAD TO 99 phase 3 — cosmetics, share, and the phone games.
   Nothing in this file changes overall. */

var STYLE_SKINS = [
  { id: "classic", name: "Classic", xp: 0 },
  { id: "spring", name: "Spring Training", xp: 400 },
  { id: "opening", name: "Opening Day", xp: 800 },
  { id: "summer", name: "Summer Baseball", xp: 1200 },
  { id: "halloween", name: "Halloween", xp: 1600 },
  { id: "allstar", name: "All-Star", xp: 2000 },
  { id: "winter", name: "Winter Training", xp: 2400 },
  { id: "thanksgiving", name: "Thanksgiving", xp: 2800 },
  { id: "boston", name: "Boston Edition", xp: 3200 },
  { id: "newengland", name: "New England Edition", xp: 3600 },
  { id: "playoff", name: "Playoff Edition", xp: 5000 },
  { id: "christmas", name: "Christmas", xp: 7000 },
  { id: "worldseries", name: "World Series", xp: 10000 },
];

var STYLE_CELEBRATIONS = [
  { id: "fire", name: "Fire", xp: 0, glyph: "🔥" },
  { id: "pump", name: "Fist pump", xp: 500, glyph: "✊" },
  { id: "confetti", name: "Confetti", xp: 800, glyph: "🎉" },
  { id: "flip", name: "Bat flip", xp: 1500, glyph: "🦇" },
  { id: "crown", name: "Crown", xp: 2000, glyph: "👑" },
  { id: "ice", name: "Ice", xp: 3000, glyph: "🥶" },
  { id: "eagle", name: "Eagle", xp: 4500, glyph: "🦅" },
  { id: "lights", name: "Stadium lights", xp: 6000, glyph: "💡" },
];

var STYLE_AUTO = [
  { id: "standard", name: "Standard", level: 1 },
  { id: "gold", name: "Gold", level: 8 },
  { id: "holo", name: "Holographic", level: 17 },
  { id: "animated", name: "Animated", level: 25 },
];

var STYLE_PHRASES = [
  { text: "Evidence over excuses.", level: 1 },
  { text: "Stack the days.", level: 5 },
  { text: "Next rep.", level: 8 },
  { text: "Earn the card.", level: 12 },
  { text: "Stay through it.", level: 17 },
  { text: "Road to 99.", level: 25 },
];

var STYLE_TALK = [
  "Just dropped a new exit velo. Catch me if you can.",
  "The card moved. Your turn.",
  "I stacked another day. The streak is still mine.",
  "That personal best has your name on the chase list.",
  "See you at the next test. Bring your best rep.",
];

function styleXp(player) {
  return (player && player.road && player.road.xp) || 0;
}

function styleLevel(player) {
  return typeof roadLevel === "function" ? roadLevel(player).level : 1;
}

function styleCardClass(player) {
  const id = player && player.road && player.road.skin;
  return id && id !== "classic" ? "skin-" + id : "";
}

function stylePlayerUrl(player) {
  const base = (typeof location !== "undefined" && location.href) ? location.href.split("#")[0] : "";
  return base + "#player=" + (player && player.id || "");
}

function styleBackExtra(player) {
  if (!player) return "";
  const url = stylePlayerUrl(player);
  return "<section class=\"pb-block\"><h4>Progress</h4><div class=\"pb-grid\"><div class=\"pb-row\"><span>Link</span><b><a href=\"" + (typeof esc === "function" ? esc(url) : url) + "\">Full page</a></b></div></div><canvas class=\"style-qr\" width=\"84\" height=\"84\" data-qr=\"" + (typeof esc === "function" ? esc(url) : url) + "\"></canvas></section>";
}

function styleDrawQrs(root) {
  const scope = root && root.querySelectorAll ? root : document;
  if (typeof qrcode !== "function") return;
  scope.querySelectorAll("canvas.style-qr").forEach((canvas) => {
    const text = canvas.getAttribute("data-qr") || "";
    if (!text) return;
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const cell = 4;
    const margin = cell * 4;
    const size = n * cell + margin * 2;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#111";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect(margin + c * cell, margin + r * cell, cell, cell);
      }
    }
  });
}

function styleShareCanvas(player, w, h, headline) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#070707");
  g.addColorStop(1, "#1a1208");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = Math.max(8, Math.round(w / 80));
  ctx.strokeRect(36, 36, w - 72, h - 72);
  ctx.fillStyle = "#f2d060";
  ctx.font = "italic " + Math.round(w / 14) + "px Impact, sans-serif";
  ctx.fillText("ROAD TO 99", 72, Math.round(h * 0.16));
  ctx.fillStyle = "#fff";
  ctx.font = "italic " + Math.round(w / 16) + "px Impact, sans-serif";
  ctx.fillText(String(player.name || "").toUpperCase(), 72, Math.round(h * 0.34));
  const overall = typeof gradesFor === "function" ? gradesFor(player).overall : "";
  ctx.font = "italic " + Math.round(w / 6) + "px Impact, sans-serif";
  ctx.fillText(String(overall), 72, Math.round(h * 0.55));
  ctx.font = Math.round(w / 28) + "px sans-serif";
  ctx.fillStyle = "#f2d060";
  const lvl = typeof roadLevel === "function" ? roadLevel(player) : { level: 1 };
  ctx.fillText("OVR " + overall + "   LVL " + lvl.level, 72, Math.round(h * 0.63));
  if (headline) {
    ctx.fillStyle = "#fff";
    wrapText(ctx, headline, 72, Math.round(h * 0.72), w - 144, Math.round(w / 22));
  }
  ctx.fillStyle = "#f2d060";
  ctx.font = Math.round(w / 32) + "px sans-serif";
  ctx.fillText("ANTONELLI BASEBALL", 72, h - 80);
  return canvas;
}

function wrapText(ctx, text, x, y, max, line) {
  const words = String(text).split(" ");
  let row = "";
  words.forEach((word) => {
    const trial = row ? row + " " + word : word;
    if (ctx.measureText(trial).width > max) {
      ctx.fillText(row, x, y);
      y += line;
      row = word;
    } else row = trial;
  });
  if (row) ctx.fillText(row, x, y);
}

function styleDownload(canvas, name, player) {
  const file = new File([styleBlob(canvas)], name, { type: "image/png" });
  const url = canvas.toDataURL("image/png");
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: "ROAD TO 99", text: (player && player.name) || "Antonelli Baseball" }).catch(() => styleAnchor(url, name));
    return;
  }
  if (navigator.share) {
    navigator.share({ title: "ROAD TO 99", text: stylePlayerUrl(player), url: stylePlayerUrl(player) }).catch(() => styleAnchor(url, name));
    return;
  }
  styleAnchor(url, name);
}

function styleBlob(canvas) {
  const parts = canvas.toDataURL("image/png").split(",");
  const bin = atob(parts[1]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: "image/png" });
}

function styleAnchor(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}

function styleTalk(player) {
  const n = (player && player.name || "").length + (competeToday ? competeToday().length : 3);
  return STYLE_TALK[n % STYLE_TALK.length];
}

function styleCombine(player) {
  if (!player || typeof gradesFor !== "function") return "";
  const g = gradesFor(player);
  const rows = (g.hitterSubs || g.subs || []).filter((s) => s.grade != null).slice().sort((a, b) => b.grade - a.grade);
  const strengths = rows.slice(0, 2).map((s) => s.label + " " + s.grade).join(", ") || "the tools already on the card";
  const work = rows.slice(-1).map((s) => s.label + " " + s.grade).join("") || "the next test";
  const next = typeof roadNextUpgrade === "function" ? roadNextUpgrade(player) : null;
  const bench = typeof roadBenchmarkLine === "function" ? roadBenchmarkLine(player) : "";
  return "Strengths: " + strengths + ". Area to improve: " + work + ". Top priority: " + ((next && next.text) || "Log the next test.") + " " + bench;
}

function styleGameBoard() {
  const facility = DataLayer.facility();
  const games = facility.games || {};
  return Object.keys(games).map((name) => {
    const top = (games[name] || []).slice().sort((a, b) => b.score - a.score).slice(0, 3);
    return "<p><b>" + name + "</b> " + top.map((row) => row.name + " " + row.score).join(" · ") + "</p>";
  }).join("") || "<p>No scores yet.</p>";
}

function styleRecordScore(game, player, score) {
  const facility = DataLayer.facility();
  if (!facility.games) facility.games = {};
  if (!facility.games[game]) facility.games[game] = [];
  facility.games[game].push({ id: player.id, name: player.name.split(" ")[0], score: score, at: typeof competeToday === "function" ? competeToday() : "" });
  facility.games[game] = facility.games[game].slice(-20);
  DataLayer.saveFacility(facility);
  if (typeof roadAward === "function") roadAward(player, Math.min(20, 8 + score), "minigame");
}

function styleWire(player) {
  const mount = document.querySelector("[data-panel=\"road\"]");
  if (!mount || !player) return;
  styleDrawQrs(document);
  if (mount.querySelector("#styleLab")) return;
  const xp = styleXp(player);
  const level = styleLevel(player);
  const can = typeof roadCanEdit === "function" ? roadCanEdit(player) : false;
  const skins = STYLE_SKINS.map((s) => "<option value=\"" + s.id + "\"" + ((player.road.skin || "classic") === s.id ? " selected" : "") + (xp >= s.xp ? "" : " disabled") + ">" + s.name + (xp >= s.xp ? "" : " · " + s.xp + " XP") + "</option>").join("");
  const celes = STYLE_CELEBRATIONS.map((s) => "<option value=\"" + s.id + "\"" + ((player.road.celebration || "fire") === s.id ? " selected" : "") + (xp >= s.xp ? "" : " disabled") + ">" + s.glyph + " " + s.name + "</option>").join("");
  const phrases = STYLE_PHRASES.map((s) => "<option" + (level >= s.level ? "" : " disabled") + ">" + s.text + (level >= s.level ? "" : " · LVL " + s.level) + "</option>").join("");
  const autos = STYLE_AUTO.map((s) => "<option value=\"" + s.id + "\"" + ((player.road.autographTier || "standard") === s.id ? " selected" : "") + (level >= s.level ? "" : " disabled") + ">" + s.name + (level >= s.level ? "" : " · LVL " + s.level) + "</option>").join("");
  const edit = can ? "" : " disabled";
  mount.insertAdjacentHTML("beforeend", "<div class=\"panel compete-board\" id=\"styleLab\"><h3>Card lab</h3><p>Cosmetics never move overall.</p>" +
    "<label>Skin <select id=\"styleSkin\"" + edit + ">" + skins + "</select></label> " +
    "<label>Celebration <select id=\"styleCele\"" + edit + ">" + celes + "</select></label> " +
    "<label>Phrase <select id=\"stylePhrase\"" + edit + ">" + phrases + "</select></label>" +
    "<h3>Autograph</h3><label>Tier <select id=\"styleAuto\"" + edit + ">" + autos + "</select></label>" +
    "<canvas id=\"styleSign\" width=\"320\" height=\"90\" style=\"background:#fff;border-radius:8px;touch-action:none;width:100%;max-width:320px\"></canvas>" +
    "<div class=\"road-actions\"><button class=\"btn btn-ghost\" type=\"button\" id=\"styleSignClear\"" + edit + ">Clear</button><button class=\"btn btn-red\" type=\"button\" id=\"styleSignSave\"" + edit + ">Save signature</button></div>" +
    "<h3>Share</h3><div class=\"road-actions\">" +
    "<button class=\"btn btn-ghost\" type=\"button\" data-share=\"1080x1920\">Story</button>" +
    "<button class=\"btn btn-ghost\" type=\"button\" data-share=\"1080x1350\">Post</button>" +
    "<button class=\"btn btn-ghost\" type=\"button\" data-share=\"1600x900\">X</button>" +
    "<button class=\"btn btn-ghost\" type=\"button\" data-share=\"1080x1920\" data-name=\"tiktok\">TikTok</button>" +
    "<button class=\"btn btn-red\" type=\"button\" id=\"stylePr\">PR card</button></div>" +
    "<h3>Talk</h3><p id=\"styleTalk\">" + styleTalk(player) + "</p><button class=\"btn btn-ghost\" type=\"button\" id=\"styleTalkBtn\">Another line</button>" +
    "<h3>Combine</h3><p>" + (typeof esc === "function" ? esc(styleCombine(player)) : styleCombine(player)) + "</p>" +
    "<h3>Training pack</h3><button class=\"btn btn-red\" type=\"button\" id=\"stylePack\"" + edit + ">Open a training pack</button>" +
    "<h3>Mini-games</h3><div class=\"road-actions\">" +
    "<button class=\"btn btn-ghost\" type=\"button\" data-game=\"pitch\">Pitch recognition</button>" +
    "<button class=\"btn btn-ghost\" type=\"button\" data-game=\"react\">Reaction</button>" +
    "<button class=\"btn btn-ghost\" type=\"button\" data-game=\"iq\">Baseball IQ</button>" +
    "<button class=\"btn btn-ghost\" type=\"button\" data-game=\"count\">Count leverage</button>" +
    "<button class=\"btn btn-ghost\" type=\"button\" data-game=\"tunnel\">Tunnel</button>" +
    "<button class=\"btn btn-ghost\" type=\"button\" data-game=\"zone\">Zone discipline</button></div>" +
    "<div data-game-host id=\"styleGame\"></div><h3>Game board</h3><div id=\"styleBoard\">" + styleGameBoard() + "</div></div>");
  const skin = document.getElementById("styleSkin");
  if (skin) skin.addEventListener("change", () => { player.road.skin = skin.value; savePlayers(); if (typeof renderRoster === "function") renderRoster(); });
  const cele = document.getElementById("styleCele");
  if (cele) cele.addEventListener("change", () => { player.road.celebration = cele.value; savePlayers(); });
  const phrase = document.getElementById("stylePhrase");
  if (phrase) phrase.addEventListener("change", () => { player.road.signature = phrase.value; savePlayers(); });
  stylePad(player);
  mount.querySelectorAll("[data-share]").forEach((btn) => btn.addEventListener("click", () => {
    const [w, h] = btn.dataset.share.split("x").map(Number);
    const name = (btn.dataset.name || "card") + "-" + w + "x" + h + ".png";
    styleDownload(styleShareCanvas(player, w, h, player.road.signature || ""), name, player);
  }));
  const pr = document.getElementById("stylePr");
  if (pr) pr.addEventListener("click", () => {
    const line = "NEW PR  " + player.name + "  keep stacking. Antonelli Baseball.";
    styleDownload(styleShareCanvas(player, 1080, 1350, line), "pr-card.png", player);
  });
  const talk = document.getElementById("styleTalkBtn");
  if (talk) talk.addEventListener("click", () => {
    const el = document.getElementById("styleTalk");
    const i = STYLE_TALK.indexOf(el.textContent);
    el.textContent = STYLE_TALK[(i + 1) % STYLE_TALK.length];
  });
  const pack = document.getElementById("stylePack");
  if (pack) pack.addEventListener("click", () => styleOpenPack(player));
  mount.querySelectorAll("[data-game]").forEach((btn) => btn.addEventListener("click", () => styleStartGame(player, btn.dataset.game)));
  styleOnView(player);
}

function styleInk(tier) {
  if (tier === "gold") return "#8a6508";
  if (tier === "holo") return "#0369a1";
  if (tier === "animated") return "#9f1239";
  return "#111";
}

function stylePad(player) {
  const canvas = document.getElementById("styleSign");
  if (!canvas || canvas.dataset.wired) return;
  canvas.dataset.wired = "1";
  const ctx = canvas.getContext("2d");
  const ink = () => styleInk((document.getElementById("styleAuto") || {}).value || player.road.autographTier || "standard");
  ctx.strokeStyle = ink();
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  let drawing = false;
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * (canvas.width / r.width), y: (src.clientY - r.top) * (canvas.height / r.height) };
  };
  const down = (e) => { drawing = true; ctx.strokeStyle = ink(); const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); };
  const move = (e) => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); };
  canvas.addEventListener("mousedown", down);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", () => { drawing = false; });
  canvas.addEventListener("touchstart", down, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  const clear = document.getElementById("styleSignClear");
  if (clear) clear.addEventListener("click", () => ctx.clearRect(0, 0, canvas.width, canvas.height));
  const save = document.getElementById("styleSignSave");
  if (save) save.addEventListener("click", () => {
    const tierPick = document.getElementById("styleAuto");
    player.road.autographTier = tierPick ? tierPick.value : "standard";
    player.road.autograph = canvas.toDataURL("image/png");
    savePlayers();
    if (typeof openProfile === "function") openProfile(player.id, { tab: "road" });
  });
}

function styleGlyph(player) {
  const id = player && player.road && player.road.celebration;
  const pick = STYLE_CELEBRATIONS.find((s) => s.id === id);
  return pick ? pick.glyph + " " : "";
}

const STYLE_CELE_KICK = {
  fire: "Fire burst",
  pump: "Fist pump",
  confetti: "Confetti",
  flip: "Bat flip",
  crown: "Crown",
  ice: "Ice",
  eagle: "Eagle",
  lights: "Stadium lights",
};

let styleCeleTimer = 0;

function styleClearCele() {
  if (styleCeleTimer) {
    clearTimeout(styleCeleTimer);
    styleCeleTimer = 0;
  }
  if (typeof document === "undefined") return;
  document.querySelectorAll(".cele-overlay").forEach((node) => node.remove());
}

function styleFx(id) {
  if (id === "flip") return "<div class=\"fx-bat\"><i></i><b></b></div>";
  if (id === "crown") return "<div class=\"fx-crown\"><i></i><i></i><i></i></div>";
  if (id === "ice") return "<div class=\"fx-ice\"><i></i><i></i><i></i></div>";
  if (id === "eagle") return "<div class=\"fx-eagle\"><svg viewBox=\"0 0 64 36\"><path d=\"M32 20 C24 16 12 14 2 18 C14 12 22 14 32 6 C42 14 50 12 62 18 C50 14 40 16 32 20 Z\"/></svg></div>";
  if (id === "lights") return "<div class=\"fx-lights\"><i></i><i></i><i></i></div>";
  if (id === "confetti") return "<div class=\"fx-confetti\"><i></i><i></i><i></i><i></i><i></i><i></i></div>";
  if (id === "pump") return "<div class=\"fx-pump\"><i></i><b></b></div>";
  return "<div class=\"fx-fire\"><i></i><i></i><i></i><i></i><i></i></div>";
}

function styleOnView(player) {
  const viewer = typeof roadSignedIn === "function" ? roadSignedIn() : null;
  if (!viewer || !player || viewer.id === player.id) {
    styleClearCele();
    return;
  }
  stylePlayCele(player);
}

function stylePlayCele(player, opts) {
  if (typeof document === "undefined" || !player) return;
  const pr = !!(opts && opts.pr);
  const viewer = typeof roadSignedIn === "function" ? roadSignedIn() : null;
  if (!pr && viewer && viewer.id === player.id) return;
  styleClearCele();
  const pick = STYLE_CELEBRATIONS.find((s) => s.id === ((player.road && player.road.celebration) || "fire")) || STYLE_CELEBRATIONS[0];
  const el = document.createElement("div");
  el.className = "cele-overlay cele-" + pick.id;
  el.setAttribute("role", "status");
  const safe = typeof esc === "function" ? esc : (value) => String(value || "");
  const kicker = pr ? "Personal best" : (STYLE_CELE_KICK[pick.id] || pick.name);
  el.innerHTML = "<div class=\"cele-fx\" aria-hidden=\"true\">" + styleFx(pick.id) + "</div><div class=\"cele-copy\"><span>" + safe(kicker) + "</span><b>" + safe(player.name || "") + "</b></div>";
  document.body.appendChild(el);
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  styleCeleTimer = setTimeout(() => {
    el.remove();
    styleCeleTimer = 0;
  }, reduced ? 1600 : 2200);
}

function styleOpenPack(player) {
  let box = document.getElementById("packShow");
  if (!box) {
    box = document.createElement("div");
    box.id = "packShow";
    box.className = "pack-show";
    box.hidden = true;
    document.body.appendChild(box);
  }
  box.hidden = false;
  box.classList.remove("is-shake");
  box.innerHTML = "<button class=\"pack-card\" type=\"button\" id=\"packTap\">TAP</button>";
  document.getElementById("packTap").addEventListener("click", () => {
    box.classList.add("is-shake");
    if (typeof roadPing === "function") roadPing("pack");
    setTimeout(() => {
      const skin = STYLE_SKINS.filter((s) => styleXp(player) >= s.xp);
      const won = skin[Math.floor(Math.random() * skin.length)] || STYLE_SKINS[0];
      player.road.skin = won.id;
      if (typeof roadAward === "function") roadAward(player, 20, "minigame");
      savePlayers();
      box.innerHTML = "<div class=\"compete-board\"><h3>" + won.name + "</h3><p>Cosmetic only. Overall did not move.</p><button class=\"btn btn-red\" type=\"button\" id=\"packClose\">Collect</button></div>";
      document.getElementById("packClose").addEventListener("click", () => { box.hidden = true; if (typeof renderRoster === "function") renderRoster(); });
    }, 500);
  });
}

function styleGameHost() {
  const nodes = [...document.querySelectorAll("[data-game-host]")];
  return nodes.find((node) => node.getClientRects().length) || nodes[0] || null;
}

function styleTrainMount() {
  const mount = document.getElementById("trainGames");
  if (!mount || typeof roadSignedIn !== "function") return;
  const player = roadSignedIn();
  if (!player) { mount.innerHTML = ""; return; }
  if (mount.dataset.player === player.id && mount.querySelector("[data-game-host]")) return;
  mount.dataset.player = player.id;
  const games = [
    ["pitch", "Pitch recognition"],
    ["react", "Reaction"],
    ["iq", "Baseball IQ"],
    ["count", "Count leverage"],
    ["tunnel", "Tunnel"],
    ["zone", "Zone discipline"],
  ];
  mount.innerHTML = "<div class=\"road-card game-card\"><p class=\"road-kicker\">GAMES</p><ul class=\"mission-list\">" +
    games.map((row) => "<li class=\"mission-row\"><button class=\"mission-hit\" type=\"button\" data-game=\"" + row[0] + "\"><span class=\"check-circle\" aria-hidden=\"true\"></span><span class=\"mission-copy\"><b>" + row[1] + "</b><small>Play</small></span></button></li>").join("") +
    "</ul><div data-game-host id=\"styleGameTrain\"></div></div>";
  mount.querySelectorAll("[data-game]").forEach((btn) => btn.addEventListener("click", () => styleStartGame(player, btn.dataset.game)));
}

function styleStartGame(player, id) {
  const host = styleGameHost();
  if (!host) return;
  if (id === "pitch") return stylePitch(player, host);
  if (id === "react") return styleReact(player, host);
  if (id === "iq") return styleQuiz(player, host, [
    { q: "Runner on first, no outs. Ground ball to short. Where is the play?", a: ["First", "Second", "Home"], ok: 1 },
    { q: "A foul tip that stays in the catcher's mitt on strike three is...", a: ["A foul", "An out", "A ball"], ok: 1 },
    { q: "Cutoff on a base hit to right with a runner on first is usually...", a: ["Pitcher", "First baseman", "Shortstop"], ok: 1 },
  ], "iq");
  if (id === "count") return styleQuiz(player, host, [
    { q: "3-1, runner on second. What is the job?", a: ["Expand and hunt a pitch to drive", "Protect at all costs", "Bunt"], ok: 0 },
    { q: "0-2 with two strikes coming. The swing should...", a: ["Get shorter", "Get longer", "Leave the box"], ok: 0 },
    { q: "Full count, two outs, first and third. A ball in the dirt...", a: ["Runner on third can go", "Nobody runs", "The hitter is out"], ok: 0 },
  ], "count");
  if (id === "tunnel") return styleQuiz(player, host, [
    { q: "Two pitches start on the same line. One dives late. That is...", a: ["A tunnel", "A balk", "A foul"], ok: 0 },
    { q: "The one that finishes out of the zone after looking the same is...", a: ["The chase pitch", "A strike", "A hit by pitch"], ok: 0 },
  ], "tunnel");
  if (id === "zone") return styleZone(player, host);
}

function styleQuiz(player, host, cards, name) {
  let i = 0;
  let score = 0;
  const draw = () => {
    const card = cards[i];
    host.innerHTML = "<p class=\"game-q\">" + card.q + "</p>" + card.a.map((ans, idx) => "<button class=\"btn btn-ghost\" type=\"button\" data-a=\"" + idx + "\">" + ans + "</button> ").join("");
    host.querySelectorAll("[data-a]").forEach((btn) => btn.addEventListener("click", () => {
      if (Number(btn.dataset.a) === card.ok) score += 1;
      i += 1;
      if (i >= cards.length) {
        host.innerHTML = "<p>Score " + score + " / " + cards.length + "</p>";
        styleRecordScore(name, player, score);
        const board = document.getElementById("styleBoard"); if (board) board.innerHTML = styleGameBoard();
        return;
      }
      draw();
    }));
  };
  draw();
}

function stylePitch(player, host) {
  const kinds = [
    { name: "Fastball", color: "#fff" },
    { name: "Curveball", color: "#38bdf8" },
    { name: "Changeup", color: "#f2d060" },
  ];
  let left = 4;
  let score = 0;
  const round = () => {
    if (left === 0) {
      host.innerHTML = "<p>Score " + score + " / 4</p>";
      styleRecordScore("pitch", player, score);
      const board = document.getElementById("styleBoard"); if (board) board.innerHTML = styleGameBoard();
      return;
    }
    const pick = kinds[Math.floor(Math.random() * kinds.length)];
    host.innerHTML = "<div class=\"game-pitch\"><i style=\"background:" + pick.color + "\"></i></div>" + kinds.map((k) => "<button class=\"btn btn-ghost\" type=\"button\" data-k=\"" + k.name + "\">" + k.name + "</button> ").join("");
    host.querySelectorAll("[data-k]").forEach((btn) => btn.addEventListener("click", () => {
      if (btn.dataset.k === pick.name) score += 1;
      left -= 1;
      round();
    }));
  };
  round();
}

function styleReact(player, host) {
  host.innerHTML = "<p>Wait for the ball.</p><div class=\"game-pitch\" id=\"reactBox\"></div>";
  const wait = 600 + Math.random() * 1200;
  const start = performance.now() + wait;
  setTimeout(() => {
    const box = document.getElementById("reactBox");
    if (!box) return;
    box.innerHTML = "<button class=\"btn btn-red\" type=\"button\" id=\"reactHit\">NOW</button>";
    document.getElementById("reactHit").addEventListener("click", () => {
      const ms = Math.round(performance.now() - start);
      host.innerHTML = "<p>" + ms + " ms</p>";
      styleRecordScore("react", player, Math.max(0, 40 - Math.round(ms / 25)));
      const board = document.getElementById("styleBoard"); if (board) board.innerHTML = styleGameBoard();
    });
  }, wait);
}

function styleZone(player, host) {
  let left = 4;
  let score = 0;
  const round = () => {
    if (!left) {
      host.innerHTML = "<p>Score " + score + " / 4</p>";
      styleRecordScore("zone", player, score);
      const board = document.getElementById("styleBoard"); if (board) board.innerHTML = styleGameBoard();
      return;
    }
    const strike = Math.random() > 0.5;
    host.innerHTML = "<p class=\"game-q\">" + (strike ? "In the zone" : "Off the plate") + "</p><button class=\"btn btn-red\" type=\"button\" data-z=\"swing\">Swing</button> <button class=\"btn btn-ghost\" type=\"button\" data-z=\"take\">Take</button>";
    host.querySelectorAll("[data-z]").forEach((btn) => btn.addEventListener("click", () => {
      const swing = btn.dataset.z === "swing";
      if (swing === strike) score += 1;
      left -= 1;
      round();
    }));
  };
  round();
}

function styleBoot() {
  if (typeof location === "undefined") return;
  const hash = (location.hash || "").replace("#player=", "");
  if (hash && typeof openProfile === "function" && typeof players !== "undefined" && players.some((p) => p.id === hash)) {
    setTimeout(() => openProfile(hash, { tab: "road" }), 400);
  }
}

globalThis.styleGlyph = styleGlyph;
globalThis.styleOnView = styleOnView;
globalThis.stylePlayCele = stylePlayCele;
globalThis.styleClearCele = styleClearCele;
globalThis.styleCardClass = styleCardClass;
globalThis.styleBackExtra = styleBackExtra;
globalThis.styleWire = styleWire;
globalThis.styleDrawQrs = styleDrawQrs;
globalThis.styleBoot = styleBoot;
globalThis.styleTrainMount = styleTrainMount;
