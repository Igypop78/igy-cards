/*
 * Igy Weather Card – počasie + predpoveď výroby FVE v štýle Home Energy / Thermostat Card.
 *
 *   type: custom:igy-weather-card
 *   entity: weather.forecast_home                 # ľubovoľná entita počasia (Met.no, Open-Meteo, …)
 *   title: Bratislava                             # voliteľné – inak názov entity
 *   temperature_sensor: sensor.vonku_teplota      # voliteľné – vlastný vonkajší teplomer (aktuálna teplota + priebeh dnes)
 *   solar_today: sensor.solcast_pv_forecast_forecast_today          # Solcast – dnes (kWh, atribút detailedForecast)
 *   solar_remaining: sensor.solcast_pv_forecast_forecast_remaining_today
 *   solar_days: [sensor.solcast_pv_forecast_forecast_tomorrow, sensor.solcast_pv_forecast_forecast_day_3, sensor.solcast_pv_forecast_forecast_day_4]
 *   solar_power: sensor.pv_power                  # voliteľné – skutočná výroba (W/kW), kreslí sa do grafu za uplynulú časť dňa
 *   ring_max: 9                                 # voliteľné – kWh za hodinu pre plný prstenec okolo ikony
 *   collapsible: true                             # ťuk na hlavičku zbalí / rozbalí (pamätá si na zariadení)
 *   collapsed: true                               # na začiatku zbalená: hlavička + graf dňa
 */
