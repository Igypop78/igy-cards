/*
 * Igy Room Card – room card for Home Assistant. Entities are taken from an Area automatically;
 * the visual editor lets you reorder them, move them between sections, hide them and rename them.
 *
 *   type: custom:igy-room-card
 *   area: bedroom              # area id or name
 *   title: Bedroom             # optional, defaults to the area name
 *   columns: 7                 # optional, buttons per row (default: automatic)
 *   title_tap: toggle          # optional: none / toggle (lights on/off) / more-info
 *   collapsible: true          # optional: card collapses to one row (tap the header)
 *   collapsed: true            # optional: start collapsed (then remembered per device)
 *   new_entities: auto         # optional: auto = new entities in the area appear automatically, hide = stay hidden
 *   header:    [sensor.bedroom_temperature, binary_sensor.bedroom_window]   # order and placement
 *   buttons:   [light.ceiling, light.lamp, cover.bedroom]
 *   secondary: [switch.charger]                                               # smaller buttons in a second row
 *   hidden:    [switch.tv_plug]
 *   customize:
 *     light.lamp: { name: Lamp, icon: mdi:lamp, toggle: false }   # toggle: false = title tap does not switch it
 *
 * Entities not listed anywhere are placed automatically: lights, switches, covers, climate, fans, media players,
 * vacuums, locks… as buttons; the first temperature and humidity sensor and window/door/motion sensors in the header.
 * Hidden and configuration/diagnostic entities are skipped. A light group containing all room lights is skipped;
 * a partial group is shown instead of its members. Entities from other areas can be added in the editor.
 */
