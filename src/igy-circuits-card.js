/*
 * Igy Circuits Card – spotreba po okruhoch (ističoch) a fázach v štýle ostatných Home kariet.
 *
 *   type: custom:igy-circuits-card
 *   title: Spotreba po okruhoch            # voliteľné
 *   total: sensor.home_power               # voliteľné – celková spotreba domu (inak súčet fáz)
 *   phases:                                # voliteľné – súčty fáz z vlastných senzorov
 *     - sensor.phase_l1_power
 *     - sensor.phase_l2_power
 *     - sensor.phase_l3_power
 *   phase_max: 3680                        # W na plný pásik fázy (16 A × 230 V)
 *   circuit_max: 3680                      # W na plný pásik okruhu
 *   thresholds: [500, 2000]                # farba okruhu: zelená < 500 W ≤ modrá < 2000 W ≤ červená
 *   groups:
 *     - name: Ističe 3–8
 *       entity: sensor.istice_3_8_power      # voliteľné – súčet skupiny (inak sa spočíta z okruhov)
 *       expanded: true                     # voliteľné – predvolene rozbalená (inak zbalená)
 *       rows:
 *         - entity: sensor.okruh_3_power
 *           name: Lake, Floor
 *           phase: L1                      # L1 / L2 / L3 – farebný štítok fázy
 *         - entity: sensor.okruh_4_power
 *           name: Rúra, umývačka
 *           phase: L2
 *
 * Ťuk na nadpis skupiny = rozbaliť / zbaliť (stav si pamätá každé zariadenie zvlášť).
 * Ťuk na okruh alebo fázu = detail entity. Hodnoty v kW sa prepočítajú na W.
 */
