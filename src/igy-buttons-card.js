/*
 * Igy Buttons Card – tlačidlá na spúšťanie vecí v štýle Home Energy / Thermostat / Entities Card.
 *
 *   type: custom:igy-buttons-card
 *   title: Rýchle akcie          # voliteľné
 *   icon: mdi:gesture-tap        # voliteľné
 *   layout: tiles                # tiles (dlaždice) / pills (pilulky) / icons (len ikony)
 *   columns: 3                   # voliteľné – inak podľa šírky
 *   buttons:
 *     - entity: input_button.blinds_open
 *       name: Otvoriť žalúzie
 *       icon: mdi:blinds-open
 *     - entity: input_button.blinds_close
 *       name: Zatvoriť žalúzie
 *       icon: mdi:blinds
 *     - entity: input_boolean.security
 *       name: Stráženie
 *       confirm: true            # druhý ťuk do 3 s potvrdí (proti náhodnému stlačeniu)
 *       color: '#ff6961'         # voliteľné – farba zapnutého stavu
 *     - name: Kuchyňa
 *       icon: mdi:silverware-fork-knife
 *       tap_action: { action: navigate, navigation_path: /dashboard-home/kuchyna }
 *     - name: Upratať
 *       icon: mdi:robot-vacuum
 *       tap_action: { action: perform-action, perform_action: vacuum.start, target: { entity_id: vacuum.roborock } }
 *
 * Predvolený ťuk podľa entity: tlačidlo/skript/scéna = spustiť, vypínač/svetlo/boolean = prepnúť,
 * zámok = zamknúť/odomknúť, žalúzia = otvoriť/zatvoriť, ostatné = detail. Podržanie = detail.
 */
