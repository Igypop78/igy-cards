/*
 * Igy Battery Card – batéria (hlavný merač, napr. Victron SmartShunt) a jednotlivé BMS v štýle Home kariet.
 *
 *   type: custom:igy-battery-card
 *   title: Batéria
 *   main:                                   # hlavný zdroj pravdy za celú batériu
 *     name: SmartShunt
 *     soc: sensor.smartshunt_soc_keep
 *     power: sensor.smartshunt_power_keep   # + nabíja, − vybíja
 *     voltage: sensor.smartshunt_voltage_keep
 *     current: sensor.smartshunt_current    # voliteľné
 *     time: sensor.smartshunt_time_to_go    # voliteľné – zostávajúci čas
 *   packs:                                  # jednotlivé BMS – stĺpce sa zobrazia len pre vyplnené hodnoty
 *     - name: BMS 1
 *       info: 280 Ah                        # voliteľné – druhý riadok
 *       power: sensor.bms_metering_1_power_bms_home
 *       delta: sensor.bms_metering_1_delta_cell_voltage_bms_home
 *       soc: …  voltage: …  current: …  temp: …
 *       cycles: …                           # voliteľné – „324 cyklov“ pod názvom
 *       balancing: …                        # voliteľné – ikona ⚖ pri názve, keď nie je 0 / off
 *   extras:                                 # voliteľné – ďalšie hodnoty dole (teplota meniča, ventilátor…)
 *     - entity: sensor.temperature_inverter_keep
 *       name: Teplota meniča
 *   pack_max: 5000                          # W na plný pásik výkonu BMS
 *   delta_warn: [0.02, 0.05]                # V – rozdiel článkov: zelená / oranžová / červená
 */