(function () {
  'use strict';
  const VERSION = '2.0.0';

  /* ---------- texts (EN / SK) ---------- */
  const STR = {
    en: {
      need_area: 'Set the area: area: <id or name>', empty: 'No devices to show in this area.', lights_off: 'Turn lights off', target: 'target',
      area: 'Area', title: 'Title (optional)', language: 'Language', columns: 'Buttons per row (optional)', title_tap: 'Tap on title (non-collapsible card)',
      collapsible: 'Collapsible to one row', collapsed: 'Start collapsed', new_entities: 'New entities in the area',
      lang_auto: 'Automatic (HA language)', tt_none: 'nothing', tt_toggle: 'turn room lights on / off', tt_more: 'details of the first light',
      ne_auto: 'Show automatically', ne_hide: 'Keep hidden until I place them',
      entities: 'Entities', found: 'found', ent_hint: 'Drag by ⠿ within or between sections. The eye hides an entity in this card only. ⋮ = name, icon, options.',
      s_header: 'Header', s_buttons: 'Buttons', s_secondary: 'Secondary', s_hidden: 'Hidden', s_other: 'Other entities in the area',
      other_hint: 'Not shown automatically (other sensors, configuration…). Drag one into a section to show it.',
      drop: 'Drag entities here', add: 'Add entity (also from another area)', reset: 'Reset to automatic layout',
      c_name: 'Name on the card', c_icon: 'Icon', c_toggle: 'Title tap switches this light', c_section: 'Section',
      from_area: 'other area', no_area: 'no area', hide: 'Hide', show: 'Show', details: 'Options', auto: 'auto'
    },
    sk: {
      need_area: 'Zadaj oblasť: area: <id alebo názov>', empty: 'V oblasti nie sú žiadne zariadenia na zobrazenie.', lights_off: 'Zhasnúť svetlá', target: 'cieľ',
      area: 'Oblasť', title: 'Nadpis (voliteľné)', language: 'Jazyk', columns: 'Tlačidiel v riadku (voliteľné)', title_tap: 'Ťuk na nadpis (nezbaliteľná karta)',
      collapsible: 'Zbaliteľná na jeden riadok', collapsed: 'Na začiatku zbalená', new_entities: 'Nové entity v oblasti',
      lang_auto: 'Automaticky (podľa HA)', tt_none: 'nič', tt_toggle: 'zapnúť / zhasnúť svetlá izby', tt_more: 'detail prvého svetla',
      ne_auto: 'Zobraziť automaticky', ne_hide: 'Skryť, kým ich nezaradím',
      entities: 'Entity', found: 'nájdených', ent_hint: 'Potiahni za ⠿ v rámci sekcie alebo medzi sekciami. Oko skryje entitu len v tejto karte. ⋮ = názov, ikona, voľby.',
      s_header: 'Hlavička', s_buttons: 'Tlačidlá', s_secondary: 'Sekundárne', s_hidden: 'Skryté', s_other: 'Ďalšie entity v oblasti',
      other_hint: 'Automaticky sa nezobrazujú (ostatné senzory, nastavenia…). Potiahni ich do sekcie, ak ich chceš na karte.',
      drop: 'Sem potiahni entity', add: 'Pridať entitu (aj z inej oblasti)', reset: 'Vrátiť automatické rozloženie',
      c_name: 'Názov na karte', c_icon: 'Ikona', c_toggle: 'Ťuk na nadpis zapína / zhasína toto svetlo', c_section: 'Sekcia',
      from_area: 'iná oblasť', no_area: 'bez oblasti', hide: 'Skryť', show: 'Zobraziť', details: 'Voľby', auto: 'auto'
    }
  };
  function lang(hass, cfg) {
    const l = String((hass && ((hass.locale && hass.locale.language) || hass.language)) || (typeof document !== 'undefined' && document.documentElement.lang) || 'en').toLowerCase().slice(0, 2);
    return STR[l] ? l : 'en';
  }
  function T(hass, cfg) { const l = STR[lang(hass, cfg)]; return (k) => l[k] || STR.en[k] || k; }

  // which domains become buttons automatically, in this order
  const AUTO = ['light', 'switch', 'fan', 'cover', 'climate', 'water_heater', 'humidifier', 'media_player', 'vacuum', 'lawn_mower', 'lock', 'valve', 'input_boolean', 'siren'];
  const TOGGLE = { light: 1, switch: 1, fan: 1, input_boolean: 1, siren: 1, humidifier: 1, automation: 1 };
  const PRESS = { button: 'press', input_button: 'press', scene: 'turn_on', script: 'turn_on' };
  const SECTIONS = ['header', 'buttons', 'secondary', 'hidden'];
  const dom = (id) => id.split('.')[0];

  function areaId(hass, a) {
    if (!a || !hass.areas) return a;
    if (hass.areas[a]) return a;
    const low = String(a).toLowerCase(), f = Object.values(hass.areas).find((x) => (x.name || '').toLowerCase() === low);
    return f ? f.area_id : a;
  }
  function entArea(hass, id) {
    const e = hass.entities && hass.entities[id]; if (!e) return null;
    const d = e.device_id && hass.devices && hass.devices[e.device_id];
    return e.area_id || (d && d.area_id) || null;
  }
  // display name without the area / device prefix
  function entName(hass, cfg, id, aid) {
    const cu = cfg.customize && cfg.customize[id]; if (cu && cu.name) return cu.name;
    const s = hass.states[id], e = hass.entities && hass.entities[id], a = hass.areas && hass.areas[aid];
    let n = (s && s.attributes.friendly_name) || id;
    const d = e && e.device_id && hass.devices[e.device_id], dn = d && (d.name_by_user || d.name);
    [a && a.name, aid && aid.replace(/_/g, ' '), dn].forEach((p) => {
      if (p && n.toLowerCase().startsWith(p.toLowerCase() + ' ') && n.length > p.length + 1) n = n.slice(p.length + 1);
    });
    return n.charAt(0).toUpperCase() + n.slice(1);
  }

  /*
   * Resolves the card layout: explicit lists from the config first (in their order), then the automatic placement
   * of entities that are not listed anywhere. Returns the sections plus "other" (area entities not shown automatically).
   */
  function resolve(hass, cfg) {
    const aid = areaId(hass, cfg.area), h = hass;
    const attr = (id, k) => (h.states[id] && h.states[id].attributes || {})[k];
    const isGrp = (id) => dom(id) === 'light' && (attr(id, 'entity_id') || []).length > 0;
    // explicit lists (order: = older name of buttons)
    const L = { header: [].concat(cfg.header || []), buttons: [].concat(cfg.order || [], cfg.buttons || []), secondary: [].concat(cfg.secondary || []), hidden: [].concat(cfg.hidden || []) };
    const seen = {}; SECTIONS.forEach((k) => { L[k] = L[k].filter((id) => { if (!h.states[id] || seen[id]) return false; seen[id] = k; return true; }); });
    // entities of the area
    const ids = [];
    for (const id in h.entities) {
      const e = h.entities[id]; if (!h.states[id]) continue;
      if (entArea(h, id) !== aid) continue;
      if ((e.hidden || e.hidden_by || e.entity_category) && !seen[id]) continue;
      ids.push(id);
    }
    // light groups: a group with all room lights is skipped, a partial group replaces its members
    const plain = ids.filter((id) => dom(id) === 'light' && !isGrp(id)), memberOf = {}, roomG = {};
    ids.filter(isGrp).forEach((g) => {
      const mem = attr(g, 'entity_id') || [];
      if (plain.length && plain.every((x) => mem.includes(x))) { roomG[g] = 1; return; }
      mem.forEach((m) => { memberOf[m] = 1; });
    });
    const auto = { header: [], buttons: [], other: [] };
    let temp = null, hum = null; const binH = [];
    ids.forEach((id) => {
      if (seen[id]) return;
      const d = dom(id), dc = attr(id, 'device_class') || '';
      if (roomG[id] || memberOf[id]) { auto.other.push(id); return; }
      if (AUTO.includes(d)) { auto.buttons.push(id); return; }
      if (d === 'sensor' && dc === 'temperature' && !temp) { temp = id; return; }
      if (d === 'sensor' && dc === 'humidity' && !hum) { hum = id; return; }
      if (d === 'binary_sensor' && /window|door|opening|garage_door|motion|occupancy|presence/.test(dc)) { binH.push(id); return; }
      auto.other.push(id);
    });
    auto.header = [temp, hum].filter(Boolean).concat(binH);
    const ord = (id) => AUTO.indexOf(dom(id));
    auto.buttons.sort((a, b) => ord(a) - ord(b) || entName(h, cfg, a, aid).localeCompare(entName(h, cfg, b, aid)));
    const hideNew = cfg.new_entities === 'hide';
    const r = {
      aid,
      header: L.header.concat(hideNew ? [] : auto.header),
      buttons: L.buttons.concat(hideNew ? [] : auto.buttons),
      secondary: L.secondary,
      hidden: L.hidden.concat(hideNew ? auto.header.concat(auto.buttons) : []),
      other: auto.other.filter((id) => !seen[id])
    };
    r.autoHidden = {}; (hideNew ? auto.header.concat(auto.buttons) : []).forEach((id) => { r.autoHidden[id] = 1; });
    // lights switched by a title tap: lights of this area in buttons / secondary, unless customize.toggle is false
    r.lights = r.buttons.concat(r.secondary).filter((id) => dom(id) === 'light' && entArea(h, id) === aid && !(cfg.customize && cfg.customize[id] && cfg.customize[id].toggle === false));
    r.count = new Set(r.header.concat(r.buttons, r.secondary, r.hidden, r.other)).size;
    return r;
  }

  class IgyRoomCard extends HTMLElement {
    static getConfigElement() { return document.createElement('igy-room-card-editor'); }
    static getStubConfig(hass) {
      const a = hass && hass.areas ? Object.keys(hass.areas)[0] : '';
      return { area: a || '' };
    }
    setConfig(c) {
      if (!c || !c.area) throw new Error(STR[lang(this._hass, c)].need_area);
      this._cfg = Object.assign({ title_tap: 'none' }, c);
      this._sig = ''; this._col = null;
      if (this._hass) this._render();
    }
    set hass(h) { this._hass = h; this._render(); }
    getCardSize() { return 3; }
    getGridOptions() { return { columns: 12, min_columns: 6 }; }
    _t(k) { return T(this._hass, this._cfg)(k); }

    _collect() {
      const r = resolve(this._hass, this._cfg);
      const climH = r.header.find((id) => dom(id) === 'climate' || dom(id) === 'water_heater');
      return { aid: r.aid, hdr: r.header, hclim: climH, btn: r.buttons.concat(r.secondary), prim: r.buttons, sec: r.secondary, lights: r.lights };
    }
    _lsKey() { return 'arc-col:' + this._cfg.area; }
    _lsGet() { try { const v = localStorage.getItem(this._lsKey()); return v == null ? this._cfg.collapsed !== false : v === '1'; } catch (_) { return this._cfg.collapsed !== false; } }
    _lsSet(v) { try { localStorage.setItem(this._lsKey(), v ? '1' : '0'); } catch (_) { } }
    _name(id, aid) { return entName(this._hass, this._cfg, id, aid); }

    /* ---------- stav a farby ---------- */
    _active(id) {
      const s = this._hass.states[id]; if (!s) return false;
      const d = id.split('.')[0], v = s.state;
      if (d === 'climate') return s.attributes.hvac_action === 'heating' || s.attributes.hvac_action === 'cooling';
      if (d === 'cover' || d === 'valve') return v === 'open' || v === 'opening' || v === 'closing';
      if (d === 'media_player') return v === 'playing';
      if (d === 'vacuum' || d === 'lawn_mower') return v === 'cleaning' || v === 'mowing' || v === 'returning';
      if (d === 'lock') return v === 'unlocked';
      return v === 'on';
    }
    _color(id) {
      const s = this._hass.states[id], d = id.split('.')[0];
      if (d === 'light') {
        const rgb = s.attributes.rgb_color;
        return rgb ? `rgb(${rgb.join(',')})` : 'var(--state-light-active-color, #ffc107)';
      }
      if (d === 'climate') return s.attributes.hvac_action === 'cooling' ? 'var(--state-climate-cool-color, #2b9af9)' : 'var(--state-climate-heat-color, #ff8100)';
      if (d === 'cover' || d === 'valve') return 'var(--state-cover-active-color, #8ab4f8)';
      if (d === 'lock') return 'var(--state-lock-unlocked-color, #f44336)';
      if (d === 'media_player' || d === 'vacuum') return 'var(--state-media_player-active-color, #4fc3f7)';
      return 'var(--state-switch-active-color, var(--state-active-color, #ffc107))';
    }
    // termostat / ohrievač / senzor: namiesto ikony číslo (rovnaká výška – karta sa nezväčší)
    _val(id) {
      const s = this._hass.states[id]; if (!s) return '';
      const d = id.split('.')[0], a = s.attributes, lang = this._hass.locale && this._hass.locale.language || undefined;
      const f = (v) => (+v).toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      if ((d === 'climate' || d === 'water_heater') && a.current_temperature != null) return f(a.current_temperature) + '°';
      if (d === 'sensor') { const v = parseFloat(s.state); if (!isNaN(v)) { const u = a.unit_of_measurement || ''; return (u === '°C' || u === '°F' ? f(v) + '°' : (Math.abs(v) < 100 ? f(v) : Math.round(v).toLocaleString(lang)) + (u && u.length <= 2 && u !== '°C' ? '<small>' + esc(u) + '</small>' : '')); } }
      return '';
    }
    _hItem(id) {
      const h = this._hass, d = id.split('.')[0], s = h.states[id];
      if (d === 'climate' || d === 'water_heater') return this._hclim(id);
      if (d === 'sensor' || d === 'input_number' || d === 'number') return `<span class="iv" data-id="${id}">${esc(this._infoText(id))}</span>`;
      const act = d === 'binary_sensor' ? s.state === 'on' : this._active(id);
      return `<ha-state-icon data-id="${id}" class="${act ? 'on' : ''}"></ha-state-icon>`;
    }
    // termostat v hlavičke: aktuálna teplota (farebne pri kúrení) + malá cieľová, ťuk = ovládanie
    _hclim(id) {
      const s = this._hass.states[id]; if (!s) return '';
      const a = s.attributes, lang = this._hass.locale && this._hass.locale.language || undefined;
      const f = (v) => (+v).toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      const heat = a.hvac_action === 'heating', cool = a.hvac_action === 'cooling', off = s.state === 'off';
      return `<span class="iv hc ${heat ? 'heat' : cool ? 'cool' : ''} ${off ? 'off' : ''}" data-id="${id}">${a.current_temperature != null ? f(a.current_temperature) + ' °C' : '–'}` +
        `</span>`;
    }
    _btn(id, aid) {
      const h = this._hass, s = h.states[id], na = !s || s.state === 'unavailable', v = this._val(id);
      const tgt = s && s.attributes.temperature != null && s.state !== 'off' && /^(climate|water_heater)\./.test(id) ? ' → ' + s.attributes.temperature + '°' : '';
      return `<div class="b ${this._active(id) ? 'on' : ''} ${na ? 'na' : ''}" data-b="${id}" style="--c:${this._color(id)}"${tgt ? ` title="${esc(this._t('target'))}${esc(tgt)}"` : ''}>
        <div class="n">${esc(this._name(id, aid))}</div>${v ? `<div class="num">${v}</div>` : `<ha-state-icon data-icon="${id}"></ha-state-icon>`}</div>`;
    }
    _infoText(id) {
      const s = this._hass.states[id]; if (!s) return '';
      const v = parseFloat(s.state), u = s.attributes.unit_of_measurement || '';
      if (isNaN(v)) return this._hass.formatEntityState ? this._hass.formatEntityState(s) : s.state;
      const dc = s.attributes.device_class;
      return v.toLocaleString(this._hass.locale && this._hass.locale.language || undefined, { maximumFractionDigits: dc === 'humidity' ? 0 : 1, minimumFractionDigits: dc === 'humidity' ? 0 : 1 }) + (u ? (u === '%' ? ' %' : ' ' + u) : '');
    }

    /* ---------- akcie ---------- */
    _more(id) { this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: id }, bubbles: true, composed: true })); }
    _tap(id) {
      const h = this._hass, d = id.split('.')[0];
      if (TOGGLE[d]) h.callService(d === 'light' || d === 'switch' || d === 'fan' || d === 'input_boolean' ? d : 'homeassistant', 'toggle', { entity_id: id });
      else if (PRESS[d]) h.callService(d, PRESS[d], { entity_id: id });
      else if (d === 'lock') h.callService('lock', h.states[id].state === 'locked' ? 'unlock' : 'lock', { entity_id: id });
      else this._more(id);
      if (navigator.vibrate) navigator.vibrate(8);
    }
    _titleTap(c) {
      const t = this._cfg.title_tap;
      if (t === 'toggle' && c.lights.length) {
        const anyOn = c.lights.some((x) => this._hass.states[x].state === 'on');
        this._hass.callService('light', anyOn ? 'turn_off' : 'turn_on', { entity_id: anyOn ? c.lights.filter((x) => this._hass.states[x].state === 'on') : c.lights });
      } else if (t === 'more-info' && c.lights.length) this._more(c.lights[0]);
    }

    /* ---------- vykreslenie ---------- */
    _render() {
      if (!this._hass || !this._cfg) return;
      const h = this._hass;
      if (!h.entities || !h.areas) return;
      const c = this._collect();
      // podpis – prekresli len pri zmene stavu entít karty
      const sig = [c.aid, this._cfg.title, this._cfg.columns, JSON.stringify([this._cfg.order, this._cfg.buttons, this._cfg.secondary, this._cfg.header, this._cfg.hidden, this._cfg.customize, this._cfg.new_entities]), c.sec.length].concat(c.hdr, c.btn).map((id) => {
        const s = h.states[id], a = s ? s.attributes : {}; const e = h.entities[id] || {}; return id + ':' + (a.friendly_name || '') + (e.name || '') + (e.icon || '') + (a.icon || '') + ':' + (s ? s.state + (a.hvac_action || '') + (a.rgb_color || '') + '/' + a.current_temperature + '/' + a.temperature + '/' + a.current_position + '/' + a.brightness : '');
      }).join('|');
      if (sig === this._sig) return;
      this._sig = sig;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const a = h.areas[c.aid], title = this._cfg.title || (a ? a.name : this._cfg.area);
      const cols = this._cfg.columns ? `repeat(${this._cfg.columns}, minmax(0, 1fr))` : 'repeat(auto-fill, minmax(58px, 1fr))';
      // ha-card sa vytvorí len raz – inak by téma / card-mod (priehľadnosť, rozmazanie) po prekreslení zmizla
      if (!this._card) {
        this.shadowRoot.innerHTML = `<style id="st"></style><ha-card><div id="c"></div></ha-card>`;
        this._card = this.shadowRoot.querySelector('ha-card');
      }
      const css = `
          ha-card { padding: 16px 16px 12px; box-sizing: border-box; }
          .top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; min-height: 40px; }
          .title { font-size: 26px; font-weight: 400; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--primary-text-color); cursor: ${this._cfg.title_tap !== 'none' ? 'pointer' : 'default'}; }
          .title small { display: block; font-size: 12px; color: var(--secondary-text-color); margin-top: 1px; }
          .info { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--primary-text-color); flex: none; }
          .info .iv { cursor: pointer; white-space: nowrap; }
          .info .hc { padding: 3px 9px; border-radius: 99px; background: rgba(127,127,127,.15); transition: background .3s, color .3s; }
          .info .hc small { font-size: 11px; opacity: .7; margin-left: 5px; }
          .info .hc.heat { color: #fff; background: var(--state-climate-heat-color, #ff8100); box-shadow: 0 0 12px rgba(255,129,0,.45); }
          .info .hc.cool { color: #fff; background: var(--state-climate-cool-color, #2b9af9); box-shadow: 0 0 12px rgba(43,154,249,.45); }
          .info .hc.heat small, .info .hc.cool small { opacity: .9; }
          .info .hc.off { opacity: .6; }
          .info ha-state-icon { --mdc-icon-size: 20px; color: var(--primary-text-color); opacity: .78; cursor: pointer; }
          .info ha-state-icon.on { opacity: 1; color: var(--state-binary_sensor-active-color, var(--state-active-color, #ffc107)); }
          .grid { display: grid; grid-template-columns: ${cols}; gap: 6px 4px; }
          /* zbaliteľná karta */
          ha-card { transition: padding .25s; }
          .top.tap { cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
          .top.tap .title { cursor: pointer; }
          .title { transition: font-size .25s; }
          .chev { --mdc-icon-size: 20px; color: var(--secondary-text-color); transition: transform .3s; flex: none; margin-left: -4px; }
          ha-card.col .chev { transform: rotate(-90deg); }
          ha-card.col { padding: 10px 16px; }
          ha-card.col .top { margin-bottom: 0; }
          ha-card.col .title { font-size: 22px; }
          ha-card.col .grid { display: none; }
          .lc { display: none; align-items: center; gap: 3px; font-size: 14px; cursor: pointer; color: var(--state-light-active-color, #ffc107); white-space: nowrap; }
          .lc ha-icon { --mdc-icon-size: 20px; filter: drop-shadow(0 0 6px var(--state-light-active-color, #ffc107)); }
          ha-card.col .lc { display: inline-flex; }
          .b { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 6px 2px 6px; border-radius: 12px; cursor: pointer;
               user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; transition: background .15s; min-width: 0; }
          .b:active { background: rgba(127,127,127,.18); }
          .b .n { font-size: 11px; line-height: 1.2; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
          .b ha-state-icon { --mdc-icon-size: 25px; color: var(--primary-text-color); opacity: .78; transition: color .3s, filter .3s; }
          .b.on ha-state-icon { color: var(--c); opacity: 1; filter: drop-shadow(0 0 6px var(--c)); }
          .b.na { opacity: .4; }
          .empty { color: var(--secondary-text-color); font-size: 13px; }
          .b .num { height: 25px; line-height: 25px; font-size: 17px; font-weight: 400; color: var(--primary-text-color); opacity: .85; font-variant-numeric: tabular-nums; white-space: nowrap; letter-spacing: -.02em; }
          .b .num small { font-size: 11px; opacity: .7; margin-left: 1px; }
          .b.on .num { color: var(--c); opacity: 1; text-shadow: 0 0 8px var(--c); }
          .grid.sec .b .num { height: 20px; line-height: 20px; font-size: 14px; }
          .grid.sec { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--divider-color, rgba(127,127,127,.2)); }
          .grid.sec .b { padding: 5px 2px 4px; gap: 4px; }
          .grid.sec .b ha-state-icon { --mdc-icon-size: 20px; opacity: .65; }
          .grid.sec .b.on ha-state-icon { opacity: 1; }
          .grid.sec .b .n { font-size: 10px; color: var(--secondary-text-color); }
        `;
      const st = this.shadowRoot.getElementById('st'); if (st.textContent !== css) st.textContent = css;
      const coll = !!this._cfg.collapsible, lightsOn = c.lights.filter((x) => h.states[x] && h.states[x].state === 'on').length;
      if (coll) { if (this._col == null) this._col = this._lsGet(); } else this._col = false;
      this._card.classList.toggle('col', !!this._col);
      this.shadowRoot.getElementById('c').innerHTML = `
          <div class="top ${coll ? 'tap' : ''}" id="top">
            <div class="title" id="t">${esc(title)}</div>
            <div class="info">
              ${coll && lightsOn ? `<span class="lc" id="lc" title="${esc(this._t('lights_off'))}"><ha-icon icon="mdi:lightbulb-on"></ha-icon>${lightsOn}</span>` : ''}
              ${c.hdr.map((id) => this._hItem(id)).join('')}
            </div>
            ${coll ? '<ha-icon class="chev" icon="mdi:chevron-down"></ha-icon>' : ''}
          </div>
          <div class="grid">${c.prim.map((id) => this._btn(id, c.aid)).join('') || (c.sec.length ? '' : '<div class="empty">' + esc(this._t('empty')) + '</div>')}</div>
          ${c.sec.length ? `<div class="grid sec">${c.sec.map((id) => this._btn(id, c.aid)).join('')}</div>` : ''}
        `;
      // ikony podľa HA (vlastná ikona entity, stav, device_class)
      this.shadowRoot.querySelectorAll('ha-state-icon').forEach((el) => {
        const id = el.getAttribute('data-icon') || el.getAttribute('data-id');
        el.hass = h; el.stateObj = h.states[id];
        const cu = this._cfg.customize && this._cfg.customize[id]; if (cu && cu.icon) el.icon = cu.icon;
      });
      this._bind(c);
    }
    _bind(c) {
      const root = this.shadowRoot;
      if (this._cfg.collapsible) {
        root.getElementById('top').onclick = (e) => {
          if (e.target.closest('.info [data-id], #lc')) return;
          this._col = !this._col; this._card.classList.toggle('col', this._col); this._lsSet(this._col);
          this.dispatchEvent(new Event('iron-resize', { bubbles: true, composed: true }));
        };
        const lc = root.getElementById('lc');
        if (lc) lc.onclick = (e) => { e.stopPropagation(); this._hass.callService('light', 'turn_off', { entity_id: c.lights.filter((x) => this._hass.states[x].state === 'on') }); };
      } else root.getElementById('t').onclick = () => this._titleTap(c);
      root.querySelectorAll('.info [data-id]').forEach((el) => { el.onclick = () => this._more(el.getAttribute('data-id')); });
      root.querySelectorAll('.b').forEach((el) => {
        const id = el.getAttribute('data-b');
        let t = null, held = false, sx = 0, sy = 0;
        el.addEventListener('pointerdown', (e) => { held = false; sx = e.clientX; sy = e.clientY; clearTimeout(t); t = setTimeout(() => { held = true; if (navigator.vibrate) navigator.vibrate(12); this._more(id); }, 500); });
        el.addEventListener('pointermove', (e) => { if (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10) clearTimeout(t); });
        el.addEventListener('pointerup', () => { clearTimeout(t); if (!held) this._tap(id); });
        el.addEventListener('pointercancel', () => clearTimeout(t));
        el.addEventListener('contextmenu', (e) => e.preventDefault());
      });
    }
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  /* ================= Editor ================= */
  const P = {
    eye: 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z',
    eyeOff: 'M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z',
    dots: 'M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z',
    plus: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'
  };
  const svg = (p) => `<svg viewBox="0 0 24 24"><path fill="currentColor" d="${p}"/></svg>`;
  const EDCSS = `
    .ed { display: flex; flex-direction: column; gap: 6px; }
    .ed h4 { margin: 14px 0 2px; font-size: 14px; font-weight: 500; color: var(--primary-text-color); display: flex; align-items: center; gap: 8px; }
    .ed h4 span { margin-left: auto; font-size: 12px; font-weight: 400; color: var(--secondary-text-color); }
    .ed .hint { font-size: 12px; color: var(--secondary-text-color); line-height: 1.4; }
    .zone { border: 1px dashed var(--divider-color, rgba(127,127,127,.35)); border-radius: 10px; padding: 2px 6px; min-height: 36px; position: relative; }
    .zone.over { border-color: var(--primary-color, #03a9f4); background: rgba(3,169,244,.05); }
    .zone .ph { font-size: 12px; color: var(--secondary-text-color); padding: 10px 4px; text-align: center; }
    .row { display: flex; align-items: center; gap: 6px; padding: 4px 0; border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.2)); background: var(--card-background-color, #fff); }
    .row:last-of-type { border-bottom: 0; }
    .row .hd { width: 24px; height: 32px; display: grid; place-items: center; cursor: grab; touch-action: none; color: var(--secondary-text-color); font-size: 18px; user-select: none; flex: none; }
    .row .ic { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: rgba(127,127,127,.12); flex: none; color: var(--primary-text-color); }
    .row .ic ha-state-icon { --mdc-icon-size: 18px; }
    .row .nm { flex: 1; min-width: 0; font-size: 14px; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row .nm small { display: block; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row .nm small i { font-style: normal; color: var(--warning-color, #ff9800); }
    .row button { width: 32px; height: 32px; border-radius: 8px; border: 0; background: none; color: var(--secondary-text-color); cursor: pointer; display: grid; place-items: center; flex: none; padding: 0; }
    .row button:hover { background: rgba(127,127,127,.15); }
    .row button svg { width: 20px; height: 20px; }
    .row.off .nm { opacity: .55; }
    .row.drag { position: relative; z-index: 5; box-shadow: 0 6px 18px rgba(0,0,0,.25); border-radius: 8px; }
    .ins { position: absolute; left: 4px; right: 4px; height: 2px; border-radius: 2px; background: var(--primary-color, #03a9f4); pointer-events: none; z-index: 4; }
    .det { margin: 2px 0 8px 54px; padding: 8px 10px; border-radius: 8px; background: rgba(127,127,127,.08); }
    details.oth > summary { cursor: pointer; font-size: 14px; font-weight: 500; color: var(--primary-text-color); margin: 14px 0 4px; }
    details.oth > summary span { font-weight: 400; color: var(--secondary-text-color); font-size: 12px; margin-left: 6px; }
    .btns { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
    .lnk { background: none; border: 1px solid var(--divider-color, rgba(127,127,127,.35)); border-radius: 8px; padding: 6px 12px; font: inherit; font-size: 13px; color: var(--primary-text-color); cursor: pointer; }
  `;

  class IgyRoomCardEditor extends HTMLElement {
    setConfig(c) {
      const n = JSON.parse(JSON.stringify(c || {}));
      const sig = JSON.stringify(n); if (sig === this._last) return;
      this._cfg = n; this._last = sig;
      if (this._hass) this._build();
    }
    set hass(h) {
      const first = !this._hass; this._hass = h;
      if (first && this._cfg) this._build();
      this.querySelectorAll('ha-form').forEach((f) => { f.hass = h; });
      this.querySelectorAll('ha-state-icon').forEach((el) => { el.hass = h; });
    }
    get _t() { return T(this._hass, this._cfg); }
    _emit() {
      const c = JSON.parse(JSON.stringify(Object.assign({ type: 'custom:igy-room-card' }, this._cfg)));
      this._last = JSON.stringify(c);
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: c }, bubbles: true, composed: true }));
    }
    _form(data, schema, labels, cb) {
      const f = document.createElement('ha-form');
      f.hass = this._hass; f.data = data; f.schema = schema; f.computeLabel = (s) => labels[s.name] || s.name;
      f.addEventListener('value-changed', (e) => { e.stopPropagation(); try { cb(Object.assign({}, e.detail.value)); } catch (err) { console.error('igy-room-card editor:', err); } });
      return f;
    }
    _build() {
      if (!this._hass || !this._cfg) return;
      const t = this._t, c = this._cfg;
      this.innerHTML = `<style>${EDCSS}</style><div class="ed"><div id="top"></div><div id="ents"></div></div>`;
      const opt = (v, l) => ({ value: v, label: l });
      const data = { area: c.area || '', title: c.title || '', columns: c.columns || '', title_tap: c.title_tap || 'none',
        collapsible: !!c.collapsible, collapsed: c.collapsed !== false, new_entities: c.new_entities || 'auto' };
      this._top = this._form(data, [
        { name: 'area', required: true, selector: { area: {} } },
        { name: 'title', selector: { text: {} } },
        { name: 'columns', selector: { number: { min: 3, max: 10, mode: 'box' } } },
        { name: 'title_tap', selector: { select: { mode: 'dropdown', options: [opt('none', t('tt_none')), opt('toggle', t('tt_toggle')), opt('more-info', t('tt_more'))] } } },
        { type: 'grid', name: '', schema: [{ name: 'collapsible', selector: { boolean: {} } }, { name: 'collapsed', selector: { boolean: {} } }] },
        { name: 'new_entities', selector: { select: { mode: 'box', options: [opt('auto', t('ne_auto')), opt('hide', t('ne_hide'))] } } }
      ], { area: t('area'), title: t('title'), columns: t('columns'), title_tap: t('title_tap'), collapsible: t('collapsible'), collapsed: t('collapsed'), new_entities: t('new_entities') },
      (v) => {
        ['area', 'title', 'columns'].forEach((k) => { if (v[k] === undefined || v[k] === '' || v[k] === null) delete c[k]; else c[k] = v[k]; });
        delete c.language;
        if (v.title_tap && v.title_tap !== 'none') c.title_tap = v.title_tap; else delete c.title_tap;
        if (v.collapsible) c.collapsible = true; else delete c.collapsible;
        if (v.collapsed === false) c.collapsed = false; else delete c.collapsed;
        if (v.new_entities === 'hide') c.new_entities = 'hide'; else delete c.new_entities;
        this._emit(); this._lists();
      });
      this.querySelector('#top').appendChild(this._top);
      this._lists();
    }

    /* ---------- zoznam entít ---------- */
    _lists() {
      const box = this.querySelector('#ents'); if (!box) return;
      const t = this._t, c = this._cfg, h = this._hass;
      if (!c.area || !h.entities) { box.innerHTML = ''; return; }
      const r = this._r = resolve(h, c), open = this._open || (this._open = new Set());
      const row = (id, sec) => {
        const s = h.states[id], ea = entArea(h, id), area = ea && h.areas[ea];
        const other = ea !== r.aid ? ` · <i>${esc(t('from_area'))}: ${esc(area ? area.name : t('no_area'))}</i>` : '';
        const hidden = sec === 'hidden' || sec === 'other';
        return `<div class="row${hidden ? ' off' : ''}" data-id="${esc(id)}" data-sec="${sec}">
          <div class="hd" title="⠿">⠿</div><div class="ic"><ha-state-icon data-si="${esc(id)}"></ha-state-icon></div>
          <div class="nm">${esc(entName(h, c, id, r.aid))}<small>${esc(id)}${other}</small></div>
          <button data-a="eye" title="${esc(hidden ? t('show') : t('hide'))}">${svg(hidden ? P.eyeOff : P.eye)}</button>
          <button data-a="det" title="${esc(t('details'))}">${svg(P.dots)}</button></div>${open.has(id) ? `<div class="det" data-det="${esc(id)}"></div>` : ''}`;
      };
      const zone = (k) => `<h4>${esc(t('s_' + k))}<span>${r[k].length || ''}</span></h4><div class="zone" data-zone="${k}">${r[k].map((id) => row(id, k)).join('') || `<div class="ph">${esc(t('drop'))}</div>`}</div>`;
      const otherOpen = this._otherOpen ? ' open' : '';
      box.innerHTML = `<h4 style="margin-top:18px">${esc(t('entities'))}<span>${r.count} ${esc(t('found'))}</span></h4><div class="hint">${esc(t('ent_hint'))}</div>`
        + SECTIONS.map(zone).join('')
        + (r.other.length ? `<details class="oth"${otherOpen}><summary>${esc(t('s_other'))}<span>${r.other.length}</span></summary><div class="hint">${esc(t('other_hint'))}</div><div class="zone" data-zone="other">${r.other.map((id) => row(id, 'other')).join('')}</div></details>` : '')
        + '<div id="add"></div><div class="btns"><button class="lnk" id="reset"></button></div>';
      box.querySelector('#reset').textContent = t('reset');
      box.querySelector('#reset').onclick = () => { ['header', 'buttons', 'secondary', 'hidden', 'order'].forEach((k) => delete c[k]); this._emit(); this._lists(); };
      const det = box.querySelector('details.oth'); if (det) det.addEventListener('toggle', () => { this._otherOpen = det.open; });
      box.querySelectorAll('ha-state-icon').forEach((el) => {
        const id = el.getAttribute('data-si'); el.hass = h; el.stateObj = h.states[id];
        const cu = c.customize && c.customize[id]; if (cu && cu.icon) el.icon = cu.icon;
      });
      box.querySelectorAll('.row').forEach((el) => {
        const id = el.getAttribute('data-id'), sec = el.getAttribute('data-sec');
        el.querySelector('[data-a="eye"]').onclick = () => {
          if (sec === 'hidden' || sec === 'other') this._move(id, /^(sensor|binary_sensor)\./.test(id) ? 'header' : 'buttons');
          else this._move(id, 'hidden');
        };
        el.querySelector('[data-a="det"]').onclick = () => { if (open.has(id)) open.delete(id); else open.add(id); this._lists(); };
        this._dragBind(el.querySelector('.hd'), el, id);
      });
      box.querySelectorAll('[data-det]').forEach((d) => this._details(d, d.getAttribute('data-det')));
      // pridať entitu (aj z inej oblasti)
      const add = this._form({}, [{ name: 'add', selector: { entity: {} } }], { add: t('add') }, (v) => {
        if (!v.add) return; this._move(v.add, /^(sensor|binary_sensor)\./.test(v.add) ? 'header' : 'buttons');
      });
      box.querySelector('#add').appendChild(add);
    }
    // voľby jednej entity: sekcia, názov, ikona, či ju zapína ťuk na nadpis
    _details(el, id) {
      const t = this._t, c = this._cfg, cu = (c.customize && c.customize[id]) || {}, sec = this._secOf(id);
      const opts = SECTIONS.map((k) => ({ value: k, label: t('s_' + k) }));
      const schema = [{ name: 'section', selector: { select: { mode: 'dropdown', options: opts } } }, { name: 'name', selector: { text: {} } }, { name: 'icon', selector: { icon: {} } }];
      if (dom(id) === 'light') schema.push({ name: 'toggle', selector: { boolean: {} } });
      el.appendChild(this._form({ section: sec === 'other' ? 'hidden' : sec, name: cu.name || '', icon: cu.icon || '', toggle: cu.toggle !== false }, schema,
        { section: t('c_section'), name: t('c_name'), icon: t('c_icon'), toggle: t('c_toggle') }, (v) => {
          const n = {}; if (v.name) n.name = v.name; if (v.icon) n.icon = v.icon; if (v.toggle === false && dom(id) === 'light') n.toggle = false;
          const all = Object.assign({}, c.customize || {}); if (Object.keys(n).length) all[id] = n; else delete all[id];
          if (Object.keys(all).length) c.customize = all; else delete c.customize;
          if (v.section && v.section !== this._secOf(id) && !(v.section === 'hidden' && this._secOf(id) === 'other')) { this._move(id, v.section); return; }
          this._emit();
          // obnov názov / ikonu v riadku bez prekreslenia formulára (inak by sa stratilo zameranie poľa)
          const row = this.querySelector(`.row[data-id="${CSS.escape(id)}"]`);
          if (row) { row.querySelector('.nm').firstChild.textContent = entName(this._hass, c, id, this._r.aid); const si = row.querySelector('ha-state-icon'); if (si) si.icon = n.icon || undefined; }
        }));
    }
    _secOf(id) { const r = this._r; return ['header', 'buttons', 'secondary', 'hidden', 'other'].find((k) => r[k].includes(id)) || 'other'; }
    // presun entity do sekcie (na pozíciu idx); aktuálne rozloženie sa uloží do konfigurácie
    _move(id, to, idx) {
      const c = this._cfg, r = resolve(this._hass, c), L = {};
      SECTIONS.forEach((k) => { L[k] = r[k].filter((x) => x !== id); });
      const list = L[to]; list.splice(idx == null ? list.length : Math.max(0, Math.min(list.length, idx)), 0, id);
      delete c.order;
      SECTIONS.forEach((k) => {
        // automaticky skryté (nové entity skryté) netreba zapisovať
        let v = L[k];
        if (k === 'hidden') v = v.filter((x) => !r.autoHidden[x] || x === id);
        if (v.length) c[k] = v; else delete c[k];
      });
      this._emit(); this._lists();
    }
    // ťahanie za ⠿: v rámci sekcie aj medzi sekciami
    _dragBind(hd, row, id) {
      hd.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        const zones = [...this.querySelectorAll('.zone')].filter((z) => z.getAttribute('data-zone') !== 'other');
        const y0 = ev.clientY, ins = document.createElement('div'); ins.className = 'ins';
        let target = null;
        row.classList.add('drag'); hd.setPointerCapture(ev.pointerId);
        const move = (e) => {
          row.style.transform = `translateY(${e.clientY - y0}px)`;
          let z = zones.find((x) => { const b = x.getBoundingClientRect(); return e.clientY >= b.top - 6 && e.clientY <= b.bottom + 6; });
          if (!z) { // najbližšia sekcia
            let best = 1e9; zones.forEach((x) => { const b = x.getBoundingClientRect(), d = Math.min(Math.abs(e.clientY - b.top), Math.abs(e.clientY - b.bottom)); if (d < best) { best = d; z = x; } });
          }
          zones.forEach((x) => x.classList.toggle('over', x === z));
          const rows = [...z.querySelectorAll('.row')].filter((x) => x !== row);
          let i = rows.findIndex((x) => { const b = x.getBoundingClientRect(); return e.clientY < b.top + b.height / 2; });
          if (i < 0) i = rows.length;
          target = { zone: z.getAttribute('data-zone'), idx: i };
          const zb = z.getBoundingClientRect(), ref = rows[i] || rows[rows.length - 1];
          const y = rows.length ? (rows[i] ? rows[i].getBoundingClientRect().top : ref.getBoundingClientRect().bottom) : zb.top + zb.height / 2;
          if (ins.parentNode !== z) z.appendChild(ins);
          ins.style.top = (y - zb.top - 1) + 'px';
        };
        const up = () => {
          hd.removeEventListener('pointermove', move); hd.removeEventListener('pointerup', up); hd.removeEventListener('pointercancel', up);
          row.classList.remove('drag'); row.style.transform = ''; ins.remove(); zones.forEach((x) => x.classList.remove('over'));
          if (target) this._move(id, target.zone, target.idx);
        };
        hd.addEventListener('pointermove', move); hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
      });
    }
  }

  if (!customElements.get('igy-room-card-editor')) customElements.define('igy-room-card-editor', IgyRoomCardEditor);
  if (!customElements.get('igy-room-card')) customElements.define('igy-room-card', IgyRoomCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-room-card'))
    window.customCards.push({ type: 'igy-room-card', name: 'Igy Room Card', description: 'Room card – entities come from an area; reorder, hide and rename them in the editor. / Karta izby – entity z oblasti, poradie a skrývanie v editore.', preview: true });
  console.info('%c IGY-ROOM-CARD %c ' + VERSION + ' ', 'background:#0a84ff;color:#fff;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();
