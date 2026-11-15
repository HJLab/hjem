// Hjem-dashboard – eget Lovelace-kort i farverne fra hjlab.github.io/elpris-4-doegn
// Indlæses som Lovelace-ressource (type: module). Bygget 12/11-2026.
const ROOMS = [
  { id: "light.stue_stue", name: "Stue", icon: "mdi:sofa" },
  { id: "light.kokken_kokken", name: "Køkken", icon: "mdi:silverware-fork-knife" },
  { id: "light.gang_gang", name: "Gang", icon: "mdi:door" },
  { id: "light.lille_stue_lille_stue", name: "Lille stue", icon: "mdi:sofa-single-outline" },
  { id: "light.terrasse_terrasse", name: "Terrasse", icon: "mdi:flower" },
  { id: "light.carport_carport", name: "Carport", icon: "mdi:car" },
  { id: "light.ude_ude", name: "Ude", icon: "mdi:pine-tree" },
];
const PLUGS = [
  { id: "switch.udestue_socket_1", name: "Udestue", icon: "mdi:greenhouse" },
  { id: "switch.have_lys_i_overdaekket_socket_1", name: "Overdækket", icon: "mdi:string-lights" },
  { id: "switch.braende_ude_switch_1", name: "Brænde ude", icon: "mdi:lightbulb-outline" },
  { id: "switch.braende_inde_switch_1", name: "Brænde inde", icon: "mdi:lightbulb-outline" },
  { id: "switch.no_3_socket_1", name: "Motorcykel", icon: "mdi:motorbike" },
];
const SPEAKERS = [
  { id: "media_player.sonos_stue", name: "Stue" },
  { id: "media_player.sonos_playbase", name: "Playbase (TV)" },
  { id: "media_player.sonos_sovevaerelse", name: "Soveværelse" },
  { id: "media_player.sonos_badevaerelse", name: "Badeværelse" },
];
const TABS = [
  { id: "forside", name: "Forside", icon: "mdi:home-outline" },
  { id: "lys", name: "Lys", icon: "mdi:lightbulb-group-outline" },
  { id: "musik", name: "Musik", icon: "mdi:music" },
  { id: "smart", name: "Smart enheder", icon: "mdi:robot-vacuum" },
];
const WEATHER = {
  "clear-night": "Klart", cloudy: "Overskyet", fog: "Tåge", hail: "Hagl", lightning: "Torden",
  "lightning-rainy": "Torden og regn", partlycloudy: "Delvist skyet", pouring: "Skybrud",
  rainy: "Regn", snowy: "Sne", "snowy-rainy": "Slud", sunny: "Sol", windy: "Blæst",
  "windy-variant": "Blæst", exceptional: "Usædvanligt vejr",
};
const WEATHER_ICON = {
  "clear-night": "mdi:weather-night", cloudy: "mdi:weather-cloudy", fog: "mdi:weather-fog",
  hail: "mdi:weather-hail", lightning: "mdi:weather-lightning", "lightning-rainy": "mdi:weather-lightning-rainy",
  partlycloudy: "mdi:weather-partly-cloudy", pouring: "mdi:weather-pouring", rainy: "mdi:weather-rainy",
  snowy: "mdi:weather-snowy", "snowy-rainy": "mdi:weather-snowy-rainy", sunny: "mdi:weather-sunny",
  windy: "mdi:weather-windy", "windy-variant": "mdi:weather-windy-variant",
};
const C = {
  bg: "#071421", surface: "#0d2135", surface2: "#102a43", line: "#27435d", text: "#f3f7fb",
  muted: "#9db2c5", blue: "#58a6ff", green: "#39d98a", greenBg: "rgba(57,217,138,.16)",
  red: "#ff6b7a", redBg: "rgba(255,107,122,.16)", amber: "#ffc857", amberBg: "rgba(255,200,87,.16)",
};
const fmt = (n, d = 2) => Number(n).toLocaleString("da-DK", { minimumFractionDigits: d, maximumFractionDigits: d });

class HjemDashboardCard extends HTMLElement {
  setConfig(config) { this._config = config || {}; }
  getCardSize() { return 12; }

  connectedCallback() {
    if (!this._timer) this._timer = setInterval(() => this._render(), 30000);
  }
  disconnectedCallback() { clearInterval(this._timer); this._timer = null; }

  set hass(hass) {
    this._hass = hass;
    if (this._dragging) return;
    const key = this._stateKey() + "|" + (this._popup || "") + "|" + this._popupKey();
    if (key !== this._lastKey) { this._lastKey = key; this._render(); }
  }

  _rooms() { return (this._config && this._config.rooms) || ROOMS; }
  _plugs() { return (this._config && this._config.plugs) || PLUGS; }
  _vac() { return (this._config && this._config.vacuum) || "vacuum.roborock_s5_max"; }
  _speakers() { return ((this._config && this._config.speakers) || SPEAKERS).filter((x) => this._st(x.id)); }

  _coord(id) { const g = this._st(id).attributes.group_members || []; return g[0] || id; }

  _sonosKey() {
    return this._speakers().map((x) => { const a = this._st(x.id).attributes;
      return [this._st(x.id).state, a.volume_level, a.media_title, (a.group_members || []).join(",")].join("~"); }).join("|")
      + "|" + JSON.stringify((this._st("sensor.sonos_favorites") || { attributes: {} }).attributes.items || {});
  }

  _sonosHtml() {
    const sp = this._speakers();
    if (!sp.length) return "";
    const TXT = { playing: "Spiller", paused: "På pause", idle: "Stoppet", off: "Slukket", unavailable: "Ikke tilgængelig", buffering: "Henter …" };
    const nameOf = (id) => (sp.find((x) => x.id === id) || { name: (this._st(id) || { attributes: {} }).attributes.friendly_name || id }).name;
    const coords = [...new Set(sp.map((x) => this._coord(x.id)))];
    const main = coords.find((c) => this._st(c) && this._st(c).state === "playing") || coords[0];
    const np = coords.filter((c) => this._st(c)).map((c) => {
      const s = this._st(c); const a = s.attributes;
      const rooms = sp.filter((x) => this._coord(x.id) === c).map((x) => x.name).join(" + ");
      const title = a.media_title || (TXT[s.state] || s.state);
      const sub = [a.media_artist, a.media_playlist && a.media_playlist !== a.media_title ? a.media_playlist : ""].filter(Boolean).join(" · ");
      const playing = s.state === "playing";
      return `<div class="np">
        ${a.entity_picture ? `<img src="${a.entity_picture}" alt="">` : `<div class="noart"><ha-icon icon="mdi:music"></ha-icon></div>`}
        <div class="npi"><small class="rm">${rooms}</small><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</div>
        <div class="npb">
          <button class="ic" data-mp="media_previous_track" data-ent="${c}" aria-label="Forrige"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
          <button class="ic big ${playing ? "on" : ""}" data-mp="media_play_pause" data-ent="${c}" aria-label="${playing ? "Pause" : "Afspil"}"><ha-icon icon="mdi:${playing ? "pause" : "play"}"></ha-icon></button>
          <button class="ic" data-mp="media_next_track" data-ent="${c}" aria-label="Næste"><ha-icon icon="mdi:skip-next"></ha-icon></button>
        </div>
      </div>`;
    }).join("");
    const tiles = sp.map((x) => {
      const s = this._st(x.id); const a = s.attributes;
      const vol = Math.round((a.volume_level || 0) * 100);
      const grouped = (a.group_members || []).length > 1;
      const btn = grouped
        ? `<button class="chip on" data-unjoin="${x.id}">I gruppe · tag ud</button>`
        : main !== x.id ? `<button class="chip" data-join="${x.id}" data-ent="${main}">Spil med ${nameOf(main)}</button>` : "";
      return `<div class="spk ${s.state === "playing" ? "on" : ""}">
        <div class="spkh"><ha-icon icon="mdi:speaker"></ha-icon><span><b>${x.name}</b><small>${TXT[s.state] || s.state} · ${vol} %</small></span></div>
        <input type="range" min="0" max="100" step="1" value="${vol}" data-vol="${x.id}" aria-label="Lydstyrke ${x.name}">
        ${btn}
      </div>`;
    }).join("");
    const fav = Object.entries((this._st("sensor.sonos_favorites") || { attributes: {} }).attributes.items || {});
    const favHtml = fav.length ? `<div class="chips favs">${fav.map(([id, t]) =>
      `<button class="chip" data-fav="${id}" data-ent="${main}">${t}</button>`).join("")}</div>` : "";
    return `<h2>Musik</h2>${np}<div class="chips favs"><button class="act pick" data-action="musik"><ha-icon icon="mdi:magnify"></ha-icon>Vælg musik</button><button class="act pick" data-action="favs"><ha-icon icon="mdi:heart"></ha-icon>Favoritter</button></div>${favHtml}<div class="spks">${tiles}</div>`;
  }