(function () {
  'use strict';
  const VERSION = '1.1.2';
  const G = '#30d158', R = '#ff6961', O = '#ff9f0a', MUTE = 'var(--secondary-text-color)';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  const BAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="7" width="17" height="10" rx="2.5"/><path d="M22 10.5v3"/></svg>';
  const COLS = [
    { k: 'power', t: 'Výkon', w: '1.2fr' }, { k: 'soc', t: 'SOC', w: '.8fr' }, { k: 'voltage', t: 'Napätie', w: '1fr' },
    { k: 'current', t: 'Prúd', w: '.9fr' }, { k: 'delta', t: 'Δ článkov', w: '1fr' }, { k: 'temp', t: 'Teplota', w: '.9fr' }];

  function normalize(c) {
    c = JSON.parse(JSON.stringify(c || {}));
    c.main = c.main || {}; c.packs = (c.packs || []).filter(Boolean); c.extras = (c.extras || []).map((x) => typeof x === 'string' ? { entity: x } : x).filter(Boolean);
    return c;
  }

  const CSS = `
    ha-card { padding: 12px 16px 16px; overflow: hidden; }
    .hl { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--secondary-text-color); letter-spacing: .02em; margin-bottom: 10px; }
    .hl svg { width: 16px; height: 16px; }
    .box { border-radius: 16px; background: var(--hc-surface, rgba(127,127,127,.1)); box-shadow: inset 0 0 0 1px var(--hc-surface-line, transparent); overflow: hidden; }
    .box + .box { margin-top: 8px; }
    [data-more] { cursor: pointer; -webkit-tap-highlight-color: transparent; }
    /* hlavný merač */
    .main { padding: 12px 14px 14px; display: grid; gap: 10px; }
    .m1 { display: flex; align-items: flex-end; gap: 12px; }
    .soc { font-size: 34px; font-weight: 600; line-height: 1; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
    .soc small { font-size: 16px; font-weight: 500; color: var(--secondary-text-color); margin-left: 2px; }
    .pw { margin-left: auto; text-align: right; font-variant-numeric: tabular-nums; }
    .pw b { display: block; font-size: 20px; font-weight: 600; line-height: 1.1; }
    .pw small { font-size: 12px; color: var(--secondary-text-color); }
    .sb { position: relative; height: 10px; border-radius: 99px; background: rgba(127,127,127,.2); overflow: hidden; }
    .sb i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 99px; transition: width .6s ease, background .4s; }
    .sb.chg i { background-image: repeating-linear-gradient(-45deg, rgba(255,255,255,.18) 0 6px, transparent 6px 12px); background-size: 34px 34px; animation: flow 1.2s linear infinite; }
    @keyframes flow { to { background-position: 34px 0; } }
    @media (prefers-reduced-motion: reduce) { .sb.chg i { animation: none; } }
    .m2 { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 12.5px; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
    .m2 b { color: var(--primary-text-color); font-weight: 500; }
    .m2 .src { margin-left: auto; }
    /* tabuľka BMS */
    .th, .tr { display: grid; grid-template-columns: minmax(64px, 1.3fr) var(--cols); gap: 8px; align-items: center; padding: 0 12px; }
    .th { padding-top: 9px; padding-bottom: 6px; font-size: 10.5px; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: .05em; }
    .th span, .tr .c { text-align: right; white-space: nowrap; }
    .tr { min-height: 48px; border-top: 1px solid rgba(127,127,127,.14); font-size: 13.5px; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
    .tr:active { background: rgba(127,127,127,.08); }
    .tr .n { min-width: 0; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tr .n .bal { color: ${O}; font-size: 12px; font-weight: 400; }
    .tr .n small { display: block; font-size: 11px; color: var(--secondary-text-color); font-weight: 400; }
    .tr .c small { font-size: 11px; color: var(--secondary-text-color); margin-left: 1px; }
    .tr .c.pw2 { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .bi { position: relative; width: 100%; max-width: 70px; height: 4px; border-radius: 9px; background: rgba(127,127,127,.18); }
    .bi::after { content: ''; position: absolute; left: 50%; top: -2px; bottom: -2px; width: 1px; background: rgba(127,127,127,.45); }
    .bi i { position: absolute; top: 0; bottom: 0; border-radius: 9px; transition: width .5s ease, left .5s ease; }
    .na { color: var(--secondary-text-color); opacity: .6; }
    .sum { display: flex; justify-content: space-between; gap: 8px; padding: 8px 12px 10px; border-top: 1px solid rgba(127,127,127,.14); font-size: 12px; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
    .sum b { color: var(--primary-text-color); font-weight: 500; }
    /* doplnkové hodnoty */
    .ex { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 10px; padding: 10px 12px 12px; }
    .ex div { min-width: 0; font-size: 11.5px; color: var(--secondary-text-color); }
    .ex b { display: block; margin-top: 2px; font-size: 14.5px; font-weight: 500; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
    .empty { font-size: 13px; color: var(--secondary-text-color); padding: 8px 2px; }
  `;

  class HomeBatteryCard extends HTMLElement {
    static getConfigElement() { return document.createElement('igy-battery-card-editor'); }
    static getStubConfig(hass) {
      const st = hass ? hass.states : {}, f = (re) => Object.keys(st).find((id) => re.test(id));
      return { title: 'Batéria', main: { soc: f(/^sensor\..*battery.*soc|^sensor\..*_soc/) || '', power: f(/^sensor\..*battery.*power/) || '' }, packs: [] };
    }
    setConfig(c) { if (!c) throw new Error('Chybná konfigurácia.'); this._cfg = normalize(c); this._sig = ''; if (this._hass) this._render(); }
    set hass(h) { this._hass = h; if (this._cfg) this._render(); }
    getCardSize() { return 3 + (this._cfg ? this._cfg.packs.length : 0); }
    getGridOptions() { return { columns: 12, min_columns: 6 }; }

    _s(id) { return id && this._hass.states[id]; }
    _n(id) { const s = this._s(id); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
    _u(id) { const s = this._s(id); return (s && s.attributes.unit_of_measurement) || ''; }
    _w(id) { const v = this._n(id); if (v == null) return null; const u = this._u(id).toLowerCase(); return u === 'kw' ? v * 1000 : v; }
    _V(id) { const v = this._n(id); if (v == null) return null; return this._u(id).toLowerCase() === 'mv' ? v / 1000 : v; }
    _loc() { return (this._hass.locale && this._hass.locale.language) || 'sk'; }
    _f(v, d) { return Number(v).toLocaleString(this._loc(), { minimumFractionDigits: d, maximumFractionDigits: d }); }
    _fw(w) { if (w == null) return '–'; const a = Math.abs(w); return (w > 0 ? '+' : w < 0 ? '−' : '') + (a >= 10000 ? this._f(a / 1000, 1) + '<small>kW</small>' : this._f(a, a < 100 ? 1 : 0) + '<small>W</small>'); }
    _pc(w) { return w == null ? MUTE : w > 20 ? G : w < -20 ? R : MUTE; }
    _sc(s) { return s == null ? MUTE : s < 15 ? R : s < 35 ? O : G; }
    _dc(d) { const t = this._cfg.delta_warn || [0.02, 0.05]; return d == null ? MUTE : d < t[0] ? G : d < t[1] ? O : R; }
    _state(id) {
      const s = this._s(id); if (!s) return '–';
      if (s.state === 'on') return 'zapnutý'; if (s.state === 'off') return 'vypnutý';
      try { if (this._hass.formatEntityState) return this._hass.formatEntityState(s); } catch (_) { }
      const u = s.attributes.unit_of_measurement; return s.state + (u ? ' ' + u : '');
    }
    _dur(id) {
      const v = this._n(id); if (v == null) return null; const u = this._u(id).toLowerCase();
      const m = u === 's' ? v / 60 : u === 'h' ? v * 60 : u === 'd' ? v * 1440 : v; if (m <= 0 || m > 60 * 24 * 30) return null;
      const h = Math.floor(m / 60); return h >= 48 ? Math.round(h / 24) + ' d' : (h ? h + ' h ' : '') + Math.round(m % 60) + ' min';
    }

    _render() {
      if (!this._hass || !this._cfg) return;
      const c = this._cfg, m = c.main, ids = [m.soc, m.power, m.voltage, m.current, m.time].concat(...c.packs.map((p) => COLS.map((x) => p[x.k]).concat([p.cycles, p.balancing])), c.extras.map((x) => x.entity)).filter(Boolean);
      const sig = ids.map((id) => { const s = this._s(id); return s ? s.state : '?'; }).join('|');
      if (sig === this._sig) return; this._sig = sig;
      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card><div id="c"></div></ha-card>`;
        this.shadowRoot.querySelector('ha-card').addEventListener('click', (e) => {
          const el = e.target.closest('[data-more]'); if (el && el.dataset.more) this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: el.dataset.more }, bubbles: true, composed: true }));
        });
      }
      let h = `<div class="hl">${BAT}<span>${esc(c.title || 'Batéria')}</span></div>`;
      // hlavný merač
      if (m.soc || m.power) {
        const soc = this._n(m.soc), pw = this._w(m.power), v = this._V(m.voltage), a = this._n(m.current), tt = m.time ? this._dur(m.time) : null;
        const state = pw == null ? '' : pw > 20 ? 'nabíja' : pw < -20 ? 'vybíja' : 'stojí';
        h += `<div class="box main"><div class="m1"><div class="soc" data-more="${esc(m.soc || '')}">${soc == null ? '–' : Math.round(soc)}<small>%</small></div>`
          + `<div class="pw" data-more="${esc(m.power || '')}"><b style="color:${this._pc(pw)}">${this._fw(pw)}</b><small>${state}${tt ? (pw < -20 ? ' · vydrží ' : ' · ') + tt : ''}</small></div></div>`
          + `<div class="sb${pw != null && pw > 20 ? ' chg' : ''}" data-more="${esc(m.soc || '')}"><i style="width:${Math.max(0, Math.min(100, soc || 0)).toFixed(1)}%;background-color:${this._sc(soc)}"></i></div>`
          + `<div class="m2">${v != null ? `<span data-more="${esc(m.voltage)}"><b>${this._f(v, 2)}</b> V</span>` : ''}${a != null ? `<span data-more="${esc(m.current)}"><b>${this._f(a, 1)}</b> A</span>` : ''}<span class="src">${esc(m.name || '')}</span></div></div>`;
      }
      // BMS
      if (c.packs.length) {
        const cols = COLS.filter((x) => c.packs.some((p) => p[x.k]));
        const pmax = +c.pack_max || 5000;
        h += `<div class="box" style="--cols:${cols.map((x) => x.w).join(' ')}"><div class="th"><div>BMS</div>${cols.map((x) => `<span>${x.t}</span>`).join('')}</div>`;
        let sum = 0, any = false;
        c.packs.forEach((p, i) => {
          const cell = (x) => {
            const id = p[x.k]; if (!id) return '<span class="c"></span>';
            if (x.k === 'power') {
              const w = this._w(id); if (w != null) { sum += w; any = true; }
              const f = w == null ? 0 : Math.min(50, Math.abs(w) / pmax * 50), col = this._pc(w);
              return `<span class="c pw2" data-more="${esc(id)}"><span style="color:${col}">${this._fw(w)}</span><span class="bi"><i style="background:${col};width:${f.toFixed(1)}%;left:${w < 0 ? (50 - f).toFixed(1) : 50}%"></i></span></span>`;
            }
            if (x.k === 'soc') { const s = this._n(id); return `<span class="c" data-more="${esc(id)}" style="color:${this._sc(s)}">${s == null ? '–' : Math.round(s) + '<small>%</small>'}</span>`; }
            if (x.k === 'voltage') { const v = this._V(id); return `<span class="c${v == null ? ' na' : ''}" data-more="${esc(id)}">${v == null ? '–' : this._f(v, 2) + '<small>V</small>'}</span>`; }
            if (x.k === 'current') { const a = this._n(id); return `<span class="c${a == null ? ' na' : ''}" data-more="${esc(id)}">${a == null ? '–' : this._f(a, 1) + '<small>A</small>'}</span>`; }
            if (x.k === 'delta') { const d = this._V(id); return `<span class="c" data-more="${esc(id)}" style="color:${this._dc(d)}">${d == null ? '–' : this._f(d * 1000, 0) + '<small>mV</small>'}</span>`; }
            if (x.k === 'temp') { const t = this._n(id); return `<span class="c${t == null ? ' na' : ''}" data-more="${esc(id)}" style="${t != null && t >= 45 ? 'color:' + R : ''}">${t == null ? '–' : this._f(t, 1) + '<small>°C</small>'}</span>`; }
            return '<span class="c"></span>';
          };
          // druhý riadok: popis, cykly, vyrovnávanie článkov
          const cy = this._n(p.cycles), bs = this._s(p.balancing), bv = bs ? (bs.state === 'on' ? 1 : parseFloat(bs.state)) : NaN, bal = !isNaN(bv) && bv > 0;
          // JK BMS (syssi/esphome-jk-bms): 0 = vypnuté, 1 = vyrovnáva pri nabíjaní, 2 = pri vybíjaní
          const balT = bv === 2 ? 'vyrovnáva články pri vybíjaní' : bv === 1 ? 'vyrovnáva články pri nabíjaní' : 'vyrovnáva články';
          const sub = [p.info ? esc(p.info) : '', cy != null ? Math.round(cy) + ' cyklov' : ''].filter(Boolean).join(' · ');
          h += `<div class="tr" data-more="${esc(p.power || p.soc || '')}"><div class="n">${esc(p.name || 'BMS ' + (i + 1))}${bal ? ` <span class="bal" title="${balT}">⚖</span>` : ''}${sub ? `<small>${sub}</small>` : ''}</div>${cols.map(cell).join('')}</div>`;
        });
        if (any && c.packs.length > 1) {
          const mw = this._w(m.power);
          h += `<div class="sum"><span>Súčet BMS <b style="color:${this._pc(sum)}">${this._fw(sum).replace(/<\/?small>/g, ' ')}</b></span>${mw != null ? `<span>rozdiel voči ${esc(m.name || 'meraču')} <b>${this._fw(sum - mw).replace(/<\/?small>/g, ' ')}</b></span>` : ''}</div>`;
        }
        h += '</div>';
      }
      if (c.extras.length) {
        h += `<div class="box ex">${c.extras.map((x) => { const s = this._s(x.entity); return `<div data-more="${esc(x.entity)}">${esc(x.name || (s && s.attributes.friendly_name) || x.entity)}<b>${esc(this._state(x.entity))}</b></div>`; }).join('')}</div>`;
      }
      if (!m.soc && !m.power && !c.packs.length && !c.extras.length) h += '<div class="empty">Nastav hlavný merač a BMS v nastaveniach karty.</div>';
      const box = this.shadowRoot.getElementById('c'); if (box.__h !== h) { box.__h = h; box.innerHTML = h; }
    }
  }

  /* ================= Editor ================= */
  const EDCSS = `
    .ed { display: flex; flex-direction: column; gap: 14px; }
    .hint { font-size: 13px; color: var(--secondary-text-color); line-height: 1.4; }
    .sec { font-size: 14px; font-weight: 500; color: var(--primary-text-color); margin-top: 4px; }
    .items { display: flex; flex-direction: column; gap: 8px; }
    .it { border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 12px; background: var(--card-background-color); }
    .ih { display: flex; align-items: center; gap: 4px; padding: 6px 4px 6px 10px; min-height: 40px; }
    .ih .tx { flex: 1; min-width: 0; cursor: pointer; }
    .ih .tx b { display: block; font-size: 14px; font-weight: 500; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ih .tx small { display: block; font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ib { background: none; border: 0; color: var(--secondary-text-color); cursor: pointer; padding: 6px; border-radius: 50%; display: flex; }
    .ib:hover { background: rgba(127,127,127,.15); } .ib:disabled { opacity: .25; cursor: default; }
    .ib svg { width: 20px; height: 20px; } .ib.exp svg { transition: transform .2s; }
    .it.open > .ih .ib.exp svg { transform: rotate(180deg); }
    .body { display: none; padding: 0 12px 12px; } .it.open > .body { display: block; }
    .btn { align-self: flex-start; background: none; border: 1px dashed var(--divider-color, rgba(127,127,127,.4)); border-radius: 10px; padding: 8px 14px; color: var(--primary-text-color); cursor: pointer; font: inherit; font-size: 13px; }
  `;
  const ICO = {
    down: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6z"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 14l5-5 5 5z"/></svg>',
    dn: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9m0 5h2v9H9V8m4 0h2v9h-2V8z"/></svg>'
  };
  const ENT = (n) => ({ name: n, selector: { entity: {} } });

  class HomeBatteryCardEditor extends HTMLElement {
    setConfig(config) { const c = normalize(config); if (this._last && JSON.stringify(c) === this._last) return; this._cfg = c; this._last = JSON.stringify(c); if (this._hass) this._build(); }
    set hass(h) { const f = !this._hass; this._hass = h; if (f && this._cfg) this._build(); this.querySelectorAll('ha-form').forEach((x) => { x.hass = h; }); }
    _emit() {
      const c = JSON.parse(JSON.stringify(Object.assign({ type: 'custom:igy-battery-card' }, this._cfg)));
      if (!c.packs.length) delete c.packs; if (!c.extras.length) delete c.extras;
      this._last = JSON.stringify(normalize(c));
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: c }, bubbles: true, composed: true }));
    }
    _form(data, schema, L, H, cb) {
      const f = document.createElement('ha-form'); f.hass = this._hass; f.data = data; f.schema = schema;
      f.computeLabel = (x) => L[x.name] || x.name; f.computeHelper = (x) => H && H[x.name];
      f.addEventListener('value-changed', (e) => { e.stopPropagation(); const v = Object.assign({}, e.detail.value); try { cb(v); } catch (err) { console.error('igy-battery-card editor:', err); } });
      return f;
    }
    _set(o, v, keys) { keys.forEach((k) => { if (v[k] !== '' && v[k] != null && v[k] !== false) o[k] = v[k]; else delete o[k]; }); }
    _build() {
      const c = this._cfg, open = this._open || (this._open = new Set());
      this.innerHTML = `<style>${EDCSS}</style><div class="ed"><div id="top"></div><div class="sec">Hlavný merač (celá batéria)</div><div id="main"></div>
        <div class="sec">Jednotlivé BMS</div><div class="hint">Stĺpce v tabuľke sa zobrazia len pre hodnoty, ktoré vyplníš aspoň pri jednom BMS.</div><div class="items" id="packs"></div><button class="btn" id="addp">+ Pridať BMS</button>
        <div class="sec">Ďalšie hodnoty</div><div class="items" id="extras"></div><button class="btn" id="adde">+ Pridať hodnotu</button></div>`;
      this.querySelector('#top').appendChild(this._form({ title: c.title || '', pack_max: c.pack_max || 5000 },
        [{ name: 'title', selector: { text: {} } }, { name: 'pack_max', selector: { number: { min: 500, max: 30000, step: 100, mode: 'box', unit_of_measurement: 'W' } } }],
        { title: 'Nadpis', pack_max: 'Plný pásik výkonu BMS' }, null, (v) => { this._set(c, v, ['title']); if (v.pack_max && +v.pack_max !== 5000) c.pack_max = +v.pack_max; else delete c.pack_max; this._emit(); }));
      const mk = ['name', 'soc', 'power', 'voltage', 'current', 'time'];
      this.querySelector('#main').appendChild(this._form(Object.assign({}, ...mk.map((k) => ({ [k]: c.main[k] || '' }))),
        [{ name: 'name', selector: { text: {} } }, ENT('soc'), ENT('power'), ENT('voltage'), ENT('current'), ENT('time')],
        { name: 'Názov (napr. SmartShunt)', soc: 'SOC', power: 'Výkon (+ nabíja / − vybíja)', voltage: 'Napätie', current: 'Prúd (voliteľné)', time: 'Zostávajúci čas (voliteľné)' }, null,
        (v) => { this._set(c.main, v, mk); this._emit(); }));
      const pk = ['name', 'info', 'power', 'soc', 'voltage', 'current', 'delta', 'temp', 'cycles', 'balancing'];
      const pb = this.querySelector('#packs');
      c.packs.forEach((p, i) => pb.appendChild(this._item(c.packs, i, p.name || 'BMS ' + (i + 1), [p.info, p.power].filter(Boolean).join(' · ') || 'vyber senzory', 'p' + i,
        Object.assign({}, ...pk.map((k) => ({ [k]: p[k] || '' }))),
        [{ name: 'name', selector: { text: {} } }, { name: 'info', selector: { text: {} } }, ENT('power'), ENT('soc'), ENT('voltage'), ENT('current'), ENT('delta'), ENT('temp'), ENT('cycles'), ENT('balancing')],
        { name: 'Názov', info: 'Popis (napr. 280 Ah)', power: 'Výkon', soc: 'SOC', voltage: 'Napätie', current: 'Prúd', delta: 'Rozdiel článkov', temp: 'Teplota', cycles: 'Počet cyklov (pod názvom)', balancing: 'Vyrovnávanie článkov (ikona ⚖ pri názve)' },
        (v, it) => { this._set(p, v, pk); it.querySelector('.tx b').textContent = p.name || 'BMS ' + (i + 1); this._emit(); })));
      this.querySelector('#addp').onclick = () => { c.packs.push({ name: 'BMS ' + (c.packs.length + 1) }); open.add('p' + (c.packs.length - 1)); this._emit(); this._build(); };
      const eb = this.querySelector('#extras');
      c.extras.forEach((x, i) => { const s = x.entity && this._hass.states[x.entity]; eb.appendChild(this._item(c.extras, i, x.name || (s && s.attributes.friendly_name) || x.entity || 'Nová hodnota', x.entity || 'vyber entitu', 'e' + i,
        { entity: x.entity || '', name: x.name || '' }, [ENT('entity'), { name: 'name', selector: { text: {} } }], { entity: 'Entita', name: 'Názov' },
        (v, it) => { this._set(x, v, ['entity', 'name']); it.querySelector('.tx b').textContent = x.name || x.entity || 'Nová hodnota'; this._emit(); })); });
      this.querySelector('#adde').onclick = () => { c.extras.push({}); open.add('e' + (c.extras.length - 1)); this._emit(); this._build(); };
    }
    _item(arr, i, title, sub, key, data, schema, L, cb) {
      const it = document.createElement('div'), open = this._open; it.className = 'it' + (open.has(key) ? ' open' : '');
      it.innerHTML = `<div class="ih"><span class="tx"><b></b><small></small></span><button class="ib up">${ICO.up}</button><button class="ib dn">${ICO.dn}</button><button class="ib exp">${ICO.down}</button><button class="ib del">${ICO.del}</button></div><div class="body"></div>`;
      it.querySelector('.tx b').textContent = title; it.querySelector('.tx small').textContent = sub;
      const tog = () => { it.classList.toggle('open'); if (it.classList.contains('open')) open.add(key); else open.delete(key); };
      it.querySelector('.tx').onclick = tog; it.querySelector('.exp').onclick = tog;
      const mv = (d) => () => { const j = i + d; [arr[i], arr[j]] = [arr[j], arr[i]]; this._open = new Set(); this._emit(); this._build(); };
      const u = it.querySelector('.up'), dn = it.querySelector('.dn'); u.disabled = i === 0; dn.disabled = i === arr.length - 1; u.onclick = mv(-1); dn.onclick = mv(1);
      it.querySelector('.del').onclick = () => { arr.splice(i, 1); this._open = new Set(); this._emit(); this._build(); };
      it.querySelector('.body').appendChild(this._form(data, schema, L, null, (v) => cb(v, it)));
      return it;
    }
  }

  if (!customElements.get('igy-battery-card-editor')) customElements.define('igy-battery-card-editor', HomeBatteryCardEditor);
  if (!customElements.get('igy-battery-card')) customElements.define('igy-battery-card', HomeBatteryCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-battery-card'))
    window.customCards.push({ type: 'igy-battery-card', name: 'Igy Battery Card', description: 'Batéria: hlavný merač (SOC, výkon) a tabuľka jednotlivých BMS.', preview: true });
  console.info('%c IGY-BATTERY-CARD %c ' + VERSION + ' ', 'background:#30d158;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();