(function () {
  'use strict';
  // jazyk podľa Home Assistanta: sk = slovenčina, inak angličtina (texty v kóde sú po slovensky, preklady v EN)
  let LANG = String((typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || (typeof navigator !== 'undefined' && navigator.language) || 'en').slice(0, 2).toLowerCase();
  const setLang = (h) => { const l = h && ((h.locale && h.locale.language) || h.language); if (l) LANG = String(l).slice(0, 2).toLowerCase(); };
  const _ = (s, ...a) => { let r = LANG === 'sk' ? s : (EN[s] != null ? EN[s] : s); a.forEach((v, i) => { r = r.split('{' + i + '}').join(v); }); return r; };
  const EN = {
    "Spotreba po okruhoch": "Power by circuit",
    "Skupina": "Group",
    "Chybná konfigurácia.": "Invalid configuration.",
    "Fázy": "Phases",
    "Skupiny ističov": "Breaker groups",
    "Ťukni na skupinu pre názov a jej okruhy. Poradie zmeníš šípkami. Skupiny sú v karte predvolene zbalené.": "Tap a group to edit its name and circuits. Use the arrows to reorder. Groups are collapsed in the card by default.",
    "+ Pridať skupinu": "+ Add group",
    "Nadpis": "Title",
    "Celková spotreba domu (voliteľné)": "Total house power (optional)",
    "Plný pásik fázy": "Full phase bar",
    "Plný pásik okruhu": "Full circuit bar",
    "Bez nej sa zobrazí súčet fáz.": "Without it the sum of the phases is shown.",
    "Vyššie": "Move up",
    "Nižšie": "Move down",
    "Upraviť": "Edit",
    "Odstrániť": "Remove",
    "predvolene rozbalená": "expanded by default",
    "Názov skupiny": "Group name",
    "Súčet skupiny (voliteľné)": "Group total (optional)",
    "Predvolene rozbalená": "Expanded by default",
    "Bez neho karta sčíta okruhy v skupine.": "Without it the card adds up the circuits in the group.",
    "+ Pridať okruh": "+ Add circuit",
    "Nový okruh": "New circuit",
    "entita neexistuje": "entity does not exist",
    "vyber entitu": "choose an entity",
    "Senzor výkonu okruhu": "Circuit power sensor",
    "Názov (napr. čo je na okruhu)": "Name (e.g. what is on the circuit)",
    "Fáza": "Phase",
    "Spotreba po okruhoch a fázach – zbaľovacie skupiny ističov.": "Power per circuit and phase – collapsible breaker groups."
  };

  const VERSION = '1.1.0';
  const PH = { L1: '#d6a36b', L2: '#a3acbd', L3: '#6aa8ff' };
  const COL = { low: '#34d399', mid: '#818cf8', high: '#f87171' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  const BOLT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>';
  const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

  function normalize(c) {
    c = JSON.parse(JSON.stringify(c || {}));
    c.groups = (c.groups || []).filter(Boolean).map((g) => {
      g.rows = (g.rows || g.entities || []).map((r) => typeof r === 'string' ? { entity: r } : r).filter(Boolean);
      delete g.entities; return g;
    });
    c.phases = (c.phases || []).map((p) => typeof p === 'string' ? { entity: p } : p).filter((p) => p && p.entity);
    return c;
  }

  const CSS = `
    ha-card { padding: 12px 16px 16px; overflow: hidden; }
    .hl { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--secondary-text-color); letter-spacing: .02em; margin-bottom: 10px; }
    .hl svg { width: 16px; height: 16px; flex: none; }
    .hl .tot { margin-left: auto; font-size: 17px; font-weight: 600; color: var(--primary-text-color); letter-spacing: 0; font-variant-numeric: tabular-nums; cursor: pointer; }
    .hl .tot small { font-size: 12px; font-weight: 400; color: var(--secondary-text-color); margin-left: 2px; }
    .box { border-radius: 16px; background: var(--hc-surface, rgba(127,127,127,.1)); box-shadow: inset 0 0 0 1px var(--hc-surface-line, transparent); overflow: hidden; }
    .box + .box { margin-top: 8px; }
    .ph { display: grid; grid-template-columns: repeat(var(--n, 3), minmax(0, 1fr)); gap: 10px; padding: 10px 12px 12px; }
    .pc { min-width: 0; cursor: pointer; font-size: 11.5px; color: var(--secondary-text-color); }
    .pc .pn { display: flex; align-items: center; gap: 5px; }
    .pc .pn i { width: 7px; height: 7px; border-radius: 50%; background: var(--c); }
    .pc b { display: block; font-size: 16px; font-weight: 600; color: var(--primary-text-color); margin: 2px 0 6px; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .pc b small { font-size: 11px; font-weight: 400; color: var(--secondary-text-color); margin-left: 2px; }
    .pb { height: 5px; border-radius: 9px; background: rgba(127,127,127,.2); overflow: hidden; }
    .pb i { display: block; height: 100%; border-radius: 9px; background: var(--c); transition: width .6s ease; }
    .gh { display: flex; align-items: center; gap: 10px; padding: 0 12px; min-height: 46px; cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
    .gh:active { background: rgba(127,127,127,.08); }
    .gh .gn { font-size: 14px; font-weight: 600; color: var(--primary-text-color); min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gh .dots { display: flex; gap: 3px; flex: none; }
    .gh .dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--c); opacity: .9; }
    .grp.open .gh .dots { display: none; }
    .gh .gv { margin-left: auto; font-size: 14px; font-weight: 600; color: var(--primary-text-color); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .gh .gv small { font-size: 11px; font-weight: 400; color: var(--secondary-text-color); margin-left: 2px; }
    .gh .ch { display: inline-flex; width: 18px; height: 18px; color: var(--secondary-text-color); transition: transform .2s; transform: rotate(-90deg); flex: none; }
    .gh .ch svg { width: 18px; height: 18px; }
    .grp.open .gh .ch { transform: none; }
    .rows { display: none; }
    .grp.open .rows { display: block; }
    .r { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; gap: 4px 10px; align-items: center; padding: 8px 12px; min-height: 40px; cursor: pointer; border-top: 1px solid rgba(127,127,127,.14); -webkit-tap-highlight-color: transparent; }
    .r:active { background: rgba(127,127,127,.08); }
    .r .pk { width: 22px; height: 20px; border-radius: 6px; display: grid; place-items: center; font-size: 10px; font-weight: 700; color: var(--c, var(--secondary-text-color)); background: rgba(127,127,127,.16); }
    .r .pk.no { background: none; }
    /* popis okruhu môže mať aj dva riadky, pásik je pod ním na celú šírku */
    .r .nm { font-size: 13px; line-height: 1.35; color: var(--primary-text-color); opacity: .92; overflow-wrap: anywhere; }
    .r .bar { grid-column: 2 / 4; height: 3px; border-radius: 9px; background: rgba(127,127,127,.16); overflow: hidden; }
    .r .bar i { display: block; height: 100%; border-radius: 9px; transition: width .6s ease, background .4s; }
    .r .pk { align-self: start; margin-top: 0; }
    .r .v { align-self: start; line-height: 1.35; text-align: right; min-width: 52px; font-size: 13px; color: var(--primary-text-color); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .r .v.z, .r.na .v { color: var(--secondary-text-color); opacity: .7; }
    .r.na .nm { opacity: .5; }
    .empty { font-size: 13px; color: var(--secondary-text-color); padding: 8px 2px; }
  `;

  class HomeCircuitsCard extends HTMLElement {
    static getConfigElement() { return document.createElement('igy-circuits-card-editor'); }
    static getStubConfig() { return { title: _('Spotreba po okruhoch'), groups: [{ name: _('Skupina') + ' 1', rows: [] }] }; }
    setConfig(c) {
      if (!c) throw new Error(_('Chybná konfigurácia.'));
      this._cfg = normalize(c); this._built = false;
      if (this._hass) this._render();
    }
    set hass(h) { setLang(h); this._hass = h; if (this._cfg) this._render(); }
    getCardSize() { return 2 + (this._cfg ? this._cfg.groups.length : 1); }
    getGridOptions() { return { columns: 12, min_columns: 6 }; }

    _key(g, i) { return 'hcc:' + (this._cfg.title || '') + ':' + i + ':' + (g.name || ''); }
    _isOpen(g, i) { try { const v = localStorage.getItem(this._key(g, i)); if (v != null) return v === '1'; } catch (_) { } return !!g.expanded; }
    // hodnota vo W (kW → W); null = nedostupná
    _w(id) {
      const s = id && this._hass.states[id]; if (!s) return null;
      const v = parseFloat(s.state); if (isNaN(v)) return null;
      const u = (s.attributes.unit_of_measurement || '').toLowerCase();
      return u === 'kw' ? v * 1000 : u === 'mw' ? v * 1e6 : v;
    }
    _fmt(w) {
      if (w == null) return ['–', ''];
      const loc = (this._hass.locale && this._hass.locale.language) || 'sk';
      if (Math.abs(w) >= 10000) return [(w / 1000).toLocaleString(loc, { maximumFractionDigits: 1 }), 'kW'];
      return [Math.round(w).toLocaleString(loc), 'W'];
    }
    _col(w) { const t = this._cfg.thresholds || [500, 2000]; return w < t[0] ? COL.low : w < t[1] ? COL.mid : COL.high; }
    _more(id) { if (id) this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: id }, bubbles: true, composed: true })); }

    _build() {
      const c = this._cfg;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      let h = `<div class="hl">${BOLT}<span>${esc(c.title || _('Spotreba po okruhoch'))}</span><span class="tot" data-more="${esc(c.total || '')}"><span id="tv">–</span><small id="tu">W</small></span></div>`;
      if (c.phases.length) {
        h += `<div class="box ph" style="--n:${c.phases.length}">` + c.phases.map((p, i) => {
          const n = p.name || 'L' + (i + 1), col = p.color || PH[n] || PH['L' + (i + 1)] || '#a3acbd';
          return `<div class="pc" style="--c:${col}" data-more="${esc(p.entity)}"><span class="pn"><i></i>${esc(n)}</span><b data-p="${i}">–</b><div class="pb"><i data-pb="${i}" style="width:0"></i></div></div>`;
        }).join('') + '</div>';
      }
      c.groups.forEach((g, gi) => {
        const ph = [...new Set(g.rows.map((r) => r.phase).filter((x) => PH[x]))];
        h += `<div class="box grp${this._isOpen(g, gi) ? ' open' : ''}" data-g="${gi}"><div class="gh" data-tg="${gi}"><span class="gn">${esc(g.name || _('Skupina') + ' ' + (gi + 1))}</span>`
          + `<span class="dots">${ph.map((x) => `<i style="--c:${PH[x]}" title="${x}"></i>`).join('')}</span>`
          + `<span class="gv" data-gv="${gi}">–</span><span class="ch">${CHEV}</span></div><div class="rows">`
          + g.rows.map((r, ri) => {
            const s = r.entity && this._hass.states[r.entity], nm = r.name || (s && s.attributes.friendly_name) || r.entity || '?';
            return `<div class="r" data-more="${esc(r.entity || '')}" data-r="${gi}.${ri}"><span class="pk${PH[r.phase] ? '' : ' no'}" style="--c:${PH[r.phase] || ''}">${PH[r.phase] ? r.phase : ''}</span>`
              + `<span class="nm">${esc(nm)}</span><span class="v">–</span><span class="bar"><i style="width:0"></i></span></div>`;
          }).join('') + '</div></div>';
      });
      if (!c.groups.length && !c.phases.length) h += '<div class="empty">Pridaj skupiny a okruhy v nastaveniach karty.</div>';
      this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card>${h}</ha-card>`;
      this.shadowRoot.querySelector('ha-card').addEventListener('click', (e) => {
        const t = e.target.closest('[data-tg]');
        if (t) {
          const gi = +t.dataset.tg, el = t.parentNode, g = this._cfg.groups[gi]; el.classList.toggle('open');
          try { localStorage.setItem(this._key(g, gi), el.classList.contains('open') ? '1' : '0'); } catch (_) { }
          return;
        }
        const m = e.target.closest('[data-more]'); if (m && m.dataset.more) this._more(m.dataset.more);
      });
      this._built = true;
    }

    _render() {
      if (!this._hass || !this._cfg) return;
      if (!this._built) this._build();
      const c = this._cfg, R = this.shadowRoot, pmax = +c.phase_max || 3680, cmax = +c.circuit_max || 3680;
      let sumRows = 0, anyRow = false;
      c.groups.forEach((g, gi) => {
        let gs = 0, ok = false;
        g.rows.forEach((r, ri) => {
          const el = R.querySelector(`[data-r="${gi}.${ri}"]`); if (!el) return;
          const w = this._w(r.entity), f = this._fmt(w);
          if (w != null) { gs += w; ok = true; }
          const v = el.querySelector('.v'), t = f[0] + (f[1] ? ' ' + f[1] : '');
          if (v.textContent !== t) v.textContent = t;
          v.classList.toggle('z', w != null && Math.round(w) === 0);
          el.classList.toggle('na', w == null);
          const bi = el.querySelector('.bar i'), pct = w == null || w <= 0 ? 0 : Math.max(3, Math.min(100, w / (+r.max || cmax) * 100));
          bi.style.width = pct.toFixed(1) + '%'; bi.style.background = w == null ? '' : this._col(w);
        });
        // vlastný senzor súčtu skupiny má prednosť pred spočítaním okruhov
        const gw = g.entity ? this._w(g.entity) : null; if (gw != null) { gs = gw; ok = true; }
        const gv = R.querySelector(`[data-gv="${gi}"]`), f = this._fmt(ok ? gs : null);
        const t = `${f[0]}<small>${f[1]}</small>`; if (gv.__t !== t) { gv.__t = t; gv.innerHTML = t; }
        if (ok) { sumRows += gs; anyRow = true; }
      });
      let sumPh = 0, anyPh = false;
      c.phases.forEach((p, i) => {
        const w = this._w(p.entity), f = this._fmt(w), b = R.querySelector(`[data-p="${i}"]`);
        if (w != null) { sumPh += w; anyPh = true; }
        const t = `${f[0]}<small>${f[1]}</small>`; if (b.__t !== t) { b.__t = t; b.innerHTML = t; }
        const bi = R.querySelector(`[data-pb="${i}"]`), pct = w == null || w <= 0 ? 0 : Math.max(2, Math.min(100, w / pmax * 100));
        bi.style.width = pct.toFixed(1) + '%';
        bi.style.background = pct >= 90 ? COL.high : '';
      });
      const tw = c.total ? this._w(c.total) : anyPh ? sumPh : anyRow ? sumRows : null, ft = this._fmt(tw);
      const tv = R.getElementById('tv'), tu = R.getElementById('tu');
      if (tv.textContent !== ft[0]) tv.textContent = ft[0]; if (tu.textContent !== ft[1]) tu.textContent = ft[1];
    }
  }

  /* ================= Editor ================= */
  const EDCSS = `
    .ed { display: flex; flex-direction: column; gap: 14px; }
    .hint { font-size: 13px; color: var(--secondary-text-color); line-height: 1.4; }
    .sec { font-size: 14px; font-weight: 500; color: var(--primary-text-color); margin-top: 4px; }
    .items { display: flex; flex-direction: column; gap: 8px; }
    .it { border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 12px; background: var(--card-background-color); }
    .it .it { border-radius: 10px; }
    .ih { display: flex; align-items: center; gap: 4px; padding: 6px 4px 6px 10px; min-height: 40px; }
    .ih .tx { flex: 1; min-width: 0; cursor: pointer; }
    .ih .tx b { display: block; font-size: 14px; font-weight: 500; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ih .tx small { display: block; font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ih .tx small.warn { color: var(--error-color, #db4437); }
    .ib { background: none; border: 0; color: var(--secondary-text-color); cursor: pointer; padding: 6px; border-radius: 50%; display: flex; }
    .ib:hover { background: rgba(127,127,127,.15); }
    .ib:disabled { opacity: .25; cursor: default; }
    .ib svg { width: 20px; height: 20px; }
    .ib.exp svg { transition: transform .2s; }
    .it.open > .ih .ib.exp svg { transform: rotate(180deg); }
    .body { display: none; padding: 0 12px 12px; flex-direction: column; gap: 10px; }
    .it.open > .body { display: flex; }
    .pk { font-size: 10px; font-weight: 700; padding: 2px 5px; border-radius: 5px; background: rgba(127,127,127,.18); margin-right: 4px; }
    .btn { align-self: flex-start; background: none; border: 1px dashed var(--divider-color, rgba(127,127,127,.4)); border-radius: 10px; padding: 8px 14px; color: var(--primary-text-color); cursor: pointer; font: inherit; font-size: 13px; }
  `;
  const ICO = {
    down: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6z"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 14l5-5 5 5z"/></svg>',
    dn: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9m0 5h2v9H9V8m4 0h2v9h-2V8z"/></svg>'
  };
  const PHO = [{ value: 'none', label: '—' }, { value: 'L1', label: 'L1' }, { value: 'L2', label: 'L2' }, { value: 'L3', label: 'L3' }];

  class HomeCircuitsCardEditor extends HTMLElement {
    setConfig(config) {
      const c = normalize(config);
      if (this._last && JSON.stringify(c) === this._last) return;
      this._cfg = c; this._last = JSON.stringify(c);
      if (this._hass) this._build();
    }
    set hass(h) { setLang(h); const f = !this._hass; this._hass = h; if (f && this._cfg) this._build(); this.querySelectorAll('ha-form').forEach((x) => { x.hass = h; }); }
    _emit() {
      // HA konfiguráciu zmrazí – posiela sa hlboká kópia
      const c = JSON.parse(JSON.stringify(Object.assign({ type: 'custom:igy-circuits-card' }, this._cfg)));
      if (!c.phases.length) delete c.phases;
      c.phases && (c.phases = c.phases.map((p) => p.name || p.color ? p : p.entity));
      this._last = JSON.stringify(normalize(c));
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: c }, bubbles: true, composed: true }));
    }
    _form(data, schema, L, H, cb) {
      const f = document.createElement('ha-form'); f.hass = this._hass; f.data = data; f.schema = schema;
      f.computeLabel = (x) => L[x.name] || x.name; f.computeHelper = (x) => H && H[x.name];
      f.addEventListener('value-changed', (e) => { e.stopPropagation(); const v = Object.assign({}, e.detail.value); try { cb(v); } catch (err) { console.error('igy-circuits-card editor:', err); } });
      return f;
    }
    _openSet() { return this._open || (this._open = new Set()); }
    _build() {
      const c = this._cfg;
      this.innerHTML = `<style>${EDCSS}</style><div class="ed"><div id="top"></div><div class="sec">${_('Fázy')}</div><div id="ph"></div>
        <div class="sec">${_('Skupiny ističov')}</div><div class="hint">${_('Ťukni na skupinu pre názov a jej okruhy. Poradie zmeníš šípkami. Skupiny sú v karte predvolene zbalené.')}</div>
        <div class="items" id="items"></div><button class="btn" id="addg">${_('+ Pridať skupinu')}</button></div>`;
      const ent = (n) => ({ name: n, selector: { entity: { domain: 'sensor' } } });
      this.querySelector('#top').appendChild(this._form({ title: c.title || '', total: c.total || '', phase_max: c.phase_max || 3680, circuit_max: c.circuit_max || 3680 },
        [{ name: 'title', selector: { text: {} } }, ent('total'),
          { type: 'grid', name: '', schema: [{ name: 'phase_max', selector: { number: { min: 500, max: 20000, step: 10, mode: 'box', unit_of_measurement: 'W' } } },
            { name: 'circuit_max', selector: { number: { min: 100, max: 20000, step: 10, mode: 'box', unit_of_measurement: 'W' } } }] }],
        { title: _('Nadpis'), total: _('Celková spotreba domu (voliteľné)'), phase_max: _('Plný pásik fázy'), circuit_max: _('Plný pásik okruhu') },
        { total: _('Bez nej sa zobrazí súčet fáz.'), phase_max: '16 A × 230 V = 3680 W' },
        (v) => {
          ['title', 'total'].forEach((k) => { if (v[k]) c[k] = v[k]; else delete c[k]; });
          ['phase_max', 'circuit_max'].forEach((k) => { if (v[k] && +v[k] !== 3680) c[k] = +v[k]; else delete c[k]; });
          this._emit();
        }));
      const pd = {}; [0, 1, 2].forEach((i) => { pd['p' + i] = (c.phases[i] && c.phases[i].entity) || ''; });
      this.querySelector('#ph').appendChild(this._form(pd, [ent('p0'), ent('p1'), ent('p2')], { p0: 'L1', p1: 'L2', p2: 'L3' }, null, (v) => {
        const old = c.phases; c.phases = [0, 1, 2].map((i) => v['p' + i] ? Object.assign({}, old[i] || {}, { entity: v['p' + i] }) : null).filter(Boolean); this._emit();
      }));
      const box = this.querySelector('#items'), open = this._openSet();
      c.groups.forEach((g, gi) => box.appendChild(this._group(g, gi, open.has('g' + gi))));
      this.querySelector('#addg').onclick = () => { c.groups.push({ name: _('Skupina') + ' ' + (c.groups.length + 1), rows: [] }); open.add('g' + (c.groups.length - 1)); this._emit(); this._build(); };
    }
    _head(it, title, sub, warn, onUp, onDn, onDel, upDis, dnDis, key) {
      it.innerHTML = `<div class="ih"><span class="tx"><b></b><small></small></span><button class="ib up" title="${_('Vyššie')}">${ICO.up}</button><button class="ib dn" title="${_('Nižšie')}">${ICO.dn}</button><button class="ib exp" title="${_('Upraviť')}">${ICO.down}</button><button class="ib del" title="${_('Odstrániť')}">${ICO.del}</button></div><div class="body"></div>`;
      const ih = it.querySelector(':scope > .ih');
      ih.querySelector('.tx b').innerHTML = title; const sm = ih.querySelector('.tx small'); sm.textContent = sub; sm.className = warn ? 'warn' : '';
      const tog = () => { it.classList.toggle('open'); const o = this._openSet(); if (it.classList.contains('open')) o.add(key); else o.delete(key); };
      ih.querySelector('.tx').onclick = tog; ih.querySelector('.exp').onclick = tog;
      const u = ih.querySelector('.up'), d = ih.querySelector('.dn'); u.disabled = upDis; d.disabled = dnDis;
      u.onclick = onUp; d.onclick = onDn; ih.querySelector('.del').onclick = onDel;
      return it.querySelector(':scope > .body');
    }
    _group(g, gi, isOpen) {
      const c = this._cfg, it = document.createElement('div'); it.className = 'it' + (isOpen ? ' open' : '');
      const mv = (d) => () => { const j = gi + d; [c.groups[gi], c.groups[j]] = [c.groups[j], c.groups[gi]]; this._open = new Set(); this._emit(); this._build(); };
      const nr = g.rows.length, body = this._head(it, esc(g.name || _('Skupina') + ' ' + (gi + 1)), nr + ' ' + (LANG === 'sk' ? (nr === 1 ? 'okruh' : nr >= 2 && nr <= 4 ? 'okruhy' : 'okruhov') : (nr === 1 ? 'circuit' : 'circuits')) + (g.expanded ? ' · ' + _('predvolene rozbalená') : ''), false,
        mv(-1), mv(1), () => { c.groups.splice(gi, 1); this._open = new Set(); this._emit(); this._build(); }, gi === 0, gi === c.groups.length - 1, 'g' + gi);
      body.appendChild(this._form({ name: g.name || '', entity: g.entity || '', expanded: !!g.expanded }, [{ name: 'name', selector: { text: {} } }, { name: 'entity', selector: { entity: { domain: 'sensor' } } }, { name: 'expanded', selector: { boolean: {} } }],
        { name: _('Názov skupiny'), entity: _('Súčet skupiny (voliteľné)'), expanded: _('Predvolene rozbalená') }, { entity: _('Bez neho karta sčíta okruhy v skupine.') }, (v) => {
          g.name = v.name || ''; if (v.entity) g.entity = v.entity; else delete g.entity; if (v.expanded) g.expanded = true; else delete g.expanded;
          const ih = it.querySelector(':scope > .ih'); ih.querySelector('.tx b').textContent = g.name || _('Skupina') + ' ' + (gi + 1); this._emit();
        }));
      const rows = document.createElement('div'); rows.className = 'items';
      g.rows.forEach((r, ri) => rows.appendChild(this._row(g, gi, r, ri)));
      body.appendChild(rows);
      const add = document.createElement('button'); add.className = 'btn'; add.textContent = _('+ Pridať okruh');
      add.onclick = () => { const last = g.rows[g.rows.length - 1], ph = last && last.phase ? ['L1', 'L2', 'L3'][(['L1', 'L2', 'L3'].indexOf(last.phase) + 1) % 3] : 'L1';
        g.rows.push({ phase: ph }); this._openSet().add('g' + gi).add('r' + gi + '.' + (g.rows.length - 1)); this._emit(); this._build(); };
      body.appendChild(add);
      return it;
    }
    _row(g, gi, r, ri) {
      const it = document.createElement('div'), key = 'r' + gi + '.' + ri; it.className = 'it' + (this._openSet().has(key) ? ' open' : '');
      const s = r.entity && this._hass.states[r.entity];
      const title = () => (r.phase ? `<span class="pk">${r.phase}</span>` : '') + esc(r.name || (s && s.attributes.friendly_name) || r.entity || _('Nový okruh'));
      const mv = (d) => () => { const j = ri + d; [g.rows[ri], g.rows[j]] = [g.rows[j], g.rows[ri]]; this._emit(); this._build(); };
      const body = this._head(it, title(), r.entity ? (s ? r.entity : r.entity + ' – ' + _('entita neexistuje')) : _('vyber entitu'), !!r.entity && !s,
        mv(-1), mv(1), () => { g.rows.splice(ri, 1); this._open = new Set(['g' + gi]); this._emit(); this._build(); }, ri === 0, ri === g.rows.length - 1, key);
      body.appendChild(this._form({ entity: r.entity || '', name: r.name || '', phase: r.phase || 'none' },
        [{ name: 'entity', selector: { entity: { domain: 'sensor' } } }, { name: 'name', selector: { text: {} } },
          { name: 'phase', selector: { select: { mode: 'box', options: PHO } } }],
        { entity: _('Senzor výkonu okruhu'), name: _('Názov (napr. čo je na okruhu)'), phase: _('Fáza') }, null, (v) => {
          const n = {}; if (v.entity) n.entity = v.entity; if (v.name) n.name = v.name; if (v.phase && v.phase !== 'none') n.phase = v.phase; if (r.max) n.max = r.max;
          Object.keys(r).forEach((k) => delete r[k]); Object.assign(r, n);
          const ns = r.entity && this._hass.states[r.entity];
          const ih = it.querySelector(':scope > .ih'); ih.querySelector('.tx b').innerHTML = (r.phase ? `<span class="pk">${r.phase}</span>` : '') + esc(r.name || (ns && ns.attributes.friendly_name) || r.entity || _('Nový okruh'));
          const sm = ih.querySelector('.tx small'); sm.textContent = r.entity ? (ns ? r.entity : r.entity + ' – ' + _('entita neexistuje')) : _('vyber entitu'); sm.className = r.entity && !ns ? 'warn' : '';
          this._emit();
        }));
      return it;
    }
  }

  if (!customElements.get('igy-circuits-card-editor')) customElements.define('igy-circuits-card-editor', HomeCircuitsCardEditor);
  if (!customElements.get('igy-circuits-card')) customElements.define('igy-circuits-card', HomeCircuitsCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-circuits-card'))
    window.customCards.push({ type: 'igy-circuits-card', name: 'Igy Circuits Card', description: _('Spotreba po okruhoch a fázach – zbaľovacie skupiny ističov.'), preview: true });
  console.info('%c IGY-CIRCUITS-CARD %c ' + VERSION + ' ', 'background:#34d399;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();