  // Henter danske radiostationer fra Home Assistants radioliste (én gang pr. 12 timer)
  async _loadRadio() {
    if (this._radioBusy || (this._radioAt && Date.now() - this._radioAt < 432e5)) return;
    this._radioBusy = true;
    try {
      const sp = this._speakers()[0];
      const r = await this._hass.callWS({ type: "media_player/browse_media", entity_id: sp.id,
        media_content_type: "app", media_content_id: "media-source://radio_browser/country/DK" });
      const seen = new Set();
      // (AAC)-kanalerne er HLS-strømme (.m3u8), som Sonos ikke kan spille som netradio – de udelades
      this._radio = (r.children || []).filter((x) => x.can_play && !/\(aac\)/i.test(x.title) && !seen.has(x.title.trim().toLowerCase()) && seen.add(x.title.trim().toLowerCase()))
        .map((x) => ({ id: x.media_content_id, t: x.title.trim(), img: x.thumbnail || "" }));
      const pri = (t) => (/^(dr )?p[1-8]\b|^dr |danmarks radio/i.test(t) ? 0 : 1);
      this._radio.sort((a, b) => pri(a.t) - pri(b.t) || a.t.localeCompare(b.t, "da"));
      this._radioAt = Date.now();
      this._lastKey = null;
      this._render();
    } catch (e) { this._radio = this._radio || []; this._radioErr = true; }
    this._radioBusy = false;
  }

  // Egne musikfavoritter gemmes i Home Assistant pr. bruger (samme på telefon og pc)
  async _loadMyFav() {
    if (this._myFavLoaded || this._myFavBusy) return;
    this._myFavBusy = true;
    try {
      const r = await this._hass.callWS({ type: "frontend/get_user_data", key: "hjem_musik_favoritter" });
      this._myFav = (r && Array.isArray(r.value)) ? r.value : [];
    } catch (e) { this._myFav = []; }
    this._myFavLoaded = true; this._myFavBusy = false;
    this._lastKey = null; this._render();
  }

  _toggleMyFav(id, t, img) {
    const f = [...(this._myFav || [])];
    const i = f.findIndex((x) => x.id === id);
    if (i >= 0) f.splice(i, 1); else f.push({ id, t, img });
    this._myFav = f;
    this._hass.callWS({ type: "frontend/set_user_data", key: "hjem_musik_favoritter", value: f }).catch(() => {});
    this._render();
  }

  _musicPopup() {
    const sp = this._speakers();
    if (!sp.length) return "";
    const favMode = this._mMode === "fav";
    if (!favMode) this._loadRadio();
    this._loadMyFav();
    const coords = [...new Set(sp.map((x) => this._coord(x.id)))];
    const label = (c) => sp.filter((x) => this._coord(x.id) === c).map((x) => x.name).join(" + ") || c;
    if (!this._mTarget || !coords.includes(this._mTarget))
      this._mTarget = coords.find((c) => this._st(c) && this._st(c).state === "playing") || coords[0];
    const q = (this._q || "").trim().toLowerCase();
    const hide = (t) => (q && !t.toLowerCase().includes(q) ? ' style="display:none"' : "");
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const fav = Object.entries((this._st("sensor.sonos_favorites") || { attributes: {} }).attributes.items || {});
    const mine = this._myFav || [];
    const isMine = (id) => mine.some((x) => x.id === id);
    const item = (kind, id, t, img) => `<div class="mrow" data-t="${esc(t.toLowerCase())}"${favMode ? "" : hide(t)}>
      <button class="mi" data-play="${esc(id)}" data-kind="${kind}">
      ${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : `<span class="mii"><ha-icon icon="mdi:${kind === "fav" ? "heart" : "radio"}"></ha-icon></span>`}
      <span>${esc(t)}</span><ha-icon class="pl" icon="mdi:play"></ha-icon></button>
      ${kind === "fav" ? "" : `<button class="hrt ${isMine(id) ? "on" : ""}" data-favtoggle="${esc(id)}" data-ft="${esc(t)}" data-fimg="${esc(img)}" aria-label="${isMine(id) ? "Fjern fra favoritter" : "Føj til favoritter"}"><ha-icon icon="mdi:${isMine(id) ? "heart" : "heart-outline"}"></ha-icon></button>`}
    </div>`;
    const mineHtml = mine.length ? `<div class="ml">${mine.map((m) => item("my", m.id, m.t, m.img)).join("")}</div>`
      : `<p class="note">${favMode ? "Ingen favoritter endnu. Åbn Vælg musik og tryk på hjertet ved en radiokanal for at gemme den her." : "Tryk på hjertet ved en kanal nedenfor for at gemme den som favorit."}</p>`;
    return `<div class="ov" data-close="1"><div class="pop mpop" role="dialog" aria-label="${favMode ? "Favoritter" : "Vælg musik"}">
      <div class="ph"><h3>${favMode ? "Favoritter" : "Vælg musik"}</h3><button class="x" data-close="1" aria-label="Luk">✕</button></div>
      <h4 style="margin-top:0">Spil i</h4>
      <div class="chips">${coords.map((c) => `<button class="chip ${c === this._mTarget ? "on" : ""}" data-mtarget="${c}">${label(c)}</button>`).join("")}</div>
      ${favMode ? "" : `<input class="srch" type="search" placeholder="Søg i favoritter og radio …" value="${esc(this._q || "")}" data-search="1" aria-label="Søg">`}
      <h4>Mine favoritter</h4>
      ${mineHtml}
      ${fav.length ? `<h4>Sonos-favoritter</h4><div class="ml">${fav.map(([id, t]) => item("fav", id, t, "")).join("")}</div>`
        : favMode ? "" : `<h4>Sonos-favoritter</h4><p class="note">Ingen endnu. Tryk på hjertet ved en spilleliste, et album eller en station i Sonos-appen – så dukker den op her (også fra YouSee Musik).</p>`}
      ${favMode ? `<div class="chips favs" style="margin-top:16px"><button class="act" data-action="musik"><ha-icon icon="mdi:magnify"></ha-icon>Find flere i Vælg musik</button></div>` : `
      <h4>Radio – danske stationer</h4>
      ${this._radio ? `<div class="ml">${this._radio.map((r) => item("radio", r.id, r.t, r.img)).join("")}</div>
        <p class="note nohit" style="display:none">Intet fundet.</p>`
        : `<p class="note">${this._radioErr ? "Kunne ikke hente radiolisten." : "Henter stationer …"}</p>`}`}
    </div></div>`;
  }

  _filterMusic() {
    const q = (this._q || "").trim().toLowerCase();
    const items = [...this.shadowRoot.querySelectorAll(".mrow")];
    let n = 0;
    items.forEach((el) => { const ok = !q || el.dataset.t.includes(q); el.style.display = ok ? "" : "none"; if (ok) n++; });
    const nh = this.shadowRoot.querySelector(".nohit");
    if (nh) nh.style.display = n ? "none" : "";
  }

