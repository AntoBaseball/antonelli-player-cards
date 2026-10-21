/* Data access for ROAD TO 99.
   Today this is localStorage + IndexedDB on a static page.
   A hosted backend replaces this file: same function names, accounts instead of the signed-in switcher.
   Multi-user actions (rival alerts to both players, accept/decline across phones, shared team bars)
   are stored on the signed-in browser until that backend exists. */
const ROAD_SESSION_KEY = "antonelli-road-session-v1";
const ROAD_INBOX_KEY = "antonelli-road-inbox-v1";
const ROAD_VIDEO_DB = "antonelli-road-videos";
const ROAD_VIDEO_MAX = 1200000;

function roadDefaultSession() {
  return { mode: "player", playerId: "sample-jack-morales", mute: true };
}

const DataLayer = {
  backend: "local",

  session() {
    try {
      const raw = localStorage.getItem(ROAD_SESSION_KEY);
      if (raw) return Object.assign(roadDefaultSession(), JSON.parse(raw));
    } catch (e) { /* private mode */ }
    return roadDefaultSession();
  },

  saveSession(next) {
    const session = Object.assign(roadDefaultSession(), next || {});
    try { localStorage.setItem(ROAD_SESSION_KEY, JSON.stringify(session)); } catch (e) { /* ignore */ }
    return session;
  },

  /* The roster still lives in app.js `players` + antonelli-player-cards-v2. */
  players() {
    return (typeof players !== "undefined" && Array.isArray(players)) ? players : [];
  },

  player(id) {
    return this.players().find((p) => p.id === id) || null;
  },

  saveRoster() {
    if (typeof savePlayers === "function") savePlayers();
  },

  inbox() {
    try {
      const raw = localStorage.getItem(ROAD_INBOX_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  },

  saveInbox(list) {
    try { localStorage.setItem(ROAD_INBOX_KEY, JSON.stringify(list.slice(-80))); } catch (e) { /* ignore */ }
  },

  /* One notification of a kind per player per calendar day, so the bell stays meaningful. */
  notify(playerId, kind, text) {
    if (!playerId || !text) return null;
    const day = (typeof todayStamp === "function") ? todayStamp() : new Date().toISOString().slice(0, 10);
    const list = this.inbox();
    const dup = list.some((n) => n.playerId === playerId && n.kind === kind && n.day === day);
    if (dup) return null;
    const note = { id: "n-" + Date.now().toString(36) + Math.floor(Math.random() * 1000), playerId, kind, text, day, at: new Date().toISOString(), read: false };
    list.push(note);
    this.saveInbox(list);
    return note;
  },

  unread(playerId) {
    return this.inbox().filter((n) => n.playerId === playerId && !n.read);
  },

  markRead(playerId) {
    const list = this.inbox().map((n) => n.playerId === playerId ? Object.assign({}, n, { read: true }) : n);
    this.saveInbox(list);
  },

  facility() {
    try {
      const raw = localStorage.getItem("antonelli-road-facility-v1");
      const data = raw ? JSON.parse(raw) : null;
      if (data && typeof data === "object") return data;
    } catch (e) { /* private mode */ }
    return { challenges: [], reactions: {}, claims: {}, kings: {} };
  },

  saveFacility(data) {
    try { localStorage.setItem("antonelli-road-facility-v1", JSON.stringify(data)); } catch (e) { /* ignore */ }
    return data;
  },

  videoDb() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") { reject(new Error("no IndexedDB")); return; }
      const req = indexedDB.open(ROAD_VIDEO_DB, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore("videos"); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  saveVideo(playerId, file) {
    if (!file) return Promise.reject(new Error("No file"));
    if (file.size > ROAD_VIDEO_MAX) return Promise.reject(new Error("Keep highlight clips under 1.2 MB, or paste a YouTube, Instagram, or Hudl link."));
    const id = playerId + "-" + Date.now().toString(36);
    return this.videoDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction("videos", "readwrite");
      tx.objectStore("videos").put({ id, playerId, name: file.name, type: file.type, blob: file }, id);
      tx.oncomplete = () => resolve({ id, name: file.name, kind: "file" });
      tx.onerror = () => reject(tx.error);
    }));
  },

  videoUrl(id) {
    return this.videoDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction("videos", "readonly");
      const req = tx.objectStore("videos").get(id);
      req.onsuccess = () => {
        const row = req.result;
        if (!row || !row.blob) { resolve(""); return; }
        resolve(URL.createObjectURL(row.blob));
      };
      req.onerror = () => reject(req.error);
    }));
  },
};

globalThis.DataLayer = DataLayer;
