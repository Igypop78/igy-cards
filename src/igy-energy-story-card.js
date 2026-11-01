/*
 * Igy Energy Story Card – príbeh energie domu v štýle Apple: rok / mesiac / deň.
 *
 *   type: custom:igy-energy-story-card
 *   title: Energia domu            # voliteľné
 *   view: year                     # year | month | day – úvodné zobrazenie
 *   compare: true                  # porovnanie s rovnakým obdobím minulý rok
 *   ev_km_per_kwh: 6               # zaujímavosť: koľko km by prešlo elektroauto
 *   stat_solar, stat_grid_in, stat_grid_out, stat_battery_in, stat_battery_out, stat_gas, stat_water,
 *   cost_grid_in, cost_grid_out, cost_gas, cost_water   # voliteľné – inak z Energy dashboardu
 *
 * Dáta sú z dlhodobých štatistík HA (rovnaké ako Energy dashboard). Ťuknutím na stĺpec
 * sa prejde z roka na mesiac a z mesiaca na deň. Najlepšie vyzerá v zobrazení „Panel“.
 */
(function () {
  'use strict';
  let LANG = String((typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || (typeof navigator !== 'undefined' && navigator.language) || 'en').slice(0, 2).toLowerCase();
  const setLang = (h) => { const l = h && ((h.locale && h.locale.language) || h.language); if (l) LANG = String(l).slice(0, 2).toLowerCase(); };
  const _ = (s, ...a) => { let r = LANG === 'sk' ? s : (EN[s] != null ? EN[s] : s); a.forEach((v, i) => { r = r.split('{' + i + '}').join(v); }); return r; };
  const EN = {
    'Energia domu': 'Home energy', 'Rok': 'Year', 'Mesiac': 'Month', 'Deň': 'Day', 'Dnes': 'Today',
    'Vyrobilo slnko': 'Solar produced', 'Spotreba domu': 'Home used', 'Bilancia elektriny': 'Electricity balance',
    'FVE pokryla': 'Solar covered', 'zo spotreby': 'of consumption', 'oproti': 'vs.',
    'Kam tiekla energia': 'Where the energy went', 'Slnko': 'Solar', 'Sieť': 'Grid', 'Batéria': 'Battery', 'Dom': 'Home',
    'nákup': 'import', 'predaj': 'export', 'vybíjanie': 'discharge', 'nabíjanie': 'charge',
    'Spotreba v čase': 'Usage over time', 'zo slnka': 'from solar', 'z batérie': 'from battery', 'zo siete': 'from grid',
    'predaj do siete': 'export to grid', 'minulý rok': 'last year', 'Ťukni na stĺpec pre detail': 'Tap a bar for details',
    'Peniaze': 'Money', 'Nákup elektriny': 'Electricity bought', 'Predaj elektriny': 'Electricity sold',
    'Hodnota vlastnej výroby': 'Value of own solar', 'koľko by stála zo siete': 'what it would cost from the grid',
    'Plyn': 'Gas', 'Voda': 'Water', 'Spolu za energie': 'Total for energy', 'zarobené': 'earned', 'zaplatené': 'paid',
    'Plyn a voda': 'Gas & water', 'najviac': 'peak', 'Zaujímavosti': 'Highlights',
    'Najslnečnejší': 'Sunniest', 'Elektroauto by z výroby prešlo': 'An EV could drive on this solar',
    'Batéria prečerpala': 'The battery cycled', 'Do siete išlo': 'Sent to the grid', 'z výroby': 'of production',
    'Načítavam…': 'Loading…', 'Dáta sa nepodarilo načítať.': 'Could not load data.',
    'V Energy dashboarde nie sú nastavené žiadne zdroje.': 'No sources are configured in the Energy dashboard.',
    'Za toto obdobie nie sú dáta.': 'No data for this period.',
    'Príbeh energie domu – toky, peniaze, plyn a voda za rok, mesiac aj deň': 'Your home energy story – flows, money, gas and water by year, month and day',
    'Nadpis karty': 'Card title', 'Úvodné zobrazenie': 'Initial view', 'Porovnanie s minulým rokom': 'Compare with last year',
    'Elektroauto – km na 1 kWh': 'EV – km per 1 kWh', 'Štatistiky (prázdne = z Energy dashboardu)': 'Statistics (empty = from the Energy dashboard)',
    'Výroba FVE (kWh)': 'Solar production (kWh)', 'Odber zo siete (kWh)': 'Grid import (kWh)', 'Dodávka do siete (kWh)': 'Grid export (kWh)',
    'Energia do batérie (kWh)': 'Energy into battery (kWh)', 'Energia z batérie (kWh)': 'Energy out of battery (kWh)',
    'Spotreba plynu': 'Gas consumption', 'Spotreba vody': 'Water consumption', 'Náklad na odber': 'Import cost',
    'Príjem z dodávky': 'Export compensation', 'Náklad na plyn': 'Gas cost', 'Náklad na vodu': 'Water cost',
    'km': 'km', 'cyklov': 'cycles', 'kWh': 'kWh'
  };
  const COL = { sol: '#ff9f0a', bat: '#40c8e0', imp: '#ff6961', exp: '#30d158', home: '#5e5ce6', gas: '#ff9500', wat: '#0a84ff', money: '#30d158' };
  const IC = {
    sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
    bat: 'M3 7h15a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM23 11v2',
    grid: 'M8 22l4-20 4 20M6 8h12M5 13h14M9.5 13L12 22l2.5-9',
    home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    gas: 'M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1.5 2-2 3-3 3s-1.5-2-1-5C7 6 5 10 5 15a7 7 0 0 0 7 7z',
    wat: 'M12 2.7c-3.3 4.2-6 7.6-6 11a6 6 0 0 0 12 0c0-3.4-2.7-6.8-6-11z',
    eur: 'M18 7a7 7 0 1 0 0 10M4 10h10M4 14h10',
    car: 'M5 17h14M6 17v2M18 17v2M3 13l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4H3zM7 13h.01M17 13h.01',
    spark: 'M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.6L5.7 21 8 13.8 2 9.2h7.6z',
    cyc: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5'
  };
  const svg = (p, c) => `<svg viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></svg>`;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEYS = ['sol', 'gin', 'gout', 'bin', 'bout', 'gas', 'wat', 'cin', 'cout', 'cgas', 'cwat'];
  const FLOW = ['s2h', 's2b', 's2g', 'g2h', 'g2b', 'b2h', 'b2g'];
  const zero = () => { const o = {}; KEYS.concat(FLOW).forEach((k) => { o[k] = 0; }); return o; };
  const RM = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // rozdelenie energie v jednom intervale (hodina / deň) na toky
  function split(o) {
    const s = Math.max(0, o.sol), gi = Math.max(0, o.gin), go = Math.max(0, o.gout), bi = Math.max(0, o.bin), bo = Math.max(0, o.bout);
    const s2g = Math.min(go, s), s2b = Math.min(bi, s - s2g), s2h = Math.max(0, s - s2g - s2b);
    const b2g = Math.min(Math.max(0, go - s2g), bo), g2b = Math.max(0, bi - s2b), b2h = Math.max(0, bo - b2g), g2h = Math.max(0, gi - g2b);
    return { s2h, s2b, s2g, g2h, g2b, b2h, b2g };
  }

  class IgyEnergyStoryCard extends HTMLElement {
    static getConfigElement() { return document.createElement('igy-energy-story-card-editor'); }
    static getStubConfig() { return { view: 'year' }; }
    setConfig(c) {
      this._cfg = Object.assign({ view: 'year', compare: true, ev_km_per_kwh: 6 }, c || {});
      this._mode = ['year', 'month', 'day'].includes(this._cfg.view) ? this._cfg.view : 'year';
      this._at = new Date(); this._ids = null; this._cache = {};
      if (this.shadowRoot) this._render();
    }
    set hass(h) {
      const first = !this._hass; this._hass = h; setLang(h);
      if (first) { this._render(); this._load(); }
    }
    connectedCallback() { if (this._hass && !this._t) this._t = setInterval(() => { if (this._isNow()) { this._cache = {}; this._load(true); } }, 10 * 60000); }
    disconnectedCallback() { clearInterval(this._t); this._t = null; }
    getCardSize() { return 16; }
    getGridOptions() { return { columns: 'full', min_columns: 6 }; }
    _lang() { return (this._hass && this._hass.locale && this._hass.locale.language) || undefined; }
    _nf(v, d) { return (isFinite(v) ? v : 0).toLocaleString(this._lang(), { minimumFractionDigits: d, maximumFractionDigits: d }); }
    _E(kwh, unit) {   // energia: kWh / MWh
      const a = Math.abs(kwh || 0);
      if (!unit && a >= 1000) return [this._nf(a / 1000, a >= 10000 ? 1 : 2), 'MWh'];
      return [this._nf(a, a < 10 ? 1 : 0), unit || 'kWh'];
    }
    _eur(v, d) {
      const cur = (this._hass && this._hass.config && this._hass.config.currency) || 'EUR', a = Math.abs(v || 0);
      const dd = d != null ? d : a >= 100 ? 0 : 2;
      return a.toLocaleString(this._lang(), { style: 'currency', currency: cur, minimumFractionDigits: dd, maximumFractionDigits: dd });
    }

    /* ---------- obdobia ---------- */
    _range(mode, at) {
      const Y = at.getFullYear(), M = at.getMonth(), D = at.getDate(), lang = this._lang();
      let a, b, per, N, idx, lab, sub;
      if (mode === 'year') {
        a = new Date(Y, 0, 1); b = new Date(Y + 1, 0, 1); per = 'day'; N = 12; idx = (t) => new Date(t).getMonth(); lab = String(Y);
        sub = (i) => new Date(Y, i, 1).toLocaleDateString(lang, { month: 'short' }).replace('.', '');
      } else if (mode === 'month') {
        a = new Date(Y, M, 1); b = new Date(Y, M + 1, 1); per = 'day'; N = Math.round((b - a) / 86400000); idx = (t) => new Date(t).getDate() - 1;
        lab = a.toLocaleDateString(lang, { month: 'long', year: 'numeric' }); sub = (i) => (i % 5 === 0 || i === N - 1 ? String(i + 1) : '');
      } else {
        a = new Date(Y, M, D); b = new Date(Y, M, D + 1); per = 'hour'; N = 24; idx = (t) => new Date(t).getHours();
        lab = a.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); sub = (i) => (i % 3 === 0 ? String(i) : '');
      }
      lab = lab.charAt(0).toUpperCase() + lab.slice(1);
      return { mode, a, b, per, N, idx, lab, sub };
    }
    _isNow() { const r = this._range(this._mode, this._at), n = Date.now(); return r.a <= n && n < r.b; }
    _shift(dir) {
      const a = this._at, m = this._mode;
      this._at = m === 'year' ? new Date(a.getFullYear() + dir, 0, 1) : m === 'month' ? new Date(a.getFullYear(), a.getMonth() + dir, 1) : new Date(a.getFullYear(), a.getMonth(), a.getDate() + dir);
    }

    /* ---------- dáta ---------- */
    async _getIds() {
      const c = this._cfg, h = this._hass;
      const prefs = await h.callWS({ type: 'energy/get_prefs' }).catch(() => ({}));
      const info = await h.callWS({ type: 'energy/info' }).catch(() => ({}));
      const cs = info.cost_sensors || {}, ids = {}; KEYS.forEach((k) => { ids[k] = []; });
      (prefs.energy_sources || []).forEach((s) => {
        if (s.type === 'solar' && s.stat_energy_from) ids.sol.push(s.stat_energy_from);
        if (s.type === 'battery') { if (s.stat_energy_from) ids.bout.push(s.stat_energy_from); if (s.stat_energy_to) ids.bin.push(s.stat_energy_to); }
        if (s.type === 'grid') {
          (s.flow_from || (s.stat_energy_from ? [s] : [])).forEach((f) => { if (f.stat_energy_from) ids.gin.push(f.stat_energy_from); const k = f.stat_cost || cs[f.stat_energy_from]; if (k) ids.cin.push(k); });
          (s.flow_to || (s.stat_energy_to ? [s] : [])).forEach((f) => { if (f.stat_energy_to) ids.gout.push(f.stat_energy_to); const k = f.stat_compensation || cs[f.stat_energy_to]; if (k) ids.cout.push(k); });
        }
        if (s.type === 'gas' && s.stat_energy_from) { ids.gas.push(s.stat_energy_from); const k = s.stat_cost || cs[s.stat_energy_from]; if (k) ids.cgas.push(k); }
        if (s.type === 'water' && s.stat_energy_from) { ids.wat.push(s.stat_energy_from); const k = s.stat_cost || cs[s.stat_energy_from]; if (k) ids.cwat.push(k); }
      });
      const O = { sol: 'stat_solar', gin: 'stat_grid_in', gout: 'stat_grid_out', bin: 'stat_battery_in', bout: 'stat_battery_out', gas: 'stat_gas', wat: 'stat_water', cin: 'cost_grid_in', cout: 'cost_grid_out', cgas: 'cost_gas', cwat: 'cost_water' };
      Object.keys(O).forEach((k) => { if (c[O[k]]) ids[k] = [c[O[k]]]; });
      ids.unit = {};
      const u = ids.gas.concat(ids.wat);
      if (u.length) (await h.callWS({ type: 'recorder/get_statistics_metadata', statistic_ids: u }).catch(() => [])).forEach((m) => { ids.unit[m.statistic_id] = m.statistics_unit_of_measurement || ''; });
      const gu = ids.gas.length ? ids.unit[ids.gas[0]] || 'kWh' : 'kWh';
      ids.gasU = /^[kMG]?Wh$/.test(gu) || /^[MG]J$/.test(gu) ? 'kWh' : 'm³';
      return ids;
    }
    async _compute(mode, at, cut) {
      const key = mode + ':' + at.toDateString() + ':' + (cut ? Math.floor(cut / 3600000) : '');
      if (this._cache[key]) return this._cache[key];
      const r = this._range(mode, at), ids = this._ids, h = this._hass;
      const all = [...new Set([].concat(...KEYS.map((k) => ids[k])))];
      const d = { r, b: Array.from({ length: r.N }, zero), t: zero(), any: false };
      if (!all.length || r.a > Date.now()) return d;
      const q = (a, b, per) => h.callWS({ type: 'recorder/statistics_during_period', start_time: a.toISOString(), end_time: b.toISOString(), statistic_ids: all, period: per, types: ['change'], units: { energy: 'kWh', volume: 'm³' } });
      // vždy hodinové dáta – z denných súčtov sa nedá určiť, či sa predávalo zo slnka alebo z batérie
      const parts = [];
      if (mode === 'year') for (let m = 0; m < 12; m++) parts.push([new Date(r.a.getFullYear(), m, 1), new Date(r.a.getFullYear(), m + 1, 1)]);
      else parts.push([r.a, r.b]);
      const res = {}, now = Date.now();
      (await Promise.all(parts.filter(([a]) => a.getTime() <= now).map(([a, b]) => q(a, b, 'hour')))).forEach((o) => {
        Object.keys(o || {}).forEach((id) => { res[id] = (res[id] || []).concat(o[id]); });
      });
      if (r.a <= now && now < r.b) {   // rozpracovaná hodina z 5-min štatistík
        const h0 = new Date(); h0.setMinutes(0, 0, 0);
        const p5 = await q(h0, new Date(now + 60000), '5minute').catch(() => ({}));
        Object.keys(p5 || {}).forEach((id) => { res[id] = (res[id] || []).concat(p5[id]); });
      }
      // hodnoty po riadkoch (deň / hodina), potom toky a zoskupenie
      const rows = new Map(), owner = {};
      KEYS.forEach((k) => ids[k].forEach((id) => { (owner[id] = owner[id] || []).push(k); }));
      Object.keys(res || {}).forEach((id) => (res[id] || []).forEach((x) => {
        if (x.change == null || !owner[id]) return;
        let t = typeof x.start === 'number' ? x.start : Date.parse(x.start);
        if (cut && t >= cut) return;
        { const dt = new Date(t); dt.setMinutes(0, 0, 0); t = dt.getTime(); }
        if (!rows.has(t)) rows.set(t, zero());
        owner[id].forEach((k) => { rows.get(t)[k] += x.change; });
      }));
      rows.forEach((o, t) => {
        const i = r.idx(t); if (i < 0 || i >= r.N) return;
        const f = split(o), B = d.b[i];
        KEYS.forEach((k) => { B[k] += Math.max(0, o[k]); });
        ['cin', 'cout', 'cgas', 'cwat'].forEach((k) => { B[k] += o[k] - Math.max(0, o[k]); });   // náklady môžu byť aj záporné
        FLOW.forEach((k) => { B[k] += f[k]; });
        d.any = true;
      });
      d.b.forEach((B) => { B.home = B.s2h + B.b2h + B.g2h; KEYS.concat(FLOW, ['home']).forEach((k) => { d.t[k] = (d.t[k] || 0) + B[k]; }); });
      d.has = {}; KEYS.forEach((k) => { d.has[k] = ids[k].length > 0; });
      if (r.b <= now || cut) this._cache[key] = d;
      return d;
    }
    async _load(silent) {
      const seq = (this._seq = (this._seq || 0) + 1);
      if (!silent) this._state('loading');
      try {
        if (!this._ids) this._ids = await this._getIds();
        const m = this._mode, at = this._at;
        const cur = await this._compute(m, at);
        let prev = null;
        if (this._cfg.compare !== false && m !== 'day') {
          const pa = new Date(at); pa.setFullYear(at.getFullYear() - 1);
          // bežiace obdobie: minulý rok len do rovnakého dňa a hodiny
          let cut = null;
          if (this._isNow()) { const c = new Date(); c.setFullYear(c.getFullYear() - 1); cut = c.getTime(); }
          prev = await this._compute(m, pa, cut).catch(() => null);
        }
        if (seq !== this._seq) return;
        this._d = cur; this._p = prev && prev.any ? prev : null;
        this._draw();
      } catch (e) {
        console.error('igy-energy-story-card', e);
        if (seq === this._seq) this._state('error');
      }
    }

    /* ---------- vykreslenie ---------- */
    _render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card><div class="wrap" id="w">
        <header><div class="tt"><h1>${esc(this._cfg.title || _('Energia domu'))}</h1><div class="lab" id="lab"></div></div>
        <div class="ctl"><div class="seg" id="seg">${[['year', _('Rok')], ['month', _('Mesiac')], ['day', _('Deň')]].map(([k, t]) => `<b data-m="${k}">${t}</b>`).join('')}</div>
        <div class="nav"><i data-n="-1">${svg('M15 18l-6-6 6-6')}</i><i data-n="0" class="now">${_('Dnes')}</i><i data-n="1" id="nx">${svg('M9 18l6-6-6-6')}</i></div></div></header>
        <div id="body"></div></div></ha-card>`;
      const R = this.shadowRoot;
      R.getElementById('seg').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (!b || b.dataset.m === this._mode) return; this._mode = b.dataset.m; if (this._isFuture()) this._at = new Date(); this._load(); });
      R.querySelector('.nav').addEventListener('click', (e) => {
        const b = e.target.closest('[data-n]'); if (!b || b.classList.contains('dis')) return;
        const n = +b.dataset.n; if (n === 0) this._at = new Date(); else this._shift(n); this._load();
      });
      R.getElementById('body').addEventListener('click', (e) => {
        const b = e.target.closest('[data-i]'); if (!b || this._mode === 'day') return;
        const i = +b.dataset.i, a = this._at;
        if (this._mode === 'year') { this._mode = 'month'; this._at = new Date(a.getFullYear(), i, 1); }
        else { this._mode = 'day'; this._at = new Date(a.getFullYear(), a.getMonth(), i + 1); }
        if (this._isFuture()) return;
        this._load(); this.shadowRoot.getElementById('w').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
      });
      this._head();
    }
    _isFuture() { return this._range(this._mode, this._at).a > Date.now(); }
    _head() {
      const R = this.shadowRoot; if (!R) return;
      const r = this._range(this._mode, this._at);
      R.getElementById('lab').textContent = r.lab;
      R.querySelectorAll('#seg b').forEach((b) => b.classList.toggle('on', b.dataset.m === this._mode));
      R.getElementById('nx').classList.toggle('dis', r.b > Date.now());
      R.querySelector('.now').classList.toggle('dis', this._isNow());
    }
    _state(s) {
      this._head();
      const B = this.shadowRoot && this.shadowRoot.getElementById('body'); if (!B) return;
      if (s === 'loading') { B.classList.add('ld'); if (!B.innerHTML) B.innerHTML = `<div class="msg">${_('Načítavam…')}</div>`; }
      if (s === 'error') { B.classList.remove('ld'); B.innerHTML = `<div class="msg">${_('Dáta sa nepodarilo načítať.')}</div>`; }
    }
    _delta(cur, prev, good) {   // good: +1 = viac je lepšie, −1 = menej je lepšie
      if (!this._p || !(Math.abs(prev) > 0.01)) return '';
      const p = (cur - prev) / Math.abs(prev) * 100, up = p >= 0, ok = good === 0 ? null : (up ? good > 0 : good < 0);
      const cls = ok == null ? '' : ok ? 'g' : 'b';
      return `<span class="dl ${cls}">${up ? '▲' : '▼'} ${this._nf(Math.abs(p), Math.abs(p) < 10 ? 1 : 0)} %<em> ${_('oproti')} ${this._range(this._mode, this._p.r.a).lab}</em></span>`;
    }
    _draw() {
      this._head();
      const B = this.shadowRoot.getElementById('body'); B.classList.remove('ld');
      const d = this._d, ids = this._ids;
      if (!KEYS.some((k) => ids[k].length)) { B.innerHTML = `<div class="msg">${_('V Energy dashboarde nie sú nastavené žiadne zdroje.')}</div>`; return; }
      if (!d.any) { B.innerHTML = `<div class="msg">${_('Za toto obdobie nie sú dáta.')}</div>`; return; }
      const t = d.t, P = this._p ? this._p.t : null;
      const solShare = t.home > 0 ? (t.s2h + (t.s2b + t.g2b > 0 ? t.b2h * t.s2b / (t.s2b + t.g2b) : 0)) / t.home : 0;
      const pSolShare = P && P.home > 0 ? (P.s2h + (P.s2b + P.g2b > 0 ? P.b2h * P.s2b / (P.s2b + P.g2b) : 0)) / P.home : 0;
      const bal = (d.has.cout ? t.cout : 0) - (d.has.cin ? t.cin : 0), pbal = P ? P.cout - P.cin : 0;
      const hasMoney = d.has.cin || d.has.cout;
      const [sv, su] = this._E(t.sol), [hv, hu] = this._E(t.home);
      let h = `<section class="hero">
        <div class="k sol"><div class="ic">${svg(IC.sun)}</div><div class="cap">${_('Vyrobilo slnko')}</div><div class="v"><b data-c="${t.sol}">${sv}</b><small>${su}</small></div>${this._delta(t.sol, P && P.sol, 1)}</div>
        <div class="k home"><div class="ic">${svg(IC.home)}</div><div class="cap">${_('Spotreba domu')}</div><div class="v"><b>${hv}</b><small>${hu}</small></div>${this._delta(t.home, P && P.home, -1)}</div>
        ${hasMoney ? `<div class="k mon ${bal >= 0 ? 'pos' : 'neg'}"><div class="ic">${svg(IC.eur)}</div><div class="cap">${_('Bilancia elektriny')}</div><div class="v"><b>${bal >= 0 ? '+' : '−'}${this._eur(bal, Math.abs(bal) >= 100 ? 0 : null)}</b></div>${this._delta(bal, P ? pbal : null, 1)}</div>` : ''}
        <div class="k ring"><svg viewBox="0 0 120 120" class="rg"><circle cx="60" cy="60" r="50" class="tr"/><circle cx="60" cy="60" r="50" class="pr" style="stroke-dasharray:${(solShare * 314.16).toFixed(1)} 400"/></svg>
          <div class="rt"><b>${Math.round(solShare * 100)}<small>%</small></b><span>${_('FVE pokryla')}<br>${_('zo spotreby')}</span></div>${this._delta(solShare, P ? pSolShare : null, 1)}</div>
      </section>`;
      h += `<section class="card flow"><h2>${_('Kam tiekla energia')}</h2>${this._sankey(t)}</section>`;
      h += `<section class="card chart"><div class="ch2"><h2>${_('Spotreba v čase')}</h2><div class="lg">${[[_('zo slnka'), COL.sol], [_('z batérie'), COL.bat], [_('zo siete'), COL.imp], [_('predaj do siete'), COL.exp]].map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')}${this._p ? `<span><i class="ghost"></i>${_('minulý rok')}</span>` : ''}</div></div>
        ${this._bars(d)}${this._mode !== 'day' ? `<div class="hint">${_('Ťukni na stĺpec pre detail')}</div>` : ''}</section>`;
      h += this._money(d);
      h += this._utilities(d);
      h += this._facts(d, solShare);
      B.innerHTML = h;
      this._animate();
    }
    _sankey(t) {
      const L = [['sol', _('Slnko'), '', COL.sol, t.sol, IC.sun], ['gin', _('Sieť'), _('nákup'), COL.imp, t.g2h + t.g2b, IC.grid], ['bout', _('Batéria'), _('vybíjanie'), COL.bat, t.b2h + t.b2g, IC.bat]];
      const Rr = [['home', _('Dom'), '', COL.home, t.home, IC.home], ['bin', _('Batéria'), _('nabíjanie'), COL.bat, t.s2b + t.g2b, IC.bat], ['gout', _('Sieť'), _('predaj'), COL.exp, t.s2g + t.b2g, IC.grid]];
      const narrow = (this.shadowRoot.getElementById('w') || this).offsetWidth < 620;
      const W = narrow ? 520 : 1000, H = 400, nw = 14, gap = 26, x0 = narrow ? 24 : 230, x1 = W - x0 - nw;
      const tl = L.reduce((s, x) => s + x[4], 0), tr = Rr.reduce((s, x) => s + x[4], 0), tot = Math.max(tl, tr, 0.001);
      const vis = (arr) => arr.filter((x) => x[4] > tot * 0.002);
      const Lv = vis(L), Rv = vis(Rr), sc = (H - gap * (Math.max(Lv.length, Rv.length) - 1)) / tot;
      const pos = (arr) => { let y = 0, sumh = arr.reduce((s, x) => s + x[4] * sc, 0) + gap * (arr.length - 1); y = (H - sumh) / 2; const o = {}; arr.forEach((x) => { o[x[0]] = { y, h: x[4] * sc, off: 0, c: x[3] }; y += x[4] * sc + gap; }); return o; };
      const PL = pos(Lv), PR = pos(Rv);
      const flows = [['sol', 'home', t.s2h], ['sol', 'bin', t.s2b], ['sol', 'gout', t.s2g], ['gin', 'home', t.g2h], ['gin', 'bin', t.g2b], ['bout', 'home', t.b2h], ['bout', 'gout', t.b2g]];
      let defs = '', bands = '', dots = '';
      flows.forEach(([a, b, v], i) => {
        if (!PL[a] || !PR[b] || v * sc < 0.6) return;
        const hh = v * sc, ya = PL[a].y + PL[a].off, yb = PR[b].y + PR[b].off; PL[a].off += hh; PR[b].off += hh;
        const xa = x0 + nw, xb = x1, cx = (xa + xb) / 2;
        const p = `M${xa},${ya} C${cx},${ya} ${cx},${yb} ${xb},${yb} L${xb},${yb + hh} C${cx},${yb + hh} ${cx},${ya + hh} ${xa},${ya + hh} Z`;
        defs += `<linearGradient id="g${i}" x1="0" x2="1"><stop offset="0" stop-color="${PL[a].c}"/><stop offset="1" stop-color="${PR[b].c}"/></linearGradient>`;
        bands += `<path d="${p}" fill="url(#g${i})" class="band"/>`;
        const m = `M${xa},${ya + hh / 2} C${cx},${ya + hh / 2} ${cx},${yb + hh / 2} ${xb},${yb + hh / 2}`;
        dots += `<path d="${m}" class="dot" style="stroke-width:${Math.max(1.5, Math.min(5, hh * 0.18)).toFixed(1)};animation-duration:${(5 - Math.min(3, hh / 60)).toFixed(1)}s"/>`;
      });
      const node = (o, x) => Object.keys(o).map((k) => `<rect x="${x}" y="${o[k].y.toFixed(1)}" width="${nw}" height="${Math.max(2, o[k].h).toFixed(1)}" rx="7" fill="${o[k].c}"/>`).join('');
      const pct = (v) => Math.round(v / tot * 100);
      const label = (x, side, P) => x.filter((n) => P[n[0]]).map((n) => {
        const p = P[n[0]], cy = p.y + p.h / 2, [v, u] = this._E(n[4]);
        const tx = side === 'L' ? x0 - 16 : x1 + nw + 16, an = side === 'L' ? 'end' : 'start';
        return `<g class="nl" transform="translate(${tx},${cy.toFixed(1)})" text-anchor="${an}"><text class="nn" y="-8">${esc(n[1])}${n[2] ? ` <tspan class="ns">${esc(n[2])}</tspan>` : ''}</text><text class="nv" y="22">${v}<tspan class="nu"> ${u}</tspan><tspan class="np"> · ${pct(n[4])} %</tspan></text></g>`;
      }).join('');
      const legend = (arr, P) => arr.filter((n) => P[n[0]]).map((n) => { const [v, u] = this._E(n[4]); return `<div><i style="background:${n[3]}"></i><span>${esc(n[1])}${n[2] ? ' · ' + esc(n[2]) : ''}</span><b>${v} ${u}</b></div>`; }).join('');
      return `<svg class="sk${narrow ? ' nr' : ''}" viewBox="0 -34 ${W} ${H + 68}" preserveAspectRatio="xMidYMid meet"><defs>${defs}</defs>${bands}${RM ? '' : dots}${node(PL, x0)}${node(PR, x1)}${narrow ? '' : label(Lv, 'L', PL) + label(Rv, 'R', PR)}</svg>
        <div class="skl${narrow ? ' on' : ''}"><div>${legend(Lv, PL)}</div><div>${legend(Rv, PR)}</div></div>`;
    }
    _bars(d) {
      const r = d.r, P = this._p, n = r.N;
      const up = d.b.map((B) => B.s2h + B.b2h + B.g2h), dn = d.b.map((B) => B.s2g + B.b2g);
      const gh = P ? P.b.map((B) => B.s2h + B.b2h + B.g2h) : [];
      const mx = Math.max(0.001, ...up, ...gh), mn = Math.max(0, ...dn);
      const tot = mx + mn, hu = 100 * mx / tot, hd = 100 - hu;   // percentá výšky nad / pod osou
      const now = Date.now();
      const cols = d.b.map((B, i) => {
        const seg = (v, c) => (v > 0 ? `<i style="height:${(v / mx * 100).toFixed(2)}%;background:${c}"></i>` : '');
        const st = r.mode === 'year' ? new Date(r.a.getFullYear(), i, 1) : r.mode === 'month' ? new Date(r.a.getFullYear(), r.a.getMonth(), i + 1) : new Date(r.a.getFullYear(), r.a.getMonth(), r.a.getDate(), i);
        const fut = st.getTime() > now, [tv, tu] = this._E(up[i]), [ev, eu] = this._E(dn[i]);
        const tip = `${tv} ${tu}${dn[i] > 0.05 ? ` · ↑ ${ev} ${eu}` : ''}`;
        return `<div class="col${fut ? ' fut' : ''}" data-i="${i}" title="${esc(tip)}">
          <div class="up" style="height:${hu}%">${gh[i] > 0 ? `<s style="height:${(gh[i] / mx * 100).toFixed(2)}%"></s>` : ''}<div class="stk">${seg(B.s2h, COL.sol)}${seg(B.b2h, COL.bat)}${seg(B.g2h, COL.imp)}</div></div>
          <div class="dn" style="height:${hd}%">${dn[i] > 0 && mn > 0 ? `<i style="height:${(dn[i] / mn * 100).toFixed(2)}%;background:${COL.exp}"></i>` : ''}</div>
          <span class="tip">${esc(tip)}</span></div>`;
      }).join('');
      const labs = d.b.map((_b, i) => `<span>${esc(r.sub(i))}</span>`).join('');
      return `<div class="bars" style="--n:${n}">${cols}</div><div class="xl" style="--n:${n}">${labs}</div>`;
    }
    _money(d) {
      const t = d.t, hs = d.has; if (!(hs.cin || hs.cout || hs.cgas || hs.cwat)) return '';
      const P = this._p ? this._p.t : null;
      const price = t.gin > 0.5 && t.cin > 0 ? t.cin / t.gin : 0;
      const own = (t.s2h + t.s2b) * price;
      const total = (hs.cin ? t.cin : 0) + (hs.cgas ? t.cgas : 0) + (hs.cwat ? t.cwat : 0) - (hs.cout ? t.cout : 0);
      const ptotal = P ? P.cin + P.cgas + P.cwat - P.cout : null;
      const tile = (cls, ic, cap, val, sub, del) => `<div class="m ${cls}"><div class="ic">${svg(ic)}</div><div class="cap">${cap}</div><div class="mv">${val}</div>${sub ? `<div class="ms">${sub}</div>` : ''}${del || ''}</div>`;
      const parts = [[hs.cin, t.cin, COL.imp, _('Nákup elektriny')], [hs.cgas, t.cgas, COL.gas, _('Plyn')], [hs.cwat, t.cwat, COL.wat, _('Voda')]].filter((x) => x[0] && x[1] > 0);
      const sum = parts.reduce((s, x) => s + x[1], 0) || 1;
      let h = `<section class="card money"><h2>${_('Peniaze')}</h2><div class="mt">
        <div class="tot"><div class="cap">${_('Spolu za energie')}</div><div class="tv ${total <= 0 ? 'pos' : ''}">${total <= 0 ? '+' : ''}${this._eur(total, Math.abs(total) >= 100 ? 0 : null)}</div>
          <div class="ms">${total <= 0 ? _('zarobené') : _('zaplatené')}</div>${this._delta(total, ptotal, -1)}
          <div class="stack">${parts.map((x) => `<i style="flex:${x[1].toFixed(2)};background:${x[2]}" title="${esc(x[3])}"></i>`).join('')}</div>
          <div class="sl">${parts.map((x) => `<span><i style="background:${x[2]}"></i>${esc(x[3])} <b>${Math.round(x[1] / sum * 100)} %</b></span>`).join('')}</div></div>
        <div class="tiles">`;
      if (hs.cin) h += tile('neg', IC.grid, _('Nákup elektriny'), '−' + this._eur(t.cin), `${this._E(t.gin).join(' ')}${price ? ' · ' + this._eur(price, 3) + '/kWh' : ''}`, this._delta(t.cin, P && P.cin, -1));
      if (hs.cout) h += tile('pos', IC.grid, _('Predaj elektriny'), '+' + this._eur(t.cout), this._E(t.gout).join(' '), this._delta(t.cout, P && P.cout, 1));
      if (price > 0 && own > 0) h += tile('pos sol', IC.sun, _('Hodnota vlastnej výroby'), '≈ ' + this._eur(own), _('koľko by stála zo siete'), '');
      if (hs.cgas) h += tile('neg', IC.gas, _('Plyn'), '−' + this._eur(t.cgas), this._E(t.gas, this._ids.gasU).join(' '), this._delta(t.cgas, P && P.cgas, -1));
      if (hs.cwat) h += tile('neg', IC.wat, _('Voda'), '−' + this._eur(t.cwat), this._nf(t.wat, 1) + ' m³', this._delta(t.cwat, P && P.cwat, -1));
      return h + '</div></div></section>';
    }
    _utilities(d) {
      const hs = d.has; if (!hs.gas && !hs.wat) return '';
      const P = this._p, r = d.r, gu = this._ids.gasU;
      const card = (k, name, ic, col, unit, dec) => {
        const vals = d.b.map((B) => B[k]), mx = Math.max(0.0001, ...vals), tot = d.t[k], pi = vals.indexOf(Math.max(...vals));
        const pv = P ? P.t[k] : null;
        const peak = mx > 0.0001 ? `${_('najviac')}: ${esc(r.mode === 'year' ? new Date(r.a.getFullYear(), pi, 1).toLocaleDateString(this._lang(), { month: 'long' }) : r.mode === 'month' ? (pi + 1) + '.' : pi + ':00')} · ${this._nf(mx, dec)} ${unit}` : '';
        return `<div class="u" style="--c:${col}"><div class="uh"><div class="ic">${svg(ic)}</div><div><div class="cap">${name}</div><div class="uv"><b>${this._nf(tot, tot >= 100 ? 0 : dec)}</b><small>${unit}</small></div></div>
          ${d.has['c' + k] && d.t['c' + k] ? `<div class="uc">−${this._eur(d.t['c' + k])}</div>` : ''}</div>
          <div class="ub" style="--n:${r.N}">${vals.map((v, i) => `<i data-i="${i}" style="height:${Math.max(v > 0 ? 3 : 0, v / mx * 100).toFixed(1)}%" title="${esc(this._nf(v, dec) + ' ' + unit)}"></i>`).join('')}</div>
          <div class="uf"><span>${peak}</span>${this._delta(tot, pv, -1)}</div></div>`;
      };
      return `<section class="card util"><h2>${_('Plyn a voda')}</h2><div class="ug">${hs.gas ? card('gas', _('Plyn'), IC.gas, COL.gas, gu, gu === 'kWh' ? 0 : 1) : ''}${hs.wat ? card('wat', _('Voda'), IC.wat, COL.wat, 'm³', 1) : ''}</div></section>`;
    }
    _facts(d, share) {
      const t = d.t, r = d.r, f = [];
      if (t.sol > 0.5 && r.mode !== 'day') {
        const v = d.b.map((B) => B.sol), i = v.indexOf(Math.max(...v)), [a, u] = this._E(v[i]);
        const nm = r.mode === 'year' ? new Date(r.a.getFullYear(), i, 1).toLocaleDateString(this._lang(), { month: 'long' }) : new Date(r.a.getFullYear(), r.a.getMonth(), i + 1).toLocaleDateString(this._lang(), { day: 'numeric', month: 'long' });
        f.push([IC.sun, COL.sol, _('Najslnečnejší') + ': ' + nm, a + ' ' + u]);
      }
      const km = (+this._cfg.ev_km_per_kwh || 0) * t.sol;
      if (km >= 1) f.push([IC.car, COL.home, _('Elektroauto by z výroby prešlo'), this._nf(km, 0) + ' ' + _('km')]);
      if (t.sol > 0.5 && t.s2g > 0) f.push([IC.grid, COL.exp, _('Do siete išlo'), Math.round(t.s2g / t.sol * 100) + ' % ' + _('z výroby')]);
      const cap = +this._cfg.battery_capacity || 0;
      if (cap > 0 && t.bout > 0) f.push([IC.cyc, COL.bat, _('Batéria prečerpala'), this._nf(t.bout / cap, t.bout / cap < 10 ? 1 : 0) + ' ' + _('cyklov')]);
      if (!f.length) return '';
      void share;
      return `<section class="facts">${f.map(([ic, c, a, b]) => `<div class="f" style="--c:${c}"><div class="ic">${svg(ic)}</div><div><div class="cap">${esc(a)}</div><b>${esc(b)}</b></div></div>`).join('')}</section>`;
    }
    _animate() {
      const R = this.shadowRoot;
      R.querySelectorAll('.bars .stk, .bars .dn i, .ub i').forEach((el) => { el.classList.add('pre'); });
      requestAnimationFrame(() => requestAnimationFrame(() => R.querySelectorAll('.pre').forEach((el) => el.classList.remove('pre'))));
    }
  }

  const CSS = `
  :host{--es-bg:var(--card-background-color,#fff);--es-tx:var(--primary-text-color,#1d1d1f);--es-mut:var(--secondary-text-color,#6e6e73);
    --es-line:var(--divider-color,rgba(0,0,0,.08));--es-tile:rgba(127,127,127,.07);--es-r:22px;display:block}
  ha-card{background:var(--es-bg);border-radius:var(--ha-card-border-radius,28px);overflow:hidden}
  .wrap{container-type:inline-size;padding:clamp(16px,3.2cqi,40px);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter","Segoe UI",Roboto,system-ui,sans-serif;color:var(--es-tx);-webkit-font-smoothing:antialiased}
  header{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:clamp(16px,2.6cqi,32px)}
  h1{margin:0;font-size:clamp(28px,4.4cqi,52px);font-weight:700;letter-spacing:-.025em;line-height:1.05}
  .lab{color:var(--es-mut);font-size:clamp(15px,1.6cqi,20px);margin-top:6px;font-weight:500}
  .ctl{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .seg{display:flex;background:var(--es-tile);border-radius:12px;padding:3px}
  .seg b{font-weight:600;font-size:14px;padding:7px 16px;border-radius:9px;cursor:pointer;color:var(--es-mut);transition:all .2s}
  .seg b.on{background:var(--es-bg);color:var(--es-tx);box-shadow:0 1px 4px rgba(0,0,0,.12)}
  .nav{display:flex;gap:6px}
  .nav i{display:flex;align-items:center;justify-content:center;min-width:36px;height:36px;border-radius:12px;background:var(--es-tile);cursor:pointer;font-style:normal;font-weight:600;font-size:14px;padding:0 10px;box-sizing:border-box}
  .nav i svg{width:18px;height:18px}.nav i.dis{opacity:.3;pointer-events:none}
  #body{transition:opacity .25s}#body.ld{opacity:.45}
  .msg{padding:60px 0;text-align:center;color:var(--es-mut);font-size:17px}
  h2{margin:0 0 16px;font-size:clamp(19px,2cqi,24px);font-weight:700;letter-spacing:-.015em}
  .card{background:var(--es-tile);border-radius:var(--es-r);padding:clamp(16px,2.4cqi,28px);margin-top:clamp(12px,1.6cqi,20px)}
  .ic{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--c,#888) 16%,transparent);color:var(--c,#888)}
  .ic svg{width:19px;height:19px}
  .cap{color:var(--es-mut);font-size:14px;font-weight:600}
  .dl{display:inline-block;margin-top:8px;font-size:13px;font-weight:600;color:var(--es-mut)}.dl em{font-style:normal;font-weight:500;opacity:.75}
  .dl.g{color:#30d158}.dl.b{color:#ff6961}
  /* hero */
  .hero{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(12px,1.6cqi,20px)}
  .k{background:var(--es-tile);border-radius:var(--es-r);padding:clamp(16px,2.2cqi,26px);display:flex;flex-direction:column;gap:6px;position:relative;overflow:hidden}
  .k .v{display:flex;align-items:baseline;gap:6px;margin-top:4px}
  .k .v b{font-size:clamp(34px,5cqi,60px);font-weight:700;letter-spacing:-.035em;line-height:1}
  .k .v small{font-size:clamp(15px,1.7cqi,20px);font-weight:600;color:var(--es-mut)}
  .k.sol{--c:${COL.sol}}.k.home{--c:${COL.home}}.k.mon{--c:${COL.money}}.k.mon.neg{--c:${COL.imp}}
  .k.sol .v b{background:linear-gradient(135deg,#ffcc00,#ff9f0a 45%,#ff6b00);-webkit-background-clip:text;background-clip:text;color:transparent}
  .k.home .v b{background:linear-gradient(135deg,#64d2ff,#5e5ce6 60%,#bf5af2);-webkit-background-clip:text;background-clip:text;color:transparent}
  .k.mon.pos .v b{color:#30d158}.k.mon.neg .v b{color:#ff6961}
  .k.ring{flex-direction:row;align-items:center;gap:16px;flex-wrap:wrap}
  .rg{width:clamp(84px,9cqi,120px);height:auto;transform:rotate(-90deg)}
  .rg circle{fill:none;stroke-width:12;stroke-linecap:round}.rg .tr{stroke:color-mix(in srgb,#30d158 18%,transparent)}
  .rg .pr{stroke:#30d158;transition:stroke-dasharray 1.2s cubic-bezier(.2,.8,.2,1)}
  .rt b{font-size:clamp(30px,4cqi,48px);font-weight:700;letter-spacing:-.03em;color:#30d158;display:block;line-height:1}
  .rt b small{font-size:.5em;margin-left:2px}.rt span{color:var(--es-mut);font-size:13px;font-weight:600;line-height:1.3;display:block;margin-top:4px}
  .k.ring .dl{flex-basis:100%;margin-top:0}
  /* sankey */
  .sk{width:100%;height:auto;display:block;max-height:520px}.sk.nr{max-height:none}
  .band{opacity:.55;transition:opacity .2s}.band:hover{opacity:.8}
  .dot{fill:none;stroke:#fff;stroke-opacity:.75;stroke-linecap:round;stroke-dasharray:1 26;animation:flow linear infinite}
  @keyframes flow{to{stroke-dashoffset:-108}}
  .nn{font-size:22px;font-weight:700;fill:var(--es-tx)}.ns{font-weight:500;fill:var(--es-mut)}
  .nv{font-size:30px;font-weight:700;fill:var(--es-tx);letter-spacing:-.02em}.nu{font-size:18px;font-weight:600;fill:var(--es-mut)}.np{font-size:18px;font-weight:600;fill:var(--es-mut)}
  .skl{display:none;grid-template-columns:1fr 1fr;gap:6px 18px;margin-top:12px}.skl.on{display:grid}
  .skl>div>div{display:flex;align-items:center;gap:8px;font-size:14px;padding:3px 0}.skl i{width:10px;height:10px;border-radius:3px;flex:none}
  .skl span{color:var(--es-mut);flex:1;min-width:0}.skl b{font-weight:700;white-space:nowrap}
  /* stĺpce */
  .ch2{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px 20px;margin-bottom:12px}.ch2 h2{margin:0}
  .lg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;color:var(--es-mut);font-weight:500}
  .lg span{display:flex;align-items:center;gap:6px}.lg i{width:10px;height:10px;border-radius:3px}
  .lg i.ghost{border:1.5px dashed var(--es-mut);box-sizing:border-box}
  .bars{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:clamp(2px,.5cqi,8px);height:clamp(200px,26cqi,320px)}
  .col{display:flex;flex-direction:column;cursor:pointer;position:relative;min-width:0}
  .col.fut{opacity:.25;pointer-events:none}
  .col .up{position:relative;display:flex;align-items:flex-end;justify-content:center}
  .col .up s{position:absolute;bottom:0;left:-1px;right:-1px;border:1.5px dashed color-mix(in srgb,var(--es-mut) 70%,transparent);border-bottom:0;border-radius:8px 8px 0 0;box-sizing:border-box}
  .stk{width:100%;height:100%;display:flex;flex-direction:column-reverse;border-radius:clamp(3px,.7cqi,8px) clamp(3px,.7cqi,8px) 0 0;overflow:hidden;transform-origin:bottom;transition:transform .7s cubic-bezier(.2,.8,.2,1)}
  .stk i{display:block;width:100%;flex:none}
  .col .dn{display:flex;align-items:flex-start;border-top:1px solid var(--es-line)}
  .col .dn i{display:block;width:100%;border-radius:0 0 clamp(3px,.7cqi,8px) clamp(3px,.7cqi,8px);transform-origin:top;transition:transform .7s cubic-bezier(.2,.8,.2,1)}
  .pre{transform:scaleY(0)!important}
  .col:hover .stk,.col:hover .dn i{filter:brightness(1.12)}
  .tip{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:var(--es-tx);color:var(--es-bg);font-size:12px;font-weight:600;padding:5px 8px;border-radius:8px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s;z-index:2}
  .col:hover .tip{opacity:1}
  .xl{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:clamp(2px,.5cqi,8px);margin-top:8px;font-size:12px;color:var(--es-mut);text-align:center;font-weight:600}
  .xl span{overflow:hidden}
  .hint{margin-top:12px;font-size:12px;color:var(--es-mut);text-align:center}
  /* peniaze */
  .mt{display:grid;grid-template-columns:minmax(260px,1fr) 2fr;gap:clamp(12px,1.6cqi,20px);align-items:start}
  .tot{background:var(--es-bg);border-radius:18px;padding:20px}
  .tv{font-size:clamp(36px,4.6cqi,56px);font-weight:700;letter-spacing:-.035em;margin-top:4px;line-height:1.05}.tv.pos{color:#30d158}
  .ms{color:var(--es-mut);font-size:13px;font-weight:500;margin-top:4px}
  .stack{display:flex;height:12px;border-radius:6px;overflow:hidden;margin-top:18px;gap:2px}
  .sl{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:13px;color:var(--es-mut)}.sl span{display:flex;align-items:center;gap:6px}.sl i{width:9px;height:9px;border-radius:3px}.sl b{color:var(--es-tx)}
  .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(10px,1.4cqi,16px)}
  .m{background:var(--es-bg);border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:4px}
  .m .ic{margin-bottom:6px}.m.neg{--c:${COL.imp}}.m.pos{--c:${COL.exp}}.m.sol{--c:${COL.sol}}
  .mv{font-size:clamp(22px,2.6cqi,30px);font-weight:700;letter-spacing:-.025em}.m.pos .mv{color:#30d158}
  /* plyn a voda */
  .ug{display:grid;grid-template-columns:1fr 1fr;gap:clamp(12px,1.6cqi,20px)}
  .u{background:var(--es-bg);border-radius:18px;padding:18px}
  .uh{display:flex;align-items:center;gap:12px}.uh .ic{--c:inherit;color:var(--c);background:color-mix(in srgb,var(--c) 16%,transparent)}
  .uv{display:flex;align-items:baseline;gap:5px}.uv b{font-size:clamp(26px,3cqi,36px);font-weight:700;letter-spacing:-.03em}.uv small{color:var(--es-mut);font-weight:600}
  .uc{margin-left:auto;font-size:18px;font-weight:700;color:var(--es-mut)}
  .ub{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:clamp(1px,.35cqi,5px);height:90px;align-items:end;margin-top:14px}
  .ub i{display:block;background:var(--c);border-radius:4px 4px 2px 2px;opacity:.85;transform-origin:bottom;transition:transform .7s cubic-bezier(.2,.8,.2,1);cursor:pointer}
  .uf{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px 12px;margin-top:10px;font-size:13px;color:var(--es-mut)}.uf .dl{margin-top:0}
  /* zaujímavosti */
  .facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:clamp(10px,1.4cqi,16px);margin-top:clamp(12px,1.6cqi,20px)}
  .f{display:flex;gap:12px;align-items:center;background:var(--es-tile);border-radius:18px;padding:14px 16px}
  .f b{font-size:18px;font-weight:700;letter-spacing:-.01em}
  @container (max-width:900px){.hero{grid-template-columns:1fr 1fr}.mt{grid-template-columns:1fr}}
  @container (max-width:1100px) and (min-width:621px){.tiles{grid-template-columns:repeat(2,1fr)}}
  @container (max-width:620px){.ug{grid-template-columns:1fr}.xl{font-size:10px}.seg b{padding:7px 12px}.tiles{grid-template-columns:1fr 1fr}.skl{grid-template-columns:1fr}}
  @container (max-width:380px){.hero{grid-template-columns:1fr}}
  @media (prefers-reduced-motion:reduce){.stk,.dn i,.ub i,.rg .pr{transition:none}}
  `;

  class IgyEnergyStoryCardEditor extends HTMLElement {
    setConfig(c) { this._cfg = Object.assign({}, c); if (this._f) this._f.data = Object.assign({ view: 'year', compare: true, ev_km_per_kwh: 6 }, this._cfg); }
    set hass(h) {
      setLang(h); this._hass = h;
      if (!this._f) {
        const f = this._f = document.createElement('ha-form');
        const st = (n) => ({ name: n, selector: { statistic: {} } });
        f.schema = [
          { name: 'title', selector: { text: {} } },
          { type: 'grid', name: '', schema: [
            { name: 'view', selector: { select: { mode: 'dropdown', options: [{ value: 'year', label: _('Rok') }, { value: 'month', label: _('Mesiac') }, { value: 'day', label: _('Deň') }] } } },
            { name: 'compare', selector: { boolean: {} } },
            { name: 'ev_km_per_kwh', selector: { number: { min: 0, max: 15, step: 0.5, mode: 'box' } } },
            { name: 'battery_capacity', selector: { number: { min: 0, max: 200, step: 0.5, mode: 'box', unit_of_measurement: 'kWh' } } }] },
          { type: 'expandable', name: '', title: _('Štatistiky (prázdne = z Energy dashboardu)'), icon: 'mdi:chart-box-outline',
            schema: ['stat_solar', 'stat_grid_in', 'cost_grid_in', 'stat_grid_out', 'cost_grid_out', 'stat_battery_in', 'stat_battery_out', 'stat_gas', 'cost_gas', 'stat_water', 'cost_water'].map(st) }
        ];
        const L = { title: _('Nadpis karty'), view: _('Úvodné zobrazenie'), compare: _('Porovnanie s minulým rokom'), ev_km_per_kwh: _('Elektroauto – km na 1 kWh'),
          battery_capacity: _('Batéria') + ' (kWh)', stat_solar: _('Výroba FVE (kWh)'), stat_grid_in: _('Odber zo siete (kWh)'), cost_grid_in: _('Náklad na odber'),
          stat_grid_out: _('Dodávka do siete (kWh)'), cost_grid_out: _('Príjem z dodávky'), stat_battery_in: _('Energia do batérie (kWh)'), stat_battery_out: _('Energia z batérie (kWh)'),
          stat_gas: _('Spotreba plynu'), cost_gas: _('Náklad na plyn'), stat_water: _('Spotreba vody'), cost_water: _('Náklad na vodu') };
        f.computeLabel = (x) => L[x.name] || x.name;
        f.addEventListener('value-changed', (e) => {
          const v = Object.assign({}, e.detail.value), c = { type: this._cfg.type || 'custom:igy-energy-story-card' };
          const DEF = { view: 'year', compare: true, ev_km_per_kwh: 6 };
          Object.keys(v).forEach((k) => { if (k === 'type' || v[k] === '' || v[k] == null || v[k] === DEF[k]) return; c[k] = v[k]; });
          this._cfg = c;
          this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: c }, bubbles: true, composed: true }));
        });
        this.appendChild(f);
        f.data = Object.assign({ view: 'year', compare: true, ev_km_per_kwh: 6 }, this._cfg);
      }
      this._f.hass = h;
    }
  }

  if (!customElements.get('igy-energy-story-card-editor')) customElements.define('igy-energy-story-card-editor', IgyEnergyStoryCardEditor);
  if (!customElements.get('igy-energy-story-card')) customElements.define('igy-energy-story-card', IgyEnergyStoryCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-energy-story-card'))
    window.customCards.push({ type: 'igy-energy-story-card', name: 'Igy Energy Story', description: _('Príbeh energie domu – toky, peniaze, plyn a voda za rok, mesiac aj deň'), preview: false });
})();