(function () {
  'use strict';
  // jazyk podľa Home Assistanta: sk = slovenčina, inak angličtina (texty v kóde sú po slovensky, preklady v EN)
  let LANG = String((typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || (typeof navigator !== 'undefined' && navigator.language) || 'en').slice(0, 2).toLowerCase();
  const setLang = (h) => { const l = h && ((h.locale && h.locale.language) || h.language); if (l) LANG = String(l).slice(0, 2).toLowerCase(); };
  const _ = (s, ...a) => { let r = LANG === 'sk' ? s : (EN[s] != null ? EN[s] : s); a.forEach((v, i) => { r = r.split('{' + i + '}').join(v); }); return r; };
  const EN = {
    "Zadaj entitu počasia (entity: weather.…)": "Set a weather entity (entity: weather.…)",
    "Teraz": "Now",
    "Zajtra": "Tomorrow",
    "východ": "sunrise",
    "západ": "sunset",
    "Dnes": "Today",
    "Počasie": "Weather",
    "Predpoveď výroby FVE (Solcast)": "Solar production forecast (Solcast)",
    "Entita počasia": "Weather entity",
    "Miesto (voliteľné)": "Location (optional)",
    "Vonkajší teplomer (voliteľné)": "Outdoor thermometer (optional)",
    "Predpoveď na dnes": "Forecast for today",
    "Zostáva dnes": "Remaining today",
    "Predpoveď na ďalšie dni (zajtra, +2, +3)": "Forecast for the next days (tomorrow, +2, +3)",
    "Skutočná výroba – výkon (voliteľné)": "Actual production – power (optional)",
    "Zbaliteľná": "Collapsible",
    "Na začiatku zbalená": "Start collapsed",
    "Plný prstenec (kWh za hodinu)": "Full ring (kWh per hour)",
    "Napr. Met.no alebo Open-Meteo – musí vedieť hodinovú a dennú predpoveď.": "E.g. Met.no or Open-Meteo – must provide hourly and daily forecasts.",
    "Zobrazí sa pod stavom počasia. Prázdne = názov entity.": "Shown in the header. Empty = entity name.",
    "Ak ho máš, karta ukáže jeho teplotu a dnešný priebeh namiesto údajov z predpovede.": "If you have one, the card shows its temperature and today’s history instead of forecast data.",
    "Solcast „forecast today“ – z atribútu detailedForecast sa kreslí krivka.": "Solcast “forecast today” – hourly values come from the detailedForecast attribute.",
    "V poradí zajtra, pozajtra, popozajtra.": "In order: tomorrow, day after, the day after that.",
    "Uplynulá časť dňa sa nakreslí sýtou farbou podľa skutočnosti.": "The past part of the day is drawn from actual production.",
    "Zbalená ukazuje len hlavičku a graf dňa.": "Collapsed shows only the header and the hourly strip.",
    "Počasie s grafom dňa a predpoveďou výroby FVE (Solcast).": "Weather with an hourly strip and solar production forecast (Solcast)."
  };

  const VERSION = '1.5.0';
  const COL = { sol: '#ff9f0a', rain: '#64b5ff' };
  const DIRS = ['S', 'SV', 'V', 'JV', 'J', 'JZ', 'Z', 'SZ'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  const ui = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></svg>`;
  const UI = {
    wind: 'M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8',
    hum: 'M12 2.7c-3.3 4.2-6 7.6-6 11a6 6 0 0 0 12 0c0-3.4-2.7-6.8-6-11z',
    sunset: 'M12 9V3M8.5 6.5 12 3l3.5 3.5M4 14h2M18 14h2M6.3 9.3l1.4 1.4M16.3 10.7l1.4-1.4M8 14a4 4 0 0 1 8 0M3 18h18',
    sunrise: 'M12 3v6M8.5 5.5 12 9l3.5-3.5M4 14h2M18 14h2M6.3 9.3l1.4 1.4M16.3 10.7l1.4-1.4M8 14a4 4 0 0 1 8 0M3 18h18',
    press: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 12l4-4',
    chev: 'M6 9l6 6 6-6'
  };

  /* ---------- farebné ikony počasia ---------- */
  const SUN = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffc53d"/><g stroke="#ffc53d" stroke-width="${r * 0.3}" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const t = a * Math.PI / 180; return `<line x1="${cx + Math.cos(t) * r * 1.55}" y1="${cy + Math.sin(t) * r * 1.55}" x2="${cx + Math.cos(t) * r * 2.05}" y2="${cy + Math.sin(t) * r * 2.05}"/>`; }).join('')}</g>`;
  const MOON = (cx, cy, r) => `<path d="M${cx + r * 0.4} ${cy - r}a${r} ${r} 0 1 0 ${r * 0.6} ${r * 1.75} ${r * 1.1} ${r * 1.1} 0 0 1 -${r * 0.6} -${r * 1.75}z" fill="#c7d2fe"/>`;
  const CLOUD = (y, c) => `<path d="M18 ${y + 22}h28a10 10 0 0 0 0-20 14 14 0 0 0-26 3.5 8.3 8.3 0 0 0-2 16.5z" fill="${c}"/>`;
  const DROPS = (y, n, c) => `<g stroke="${c || COL.rain}" stroke-width="3" stroke-linecap="round">${Array.from({ length: n }, (_, i) => `<line x1="${24 + i * 9}" y1="${y}" x2="${21 + i * 9}" y2="${y + 8}"/>`).join('')}</g>`;
  const FLAKES = (y) => `<g fill="#e8f1ff">${[24, 33, 42].map((x, i) => `<circle cx="${x - 2}" cy="${y + 4 + (i % 2) * 3}" r="2.6"/>`).join('')}</g>`;
  const BOLT = (y) => `<path d="M34 ${y}l-7 11h6l-3 9 9-12h-6l3-8z" fill="#ffd60a"/>`;
  function wicon(c, night) {
    let b;
    switch (c) {
      case 'sunny': b = night ? MOON(32, 32, 14) : SUN(32, 32, 11); break;
      case 'clear-night': b = MOON(32, 32, 14); break;
      case 'partlycloudy': b = (night ? MOON(24, 22, 9) : SUN(24, 24, 8)) + CLOUD(26, '#e5e7eb'); break;
      case 'cloudy': b = CLOUD(22, '#cbd2db'); break;
      case 'fog': b = CLOUD(14, '#b8c0cc') + '<g stroke="#b8c0cc" stroke-width="3" stroke-linecap="round"><line x1="14" y1="46" x2="50" y2="46"/><line x1="18" y1="53" x2="46" y2="53"/></g>'; break;
      case 'rainy': b = CLOUD(14, '#aab3c0') + DROPS(42, 3); break;
      case 'pouring': b = CLOUD(12, '#98a2b0') + DROPS(40, 4); break;
      case 'snowy': b = CLOUD(14, '#cfd6e0') + FLAKES(42); break;
      case 'snowy-rainy': b = CLOUD(14, '#b8c0cc') + DROPS(42, 2) + `<circle cx="42" cy="47" r="2.6" fill="#e8f1ff"/>`; break;
      case 'hail': b = CLOUD(14, '#aab3c0') + `<g fill="#dbe7ff">${[24, 33, 42].map((x) => `<circle cx="${x}" cy="48" r="3"/>`).join('')}</g>`; break;
      case 'lightning': b = CLOUD(12, '#98a2b0') + BOLT(38); break;
      case 'lightning-rainy': b = CLOUD(12, '#98a2b0') + BOLT(38) + DROPS(42, 1); break;
      case 'windy': case 'windy-variant': b = (c === 'windy-variant' ? CLOUD(8, '#cbd2db') : '') + '<g stroke="#cbd2db" stroke-width="3.5" stroke-linecap="round" fill="none"><path d="M10 38h30a6 6 0 1 0-6-6"/><path d="M10 46h38a6 6 0 1 1-6 6"/></g>'; break;
      default: b = CLOUD(22, '#cbd2db');
    }
    return `<svg viewBox="0 0 64 64">${b}</svg>`;
  }
  const SUNRISE = `<svg viewBox="0 0 64 64"><path d="M14 44a18 18 0 0 1 36 0" fill="#ffc53d"/><path d="M6 46h52" stroke="#ffc53d" stroke-width="3.5" stroke-linecap="round"/><path d="M32 8v12M25 14l7-7 7 7" stroke="#ffc53d" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const SUNSET = `<svg viewBox="0 0 64 64"><path d="M14 44a18 18 0 0 1 36 0" fill="#ff8a4c"/><path d="M6 46h52" stroke="#ff8a4c" stroke-width="3.5" stroke-linecap="round"/><path d="M32 8v12M25 14l7 7 7-7" stroke="#ff8a4c" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  // farba teploty pre pruhy a krivku
  function tcol(t) {
    const S = [[-10, [150, 170, 255]], [0, [124, 196, 255]], [8, [125, 220, 192]], [15, [255, 210, 122]], [25, [255, 159, 106]], [35, [255, 105, 97]]];
    if (t <= S[0][0]) return `rgb(${S[0][1]})`;
    for (let i = 1; i < S.length; i++) if (t <= S[i][0]) {
      const a = S[i - 1], b = S[i], k = (t - a[0]) / (b[0] - a[0]);
      return `rgb(${[0, 1, 2].map((j) => Math.round(a[1][j] + (b[1][j] - a[1][j]) * k)).join(',')})`;
    }
    return `rgb(${S[S.length - 1][1]})`;
  }

  const CSS = `
    ha-card { padding: 12px 18px 16px; overflow: hidden; }
    .top { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 13px; font-weight: 600; color: var(--secondary-text-color); letter-spacing: .02em; cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
    .top .ic svg { width: 20px; height: 20px; display: block; margin: -2px 0; }
    .top .ttl { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chev { flex: none; color: var(--secondary-text-color); display: flex; }
    .chev svg { width: 18px; height: 18px; transition: transform .3s; }
    ha-card.col .chev svg { transform: rotate(-90deg); }
    ha-card.col .xp { display: none; }
    .box + .box { margin-top: 10px; } .box { border-radius: 18px; background: var(--hc-surface, rgba(127,127,127,.1)); box-shadow: inset 0 0 0 1px var(--hc-surface-line, transparent); }
    .gb { padding: 6px 12px; }
    .sw { overflow-x: auto; overflow-y: hidden; margin: 0 -12px; padding: 0 12px; scrollbar-width: none; -webkit-overflow-scrolling: touch; cursor: grab;
      mask-image: linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 22px), transparent 100%); -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 22px), transparent 100%); }
    .sw::-webkit-scrollbar { display: none; }
    .sw.drag { cursor: grabbing; }
    .strip { display: flex; width: max-content; }
    .hc { width: 50px; flex: none; text-align: center; padding: 6px 0 6px; border-radius: 14px; font-variant-numeric: tabular-nums; user-select: none; -webkit-user-select: none; }
    .hc .h { font-size: 11.5px; color: var(--secondary-text-color); white-space: nowrap; }
    .hc > i { display: block; width: 28px; height: 28px; margin: 9px auto 7px; }
    .hc > i svg { width: 28px; height: 28px; display: block; }
    .hc .t { font-size: 16px; font-weight: 500; color: var(--primary-text-color); }
    .hc .t.sm { font-size: 11px; font-weight: 400; color: var(--secondary-text-color); line-height: 22px; }
    .hc .r { font-size: 10.5px; color: ${COL.rain}; height: 14px; white-space: nowrap; }
    .hc { position: relative; isolation: isolate; }
    /* FVE: pozadie stĺpca (predvolené) – výška = výroba v danej hodine */
    .hc > i { position: relative; }
    .hc .ring { position: absolute; inset: -6px; width: 40px !important; height: 40px !important; transform: rotate(-90deg); fill: none; stroke: #ffb340; stroke-width: 2.4; stroke-linecap: round; pointer-events: none; }
    .hc .ring .rt { stroke: rgba(255,179,64,.16); }
    /* výroba FVE v kWh – malý štítok v rohu ikony, nezaberá riadok */
    .hc .pk { position: absolute; right: -18px; bottom: -4px; font-style: normal; font-size: 9.5px; font-weight: 600; line-height: 1; color: #ffc361;
      padding: 1px 3px; border-radius: 6px; background: rgba(20,18,28,.55); white-space: nowrap; }
    .hc.past .ring, .hc.past .pk { opacity: .5; }
    .hc.now { background: rgba(255,255,255,.09); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
    .hc.now .h { color: var(--primary-text-color); font-weight: 600; }
    .hc.past > i, .hc.past .t, .hc.past .h { opacity: .5; }
    .hc.day { box-shadow: inset 1px 0 0 rgba(127,127,127,.35); border-radius: 0 14px 14px 0; }
    .hc.day .h { color: var(--primary-text-color); font-weight: 600; }
    .hc.sun { width: 46px; }
    .d { display: grid; grid-template-columns: 40px 26px 30px 1fr 30px 76px; align-items: center; gap: 8px; padding: 0 12px; min-height: 46px; position: relative; font-variant-numeric: tabular-nums; }
    .d + .d::before { content: ''; position: absolute; left: 12px; right: 0; top: 0; height: 1px; background: rgba(127,127,127,.18); }
    .d .n { font-size: 14px; font-weight: 500; color: var(--primary-text-color); line-height: 1.15; white-space: nowrap; }
    .d .wi { margin-left: -4px; }
    .rb em { position: absolute; top: 50%; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 2px rgba(0,0,0,.3); }
    .d .n small { display: block; font-size: 11px; font-weight: 500; color: ${COL.rain}; }
    .d .wi svg { width: 24px; height: 24px; display: block; }
    .d .lo { font-size: 13px; color: var(--secondary-text-color); text-align: right; }
    .d .hi { font-size: 14px; color: var(--primary-text-color); }
    .rb { position: relative; height: 6px; border-radius: 99px; background: rgba(127,127,127,.18); }
    .rb i { position: absolute; top: 0; bottom: 0; border-radius: 99px; }
    .pv { display: flex; align-items: center; justify-content: flex-end; gap: 5px; font-size: 13px; color: var(--primary-text-color); white-space: nowrap; }
    .pv small { color: var(--secondary-text-color); font-size: 11px; }
    .pv u { display: block; width: 20px; height: 4px; border-radius: 99px; background: rgba(127,127,127,.2); overflow: hidden; }
    .pv u i { display: block; height: 100%; background: ${COL.sol}; border-radius: 99px; }
    .msg { font-size: 13px; color: var(--secondary-text-color); padding: 8px 0; }
  `;

  class HomeWeatherCard extends HTMLElement {
    static getConfigElement() { return document.createElement('igy-weather-card-editor'); }
    static getStubConfig(hass) {
      const st = hass ? hass.states : {}, find = (re) => Object.keys(st).find((id) => re.test(id));
      const c = { entity: find(/^weather\./) || 'weather.forecast_home' };
      const t = find(/^sensor\.solcast_pv_forecast_forecast_today/), r = find(/^sensor\.solcast_pv_forecast_forecast_remaining_today/);
      if (t) c.solar_today = t; if (r) c.solar_remaining = r;
      const ds = [find(/^sensor\.solcast_pv_forecast_forecast_tomorrow/), find(/^sensor\.solcast_pv_forecast_forecast_day_3/), find(/^sensor\.solcast_pv_forecast_forecast_day_4/)].filter(Boolean);
      if (ds.length) c.solar_days = ds;
      return c;
    }
    setConfig(c) {
      if (!c || !c.entity) throw new Error(_('Zadaj entitu počasia (entity: weather.…)'));
      const old = this._cfg;
      this._cfg = Object.assign({ collapsible: true }, c);
      this._built = false; this._col = null;
      if (old && (old.entity !== c.entity)) { this._unsub(); this._fc = {}; }
      if (old && (old.solar_power !== c.solar_power || old.temperature_sensor !== c.temperature_sensor)) this._hist = null;
      if (this._hass) { this._render(); this._start(); }
    }
    set hass(h) { setLang(h); const first = !this._hass; this._hass = h; if (!this._cfg) return; this._render(); if (first) this._start(); }
    connectedCallback() { if (this._hass && this._cfg) { this._start(); requestAnimationFrame(() => this._toNow(false)); } }
    disconnectedCallback() { clearTimeout(this._backT); this._unsub(); clearInterval(this._hT); this._hT = null; }
    getCardSize() { return this._col ? 4 : 8; }
    getGridOptions() { return { columns: 12, min_columns: 6 }; }

    _lang() { return (this._hass.locale && this._hass.locale.language) || 'sk'; }
    _nf(v, d) { return Number(v).toLocaleString(this._lang(), { minimumFractionDigits: d, maximumFractionDigits: d }); }
    _st(id) { return id && this._hass.states[id]; }
    _ls(v) {
      const k = 'hwc-col:' + this._cfg.entity;
      try { if (v === undefined) { const x = localStorage.getItem(k); return x == null ? this._cfg.collapsed !== false : x === '1'; } localStorage.setItem(k, v ? '1' : '0'); } catch (_) { return this._cfg.collapsed !== false; }
      return null;
    }

    /* ---------- dáta: predpoveď (odber), história dnes ---------- */
    _start() {
      if (!this.isConnected || !this._hass || !this._cfg) return;
      this._fc = this._fc || {};
      if (!this._subs) {
        this._subs = ['hourly', 'daily'].map((type) => this._hass.connection.subscribeMessage((ev) => {
          this._fc[type] = ev.forecast || []; if (type === 'hourly') this._cacheFc(this._fc.hourly); this._sig = ''; this._render();
        }, { type: 'weather/subscribe_forecast', forecast_type: type, entity_id: this._cfg.entity }).catch((e) => { console.warn('igy-weather-card: predpoveď ' + type, e); return null; }));
      }
      if (!this._hT) { this._loadHist(); this._hT = setInterval(() => this._loadHist(), 10 * 60000); }
    }
    // hodinová predpoveď sa ukladá na zariadení – keď entita počasia nemá históriu, uplynulé hodiny sa doplnia z nej
    _cacheFc(list) {
      const d0 = new Date(); d0.setHours(0, 0, 0, 0); const key = 'hwc-fc:' + this._cfg.entity, day = d0.toDateString();
      let C = {}; try { const o = JSON.parse(localStorage.getItem(key) || '{}'); if (o.day === day) C = o.h || {}; } catch (_) { }
      const now = Date.now();
      list.forEach((f) => { const t = Date.parse(f.datetime); if (t >= d0.getTime() && t < d0.getTime() + 86400000 && (t >= now - 3600000 || !C[t])) C[t] = [f.temperature, f.condition]; });
      this._fcCache = C;
      try { localStorage.setItem(key, JSON.stringify({ day, h: C })); } catch (_) { }
    }
    _cached() {
      if (this._fcCache) return this._fcCache;
      try { const o = JSON.parse(localStorage.getItem('hwc-fc:' + this._cfg.entity) || '{}'); const d0 = new Date(); d0.setHours(0, 0, 0, 0); this._fcCache = o.day === d0.toDateString() ? o.h || {} : {}; } catch (_) { this._fcCache = {}; }
      return this._fcCache;
    }
    _unsub() { (this._subs || []).forEach((p) => p.then((u) => u && u()).catch(() => { })); this._subs = null; }
    async _loadHist() {
      const c = this._cfg, d0 = new Date(); d0.setHours(0, 0, 0, 0);
      const ids = [c.entity, c.temperature_sensor, c.solar_power].filter(Boolean);
      try {
        const r = await this._hass.callWS({ type: 'history/history_during_period', start_time: d0.toISOString(), entity_ids: ids, minimal_response: false, no_attributes: false, significant_changes_only: false });
        const H = { temp: [], cond: [], pv: [] }, ts = (x) => ((x.lu != null ? x.lu : x.lc) || 0) * 1000;
        let a = {};
        (r[c.entity] || []).forEach((x) => { if (x.a) a = x.a; const t = Math.max(d0.getTime(), ts(x)); H.cond.push([t, x.s]); if (!c.temperature_sensor && a.temperature != null) H.temp.push([t, +a.temperature]); });
        if (c.temperature_sensor) (r[c.temperature_sensor] || []).forEach((x) => { const v = parseFloat(x.s); if (!isNaN(v)) H.temp.push([Math.max(d0.getTime(), ts(x)), v]); });
        if (c.solar_power) {
          let u = '';
          (r[c.solar_power] || []).forEach((x) => { if (x.a && x.a.unit_of_measurement) u = x.a.unit_of_measurement; const v = parseFloat(x.s); if (!isNaN(v)) H.pv.push([Math.max(d0.getTime(), ts(x)), v]); });
          const k = u === 'W' || (!u && Math.max(0, ...H.pv.map((p) => p[1])) > 100) ? 0.001 : 1; H.pv = H.pv.map(([t, v]) => [t, Math.max(0, v * k)]);
        }
        if (!(r[c.entity] || []).length) console.info('igy-weather-card: ' + c.entity + ' nemá históriu (vylúčená z recordera?) – priebeh teploty dnes nastav cez temperature_sensor.');
        this._hist = H; this._sig = ''; this._render();
      } catch (e) { console.warn('igy-weather-card: história', e); }
    }

    /* ---------- výpočty ---------- */
    _sun() {
      const s = this._st('sun.sun'); if (!s) return null;
      const d0 = new Date(); d0.setHours(0, 0, 0, 0); const d1 = d0.getTime() + 86400000;
      const fix = (iso) => { let t = Date.parse(iso); if (isNaN(t)) return null; while (t >= d1) t -= 86400000; while (t < d0.getTime()) t += 86400000; return t; };
      return { rise: fix(s.attributes.next_rising), set: fix(s.attributes.next_setting) };
    }
    // noc podľa času dňa – funguje aj pre zajtrajšie hodiny (východ/západ sa medzi dňami posunú len o pár minút)
    _isNight(t, sun) {
      const md = (x) => { const d = new Date(x); return d.getHours() * 60 + d.getMinutes(); };
      if (!sun || sun.rise == null || sun.set == null) { const h = new Date(t).getHours(); return h < 6 || h >= 19; }
      const m = md(t); return m < md(sun.rise) || m > md(sun.set);
    }
    _hm(t) { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
    // priemer do košov (min) – krokový priebeh
    _bins(pts, t0, t1, step) {
      const out = []; if (!pts.length) return out; let k = 0, last = null;
      for (let a = t0; a < t1; a += step) {
        const b = Math.min(t1, a + step); let sum = 0, w = 0, t = a;
        while (k < pts.length && pts[k][0] <= a) { last = pts[k][1]; k++; }
        let j = k;
        while (j < pts.length && pts[j][0] < b) { if (last != null) { sum += last * (pts[j][0] - t); w += pts[j][0] - t; } t = pts[j][0]; last = pts[j][1]; j++; }
        if (last != null) { sum += last * (b - t); w += b - t; }
        k = j; out.push([a + (b - a) / 2, w ? sum / w : null]);
      }
      return out;
    }

    // hodinový pás: dnes od polnoci do „teraz + 24 h“ (posúva sa doprava), s východom/západom slnka
    _strip() {
      const c = this._cfg, fc = this._fc || {}, H = this._hist || { temp: [], cond: [], pv: [] }, now = Date.now(), HR = 3600000;
      const d0 = new Date(); d0.setHours(0, 0, 0, 0); const t0 = d0.getTime();
      const sun = this._sun(), ws = this._st(c.entity), ts = this._st(c.temperature_sensor);
      const curT = ts && !isNaN(parseFloat(ts.state)) ? parseFloat(ts.state) : ws && ws.attributes.temperature;
      const hourly = (fc.hourly || []).map((f) => ({ t: Date.parse(f.datetime), f })).filter((x) => !isNaN(x.t));
      // uplynulé hodiny: história (alebo uložená predpoveď z rána)
      const C = this._cached(), cpts = Object.keys(C).map((k) => [+k, C[k]]).filter((x) => x[0] < now).sort((a, b) => a[0] - b[0]);
      const pastT = (H.temp.length ? H.temp : cpts.filter((x) => x[1][0] != null).map((x) => [x[0], +x[1][0]])).filter((p) => p[0] <= now).sort((a, b) => a[0] - b[0]);
      const pastC = H.cond.length ? H.cond : cpts.filter((x) => x[1][1]).map((x) => [x[0], x[1][1]]);
      const tAt = (t) => { if (!pastT.length || t < pastT[0][0] - 1800000) return null; let v = null; pastT.forEach((p) => { if (p[0] <= t + 1800000) v = p[1]; }); return v; };
      const cAt = (t) => { let v = null; pastC.forEach((p) => { if (p[0] <= t + 1800000) v = p[1]; }); return v; };
      const fAt = (t) => hourly.find((x) => Math.abs(x.t - t) < 1800000);
      // FVE: predpoveď kWh za hodinu (Solcast 30-min kW × 0,5 h) dnes + zajtra, skutočnosť z histórie výkonu
      const det = [c.solar_today].concat((c.solar_days || []).slice(0, 1)).map((id) => this._st(id)).filter(Boolean)
        .flatMap((s) => s.attributes.detailedForecast || s.attributes.detailed_forecast || []);
      const pvF = {}; det.forEach((x) => { const t = Date.parse(x.period_start), h = Math.floor(t / HR) * HR; pvF[h] = (pvF[h] || 0) + (+(x.pv_estimate != null ? x.pv_estimate : x.pv_estimate50 || 0)) * 0.5; });
      const act = c.solar_power ? this._bins(H.pv, t0, Math.floor(now / HR) * HR, HR) : [];
      const pvA = {}; act.forEach((p) => { if (p[1] != null) pvA[Math.floor(p[0] / HR) * HR] = p[1]; });
      const cols = [], tEnd = Math.floor(now / HR) * HR + 24 * HR;
      for (let t = t0; t <= tEnd; t += HR) {
        const cur = t <= now && now < t + HR, past = t + HR <= now, f = fAt(t);
        const temp = cur && curT != null ? +curT : !past && f && f.f.temperature != null ? +f.f.temperature : tAt(t);
        const cond = cur ? (ws && ws.state) : !past && f ? f.f.condition : cAt(t);
        let rain = '';
        if (!past && f) { const pp = f.f.precipitation_probability, mm = f.f.precipitation; rain = pp != null ? (pp >= 20 ? pp + ' %' : '') : (mm >= 0.1 ? this._nf(mm, 1) + ' mm' : ''); }
        const pv = past && pvA[t] != null ? pvA[t] : pvF[t] != null ? pvF[t] : (past ? pvA[t] : null);
        const dm = new Date(t);
        cols.push({ t, cur, past, temp, cond, rain, pv, real: past && pvA[t] != null, day: !cur && dm.getHours() === 0 && t > t0, lab: cur ? _('Teraz') : dm.getHours() === 0 && t > t0 ? _('Zajtra') : String(dm.getHours()).padStart(2, '0') });
        // východ / západ slnka v tejto hodine
        if (sun) [[sun.rise, 'rise'], [sun.set, 'set'], [sun.rise && sun.rise + 86400000, 'rise'], [sun.set && sun.set + 86400000, 'set']].forEach(([st, k]) => {
          if (st && st >= t && st < t + HR && st <= tEnd) cols.push({ sun: k, t: st, past: st < now, lab: this._hm(st) });
        });
      }
      const html = cols.map((x) => {
        if (x.sun) return `<div class="hc sun${x.past ? ' past' : ''}"><div class="h">${x.lab}</div><i>${x.sun === 'rise' ? SUNRISE : SUNSET}</i><div class="t sm">${x.sun === 'rise' ? _('východ') : _('západ')}</div><div class="r"></div></div>`;
        // prstenec: plný kruh = ring_max kWh za hodinu (predvolene 9)
        const rg = x.pv != null && x.pv >= 0.05 ? Math.max(3, Math.min(100, x.pv / (+this._cfg.ring_max || 9) * 100)) : 0;
        return `<div class="hc${x.cur ? ' now' : ''}${x.past ? ' past' : ''}${x.day ? ' day' : ''}"${x.cur ? ' id="nowc"' : ''}>
          <div class="h">${x.lab}</div><i>${x.cond ? wicon(x.cond, this._isNight(x.t + 1800000, sun)) : ''}${rg ? `<svg class="ring" viewBox="0 0 40 40"><circle class="rt" cx="20" cy="20" r="18"/><circle cx="20" cy="20" r="18" pathLength="100" stroke-dasharray="${rg.toFixed(1)} 100"/></svg><em class="pk">${this._nf(x.pv, x.pv < 10 ? 1 : 0)}</em>` : ''}</i>
          <div class="t">${x.temp != null ? Math.round(x.temp) + '°' : '–'}</div><div class="r">${x.rain}</div></div>`;
      }).join('');
      return { html, rain: hourly };
    }
    _toNow(smooth) {
      const sw = this.shadowRoot && this.shadowRoot.getElementById('sw'), nc = this.shadowRoot && this.shadowRoot.getElementById('nowc');
      if (!sw || !nc || !sw.clientWidth) return;
      this._autoScroll = true; this._scrolledAt = 0;
      sw.scrollTo({ left: Math.max(0, nc.offsetLeft - 12 - 50), behavior: smooth ? 'smooth' : 'auto' });
      setTimeout(() => { this._autoScroll = false; }, smooth ? 800 : 50);
    }
    // posúvanie ťahaním myšou (dotyk a touchpad fungujú natívne)
    _dragBind(sw) {
      // po návrate na dashboard (karta bola skrytá) skočí späť na „Teraz“
      if (window.ResizeObserver) {
        let w = sw.clientWidth;
        new ResizeObserver(() => { const nw = sw.clientWidth; if (nw > 0 && w === 0) this._toNow(false); w = nw; }).observe(sw);
      }
      let x0 = 0, s0 = 0, on = false, moved = false;
      // po 20 s bez posúvania sa pás plynulo vráti na „Teraz“
      sw.addEventListener('scroll', () => {
        if (this._autoScroll) return;
        this._scrolledAt = Date.now(); clearTimeout(this._backT);
        this._backT = setTimeout(() => this._toNow(true), 20000);
      }, { passive: true });
      sw.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; on = true; moved = false; x0 = e.clientX; s0 = sw.scrollLeft; });
      sw.addEventListener('pointermove', (e) => { if (!on) return; const dx = e.clientX - x0; if (Math.abs(dx) > 4) { moved = true; sw.classList.add('drag'); } sw.scrollLeft = s0 - dx; });
      const end = () => { on = false; sw.classList.remove('drag'); };
      sw.addEventListener('pointerup', end); sw.addEventListener('pointerleave', end);
      sw.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);
    }

    /* ---------- vykreslenie ---------- */
    _render() {
      if (!this._hass || !this._cfg) return;
      const c = this._cfg, ws = this._st(c.entity);
      const ids = [c.entity, c.temperature_sensor, c.solar_today, c.solar_remaining, c.solar_power, 'sun.sun'].concat(c.solar_days || []);
      const sig = ids.map((id) => { const s = this._st(id); return s ? s.state + (s.last_updated || '') : '-'; }).join('|') + Math.floor(Date.now() / 300000);
      if (this._built && sig === this._sig) return;
      this._sig = sig;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      if (!this._built) {
        this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card><div id="c"></div></ha-card>`;
        this._card = this.shadowRoot.querySelector('ha-card'); this._built = true;
        if (c.collapsible !== false) { if (this._col == null) this._col = this._ls(); } else this._col = false;
        this._card.classList.toggle('col', !!this._col);
        this._card.addEventListener('click', (e) => {
          const t = e.target.closest('[data-more]');
          if (t) { this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: t.dataset.more }, bubbles: true, composed: true })); return; }
          if (e.target.closest('.top') && c.collapsible !== false) {
            this._col = !this._col; this._card.classList.toggle('col', this._col); this._ls(this._col);
            this.dispatchEvent(new Event('iron-resize', { bubbles: true, composed: true }));
          }
        });
      }
      const box = this.shadowRoot.getElementById('c');
      if (!ws) { box.innerHTML = `<div class="msg">Entita ${esc(c.entity)} neexistuje.</div>`; return; }
      const a = ws.attributes, fc = this._fc || {}, now = Date.now(), sun = this._sun();
      const ts = this._st(c.temperature_sensor), curT = ts && !isNaN(parseFloat(ts.state)) ? parseFloat(ts.state) : a.temperature;
      const tu = (ts && ts.attributes.unit_of_measurement) || a.temperature_unit || '°C';
      // dnešné max/min a ďalšie dni z dennej predpovede
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const daily = (fc.daily || []).map((f) => ({ t: Date.parse(f.datetime), f })).filter((x) => !isNaN(x.t));
      const dToday = daily.find((x) => new Date(x.t).toDateString() === today.toDateString());
      const next = daily.filter((x) => x.t >= today.getTime() + 86400000 - 3600000 && new Date(x.t).toDateString() !== today.toDateString()).slice(0, 3);
      const ch = this._strip();
      const night = this._isNight(now, sun);
      // FVE dnes
      const so = this._st(c.solar_today), sr = this._st(c.solar_remaining);
      const kwh = (s) => { if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v * (/^Wh$/i.test(s.attributes.unit_of_measurement || '') ? 0.001 : 1); };
      const pvT = kwh(so), pvR = kwh(sr);
      // ďalšie dni
      const dkwh = (c.solar_days || []).map((id) => kwh(this._st(id)));
      const dmax = Math.max(1, ...dkwh.filter((v) => v != null), pvT || 0);
      const rows = (dToday ? [dToday] : []).concat(next), today1 = !!dToday;
      const lows = rows.map((x) => x.f.templow != null ? x.f.templow : x.f.temperature).concat(curT != null && today1 ? [+curT] : []), highs = rows.map((x) => x.f.temperature).concat(curT != null && today1 ? [+curT] : []);
      const gmin = Math.min(...lows), gmax = Math.max(...highs), gr = Math.max(1, gmax - gmin);
      const days = rows.map((x, j) => {
        const isT = today1 && j === 0, i = today1 ? j - 1 : j;
        const f = x.f, d = new Date(x.t), lo2 = f.templow != null ? f.templow : f.temperature, hi2 = f.temperature, l = (lo2 - gmin) / gr * 100, w = Math.max(3, (hi2 - lo2) / gr * 100);
        const nm = isT ? _('Dnes') : (LANG === 'sk' ? ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])[d.getDay()];
        const pr = f.precipitation_probability != null ? (f.precipitation_probability >= 20 ? f.precipitation_probability + ' %' : '') : (f.precipitation >= 0.5 ? this._nf(f.precipitation, f.precipitation < 10 ? 1 : 0) + ' mm' : '');
        const pv = isT ? pvT : dkwh[i], pid = isT ? c.solar_today : c.solar_days && c.solar_days[i];
        const dot = isT && curT != null ? `<em style="left:${((curT - gmin) / gr * 100).toFixed(1)}%"></em>` : '';
        return `<div class="d"><span class="n">${esc(nm)}${pr ? `<small>${pr}</small>` : ''}</span><span class="wi">${wicon(isT ? ws.state : f.condition, isT && night)}</span>
          <span class="lo">${Math.round(lo2)}°</span><div class="rb"><i style="left:${l.toFixed(1)}%;width:${Math.min(100 - l, w).toFixed(1)}%;background:linear-gradient(90deg,${tcol(lo2)},${tcol(hi2)})"></i>${dot}</div><span class="hi">${Math.round(hi2)}°</span>
          <span class="pv"${pid ? ` data-more="${pid}"` : ''}>${pv != null ? `${this._nf(pv, 1)}<small>kWh</small><u><i style="width:${Math.min(100, pv / dmax * 100).toFixed(0)}%"></i></u>` : ''}</span></div>`;
      }).join('');
      const html = `
        <div class="top"><span class="ic">${wicon(ws.state, night)}</span><span class="ttl">${esc(c.title || _('Počasie'))}</span>${c.collapsible !== false ? `<span class="chev">${ui(UI.chev)}</span>` : ''}</div>
        <div class="box gb">
          <div class="sw" id="sw"><div class="strip">${ch.html}</div></div>
        </div>
        ${days ? `<div class="box xp">${days}</div>` : ''}`;
      if (box.__h !== html) {
        const old = this.shadowRoot.getElementById('sw'), sl = old ? old.scrollLeft : null;
        box.__h = html; box.innerHTML = html;
        const sw = this.shadowRoot.getElementById('sw');
        if (sw) {
          // pri prvom zobrazení (alebo po minúte bez posúvania) skočí na „Teraz“, inak ostane kde bol
          const nc = this.shadowRoot.getElementById('nowc');
          if (sl != null && Date.now() - (this._scrolledAt || 0) < 60000) sw.scrollLeft = sl;
          else requestAnimationFrame(() => this._toNow(false));
          this._dragBind(sw);
        }
      }
    }
  }

  /* ================= Editor ================= */
  class HomeWeatherCardEditor extends HTMLElement {
    setConfig(c) { this._cfg = Object.assign({}, c); if (this._f) this._f.data = this._data(); }
    _data() { const c = this._cfg || {}; return Object.assign({ collapsible: true, collapsed: true }, c); }
    set hass(h) { setLang(h);
      this._hass = h;
      if (!this._f) {
        const f = this._f = document.createElement('ha-form');
        const sens = (n) => ({ name: n, selector: { entity: { domain: ['sensor', 'input_number', 'number'] } } });
        f.schema = [
          { name: 'entity', required: true, selector: { entity: { domain: 'weather' } } },
          { name: 'title', selector: { text: {} } },
          sens('temperature_sensor'),
          { type: 'expandable', name: '', title: _('Predpoveď výroby FVE (Solcast)'), icon: 'mdi:solar-power-variant', expanded: true, schema: [
            sens('solar_today'), sens('solar_remaining'), { name: 'solar_days', selector: { entity: { domain: 'sensor', multiple: true } } }, sens('solar_power'), { name: 'ring_max', selector: { number: { min: 1, max: 50, step: 0.5, mode: 'box', unit_of_measurement: 'kWh' } } }] },
          { type: 'grid', name: '', schema: [{ name: 'collapsible', selector: { boolean: {} } }, { name: 'collapsed', selector: { boolean: {} } }] }
        ];
        const L = { entity: _('Entita počasia'), title: _('Miesto (voliteľné)'), temperature_sensor: _('Vonkajší teplomer (voliteľné)'), solar_today: _('Predpoveď na dnes'), solar_remaining: _('Zostáva dnes'),
          solar_days: _('Predpoveď na ďalšie dni (zajtra, +2, +3)'), solar_power: _('Skutočná výroba – výkon (voliteľné)'), collapsible: _('Zbaliteľná'), collapsed: _('Na začiatku zbalená'), ring_max: _('Plný prstenec (kWh za hodinu)') };
        const Hh = { entity: _('Napr. Met.no alebo Open-Meteo – musí vedieť hodinovú a dennú predpoveď.'), title: _('Zobrazí sa pod stavom počasia. Prázdne = názov entity.'),
          temperature_sensor: _('Ak ho máš, karta ukáže jeho teplotu a dnešný priebeh namiesto údajov z predpovede.'),
          solar_today: _('Solcast „forecast today“ – z atribútu detailedForecast sa kreslí krivka.'), solar_days: _('V poradí zajtra, pozajtra, popozajtra.'),
          solar_power: _('Uplynulá časť dňa sa nakreslí sýtou farbou podľa skutočnosti.'), collapsed: _('Zbalená ukazuje len hlavičku a graf dňa.') };
        f.computeLabel = (x) => L[x.name] || x.title || x.name;
        f.computeHelper = (x) => Hh[x.name];
        f.addEventListener('value-changed', (e) => {
          const v = e.detail.value, c = { type: (this._cfg && this._cfg.type) || 'custom:igy-weather-card' };
          Object.keys(v).forEach((k) => { if (k === 'type' || v[k] === '' || v[k] == null || (Array.isArray(v[k]) && !v[k].length)) return; if ((k === 'collapsible' || k === 'collapsed') && v[k] === true) return; c[k] = v[k]; });
          this._cfg = c;
          this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: c }, bubbles: true, composed: true }));
        });
        this.appendChild(f);
      }
      this._f.hass = h; this._f.data = this._data();
    }
  }

  if (!customElements.get('igy-weather-card-editor')) customElements.define('igy-weather-card-editor', HomeWeatherCardEditor);
  if (!customElements.get('igy-weather-card')) customElements.define('igy-weather-card', HomeWeatherCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-weather-card'))
    window.customCards.push({ type: 'igy-weather-card', name: 'Igy Weather Card', description: _('Počasie s grafom dňa a predpoveďou výroby FVE (Solcast).'), preview: true });
  console.info('%c IGY-WEATHER-CARD %c ' + VERSION + ' ', 'background:#64b5ff;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();
