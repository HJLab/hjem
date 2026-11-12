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

  _stateKey() {
    const ids = [...this._rooms().map((r) => r.id), "sensor.elpris_total", "sensor.hue_outdoor_motion_sensor_1_temperatur",
      "weather.forecast_hjem", "sensor.naeste_vaekkeur", "input_boolean.feriemodus", "device_tracker.hennings_mobil"];
    return ids.map((id) => { const s = this._hass.states[id]; return s ? s.state + (s.attributes.brightness || "") : "-"; }).join("|");
  }

  _st(id) { return this._hass && this._hass.states[id]; }

  _members(id) {
    const s = this._st(id);
    const m = (s && s.attributes.entity_id) || [];
    return m.filter((e) => e.startsWith("light.") && this._st(e));
  }

  _popupKey() {
    if (!this._popup) return "";
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
    const r = this._rooms().find((x) => x.id === this._popup) || { name: "", id: this._popup };
    const members = this._members(this._popup);
    const rows = members.map((id) => {
      const s = this._st(id);
      let n = (s.attributes.friendly_name || id).replace(new RegExp("^" + r.name + "\\s+", "i"), "");
      return this._lightRow(id, n.charAt(0).toUpperCase() + n.slice(1));
    }).join("");
    return `<div class="ov" data-close="1"><div class="pop" role="dialog" aria-label="${r.name}">
      <div class="ph"><h3>${r.name}</h3><button class="x" data-close="1" aria-label="Luk">✕</button></div>
      ${this._lightRow(this._popup, "Hele rummet", true)}
      ${rows ? `<h2 style="margin:18px 0 8px">Lamper</h2>${rows}` : ""}
    </div></div>`;
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
      sr.addEventListener("contextmenu", (e) => { if (e.target.closest(".room")) e.preventDefault(); });
      sr.addEventListener("pointerdown", (e) => {
        const room = e.target.closest(".room");
        if (!room) return;
        this._longFired = false;
        clearTimeout(this._lp);
        this._lp = setTimeout(() => { this._longFired = true; this._popup = room.dataset.toggle; this._render(); }, 600);
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => sr.addEventListener(ev, () => clearTimeout(this._lp)));
      sr.addEventListener("input", (e) => { if (e.target.dataset.dim) this._dragging = true; });
      sr.addEventListener("change", (e) => {
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
    if (vk && !["unknown", "unavailable", ""].includes(vk.state)) {
      const d = new Date(vk.state);
      if (!isNaN(d)) {
        vkTxt = d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
        const same = d.toDateString() === now.toDateString();
        const tom = new Date(now); tom.setDate(now.getDate() + 1);
        const dayTxt = same ? "I dag" : d.toDateString() === tom.toDateString() ? "I morgen" : d.toLocaleDateString("da-DK", { weekday: "long" });
        vkSub = `${dayTxt} · morgenlys 40 % → 50 %`;
      }
    }

    const ferie = this._st("input_boolean.feriemodus");
    const ferieOn = ferie && ferie.state === "on";

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
</style>
<div class="wrap"><div class="inner">
  <div class="top">
    <div><h1>${greet}${name ? ", " + name : ""}</h1><div class="date">${dato} · ${tid}</div></div>
    <span class="pill" style="color:${isHome ? C.green : C.muted};background:${isHome ? C.greenBg : C.surface2}">${isHome ? "Hjemme" : "Ude"}</span>
  </div>

  <div class="cards">
    <div class="card" style="background:${lvl.bg};border-color:${lvl.line}">
      <p class="lbl">Elpris nu</p>
      <p class="val" style="color:${lvl.col}">${isNaN(price) ? "–" : fmt(price) + " kr."}</p>
      <p class="sub">${lvl.txt} · inkl. moms, tariffer og afgifter${peak ? " · spidslast 17–21" : ""}</p>
    </div>
    <div class="card">
      <p class="lbl">Ude</p>
      <p class="val"><ha-icon icon="${WEATHER_ICON[wState] || "mdi:thermometer"}"></ha-icon>${isNaN(temp) ? "–" : fmt(temp, 1) + " °C"}</p>
      <p class="sub">${WEATHER[wState] || "Vejr ukendt"}</p>
    </div>
    <div class="card">
      <p class="lbl">Næste vækkeur</p>
      <p class="val">${vkTxt}</p>
      <p class="sub">${vkSub}</p>
    </div>
  </div>

  <h2>Rum</h2>
  <div class="rooms">${rooms}</div>

  <h2>Hurtige knapper</h2>
  <div class="actions">
    <button class="act" data-action="alt_sluk"><ha-icon icon="mdi:power"></ha-icon>Sluk alt lys</button>
    <button class="act" data-action="afsted"><ha-icon icon="mdi:walk"></ha-icon>Jeg skal afsted</button>
    <button class="act" data-action="skrald"><ha-icon icon="mdi:trash-can-outline"></ha-icon>Skraldespand</button>
    <button class="act ${ferieOn ? "active" : ""}" data-action="ferie"><ha-icon icon="mdi:palm-tree"></ha-icon>Feriemodus ${ferieOn ? "til" : "fra"}</button>
  </div>
  <div class="foot">Tryk på et rum for at tænde eller slukke. Hold et rum nede for lysstyrke og de enkelte lamper.</div>
</div></div>${this._popupHtml()}`;
  }

  _click(e) {
    if (this._longFired) { this._longFired = false; return; }
    if (e.target.dataset && e.target.dataset.close) { this._popup = null; this._render(); return; }
    const t = e.target.closest("button");
    if (!t || !this._hass) return;
    const call = (d, s, data) => this._hass.callService(d, s, data);
    if (t.dataset.toggle) return call("light", "toggle", { entity_id: t.dataset.toggle });
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
    }
  }
}

if (!customElements.get("hjem-dashboard-card")) customElements.define("hjem-dashboard-card", HjemDashboardCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "hjem-dashboard-card", name: "Hjem-dashboard", description: "Eget dashboard i elpris-farverne" });