(function () {
  'use strict';
  const VERSION = '1.0.4';
  const ACC = '#ff9f0a';
  const TOGGLE = ['switch', 'light', 'input_boolean', 'fan', 'automation', 'siren', 'humidifier', 'group'];
  const RUN = { button: 'press', input_button: 'press', script: 'turn_on', scene: 'turn_on' };
  const ON = ['on', 'open', 'opening', 'unlocked', 'playing', 'cleaning', 'heat', 'armed_home', 'armed_away', 'armed_night', 'home'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  const dom = (id) => (id || '').split('.')[0];

  function normalize(c) {
    c = JSON.parse(JSON.stringify(c || {}));
    // kompatibilita s bubble-card sub_button
    if (!c.buttons && c.sub_button) c.buttons = [].concat(c.sub_button.main || [], c.sub_button.bottom || []);
    c.buttons = (c.buttons || c.entities || []).map((b) => typeof b === 'string' ? { entity: b } : b).filter(Boolean);
    delete c.entities; delete c.sub_button;
    return c;
  }

  const CSS = `
    ha-card { padding: 12px 18px 16px; overflow: hidden; }
    ha-card.notitle { padding-top: 14px; }
    .hl { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--secondary-text-color); letter-spacing: .02em; margin-bottom: 12px; }
    .hl ha-icon { --mdc-icon-size: 16px; }
    .g { display: grid; gap: 8px; }
    .b { position: relative; border: 0; font: inherit; color: var(--primary-text-color); cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent;
      background: var(--hc-surface, rgba(127,127,127,.1)); box-shadow: inset 0 0 0 1px var(--hc-surface-line, transparent); overflow: hidden;
      transition: background .25s, transform .12s, box-shadow .25s; }
    .b:active { transform: scale(.96); }
    .b .ic { display: flex; color: var(--secondary-text-color); transition: color .25s; }
    .b .ic > * { --mdc-icon-size: 24px; }
    .b .nm { font-size: 12.5px; font-weight: 500; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .b .st { font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .b.on { background: color-mix(in srgb, var(--c) 20%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 35%, transparent); }
    .b.on .ic { color: var(--c); }
    .b.on .ic > * { filter: drop-shadow(0 0 6px color-mix(in srgb, var(--c) 60%, transparent)); }
    .b.na { opacity: .4; }
    /* potvrdenie / hotovo */
    .b .ov { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px; font-weight: 600; opacity: 0; pointer-events: none; transition: opacity .2s; }
    .b.cf .ov { opacity: 1; background: var(--c); color: #000; }
    .b.ok .ov { opacity: 1; background: color-mix(in srgb, #30d158 85%, transparent); color: #000; }
    .b .ov ha-icon { --mdc-icon-size: 18px; }
    /* dlaždice */
    .tiles .b { border-radius: 18px; padding: 12px 8px 10px; min-height: 76px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; }
    .tiles .b .ic > * { --mdc-icon-size: 26px; }
    /* pilulky */
    .pills .b { border-radius: 99px; height: 44px; padding: 0 16px 0 12px; display: flex; align-items: center; gap: 8px; justify-content: flex-start; min-width: 0; }
    .pills .b .ic > * { --mdc-icon-size: 20px; }
    .pills .b .tx { display: flex; flex-direction: column; min-width: 0; text-align: left; }
    .pills .b .nm { font-size: 13px; }
    .pills .b .st { font-size: 10.5px; }
    /* len ikony */
    .icons .b { border-radius: 16px; height: 52px; display: flex; align-items: center; justify-content: center; }
    .icons .b .nm, .icons .b .st { display: none; }
    .empty { font-size: 13px; color: var(--secondary-text-color); padding: 6px 0; }
  `;

  class HomeButtonsCard extends HTMLElement {
    static getConfigElement() { return document.createElement('igy-buttons-card-editor'); }
    static getStubConfig() { return { layout: 'tiles', buttons: [] }; }
    setConfig(c) { if (!c) throw new Error('Chybná konfigurácia.'); this._cfg = normalize(c); this._built = false; if (this._hass) this._render(); }
    set hass(h) { this._hass = h; this._render(); }
    getCardSize() { const n = this._cfg.buttons.length, cols = this._cols(); return (this._cfg.title ? 1 : 0) + Math.ceil(n / cols) * (this._cfg.layout === 'tiles' || !this._cfg.layout ? 2 : 1); }
    getGridOptions() { return { columns: 12, min_columns: 3 }; }
    _cols() { const c = this._cfg; return c.columns || Math.min(c.buttons.length || 1, c.layout === 'icons' ? 6 : c.layout === 'pills' ? 2 : 4); }

    _st(id) { return id && this._hass.states[id]; }
    _name(b, s) { return b.name != null ? b.name : s ? s.attributes.friendly_name || b.entity : ''; }
    _isOn(b, s) { if (!s) return false; if (b.state_on) return [].concat(b.state_on).includes(s.state); return ON.includes(s.state); }
    _stateText(b, s) {
      if (!s || b.show_state === false) return '';
      const d = dom(b.entity);
      if (RUN[d]) return b.show_state ? this._ago(s.state) : '';
      if (b.show_state || TOGGLE.includes(d) || d === 'lock' || d === 'cover' || d === 'alarm_control_panel') {
        try { if (this._hass.formatEntityState) return this._hass.formatEntityState(s); } catch (_) { }
        return s.state;
      }
      return '';
    }
    _ago(ts) { const m = Math.round((Date.now() - Date.parse(ts)) / 60000); if (isNaN(m)) return ''; return m < 1 ? 'práve teraz' : m < 60 ? `pred ${m} min` : m < 1440 ? `pred ${Math.floor(m / 60)} h` : `pred ${Math.floor(m / 1440)} d`; }

    _render() {
      if (!this._hass || !this._cfg) return;
      const c = this._cfg;
      if (!this._built) {
        if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
        const lay = ['tiles', 'pills', 'icons'].includes(c.layout) ? c.layout : 'tiles';
        this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card class="${c.title ? '' : 'notitle'}">
          ${c.title ? `<div class="hl">${c.icon ? `<ha-icon icon="${esc(c.icon)}"></ha-icon>` : ''}<span>${esc(c.title)}</span></div>` : ''}
          ${c.buttons.length ? `<div class="g ${lay}" style="grid-template-columns:repeat(${this._cols()},minmax(0,1fr))">${c.buttons.map((b, i) => `
            <button class="b" data-i="${i}"><span class="ic"></span>${lay === 'pills' ? '<span class="tx"><span class="nm"></span><span class="st"></span></span>' : '<span class="nm"></span><span class="st"></span>'}<span class="ov"></span></button>`).join('')}</div>`
            : '<div class="empty">Pridaj tlačidlá v nastaveniach karty.</div>'}
        </ha-card>`;
        this.shadowRoot.querySelectorAll('.b').forEach((el) => this._bind(el));
        this._built = true;
      }
      this.shadowRoot.querySelectorAll('.b').forEach((el) => {
        const b = c.buttons[+el.dataset.i], s = this._st(b.entity), on = this._isOn(b, s);
        el.style.setProperty('--c', b.color || (dom(b.entity) === 'light' && s && s.attributes.rgb_color ? `rgb(${s.attributes.rgb_color})` : ACC));
        el.classList.toggle('on', on); el.classList.toggle('na', !!b.entity && (!s || s.state === 'unavailable'));
        // ikona: vlastná, inak podľa HA
        const ic = el.querySelector('.ic');
        if (b.icon) { if (!ic.firstChild || ic.firstChild.tagName !== 'HA-ICON') ic.innerHTML = '<ha-icon></ha-icon>'; if (ic.firstChild.getAttribute('icon') !== b.icon) ic.firstChild.setAttribute('icon', b.icon); }
        else if (s) { if (!ic.firstChild || ic.firstChild.tagName !== 'HA-STATE-ICON') ic.innerHTML = '<ha-state-icon></ha-state-icon>'; ic.firstChild.hass = this._hass; ic.firstChild.stateObj = s; }
        else if (!ic.firstChild) ic.innerHTML = '<ha-icon icon="mdi:gesture-tap-button"></ha-icon>';
        const nm = b.show_name === false ? '' : this._name(b, s), st = this._stateText(b, s);
        const n = el.querySelector('.nm'), t = el.querySelector('.st');
        if (n.textContent !== nm) n.textContent = nm; n.style.display = nm ? '' : 'none';
        if (t.textContent !== st) t.textContent = st; t.style.display = st ? '' : 'none';
        el.title = nm || b.entity || '';
      });
    }

    _bind(el) {
      let tm = null, held = false, x0 = 0, y0 = 0;
      el.addEventListener('pointerdown', (e) => {
        held = false; x0 = e.clientX; y0 = e.clientY; clearTimeout(tm);
        tm = setTimeout(() => { held = true; if (navigator.vibrate) navigator.vibrate(12); this._act(+el.dataset.i, 'hold'); }, 500);
      });
      el.addEventListener('pointermove', (e) => { if (Math.abs(e.clientX - x0) > 10 || Math.abs(e.clientY - y0) > 10) clearTimeout(tm); });
      el.addEventListener('pointerup', () => { clearTimeout(tm); if (!held) this._tap(el); });
      el.addEventListener('pointercancel', () => clearTimeout(tm));
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    _tap(el) {
      const i = +el.dataset.i, b = this._cfg.buttons[i];
      if (b.confirm && !el.classList.contains('cf')) {
        el.querySelector('.ov').innerHTML = `<ha-icon icon="mdi:gesture-tap"></ha-icon>${esc(typeof b.confirm === 'string' ? b.confirm : 'Potvrdiť')}`;
        el.classList.add('cf'); clearTimeout(el._cfT); el._cfT = setTimeout(() => el.classList.remove('cf'), 3000);
        return;
      }
      el.classList.remove('cf'); clearTimeout(el._cfT);
      const done = this._act(i, 'tap');
      if (navigator.vibrate) navigator.vibrate(8);
      if (done) { el.querySelector('.ov').innerHTML = '<ha-icon icon="mdi:check"></ha-icon>'; el.classList.add('ok'); setTimeout(() => el.classList.remove('ok'), 900); }
    }
    // vráti true pri spustení (krátke ✓), false pri prepnutí / navigácii / detaile
    _act(i, kind) {
      const b = this._cfg.buttons[i], h = this._hass, id = b.entity, d = dom(id), s = this._st(id);
      let a = b[kind + '_action'];
      if (!a) {
        if (kind === 'hold') a = { action: 'more-info' };
        else if (RUN[d]) a = { action: 'run' };
        else if (TOGGLE.includes(d) || d === 'lock' || d === 'cover' || d === 'valve') a = { action: 'toggle' };
        else a = { action: id ? 'more-info' : 'none' };
      }
      const more = (eid) => this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: eid }, bubbles: true, composed: true }));
      switch (a.action) {
        case 'run': h.callService(d, RUN[d], { entity_id: id }); return true;
        case 'toggle':
          if (RUN[d]) { h.callService(d, RUN[d], { entity_id: id }); return true; }
          if (d === 'lock') h.callService('lock', s && s.state === 'locked' ? 'unlock' : 'lock', { entity_id: id });
          else if (d === 'cover' || d === 'valve') h.callService(d, 'toggle', { entity_id: id });
          else h.callService('homeassistant', 'toggle', { entity_id: id });
          return false;
        case 'more-info': more(a.entity || id); return false;
        case 'navigate': history.pushState(null, '', a.navigation_path); window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } })); return false;
        case 'url': window.open(a.url_path, '_blank'); return false;
        case 'perform-action': case 'call-service': {
          const [sd, sv] = String(a.perform_action || a.service || '').split('.'); if (!sd || !sv) return false;
          h.callService(sd, sv, Object.assign({}, a.data || a.service_data || {}), a.target); return true;
        }
        case 'fire-dom-event': this.dispatchEvent(new CustomEvent('ll-custom', { detail: a, bubbles: true, composed: true })); return false;
        default: return false;
      }
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
    .ih .tx { flex: 1; min-width: 0; cursor: pointer; }
    .ih .tx b { display: block; font-size: 14px; font-weight: 500; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ih .tx small { display: block; font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ib { background: none; border: 0; color: var(--secondary-text-color); cursor: pointer; padding: 6px; border-radius: 50%; display: flex; }
    .ib:hover { background: rgba(127,127,127,.15); }
    .ib svg { width: 20px; height: 20px; }
    .ib.exp svg { transition: transform .2s; }
    .it.open .ib.exp svg { transform: rotate(180deg); }
    .body { display: none; padding: 0 12px 12px; }
    .it.open .body { display: block; }
    .btn { align-self: flex-start; background: none; border: 1px dashed var(--divider-color, rgba(127,127,127,.4)); border-radius: 10px; padding: 8px 14px; color: var(--primary-text-color); cursor: pointer; font: inherit; font-size: 13px; }
  `;
  const ICO = { down: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6z"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9m0 5h2v9H9V8m4 0h2v9h-2V8z"/></svg>' };
  const ACTS = [{ value: 'auto', label: 'Automaticky podľa entity' }, { value: 'toggle', label: 'Prepnúť / spustiť' }, { value: 'more-info', label: 'Detail entity' },
    { value: 'perform-action', label: 'Spustiť akciu (služba)' }, { value: 'navigate', label: 'Prejsť na stránku' }, { value: 'url', label: 'Otvoriť odkaz' }, { value: 'none', label: 'Nič' }];

  class HomeButtonsCardEditor extends HTMLElement {
    setConfig(config) {
      const c = normalize(config);
      if (this._last && JSON.stringify(c) === this._last) return;
      this._cfg = c; this._last = JSON.stringify(c);
      if (this._hass) this._build();
    }
    set hass(h) { const f = !this._hass; this._hass = h; if (f && this._cfg) this._build(); this.querySelectorAll('ha-form').forEach((x) => { x.hass = h; }); }
    _emit() {
      // HA konfiguráciu zmrazí – posiela sa hlboká kópia, vlastný stav editora ostane upraviteľný
      const c = JSON.parse(JSON.stringify(Object.assign({ type: 'custom:igy-buttons-card' }, this._cfg)));
      this._last = JSON.stringify(normalize(c));
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: c }, bubbles: true, composed: true }));
    }
    _form(data, schema, L, H, cb) { const f = document.createElement('ha-form'); f.hass = this._hass; f.data = data; f.schema = schema; f.computeLabel = (x) => L[x.name] || x.name; f.computeHelper = (x) => H && H[x.name]; f.addEventListener('value-changed', (e) => { e.stopPropagation(); const v = Object.assign({}, e.detail.value); try { cb(v); } catch (err) { console.error('igy-buttons-card editor:', err); } }); return f; }
    _build() {
      const c = this._cfg, open = this._open || new Set();
      this.innerHTML = `<style>${EDCSS}</style><div class="ed"><div id="top"></div><div class="sec">Tlačidlá</div>
        <div class="hint">Poradie zmeníš potiahnutím za ⠿. Ťukni na tlačidlo pre názov, ikonu, akciu a potvrdenie.</div><div class="items" id="items"></div><button class="btn" id="add">+ Pridať tlačidlo</button></div>`;
      this.querySelector('#top').appendChild(this._form({ title: c.title || '', icon: c.icon || '', layout: c.layout || 'tiles', columns: c.columns || '' },
        [{ name: 'title', selector: { text: {} } }, { name: 'icon', selector: { icon: {} } },
          { name: 'layout', selector: { select: { mode: 'box', options: [{ value: 'tiles', label: 'Dlaždice' }, { value: 'pills', label: 'Pilulky' }, { value: 'icons', label: 'Len ikony' }] } } },
          { name: 'columns', selector: { number: { min: 1, max: 8, mode: 'box' } } }],
        { title: 'Nadpis (voliteľné)', icon: 'Ikona pri nadpise', layout: 'Vzhľad', columns: 'Stĺpcov (prázdne = automaticky)' }, null,
        (v) => { ['title', 'icon', 'columns'].forEach((k) => { if (v[k] === '' || v[k] == null) delete c[k]; else c[k] = v[k]; }); if (v.layout && v.layout !== 'tiles') c.layout = v.layout; else delete c.layout; this._emit(); }));
      const box = this.querySelector('#items');
      c.buttons.forEach((b, i) => box.appendChild(this._item(b, i, open.has(i))));
      this.querySelector('#add').onclick = () => { c.buttons.push({}); this._emit(); this._open = new Set([c.buttons.length - 1]); this._build(); };
    }
    _item(b0, i, isOpen) {
      let b = b0;
      const c = this._cfg, it = document.createElement('div');
      it.className = 'it' + (isOpen ? ' open' : '');
      it.innerHTML = `<div class="ih"><span class="hd">⠿</span><span class="tx"><b></b><small></small></span><button class="ib exp">${ICO.down}</button><button class="ib del">${ICO.del}</button></div><div class="body"></div>`;
      const setTx = () => { const s = b.entity && this._hass.states[b.entity]; it.querySelector('.tx b').textContent = b.name || (s && s.attributes.friendly_name) || b.entity || 'Nové tlačidlo'; it.querySelector('.tx small').textContent = [b.entity, b.tap_action && b.tap_action.action].filter(Boolean).join(' · ') || 'vyber entitu alebo akciu'; };
      setTx();
      const tog = () => { it.classList.toggle('open'); this._open = new Set([...this.querySelectorAll('.it')].map((x, k) => x.classList.contains('open') ? k : -1).filter((k) => k >= 0)); };
      it.querySelector('.tx').onclick = tog; it.querySelector('.exp').onclick = tog;
      it.querySelector('.del').onclick = () => { c.buttons.splice(i, 1); this._emit(); this._open = new Set(); this._build(); };
      const ta = b.tap_action || {};
      const data = { entity: b.entity || '', name: b.name || '', icon: b.icon || '', color: b.color || '', confirm: !!b.confirm, show_name: b.show_name !== false,
        action: ta.action || 'auto', perform_action: ta.perform_action || ta.service || '', navigation_path: ta.navigation_path || '', url_path: ta.url_path || '' };
      const schema = [{ name: 'entity', selector: { entity: {} } },
        { type: 'grid', name: '', schema: [{ name: 'name', selector: { text: {} } }, { name: 'icon', selector: { icon: {} } }] },
        { name: 'action', selector: { select: { mode: 'dropdown', options: ACTS } } },
        { name: 'perform_action', selector: { text: {} } }, { name: 'navigation_path', selector: { text: {} } }, { name: 'url_path', selector: { text: {} } },
        { type: 'grid', name: '', schema: [{ name: 'confirm', selector: { boolean: {} } }, { name: 'show_name', selector: { boolean: {} } }] },
        { name: 'color', selector: { text: {} } }];
      const L = { entity: 'Entita', name: 'Názov', icon: 'Ikona', action: 'Ťuk', perform_action: 'Akcia (napr. vacuum.start)', navigation_path: 'Stránka (napr. /lovelace/kuchyna)', url_path: 'Odkaz',
        confirm: 'Potvrdiť druhým ťukom', show_name: 'Zobraziť názov', color: 'Farba zapnutého stavu (voliteľné, napr. #ff6961)' };
      const Hh = { action: 'Automaticky: tlačidlo/skript/scéna = spustiť, vypínač/boolean = prepnúť, inak detail. Podržanie vždy otvorí detail.',
        perform_action: 'Len pre „Spustiť akciu“ – cieľom je vybraná entita.', confirm: 'Proti náhodnému stlačeniu (napr. stráženie, brána).' };
      it.querySelector('.body').appendChild(this._form(data, schema, L, Hh, (v) => {
        const n = {};
        ['entity', 'name', 'icon', 'color'].forEach((k) => { if (v[k]) n[k] = v[k]; });
        if (v.confirm) n.confirm = true; if (v.show_name === false) n.show_name = false;
        if (v.action && v.action !== 'auto') {
          const a = { action: v.action };
          if (v.action === 'perform-action') { a.perform_action = v.perform_action || ''; if (v.entity) a.target = { entity_id: v.entity }; if (ta.data) a.data = ta.data; }
          if (v.action === 'navigate') a.navigation_path = v.navigation_path || '';
          if (v.action === 'url') a.url_path = v.url_path || '';
          n.tap_action = a;
        }
        if (b.hold_action) n.hold_action = b.hold_action; if (b.state_on) n.state_on = b.state_on; if (b.show_state != null) n.show_state = b.show_state;
        const js = JSON.stringify(n); if (js === JSON.stringify(b)) return;   // nič sa nezmenilo – žiadna slučka
        this._cfg.buttons[i] = b = n; setTx(); this._emit();
      }));
      this._drag(it.querySelector('.hd'), it);
      return it;
    }
    _drag(hd, row) {
      hd.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        const box = this.querySelector('#items'), rows = [...box.children], from = rows.indexOf(row), y0 = ev.clientY, h = row.getBoundingClientRect().height + 8; let to = from;
        row.classList.add('dragging'); hd.setPointerCapture(ev.pointerId);
        const move = (e) => { const dy = e.clientY - y0; row.style.transform = `translateY(${dy}px)`; to = Math.max(0, Math.min(rows.length - 1, from + Math.round(dy / h)));
          rows.forEach((r, k) => { if (r === row) return; const sh = from < to && k > from && k <= to ? -h : from > to && k < from && k >= to ? h : 0; r.style.transition = 'transform .15s'; r.style.transform = sh ? `translateY(${sh}px)` : ''; }); };
        const up = () => { hd.removeEventListener('pointermove', move); hd.removeEventListener('pointerup', up); hd.removeEventListener('pointercancel', up);
          rows.forEach((r) => { r.style.transform = ''; r.style.transition = ''; }); row.classList.remove('dragging');
          if (to !== from) { const [m] = this._cfg.buttons.splice(from, 1); this._cfg.buttons.splice(to, 0, m); this._open = new Set(); this._emit(); this._build(); } };
        hd.addEventListener('pointermove', move); hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
      });
    }
  }

  if (!customElements.get('igy-buttons-card-editor')) customElements.define('igy-buttons-card-editor', HomeButtonsCardEditor);
  if (!customElements.get('igy-buttons-card')) customElements.define('igy-buttons-card', HomeButtonsCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-buttons-card'))
    window.customCards.push({ type: 'igy-buttons-card', name: 'Igy Buttons Card', description: 'Tlačidlá na spúšťanie akcií – dlaždice, pilulky alebo ikony.', preview: true });
  console.info('%c IGY-BUTTONS-CARD %c ' + VERSION + ' ', 'background:#ff9f0a;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();
