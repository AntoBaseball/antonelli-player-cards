/* Shared challenges, reactions, crowns, inbox notes, and highlights.
   Used only while a player or coach is signed in AND the social tables exist.
   Logged-out visitors and the empty-config demo keep store.js localStorage. */
const SOCIAL_KINDS = {
  challenge: 1,
  "challenge-accepted": 1,
  "challenge-declined": 1,
  "challenge-win": 1,
  "challenge-loss": 1,
  reaction: 1,
  "new-king": 1,
  "crown-taken": 1,
};

const SOCIAL_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/ogg"];
const SOCIAL_VIDEO_MAX = 50 * 1024 * 1024;

const Social = {
  live: false,
  channel: null,
  refreshing: false,
  challenges: [],
  reactions: {},
  notes: [],
  koth: [],
  highlights: [],
  snapChallenges: new Map(),
  snapReactions: new Set(),
  timer: 0,
  pendingParts: null,
  orig: null,

  active() {
    const auth = globalThis.AntonelliAuth;
    return !!(auth && auth.configured() && auth.user && auth.client && !auth.holdingSample);
  },

  install() {
    if (this.installed) return;
    const layer = globalThis.DataLayer;
    if (!layer) return;
    this.installed = true;
    this.orig = {
      facility: layer.facility.bind(layer),
      saveFacility: layer.saveFacility.bind(layer),
      inbox: layer.inbox.bind(layer),
      notify: layer.notify.bind(layer),
      markRead: layer.markRead.bind(layer),
    };
    const social = this;
    layer.facility = function () { return social.facility(); };
    layer.saveFacility = function (data) { return social.saveFacility(data); };
    layer.inbox = function () { return social.inbox(); };
    layer.notify = function (playerId, kind, text) { return social.notify(playerId, kind, text); };
    layer.markRead = function (playerId) { return social.markRead(playerId); };
  },

  facility() {
    if (!this.live) return this.orig.facility();
    const local = this.orig.facility();
    return {
      challenges: this.challenges,
      reactions: this.reactions,
      claims: local.claims || {},
      kings: {},
      seeded: true,
      h2hSeed: true,
      crownDays: { cloud: true },
    };
  },

  saveFacility(data) {
    if (!this.live) return this.orig.saveFacility(data);
    const local = this.orig.facility();
    local.claims = (data && data.claims) || local.claims || {};
    this.orig.saveFacility(local);
    if (!this.refreshing) {
      this.pushChallenges(data && data.challenges);
      this.pushReactions(data && data.reactions);
    }
    return data;
  },

  inbox() {
    const local = this.orig.inbox();
    if (!this.live) return local;
    const personal = local.filter((note) => !SOCIAL_KINDS[note.kind]);
    const cloud = (this.notes || []).map((note) => ({
      id: "cloud-" + note.id,
      playerId: note.recipient_id,
      kind: note.kind,
      text: this.noteText(note),
      day: String(note.created_at || "").slice(0, 10),
      at: note.created_at,
      read: !!note.read_at,
    }));
    return personal.concat(cloud);
  },

  notify(playerId, kind, text) {
    if (this.live && SOCIAL_KINDS[kind]) return null;
    return this.orig.notify(playerId, kind, text);
  },

  markRead(playerId) {
    this.orig.markRead(playerId);
    if (!this.live || !playerId) return;
    const pending = (this.notes || []).filter((note) => note.recipient_id === playerId && !note.read_at);
    if (!pending.length || !globalThis.AntonelliAuth || !AntonelliAuth.client) return;
    const now = new Date().toISOString();
    pending.forEach((note) => { note.read_at = now; });
    AntonelliAuth.client.from("notifications").update({ read_at: now }).is("read_at", null).eq("recipient_id", playerId).then(() => {});
  },

  noteText(note) {
    const payload = note && note.payload;
    if (payload && payload.text) return payload.text;
    return (note && note.kind) || "Update";
  },

  async start() {
    this.install();
    if (!this.active()) {
      this.stop();
      return;
    }
    const client = AntonelliAuth.client;
    const probe = await client.from("challenges").select("id").limit(1);
    if (probe.error) {
      this.live = false;
      return;
    }
    this.live = true;
    this.refreshing = true;
    try {
      await client.rpc("settle_due_challenges");
      await client.rpc("refresh_koth");
      await this.pullAll();
    } catch (e) { /* a missing function still leaves the tables readable */ }
    this.refreshing = false;
    this.listen();
    this.repaint();
  },

  stop() {
    const was = this.live;
    this.live = false;
    if (this.channel && globalThis.AntonelliAuth && AntonelliAuth.client) {
      AntonelliAuth.client.removeChannel(this.channel);
    }
    this.channel = null;
    if (was) this.repaint();
  },

  listen() {
    const client = globalThis.AntonelliAuth && AntonelliAuth.client;
    if (!client || this.channel) return;
    this.channel = client.channel("social-facility")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => this.schedule("notes"))
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges" }, () => this.schedule("challenges"))
      .subscribe();
  },

  schedule(part) {
    this.pendingParts = this.pendingParts || {};
    this.pendingParts[part] = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 300);
  },

  async flush() {
    if (!this.live) return;
    const parts = this.pendingParts || {};
    this.pendingParts = {};
    this.refreshing = true;
    try {
      if (parts.challenges) await this.pullChallenges();
      if (parts.notes) await this.pullNotes();
      if (parts.reactions) await this.pullReactions();
      if (parts.koth) await this.pullKoth();
      if (parts.highlights) await this.pullHighlights();
    } finally {
      this.refreshing = false;
    }
    this.repaint();
  },

  async pullAll() {
    await Promise.all([
      this.pullChallenges(),
      this.pullReactions(),
      this.pullKoth(),
      this.pullNotes(),
      this.pullHighlights(),
    ]);
  },

  async pullChallenges() {
    const { data, error } = await AntonelliAuth.client.from("challenges").select("*").order("created_at");
    if (error) return;
    this.challenges = (data || []).map((row) => ({
      id: row.id,
      from: row.from_player,
      to: row.to_player,
      metric: row.category,
      deadline: row.ends_on,
      status: row.status,
      at: String(row.created_at || "").slice(0, 10),
      winner: row.winner_id || "",
    }));
    this.snapChallenges = new Map(this.challenges.map((row) => [row.id, Object.assign({}, row)]));
  },

  async pullReactions() {
    const { data, error } = await AntonelliAuth.client.from("reactions").select("*").order("created_at");
    if (error) return;
    const reactions = {};
    const keys = new Set();
    (data || []).forEach((row) => {
      const at = String(row.created_on || "").slice(0, 10);
      if (!reactions[row.target_player]) reactions[row.target_player] = [];
      reactions[row.target_player].push({ from: row.from_player, emoji: row.emoji, at: at });
      keys.add([row.target_player, row.from_player, row.emoji, at].join("|"));
    });
    this.reactions = reactions;
    this.snapReactions = keys;
  },

  async pullKoth() {
    const { data, error } = await AntonelliAuth.client.from("koth_claims").select("*").order("claimed_at");
    if (error) return;
    this.koth = data || [];
  },

  async pullNotes() {
    const { data, error } = await AntonelliAuth.client.from("notifications").select("*").order("created_at");
    if (error) return;
    this.notes = data || [];
  },

  async pullHighlights() {
    const { data, error } = await AntonelliAuth.client.from("highlights").select("*").order("created_at");
    if (error) return;
    const rows = data || [];
    await Promise.all(rows.map(async (row) => {
      if (!row.storage_path) {
        row.href = row.url || "";
        return;
      }
      const signed = await AntonelliAuth.client.storage.from("highlights").createSignedUrl(row.storage_path, 60 * 60);
      row.href = signed.data && signed.data.signedUrl ? signed.data.signedUrl : "";
    }));
    this.highlights = rows;
  },

  pushChallenges(list) {
    const client = AntonelliAuth.client;
    if (!client) return;
    (list || []).forEach((ch) => {
      if (!ch || !ch.id || String(ch.id).indexOf("seed-") === 0) return;
      const prev = this.snapChallenges.get(ch.id);
      if (!prev) {
        if (!ch.to || ch.to === ch.from) {
          this.dropChallenge(ch.id);
          this.fail(new Error("You can't challenge yourself."));
          return;
        }
        if (["batSpeed", "exitVelo", "tenYard", "throwVelo", "broadJump", "vertical", "flying10"].indexOf(ch.metric) < 0) {
          this.dropChallenge(ch.id);
          this.fail(new Error("Pick a category from the list."));
          return;
        }
        this.snapChallenges.set(ch.id, Object.assign({}, ch, { status: "pending" }));
        client.from("challenges").insert({
          id: ch.id,
          from_player: ch.from,
          to_player: ch.to,
          category: ch.metric,
          ends_on: String(ch.deadline || "").slice(0, 10),
          status: "pending",
        }).then(({ error }) => {
          if (error) {
            this.snapChallenges.delete(ch.id);
            this.dropChallenge(ch.id);
            this.fail(error);
            return;
          }
          this.schedule("challenges");
          this.schedule("notes");
        });
        return;
      }
      if (prev.status === ch.status) return;
      if (ch.status !== "accepted" && ch.status !== "declined") return;
      const previous = prev.status;
      prev.status = ch.status;
      client.from("challenges").update({ status: ch.status }).eq("id", ch.id).then(({ error }) => {
        if (error) {
          prev.status = previous;
          const row = this.challenges.find((item) => item.id === ch.id);
          if (row) row.status = previous;
          this.fail(error);
          this.repaint();
        }
        else {
          this.schedule("challenges");
          this.schedule("notes");
        }
      });
    });
  },

  pushReactions(map) {
    const client = AntonelliAuth.client;
    if (!client || !map) return;
    Object.keys(map).forEach((target) => {
      (map[target] || []).forEach((row) => {
        const at = String(row.at || "").slice(0, 10);
        const key = [target, row.from, row.emoji, at].join("|");
        if (this.snapReactions.has(key)) return;
        this.snapReactions.add(key);
        client.from("reactions").insert({
          target_player: target,
          from_player: row.from,
          emoji: row.emoji,
        }).then(({ error }) => {
          if (error) {
            this.snapReactions.delete(key);
            const list = this.reactions[target] || [];
            this.reactions[target] = list.filter((item) => !(item.from === row.from && item.emoji === row.emoji && String(item.at || "").slice(0, 10) === at));
            this.fail(error);
            this.repaint();
            return;
          }
          this.schedule("reactions");
          this.schedule("notes");
        });
      });
    });
  },

  async settle() {
    if (!this.live || !AntonelliAuth.client) return;
    await AntonelliAuth.client.rpc("settle_due_challenges");
    this.schedule("challenges");
    this.schedule("notes");
  },

  sameTeam(a, b) {
    const auth = globalThis.AntonelliAuth;
    if (auth && auth.role === "coach") return true;
    return !!(a && b && a.team && a.team === b.team);
  },

  playerStub(id) {
    const found = globalThis.DataLayer && DataLayer.player(id);
    return found || { id: id, name: "Player" };
  },

  daySpan(start, end) {
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    return Math.max(0, Math.round((b - a) / 86400000));
  },

  latestClaim(key, scope) {
    const want = scope || "";
    let best = null;
    (this.koth || []).forEach((row) => {
      if (row.category !== key || (row.scope || "") !== want) return;
      if (!best || String(row.claimed_at) > String(best.claimed_at)) best = row;
    });
    return best;
  },

  king(key, scope) {
    const row = this.latestClaim(key, scope);
    return row ? this.playerStub(row.holder_id) : null;
  },

  crowns(key, scope) {
    const want = scope || "";
    const rows = (this.koth || []).filter((row) => row.category === key && (row.scope || "") === want)
      .slice()
      .sort((a, b) => String(a.claimed_at).localeCompare(String(b.claimed_at)));
    const totals = {};
    rows.forEach((row, index) => {
      const end = rows[index + 1] ? rows[index + 1].claimed_at : new Date().toISOString();
      totals[row.holder_id] = (totals[row.holder_id] || 0) + this.daySpan(row.claimed_at, end);
    });
    const last = rows.length ? rows[rows.length - 1] : null;
    const board = Object.keys(totals).map((id) => ({ id: id, days: totals[id] })).sort((a, b) => b.days - a.days);
    return {
      king: last ? this.playerStub(last.holder_id) : null,
      board: board,
      days: last ? (totals[last.holder_id] || 0) : 0,
    };
  },

  clips(playerId) {
    return (this.highlights || []).filter((row) => row.player_id === playerId).map((row) => ({
      label: row.caption || "Highlight",
      href: row.href || row.url || "",
    })).filter((row) => row.href);
  },

  async addLink(playerId, url) {
    const client = AntonelliAuth.client;
    const href = String(url || "").trim();
    if (!/^https?:\/\//i.test(href)) throw new Error("Highlight links have to start with http.");
    const caption = href.replace(/^https?:\/\//, "").slice(0, 42);
    const { error } = await client.from("highlights").insert({
      id: "hl-" + Date.now().toString(36),
      player_id: playerId,
      url: href,
      caption: caption,
    });
    if (error) throw error;
    await this.pullHighlights();
  },

  async uploadClip(playerId, file) {
    if (!file) throw new Error("No file");
    const type = file.type || "";
    if (SOCIAL_VIDEO_TYPES.indexOf(type) < 0) throw new Error("Use an MP4, WebM, MOV, or OGG video.");
    if (file.size > SOCIAL_VIDEO_MAX) throw new Error("Highlight clips need to be under 50 MB.");
    const uid = AntonelliAuth.user && AntonelliAuth.user.id;
    if (!uid) throw new Error("Sign in before uploading a highlight.");
    const clean = String(file.name || "clip").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+/, "").slice(-48) || "clip";
    const path = uid + "/" + Date.now().toString(36) + "-" + clean;
    const uploaded = await AntonelliAuth.client.storage.from("highlights").upload(path, file, { contentType: type, upsert: false });
    if (uploaded.error) throw uploaded.error;
    const { error } = await AntonelliAuth.client.from("highlights").insert({
      id: "hl-" + Date.now().toString(36),
      player_id: playerId,
      storage_path: path,
      caption: String(file.name || "Highlight").slice(0, 140),
    });
    if (error) throw error;
    await this.pullHighlights();
  },

  dropChallenge(id) {
    this.challenges = (this.challenges || []).filter((row) => row.id !== id);
    this.repaint();
  },

  explain(error) {
    const raw = String((error && (error.message || error.details)) || "");
    const text = raw.toLowerCase();
    if (!raw) return "That could not be saved.";
    if (text.indexOf("challenge yourself") >= 0 || text.indexOf("challenges_not_self") >= 0) return "You can't challenge yourself.";
    if (text.indexOf("challenges_category") >= 0 || text.indexOf("category") >= 0 && text.indexOf("check") >= 0) return "Pick a category from the list.";
    if (text.indexOf("challenge a teammate") >= 0) return "Challenge a teammate on your team.";
    if (text.indexOf("sent as yourself") >= 0) return "Challenges are sent as yourself.";
    if (text.indexOf("update is not allowed") >= 0) return "That challenge update is not allowed.";
    if (text.indexOf("past its end") >= 0 || text.indexOf("end date") >= 0 && text.indexOf("settle") >= 0) return "That challenge can close after its end date.";
    if (text.indexOf("own card") >= 0 && text.indexOf("react") >= 0 || text.indexOf("reactions_not_self") >= 0) return "You can't react to your own card.";
    if (text.indexOf("reactions_once") >= 0 || text.indexOf("duplicate key") >= 0 && text.indexOf("reaction") >= 0) return "You already left that reaction today.";
    if (text.indexOf("reaction limit") >= 0) return "You've used today's reactions. More tomorrow.";
    if (text.indexOf("react to a teammate") >= 0) return "React to a teammate on your team.";
    if (text.indexOf("posted as yourself") >= 0) return "Reactions are posted as yourself.";
    if (text.indexOf("highlights are posted") >= 0) return "Highlights go on your own card.";
    if (text.indexOf("start with http") >= 0) return "Highlight links have to start with http.";
    if (text.indexOf("own folder") >= 0) return "Upload the clip into your own folder.";
    if (text.indexOf("permission denied") >= 0 || text.indexOf("row-level security") >= 0 || (error && error.code) === "42501") return "You don't have permission to do that.";
    if (text.indexOf("violat") >= 0 || text.indexOf("constraint") >= 0 || (error && (error.code === "23514" || error.code === "23505" || error.code === "P0001"))) {
      if (text.indexOf("check") >= 0 || error.code === "23514" || error.code === "P0001") {
        const sentence = raw.replace(/^.*ERROR:\s*/i, "").replace(/\s+/g, " ").trim();
        if (sentence && sentence.length < 140 && sentence.toLowerCase().indexOf("violat") < 0 && sentence.toLowerCase().indexOf("constraint") < 0) {
          return sentence.charAt(0).toUpperCase() + sentence.slice(1) + (/\.$/.test(sentence) ? "" : ".");
        }
      }
      return "That could not be saved.";
    }
    if (raw.length < 140 && text.indexOf("relation") < 0 && text.indexOf("syntax") < 0) {
      return raw.charAt(0).toUpperCase() + raw.slice(1) + (/\.$/.test(raw) ? "" : ".");
    }
    return "That could not be saved.";
  },

  fail(error) {
    const message = this.explain(error);
    if (typeof alert === "function") alert(message);
  },

  repaint() {
    if (typeof competePaint === "function") competePaint();
    if (typeof roadPaintChrome === "function") roadPaintChrome();
    const box = typeof document !== "undefined" && document.getElementById("inbox");
    if (box && !box.hidden && typeof roadOpenInbox === "function") roadOpenInbox();
  },
};

Social.install();
globalThis.Social = Social;
