/* Accounts. Empty config keeps the sample roster in this browser.
   The service role key never comes near this file. Invites go through the edge function. */
const AntonelliAuth = {
  client: null,
  role: "anon",
  user: null,
  playerId: null,
  mode: "signin",
  saveTimer: 0,
  holdingSample: false,

  configured() {
    const cfg = globalThis.ANTONELLI_CONFIG || {};
    return !!(String(cfg.SUPABASE_URL || "").trim() && String(cfg.SUPABASE_ANON_KEY || "").trim());
  },

  boot() {
    this.wire();
    this.lockSession();
    if (!this.configured()) {
      const join = new URLSearchParams(location.search).get("join");
      if (join) this.showJoinMessage("Accounts aren't connected yet. This browser is still using the sample roster.");
      return;
    }
    this.loadSdk().then(() => this.startCloud()).catch((err) => {
      this.setStatus(err.message || "Accounts could not start. The sample roster is still on this browser.");
    });
  },

  loadSdk() {
    if (globalThis.supabase && globalThis.supabase.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load the account library."));
      document.head.appendChild(script);
    });
  },

  async startCloud() {
    const cfg = globalThis.ANTONELLI_CONFIG;
    this.client = globalThis.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    this.client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        this.user = session && session.user;
        this.open("recovery");
        return;
      }
      if (event === "SIGNED_OUT") {
        this.user = null;
        this.role = "anon";
        this.playerId = null;
        this.refreshRoster().catch(() => {});
      }
    });
    const { data } = await this.client.auth.getSession();
    if (data.session) await this.afterSignIn(data.session, false);
    else {
      this.role = "anon";
      await this.refreshRoster();
    }
    this.lockSession();
    const join = new URLSearchParams(location.search).get("join");
    if (join) await this.loadJoin(join);
  },

  wire() {
    const open = () => {
      if (this.user) this.signOut();
      else this.open("signin");
    };
    const signBtn = document.getElementById("signInBtn");
    const sheetBtn = document.getElementById("signInSheetBtn");
    if (signBtn) signBtn.addEventListener("click", open);
    if (sheetBtn) sheetBtn.addEventListener("click", open);
    const close = document.getElementById("signClose");
    if (close) close.addEventListener("click", () => this.close());
    const forgot = document.getElementById("signForgot");
    if (forgot) forgot.addEventListener("click", () => this.open(this.mode === "forgot" ? "signin" : "forgot"));
    const form = document.getElementById("signInForm");
    if (form) form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.submit();
    });
    const one = document.getElementById("inviteOne");
    if (one) one.addEventListener("submit", (event) => {
      event.preventDefault();
      this.inviteOne();
    });
    const csv = document.getElementById("inviteCsv");
    if (csv) csv.addEventListener("change", () => this.inviteCsv(csv));
    const upload = document.getElementById("uploadLocalRoster");
    if (upload) upload.addEventListener("click", () => this.uploadLocal());
    const linksBtn = document.getElementById("showJoinLinks");
    if (linksBtn) linksBtn.addEventListener("click", () => this.loadJoinLinks());
    const linksClose = document.getElementById("joinLinksClose");
    if (linksClose) linksClose.addEventListener("click", () => this.closeLinks());
    const linksCsv = document.getElementById("joinLinksCsv");
    if (linksCsv) linksCsv.addEventListener("click", () => this.downloadLinks());
    const linksScreen = document.getElementById("joinLinks");
    if (linksScreen) linksScreen.addEventListener("click", (event) => {
      if (event.target === linksScreen) this.closeLinks();
    });
    const joinForm = document.getElementById("joinForm");
    if (joinForm) joinForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.submitJoin();
    });
    const joinClose = document.getElementById("joinClose");
    if (joinClose) joinClose.addEventListener("click", () => this.closeJoin());
    const joinScreen = document.getElementById("joinScreen");
    if (joinScreen) joinScreen.addEventListener("click", (event) => {
      if (event.target === joinScreen) this.closeJoin();
    });
    const screen = document.getElementById("signInScreen");
    if (screen) screen.addEventListener("click", (event) => {
      if (event.target === screen) this.close();
    });
  },

  open(mode) {
    this.mode = mode || "signin";
    const screen = document.getElementById("signInScreen");
    const title = document.getElementById("signTitle");
    const lead = document.getElementById("signLead");
    const password = document.getElementById("signPasswordLabel");
    const submit = document.getElementById("signSubmit");
    const forgot = document.getElementById("signForgot");
    if (title) {
      title.textContent = this.mode === "forgot" ? "RESET PASSWORD" : (this.mode === "recovery" ? "NEW PASSWORD" : "SIGN IN");
    }
    if (lead) {
      lead.textContent = this.mode === "forgot"
        ? "We'll email a link to set a new password."
        : (this.mode === "recovery"
          ? "Choose a new password for this account."
          : "Players open their own page. For 12U and younger, use a parent's email.");
    }
    if (password) password.hidden = this.mode === "forgot";
    const input = document.getElementById("signPassword");
    if (input) input.required = this.mode !== "forgot";
    if (submit) submit.textContent = this.mode === "forgot" ? "Send reset email" : (this.mode === "recovery" ? "Save password" : "Sign in");
    if (forgot) forgot.hidden = this.mode === "recovery";
    if (forgot && this.mode !== "recovery") forgot.textContent = this.mode === "forgot" ? "Back to sign in" : "Forgot password";
    this.setStatus("");
    if (screen) screen.hidden = false;
  },

  close() {
    const screen = document.getElementById("signInScreen");
    if (screen) screen.hidden = true;
  },

  setStatus(text) {
    const node = document.getElementById("signStatus");
    if (node) node.textContent = text || "";
  },

  setAccountStatus(text) {
    const node = document.getElementById("accountStatus");
    if (node) node.textContent = text || "";
  },

  async submit() {
    const email = (document.getElementById("signEmail").value || "").trim();
    const password = document.getElementById("signPassword").value || "";
    if (!this.configured()) {
      this.setStatus("Accounts aren't connected yet. This browser is still using the sample roster.");
      return;
    }
    if (!this.client) {
      this.setStatus("Accounts are still starting. Try again in a moment.");
      return;
    }
    this.setStatus("Working…");
    if (this.mode === "forgot") {
      const redirectTo = location.origin + location.pathname;
      const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo });
      this.setStatus(error ? error.message : "Reset email sent. Open the link on this device.");
      return;
    }
    if (this.mode === "recovery") {
      const { error } = await this.client.auth.updateUser({ password });
      this.setStatus(error ? error.message : "Password saved.");
      if (!error) this.close();
      return;
    }
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) {
      this.setStatus(error.message);
      return;
    }
    await this.afterSignIn(data.session, true);
  },

  async signOut() {
    if (this.client) await this.client.auth.signOut();
    this.user = null;
    this.role = "anon";
    this.playerId = null;
    const session = globalThis.DataLayer.session();
    session.mode = "player";
    globalThis.DataLayer.saveSession(session);
    this.lockSession();
    if (this.configured()) await this.refreshRoster();
  },

  async afterSignIn(session, fromForm) {
    if (!session || !this.client) return;
    this.user = session.user;
    const { data: profile } = await this.client.from("profiles").select("role, player_id").eq("id", session.user.id).maybeSingle();
    this.role = profile && profile.role === "coach" ? "coach" : "player";
    this.playerId = profile && profile.player_id ? profile.player_id : null;
    const local = globalThis.DataLayer.session();
    local.mode = this.role === "coach" ? "coach" : "player";
    if (this.playerId) local.playerId = this.playerId;
    globalThis.DataLayer.saveSession(local);
    await this.refreshRoster();
    this.lockSession();
    if (fromForm) this.close();
    if (this.role === "player") {
      if (!this.playerId) this.setStatus("This login is not linked to a card yet.");
      if (typeof roadSetApp === "function") roadSetApp("home");
      else window.scrollTo(0, 0);
    }
  },

  lockSession() {
    const on = this.configured();
    document.body.dataset.accounts = on ? "on" : "off";
    document.body.dataset.auth = on ? (this.user ? this.role : "anon") : "demo";
    const label = this.user ? "Sign out" : "Sign in";
    ["signInBtn", "signInSheetBtn"].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.textContent = label;
    });
    const mode = document.getElementById("roadMode");
    const sel = document.getElementById("roadPlayer");
    if (on && this.role === "player") {
      if (mode) { mode.value = "player"; mode.disabled = true; }
      if (sel && this.playerId) { sel.value = this.playerId; sel.disabled = true; }
    } else if (on && this.role === "coach") {
      if (mode) { mode.value = "coach"; mode.disabled = true; }
      if (sel) sel.disabled = false;
    } else if (mode || sel) {
      if (mode) mode.disabled = false;
      if (sel) sel.disabled = false;
    }
    const coachBox = document.getElementById("coachAccounts");
    if (coachBox) coachBox.hidden = this.role !== "coach";
  },

  async refreshRoster() {
    if (!this.client) return;
    const { data: pubs, error } = await this.client.from("players").select("*").order("name");
    if (error) throw error;
    let privs = [];
    if (this.user) {
      const res = await this.client.from("player_private").select("*");
      if (!res.error && Array.isArray(res.data)) privs = res.data;
    }
    const rows = pubs || [];
    if (!rows.length) {
      this.holdSampleRoster();
      if (globalThis.Social) Social.stop();
      return;
    }
    this.holdingSample = false;
    const banner = document.getElementById("sampleBanner");
    if (banner) banner.hidden = true;
    const byId = new Map(privs.map((row) => [row.player_id, row]));
    const next = rows.map((pub) => this.hydrate(pub, byId.get(pub.id) || null));
    if (typeof players !== "undefined" && Array.isArray(players)) {
      players.splice(0, players.length, ...next);
    }
    if (typeof renderRoster === "function") renderRoster();
    if (globalThis.Social) {
      if (this.user) await Social.start();
      else Social.stop();
    }
  },

  /* An empty shared roster would blank the public site. Keep the invented
     cards on screen until a coach uploads, and do not write them up on an edit. */
  holdSampleRoster() {
    this.holdingSample = true;
    const banner = document.getElementById("sampleBanner");
    const span = banner && banner.querySelector("span");
    if (span) span.innerHTML = "<strong>SAMPLE DATA</strong> · The shared roster is empty, so these invented cards stay here until a coach uploads them.";
    if (banner) banner.hidden = false;
    if (typeof renderRoster === "function") renderRoster();
  },

  hydrate(pub, priv) {
    const card = pub.public_card || {};
    const base = {
      id: pub.id,
      name: pub.name || "Player",
      team: pub.team || "",
      age: pub.age == null ? 12 : pub.age,
      ageGroup: pub.age_group || "",
      classYear: pub.class_year || "",
      position: pub.position || "",
      secondaryPosition: pub.secondary_position || "",
      bats: pub.bats || "R",
      throws: pub.throws || "R",
      type: pub.player_type || "hitter",
      archetype: pub.archetype || "",
      height: pub.height || "",
      weight: pub.weight || "",
      hometown: pub.hometown || "",
      photo: pub.photo || "",
      coachQuirks: Array.isArray(card.quirks) ? card.quirks : [],
      metrics: {},
      history: {},
      readingLog: {},
      road: null,
    };
    if (!priv) {
      base.metricsHidden = true;
      base.publicGrades = {
        overall: card.overall != null ? card.overall : pub.overall,
        subs: card.subs || pub.subgrades || [],
        tier: card.tier || pub.tier || "bronze",
      };
      return base;
    }
    const doc = priv.document && typeof priv.document === "object" ? priv.document : {};
    const player = Object.assign({}, base, doc);
    player.id = pub.id;
    player.name = pub.name || player.name;
    player.team = pub.team || player.team;
    player.metrics = priv.metrics && Object.keys(priv.metrics).length ? priv.metrics : (player.metrics || {});
    player.readingLog = priv.reading_log && Object.keys(priv.reading_log).length ? priv.reading_log : (player.readingLog || {});
    player.history = priv.history && Object.keys(priv.history).length ? priv.history : (player.history || {});
    player.road = priv.road && Object.keys(priv.road).length ? priv.road : (player.road || null);
    player.metricsHidden = false;
    player.publicGrades = null;
    return player;
  },

  publicRow(player) {
    const graded = typeof gradesFor === "function" ? gradesFor(player) : { overall: 20, subs: [] };
    const tier = typeof tierFor === "function" ? tierFor(graded.overall, player) : { key: "bronze" };
    return {
      id: player.id,
      name: player.name || "Player",
      team: player.team || "",
      age: player.age == null ? null : Number(player.age),
      age_group: player.ageGroup || "",
      position: player.position || "",
      secondary_position: player.secondaryPosition || "",
      bats: player.bats || "",
      throws: player.throws || "",
      player_type: player.type || "hitter",
      archetype: player.archetype || "",
      height: player.height || "",
      weight: player.weight || "",
      hometown: player.hometown || "",
      class_year: player.classYear || "",
      photo: player.photo || "",
      overall: graded.overall,
      tier: tier.key,
      subgrades: graded.subs || [],
      public_card: {
        overall: graded.overall,
        tier: tier.key,
        subs: graded.subs || [],
        quirks: Array.isArray(player.coachQuirks) ? player.coachQuirks : [],
      },
    };
  },

  privateRow(player) {
    return {
      player_id: player.id,
      metrics: player.metrics || {},
      reading_log: player.readingLog || {},
      history: player.history || {},
      road: player.road || {},
      document: player,
    };
  },

  onRosterSaved() {
    if (!this.client || !this.user || this.holdingSample) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      const list = typeof players !== "undefined" ? players : [];
      const mine = this.role === "coach" ? list : list.filter((player) => player.id === this.playerId);
      this.push(mine, this.role === "coach").catch((err) => this.setAccountStatus(err.message || "Could not save to the shared roster."));
    }, 700);
  },

  async push(list, includePublic) {
    if (!this.client || !list.length) return;
    if (includePublic) {
      const { error } = await this.client.from("players").upsert(list.map((player) => this.publicRow(player)), { onConflict: "id" });
      if (error) throw error;
    }
    const { error } = await this.client.from("player_private").upsert(list.map((player) => this.privateRow(player)), { onConflict: "player_id" });
    if (error) throw error;
  },

  async invite(rows) {
    if (!this.client || this.role !== "coach") {
      this.setAccountStatus("Sign in as a coach first.");
      return;
    }
    this.setAccountStatus("Sending invites…");
    const { data, error } = await this.client.functions.invoke("invite-players", {
      body: { players: rows, redirectTo: location.origin + location.pathname },
    });
    if (error) {
      this.setAccountStatus(error.message || "Invite failed.");
      return;
    }
    const results = (data && data.results) || [];
    const sent = results.filter((row) => row.invited).length;
    const failed = results.filter((row) => !row.invited).map((row) => row.error).filter(Boolean);
    this.setAccountStatus("Invited " + sent + " of " + results.length + "." + (failed.length ? " " + failed[0] : ""));
    await this.refreshRoster();
  },

  inviteOne() {
    const row = {
      name: document.getElementById("inviteName").value.trim(),
      team: document.getElementById("inviteTeam").value.trim(),
      ageGroup: document.getElementById("inviteAge").value.trim(),
      position: document.getElementById("invitePosition").value.trim(),
      email: document.getElementById("inviteEmail").value.trim(),
    };
    if (!row.name || !row.email) {
      this.setAccountStatus("Name and email are required.");
      return;
    }
    this.saveAccounts([row]).then((ok) => {
      if (ok) {
        ["inviteName", "inviteTeam", "inviteAge", "invitePosition", "inviteEmail"].forEach((id) => {
          const field = document.getElementById(id);
          if (field) field.value = "";
        });
      }
    });
  },

  inviteCsv(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = this.parseCsv(String(reader.result || ""));
      input.value = "";
      if (!rows.length) {
        this.setAccountStatus("No players found. The header row should be name, team, ageGroup, position, email.");
        return;
      }
      this.saveAccounts(rows);
    };
    reader.readAsText(file);
  },

  joinUrl(token) {
    return "https://antobaseball.github.io/antonelli-player-cards/?join=" + encodeURIComponent(token);
  },

  async saveAccounts(rows) {
    if (!this.client || this.role !== "coach") {
      this.setAccountStatus("Sign in as a coach first.");
      return false;
    }
    const list = rows.slice(0, 200);
    this.setAccountStatus("Saving " + list.length + " player" + (list.length === 1 ? "" : "s") + "…");
    let made = 0;
    const problems = [];
    for (const row of list) {
      try {
        await this.saveAccount(row);
        made += 1;
      } catch (err) {
        problems.push((row.name || "Player") + ": " + (err.message || "could not save"));
      }
    }
    this.setAccountStatus("Saved " + made + " of " + list.length + "." + (problems.length ? " " + problems[0] : " Sign-up links are ready."));
    await this.refreshRoster();
    if (made) await this.loadJoinLinks();
    return made > 0;
  },

  async saveAccount(row) {
    const email = String(row.email || "").trim().toLowerCase();
    const name = String(row.name || "").trim();
    if (!name || !email) throw new Error("Name and email are required.");
    const id = String(row.id || "").trim() || ("player-" + crypto.randomUUID());
    const { error: playerError } = await this.client.from("players").upsert({
      id,
      name,
      team: row.team || "",
      age_group: row.ageGroup || "",
      position: row.position || "",
    }, { onConflict: "id" });
    if (playerError) throw playerError;
    const { error: privateError } = await this.client.from("player_private").upsert({ player_id: id }, { onConflict: "player_id" });
    if (privateError) throw privateError;
    const { error: accountError } = await this.client.from("player_accounts").upsert({
      player_id: id,
      email,
      invited_at: new Date().toISOString(),
    }, { onConflict: "player_id" });
    if (accountError) throw accountError;
  },

  async loadJoinLinks() {
    if (!this.client || this.role !== "coach") {
      this.setAccountStatus("Sign in as a coach first.");
      return;
    }
    const accounts = await this.client.from("player_accounts").select("player_id, email, status, join_token");
    if (accounts.error) {
      this.setAccountStatus(accounts.error.message);
      return;
    }
    const pubs = await this.client.from("players").select("id, name, team");
    const byId = new Map((pubs.data || []).map((player) => [player.id, player]));
    const rows = (accounts.data || []).map((account) => {
      const player = byId.get(account.player_id) || {};
      return {
        name: player.name || "Player",
        email: account.email || "",
        team: player.team || "",
        status: account.status === "joined" ? "joined" : "invited",
        link: account.join_token ? this.joinUrl(account.join_token) : "",
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
    this.renderLinks(rows);
  },

  renderLinks(rows) {
    this.linkRows = rows || [];
    const body = document.getElementById("joinLinksBody");
    const screen = document.getElementById("joinLinks");
    if (!body || !screen) return;
    body.replaceChildren();
    if (!this.linkRows.length) {
      const empty = document.createElement("p");
      empty.className = "sign-lead";
      empty.textContent = "No sign-up links yet. Add a player with an email, or import a CSV.";
      body.appendChild(empty);
    }
    this.linkRows.forEach((row) => {
      const item = document.createElement("div");
      item.className = "link-row";
      const who = document.createElement("div");
      const name = document.createElement("b");
      name.textContent = row.name;
      const meta = document.createElement("span");
      meta.textContent = [row.email, row.team, row.status === "joined" ? "Joined" : "Invited"].filter(Boolean).join(" · ");
      who.append(name, meta);
      const code = document.createElement("code");
      code.textContent = row.link || "No link yet";
      const copy = document.createElement("button");
      copy.className = "btn btn-ghost";
      copy.type = "button";
      copy.textContent = "Copy";
      copy.addEventListener("click", () => this.copyLink(row.link, copy));
      item.append(who, copy, code);
      body.appendChild(item);
    });
    screen.hidden = false;
  },

  async copyLink(link, button) {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch (err) {
      const area = document.createElement("textarea");
      area.value = link;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    const previous = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = previous; }, 1200);
  },

  downloadLinks() {
    const rows = this.linkRows || [];
    const escape = (value) => "\"" + String(value || "").replace(/"/g, "\"\"") + "\"";
    const lines = ["name,email,team,link"].concat(rows.map((row) => [row.name, row.email, row.team, row.link].map(escape).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "antonelli-signup-links.csv";
    link.click();
    URL.revokeObjectURL(url);
  },

  closeLinks() {
    const screen = document.getElementById("joinLinks");
    if (screen) screen.hidden = true;
  },

  async loadJoin(token) {
    this.joinToken = token;
    if (!this.client) {
      this.showJoinMessage("Accounts are still starting. Reload this link in a moment.");
      return;
    }
    const { data, error } = await this.client.rpc("lookup_join_token", { token });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row || !row.player_id) {
      this.showJoinMessage("This sign-up link is invalid or has already been used.");
      return;
    }
    let player = { id: row.player_id, name: row.name || "Player", team: "", age: "", classYear: "", bats: "R", throws: "R", position: "", archetype: "", metricsHidden: true, publicGrades: { overall: null, subs: [], tier: "bronze" } };
    const pub = await this.client.from("players").select("*").eq("id", row.player_id).maybeSingle();
    if (pub.data) player = this.hydrate(pub.data, null);
    player.name = row.name || player.name;
    this.showJoinForm({ name: player.name, email: row.email || "", player });
  },

  showJoinMessage(text) {
    this.showJoinForm({ name: "", email: "", player: null, locked: true });
    this.setJoinStatus(text);
  },

  showJoinForm(opts) {
    const options = opts || {};
    const screen = document.getElementById("joinScreen");
    const lead = document.getElementById("joinLead");
    const email = document.getElementById("joinEmail");
    const card = document.getElementById("joinCard");
    const locked = !!options.locked;
    if (lead) {
      lead.textContent = options.name
        ? options.name + " — choose a password. For 12U and younger, this is a parent's email."
        : "Choose a password. For 12U and younger, this is a parent's email.";
    }
    if (email) {
      email.value = options.email || "";
      email.readOnly = true;
    }
    if (card) {
      card.replaceChildren();
      if (options.player && typeof cardHTML === "function") {
        card.innerHTML = cardHTML(options.player, false);
      }
    }
    ["joinPasswordLabel", "joinPassword2Label", "joinSubmit"].forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.hidden = locked;
    });
    const emailLabel = email && email.closest("label");
    if (emailLabel) emailLabel.hidden = locked && !options.email;
    this.joinName = options.name || "";
    this.joinEmail = options.email || "";
    this.setJoinStatus("");
    if (screen) screen.hidden = false;
  },

  closeJoin() {
    const screen = document.getElementById("joinScreen");
    if (screen) screen.hidden = true;
  },

  setJoinStatus(text) {
    const node = document.getElementById("joinStatus");
    if (node) node.textContent = text || "";
  },

  async submitJoin() {
    const email = (document.getElementById("joinEmail").value || "").trim();
    const password = document.getElementById("joinPassword").value || "";
    const confirm = document.getElementById("joinPassword2").value || "";
    if (!this.configured() || !this.client) {
      this.setJoinStatus("Accounts aren't connected yet.");
      return;
    }
    if (password.length < 8) {
      this.setJoinStatus("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      this.setJoinStatus("Those passwords don't match.");
      return;
    }
    this.setJoinStatus("Creating your account…");
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { name: this.joinName || "", join_token: this.joinToken || "" } },
    });
    if (error) {
      this.setJoinStatus(error.message || "Could not create the account.");
      return;
    }
    if (!data || !data.session) {
      this.setJoinStatus("Account created, but email confirmation is still on. Open the confirmation email, then sign in. Turn Confirm email off in the Supabase dashboard so this link signs the player in immediately.");
      return;
    }
    const url = new URL(location.href);
    url.searchParams.delete("join");
    history.replaceState({}, "", url.pathname + url.search + url.hash);
    this.closeJoin();
    await this.afterSignIn(data.session, true);
  },

  parseCsv(text) {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((cell) => cell.trim().toLowerCase().replace(/[\s_]+/g, ""));
    const at = (names) => headers.findIndex((header) => names.indexOf(header) !== -1);
    const nameAt = at(["name"]);
    const teamAt = at(["team"]);
    const ageAt = at(["agegroup", "age"]);
    const posAt = at(["position"]);
    const emailAt = at(["email"]);
    if (nameAt < 0) return [];
    return lines.slice(1).map((line) => {
      const cells = line.split(",").map((cell) => cell.trim());
      return {
        name: cells[nameAt] || "",
        team: teamAt >= 0 ? cells[teamAt] || "" : "",
        ageGroup: ageAt >= 0 ? cells[ageAt] || "" : "",
        position: posAt >= 0 ? cells[posAt] || "" : "",
        email: emailAt >= 0 ? cells[emailAt] || "" : "",
      };
    }).filter((row) => row.name).slice(0, 200);
  },

  async uploadLocal() {
    if (!this.client || this.role !== "coach") {
      this.setAccountStatus("Sign in as a coach first.");
      return;
    }
    const list = typeof players !== "undefined" ? players.filter((player) => player && player.id && player.name) : [];
    if (!list.length) {
      this.setAccountStatus("This browser has no roster to upload.");
      return;
    }
    this.setAccountStatus("Uploading " + list.length + " players…");
    try {
      await this.push(list, true);
      this.setAccountStatus("Uploaded " + list.length + " players. Sample cards have no emails, so no invites were sent.");
      await this.refreshRoster();
    } catch (err) {
      this.setAccountStatus(err.message || "Upload failed.");
    }
  },
};

AntonelliAuth.boot();
