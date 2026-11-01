/*
 * Igy Energy Story Card – čo prináša FVE a batéria, v štýle Apple: mesiac / rok / celkovo.
 *
 *   type: custom:igy-energy-story-card
 *   view: month                      # month | year | total – úvodné zobrazenie
 *   battery_capacity: 34             # kWh – cykly batérie
 *   battery_cycle_life: 4000         # garantované cykly
 *   battery_cycles_entity: sensor.total_battery_life_cycles_inverter   # celkové cykly (voliteľné)
 *   battery_price: 3500              # € – návratnosť batérie (voliteľné)
 *   system_price: 8000               # € – návratnosť celej FVE (voliteľné)
 *   install_date: 2024-02-01         # od kedy počítať návratnosť (inak od prvých dát)
 *   tariff:                          # cena elektriny bez FVE (úspora a prínos)
 *     vt: 0.21
 *     nt: 0.12
 *     nt_hours: ["23:45-05:45", "13:45-15:45"]
 *   price_stat: [sensor.okte_vykup, sensor.okte_current_price]   # spotová cena pre krivku (€/MWh), inak z Energy
 *   stat_solar, stat_grid_in, stat_grid_out, stat_battery_in, stat_battery_out, stat_gas, stat_water,
 *   cost_grid_in, cost_grid_out, cost_gas, cost_water   # voliteľné – inak z Energy dashboardu
 *
 * Výpočty (všetko z hodinových štatistík HA):
 *   prínos FVE a batérie = spotreba domu × cena podľa tarify (čo by dom stál bez FVE) − nákup + predaj
 *   úspora slnkom        = spotreba zo slnka (priamo + cez batériu) × VT
 *   batéria a predaj     = prínos − úspora slnkom
 */