  _vacHtml() {
    const id = this._vac();
    const v = this._st(id);
    if (!v) return "";
    const base = id.replace("vacuum.", "sensor.");
    const bat = this._st(base + "_batteri");
    const err = this._st(base + "_vacuum_error");
    const TXT = { docked: "I docken", cleaning: "Støvsuger", returning: "Kører hjem", paused: "På pause",
      idle: "Venter", error: "Fejl", unavailable: "Ikke tilgængelig", unknown: "Ukendt" };
    const st = v.state;
    const busy = st === "cleaning" || st === "returning";
    let sub = TXT[st] || st;
    if (bat && !isNaN(parseFloat(bat.state))) sub += ` · batteri ${Math.round(bat.state)} %`;
    if (st === "error" && err && !["none", "unknown", "unavailable"].includes(err.state)) sub += ` · ${err.state}`;
    this._loadVacPlan();
    const nxt = this._nextPlanned();
    if (nxt && !busy) sub += ` · næste ${this._whenTxt(nxt)}`;
    const col = st === "error" ? C.red : busy ? C.amber : st === "unavailable" ? C.muted : C.green;
    return `<h2>Støvsuger</h2>
    <div class="vac" data-long="vac">
      <div class="vinfo"><ha-icon icon="mdi:robot-vacuum" style="color:${col}"></ha-icon>
        <span><b>${v.attributes.friendly_name || "Støvsuger"}</b><small style="color:${col}">${sub}</small></span></div>
      <div class="vbtns">
        ${st === "cleaning"
          ? `<button class="act" data-vac="pause"><ha-icon icon="mdi:pause"></ha-icon>Pause</button>`
          : `<button class="act" data-vac="start"><ha-icon icon="mdi:play"></ha-icon>${st === "paused" ? "Fortsæt" : "Start"}</button>`}
        <button class="act" data-vac="return_to_base" ${st === "docked" ? "disabled" : ""}><ha-icon icon="mdi:home-import-outline"></ha-icon>Hjem</button>
        <button class="act" data-vac="locate"><ha-icon icon="mdi:map-marker-radius"></ha-icon>Find</button>
      </div>
    </div>`;
  }

  _stateKey() {
    const ids = [...this._rooms().map((r) => r.id), ...this._plugs().map((p) => p.id), "sensor.elpris_total", "sensor.hue_outdoor_motion_sensor_1_temperatur",
      "weather.forecast_hjem", "sensor.naeste_vaekkeur", "input_boolean.feriemodus", "input_boolean.gaestetilstand", "device_tracker.hennings_mobil",
      this._vac(), this._vac().replace("vacuum.", "sensor.") + "_batteri", this._vac().replace("vacuum.", "sensor.") + "_vacuum_error"];
    return ids.map((id) => { const s = this._hass.states[id]; return s ? s.state + (s.attributes.brightness || "") : "-"; }).join("|") + "#" + this._sonosKey();
  }

  _st(id) { return this._hass && this._hass.states[id]; }

  _members(id) {
    const s = this._st(id);
    const m = (s && s.attributes.entity_id) || [];
    return m.filter((e) => e.startsWith("light.") && this._st(e));
  }

  // Henter støvsugerens egne kørselsdata (clean_summary.records) via HA-diagnose og udleder tidsplanen
  async _loadVacPlan() {
    if (this._planBusy || (this._planAt && Date.now() - this._planAt < 1800e3)) return;
    this._planBusy = true;
    try {
      const reg = await this._hass.callWS({ type: "config/entity_registry/get", entity_id: this._vac() });
      const sig = await this._hass.callWS({ type: "auth/sign_path", path: `/api/diagnostics/config_entry/${reg.config_entry_id}` });
      const j = await (await fetch(sig.path)).json();
      const co = Object.values((j.data && j.data.coordinators) || {})[0] || {};
      const recs = ((co.traits && co.traits.clean_summary && co.traits.clean_summary.records) || [])
        .map((s) => new Date(s * 1000)).sort((a, b) => b - a);
      const count = {};
      recs.forEach((d) => { const k = d.getDay() + "|" + d.getHours() + "|" + d.getMinutes(); count[k] = (count[k] || 0) + 1; });
      const slots = Object.entries(count).filter(([, c]) => c >= 3)
        .map(([k]) => k.split("|").map(Number)).sort((a, b) => ((a[0] + 6) % 7) - ((b[0] + 6) % 7) || a[1] - b[1]);
      this._plan = { recs, slots };
      this._planAt = Date.now();
      this._lastKey = null;
      this._render();
    } catch (e) { this._plan = this._plan || { recs: [], slots: [], err: true }; }
    this._planBusy = false;
  }

  _nextPlanned() {
    const p = this._plan;
    if (!p || !p.slots.length) return null;
    const now = new Date();
    let best = null;
    for (const [wd, h, m] of p.slots) {
      const d = new Date(now); d.setHours(h, m, 0, 0);
      d.setDate(d.getDate() + ((wd - d.getDay() + 7) % 7));
      if (d <= now) d.setDate(d.getDate() + 7);
      if (!best || d < best) best = d;
    }
    return best;
  }

  _planTxt() {
    const p = this._plan;
    if (!p || !p.slots.length) return "";
    const DAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
    const byTime = {};
    p.slots.forEach(([wd, h, m]) => { const t = String(h).padStart(2, "0") + "." + String(m).padStart(2, "0"); (byTime[t] = byTime[t] || []).push(DAYS[wd]); });
    return Object.entries(byTime).map(([t, ds]) => (ds.length > 1 ? ds.slice(0, -1).join(", ") + " og " + ds.slice(-1) : ds[0]) + " kl. " + t).join(" · ");
  }

  _whenTxt(d) {
    const now = new Date();
    const tom = new Date(now); tom.setDate(now.getDate() + 1);
    const day = d.toDateString() === now.toDateString() ? "i dag" : d.toDateString() === tom.toDateString() ? "i morgen"
      : d.toLocaleDateString("da-DK", { weekday: "long" });
    return day + " kl. " + d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  }

  _vacIds() {
    const b = this._vac().replace("vacuum.", "");
    return Object.keys(this._hass.states).filter((k) => k.split(".")[1].startsWith(b));
  }

