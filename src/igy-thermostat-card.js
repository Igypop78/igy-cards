/*
 * Igy Thermostat Card – vybrané termostaty v jednej karte (štýl Home Energy Card).
 *
 *   type: custom:igy-thermostat-card
 *   title: Kúrenie                      # voliteľné
 *   entities:
 *     - entity: climate.obyvacka
 *     - entity: climate.spalna
 *       name: Spálňa                    # voliteľné
 *       window: binary_sensor.okno_spalna   # voliteľné – pri otvorení sa riadok zablokuje
 *       history: switch.kotol_spalna    # voliteľné – podľa čoho sa počíta beh (inak hvac_action = heating)
 *   runtime: true                       # čiara dole: kedy bola požiadavka na kúrenie (súbeh zlúčený)
 *   hours: 24                           # za koľko hodín dozadu
 *   warn_hours: 3                       # varovanie: kúri dlhšie ako N h a teplota nerastie (0 = vypnuté)
 *
 * Potiahnutie vodorovne = zmena cieľovej teploty, ťuk = detail.
 * Staršia konfigurácia (order + overrides) sa prevedie automaticky.
 */
(function () {
  'use strict';
  const VERSION = '4.7.7';
  const COL = { heat: '#ff9f0a', cool: '#0a84ff', win: '#ff6961', warn: '#ffd60a' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  const CSS = `
    ha-card { padding: 18px; overflow: hidden; }
    .hl { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--secondary-text-color); letter-spacing: .02em; margin-bottom: 14px; }
    .hl ha-icon { --mdc-icon-size: 16px; }
    .hl .cnt { margin-left: auto; font-weight: 500; display: flex; align-items: center; gap: 6px; color: ${COL.heat}; }
    .hl .cnt::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: ${COL.heat}; box-shadow: 0 0 8px ${COL.heat}; }
    .hl .cnt:empty { display: none; }
    .hl.tap { cursor: pointer; user-select: none; -webkit-user-select: none; }
    .hl .chev { --mdc-icon-size: 18px; transition: transform .3s; margin-left: 2px; }
    .hl .cnt:empty + .chev { margin-left: auto; }
    ha-card.col .chev { transform: rotate(-90deg); }
    ha-card.col .list, ha-card.col .empty { display: none !important; }
    ha-card.col .hl { margin-bottom: 0; }
    ha-card.col .dm { margin-top: 12px; }
    .list { border-radius: 18px; background: var(--hc-surface, rgba(127,127,127,.1)); box-shadow: inset 0 0 0 1px var(--hc-surface-line, transparent); overflow: hidden; }
    .empty { font-size: 13px; color: var(--secondary-text-color); padding: 6px 0; }
    .row { position: relative; padding: 0 14px; min-height: 52px; display: flex; align-items: center; overflow: hidden;
      cursor: pointer; user-select: none; -webkit-user-select: none; touch-action: pan-y; }
    .row:active { background: rgba(127,127,127,.08); }
    .row + .row::before { content: ''; position: absolute; left: 48px; right: 0; top: 0; height: 1px; background: rgba(127,127,127,.18); z-index: 1; }
    .row.na { opacity: .5; }
    .glow { position: absolute; inset: 0; width: 0; pointer-events: none; opacity: 0; transition: width .5s cubic-bezier(.3,.7,.3,1), opacity .6s;
      background: linear-gradient(90deg, var(--c) 0%, transparent 100%); }
    .row.heat .glow, .row.cool .glow { opacity: .16; }
    .row.drag .glow { transition: none; opacity: .22; }
    .glow2 { position: absolute; inset: 0; left: auto; width: 75%; pointer-events: none; opacity: 0; transition: opacity .6s;
      background: linear-gradient(270deg, ${COL.win} 0%, transparent 100%); }
    .row.window .glow2 { opacity: .2; }
    .row.window .ic, .row.window .nm .cur { color: ${COL.win} !important; }
    .row.window .tg, .row.window .ct { opacity: .4; }
    .list.dragging .row:not(.drag) { opacity: .35; }
    .row { transition: background .2s, opacity .25s; }
    .ok { display: inline-block; width: 0; overflow: hidden; color: #30d158; font-size: 15px; font-weight: 600; transition: width .2s; align-self: center; }
    .row.okk .ok { width: 18px; }
    .row.pend .tg b { opacity: .55; }
    .wd { display: none; width: 7px; height: 7px; border-radius: 50%; background: ${COL.warn}; box-shadow: 0 0 6px ${COL.warn}; margin-left: 7px; vertical-align: middle; }
    .row.warn .wd { display: inline-block; }
    .row.warn.heat .nm .cur, .row.warn .nm .cur { color: ${COL.warn}; }
    .top { position: relative; display: flex; align-items: center; gap: 12px; width: 100%; padding: 8px 0; }
    .ic { color: var(--secondary-text-color); transition: color .6s; display: flex; flex: none; }
    .ic ha-icon { --mdc-icon-size: 22px; }
    .row.heat .ic, .row.cool .ic { color: var(--c); }
    .nm { flex: 1; min-width: 0; }
    .nm b { display: block; font-size: 14px; font-weight: 500; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nm .cur { display: block; font-size: 12px; color: var(--secondary-text-color); transition: color .6s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nm .cur:empty { display: none; }
    /* aktuálna teplota – hlavné číslo */
    .ct { flex: none; font-size: 20px; font-weight: 300; letter-spacing: -.02em; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
    .ct small { font-size: 13px; color: var(--secondary-text-color); margin-left: 1px; }
    /* cieľová teplota – pilulka */
    /* cieľová teplota – rovnaké písmo, pri kúrení len farba */
    .tg { flex: none; display: inline-flex; align-items: baseline; color: var(--primary-text-color); font-size: 20px; font-weight: 300; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
    .tg em { display: inline-flex; align-self: center; color: var(--primary-text-color); opacity: .55; margin: 0 7px 0 4px; transition: color .4s, opacity .4s; }
    .tg em svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
    .row.heat .tg em, .row.cool .tg em, .row.drag .tg em { color: var(--c); opacity: .9; }
    .tg b { font-weight: 300; transition: color .4s; }
    .tg small { font-size: 13px; color: var(--secondary-text-color); margin-left: 1px; }
    .row.heat .tg b, .row.cool .tg b, .row.drag .tg b { color: var(--c); }
    .row.drag .tg b { font-weight: 400; }
    .top { gap: 10px; } .ic { margin-right: 2px; }
    .dm { position: relative; height: 6px; margin-top: 14px; border-radius: 99px; background: rgba(127,127,127,.14); overflow: hidden; }
    .dm i { position: absolute; top: 0; bottom: 0; min-width: 1.5px; background: ${COL.heat}; opacity: .75; }
    .dm i.now { opacity: 1; border-radius: 0 99px 99px 0; }
    .row.off .top { opacity: .45; }
    .row.off .tg b::after { content: ''; }
  `;

  // starý formát (order + overrides) → entities
  function normalize(c) {
    c = JSON.parse(JSON.stringify(c || {}));
    if (!Array.isArray(c.entities)) {
      const ov = c.overrides || {};
      c.entities = (c.order || []).map((id) => Object.assign({ entity: id }, ov[id] || {}));
    }
    c.entities = c.entities.map((e) => typeof e === 'string' ? { entity: e } : e).filter((e) => e && e.entity);
    delete c.order; delete c.overrides;
    return c;
  }

  class MultiThermostatCard extends HTMLElement {
    static getConfigElement() { return document.createElement('igy-thermostat-card-editor'); }
    static getStubConfig(hass) {
      const ids = hass ? Object.keys(hass.states).filter((id) => id.startsWith('climate.')).slice(0, 4) : [];
      return { title: 'Kúrenie', entities: ids.map((id) => ({ entity: id })) };
    }

    setConfig(config) {
      if (!config) throw new Error('Chybná konfigurácia.');
      this._config = normalize(config);
      this._ov = {}; this._config.entities.forEach((e) => { this._ov[e.entity] = e; });
      this._sig = ''; this._card = null; this._hist = {}; this._histKey = '';
      if (this._hass) { this._render(); this._histStart(); }
    }
    set hass(hass) { const first = !this._hass; this._hass = hass; this._render(); if (first) this._histStart(); }
    connectedCallback() { if (this._hass) this._histStart(); }
    disconnectedCallback() { clearInterval(this._histT); this._histT = null; }
    _hours() { const h = this._config.hours; return h == null ? 24 : Math.max(1, Number(h) || 24); }
    _rtOn() { return this._config.runtime !== false; }
    _warnH() { const w = this._config.warn_hours; return w == null ? 3 : Math.max(0, Number(w) || 0); }
    _lsKey() { return 'mtc-collapsed:' + (this._config.title || '') + ':' + this._collect().join(','); }
    _lsGet() { try { return localStorage.getItem(this._lsKey()) === '1'; } catch (_) { return false; } }
    _lsSet(v) { try { if (v) localStorage.setItem(this._lsKey(), '1'); else localStorage.removeItem(this._lsKey()); } catch (_) { } }

    getCardSize() { return 1 + Math.ceil(this._config.entities.length * 1.2); }
    getGridOptions() { return { columns: 12, min_columns: 6 }; }
    _lang() { return (this._hass.locale && this._hass.locale.language) || 'sk'; }
    _t(v) { return Number(v).toLocaleString(this._lang(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
    _collect() { return this._config.entities.map((e) => e.entity); }

    _render() {
      if (!this._hass || !this._config) return;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const ids = this._collect();
      if (!this._card) {
        const t = this._config.title;
        this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card>
          ${t ? `<div class="hl tap" id="hl"><ha-icon icon="mdi:thermostat"></ha-icon><span>${esc(t)}</span><span class="cnt" id="cnt"></span><ha-icon class="chev" icon="mdi:chevron-down"></ha-icon></div>` : ''}
          <div class="list" id="list"></div><div class="empty" id="empty">Pridaj termostaty v nastaveniach karty.</div>
          ${this._rtOn() ? '<div class="dm" id="dm"></div>' : ''}
          </ha-card>`;
        this._card = this.shadowRoot.querySelector('ha-card');
        this._list = this.shadowRoot.getElementById('list');
        this._sig = '';
        const hl = this.shadowRoot.getElementById('hl');
        if (hl) {
          this._card.classList.toggle('col', this._lsGet());
          hl.addEventListener('click', () => { const c = !this._card.classList.contains('col'); this._card.classList.toggle('col', c); this._lsSet(c); });
        }
      }
      const sig = ids.join('|');
      if (this._sig !== sig) {
        this._sig = sig;
        this.shadowRoot.getElementById('empty').style.display = ids.length ? 'none' : '';
        this._list.style.display = ids.length ? '' : 'none';
        this._list.innerHTML = ids.map((id) => `
          <div class="row" data-id="${esc(id)}">
            <div class="glow"></div><div class="glow2"></div>
            <div class="top">
              <span class="ic"><ha-icon></ha-icon></span>
              <span class="nm"><b><span class="n"></span><i class="wd" title="Kúri dlho a teplota nerastie"></i></b><span class="cur"></span></span>
              <span class="ct"><span class="v"></span><small>°</small></span>
              <span class="tg"><span class="ok">✓</span><em><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></em><b></b><small>°</small></span>
            </div>

          </div>`).join('');
        this._list.querySelectorAll('.row').forEach((r) => this._bind(r));
      }
      this._update(ids);
    }

    /* ---------- beh kúrenia za posledných N hodín ---------- */
    _src(id) { const o = this._ov[id] || {}; return o.history || id; }
    _isOn(entId, st, at) {
      if (entId.startsWith('climate.')) { const x = at && at.hvac_action; return x === 'heating' || x === 'preheating' || x === 'cooling'; }
      return ['on', 'heat', 'heating', 'open'].includes(st);
    }
    _histStart() {
      if (!this._hass || !this._config || !this.isConnected || (!this._rtOn() && !this._warnH())) return;
      const key = this._collect().map((id) => this._src(id)).join('|') + '#' + this._hours() + '#' + this._warnH();
      if (this._histT && key === this._histKey) return;
      clearInterval(this._histT); this._histKey = key;
      this._histLoad(); this._histT = setInterval(() => this._histLoad(), 5 * 60000);
    }
    async _histLoad() {
      const ids = [...new Set(this._collect().flatMap((id) => [this._src(id), id]))];
      if (!ids.length) return;
      const t0 = Date.now() - Math.max(this._rtOn() ? this._hours() : 0, this._warnH() * 2) * 3600000;
      try {
        const r = await this._hass.callWS({ type: 'history/history_during_period', start_time: new Date(t0).toISOString(), entity_ids: ids,
          minimal_response: false, no_attributes: false, significant_changes_only: false });
        const hist = {}, temps = {};
        ids.forEach((eid) => {
          let a = {}; temps[eid] = [];
          hist[eid] = (r[eid] || []).map((x) => {
            if (x.a) a = x.a;
            const t = Math.max(t0, ((x.lu != null ? x.lu : x.lc) || 0) * 1000);
            if (a.current_temperature != null) temps[eid].push([t, Number(a.current_temperature)]);
            return [t, this._isOn(eid, x.s, a)];
          });
        });
        this._hist = hist; this._temps = temps; this._update();
      } catch (e) { console.warn('igy-thermostat-card: história', e); }
    }
    // [[od, do], ...] v ms – história + živý stav
    _segs(id) {
      const eid = this._src(id), pts = (this._hist[eid] || []).slice(), s = this._hass.states[eid], now = Date.now();
      if (s) pts.push([Math.max(Date.parse(s.last_updated || s.last_changed) || now, pts.length ? pts[pts.length - 1][0] : 0), this._isOn(eid, s.state, s.attributes)]);
      const out = []; let on = null;
      pts.forEach(([t, v]) => { if (v && on == null) on = t; else if (!v && on != null) { out.push([on, t]); on = null; } });
      if (on != null) out.push([on, now]);
      return out;
    }
    // jedna čiara: kedy aspoň jeden z vybraných termostatov chcel kúriť
    _drawRt(ids) {
      const dm = this.shadowRoot.getElementById('dm'); if (!dm || !Object.keys(this._hist).length) return;
      const H = this._hours() * 3600000, now = Date.now(), t0 = now - H;
      const all = ids.flatMap((id) => this._segs(id)).map(([a, b]) => [Math.max(a, t0), b]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]), un = [];
      all.forEach(([a, b]) => { const l = un[un.length - 1]; if (l && a <= l[1] + 30000) l[1] = Math.max(l[1], b); else un.push([a, b]); });
      const h = un.map(([a, b]) => `<i class="${b >= now - 1000 ? 'now' : ''}" style="left:${((a - t0) / H * 100).toFixed(2)}%;width:${((b - a) / H * 100).toFixed(2)}%"></i>`).join('');
      if (dm.__s !== h) { dm.__s = h; dm.innerHTML = h; }
    }
    // kúri bez prestávky dlhšie ako warn_hours a teplota za ten čas nestúpla aspoň o 0,3 °C
    _isWarn(id, s) {
      const wh = this._warnH(); if (!wh || !this._temps || s.attributes.current_temperature == null) return false;
      const sg = this._segs(id), last = sg[sg.length - 1], now = Date.now();
      if (!last || last[1] < now - 1000 || now - last[0] < wh * 3600000) return false;
      const tp = this._temps[id] || []; let t0 = null;
      tp.forEach(([t, v]) => { if (t <= last[0] || t0 == null) t0 = v; });
      return t0 != null && Number(s.attributes.current_temperature) - t0 < 0.3;
    }
    _range(a) { const mn = a.min_temp != null ? a.min_temp : 7, mx = a.max_temp != null ? a.max_temp : 35; return [mn, mx > mn ? mx : mn + 1]; }
    _pos(v, a) { const [mn, mx] = this._range(a); return Math.max(0, Math.min(100, (v - mn) / (mx - mn) * 100)); }

    _bind(row) {
      const id = row.dataset.id;
      let down = false, moved = false, scroll = false, x0 = 0, y0 = 0, t0 = 0, cur = 0, a = {};
      row.addEventListener('pointerdown', (e) => {
        const s = this._hass.states[id]; if (!s) return;
        a = s.attributes; down = true; moved = false; scroll = false; x0 = e.clientX; y0 = e.clientY;
        t0 = cur = a.temperature != null ? a.temperature : 20;
      });
      row.addEventListener('pointermove', (e) => {
        if (!down || scroll || row.classList.contains('window') || a.temperature == null) return;
        const dx = e.clientX - x0, dy = e.clientY - y0;
        if (!moved && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { scroll = true; return; }
        if (!moved && Math.abs(dx) > 10) { moved = true; row.classList.add('drag'); this._list.classList.add('dragging'); try { row.setPointerCapture(e.pointerId); } catch (_) { } }
        if (!moved) return;
        const [mn, mx] = this._range(a), step = a.target_temp_step || 0.5;
        const v = Math.max(mn, Math.min(mx, t0 + Math.round(dx / 12) * step));
        if (v !== cur) {
          cur = v; row.querySelector('.tg b').textContent = this._t(v);
          row.querySelector('.glow').style.width = this._pos(v, a) + '%';
          if (navigator.vibrate) navigator.vibrate(5);
        }
      });
      const end = (e, cancel) => {
        if (!down) return; down = false;
        try { row.releasePointerCapture(e.pointerId); } catch (_) { }
        row.classList.remove('drag'); this._list.classList.remove('dragging');
        if (moved && !cancel && cur !== t0) {
          this._hass.callService('climate', 'set_temperature', { entity_id: id, temperature: cur });
          row._lock = Date.now() + 10000; row._pend = cur; row.classList.add('pend');
        } else if (!moved && !scroll && !cancel) {
          this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: id } }));
        }
        this._update();
      };
      row.addEventListener('pointerup', (e) => end(e, false));
      row.addEventListener('pointercancel', (e) => end(e, true));
    }

    _ago(ts) { const m = Math.max(0, Math.round((Date.now() - Date.parse(ts)) / 60000)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }

    _update(ids = this._collect()) {
      if (!this._list) return;
      let heating = 0;
      ids.forEach((id) => {
        const s = this._hass.states[id], row = [...this._list.children].find((r) => r.dataset.id === id);
        if (!row) return;
        row.classList.toggle('na', !s);
        if (!s) { row.querySelector('.nm .n').textContent = (this._ov[id] && this._ov[id].name) || id; row.querySelector('.cur').textContent = 'entita nenájdená'; return; }
        const a = s.attributes, ov = this._ov[id] || {};
        const act = a.hvac_action || '', off = s.state === 'off' || act === 'off';
        const mode = act === 'heating' || act === 'preheating' ? 'heat' : act === 'cooling' ? 'cool' : off ? 'off' : '';
        if (mode === 'heat') heating++;
        row.classList.toggle('heat', mode === 'heat'); row.classList.toggle('cool', mode === 'cool'); row.classList.toggle('off', mode === 'off');
        row.style.setProperty('--c', mode === 'cool' ? COL.cool : COL.heat);
        const w = ov.window && this._hass.states[ov.window];
        row.classList.toggle('window', !!(w && w.state === 'on'));
        const winOpen = !!(w && w.state === 'on');
        const ic = row.querySelector('.ic ha-icon'), icon = winOpen ? 'mdi:window-open-variant' : a.icon || (mode === 'off' ? 'mdi:thermostat-off' : 'mdi:thermostat');
        if (ic.getAttribute('icon') !== icon) ic.setAttribute('icon', icon);
        row.querySelector('.nm .n').textContent = ov.name || a.friendly_name || id;
        const warn = !winOpen && mode === 'heat' && this._isWarn(id, s);
        row.classList.toggle('warn', warn);
        const c = a.current_temperature != null ? this._t(a.current_temperature) : '–';
        // aktuálna teplota vpravo, druhý riadok len keď je čo povedať
        const cv = row.querySelector('.ct .v'); if (cv.textContent !== c) cv.textContent = c;
        let sub = '';
        if (winOpen) sub = 'Otvorené okno · ' + this._ago(w.last_changed);
        else if (mode === 'off') sub = 'vypnuté';
        else if (warn) sub = 'kúri dlho, teplota nerastie';
        const ce = row.querySelector('.cur'); if (ce.textContent !== sub) ce.textContent = sub;
        // potvrdenie zmeny z HA
        if (row._pend != null && a.temperature === row._pend) {
          row._pend = null; row._lock = 0; row.classList.remove('pend'); row.classList.add('okk');
          clearTimeout(row._okT); row._okT = setTimeout(() => row.classList.remove('okk'), 1600);
        } else if (row._pend != null && Date.now() > row._lock) { row._pend = null; row.classList.remove('pend'); }
        if (row.classList.contains('drag') || (row._lock && Date.now() < row._lock)) return;
        const tg = a.temperature;
        row.querySelector('.tg b').textContent = tg != null ? this._t(tg) : '–';
        row.querySelector('.glow').style.width = (tg != null && !off ? this._pos(tg, a) : 0) + '%';
      });
      this._drawRt(ids);
      const cnt = this.shadowRoot.getElementById('cnt');
      if (cnt) cnt.textContent = heating ? `kúri ${heating}` : '';
    }
  }

  /* ================= Editor ================= */
  const EDCSS = `
    .ed { display: flex; flex-direction: column; gap: 14px; }
    .hint { font-size: 13px; color: var(--secondary-text-color); line-height: 1.4; }
    .sec { font-size: 14px; font-weight: 500; color: var(--primary-text-color); margin-top: 4px; }
    .items { display: flex; flex-direction: column; gap: 8px; }
    .it { border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 12px; background: var(--card-background-color); }
    .it.dragging { box-shadow: 0 6px 18px rgba(0,0,0,.3); z-index: 9; position: relative; }
    .ih { display: flex; align-items: center; gap: 8px; padding: 8px 6px 8px 4px; min-height: 40px; }
    .hd { cursor: grab; touch-action: none; font-size: 20px; color: var(--secondary-text-color); padding: 4px 6px; user-select: none; }
    .hd:active { cursor: grabbing; }
    .ih .tx { flex: 1; min-width: 0; cursor: pointer; }
    .ih .tx b { display: block; font-size: 14px; font-weight: 500; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ih .tx small { display: block; font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ih .tx small.warn { color: var(--error-color, #ff5252); }
    .ib { background: none; border: 0; color: var(--secondary-text-color); cursor: pointer; padding: 6px; border-radius: 50%; display: flex; }
    .ib:hover { background: rgba(127,127,127,.15); }
    .ib.del:hover { color: var(--error-color, #ff5252); }
    .ib svg { width: 20px; height: 20px; }
    .ib.exp svg { transition: transform .2s; }
    .it.open .ib.exp svg { transform: rotate(180deg); }
    .body { display: none; padding: 0 12px 12px; }
    .it.open .body { display: block; }
    .add { border: 1px dashed var(--divider-color, rgba(127,127,127,.4)); border-radius: 12px; padding: 10px 12px 4px; }
    .add .lbl { font-size: 13px; color: var(--secondary-text-color); margin-bottom: 4px; }
  `;
  const ICO = {
    down: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6z"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9m0 5h2v9H9V8m4 0h2v9h-2V8z"/></svg>'
  };

  class MultiThermostatCardEditor extends HTMLElement {
    setConfig(config) {
      const c = normalize(config);
      if (this._last && JSON.stringify(c) === this._last) return;   // vlastná zmena – nič neprekresľovať
      this._cfg = c; this._last = JSON.stringify(c);
      if (this._hass) this._build();
    }
    set hass(h) {
      const first = !this._hass; this._hass = h;
      if (first && this._cfg) this._build();
      this.querySelectorAll('ha-form, ha-entity-picker').forEach((f) => { f.hass = h; });
    }
    _emit() {
      this._last = JSON.stringify(this._cfg);
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: JSON.parse(this._last) }, bubbles: true, composed: true }));
    }
    _name(e) { const s = this._hass.states[e.entity]; return e.name || (s && s.attributes.friendly_name) || e.entity; }

    _build() {
      const open = this._open || new Set();
      this.innerHTML = `<style>${EDCSS}</style><div class="ed">
        <div id="top"></div>
        <div class="sec">Termostaty</div>
        <div class="hint">Poradie zmeníš potiahnutím za ⠿. Ťukni na termostat pre vlastný názov a senzor okna.</div>
        <div class="items" id="items"></div>
        <div class="add"><div class="lbl">+ Pridať termostat</div><div id="addp"></div></div>
      </div>`;
      // nadpis
      const top = document.createElement('ha-form');
      top.hass = this._hass; top.data = { title: this._cfg.title || '', runtime: this._cfg.runtime !== false, hours: this._cfg.hours == null ? 24 : this._cfg.hours, warn_hours: this._cfg.warn_hours == null ? 3 : this._cfg.warn_hours };
      top.schema = [{ name: 'title', selector: { text: {} } }, { name: 'runtime', selector: { boolean: {} } },
        { name: 'hours', selector: { number: { min: 1, max: 168, step: 1, mode: 'box', unit_of_measurement: 'h' } } },
        { name: 'warn_hours', selector: { number: { min: 0, max: 24, step: 0.5, mode: 'box', unit_of_measurement: 'h' } } }];
      const TL = { title: 'Nadpis karty (prázdny = bez hlavičky)', runtime: 'Čiara požiadavky na kúrenie (dole na karte)', hours: 'Čiara ukazuje posledných', warn_hours: 'Varovať, keď kúri dlhšie a teplota nerastie (0 = nie)' };
      top.computeLabel = (x) => TL[x.name];
      top.addEventListener('value-changed', (e) => {
        e.stopPropagation();
        const v = e.detail.value; if (v.title) this._cfg.title = v.title; else delete this._cfg.title;
        if (v.hours == null || Number(v.hours) === 24) delete this._cfg.hours; else this._cfg.hours = Number(v.hours);
        if (v.runtime === false) this._cfg.runtime = false; else delete this._cfg.runtime;
        if (v.warn_hours == null || Number(v.warn_hours) === 3) delete this._cfg.warn_hours; else this._cfg.warn_hours = Number(v.warn_hours);
        this._emit();
      });
      this.querySelector('#top').appendChild(top);
      // zoznam
      const box = this.querySelector('#items');
      this._cfg.entities.forEach((e, i) => box.appendChild(this._item(e, i, open.has(i))));
      // pridanie
      const add = document.createElement('ha-form');
      add.hass = this._hass; add.data = {};
      add.schema = [{ name: 'entity', selector: { entity: { domain: 'climate', exclude_entities: this._cfg.entities.map((x) => x.entity) } } }];
      add.computeLabel = () => 'Vyber termostat';
      add.addEventListener('value-changed', (ev) => {
        const id = ev.detail.value.entity; if (!id) return;
        this._cfg.entities.push({ entity: id }); this._emit(); this._open = new Set(); this._build();
      });
      this.querySelector('#addp').appendChild(add);
    }

    _item(e, i, isOpen) {
      const it = document.createElement('div');
      it.className = 'it' + (isOpen ? ' open' : '');
      const s = this._hass.states[e.entity];
      const fn = (x) => (this._hass.states[x] && this._hass.states[x].attributes.friendly_name) || x;
      const sub = () => [e.entity, e.window ? 'okno: ' + fn(e.window) : '', e.history ? 'beh: ' + fn(e.history) : ''].filter(Boolean).join(' · ');
      it.innerHTML = `<div class="ih">
          <span class="hd" title="Potiahni pre zmenu poradia">⠿</span>
          <span class="tx"><b></b><small class="${s ? '' : 'warn'}"></small></span>
          <button class="ib exp" title="Upraviť">${ICO.down}</button>
          <button class="ib del" title="Odstrániť">${ICO.del}</button>
        </div><div class="body"></div>`;
      const setTx = () => { it.querySelector('.tx b').textContent = this._name(e); it.querySelector('.tx small').textContent = s ? sub() : e.entity + ' – entita neexistuje'; };
      setTx();
      const toggle = () => { it.classList.toggle('open'); this._open = new Set([...this.querySelectorAll('.it')].map((x, k) => x.classList.contains('open') ? k : -1).filter((k) => k >= 0)); };
      it.querySelector('.tx').onclick = toggle; it.querySelector('.exp').onclick = toggle;
      it.querySelector('.del').onclick = () => {
        this._cfg.entities.splice(i, 1); this._emit();
        this._open = new Set([...(this._open || [])].filter((k) => k !== i).map((k) => k > i ? k - 1 : k)); this._build();
      };
      const f = document.createElement('ha-form');
      f.hass = this._hass; f.data = Object.assign({}, e);
      f.schema = [
        { name: 'entity', required: true, selector: { entity: { domain: 'climate' } } },
        { name: 'name', selector: { text: {} } },
        { name: 'window', selector: { entity: { domain: 'binary_sensor' } } },
        { name: 'history', selector: { entity: {} } }
      ];
      const L = { entity: 'Termostat', name: 'Vlastný názov (prázdny = názov z HA)', window: 'Senzor okna – pri otvorení sa termostat zablokuje', history: 'Požiadavku na kúrenie brať z (prázdne = keď termostat kúri)' };
      f.computeLabel = (x) => L[x.name];
      f.addEventListener('value-changed', (ev) => {
        ev.stopPropagation();
        const v = ev.detail.value, n = { entity: v.entity || e.entity };
        if (v.name) n.name = v.name; if (v.window) n.window = v.window; if (v.history) n.history = v.history;
        Object.keys(e).forEach((k) => delete e[k]); Object.assign(e, n);
        this._cfg.entities[i] = e; setTx(); this._emit();
      });
      it.querySelector('.body').appendChild(f);
      this._drag(it.querySelector('.hd'), it);
      return it;
    }

    _drag(hd, row) {
      hd.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        const box = this.querySelector('#items'), rows = [...box.children], from = rows.indexOf(row), y0 = ev.clientY;
        const h = row.getBoundingClientRect().height + 8; let to = from;
        row.classList.add('dragging'); hd.setPointerCapture(ev.pointerId);
        const move = (e) => {
          const dy = e.clientY - y0; row.style.transform = `translateY(${dy}px)`;
          to = Math.max(0, Math.min(rows.length - 1, from + Math.round(dy / h)));
          rows.forEach((r, k) => {
            if (r === row) return;
            const sh = from < to && k > from && k <= to ? -h : from > to && k < from && k >= to ? h : 0;
            r.style.transition = 'transform .15s'; r.style.transform = sh ? `translateY(${sh}px)` : '';
          });
        };
        const up = () => {
          hd.removeEventListener('pointermove', move); hd.removeEventListener('pointerup', up); hd.removeEventListener('pointercancel', up);
          rows.forEach((r) => { r.style.transform = ''; r.style.transition = ''; }); row.classList.remove('dragging');
          if (to !== from) {
            const [m] = this._cfg.entities.splice(from, 1); this._cfg.entities.splice(to, 0, m);
            this._open = new Set(); this._emit(); this._build();
          }
        };
        hd.addEventListener('pointermove', move); hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
      });
    }
  }

  if (!customElements.get('igy-thermostat-card-editor')) customElements.define('igy-thermostat-card-editor', MultiThermostatCardEditor);
  if (!customElements.get('igy-thermostat-card')) customElements.define('igy-thermostat-card', MultiThermostatCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-thermostat-card'))
    window.customCards.push({ type: 'igy-thermostat-card', name: 'Igy Thermostat Card', description: 'Vybrané termostaty v jednej karte, ťahaním nastavíš teplotu.', preview: true });
  console.info('%c IGY-THERMOSTAT-CARD %c ' + VERSION + ' ', 'background:#ff9f0a;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();
