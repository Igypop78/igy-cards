/*
 * Igy Entities Card – zoznam entít v štýle Home Energy / Multi Thermostat Card.
 * Konfigurácia je kompatibilná so štandardnou kartou Entities (stačí zmeniť type).
 *
 *   type: custom:igy-entities-card
 *   title: Nabíjanie auta            # voliteľné
 *   icon: mdi:car-electric           # voliteľné – ikona pri nadpise
 *   state_color: true                # ikona sa zafarbí, keď je entita zapnutá
 *   entities:
 *     - entity: switch.kotol
 *       secondary_info: last-changed # last-changed / last-updated / entity-id
 *       icon: mdi:water-boiler
 *     - entity: input_select.charge_mode
 *       name: Režim
 *     - type: divider                # nová skupina (voliteľne s label: Nadpis skupiny)
 *     - entity: input_text.evsemem
 *       collapsed: true              # zbalená – po sebe idúce zbalené entity sa skryjú pod jeden riadok „Ďalšie“
 *   graph:                           # voliteľné – graf dole (alebo footer: {type: graph, entity, hours_to_show})
 *     entity: sensor.gas_power_keep
 *     hours: 12
 *
 * Ovládanie podľa typu entity:
 *   switch / light / input_boolean / fan / automation – prepínač
 *   input_select / select – segmentový prepínač (do 3 krátkych možností) alebo rozbaľovací zoznam
 *   input_number / number – tlačidlá − / + (podržaním rýchlo)
 *   input_datetime – výber času / dátumu
 *   input_text / text – ťuk = úprava textu
 *   button / input_button / script / scene – tlačidlo Spustiť
 *   ostatné – hodnota, ťuk = detail
 */