  _vacPopup() {
    const id = this._vac();
    const v = this._st(id);
    if (!v) return "";
    const b = id.replace("vacuum.", "");
    const s = (dom, suf) => this._st(`${dom}.${b}_${suf}`);
    const val = (dom, suf) => { const x = s(dom, suf); return x ? x.state : null; };
    const STATUS = { charging: "Oplader", charging_complete: "Fuldt opladet", idle: "Venter", cleaning: "Støvsuger",
      returning_home: "Kører hjem", docking: "Parkerer i docken", paused: "På pause", error: "Fejl",
      segment_cleaning: "Gør rum rent", zoned_cleaning: "Gør zone rent", spot_cleaning: "Pletrengøring",
      going_to_target: "Kører til mål", starting: "Starter", charger_disconnected: "Ikke i docken",
      charging_problem: "Problem med opladning", updating: "Opdaterer", device_offline: "Offline", mapping: "Kortlægger",
      shutting_down: "Slukker", locked: "Låst", manual_mode: "Manuel styring", remote_control_active: "Fjernstyres" };
    const ERR = { lidar_blocked: "Laser blokeret", bumper_stuck: "Kofanger sidder fast", wheels_suspended: "Hjul i luften",
      cliff_sensor_error: "Faldsensor beskidt", main_brush_jammed: "Hovedbørste sidder fast", side_brush_jammed: "Sidebørste sidder fast",
      wheels_jammed: "Hjul sidder fast", robot_trapped: "Sidder fast", no_dustbin: "Støvbeholder mangler", low_battery: "Lavt batteri",
      charging_error: "Opladningsfejl", robot_tilted: "Står skævt", filter_blocked: "Filter tilstoppet", return_to_dock_fail: "Kunne ikke finde hjem",
      wall_sensor_dirty: "Vægsensor beskidt", robot_on_carpet: "Står på tæppe", cannot_cross_carpet: "Kan ikke krydse tæppe" };
    const FAN = { quiet: "Stille", balanced: "Normal", turbo: "Turbo", max: "Max", gentle: "Blid" };
    const MODE = { vacuum: "Kun støvsug", vac_and_mop: "Støvsug + mop" };
    const MOP = { off: "Fra", low: "Lav", medium: "Middel", high: "Høj" };
    const n = (x, d = 0) => (x == null || isNaN(parseFloat(x)) ? "–" : fmt(parseFloat(x), d));
    const t = (x) => { const d = new Date(x); return isNaN(d) ? "–" : d.toLocaleString("da-DK", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); };
    const chips = (opts, cur, attr, labels) => `<div class="chips">${opts.filter((o) => labels[o]).map((o) =>
      `<button class="chip ${o === cur ? "on" : ""}" ${attr}="${o}">${labels[o]}</button>`).join("")}</div>`;
    const wear = (label, suf, total) => {
      const h = parseFloat(val("sensor", suf));
      if (isNaN(h)) return "";
      const p = Math.max(0, Math.min(100, (h / total) * 100));
      const col = h <= 0 ? C.red : p < 15 ? C.amber : C.green;
      return `<div class="wear"><div class="wl"><span>${label}</span><small style="color:${col}">${h <= 0 ? "Skift nu" : n(h) + " t tilbage"}</small></div>
        <div class="bar"><i style="width:${p}%;background:${col}"></i></div></div>`;
    };
    const kv = (k, x) => `<div class="kv"><span>${k}</span><b>${x}</b></div>`;
    const yes = (suf) => val("binary_sensor", suf) === "on";

    const st = val("sensor", "status");
    const err = val("sensor", "vacuum_error");
    const bat = val("sensor", "batteri");
    const mapSel = s("select", "valgt_kort");
    const mapNo = mapSel ? String(mapSel.state).replace(/\D/g, "") : "";
    const map = this._st(`image.${b}_map_${mapNo}`) || this._st(`image.${b}_map_0`);
    const room = val("sensor", "nuvaerende_rum");
    const dnd = s("switch", "forstyr_ikke");
    const fanList = v.attributes.fan_speed_list || [];
    const modeS = s("select", "rengoringstilstand");
    const mopS = s("select", "moppeintensitet");

    return `<div class="ov" data-close="1"><div class="pop" role="dialog" aria-label="Støvsuger">
      <div class="ph"><h3>${v.attributes.friendly_name || "Støvsuger"}</h3><button class="x" data-close="1" aria-label="Luk">✕</button></div>
      <p class="vstat">${STATUS[st] || STATUS[v.state] || v.state}${bat ? ` · batteri ${n(bat)} %` : ""}${room && !["unknown", "unavailable"].includes(room) ? ` · ${room}` : ""}</p>
      ${err && err !== "none" && !["unknown", "unavailable"].includes(err) ? `<p class="verr">⚠ ${ERR[err] || err}</p>` : ""}
      <h4>Tidsplan</h4>
      ${this._plan && this._plan.slots.length
        ? kv("Kører fast", this._planTxt()) + kv("Næste gang", this._whenTxt(this._nextPlanned()))
        : `<p class="note">${this._plan ? "Ingen fast tidsplan fundet i de seneste kørsler." : "Henter …"}</p>`}
      ${map && map.attributes.entity_picture ? `<img class="map" src="${map.attributes.entity_picture}" alt="Kort">` : ""}
      ${mapSel && mapSel.attributes.options.length > 1 ? `<h4>Kort</h4><div class="chips">${mapSel.attributes.options.map((o) =>
        `<button class="chip ${o === mapSel.state ? "on" : ""}" data-sel="${mapSel.entity_id}" data-opt="${o}">${o.replace("Map", "Kort")}</button>`).join("")}</div>` : ""}
      ${fanList.length ? `<h4>Sugestyrke</h4>${chips(fanList, v.attributes.fan_speed, "data-fan", FAN)}` : ""}
      ${modeS ? `<h4>Tilstand</h4><div class="chips">${modeS.attributes.options.filter((o) => MODE[o]).map((o) =>
        `<button class="chip ${o === modeS.state ? "on" : ""}" data-sel="${modeS.entity_id}" data-opt="${o}">${MODE[o]}</button>`).join("")}</div>` : ""}
      ${mopS ? `<h4>Vandmængde til mop</h4><div class="chips">${mopS.attributes.options.filter((o) => MOP[o]).map((o) =>
        `<button class="chip ${o === mopS.state ? "on" : ""}" data-sel="${mopS.entity_id}" data-opt="${o}">${MOP[o]}</button>`).join("")}</div>` : ""}
      <h4>Seneste rengøring</h4>
      ${kv("Startet", t(val("sensor", "seneste_rengoring_begyndt")))}
      ${kv("Afsluttet", t(val("sensor", "seneste_rengoring_afsluttet")))}
      ${kv("Varighed", n(val("sensor", "rengoringstid")) + " min")}
      ${kv("Areal", n(val("sensor", "rengoringsareal"), 1) + " m²")}
      ${this._plan && this._plan.recs.length ? `<h4>Seneste kørsler</h4><div class="runs">${this._plan.recs.slice(0, 12).map((d) => {
        const fast = this._plan.slots.some(([wd, h, m]) => d.getDay() === wd && d.getHours() === h && d.getMinutes() === m);
        return `<span class="${fast ? "fast" : ""}">${d.toLocaleString("da-DK", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}</span>`;
      }).join("")}</div><p class="note">Gul = efter tidsplanen · hvid = startet manuelt</p>` : ""}
      <h4>Vedligehold</h4>
      ${wear("Hovedbørste", "hovedborste_restlevetid", 300)}
      ${wear("Sidebørste", "sideborste_restlevetid", 200)}
      ${wear("Filter", "filter_restlevetid", 150)}
      ${wear("Sensorer (rengør)", "sensor_resterende_tid", 30)}
      <h4>Tilbehør og indstillinger</h4>
      ${kv("Oplader", yes("oplader") ? "Ja" : "Nej")}
      ${kv("Gør rent lige nu", yes("gor_rent") ? "Ja" : "Nej")}
      ${kv("Sugestyrke", FAN[v.attributes.fan_speed] || v.attributes.fan_speed || "–")}
      ${kv("Vandbeholder", yes("vandbeholder_monteret") ? "Monteret" : "Ikke monteret")}
      ${kv("Moppe", yes("moppe_monteret") ? "Monteret" : "Ikke monteret")}
      ${yes("vandmangel") ? kv("Vand", `<span style="color:${C.red}">Mangler vand</span>`) : ""}
      ${dnd ? `<div class="kv"><span>Forstyr ikke ${val("time", "do_not_disturb_begin") ? `(${val("time", "do_not_disturb_begin").slice(0, 5)}–${(val("time", "do_not_disturb_end") || "").slice(0, 5)})` : ""}</span>
        <button class="sw ${dnd.state === "on" ? "on" : ""}" data-sw="${dnd.entity_id}" aria-label="Forstyr ikke"></button></div>` : ""}
      ${s("number", "lydstyrke") ? `<div class="kv"><span>Lydstyrke</span><b>${n(val("number", "lydstyrke"))} %</b></div>
        <input class="vol" type="range" min="0" max="100" step="5" value="${n(val("number", "lydstyrke"))}" data-num="number.${b}_lydstyrke" aria-label="Lydstyrke">` : ""}
      <h4>I alt</h4>
      ${kv("Rengøringer", n(val("sensor", "samlet_antal_rengoringer")))}
      ${kv("Tid", n(val("sensor", "samlet_rengoringstid")) + " timer")}
      ${kv("Areal", n(val("sensor", "samlet_rengoringsareal")) + " m²")}
    </div></div>`;
  }