(function () {
  'use strict';
  let LANG = String((typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || (typeof navigator !== 'undefined' && navigator.language) || 'en').slice(0, 2).toLowerCase();
  const setLang = (h) => { const l = h && ((h.locale && h.locale.language) || h.language); if (l) LANG = String(l).slice(0, 2).toLowerCase(); };
  const _ = (s, ...a) => { let r = LANG === 'sk' ? s : (EN[s] != null ? EN[s] : s); a.forEach((v, i) => { r = r.split('{' + i + '}').join(v); }); return r; };
  const EN = {
    'Mesiac': 'Month', 'Rok': 'Year', 'Celkovo': 'All time', 'Od {0}': 'Since {0}',
    'Prínos FVE a batérie': 'Solar & battery benefit', 'Slnko': 'Solar', 'Batéria a predaj': 'Battery & export',
    'Rok {0}': 'Year {0}', 'Od {0} spolu': 'Since {0}',
    'Batéria kupuje lacno, predáva draho': 'The battery buys low, sells high', 'NABÍJA': 'CHARGES', 'PREDÁVA': 'SELLS',
    'Nákup Ø': 'Buy avg', 'Predaj Ø': 'Sell avg', '+{0} € na každej MWh': '+€{0} on every MWh', '{0} € na každej MWh': '€{0} on every MWh',
    'Slnko vyrobilo': 'Solar produced', '{0} % spotreby domu pokrylo slnko': 'Solar covered {0} % of home use', 'Ušetrené {0} (VT)': 'Saved {0} (peak rate)',
    'Predaj do siete': 'Sold to grid', 'Ø {0} €/MWh': 'avg €{0}/MWh', 'Príjem {0}': 'Income {0}',
    'Nákup zo siete': 'Bought from grid', '{0} % v NT · Ø {1} €/MWh': '{0} % off-peak · avg €{1}/MWh', 'Náklad {0}': 'Cost {0}',
    'Batéria · {0} kWh': 'Battery · {0} kWh', 'cyklov': 'cycles', 'ostáva {0} % životnosti · {1} z {2} cyklov': '{0} % life left · {1} of {2} cycles',
    'Zárobok na cyklus': 'Earned per cycle', 'Opotrebenie na cyklus': 'Wear per cycle', 'Čistý zisk po opotrebení': 'Net after wear', 'Najlepší deň': 'Best day',
    'Návratnosť investície': 'Payback', 'Batéria · {0}': 'Battery · {0}', 'Celá FVE s batériou · {0}': 'Whole PV system · {0}',
    'Batéria zaplatená o': 'Battery paid off in', 'FVE zaplatená o': 'PV paid off in', 'Ročne prináša': 'Yearly benefit', 'Zaplatená': 'Paid off',
    '~{0} roka': '~{0} yrs', '~{0} rokov': '~{0} yrs', '~{0} mesiacov': '~{0} months',
    'Náklady domu': 'Home costs', 'Elektrina': 'Electricity', 'Plyn': 'Gas', 'Voda': 'Water', 'Príjem z predaja': 'Export income',
    'Bilancia domu': 'Home balance', 'dom zarobil – predaj pokryl všetky energie': 'the home earned money – exports covered all energy',
    'predaj pokryl {0} % nákladov na energie': 'exports covered {0} % of energy costs',
    'Načítavam…': 'Loading…', 'Dáta sa nepodarilo načítať.': 'Could not load data.', 'Za toto obdobie nie sú dáta.': 'No data for this period.',
    'V Energy dashboarde nie sú nastavené žiadne zdroje.': 'No sources are configured in the Energy dashboard.',
    'Čo prináša FVE a batéria – prínos, obchod so sieťou, návratnosť a náklady domu': 'What your solar and battery bring – benefit, grid trading, payback and home costs',
    'Úvodné zobrazenie': 'Initial view', 'Kapacita batérie': 'Battery capacity', 'Garantované cykly': 'Guaranteed cycles',
    'Celkové cykly batérie (entita)': 'Total battery cycles (entity)', 'Cena batérie': 'Battery price', 'Cena celej FVE': 'Whole PV system price',
    'Dátum inštalácie': 'Install date', 'Cena VT': 'Peak price', 'Cena NT': 'Off-peak price', 'Spotová cena (štatistika)': 'Spot price (statistic)',
    'Štatistiky (prázdne = z Energy dashboardu)': 'Statistics (empty = from the Energy dashboard)'
  };
  const COL = { sol: '#ff9f0a', bat: '#40c8e0', imp: '#ff6961', exp: '#1fb457', gas: '#ff9500', wat: '#0a84ff' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEYS = ['sol', 'gin', 'gout', 'bin', 'bout', 'gas', 'wat', 'cin', 'cout', 'cgas', 'cwat'];
  const SUMS = KEYS.concat(['s2h', 's2b', 's2g', 'g2h', 'g2b', 'b2h', 'b2g', 'home', 'homeT', 'ginNT']);
  const DEF = { view: 'month', battery_capacity: 0, battery_cycle_life: 0 };
  const DEF_TAR = { vt: 0.21, nt: 0.12, nt_hours: ['23:45-05:45', '13:45-15:45'] };
  const RM = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function split(o) {
    const s = Math.max(0, o.sol), gi = Math.max(0, o.gin), go = Math.max(0, o.gout), bi = Math.max(0, o.bin), bo = Math.max(0, o.bout);
    const s2g = Math.min(go, s), s2b = Math.min(bi, s - s2g), s2h = Math.max(0, s - s2g - s2b);
    const b2g = Math.min(Math.max(0, go - s2g), bo), g2b = Math.max(0, bi - s2b), b2h = Math.max(0, bo - b2g), g2h = Math.max(0, gi - g2b);
    return { s2h, s2b, s2g, g2h, g2b, b2h, b2g };
  }
  const mins = (s) => { const [h, m] = String(s).trim().split(':'); return +h * 60 + (+m || 0); };
  const intervals = (list) => (list || []).flatMap((x) => { const [a, b] = String(x).split('-').map(mins); const e = b === 0 ? 1440 : b; return e <= a ? [[a, 1440], [0, e]] : [[a, e]]; });
  const ntShare = (ivs, h) => ivs.reduce((s, [a, b]) => s + Math.max(0, Math.min(h * 60 + 60, b) - Math.max(h * 60, a)), 0) / 60;
  const monthKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  // hladká krivka cez body (Catmull-Rom → Bézier)
  const smooth = (pts) => pts.reduce((p, [x, y], i, a) => {
    if (!i) return `M${x.toFixed(1)},${y.toFixed(1)}`;
    const p0 = a[i - 2] || a[i - 1], p1 = a[i - 1], p2 = a[i], p3 = a[i + 1] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    return p + ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
  }, '');

  class IgyEnergyStoryCard extends HTMLElement {
    static getConfigElement() { return document.createElement('igy-energy-story-card-editor'); }
    static getStubConfig() { return { view: 'month' }; }
    setConfig(c) {
      this._cfg = Object.assign({}, DEF, c || {});
      const tar = this._cfg.tariff && typeof this._cfg.tariff === 'object' ? this._cfg.tariff : {};
      this._tar = Object.assign({}, DEF_TAR, tar);
      if (!Array.isArray(this._tar.nt_hours)) this._tar.nt_hours = DEF_TAR.nt_hours;
      this._ivs = intervals(this._tar.nt_hours);
      this._mode = ['month', 'year', 'total'].includes(this._cfg.view) ? this._cfg.view : 'month';
      this._at = new Date(); this._ids = null; this._months = {}; this._start = null;
      if (this.shadowRoot) this._render();
      if (this._hass) this._load();
    }
    set hass(h) {
      if (!this._cfg) this.setConfig({});
      const first = !this._hass; this._hass = h; setLang(h);
      const dark = !!(h.themes && h.themes.darkMode);
      if (this._wrap && this._dark !== dark) { this._dark = dark; this._wrap.classList.toggle('dark', dark); }
      if (first) { this._dark = dark; this._render(); this._load(); }
    }
    connectedCallback() {
      if (!this._t) this._t = setInterval(() => { if (!this._hass) return; delete this._months[monthKey(new Date())]; this._load(true); }, 10 * 60000);
    }
    disconnectedCallback() { clearInterval(this._t); this._t = null; }
    getCardSize() { return 14; }
    getGridOptions() { return { columns: 'full', min_columns: 6 }; }
    _lang() { return (this._hass && this._hass.locale && this._hass.locale.language) || undefined; }
    _nf(v, d) { return (isFinite(v) ? v : 0).toLocaleString(this._lang(), { minimumFractionDigits: d, maximumFractionDigits: d }); }
    _E(kwh) { const a = Math.abs(kwh || 0); return a >= 1000 ? [this._nf(a / 1000, a >= 10000 ? 1 : 2), 'MWh'] : [this._nf(a, a < 10 ? 1 : 0), 'kWh']; }
    _eur(v, d) {
      const cur = (this._hass && this._hass.config && this._hass.config.currency) || 'EUR', a = Math.abs(v || 0);
      const dd = d != null ? d : a >= 100 ? 0 : 2;
      return a.toLocaleString(this._lang(), { style: 'currency', currency: cur, minimumFractionDigits: dd, maximumFractionDigits: dd });
    }
    _sgn(v, d) { return (v >= 0 ? '+' : '−') + this._eur(v, d); }

    /* ---------- dáta ---------- */
    async _getIds() {
      const c = this._cfg, h = this._hass;
      const prefs = await h.callWS({ type: 'energy/get_prefs' }).catch(() => ({}));
      const info = await h.callWS({ type: 'energy/info' }).catch(() => ({}));
      const cs = info.cost_sensors || {}, ids = { price: [] }; KEYS.forEach((k) => { ids[k] = []; });
      (prefs.energy_sources || []).forEach((s) => {
        if (s.type === 'solar' && s.stat_energy_from) ids.sol.push(s.stat_energy_from);
        if (s.type === 'battery') { if (s.stat_energy_from) ids.bout.push(s.stat_energy_from); if (s.stat_energy_to) ids.bin.push(s.stat_energy_to); }
        if (s.type === 'grid') {
          (s.flow_from || (s.stat_energy_from ? [s] : [])).forEach((f) => { if (f.stat_energy_from) ids.gin.push(f.stat_energy_from); const k = f.stat_cost || cs[f.stat_energy_from]; if (k) ids.cin.push(k); });
          (s.flow_to || (s.stat_energy_to ? [s] : [])).forEach((f) => {
            if (f.stat_energy_to) ids.gout.push(f.stat_energy_to); const k = f.stat_compensation || cs[f.stat_energy_to]; if (k) ids.cout.push(k);
            const p = f.entity_energy_price_export || f.entity_energy_price; if (p) ids.price.push(p);
          });
        }
        if (s.type === 'gas' && s.stat_energy_from) { ids.gas.push(s.stat_energy_from); const k = s.stat_cost || cs[s.stat_energy_from]; if (k) ids.cgas.push(k); }
        if (s.type === 'water' && s.stat_energy_from) { ids.wat.push(s.stat_energy_from); const k = s.stat_cost || cs[s.stat_energy_from]; if (k) ids.cwat.push(k); }
      });
      const O = { sol: 'stat_solar', gin: 'stat_grid_in', gout: 'stat_grid_out', bin: 'stat_battery_in', bout: 'stat_battery_out', gas: 'stat_gas', wat: 'stat_water', cin: 'cost_grid_in', cout: 'cost_grid_out', cgas: 'cost_gas', cwat: 'cost_water' };
      Object.keys(O).forEach((k) => { if (c[O[k]]) ids[k] = [c[O[k]]]; });
      if (c.price_stat) ids.price = [].concat(c.price_stat);
      return ids;
    }
    async _findStart() {
      if (this._cfg.install_date) { const d = new Date(this._cfg.install_date); if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth(), 1); }
      const ids = this._ids, probe = ids.sol.concat(ids.gin).slice(0, 2);
      const res = await this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: new Date(2015, 0, 1).toISOString(), end_time: new Date().toISOString(),
        statistic_ids: probe, period: 'month', types: ['change'] }).catch(() => ({}));
      let first = Date.now();
      Object.values(res || {}).forEach((rows) => (rows || []).forEach((x) => { if (x.change) { const t = typeof x.start === 'number' ? x.start : Date.parse(x.start); if (t < first) first = t; } }));
      const d = new Date(first); return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    // jeden mesiac hodinových dát → riadky {t, ...hodnoty, toky}
    async _month(key) {
      if (this._months[key]) return this._months[key];
      const p = (async () => {
        const [Y, M] = key.split('-').map(Number), a = new Date(Y, M - 1, 1), b = new Date(Y, M, 1), ids = this._ids;
        const all = [...new Set([].concat(...KEYS.map((k) => ids[k])))], owner = {};
        KEYS.forEach((k) => ids[k].forEach((id) => { (owner[id] = owner[id] || []).push(k); }));
        const q = (ids2, types, s, e, per) => this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: s.toISOString(), end_time: e.toISOString(),
          statistic_ids: ids2, period: per, types, units: { energy: 'kWh', volume: 'm³' } });
        const now = Date.now(), end = new Date(Math.min(b.getTime(), now + 60000));
        const [res, pr] = await Promise.all([q(all, ['change'], a, end, 'hour'), ids.price.length ? q(ids.price, ['mean'], a, end, 'hour').catch(() => ({})) : Promise.resolve({})]);
        if (a <= now && now < b) {   // rozpracovaná hodina z 5-min štatistík
          const h0 = new Date(); h0.setMinutes(0, 0, 0);
          const p5 = await q(all, ['change'], h0, new Date(now + 60000), '5minute').catch(() => ({}));
          Object.keys(p5 || {}).forEach((id) => { res[id] = (res[id] || []).concat(p5[id]); });
        }
        const rows = new Map(), T = (x) => { const d = new Date(typeof x.start === 'number' ? x.start : Date.parse(x.start)); d.setMinutes(0, 0, 0); return d.getTime(); };
        const row = (t) => { if (!rows.has(t)) { const o = { t, price: null }; KEYS.forEach((k) => { o[k] = 0; }); rows.set(t, o); } return rows.get(t); };
        Object.keys(res || {}).forEach((id) => (res[id] || []).forEach((x) => { if (x.change == null || !owner[id]) return; const o = row(T(x)); owner[id].forEach((k) => { o[k] += x.change; }); }));
        ids.price.forEach((id) => (pr[id] || []).forEach((x) => { if (x.mean == null) return; const o = row(T(x)); if (o.price == null) o.price = x.mean; }));
        const out = [...rows.values()].sort((x, y) => x.t - y.t).map((o) => {
          const f = split(o), h = new Date(o.t).getHours(), sh = ntShare(this._ivs, h);
          KEYS.forEach((k) => { if (k[0] !== 'c') o[k] = Math.max(0, o[k]); });
          Object.assign(o, f); o.home = f.s2h + f.b2h + f.g2h; o.nt = sh;
          o.homeT = o.home * (sh * this._tar.nt + (1 - sh) * this._tar.vt); o.ginNT = o.gin * sh;
          return o;
        });
        if (b.getTime() > now) setTimeout(() => { if (this._months[key] === p) delete this._months[key]; }, 9 * 60000);
        return out;
      })();
      this._months[key] = p;
      p.catch(() => { delete this._months[key]; });
      return p;
    }
    _keys(a, b) { const o = []; for (let d = new Date(a.getFullYear(), a.getMonth(), 1); d < b; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) o.push(monthKey(d)); return o; }
    async _rows(a, b) {
      const keys = this._keys(a, new Date(Math.min(b.getTime(), Date.now() + 1))), out = [];
      for (let i = 0; i < keys.length; i += 4) (await Promise.all(keys.slice(i, i + 4).map((k) => this._month(k)))).forEach((r) => out.push(...r));
      return out.filter((r) => r.t >= a.getTime() && r.t < b.getTime());
    }
    _agg(rows) {
      const s = { n: rows.length, hod: Array.from({ length: 24 }, () => ({ g2b: 0, b2g: 0, gin: 0, ps: 0, pn: 0 })), days: new Map() };
      SUMS.forEach((k) => { s[k] = 0; });
      rows.forEach((r) => {
        SUMS.forEach((k) => { s[k] += r[k] || 0; });
        const h = s.hod[new Date(r.t).getHours()]; h.g2b += r.g2b; h.b2g += r.b2g; h.gin += r.gin;
        if (r.price != null) { h.ps += r.price; h.pn++; }
        const d = new Date(r.t), dk = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const D = s.days.get(dk) || { net: 0, sol: 0, cout: 0, gout: 0 }; D.net += r.cout - r.cin; D.sol += r.sol; D.cout += r.cout; D.gout += r.gout; s.days.set(dk, D);
      });
      const solInBat = s.s2b + s.g2b > 0 ? s.s2b / (s.s2b + s.g2b) : 0;
      s.solSelf = s.s2h + s.b2h * solInBat;
      s.benefit = s.homeT - s.cin + s.cout;
      s.solar = s.solSelf * this._tar.vt;
      s.battery = s.benefit - s.solar;
      s.solShare = s.home > 0 ? s.solSelf / s.home : 0;
      return s;
    }
    _range() {
      const at = this._at, lang = this._lang();
      if (this._mode === 'year') { const a = new Date(at.getFullYear(), 0, 1); return { a, b: new Date(at.getFullYear() + 1, 0, 1), lab: String(at.getFullYear()) }; }
      if (this._mode === 'total') {
        const a = this._start || new Date(2024, 0, 1);
        return { a, b: new Date(Date.now() + 3600000), lab: _('Od {0}', a.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })) };
      }
      const a = new Date(at.getFullYear(), at.getMonth(), 1), l = a.toLocaleDateString(lang, { month: 'long', year: 'numeric' });
      return { a, b: new Date(at.getFullYear(), at.getMonth() + 1, 1), lab: l.charAt(0).toUpperCase() + l.slice(1) };
    }
    async _load(silent) {
      const seq = (this._seq = (this._seq || 0) + 1);
      if (!silent) this._state('loading');
      try {
        if (!this._ids) this._ids = await this._getIds();
        if (!KEYS.some((k) => this._ids[k].length)) { this._msg(_('V Energy dashboarde nie sú nastavené žiadne zdroje.')); return; }
        if (!this._start) this._start = await this._findStart();
        const r = this._range(), cur = this._agg(await this._rows(r.a, r.b));
        if (seq !== this._seq) return;
        // celkovo od inštalácie a posledných 12 mesiacov (návratnosť, súčty)
        const now = new Date(), y0 = new Date(now.getFullYear(), 0, 1), m12 = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const allRows = await this._rows(this._start, new Date(now.getTime() + 3600000));
        if (seq !== this._seq) return;
        const tot = this._agg(allRows), year = this._agg(allRows.filter((x) => x.t >= y0.getTime()));
        const last12 = this._agg(allRows.filter((x) => x.t >= Math.max(m12.getTime(), this._start.getTime())));
        const span = Math.max(1, (now - Math.max(m12, this._start)) / 86400000) / 365.25;
        this._d = { r, cur, tot, year, perYear: { benefit: last12.benefit / span, battery: last12.battery / span } };
        this._draw();
      } catch (e) {
        console.error('igy-energy-story-card', e);
        if (seq === this._seq) this._msg(_('Dáta sa nepodarilo načítať.'));
      }
    }

    /* ---------- vykreslenie ---------- */
    _render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card><div class="w${this._dark ? ' dark' : ''}" id="w">
        <header><h1 id="lab"></h1><div class="ctl"><div class="seg" id="seg">${[['month', _('Mesiac')], ['year', _('Rok')], ['total', _('Celkovo')]].map(([k, t]) => `<b data-m="${k}">${t}</b>`).join('')}</div>
        <i class="nb" data-n="-1">‹</i><i class="nb" data-n="1" id="nx">›</i></div></header><div id="body"></div></div></ha-card>`;
      const R = this.shadowRoot; this._wrap = R.getElementById('w');
      R.getElementById('seg').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (!b || b.dataset.m === this._mode) return; this._mode = b.dataset.m; this._load(); });
      R.querySelectorAll('.nb').forEach((b) => b.addEventListener('click', () => {
        if (b.classList.contains('dis')) return; const n = +b.dataset.n, a = this._at;
        this._at = this._mode === 'year' ? new Date(a.getFullYear() + n, 0, 1) : new Date(a.getFullYear(), a.getMonth() + n, 1); this._load();
      }));
      this._head();
    }
    _head() {
      const R = this.shadowRoot; if (!R || !R.getElementById('lab')) return;
      const r = this._range(), tot = this._mode === 'total';
      R.getElementById('lab').textContent = r.lab;
      R.querySelectorAll('#seg b').forEach((b) => b.classList.toggle('on', b.dataset.m === this._mode));
      R.querySelectorAll('.nb').forEach((b) => b.classList.toggle('hide', tot));
      R.getElementById('nx').classList.toggle('dis', r.b > Date.now());
      const pv = R.querySelector('.nb[data-n="-1"]'); if (pv) pv.classList.toggle('dis', !!this._start && r.a <= this._start);
    }
    _state(s) { this._head(); const B = this.shadowRoot && this.shadowRoot.getElementById('body'); if (!B) return; if (s === 'loading') { B.classList.add('ld'); if (!B.innerHTML) B.innerHTML = `<div class="msg">${_('Načítavam…')}</div>`; } }
    _msg(t) { this._head(); const B = this.shadowRoot.getElementById('body'); B.classList.remove('ld'); B.innerHTML = `<div class="msg">${esc(t)}</div>`; }
    _draw() {
      this._head();
      const B = this.shadowRoot.getElementById('body'); B.classList.remove('ld');
      const { cur: s } = this._d;
      if (!s.n) { B.innerHTML = `<div class="msg">${_('Za toto obdobie nie sú dáta.')}</div>`; return; }
      B.innerHTML = this._hero() + this._trade() + this._tiles() + `<section class="r3">${this._battery()}${this._payback()}</section>` + this._home();
      if (!RM) requestAnimationFrame(() => requestAnimationFrame(() => B.querySelectorAll('.anim').forEach((el) => el.classList.add('in'))));
      else B.querySelectorAll('.anim').forEach((el) => el.classList.add('in'));
    }
    _hero() {
      const { cur: s, tot, year, r } = this._d, lang = this._lang();
      const sol = Math.max(0, s.solar), bat = s.battery, sum = Math.abs(sol) + Math.abs(bat) || 1;
      const start = this._start.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
      const cum = this._mode === 'total' ? '' : `<div class="cum">${this._mode === 'month' ? `<div>${_('Rok {0}', r.a.getFullYear())}<b>${this._eur(year.benefit, 0)}</b></div>` : ''}<div>${_('Od {0} spolu', start)}<b>${this._eur(tot.benefit, 0)}</b></div></div>`;
      return `<section class="r1"><div class="big">
        <svg class="sun" viewBox="0 0 100 100"><circle cx="50" cy="50" r="22" fill="#fff"/><g stroke="#fff" stroke-width="5" stroke-linecap="round"><path d="M50 8v12M50 80v12M8 50h12M80 50h12M20 20l9 9M71 71l9 9M20 80l9-9M71 29l9-9"/></g></svg>
        <div class="lbl">${_('Prínos FVE a batérie')}</div>
        <div class="v">${s.benefit < 0 ? '−' : ''}${this._nf(Math.abs(s.benefit), 0)}<small>€</small></div>
        <div class="split anim"><i style="flex:${(Math.abs(bat) / sum).toFixed(3)};background:#fff"></i><i style="flex:${(sol / sum).toFixed(3)};background:#ffd166"></i></div>
        <div class="sl"><span><em style="background:#fff"></em>${_('Batéria a predaj')} ${this._sgn(bat, 0)}</span><span><em style="background:#ffd166"></em>${_('Slnko')} ${this._sgn(sol, 0)}</span></div>
        ${cum}</div>`;
    }
    _trade() {
      const s = this._d.cur, narrow = this._wrap && this._wrap.offsetWidth < 620, W = narrow ? 400 : 640, Hc = narrow ? 150 : 170;
      const buy = s.gin > 0.5 ? s.cin / s.gin * 1000 : 0, sell = s.gout > 0.5 ? s.cout / s.gout * 1000 : 0;
      // profil ceny cez deň: spotová cena, inak realizovaná cena predaja
      let prof = s.hod.map((h) => (h.pn ? h.ps / h.pn : null));
      if (prof.filter((v) => v != null).length < 12) prof = null;
      const g2b = s.hod.map((h) => h.g2b), b2g = s.hod.map((h) => h.b2g), mg = Math.max(...g2b), mb = Math.max(...b2g);
      let curve = '', zones = '', marks = '';
      if (prof) {
        const vals = prof.map((v, i) => (v == null ? (prof[i - 1] != null ? prof[i - 1] : prof.find((x) => x != null)) : v));
        const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
        const X = (i) => (i + 0.5) / 24 * W, Y = (v) => 18 + (1 - (v - lo) / span) * (Hc - 40);
        const pts = vals.map((v, i) => [X(i), Y(v)]), path = smooth(pts);
        const zone = (arr, mx, fill) => { let o = '', st = -1; arr.forEach((v, i) => { const on = mx > 0 && v >= mx * 0.35; if (on && st < 0) st = i; if ((!on || i === 23) && st >= 0) { const e = on ? 24 : i; o += `<rect x="${(st / 24 * W).toFixed(1)}" y="0" width="${((e - st) / 24 * W).toFixed(1)}" height="${Hc}" rx="10" fill="${fill}"/>`; st = -1; } }); return o; };
        zones = zone(g2b, mg, 'rgba(64,200,224,.13)') + zone(b2g, mb, 'rgba(255,159,10,.13)');
        const pick = (arr, mx, fn) => { let bi = -1; arr.forEach((v, i) => { if (mx > 0 && v >= mx * 0.35 && (bi < 0 || fn(vals[i], vals[bi]))) bi = i; }); return bi; };
        const ib = pick(g2b, mg, (a, b) => a < b), is = pick(b2g, mb, (a, b) => a > b);
        if (ib >= 0) marks += `<circle cx="${pts[ib][0]}" cy="${pts[ib][1]}" r="9" fill="${COL.bat}" stroke="#fff" stroke-width="3"/><text x="${pts[ib][0]}" y="${Math.max(14, pts[ib][1] - 18)}" class="zl" fill="#2a9fb5" text-anchor="middle">${_('NABÍJA')}</text>`;
        if (is >= 0) marks += `<circle cx="${pts[is][0]}" cy="${pts[is][1]}" r="9" fill="${COL.exp}" stroke="#fff" stroke-width="3"/><text x="${pts[is][0]}" y="${Math.min(Hc - 6, pts[is][1] + 34)}" class="zl" fill="#0b7a40" text-anchor="middle">${_('PREDÁVA')}</text>`;
        curve = `<path d="${path} L${W},${Hc} L0,${Hc}Z" fill="url(#cg)"/><path d="${path}" fill="none" stroke="${COL.sol}" stroke-width="4" stroke-linecap="round" class="draw"/>`;
      }
      const ax = [0, 6, 12, 18, 24].map((h) => `<text x="${Math.min(W - 18, h / 24 * W)}" y="${Hc + 22}" class="ax" text-anchor="${h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}">${h}:00</text>`).join('');
      const m = sell - buy;
      return `<div class="glass"><div class="lbl">${_('Batéria kupuje lacno, predáva draho')}</div>
        ${prof ? `<svg class="curve" viewBox="0 0 ${W} ${Hc + 30}"><defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${COL.sol}" stop-opacity=".35"/><stop offset="1" stop-color="${COL.sol}" stop-opacity="0"/></linearGradient></defs>${zones}${curve}${marks}${ax}</svg>` : '<div class="gap"></div>'}
        <div class="trade"><div class="px"><div style="color:#2a9fb5">${_('Nákup Ø')}</div><b>${this._nf(buy, 0)}</b><small>€/MWh</small></div>
        ${buy && sell ? `<div class="mg ${m < 0 ? 'neg' : ''}">${_(m >= 0 ? '+{0} € na každej MWh' : '{0} € na každej MWh', this._nf(m, 0))}</div>` : ''}
        <div class="px" style="text-align:right"><div style="color:#0b7a40">${_('Predaj Ø')}</div><b class="gr">${this._nf(sell, 0)}</b><small>€/MWh</small></div></div></div></section>`;
    }
    _tiles() {
      const s = this._d.cur, pct = Math.round(s.solShare * 100), C = 2 * Math.PI * 40;
      const [sv, su] = this._E(s.sol), [gv, gu] = this._E(s.gout), [iv, iu] = this._E(s.gin);
      // malé grafy: tržby z predaja po dňoch / mesiacoch, nákup podľa hodín (NT zvýraznené)
      const days = [...s.days.values()], step = this._mode === 'month' ? 1 : Math.ceil(days.length / 30);
      const series = []; for (let i = 0; i < days.length; i += step) series.push(days.slice(i, i + step).reduce((a, d) => a + d.cout, 0));
      const mx = Math.max(0.01, ...series), spark = series.length > 1 ? smooth(series.map((v, i) => [2 + i / (series.length - 1) * 92, 56 - v / mx * 48])) : '';
      const mxi = Math.max(0.01, ...s.hod.map((h) => h.gin));
      const hb = s.hod.map((h, i) => `<rect x="${i * 4}" y="${(58 - h.gin / mxi * 54).toFixed(1)}" width="3" height="${Math.max(1, h.gin / mxi * 54).toFixed(1)}" rx="1.5" fill="${COL.bat}" opacity="${ntShare(this._ivs, i) > 0.5 ? 1 : 0.35}"/>`).join('');
      const nt = s.gin > 0 ? Math.round(s.ginNT / s.gin * 100) : 0, buy = s.gin > 0.5 ? s.cin / s.gin * 1000 : 0, sell = s.gout > 0.5 ? s.cout / s.gout * 1000 : 0;
      return `<section class="r2">
        <div class="glass tile"><div class="top"><div><div class="lbl">☀️ ${_('Slnko vyrobilo')}</div><div class="v">${sv}<small>${su}</small></div></div>
          <svg class="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,159,10,.18)" stroke-width="12"/><circle class="anim rg" cx="50" cy="50" r="40" fill="none" stroke="${COL.sol}" stroke-width="12" stroke-linecap="round" style="--d:${(s.solShare * C).toFixed(1)}" stroke-dasharray="0 ${C.toFixed(1)}" transform="rotate(-90 50 50)"/><text x="50" y="57" text-anchor="middle" class="rt">${pct}%</text></svg></div>
          <div class="s">${_('{0} % spotreby domu pokrylo slnko', pct)}</div><span class="pill g">${_('Ušetrené {0} (VT)', this._eur(s.solar))}</span></div>
        <div class="glass tile"><div class="top"><div><div class="lbl">↗ ${_('Predaj do siete')}</div><div class="v">${gv}<small>${gu}</small></div></div>
          ${spark ? `<svg width="96" height="60" viewBox="0 0 96 60"><path d="${spark}" fill="none" stroke="${COL.exp}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="draw"/></svg>` : ''}</div>
          <div class="s">${_('Ø {0} €/MWh', this._nf(sell, 0))}</div><span class="pill o">${_('Príjem {0}', this._eur(s.cout))}</span></div>
        <div class="glass tile"><div class="top"><div><div class="lbl">🔌 ${_('Nákup zo siete')}</div><div class="v">${iv}<small>${iu}</small></div></div>
          <svg width="96" height="60" viewBox="0 0 96 60">${hb}</svg></div>
          <div class="s">${_('{0} % v NT · Ø {1} €/MWh', nt, this._nf(buy, 0))}</div><span class="pill d">${_('Náklad {0}', this._eur(s.cin))}</span></div>
      </section>`;
    }
    _battery() {
      const c = this._cfg, s = this._d.cur, cap = +c.battery_capacity || 0, life = +c.battery_cycle_life || 0, lang = this._lang();
      const st = c.battery_cycles_entity && this._hass.states[c.battery_cycles_entity], total = st ? parseFloat(st.state) : NaN;
      const cyc = cap > 0 ? s.bout / cap : 0, rem = life > 0 && isFinite(total) ? Math.max(0, 1 - total / life) : null;
      const wear = life > 0 && +c.battery_price > 0 ? +c.battery_price / life : null;
      const best = [...s.days.entries()].sort((a, b) => b[1].net - a[1].net)[0];
      const fill = rem == null ? Math.min(1, s.bout / Math.max(1, s.bin)) : rem;
      const kv = [];
      if (cyc >= 0.5) kv.push([_('Zárobok na cyklus'), this._sgn(s.battery / cyc)]);
      if (wear != null) kv.push([_('Opotrebenie na cyklus'), this._eur(wear)]);
      if (wear != null && cyc > 0) kv.push([_('Čistý zisk po opotrebení'), this._sgn(s.battery - cyc * wear, 0)]);
      if (best && best[1].net >= 0.5) kv.push([_('Najlepší deň'), new Date(best[0]).toLocaleDateString(lang, { day: 'numeric', month: 'numeric' }) + ' · ' + this._sgn(best[1].net)]);
      return `<div class="glass"><div class="lbl">🔋 ${cap ? _('Batéria · {0} kWh', this._nf(cap, 0)) : _('Batéria a predaj')}</div>
        <div class="batt"><svg class="bshape" viewBox="0 0 170 84"><defs><linearGradient id="bg" x1="0" x2="1"><stop offset="0" stop-color="#30d158"/><stop offset="1" stop-color="${COL.bat}"/></linearGradient></defs>
          <rect x="2" y="2" width="152" height="80" rx="18" fill="none" class="bo" stroke-width="4"/><rect x="156" y="28" width="12" height="28" rx="5" class="bt"/>
          <rect x="10" y="10" width="136" height="64" rx="12" fill="rgba(48,209,88,.12)"/><rect class="anim bf" x="10" y="10" width="${(136 * fill).toFixed(1)}" height="64" rx="12" fill="url(#bg)"/>
          ${rem != null ? `<text x="78" y="52" text-anchor="middle" class="bp">${Math.round(rem * 100)} %</text>` : ''}</svg>
        <div><div class="bnum">${this._nf(cyc, cyc < 10 ? 1 : 0)}<small>${_('cyklov')}</small></div>
          ${rem != null ? `<div class="mut sm">${_('ostáva {0} % životnosti · {1} z {2} cyklov', Math.round(rem * 100), this._nf(total, 0), this._nf(life, 0))}</div>` : ''}</div></div>
        ${kv.length ? `<div class="kv">${kv.map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('')}</div>` : ''}</div>`;
    }
    _payback() {
      const c = this._cfg, { tot, perYear } = this._d, bp = +c.battery_price || 0, sp = +c.system_price || 0;
      if (!bp && !sp) return '';
      const yrs = (left, py) => { if (left <= 0) return _('Zaplatená'); if (!(py > 0)) return '—'; const y = left / py; return y < 1 ? _('~{0} mesiacov', Math.max(1, Math.round(y * 12))) : y < 5 ? _('~{0} roka', this._nf(y, 1)) : _('~{0} rokov', this._nf(y, 1)); };
      const bar = (name, price, done, grad) => { const p = Math.max(0, Math.min(1, done / price)); return `<div class="pb"><div class="row"><span>${name}</span><b>${this._eur(done, 0)} · ${Math.round(p * 100)} %</b></div>
        <div class="track"><i class="anim pw" style="--w:${(p * 100).toFixed(1)}%;background:${grad}"></i></div></div>`; };
      const yb = [];
      if (bp) yb.push([_('Batéria zaplatená o'), yrs(bp - tot.battery, perYear.battery)]);
      if (sp) yb.push([_('FVE zaplatená o'), yrs(sp - tot.benefit, perYear.benefit)]);
      yb.push([_('Ročne prináša'), '~' + this._eur(perYear.benefit, 0)]);
      return `<div class="glass"><div class="lbl">⏳ ${_('Návratnosť investície')}</div>
        ${bp ? bar(_('Batéria · {0}', this._eur(bp, 0)), bp, tot.battery, `linear-gradient(90deg,${COL.bat},#30d158)`) : ''}
        ${sp ? bar(_('Celá FVE s batériou · {0}', this._eur(sp, 0)), sp, tot.benefit, 'linear-gradient(90deg,#ffcc00,#ff9f0a)') : ''}
        <div class="yrs">${yb.map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('')}</div></div>`;
    }
    _home() {
      const s = this._d.cur, ids = this._ids;
      const parts = [[_('Elektrina'), s.cin, COL.imp, ids.cin.length], [_('Plyn'), s.cgas, COL.gas, ids.cgas.length], [_('Voda'), s.cwat, COL.wat, ids.cwat.length]].filter((p) => p[3] && p[1] > 0.005);
      if (!parts.length && !ids.cout.length) return '';
      const costs = parts.reduce((a, p) => a + p[1], 0), bal = s.cout - costs;
      return `<section class="r4"><div class="glass"><div class="lbl">🏠 ${_('Náklady domu')}</div>
        <div class="costbar anim">${parts.map((p) => `<i style="flex:${p[1].toFixed(2)};background:${p[2]}">${p[1] / Math.max(costs, 0.01) > 0.12 ? this._eur(p[1], 0) : ''}</i>`).join('')}</div>
        <div class="cl">${parts.map((p) => `<span><em style="background:${p[2]}"></em>${p[0]}<b>${this._eur(p[1])}</b></span>`).join('')}${ids.cout.length ? `<span><em style="background:${COL.exp}"></em>${_('Príjem z predaja')}<b>−${this._eur(s.cout)}</b></span>` : ''}</div></div>
        <div class="glass bal"><div class="lbl">⚖️ ${_('Bilancia domu')}</div><div class="bv ${bal >= 0 ? 'pos' : 'neg'}">${this._sgn(bal, Math.abs(bal) >= 100 ? 0 : null)}</div>
        <div class="mut sm">${bal >= 0 ? _('dom zarobil – predaj pokryl všetky energie') : _('predaj pokryl {0} % nákladov na energie', costs > 0 ? Math.round(s.cout / costs * 100) : 0)}</div></div></section>`;
    }
  }

  const CSS = `
  :host{display:block}
  ha-card{overflow:hidden;border-radius:var(--ha-card-border-radius,28px);background:transparent}
  .w{container-type:inline-size;padding:clamp(16px,3cqi,40px);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,"Segoe UI",Roboto,system-ui,sans-serif;-webkit-font-smoothing:antialiased;
    --tx:#1d1d1f;--mut:#6e6e73;--gl:rgba(255,255,255,.64);--gl-b:rgba(255,255,255,.75);--tr:rgba(0,0,0,.07);--pill-d:#2c2c2e;
    color:var(--tx);background:radial-gradient(1100px 600px at 0% 0%,#cfe6ff 0%,transparent 60%),radial-gradient(900px 520px at 100% 0%,#ffe3c2 0%,transparent 58%),radial-gradient(1000px 600px at 50% 105%,#d4f4dc 0%,transparent 60%),#f5f5f7}
  .w.dark{--tx:#f5f5f7;--mut:#a1a1a6;--gl:rgba(44,44,46,.62);--gl-b:rgba(255,255,255,.08);--tr:rgba(255,255,255,.1);--pill-d:#48484a;
    background:radial-gradient(1100px 600px at 0% 0%,#0d2a4a 0%,transparent 60%),radial-gradient(900px 520px at 100% 0%,#3a2410 0%,transparent 58%),radial-gradient(1000px 600px at 50% 105%,#0f3320 0%,transparent 60%),#000}
  header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;margin-bottom:clamp(14px,2cqi,24px)}
  h1{margin:0;font-size:clamp(30px,4.2cqi,52px);font-weight:800;letter-spacing:-.035em;line-height:1}
  .ctl{display:flex;gap:8px;align-items:center}
  .seg{display:flex;background:var(--gl);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:12px;padding:3px;box-shadow:inset 0 0 0 1px var(--tr)}
  .seg b{font-size:14px;font-weight:600;padding:7px 15px;border-radius:9px;color:var(--mut);cursor:pointer;transition:all .2s}
  .seg b.on{background:var(--gl-b);color:var(--tx);box-shadow:0 1px 4px rgba(0,0,0,.14)}.w:not(.dark) .seg b.on{background:#fff}
  .nb{width:36px;height:36px;border-radius:12px;background:var(--gl);display:flex;align-items:center;justify-content:center;font-weight:700;font-style:normal;font-size:20px;cursor:pointer;box-shadow:inset 0 0 0 1px var(--tr)}
  .nb.dis{opacity:.3;pointer-events:none}.nb.hide{display:none}
  #body{transition:opacity .25s}#body.ld{opacity:.45}
  .msg{padding:60px 0;text-align:center;color:var(--mut);font-size:17px}
  .glass{background:var(--gl);backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);border-radius:26px;box-shadow:0 10px 30px rgba(0,0,0,.06),inset 0 0 0 1px var(--gl-b);padding:clamp(16px,2cqi,24px);position:relative;overflow:hidden;min-width:0}
  .lbl{font-size:13px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.05em;display:flex;align-items:center;gap:8px}
  .mut{color:var(--mut)}.sm{font-size:14px;margin-top:6px}
  .r1{display:grid;grid-template-columns:1.05fr 1.25fr;gap:clamp(12px,1.5cqi,18px)}
  .big{background:linear-gradient(140deg,#0b7a40,#1fb457 55%,#6ee08f);color:#fff;border-radius:28px;padding:clamp(20px,2.4cqi,30px);position:relative;overflow:hidden;box-shadow:0 18px 40px rgba(31,180,87,.3)}
  .big .lbl{color:rgba(255,255,255,.88)}
  .big .v{font-size:clamp(64px,8.6cqi,108px);font-weight:800;letter-spacing:-.05em;line-height:.95;margin:14px 0 6px}.big .v small{font-size:.44em;margin-left:6px;letter-spacing:0}
  .split{display:flex;height:14px;border-radius:7px;overflow:hidden;gap:3px;margin-top:16px;transform-origin:left;transform:scaleX(0);transition:transform .9s cubic-bezier(.2,.8,.2,1)}.split.in{transform:none}.split i{display:block;border-radius:7px}
  .sl{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px 12px;margin-top:9px;font-size:14px;font-weight:600}.sl span{display:flex;align-items:center;gap:7px}.sl em{width:9px;height:9px;border-radius:3px;display:inline-block}
  .cum{display:flex;gap:10px;margin-top:20px}.cum div{flex:1;background:rgba(255,255,255,.17);border-radius:16px;padding:10px 14px;font-size:13px;font-weight:600}.cum b{display:block;font-size:clamp(20px,2cqi,24px);letter-spacing:-.02em}
  .sun{position:absolute;right:-40px;top:-40px;width:230px;height:230px;opacity:.18;animation:spin 60s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .curve{width:100%;height:auto;display:block;margin-top:6px}.gap{height:24px}
  .curve .zl{font-size:14px;font-weight:700}.curve .ax{font-size:12px;fill:var(--mut);font-weight:600}
  .draw{stroke-dasharray:2000;stroke-dashoffset:0;animation:dr 1.6s cubic-bezier(.2,.8,.2,1)}@keyframes dr{from{stroke-dashoffset:2000}}
  .trade{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-top:4px}
  .trade .px b{font-size:clamp(26px,3cqi,36px);font-weight:800;letter-spacing:-.03em}.trade .px b.gr{color:#1fb457}.trade .px small{font-size:13px;color:var(--mut);font-weight:600;margin-left:3px}
  .trade .px div{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
  .mg{background:rgba(31,180,87,.14);color:#1a9a4c;border-radius:14px;padding:9px 14px;font-weight:700;font-size:15px;text-align:center}.mg.neg{background:rgba(255,105,97,.14);color:#e0453c}
  .r2{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(12px,1.5cqi,18px);margin-top:clamp(12px,1.5cqi,18px)}
  .tile .top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
  .tile .v{font-size:clamp(38px,4cqi,52px);font-weight:800;letter-spacing:-.04em;line-height:1;margin-top:12px}.tile .v small{font-size:.42em;color:var(--mut);margin-left:4px;letter-spacing:0}
  .tile .s{font-size:14px;color:var(--mut);font-weight:500;margin-top:6px}
  .pill{display:inline-block;margin-top:14px;border-radius:999px;padding:7px 14px;font-weight:700;font-size:15px}
  .g{background:rgba(31,180,87,.15);color:#1a9a4c}.o{background:rgba(255,159,10,.18);color:#c46d00}.d{background:var(--pill-d);color:#fff}
  .w.dark .g{color:#4cd97b}.w.dark .o{color:#ffb340}
  .ring{width:84px;height:84px;flex:none}.ring .rt{font-size:22px;font-weight:800;fill:var(--tx)}
  .rg{transition:stroke-dasharray 1.2s cubic-bezier(.2,.8,.2,1)}.rg.in{stroke-dasharray:var(--d) 400}
  .r3{display:grid;grid-template-columns:1fr 1.2fr;gap:clamp(12px,1.5cqi,18px);margin-top:clamp(12px,1.5cqi,18px)}
  .batt{display:flex;gap:24px;align-items:center;margin-top:10px}
  .bshape{width:170px;flex:none}.bshape .bo{stroke:var(--mut);opacity:.45}.bshape .bt{fill:var(--mut);opacity:.45}.bshape .bp{font-size:22px;font-weight:800;fill:#fff}
  .bf{transform-origin:10px 0;transform:scaleX(0);transition:transform 1.1s cubic-bezier(.2,.8,.2,1)}.bf.in{transform:none}
  .bnum{font-size:clamp(40px,4cqi,52px);font-weight:800;letter-spacing:-.04em;line-height:1}.bnum small{font-size:18px;color:var(--mut);margin-left:6px;letter-spacing:0;font-weight:600}
  .kv{display:grid;grid-template-columns:1fr 1fr;gap:12px 20px;margin-top:16px}.kv div{font-size:12px;color:var(--mut);font-weight:700;text-transform:uppercase;letter-spacing:.03em}.kv b{display:block;font-size:22px;color:var(--tx);letter-spacing:-.02em;text-transform:none;margin-top:2px}
  .pb{margin-top:16px}.pb .row{display:flex;justify-content:space-between;gap:10px;font-size:14px;font-weight:600;margin-bottom:7px}.pb .row b{font-size:15px;white-space:nowrap}
  .track{height:18px;border-radius:9px;background:var(--tr);overflow:hidden;position:relative}
  .pw{position:absolute;inset:0 auto 0 0;width:0;border-radius:9px;transition:width 1.3s cubic-bezier(.2,.8,.2,1)}.pw.in{width:var(--w)}
  .yrs{display:flex;gap:10px;margin-top:18px}.yrs div{flex:1;border-radius:14px;padding:10px 12px;background:rgba(94,92,230,.1);font-size:12px;font-weight:700;color:#5e5ce6;text-transform:uppercase;letter-spacing:.03em}
  .yrs b{display:block;font-size:clamp(18px,2cqi,22px);letter-spacing:-.02em;text-transform:none;color:var(--tx);margin-top:2px}
  .r4{margin-top:clamp(12px,1.5cqi,18px);display:grid;grid-template-columns:1.6fr 1fr;gap:clamp(12px,1.5cqi,18px)}
  .costbar{display:flex;height:46px;border-radius:14px;overflow:hidden;margin-top:14px;gap:3px;transform-origin:left;transform:scaleX(0);transition:transform 1s cubic-bezier(.2,.8,.2,1)}.costbar.in{transform:none}
  .costbar i{display:flex;align-items:center;padding-left:12px;color:#fff;font-weight:700;font-size:14px;font-style:normal;white-space:nowrap;overflow:hidden}
  .cl{display:flex;gap:8px 22px;margin-top:12px;flex-wrap:wrap;font-size:14px;color:var(--mut);font-weight:600}.cl span{display:flex;align-items:center}.cl b{color:var(--tx);font-size:17px;margin-left:6px}.cl em{width:9px;height:9px;border-radius:3px;display:inline-block;margin-right:6px}
  .bal{display:flex;flex-direction:column;justify-content:center}
  .bv{font-size:clamp(44px,4.6cqi,60px);font-weight:800;letter-spacing:-.045em;line-height:1;margin-top:10px}.bv.pos{color:#1fb457}.bv.neg{color:#ff6961}
  @container (max-width:900px){.r1,.r3,.r4{grid-template-columns:1fr}.r2{grid-template-columns:1fr}}
  @container (max-width:520px){.batt{flex-direction:column;align-items:flex-start}.yrs{flex-direction:column}.trade{flex-wrap:wrap}.mg{order:3;flex-basis:100%}.seg b{padding:7px 11px}}
  @media (prefers-reduced-motion:reduce){.sun,.draw{animation:none}}
  `;

  class IgyEnergyStoryCardEditor extends HTMLElement {
    setConfig(c) { this._cfg = Object.assign({}, c || {}); if (this._f) this._f.data = this._data(); }
    _data() { const c = this._cfg || {}, t = c.tariff || {}; return Object.assign({ view: 'month' }, c, { vt: t.vt != null ? t.vt : DEF_TAR.vt, nt: t.nt != null ? t.nt : DEF_TAR.nt }); }
    set hass(h) {
      setLang(h); this._hass = h; this._cfg = this._cfg || {};
      if (!this._f) {
        const f = this._f = document.createElement('ha-form');
        const num = (n, unit, max, step) => ({ name: n, selector: { number: { min: 0, max, step, mode: 'box', unit_of_measurement: unit } } });
        const st = (n) => ({ name: n, selector: { statistic: {} } });
        f.schema = [
          { name: 'view', selector: { select: { mode: 'dropdown', options: [{ value: 'month', label: _('Mesiac') }, { value: 'year', label: _('Rok') }, { value: 'total', label: _('Celkovo') }] } } },
          { type: 'grid', name: '', schema: [num('battery_capacity', 'kWh', 500, 0.5), num('battery_cycle_life', '', 20000, 100), num('battery_price', '€', 100000, 50), num('system_price', '€', 200000, 50)] },
          { name: 'battery_cycles_entity', selector: { entity: { domain: ['sensor', 'number', 'input_number'] } } },
          { type: 'grid', name: '', schema: [{ name: 'install_date', selector: { date: {} } }, num('vt', '€/kWh', 2, 0.001), num('nt', '€/kWh', 2, 0.001)] },
          { name: 'price_stat', selector: { statistic: {} } },
          { type: 'expandable', name: '', title: _('Štatistiky (prázdne = z Energy dashboardu)'), icon: 'mdi:chart-box-outline',
            schema: ['stat_solar', 'stat_grid_in', 'cost_grid_in', 'stat_grid_out', 'cost_grid_out', 'stat_battery_in', 'stat_battery_out', 'stat_gas', 'cost_gas', 'stat_water', 'cost_water'].map(st) }
        ];
        const L = { view: _('Úvodné zobrazenie'), battery_capacity: _('Kapacita batérie'), battery_cycle_life: _('Garantované cykly'), battery_cycles_entity: _('Celkové cykly batérie (entita)'),
          battery_price: _('Cena batérie'), system_price: _('Cena celej FVE'), install_date: _('Dátum inštalácie'), vt: _('Cena VT'), nt: _('Cena NT'), price_stat: _('Spotová cena (štatistika)') };
        f.computeLabel = (x) => L[x.name] || x.name;
        f.addEventListener('value-changed', (e) => {
          const v = Object.assign({}, e.detail.value), c = { type: (this._cfg && this._cfg.type) || 'custom:igy-energy-story-card' };
          const tar = Object.assign({}, (this._cfg && this._cfg.tariff) || {});
          ['vt', 'nt'].forEach((k) => { if (v[k] != null && v[k] !== '' && v[k] !== DEF_TAR[k]) tar[k] = v[k]; else delete tar[k]; delete v[k]; });
          Object.keys(v).forEach((k) => { if (k === 'type' || k === 'tariff' || v[k] === '' || v[k] == null || (k === 'view' && v[k] === 'month')) return; c[k] = v[k]; });
          if (Object.keys(tar).length) c.tariff = tar;
          this._cfg = c;
          this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: c }, bubbles: true, composed: true }));
        });
        this.appendChild(f);
        f.data = this._data();
      }
      this._f.hass = h;
    }
  }

  if (!customElements.get('igy-energy-story-card-editor')) customElements.define('igy-energy-story-card-editor', IgyEnergyStoryCardEditor);
  if (!customElements.get('igy-energy-story-card')) customElements.define('igy-energy-story-card', IgyEnergyStoryCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-energy-story-card'))
    window.customCards.push({ type: 'igy-energy-story-card', name: 'Igy Energy Story', description: _('Čo prináša FVE a batéria – prínos, obchod so sieťou, návratnosť a náklady domu'), preview: false });
})();