(function () {
  'use strict';
  // jazyk podľa Home Assistanta: sk = slovenčina, inak angličtina (texty v kóde sú po slovensky, preklady v EN)
  let LANG = String((typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || (typeof navigator !== 'undefined' && navigator.language) || 'en').slice(0, 2).toLowerCase();
  const setLang = (h) => { const l = h && ((h.locale && h.locale.language) || h.language); if (l) LANG = String(l).slice(0, 2).toLowerCase(); };
  const _ = (s, ...a) => { let r = LANG === 'sk' ? s : (EN[s] != null ? EN[s] : s); a.forEach((v, i) => { r = r.split('{' + i + '}').join(v); }); return r; };
  const EN = {
    "Chybná konfigurácia.": "Invalid configuration.",
    "práve teraz": "just now",
    "pred {0} min": "{0} min ago",
    "pred {0} h": "{0} h ago",
    "včera": "yesterday",
    "pred {0} d": "{0} d ago",
    "Ďalšie": "More",
    "Skryť": "Hide",
    "entita nenájdená": "entity not found",
    "Aktivovať": "Activate",
    "Spustiť": "Run",
    "Upraviť": "Edit",
    "Nič": "None",
    "Posledná zmena": "Last changed",
    "Posledná aktualizácia": "Last updated",
    "ID entity": "Entity ID",
    "Entity": "Entities",
    "Poradie zmeníš potiahnutím za ⠿. Ťukni na položku pre názov, ikonu a druhý riadok. Oddeľovač začne novú skupinu.": "Drag by ⠿ to reorder. Tap an item to set its name, icon and secondary line. A divider starts a new group.",
    "+ Pridať entitu": "+ Add entity",
    "+ Pridať oddeľovač": "+ Add divider",
    "Graf dole": "Graph at the bottom",
    "Nadpis karty (voliteľné)": "Card title (optional)",
    "Ikona pri nadpise": "Title icon",
    "Zafarbiť ikonu, keď je zapnuté": "Color the icon when on",
    "Vyber entitu": "Choose an entity",
    "Entita grafu (prázdne = bez grafu)": "Graph entity (empty = no graph)",
    "Koľko hodín dozadu": "Hours to show",
    "Odstrániť": "Remove",
    "Skupina": "Group",
    "— oddeľovač —": "— divider —",
    "začína novú skupinu": "starts a new group",
    "entita neexistuje": "entity does not exist",
    "zbalená": "collapsed",
    "Nadpis skupiny (voliteľné)": "Group title (optional)",
    "Entita": "Entity",
    "Vlastný názov (prázdny = názov z HA)": "Custom name (empty = name from HA)",
    "Ikona (prázdna = podľa HA)": "Icon (empty = from HA)",
    "Druhý riadok": "Secondary line",
    "Zbalená – skryť pod „Ďalšie“ (susedné zbalené entity sa spoja)": "Collapsed – hide under “More” (adjacent collapsed entities are grouped)",
    "Zoznam entít s peknými prepínačmi, výbermi a krokovačmi.": "Entity list with proper toggles, selects and steppers."
  };

  const VERSION = '1.1.0';
  const ACC = '#ff9f0a';
  const TOGGLE = ['switch', 'light', 'input_boolean', 'fan', 'automation', 'siren', 'humidifier'];
  const RUN = ['button', 'input_button', 'script', 'scene'];
  const ON = ['on', 'open', 'home', 'heat', 'heating', 'playing', 'unlocked', 'charging', 'active'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  const dom = (id) => (id || '').split('.')[0];

  function normalize(c) {
    c = JSON.parse(JSON.stringify(c || {}));
    c.entities = (c.entities || []).map((e) => typeof e === 'string' ? { entity: e } : e).filter((e) => e && (e.entity || e.type === 'divider' || e.type === 'section'));
    c.entities.forEach((e) => { if (e.type === 'section') { e.type = 'divider'; } });
    if (!c.graph && c.footer && c.footer.type === 'graph' && c.footer.entity) c.graph = { entity: c.footer.entity, hours: c.footer.hours_to_show || 24 };
    delete c.footer;
    return c;
  }

  const ICO_MORE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/></svg>';
  const ICO_CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  const CSS = `
    ha-card { padding: 18px; overflow: hidden; }
    .hl { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--secondary-text-color); letter-spacing: .02em; margin-bottom: 14px; }
    .hl ha-icon { --mdc-icon-size: 16px; }
    .grp + .gl, .grp + .grp { margin-top: 10px; }
    .gl { font-size: 12px; font-weight: 500; color: var(--secondary-text-color); margin: 14px 4px 6px; letter-spacing: .02em; }
    .grp { border-radius: 18px; background: var(--hc-surface, rgba(127,127,127,.1)); box-shadow: inset 0 0 0 1px var(--hc-surface-line, transparent); overflow: hidden; }
    .row { position: relative; display: flex; align-items: center; gap: 12px; padding: 0 14px; min-height: 52px; cursor: pointer;
      user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; transition: background .2s; }
    .row:active:not(:has(.ctl:active)) { background: rgba(127,127,127,.08); }
    .more { position: relative; }
    .more:not(.o) > .mb { display: none; }
    .mt { position: relative; display: flex; align-items: center; gap: 12px; padding: 0 14px; min-height: 44px; cursor: pointer; color: var(--secondary-text-color); }
    .mt:active { background: rgba(127,127,127,.08); }
    .mt .nm b { font-weight: 500; font-size: 14px; } .more.o .ms, .more:not(.o) .mh { display: none; }
    .mt .mc { font-size: 12px; min-width: 22px; height: 20px; padding: 0 7px; border-radius: 99px; display: inline-flex; align-items: center; justify-content: center; background: rgba(127,127,127,.18); color: var(--primary-text-color); }
    .mt .chev { display: inline-flex; width: 18px; height: 18px; transition: transform .2s; transform: rotate(-90deg); }
    .mt .chev svg { width: 18px; height: 18px; } .more.o .chev { transform: none; }
    .exp + .more > .mt::before, .mb > .row:first-child::before, .more + .row::before {
      content: ''; position: absolute; left: 48px; right: 0; top: 0; height: 1px; background: rgba(127,127,127,.18); }
    .row + .row::before, .exp + .row::before { content: ''; position: absolute; left: 48px; right: 0; top: 0; height: 1px; background: rgba(127,127,127,.18); }
    .ic { flex: none; display: flex; color: var(--secondary-text-color); transition: color .4s; }
    .ic > * { --mdc-icon-size: 22px; }
    .row.on:not(.mute) .ic { color: var(--c, ${ACC}); }
    .nm { flex: 1; min-width: 0; padding: 9px 0; }
    .nm b { display: block; font-size: 14px; font-weight: 500; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nm small { display: block; font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
    .nm small:empty { display: none; }
    .nm .txt { white-space: normal; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; line-height: 1.35; }
    .val { flex: none; font-size: 15px; color: var(--primary-text-color); font-variant-numeric: tabular-nums; text-align: right; max-width: 45%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .val small { font-size: 12px; color: var(--secondary-text-color); margin-left: 2px; }
    .row.na { opacity: .5; }
    .ctl { flex: none; }
    /* prepínač */
    .tg { display: block; width: 46px; height: 28px; border-radius: 99px; background: rgba(127,127,127,.32); position: relative; transition: background .25s; }
    .tg::after { content: ''; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,.25); transition: transform .25s cubic-bezier(.3,.7,.3,1); }
    .row.on .tg { background: var(--c, ${ACC}); }
    .row.on .tg::after { transform: translateX(18px); }
    /* pilulka (select, čas, text, tlačidlo) */
    .pill { display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 12px; border-radius: 99px; background: rgba(127,127,127,.16);
      font-size: 14px; color: var(--primary-text-color); font-variant-numeric: tabular-nums; max-width: 170px; white-space: nowrap; transition: background .2s; position: relative; }
    .pill span { overflow: hidden; text-overflow: ellipsis; }
    .pill:active { background: rgba(127,127,127,.28); }
    .pill svg { width: 16px; height: 16px; flex: none; opacity: .6; transition: transform .25s; }
    .row.open .pill svg { transform: rotate(180deg); }
    .pill.run { color: var(--c, ${ACC}); font-weight: 500; }
    .pill input { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; border: 0; cursor: pointer; }
    /* segmenty */
    .seg { display: inline-flex; padding: 2px; border-radius: 9px; background: rgba(127,127,127,.16); }
    .seg button { border: 0; background: none; color: var(--primary-text-color); font: inherit; font-size: 13px; padding: 5px 11px; border-radius: 7px; cursor: pointer; transition: background .2s, color .2s; }
    .seg button.sel { background: var(--c, ${ACC}); color: #000; font-weight: 600; }
    /* krokovač */
    .stp { display: inline-flex; align-items: center; gap: 2px; border-radius: 99px; background: rgba(127,127,127,.16); height: 30px; }
    .stp button { width: 32px; height: 30px; border: 0; background: none; color: var(--primary-text-color); font-size: 18px; line-height: 1; cursor: pointer; border-radius: 99px; touch-action: manipulation; }
    .stp button:active { background: rgba(127,127,127,.25); }
    .stp b { min-width: 46px; text-align: center; font-size: 14px; font-weight: 500; font-variant-numeric: tabular-nums; color: var(--primary-text-color); }
    .stp b small { font-size: 11px; color: var(--secondary-text-color); font-weight: 400; margin-left: 2px; }
    .pend .stp b, .pend .pill span, .pend .seg { opacity: .55; }
    /* rozbaľovací zoznam */
    .exp { display: none; padding: 0 14px 8px 48px; }
    .exp.show { display: block; }
    .opt { display: flex; align-items: center; justify-content: space-between; padding: 10px 4px; font-size: 14px; color: var(--primary-text-color); cursor: pointer; border-top: 1px solid rgba(127,127,127,.12); }
    .opt:first-child { border-top: 0; }
    .opt:active { opacity: .6; }
    .opt i { color: var(--c, ${ACC}); font-style: normal; font-weight: 700; visibility: hidden; }
    .opt.sel i { visibility: visible; }
    .opt.sel { font-weight: 500; }
    /* úprava textu */
    .edit { width: 100%; box-sizing: border-box; margin: 4px 0 10px; padding: 9px 12px; border-radius: 10px; border: 1px solid rgba(127,127,127,.3); background: rgba(127,127,127,.1);
      color: var(--primary-text-color); font: inherit; font-size: 14px; outline: none; }
    .edit:focus { border-color: var(--c, ${ACC}); }
    /* graf */
    .gr { margin-top: 12px; height: 56px; position: relative; cursor: pointer; }
    .gr svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .empty { font-size: 13px; color: var(--secondary-text-color); padding: 6px 0; }
  `;
  const CHEV = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6z"/></svg>';

  class HomeEntitiesCard extends HTMLElement {
    static getConfigElement() { return document.createElement('igy-entities-card-editor'); }
    static getStubConfig() { return { title: 'Entity', state_color: true, entities: [] }; }
    setConfig(c) {
      if (!c) throw new Error(_('Chybná konfigurácia.'));
      this._config = normalize(c); this._card = null; this._open = null; this._edit = null; this._gpts = null;
      if (this._hass) this._render();
      this._gStart();
    }
    set hass(h) { setLang(h); const first = !this._hass; this._hass = h; this._render(); if (first) this._gStart(); }
    connectedCallback() { this._gStart(); if (!this._tick) this._tick = setInterval(() => this._hass && this._update(), 30000); }
    disconnectedCallback() { clearInterval(this._gT); this._gT = null; clearInterval(this._tick); this._tick = null; }
    getCardSize() { return 1 + Math.ceil(this._config.entities.length * 1.1) + (this._config.graph ? 2 : 0); }
    getGridOptions() { return { columns: 12, min_columns: 6 }; }

    _st(id) { return this._hass.states[id]; }
    _moKey() { const c = this._config; return 'hec-more:' + (c.title || '') + ':' + c.entities.map((e) => e.entity || '-').join(',').slice(0, 200); }
    _moState() { try { return JSON.parse(localStorage.getItem(this._moKey()) || '{}') || {}; } catch (_) { return {}; } }
    _fmt(s) {
      try { if (this._hass.formatEntityState) return this._hass.formatEntityState(s); } catch (_) { }
      const u = s.attributes.unit_of_measurement; return s.state + (u ? ' ' + u : '');
    }
    _fmtNum(v, s) {
      const st = s.attributes.step || 1, d = st < 1 ? Math.min(3, String(st).split('.')[1].length) : 0;
      return Number(v).toLocaleString((this._hass.locale && this._hass.locale.language) || 'sk', { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    _ago(ts) {
      const m = Math.round((Date.now() - Date.parse(ts)) / 60000);
      if (isNaN(m)) return ''; if (m < 1) return _('práve teraz'); if (m < 60) return _('pred {0} min', m);
      const h = Math.floor(m / 60); if (h < 24) return _('pred {0} h', h); const d = Math.floor(h / 24); return d === 1 ? _('včera') : _('pred {0} d', d);
    }
    _call(d, svc, data) { return this._hass.callService(d, svc, data); }
    _more(id) { this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: id } })); }

    /* ---------- kostra ---------- */
    _render() {
      if (!this._hass || !this._config) return;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      if (!this._card) {
        const c = this._config;
        let html = '', open = false, mo = null;
        const ms = this._moState();
        // zbalené entity: po sebe idúce s collapsed: true sa skryjú pod jeden riadok „Ďalšie“
        const closeM = () => { if (mo) { html = html.replace(`@@N${mo.k}@@`, String(mo.n)); html += '</div></div>'; mo = null; } };
        const close = () => { closeM(); if (open) { html += '</div>'; open = false; } };
        c.entities.forEach((e, i) => {
          if (e.type === 'divider') { close(); if (e.label) html += `<div class="gl">${esc(e.label)}</div>`; return; }
          if (!open) { html += '<div class="grp">'; open = true; }
          if (e.collapsed && !mo) {
            mo = { k: i, n: 0 };
            html += `<div class="more${ms[i] ? ' o' : ''}" data-m="${i}"><div class="mt"><span class="ic">${ICO_MORE}</span><span class="nm"><b><span class="ms">${_('Ďalšie')}</span><span class="mh">${_('Skryť')}</span></b></span><span class="mc">@@N${i}@@</span><span class="chev">${ICO_CHEV}</span></div><div class="mb">`;
          } else if (!e.collapsed) closeM();
          if (mo) mo.n++;
          html += `<div class="row" data-i="${i}"><span class="ic"></span><span class="nm"><b></b><small></small></span><span class="ctl"></span></div><div class="exp" data-x="${i}"></div>`;
        });
        close();
        this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card>
          ${c.title ? `<div class="hl">${c.icon ? `<ha-icon icon="${esc(c.icon)}"></ha-icon>` : ''}<span>${esc(c.title)}</span></div>` : ''}
          ${html || '<div class="empty">Pridaj entity v nastaveniach karty.</div>'}
          ${c.graph && c.graph.entity ? '<div class="gr" id="gr"></div>' : ''}
        </ha-card>`;
        this._card = this.shadowRoot.querySelector('ha-card');
        this._rows = [...this.shadowRoot.querySelectorAll('.row')];
        this._rows.forEach((r) => this._bindRow(r));
        const gr = this.shadowRoot.getElementById('gr'); if (gr) gr.onclick = () => this._more(c.graph.entity);
        this.shadowRoot.querySelectorAll('.more > .mt').forEach((t) => t.addEventListener('click', () => {
          const m = t.parentNode, k = +m.dataset.m, st = this._moState(); m.classList.toggle('o');
          if (m.classList.contains('o')) st[k] = 1; else delete st[k];
          try { localStorage.setItem(this._moKey(), JSON.stringify(st)); } catch (_) { }
        }));
        this._kinds = {};
      }
      this._update();
    }

    _kind(e, s) {
      const d = dom(e.entity);
      if (!s) return 'na';
      if (TOGGLE.includes(d)) return 'toggle';
      if (d === 'input_select' || d === 'select') {
        const o = s.attributes.options || [];
        return o.length && o.length <= 3 && o.join('').length <= 22 ? 'seg' : 'list';
      }
      if (d === 'input_number' || d === 'number') return 'num';
      if (d === 'input_datetime') return 'dt';
      if (d === 'input_text' || d === 'text') return 'text';
      if (RUN.includes(d)) return 'run';
      return 'val';
    }

    /* ---------- hodnoty ---------- */
    _update() {
      if (!this._rows) return;
      this._rows.forEach((row) => {
        const i = +row.dataset.i, e = this._config.entities[i], s = this._st(e.entity), k = this._kind(e, s);
        const ctl = row.querySelector('.ctl');
        // ikona
        const ic = row.querySelector('.ic');
        if (e.icon) { if (!ic.firstChild || ic.firstChild.tagName !== 'HA-ICON') ic.innerHTML = '<ha-icon></ha-icon>'; if (ic.firstChild.getAttribute('icon') !== e.icon) ic.firstChild.setAttribute('icon', e.icon); }
        else if (s) { if (!ic.firstChild || ic.firstChild.tagName !== 'HA-STATE-ICON') ic.innerHTML = '<ha-state-icon></ha-state-icon>'; ic.firstChild.hass = this._hass; ic.firstChild.stateObj = s; }
        row.classList.toggle('na', !s);
        row.querySelector('.nm b').textContent = e.name || (s && s.attributes.friendly_name) || e.entity;
        // druhý riadok
        const sm = row.querySelector('.nm small');
        let sec = '';
        if (s && e.secondary_info === 'last-changed') sec = this._ago(s.last_changed);
        else if (s && e.secondary_info === 'last-updated') sec = this._ago(s.last_updated);
        else if (e.secondary_info === 'entity-id') sec = e.entity;
        if (!s) sec = _('entita nenájdená');
        sm.classList.toggle('txt', false);
        // ovládací prvok – kostra sa mení len pri zmene druhu
        if (row._k !== k) { row._k = k; ctl.innerHTML = this._ctlHTML(k, e, s); this._bindCtl(row, k, e); }
        if (k === 'text' && s) { sm.classList.add('txt'); sec = s.state && s.state !== 'unknown' ? s.state : '–'; }
        if (sm.textContent !== sec) sm.textContent = sec;
        // pending (optimistický stav)
        const pend = row._pend != null && Date.now() < row._pendT;
        if (row._pend != null && (!pend || (s && String(s.state) === String(row._pend)))) row._pend = null;
        row.classList.toggle('pend', row._pend != null);
        const st = row._pend != null ? row._pend : s && s.state;
        // zapnuté: prepínač vždy (pre tvar prepínača), ikona len pri state_color
        row.classList.toggle('on', !!s && (k === 'toggle' ? st === 'on' : this._config.state_color !== false && ON.includes(st)));
        row.classList.toggle('mute', this._config.state_color === false);
        if (!s) return;
        if (k === 'val') {
          const t = this._fmt(s); if (ctl.__t !== t) { ctl.__t = t; ctl.innerHTML = `<span class="val">${esc(t)}</span>`; }
        } else if (k === 'seg') {
          ctl.querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.v === st));
        } else if (k === 'list') {
          const sp = ctl.querySelector('.pill span'); const t = row._pend != null ? st : this._fmt(s); if (sp.textContent !== t) sp.textContent = t;
          const ex = row.nextElementSibling;
          if (ex.classList.contains('show')) ex.querySelectorAll('.opt').forEach((o) => o.classList.toggle('sel', o.dataset.v === st));
        } else if (k === 'num') {
          const b = ctl.querySelector('b'), u = s.attributes.unit_of_measurement;
          const t = `${isNaN(parseFloat(st)) ? '–' : this._fmtNum(st, s)}${u ? `<small>${esc(u)}</small>` : ''}`;
          if (b.__t !== t) { b.__t = t; b.innerHTML = t; }
        } else if (k === 'dt') {
          const a = s.attributes, sp = ctl.querySelector('.pill span'), inp = ctl.querySelector('input');
          const tm = a.has_time !== false ? String(st).split(' ').pop().slice(0, 5) : '';
          const dt = a.has_date ? new Date(String(st).split(' ')[0] + 'T00:00').toLocaleDateString((this._hass.locale && this._hass.locale.language) || 'sk', { day: 'numeric', month: 'numeric' }) : '';
          const t = [dt, tm].filter(Boolean).join(' ') || '–'; if (sp.textContent !== t) sp.textContent = t;
          if (document.activeElement !== inp && this.shadowRoot.activeElement !== inp) inp.value = a.has_date && a.has_time !== false ? String(st).replace(' ', 'T').slice(0, 16) : a.has_date ? String(st).slice(0, 10) : tm;
        }
      });
      this._drawGraph();
    }

    _ctlHTML(k, e, s) {
      if (k === 'toggle') return '<span class="tg"></span>';
      if (k === 'seg') return `<span class="seg">${(s.attributes.options || []).map((o) => `<button data-v="${esc(o)}">${esc(o)}</button>`).join('')}</span>`;
      if (k === 'list') return `<span class="pill"><span></span>${CHEV}</span>`;
      if (k === 'num') return '<span class="stp"><button data-d="-1">−</button><b></b><button data-d="1">+</button></span>';
      if (k === 'dt') {
        const a = s.attributes, type = a.has_date && a.has_time !== false ? 'datetime-local' : a.has_date ? 'date' : 'time';
        return `<span class="pill"><span></span><input type="${type}" step="60"></span>`;
      }
      if (k === 'run') return `<span class="pill run"><span>${dom(e.entity) === 'scene' ? _('Aktivovať') : _('Spustiť')}</span></span>`;
      if (k === 'text') return `<span class="pill"><span>${_('Upraviť')}</span></span>`;
      return '';
    }

    _setPend(row, v) { row._pend = v; row._pendT = Date.now() + 6000; this._update(); }

    _bindRow(row) {
      row.addEventListener('click', (ev) => {
        if (ev.target.closest('.ctl') && row._k !== 'toggle' && row._k !== 'val') return;
        const e = this._config.entities[+row.dataset.i], s = this._st(e.entity);
        if (!s) return;
        if (row._k === 'toggle') { const cur = row._pend != null ? row._pend : s.state; this._call('homeassistant', 'toggle', { entity_id: e.entity }); this._setPend(row, cur === 'on' ? 'off' : 'on'); }
        else if (row._k === 'list' || row._k === 'text') this._toggleExp(row);
        else this._more(e.entity);
      });
      // podržanie = detail
      let lt;
      row.addEventListener('pointerdown', (ev) => { if (ev.target.closest('.stp,.seg,input')) return; lt = setTimeout(() => { lt = null; row._longed = true; this._more(this._config.entities[+row.dataset.i].entity); }, 550); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((n) => row.addEventListener(n, () => clearTimeout(lt)));
      row.addEventListener('click', (ev) => { if (row._longed) { row._longed = false; ev.stopImmediatePropagation(); } }, true);
    }

    _toggleExp(row) {
      const ex = row.nextElementSibling, e = this._config.entities[+row.dataset.i], s = this._st(e.entity);
      const was = ex.classList.contains('show');
      this.shadowRoot.querySelectorAll('.exp.show').forEach((x) => { x.classList.remove('show'); x.previousElementSibling.classList.remove('open'); x.innerHTML = ''; });
      if (was || !s) return;
      row.classList.add('open'); ex.classList.add('show');
      const d = dom(e.entity);
      if (row._k === 'list') {
        ex.innerHTML = (s.attributes.options || []).map((o) => `<div class="opt${o === s.state ? ' sel' : ''}" data-v="${esc(o)}"><span>${esc(o)}</span><i>✓</i></div>`).join('');
        ex.querySelectorAll('.opt').forEach((o) => o.onclick = () => {
          this._call(d, 'select_option', { entity_id: e.entity, option: o.dataset.v }); this._setPend(row, o.dataset.v); this._toggleExp(row);
        });
      } else {
        const mx = s.attributes.max || 255;
        ex.innerHTML = `<input class="edit" maxlength="${mx}">`;
        const inp = ex.querySelector('input'); inp.value = s.state === 'unknown' ? '' : s.state; inp.focus(); inp.select();
        const save = () => { if (inp.value !== s.state) { this._call(d, 'set_value', { entity_id: e.entity, value: inp.value }); this._setPend(row, inp.value); } };
        inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { save(); this._toggleExp(row); } if (ev.key === 'Escape') this._toggleExp(row); });
        inp.addEventListener('blur', () => { if (ex.classList.contains('show')) { save(); this._toggleExp(row); } });
      }
    }

    _bindCtl(row, k, e) {
      const ctl = row.querySelector('.ctl'), d = dom(e.entity);
      if (k === 'seg') ctl.querySelectorAll('button').forEach((b) => b.onclick = (ev) => {
        ev.stopPropagation(); this._call(d, 'select_option', { entity_id: e.entity, option: b.dataset.v }); this._setPend(row, b.dataset.v);
      });
      if (k === 'list' || k === 'text') ctl.querySelector('.pill').onclick = (ev) => { ev.stopPropagation(); this._toggleExp(row); };
      if (k === 'run') ctl.querySelector('.pill').onclick = (ev) => {
        ev.stopPropagation();
        if (d === 'script' || d === 'scene') this._call(d, 'turn_on', { entity_id: e.entity }); else this._call(d, 'press', { entity_id: e.entity });
        const p = ctl.querySelector('.pill span'), t = p.textContent; p.textContent = '✓'; setTimeout(() => { p.textContent = t; }, 1200);
      };
      if (k === 'dt') {
        const inp = ctl.querySelector('input');
        inp.onclick = (ev) => { ev.stopPropagation(); try { inp.showPicker(); } catch (_) { } };
        inp.onchange = () => {
          const v = inp.value; if (!v) return; const data = { entity_id: e.entity };
          if (inp.type === 'time') data.time = v.length === 5 ? v + ':00' : v;
          else if (inp.type === 'date') data.date = v;
          else data.datetime = v.replace('T', ' ') + (v.length === 16 ? ':00' : '');
          this._call('input_datetime', 'set_datetime', data);
          this._setPend(row, inp.type === 'time' ? data.time : inp.type === 'date' ? v : data.datetime);
        };
      }
      if (k === 'num') {
        let tmr, rep, val = null;
        const step = (dir) => {
          const s = this._st(e.entity), a = s.attributes, st = Number(a.step) || 1;
          const base = val != null ? val : parseFloat(row._pend != null ? row._pend : s.state);
          val = Math.min(a.max != null ? a.max : Infinity, Math.max(a.min != null ? a.min : -Infinity, Math.round((base + dir * st) / st) * st));
          val = +val.toFixed(6); this._setPend(row, String(val));
          clearTimeout(tmr); tmr = setTimeout(() => { this._call(d, 'set_value', { entity_id: e.entity, value: val }); row._pendT = Date.now() + 6000; val = null; }, 700);
          if (navigator.vibrate) navigator.vibrate(4);
        };
        ctl.querySelectorAll('button').forEach((b) => {
          b.addEventListener('pointerdown', (ev) => {
            ev.stopPropagation(); const dir = +b.dataset.d; step(dir);
            let n = 0; rep = setTimeout(function go() { step(dir); n++; rep = setTimeout(go, n > 8 ? 60 : 140); }, 420);
          });
          ['pointerup', 'pointerleave', 'pointercancel'].forEach((x) => b.addEventListener(x, () => clearTimeout(rep)));
          b.addEventListener('click', (ev) => ev.stopPropagation());
        });
      }
    }

    /* ---------- graf ---------- */
    _gStart() {
      const g = this._config && this._config.graph;
      if (!g || !g.entity || !this._hass || !this.isConnected) return;
      const key = g.entity + '#' + (g.hours || 24);
      if (this._gT && key === this._gKey) return;
      clearInterval(this._gT); this._gKey = key;
      this._gLoad(); this._gT = setInterval(() => this._gLoad(), 5 * 60000);
    }
    async _gLoad() {
      const g = this._config.graph, H = (g.hours || 24) * 3600000, t0 = Date.now() - H;
      try {
        const r = await this._hass.callWS({ type: 'history/history_during_period', start_time: new Date(t0).toISOString(), entity_ids: [g.entity], minimal_response: true, no_attributes: true, significant_changes_only: false });
        this._gpts = (r[g.entity] || []).map((x) => [Math.max(t0, ((x.lu != null ? x.lu : x.lc) || 0) * 1000), parseFloat(x.s)]).filter((p) => !isNaN(p[1]));
        this._gSig = ''; this._drawGraph();
      } catch (e) { console.warn('igy-entities-card: graf', e); }
    }
    _drawGraph() {
      const gr = this.shadowRoot && this.shadowRoot.getElementById('gr'); if (!gr || !this._gpts) return;
      const g = this._config.graph, H = (g.hours || 24) * 3600000, now = Date.now(), t0 = now - H, s = this._st(g.entity);
      const pts = this._gpts.slice(); if (s && !isNaN(parseFloat(s.state))) pts.push([now, parseFloat(s.state)]);
      if (pts.length < 2) return;
      // priemer do 120 košov (krokový priebeh)
      const N = 120, b = new Array(N).fill(null); let k = 0, last = pts[0][1];
      for (let i = 0; i < N; i++) {
        const a = t0 + H * i / N, z = t0 + H * (i + 1) / N; let sum = 0, w = 0, t = a;
        while (k < pts.length && pts[k][0] <= a) { last = pts[k][1]; k++; }
        let j = k;
        while (j < pts.length && pts[j][0] < z) { sum += last * (pts[j][0] - t); w += pts[j][0] - t; t = pts[j][0]; last = pts[j][1]; j++; }
        sum += last * (z - t); w += z - t; b[i] = sum / w; k = j;
      }
      const mn = Math.min(0, ...b), mx = Math.max(...b), rg = mx - mn || 1;
      const xy = b.map((v, i) => [(i + .5) / N * 100, 38 - (v - mn) / rg * 34]);
      let d = `M${xy[0][0].toFixed(2)},${xy[0][1].toFixed(2)}`;
      for (let i = 1; i < xy.length; i++) { const p = xy[i - 1], q = xy[i], cx = (p[0] + q[0]) / 2; d += ` C${cx.toFixed(2)},${p[1].toFixed(2)} ${cx.toFixed(2)},${q[1].toFixed(2)} ${q[0].toFixed(2)},${q[1].toFixed(2)}`; }
      const sig = d.length + d.slice(-40); if (this._gSig === sig) return; this._gSig = sig;
      const col = g.color || ACC;
      gr.innerHTML = `<svg viewBox="0 0 100 40" preserveAspectRatio="none"><defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
        <path d="${d} L${xy[xy.length - 1][0].toFixed(2)},40 L${xy[0][0].toFixed(2)},40 Z" fill="url(#gg)"/>
        <path d="${d}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
    }
  }

  /* ================= Editor ================= */
  const EDCSS = `
    .ed { display: flex; flex-direction: column; gap: 14px; }
    .hint { font-size: 13px; color: var(--secondary-text-color); line-height: 1.4; }
    .sec { font-size: 14px; font-weight: 500; color: var(--primary-text-color); margin-top: 4px; }
    .items { display: flex; flex-direction: column; gap: 8px; }
    .it { border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 12px; background: var(--card-background-color); }
    .it.div { border-style: dashed; background: transparent; }
    .it.dragging { box-shadow: 0 6px 18px rgba(0,0,0,.3); z-index: 9; position: relative; }
    .ih { display: flex; align-items: center; gap: 8px; padding: 8px 6px 8px 4px; min-height: 40px; }
    .hd { cursor: grab; touch-action: none; font-size: 20px; color: var(--secondary-text-color); padding: 4px 6px; user-select: none; }
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
    .btn { align-self: flex-start; background: none; border: 1px dashed var(--divider-color, rgba(127,127,127,.4)); border-radius: 10px; padding: 8px 14px; color: var(--primary-text-color); cursor: pointer; font: inherit; font-size: 13px; }
    .btn:hover { background: rgba(127,127,127,.1); }
  `;
  const ICO = {
    down: CHEV,
    del: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9m0 5h2v9H9V8m4 0h2v9h-2V8z"/></svg>'
  };
  const SEC_OPTS = () => [{ value: 'none', label: _('Nič') }, { value: 'last-changed', label: _('Posledná zmena') }, { value: 'last-updated', label: _('Posledná aktualizácia') }, { value: 'entity-id', label: _('ID entity') }];

  class HomeEntitiesCardEditor extends HTMLElement {
    setConfig(config) {
      const c = normalize(config);
      if (this._last && JSON.stringify(c) === this._last) return;
      this._cfg = c; this._last = JSON.stringify(c);
      if (this._hass) this._build();
    }
    set hass(h) { setLang(h);
      const first = !this._hass; this._hass = h;
      if (first && this._cfg) this._build();
      this.querySelectorAll('ha-form').forEach((f) => { f.hass = h; });
    }
    _emit() {
      this._last = JSON.stringify(this._cfg);
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: JSON.parse(this._last) }, bubbles: true, composed: true }));
    }
    _form(data, schema, labels, onChange) {
      const f = document.createElement('ha-form');
      f.hass = this._hass; f.data = data; f.schema = schema; f.computeLabel = (x) => labels[x.name] || x.name;
      f.addEventListener('value-changed', (e) => { e.stopPropagation(); onChange(Object.assign({}, e.detail.value)); });
      return f;
    }

    _build() {
      const open = this._open || new Set();
      this.innerHTML = `<style>${EDCSS}</style><div class="ed">
        <div id="top"></div>
        <div class="sec">${_('Entity')}</div>
        <div class="hint">${_('Poradie zmeníš potiahnutím za ⠿. Ťukni na položku pre názov, ikonu a druhý riadok. Oddeľovač začne novú skupinu.')}</div>
        <div class="items" id="items"></div>
        <div class="add"><div class="lbl">${_('+ Pridať entitu')}</div><div id="addp"></div></div>
        <button class="btn" id="adddiv">${_('+ Pridať oddeľovač')}</button>
        <div class="sec">${_('Graf dole')}</div>
        <div id="graph"></div>
      </div>`;
      const c = this._cfg;
      this.querySelector('#top').appendChild(this._form({ title: c.title || '', icon: c.icon || '', state_color: c.state_color !== false },
        [{ name: 'title', selector: { text: {} } }, { name: 'icon', selector: { icon: {} } }, { name: 'state_color', selector: { boolean: {} } }],
        { title: _('Nadpis karty (voliteľné)'), icon: _('Ikona pri nadpise'), state_color: _('Zafarbiť ikonu, keď je zapnuté') },
        (v) => { ['title', 'icon'].forEach((k) => { if (v[k]) c[k] = v[k]; else delete c[k]; }); if (v.state_color === false) c.state_color = false; else c.state_color = true; this._emit(); }));
      const box = this.querySelector('#items');
      c.entities.forEach((e, i) => box.appendChild(this._item(e, i, open.has(i))));
      this.querySelector('#addp').appendChild(this._form({}, [{ name: 'entity', selector: { entity: {} } }], { entity: _('Vyber entitu') }, (v) => {
        if (!v.entity) return; c.entities.push({ entity: v.entity }); this._emit(); this._open = new Set(); this._build();
      }));
      this.querySelector('#adddiv').onclick = () => { c.entities.push({ type: 'divider' }); this._emit(); this._open = new Set([c.entities.length - 1]); this._build(); };
      const g = c.graph || {};
      this.querySelector('#graph').appendChild(this._form({ entity: g.entity || '', hours: g.hours || 12 },
        [{ name: 'entity', selector: { entity: { domain: 'sensor' } } }, { name: 'hours', selector: { number: { min: 1, max: 168, step: 1, mode: 'box', unit_of_measurement: 'h' } } }],
        { entity: _('Entita grafu (prázdne = bez grafu)'), hours: _('Koľko hodín dozadu') },
        (v) => { if (v.entity) c.graph = { entity: v.entity, hours: Number(v.hours) || 12 }; else delete c.graph; this._emit(); }));
    }

    _item(e, i, isOpen) {
      const c = this._cfg, it = document.createElement('div'), isDiv = e.type === 'divider';
      it.className = 'it' + (isOpen ? ' open' : '') + (isDiv ? ' div' : '');
      const s = !isDiv && this._hass.states[e.entity];
      it.innerHTML = `<div class="ih"><span class="hd" title="Potiahni pre zmenu poradia">⠿</span><span class="tx"><b></b><small></small></span>
        <button class="ib exp" title="${_('Upraviť')}">${ICO.down}</button><button class="ib del" title="${_('Odstrániť')}">${ICO.del}</button></div><div class="body"></div>`;
      const setTx = () => {
        it.querySelector('.tx b').textContent = isDiv ? (e.label ? _('Skupina') + ': ' + e.label : _('— oddeľovač —')) : e.name || (s && s.attributes.friendly_name) || e.entity;
        const sm = it.querySelector('.tx small'); sm.className = !isDiv && !s ? 'warn' : '';
        sm.textContent = isDiv ? _('začína novú skupinu') : (s ? e.entity : e.entity + ' – ' + _('entita neexistuje')) + (e.collapsed ? ' · ' + _('zbalená') : '');
      };
      setTx();
      const toggle = () => { it.classList.toggle('open'); this._open = new Set([...this.querySelectorAll('.it')].map((x, k) => x.classList.contains('open') ? k : -1).filter((k) => k >= 0)); };
      it.querySelector('.tx').onclick = toggle; it.querySelector('.exp').onclick = toggle;
      it.querySelector('.del').onclick = () => { c.entities.splice(i, 1); this._emit(); this._open = new Set(); this._build(); };
      const f = isDiv
        ? this._form({ label: e.label || '' }, [{ name: 'label', selector: { text: {} } }], { label: _('Nadpis skupiny (voliteľné)') }, (v) => {
          if (v.label) e.label = v.label; else delete e.label; setTx(); this._emit();
        })
        : this._form({ entity: e.entity, name: e.name || '', icon: e.icon || '', secondary_info: e.secondary_info || 'none', collapsed: !!e.collapsed },
          [{ name: 'entity', required: true, selector: { entity: {} } }, { name: 'name', selector: { text: {} } }, { name: 'icon', selector: { icon: {} } },
            { name: 'secondary_info', selector: { select: { mode: 'dropdown', options: SEC_OPTS() } } }, { name: 'collapsed', selector: { boolean: {} } }],
          { entity: _('Entita'), name: _('Vlastný názov (prázdny = názov z HA)'), icon: _('Ikona (prázdna = podľa HA)'), secondary_info: _('Druhý riadok'), collapsed: _('Zbalená – skryť pod „Ďalšie“ (susedné zbalené entity sa spoja)') },
          (v) => {
            const n = { entity: v.entity || e.entity };
            if (v.name) n.name = v.name; if (v.icon) n.icon = v.icon; if (v.secondary_info && v.secondary_info !== 'none') n.secondary_info = v.secondary_info; if (v.collapsed) n.collapsed = true;
            Object.keys(e).forEach((k) => delete e[k]); Object.assign(e, n); setTx(); this._emit();
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
          if (to !== from) { const [m] = this._cfg.entities.splice(from, 1); this._cfg.entities.splice(to, 0, m); this._open = new Set(); this._emit(); this._build(); }
        };
        hd.addEventListener('pointermove', move); hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
      });
    }
  }

  if (!customElements.get('igy-entities-card-editor')) customElements.define('igy-entities-card-editor', HomeEntitiesCardEditor);
  if (!customElements.get('igy-entities-card')) customElements.define('igy-entities-card', HomeEntitiesCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-entities-card'))
    window.customCards.push({ type: 'igy-entities-card', name: 'Igy Entities Card', description: _('Zoznam entít s peknými prepínačmi, výbermi a krokovačmi.'), preview: true });
  console.info('%c IGY-ENTITIES-CARD %c ' + VERSION + ' ', 'background:#ff9f0a;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();