  _popupKey() {
    if (!this._popup) return "";
    if (this._popup === "music") return "music|" + (this._mMode || "") + "|" + (this._mTarget || "") + "|" + (this._radio ? this._radio.length : "-") + "|" + (this._myFav ? this._myFav.length : "-");
    if (this._popup === "vac") return this._vacIds().map((id) => this._st(id).state + (this._st(id).attributes.fan_speed || "")).join(",");
    return [this._popup, ...this._members(this._popup)].map((id) => {
      const s = this._st(id); return s ? s.state + (s.attributes.brightness || "") : "-";
    }).join(",");
  }

  _pct(s) { return s && s.state === "on" && s.attributes.brightness ? Math.round(s.attributes.brightness / 2.55) : 0; }

  _lightRow(id, name, big) {
    const s = this._st(id);
    if (!s) return "";
    const on = s.state === "on";
    const pct = this._pct(s);
    const dim = (s.attributes.supported_color_modes || []).some((m) => m !== "onoff");
    return `<div class="lrow ${big ? "big" : ""}">
      <button class="sw ${on ? "on" : ""}" data-toggle="${id}" aria-label="Tænd/sluk ${name}"></button>
      <div class="lname"><b>${name}</b><small>${on ? (dim ? pct + " %" : "Tændt") : s.state === "unavailable" ? "Ikke tilgængelig" : "Slukket"}</small></div>
      ${dim ? `<input type="range" min="1" max="100" step="1" value="${on ? pct : 1}" data-dim="${id}" aria-label="Lysstyrke ${name}">` : ""}
    </div>`;
  }

  _popupHtml() {
    if (!this._popup) return "";
    if (this._popup === "vac") return this._vacPopup();
    if (this._popup === "music") return this._musicPopup();
    const r = this._rooms().find((x) => x.id === this._popup) || { name: "", id: this._popup };
    const members = this._members(this._popup);
    const rows = members.map((id) => {
      const full = (this._st(id).attributes.friendly_name || id).trim();
      const rest = full.replace(new RegExp("^" + r.name + "\\s+", "i"), "");
      const n = /^\d+$/.test(rest) ? full : rest;
      return { id, n: n.charAt(0).toUpperCase() + n.slice(1) };
    }).sort((a, b) => a.n.localeCompare(b.n, "da", { numeric: true }))
      .map((x) => this._lightRow(x.id, x.n)).join("");
    return `<div class="ov" data-close="1"><div class="pop" role="dialog" aria-label="${r.name}">
      <div class="ph"><h3>${r.name}</h3><button class="x" data-close="1" aria-label="Luk">✕</button></div>
      ${this._lightRow(this._popup, "Hele rummet", true)}
      ${rows ? `<h2 style="margin:18px 0 8px">Lamper</h2>${rows}` : ""}
    </div></div>`;
  }

  _isEvening(d) { const h = d.getHours(); return h >= 18 || h < 3; }

  // Første hverdag efter aftenuret, på det faste morgen-klokkeslæt
  _nextWeekday(after, hm) {
    const d = new Date(after);
    d.setHours(hm[0], hm[1], 0, 0);
    do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
    return d;
  }

  // Find det faste hverdags-vækkeur ud fra de sidste 10 dages historik (første morgen-alarm pr. hverdag)
  async _loadMorning() {
    if (this._morningBusy || (this._morningAt && Date.now() - this._morningAt < 3600e3)) return;
    this._morningBusy = true;
    try {
      const start = new Date(Date.now() - 10 * 864e5).toISOString();
      const r = await this._hass.callWS({ type: "history/history_during_period", start_time: start,
        entity_ids: ["sensor.naeste_vaekkeur"], minimal_response: true, no_attributes: true });
      const first = {};
      for (const x of r["sensor.naeste_vaekkeur"] || []) {
        const d = new Date(x.s);
        if (isNaN(d) || this._isEvening(d) || d.getHours() > 10 || d.getDay() === 0 || d.getDay() === 6) continue;
        const k = d.toDateString();
        if (!first[k] || d < first[k]) first[k] = d;
      }
      const count = {};
      Object.values(first).forEach((d) => { const k = d.getHours() + ":" + d.getMinutes(); count[k] = (count[k] || 0) + 1; });
      const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
      this._morning = best ? best[0].split(":").map(Number) : null;
      this._morningAt = Date.now();
      this._render();
    } catch (e) { /* prøv igen ved næste opdatering */ }
    this._morningBusy = false;
  }

  _priceLevel(p) {
    if (p == null || isNaN(p)) return { col: C.muted, bg: C.surface, line: C.line, txt: "Ukendt" };
    if (p < 2) return { col: C.green, bg: C.greenBg, line: C.green, txt: "Billig" };
    if (p < 4) return { col: C.amber, bg: C.amberBg, line: C.amber, txt: "Normal" };
    return { col: C.red, bg: C.redBg, line: C.red, txt: "Dyr" };
  }

  _render() {
    if (!this._hass) return;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      const sr = this.shadowRoot;
      sr.addEventListener("click", (e) => this._click(e));
      sr.addEventListener("contextmenu", (e) => { if (e.target.closest(".room,.vac")) e.preventDefault(); });
      sr.addEventListener("pointerdown", (e) => {
        const room = e.target.closest(".room:not(.plug),[data-long]");
        if (!room) return;
        this._longFired = false;
        clearTimeout(this._lp);
        this._lp = setTimeout(() => { this._longFired = true; this._popup = room.dataset.long || room.dataset.toggle; this._render(); }, 600);
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => sr.addEventListener(ev, () => clearTimeout(this._lp)));
      sr.addEventListener("input", (e) => { if (e.target.dataset.search) { this._q = e.target.value; this._filterMusic(); } });
      sr.addEventListener("input", (e) => { if (e.target.dataset.dim || e.target.dataset.num || e.target.dataset.vol) this._dragging = true; });
      sr.addEventListener("change", (e) => {
        if (e.target.dataset.vol) {
          this._dragging = false;
          return this._hass.callService("media_player", "volume_set", { entity_id: e.target.dataset.vol, volume_level: Number(e.target.value) / 100 });
        }
        if (e.target.dataset.num) {
          this._dragging = false;
          return this._hass.callService("number", "set_value", { entity_id: e.target.dataset.num, value: Number(e.target.value) });
        }
        const id = e.target.dataset.dim;
        if (!id) return;
        this._dragging = false;
        this._hass.callService("light", "turn_on", { entity_id: id, brightness_pct: Number(e.target.value) });
      });
    }
    const now = new Date();
    const hour = now.getHours();
    const greet = hour < 5 ? "Godnat" : hour < 10 ? "Godmorgen" : hour < 17 ? "Goddag" : "Godaften";
    const name = (this._hass.user && this._hass.user.name) || "";
    const dato = now.toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" });
    const tid = now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });

    const home = this._st("device_tracker.hennings_mobil");
    const isHome = home && home.state === "home";

    const priceS = this._st("sensor.elpris_total");
    const price = priceS ? parseFloat(priceS.state) : NaN;
    const lvl = this._priceLevel(price);
    const peak = hour >= 17 && hour < 21;

    const tempS = this._st("sensor.hue_outdoor_motion_sensor_1_temperatur");
    const temp = tempS ? parseFloat(tempS.state) : NaN;
    const w = this._st("weather.forecast_hjem");
    const wState = w ? w.state : "";

    const vk = this._st("sensor.naeste_vaekkeur");
    let vkTxt = "Intet sat", vkSub = "Morgenlys starter ved vækkeuret";
    const dayName = (d) => {
      const tom = new Date(now); tom.setDate(now.getDate() + 1);
      return d.toDateString() === now.toDateString() ? "I dag"
        : d.toDateString() === tom.toDateString() ? "I morgen"
        : d.toLocaleDateString("da-DK", { weekday: "long" });
    };
    if (vk && !["unknown", "unavailable", ""].includes(vk.state)) {
      let d = new Date(vk.state);
      if (!isNaN(d) && (this._isEvening(d) || d.getDay() === 0 || d.getDay() === 6)) {
        // Aftenure (fx 22:00 nattilstand) og weekend-ure (fx 05:50) ignoreres – vis det faste hverdags-vækkeur i stedet
        this._loadMorning();
        d = this._morning ? this._nextWeekday(d, this._morning) : null;
      }
      if (d && !isNaN(d)) {
        vkTxt = d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
        vkSub = `${dayName(d)}<span class="long"> · morgenlys 40 % → 50 %</span>`;
      } else if (d === null) {
        vkTxt = "–"; vkSub = this._morningAt ? "Intet hverdags-vækkeur fundet" : "Henter …";
      }
    }

    const ferie = this._st("input_boolean.feriemodus");
    const ferieOn = ferie && ferie.state === "on";
    const gaest = this._st("input_boolean.gaestetilstand");
    const gaestOn = gaest && gaest.state === "on";

    const rooms = this._rooms().map((r) => {
      const s = this._st(r.id);
      if (!s) return "";
      const on = s.state === "on";
      const pct = on && s.attributes.brightness ? Math.round(s.attributes.brightness / 2.55) + " %" : on ? "Tændt" : "Slukket";
      let sub = s.state === "unavailable" ? "Ikke tilgængelig" : pct;
      if (r.id === "light.terrasse_terrasse" && !on && peak && price > 2) sub = "Slukket · elpris over 2 kr.";
      return `<button class="room ${on ? "on" : ""}" data-toggle="${r.id}" aria-pressed="${on}">
        <ha-icon icon="${r.icon}"></ha-icon>
        <span><b>${r.name}</b><small>${sub}</small></span>
      </button>`;
    }).join("");

    const plugs = this._plugs().map((p) => {
      const s = this._st(p.id);
      if (!s) return "";
      const on = s.state === "on";
      const off = ["unavailable", "unknown"].includes(s.state);
      return `<button class="room plug ${on ? "on" : ""}" data-sw="${p.id}" aria-pressed="${on}" ${off ? "disabled" : ""}>
        <ha-icon icon="${p.icon}"></ha-icon>
        <span><b>${p.name}</b><small>${off ? "Ikke på Wi-Fi" : on ? "Tændt" : "Slukket"}</small></span>
      </button>`;
    }).join("");

    if (!this._tab) { try { this._tab = localStorage.getItem("hjem-tab") || "forside"; } catch (e) { this._tab = "forside"; } }
    const tab = TABS.some((x) => x.id === this._tab) ? this._tab : "forside";
    const lysOn = [...this._rooms(), ...this._plugs()].filter((r) => this._st(r.id) && this._st(r.id).state === "on").length;
    const vacS = this._st(this._vac());
    const smartOn = vacS && ["cleaning", "returning"].includes(vacS.state) ? 1 : 0;
    const playing = this._speakers().some((x) => this._st(x.id).state === "playing");

    const ae = this.shadowRoot.activeElement;
    const keepSearch = ae && ae.dataset && ae.dataset.search;
    const oldPop = this.shadowRoot.querySelector(".pop");
    const popScroll = oldPop ? oldPop.scrollTop : 0;
    const popWas = this._popup;
    this.shadowRoot.innerHTML = `
<style>
:host { display:block; }
* { box-sizing:border-box; }
.wrap { min-height:100vh; background:${C.bg}; color:${C.text}; padding:28px clamp(16px,4vw,48px) 40px;
  font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
.inner { max-width:1100px; margin:0 auto; }
.top { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:24px; flex-wrap:wrap; }
h1 { margin:0; font-size:clamp(24px,3vw,32px); font-weight:650; }
.date { color:${C.muted}; margin-top:4px; font-size:15px; }
.date::first-letter { text-transform:uppercase; }
.pill { border-radius:999px; padding:6px 14px; font-size:14px; font-weight:600; }
.cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; margin-bottom:28px; }
.card { background:${C.surface}; border:1px solid ${C.line}; border-radius:16px; padding:18px 20px; box-shadow:0 14px 35px rgba(0,0,0,.22); }
.lbl { color:${C.muted}; font-size:13px; margin:0 0 6px; text-transform:uppercase; letter-spacing:.04em; }
.val { font-size:clamp(28px,3.4vw,38px); font-weight:700; margin:0; display:flex; align-items:center; gap:10px; }
.sub { color:${C.muted}; font-size:14px; margin:8px 0 0; }
.val ha-icon { --mdc-icon-size:32px; color:${C.blue}; }
h2 { font-size:13px; color:${C.muted}; text-transform:uppercase; letter-spacing:.04em; margin:0 0 10px; font-weight:600; }
.rooms { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:10px; margin-bottom:28px; }
button { font:inherit; color:inherit; cursor:pointer; }
.room { display:flex; align-items:center; gap:12px; text-align:left; background:${C.surface2}; border:1px solid ${C.line};
  border-radius:14px; padding:14px 16px; transition:background .15s, border-color .15s; }
.room:hover { background:#173650; }
.room ha-icon { --mdc-icon-size:26px; color:${C.muted}; flex:none; }
.room b { display:block; font-weight:600; font-size:16px; }
.room small { display:block; color:${C.muted}; font-size:13px; margin-top:2px; }
.room.on { background:${C.amberBg}; border-color:${C.amber}; }
.room.on ha-icon { color:${C.amber}; }
.room[disabled] { opacity:.45; cursor:default; }
.actions { display:flex; flex-wrap:wrap; gap:10px; }
.act { display:flex; align-items:center; gap:8px; background:#173650; border:1px solid ${C.line}; border-radius:999px;
  padding:11px 18px; font-weight:600; font-size:15px; }
.act:hover { background:#204866; }
.act ha-icon { --mdc-icon-size:20px; }
.act.active { background:${C.amberBg}; border-color:${C.amber}; color:${C.amber}; }
.foot { color:${C.muted}; font-size:12px; margin-top:28px; }
.room { user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; touch-action:manipulation; }
.ov { position:fixed; inset:0; background:rgba(1,8,15,.78); display:flex; align-items:center; justify-content:center; padding:16px; z-index:10; }
.pop { width:min(440px,100%); max-height:85vh; overflow:auto; background:#0b1d2f; border:1px solid ${C.line}; border-radius:18px; padding:18px 20px; color:${C.text}; }
.ph { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.ph h3 { margin:0; font-size:22px; }
.x { background:none; border:none; font-size:20px; color:${C.muted}; padding:6px 10px; }
.lrow { display:grid; grid-template-columns:auto 1fr; align-items:center; gap:6px 12px; padding:12px 0; border-top:1px solid ${C.line}; }
.lrow.big { border-top:none; }
.lrow input[type=range] { grid-column:1 / -1; width:100%; accent-color:${C.amber}; height:28px; }
.lname b { display:block; font-size:15px; } .lname small { color:${C.muted}; font-size:13px; }
.sw { width:46px; height:26px; border-radius:999px; background:#1c3a54; border:1px solid ${C.line}; position:relative; }
.sw::after { content:""; position:absolute; top:3px; left:3px; width:18px; height:18px; border-radius:50%; background:${C.muted}; transition:left .15s; }
.sw.on { background:${C.amberBg}; border-color:${C.amber}; } .sw.on::after { left:23px; background:${C.amber}; }
.vac { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; background:${C.surface2};
  border:1px solid ${C.line}; border-radius:14px; padding:14px 16px; margin-bottom:28px; }
.vinfo { display:flex; align-items:center; gap:12px; }
.vinfo ha-icon { --mdc-icon-size:28px; flex:none; }
.vinfo b { display:block; font-weight:600; font-size:16px; } .vinfo small { display:block; font-size:13px; margin-top:2px; }
.vbtns { display:flex; flex-wrap:wrap; gap:8px; }
.act[disabled] { opacity:.45; cursor:default; }
.vac { user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }
.pop h4 { font-size:12px; color:${C.muted}; text-transform:uppercase; letter-spacing:.04em; margin:18px 0 8px; font-weight:600; }
.vstat { margin:0; color:${C.green}; font-weight:600; } .verr { margin:6px 0 0; color:${C.red}; font-weight:600; }
.map { display:block; width:100%; margin-top:14px; border-radius:12px; background:${C.surface}; border:1px solid ${C.line}; }
.note { color:${C.muted}; font-size:12px; margin:6px 0 0; }
.runs { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px 12px; font-size:13px; }
.runs span { padding:3px 0; } .runs .fast { color:${C.amber}; }
.vol { width:100%; accent-color:${C.amber}; height:28px; }
.chips { display:flex; flex-wrap:wrap; gap:6px; }
.chip { background:#173650; border:1px solid ${C.line}; border-radius:999px; padding:7px 12px; font-size:13px; font-weight:600; }
.chip.on { background:${C.amberBg}; border-color:${C.amber}; color:${C.amber}; }
.kv { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:7px 0; border-top:1px solid ${C.line}; font-size:14px; }
.kv span { color:${C.muted}; } .kv b { font-weight:600; text-align:right; }
.wear { padding:6px 0; } .wl { display:flex; justify-content:space-between; font-size:14px; margin-bottom:5px; } .wl small { font-size:13px; font-weight:600; }
.bar { height:6px; border-radius:99px; background:#1c3a54; overflow:hidden; } .bar i { display:block; height:100%; border-radius:99px; }
.np { display:flex; align-items:center; gap:14px; background:${C.surface2}; border:1px solid ${C.line}; border-radius:14px; padding:12px 14px; margin-bottom:10px; }
.np img, .noart { width:64px; height:64px; border-radius:10px; object-fit:cover; flex:none; background:${C.surface}; display:flex; align-items:center; justify-content:center; }
.noart ha-icon { --mdc-icon-size:28px; color:${C.muted}; }
.npi { flex:1; min-width:0; } .npi b { display:block; font-size:16px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.npi small { display:block; color:${C.muted}; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .npi .rm { color:${C.blue}; font-weight:600; }
.npb { display:flex; align-items:center; gap:6px; flex:none; }
.ic { background:#173650; border:1px solid ${C.line}; border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center; padding:0; }
.ic ha-icon { --mdc-icon-size:22px; } .ic.big { width:48px; height:48px; } .ic.on { background:${C.amberBg}; border-color:${C.amber}; color:${C.amber}; }
.favs { margin:0 0 10px; }
.tabs { position:sticky; top:0; z-index:5; display:flex; gap:6px; background:${C.bg}; padding:8px 0 12px; margin:-4px 0 18px; border-bottom:1px solid ${C.line}; overflow-x:auto; scrollbar-width:none; }
.tabs::-webkit-scrollbar { display:none; }
.tab { position:relative; display:flex; align-items:center; gap:8px; flex:none; background:none; border:1px solid transparent; border-radius:999px; padding:9px 16px; font-weight:600; font-size:15px; color:${C.muted}; }
.tab ha-icon { --mdc-icon-size:20px; }
.tab:hover { background:${C.surface2}; color:${C.text}; }
.tab.on { background:${C.amberBg}; border-color:${C.amber}; color:${C.amber}; }
.tab .cnt { font-style:normal; font-size:11px; font-weight:700; background:${C.amber}; color:${C.bg}; border-radius:999px; padding:1px 6px; }
.tab .dot { width:8px; height:8px; border-radius:50%; background:${C.green}; }
@media (max-width:420px) { .tab ha-icon { display:none; } }
.mpop { width:min(520px,100%); }
.srch { width:100%; margin-top:14px; padding:11px 14px; border-radius:12px; border:1px solid ${C.line}; background:${C.surface}; color:${C.text}; font:inherit; font-size:16px; }
.srch:focus { outline:none; border-color:${C.blue}; }
.ml { display:flex; flex-direction:column; gap:4px; }
.mi { display:flex; align-items:center; gap:12px; width:100%; text-align:left; background:none; border:1px solid transparent; border-radius:10px; padding:6px 8px; }
.mi:hover { background:#173650; border-color:${C.line}; }
.mi img, .mii { width:36px; height:36px; border-radius:8px; object-fit:cover; flex:none; background:${C.surface2}; display:flex; align-items:center; justify-content:center; }
.mii ha-icon { --mdc-icon-size:20px; color:${C.muted}; }
.mi span:not(.mii) { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:15px; }
.mi .pl { --mdc-icon-size:20px; color:${C.amber}; }
.mrow { display:flex; align-items:center; gap:2px; } .mrow .mi { flex:1; min-width:0; }
.hrt { background:none; border:none; padding:8px; color:${C.muted}; display:flex; } .hrt ha-icon { --mdc-icon-size:22px; }
.hrt:hover { color:${C.text}; } .hrt.on { color:${C.red}; }
.spks { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px; margin-bottom:28px; }
.spk { background:${C.surface2}; border:1px solid ${C.line}; border-radius:14px; padding:12px 14px; display:flex; flex-direction:column; gap:6px; align-items:flex-start; }
.spk.on { border-color:${C.amber}; }
.spkh { display:flex; align-items:center; gap:10px; } .spkh ha-icon { --mdc-icon-size:24px; color:${C.muted}; } .spk.on .spkh ha-icon { color:${C.amber}; }
.spkh b { display:block; font-size:15px; } .spkh small { display:block; color:${C.muted}; font-size:13px; }
.spk input[type=range] { width:100%; accent-color:${C.amber}; height:28px; }
@media (max-width:600px) {
  .tabs { gap:4px; margin-bottom:14px; } .tab { padding:8px 11px; font-size:13.5px; gap:5px; } .tab ha-icon { --mdc-icon-size:18px; }
  .np { padding:10px; gap:10px; } .np img, .noart { width:52px; height:52px; } .ic { width:36px; height:36px; } .ic.big { width:42px; height:42px; }
  .spks { grid-template-columns:1fr; gap:8px; margin-bottom:20px; }
  .vac { padding:12px; margin-bottom:20px; } .vbtns { width:100%; } .vbtns .act { flex:1; justify-content:center; padding:9px 8px; }
  .wrap { padding:16px 12px 28px; }
  .top { margin-bottom:14px; }
  h1 { font-size:22px; } .date { font-size:13px; }
  .cards { grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-bottom:18px; }
  .card { padding:10px; border-radius:12px; box-shadow:none; min-width:0; }
  .lbl { font-size:10.5px; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .val { font-size:19px; gap:4px; white-space:nowrap; }
  .val ha-icon { --mdc-icon-size:18px; }
  .sub { font-size:11.5px; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .long { display:none; }
  .rooms { grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-bottom:20px; }
  .room { padding:12px; gap:10px; }
  .room b { font-size:15px; }
  .act { padding:9px 14px; font-size:14px; }
}
</style>
<div class="wrap"><div class="inner">
  <div class="top">
    <div><h1>${greet}${name ? ", " + name : ""}</h1><div class="date">${dato} · ${tid}</div></div>
    <span class="pill" style="color:${isHome ? C.green : C.muted};background:${isHome ? C.greenBg : C.surface2}">${isHome ? "Hjemme" : "Ude"}</span>
  </div>

  <nav class="tabs" role="tablist">${TABS.map((x) => `<button class="tab ${tab === x.id ? "on" : ""}" data-tab="${x.id}" role="tab" aria-selected="${tab === x.id}">
    <ha-icon icon="${x.icon}"></ha-icon><span>${x.name}</span>${x.id === "lys" && lysOn ? `<i class="cnt">${lysOn}</i>` : x.id === "musik" && playing ? `<i class="dot"></i>` : x.id === "smart" && smartOn ? `<i class="dot"></i>` : ""}</button>`).join("")}</nav>

  ${tab === "forside" ? `
  <div class="cards">
    <div class="card" style="background:${lvl.bg};border-color:${lvl.line}">
      <p class="lbl">Elpris nu</p>
      <p class="val" style="color:${lvl.col}">${isNaN(price) ? "–" : fmt(price) + " kr."}</p>
      <p class="sub">${lvl.txt}<span class="long"> · inkl. moms, tariffer og afgifter${peak ? " · spidslast 17–21" : ""}</span></p>
    </div>
    <div class="card">
      <p class="lbl">Ude</p>
      <p class="val"><ha-icon icon="${WEATHER_ICON[wState] || "mdi:thermometer"}"></ha-icon>${isNaN(temp) ? "–" : fmt(temp, 1) + " °C"}</p>
      <p class="sub">${WEATHER[wState] || "Vejr ukendt"}</p>
    </div>
    <div class="card">
      <p class="lbl"><span class="long">Næste </span>vækkeur</p>
      <p class="val">${vkTxt}</p>
      <p class="sub">${vkSub}</p>
    </div>
  </div>

  <h2>Hurtige knapper</h2>
  <div class="actions">
    <button class="act" data-action="alt_sluk"><ha-icon icon="mdi:power"></ha-icon>Sluk alt lys</button>
    <button class="act" data-action="afsted"><ha-icon icon="mdi:walk"></ha-icon>Jeg skal afsted</button>
    <button class="act" data-action="skrald"><ha-icon icon="mdi:trash-can-outline"></ha-icon>Skraldespand</button>
    <button class="act ${ferieOn ? "active" : ""}" data-action="ferie"><ha-icon icon="mdi:palm-tree"></ha-icon>Feriemodus ${ferieOn ? "til" : "fra"}</button>
    ${gaest ? `<button class="act ${gaestOn ? "active" : ""}" data-action="gaester"><ha-icon icon="mdi:account-group"></ha-icon>Gæster ${gaestOn ? "til" : "fra"}</button>` : ""}
    ${this._speakers().length ? `<button class="act" data-action="musik"><ha-icon icon="mdi:music"></ha-icon>Vælg musik</button>
    <button class="act" data-action="favs"><ha-icon icon="mdi:heart"></ha-icon>Favoritter</button>` : ""}
  </div>
  <div class="foot">Lys (også på kontakterne), musik og støvsuger finder du i fanerne øverst.</div>` : ""}

  ${tab === "lys" ? `
  <h2>Rum</h2>
  <div class="rooms">${rooms}</div>
  ${plugs ? `<h2>Lys på kontakter</h2><div class="rooms">${plugs}</div>` : ""}
  <div class="foot">Tryk på et rum eller en kontakt for at tænde eller slukke. Hold et rum nede for lysstyrke og de enkelte lamper.</div>` : ""}

  ${tab === "musik" ? this._sonosHtml() : ""}

  ${tab === "smart" ? `
  ${this._vacHtml()}
  <div class="foot">Hold støvsugeren nede for kort, indstillinger og vedligehold.</div>` : ""}
</div></div>${this._popupHtml()}`;
    if (keepSearch) {
      const s = this.shadowRoot.querySelector(".srch");
      if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); this._filterMusic(); }
    }
    if (popScroll && popWas && popWas === this._popup) {
      const np = this.shadowRoot.querySelector(".pop");
      if (np) np.scrollTop = popScroll;
    }
  }

  _click(e) {
    if (this._longFired) { this._longFired = false; return; }
    if (e.target.dataset && e.target.dataset.close) { this._popup = null; this._render(); return; }
    const t = e.target.closest("button");
    if (!t || !this._hass) return;
    const call = (d, s, data) => this._hass.callService(d, s, data);
    if (t.dataset.toggle) return call("light", "toggle", { entity_id: t.dataset.toggle });
    if (t.dataset.vac) return call("vacuum", t.dataset.vac, { entity_id: this._vac() });
    if (t.dataset.fan) return call("vacuum", "set_fan_speed", { entity_id: this._vac(), fan_speed: t.dataset.fan });
    if (t.dataset.sel) return call("select", "select_option", { entity_id: t.dataset.sel, option: t.dataset.opt });
    if (t.dataset.sw) return call("switch", "toggle", { entity_id: t.dataset.sw });
    if (t.dataset.tab) {
      this._tab = t.dataset.tab;
      try { localStorage.setItem("hjem-tab", this._tab); } catch (x) { /* ignorer */ }
      this._render(); return;
    }
    if (t.dataset.mtarget) { this._mTarget = t.dataset.mtarget; this._render(); return; }
    if (t.dataset.favtoggle) { this._toggleMyFav(t.dataset.favtoggle, t.dataset.ft, t.dataset.fimg || ""); return; }
    if (t.dataset.play) {
      const fav = t.dataset.kind === "fav";
      const id = t.dataset.play, target = this._mTarget;
      const go = () => call("media_player", "play_media", { entity_id: target, media_content_type: fav ? "favorite_item_id" : "music", media_content_id: id });
      if (!fav && id.startsWith("media-source://radio_browser/")) {
        this._hass.callWS({ type: "media_source/resolve_media", media_content_id: id })
          .then((r) => { if (r && /\.m3u8/i.test(r.url || "")) alert("Denne kanal sendes i et format, som Sonos ikke kan afspille. Vælg en anden udgave af kanalen (fx uden “AAC”)."); else go(); })
          .catch(go);
      } else go();
      this._popup = null; this._render(); return;
    }
    if (t.dataset.mp) return call("media_player", t.dataset.mp, { entity_id: t.dataset.ent });
    if (t.dataset.unjoin) return call("media_player", "unjoin", { entity_id: t.dataset.unjoin });
    if (t.dataset.join) return call("media_player", "join", { entity_id: t.dataset.ent, group_members: [t.dataset.join] });
    if (t.dataset.fav) return call("media_player", "play_media", { entity_id: t.dataset.ent, media_content_type: "favorite_item_id", media_content_id: t.dataset.fav });
    switch (t.dataset.action) {
      case "alt_sluk":
        if (confirm("Sluk alt lys i huset?")) call("light", "turn_off", { entity_id: "all" });
        break;
      case "afsted":
        call("select", "select_option", { entity_id: "select.gang_gang_scene", option: "Jeg skal afsted" });
        break;
      case "skrald":
        call("select", "select_option", { entity_id: "select.gang_gang_scene", option: "Skraldespand" });
        break;
      case "ferie":
        call("input_boolean", "toggle", { entity_id: "input_boolean.feriemodus" });
        break;
      case "favs":
        this._mMode = "fav"; this._popup = "music"; this._render();
        break;
      case "musik":
        this._mMode = "all"; this._popup = "music"; this._render();
        { const s = this.shadowRoot.querySelector(".srch"); if (s && matchMedia("(hover:hover)").matches) s.focus(); }
        break;
      case "gaester":
        call("input_boolean", "toggle", { entity_id: "input_boolean.gaestetilstand" });
        break;
    }
  }
}

if (!customElements.get("hjem-dashboard-card")) customElements.define("hjem-dashboard-card", HjemDashboardCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "hjem-dashboard-card", name: "Hjem-dashboard", description: "Eget dashboard i elpris-farverne" });
