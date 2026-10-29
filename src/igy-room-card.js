/*
 * Igy Room Card – karta izby pre Home Assistant, entity sa berú z oblasti (Area), nič sa nevpisuje ručne.
 *
 *   type: custom:igy-room-card
 *   area: bedroom            # id alebo názov oblasti
 *   title: Spálňa            # voliteľné, inak názov oblasti
 *   columns: 7               # voliteľné, počet tlačidiel v riadku (predvolene automaticky)
 *   title_tap: toggle        # voliteľné: ťuk na nadpis zapne/zhasne svetlá izby (predvolene nič)
 *   collapsible: true        # voliteľné: karta sa dá zbaliť na jeden riadok (ťuk na hlavičku)
 *   collapsed: true          # voliteľné: na začiatku zbalená (potom si pamätá stav na zariadení)
 *
 * Štítky (Nastavenia → Štítky), platia na entite aj na celom zariadení (entita má prednosť):
 *   Karta izby  – vždy ako tlačidlo (aj tlačidlá, scény, konfiguračné entity, senzory…)
 *   Hlavička    – senzor hore vedľa názvu
 *   Ostatné     – na karte sa nezobrazí
 *   Skryť       – na karte sa nezobrazí
 *   Mimo izby   – svetlo sa zobrazí, ale ťuk na nadpis ho nezapína/nezhasína
 * Automaticky: svetlá, vypínače, žalúzie, termostaty, ventilátory, prehrávače, vysávače, zámky…;
 * v hlavičke prvá teplota, vlhkosť a okná/dvere/pohyb. Konfiguračné a skryté entity sa vynechajú.
 * Skupina svetiel so všetkými svetlami izby sa vynechá; čiastočná skupina sa ukáže namiesto svojich členov.
 */
(function () {
  'use strict';
  const VERSION = '1.5.0';

  const LBL_ALL = /^(skryt|hide|karta_izby|zobrazit|na_kartu|show|ostatne|other|hlavicka|header|mimo_izby|mimo|exclude|sekundarne|secondary)/;
  const LBL_SEC = /^(sekundarne|secondary)/;
  const LBL_CARD = /^(karta_izby|zobrazit|na_kartu|show)/, LBL_HEAD = /^(hlavicka|header)/,
    LBL_OUT = /^(ostatne|other|skryt|hide)/, LBL_NOALL = /^(mimo_izby|mimo|exclude)/;
  // poradie a ktoré domény sa berú automaticky
  const AUTO = ['light', 'switch', 'fan', 'cover', 'climate', 'water_heater', 'humidifier', 'media_player', 'vacuum', 'lawn_mower', 'lock', 'valve', 'input_boolean', 'siren'];
  const TOGGLE = { light: 1, switch: 1, fan: 1, input_boolean: 1, siren: 1, humidifier: 1, automation: 1 };
  const PRESS = { button: 'press', input_button: 'press', scene: 'turn_on', script: 'turn_on' };

  class AreaRoomCard extends HTMLElement {
    static getConfigElement() { return document.createElement('igy-room-card-editor'); }
    static getConfigFormUnused() {
      return {
        schema: [
          { name: 'area', required: true, selector: { area: {} } },
          { name: 'title', selector: { text: {} } },
          { name: 'columns', selector: { number: { min: 3, max: 10, mode: 'box' } } },
          { name: 'order', selector: { entity: { multiple: true } } },
          { name: 'secondary', selector: { entity: { multiple: true } } },
          { name: 'title_tap', selector: { select: { options: [{ value: 'none', label: 'nič' }, { value: 'toggle', label: 'zapnúť/zhasnúť svetlá' }, { value: 'more-info', label: 'detail prvého svetla' }] } } }
        ],
        computeLabel: (s) => ({ area: 'Oblasť', title: 'Nadpis (voliteľné)', columns: 'Tlačidiel v riadku', title_tap: 'Ťuk na nadpis', order: 'Poradie – tieto entity idú prvé (v tomto poradí)', secondary: 'Sekundárne – menšie, v druhom riadku (alebo štítok Sekundárne)' })[s.name] || s.name
      };
    }
    static getStubConfig(hass) {
      const a = hass && hass.areas ? Object.keys(hass.areas)[0] : '';
      return { area: a || '' };
    }
    setConfig(c) {
      if (!c || !c.area) throw new Error('Zadaj oblasť: area: <id alebo názov>');
      this._cfg = Object.assign({ title_tap: 'none' }, c);
      this._sig = ''; this._col = null;
      if (this._hass) this._render();
    }
    set hass(h) { this._hass = h; this._render(); }
    getCardSize() { return 3; }
    getGridOptions() { return { columns: 12, min_columns: 6 }; }

    /* ---------- výber entít ---------- */
    _areaId() {
      const h = this._hass, a = this._cfg.area;
      if (h.areas[a]) return a;
      const low = String(a).toLowerCase();
      const f = Object.values(h.areas).find((x) => (x.name || '').toLowerCase() === low);
      return f ? f.area_id : a;
    }
    _labels(id) {
      const h = this._hass, e = h.entities[id]; if (!e) return [];
      const own = (e.labels || []).filter((l) => LBL_ALL.test(l)); if (own.length) return own;
      const d = e.device_id && h.devices[e.device_id];
      return d ? (d.labels || []).filter((l) => LBL_ALL.test(l)) : [];
    }
    _collect() {
      const h = this._hass, aid = this._areaId(), ids = [];
      for (const id in h.entities) {
        const e = h.entities[id]; if (!h.states[id]) continue;
        const d = e.device_id && h.devices[e.device_id];
        if ((e.area_id || (d && d.area_id)) !== aid) continue;
        const own = (e.labels || []);
        if (e.hidden || e.entity_category) { if (!own.some((l) => LBL_CARD.test(l) || LBL_HEAD.test(l))) continue; }
        ids.push(id);
      }
      const dom = (id) => id.split('.')[0], attr = (id, k) => (h.states[id].attributes || {})[k];
      const isGrp = (id) => dom(id) === 'light' && (attr(id, 'entity_id') || []).length > 0;
      const plain = ids.filter((id) => dom(id) === 'light' && !isGrp(id) && !this._labels(id).some((l) => LBL_CARD.test(l) || LBL_OUT.test(l) || LBL_HEAD.test(l))), hide = {}, roomG = {};
      ids.filter(isGrp).forEach((g) => {
        const mem = attr(g, 'entity_id') || [];
        if (!this._labels(g).length && plain.length && plain.every((x) => mem.includes(x))) { roomG[g] = 1; return; }
        mem.forEach((m) => { hide[m] = 1; });
      });
      const head = [], btn = [], noall = [], card = [];
      let temp = null, hum = null, hclim = null;
      ids.forEach((id) => {
        if (roomG[id] || (hide[id] && !this._labels(id).length)) return;
        const lb = this._labels(id), d = dom(id), dc = attr(id, 'device_class') || '';
        if (lb.some((l) => LBL_OUT.test(l))) return;
        if (lb.some((l) => LBL_HEAD.test(l)) && (d === 'sensor' || d === 'binary_sensor')) { head.push(id); return; }
        if (lb.some((l) => LBL_HEAD.test(l)) && (d === 'climate' || d === 'water_heater') && !hclim) { hclim = id; return; }   // termostat v hlavičke namiesto teploty
        if (lb.some((l) => LBL_CARD.test(l)) || (lb.some((l) => LBL_SEC.test(l)) && !AUTO.includes(d))) { btn.push(id); card.push(id); return; }
        if (AUTO.includes(d)) { btn.push(id); if (d === 'light' && lb.some((l) => LBL_NOALL.test(l))) noall.push(id); return; }
        if (d === 'sensor' && dc === 'temperature' && !temp) temp = id;
        else if (d === 'sensor' && dc === 'humidity' && !hum) hum = id;
        else if (d === 'binary_sensor' && /window|door|opening|garage_door|motion|occupancy|presence/.test(dc)) head.push(id);
      });
      const ord = (id) => { if (card.includes(id)) return 40; const i = AUTO.indexOf(dom(id)); return i < 0 ? 50 : i; };
      btn.sort((a, b) => ord(a) - ord(b) || this._name(a, aid).localeCompare(this._name(b, aid)));
      // hlavička: termostat, teplota, vlhkosť, senzory so štítkom, okná/dvere/pohyb; zoznam header určuje poradie (a môže pridať aj iné entity)
      const hCfg = [].concat(this._cfg.header || []).filter((id) => h.states[id]);
      let hdr = [hclim, hclim ? null : temp, hum].filter(Boolean)
        .concat(head.filter((id) => !id.startsWith('binary_sensor.')), head.filter((id) => id.startsWith('binary_sensor.')));
      hdr = hCfg.concat(hdr.filter((id) => !hCfg.includes(id)));
      hdr.forEach((id) => { const i = btn.indexOf(id); if (i >= 0) btn.splice(i, 1); });
      const order = [].concat(this._cfg.order || []), secCfg = [].concat(this._cfg.secondary || []);
      // entity vybrané v Poradí/Sekundárnych sa ukážu vždy – aj keď sú v inej oblasti alebo majú štítok Skryť/Ostatné
      order.concat(secCfg).forEach((id) => { if (h.states[id] && !btn.includes(id) && !hdr.includes(id)) { btn.push(id); card.push(id); } });
      order.slice().reverse().forEach((id) => { const i = btn.indexOf(id); if (i >= 0) { btn.splice(i, 1); btn.unshift(id); } });
      const isSec = (id) => secCfg.includes(id) || this._labels(id).some((l) => LBL_SEC.test(l));
      const prim = btn.filter((x) => !isSec(x)), sec = btn.filter(isSec);
      return { aid, hdr, hclim, info: [hclim ? null : temp, hum].filter(Boolean), head, btn, prim, sec, lights: btn.filter((x) => dom(x) === 'light' && !noall.includes(x) && !card.includes(x)) };
    }
    _lsKey() { return 'arc-col:' + this._cfg.area; }
    _lsGet() { try { const v = localStorage.getItem(this._lsKey()); return v == null ? this._cfg.collapsed !== false : v === '1'; } catch (_) { return this._cfg.collapsed !== false; } }
    _lsSet(v) { try { localStorage.setItem(this._lsKey(), v ? '1' : '0'); } catch (_) { } }
    _name(id, aid) {
      const h = this._hass, s = h.states[id], e = h.entities[id], a = h.areas[aid];
      let n = (s && s.attributes.friendly_name) || id;
      const d = e && e.device_id && h.devices[e.device_id], dn = d && (d.name_by_user || d.name);
      [a && a.name, aid.replace(/_/g, ' '), dn].forEach((p) => {
        if (p && n.toLowerCase().startsWith(p.toLowerCase() + ' ') && n.length > p.length + 1) n = n.slice(p.length + 1);
      });
      return n.charAt(0).toUpperCase() + n.slice(1);
    }

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
      return `<div class="b ${this._active(id) ? 'on' : ''} ${na ? 'na' : ''}" data-b="${id}" style="--c:${this._color(id)}"${tgt ? ` title="cieľ${esc(tgt)}"` : ''}>
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
      const sig = [c.aid, this._cfg.title, this._cfg.columns, JSON.stringify(this._cfg.order || []), JSON.stringify(this._cfg.secondary || []), JSON.stringify(this._cfg.header || []), c.sec.length].concat(c.hdr, c.btn).map((id) => {
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
              ${coll && lightsOn ? `<span class="lc" id="lc" title="zhasnúť svetlá"><ha-icon icon="mdi:lightbulb-on"></ha-icon>${lightsOn}</span>` : ''}
              ${c.hdr.map((id) => this._hItem(id)).join('')}
            </div>
            ${coll ? '<ha-icon class="chev" icon="mdi:chevron-down"></ha-icon>' : ''}
          </div>
          <div class="grid">${c.prim.map((id) => this._btn(id, c.aid)).join('') || (c.sec.length ? '' : '<div class="empty">V oblasti nie sú žiadne zariadenia na zobrazenie.</div>')}</div>
          ${c.sec.length ? `<div class="grid sec">${c.sec.map((id) => this._btn(id, c.aid)).join('')}</div>` : ''}
        `;
      // ikony podľa HA (vlastná ikona entity, stav, device_class)
      this.shadowRoot.querySelectorAll('ha-state-icon').forEach((el) => {
        const id = el.getAttribute('data-icon') || el.getAttribute('data-id');
        el.hass = h; el.stateObj = h.states[id];
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


  /* ================= Editor v UI: oblasť, nadpis, … + zoznamy s posúvaním hore/dole ================= */
  class AreaRoomCardEditor extends HTMLElement {
    setConfig(c) { this._cfg = Object.assign({}, c); this._render(); }
    set hass(h) { this._hass = h; if (this._form) this._form.hass = h; (this._adders || []).forEach((f) => { f.hass = h; }); if (!this._built) this._render(); }
    _emit() { this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._cfg }, bubbles: true, composed: true })); }
    _set(k, v) {
      const c = Object.assign({}, this._cfg);
      if (v === undefined || v === '' || v === null || (Array.isArray(v) && !v.length)) delete c[k]; else c[k] = v;
      this._cfg = c; this._emit();
    }
    _render() {
      if (!this._hass || !this._cfg) return;
      if (!this._built) {
        this._built = true;
        this.innerHTML = `<style>
          .ed h4 { margin: 18px 0 4px; font-size: 14px; font-weight: 500; color: var(--primary-text-color); }
          .ed .hint { font-size: 12px; color: var(--secondary-text-color); margin-bottom: 6px; }
          .ed .row { display: flex; align-items: center; gap: 6px; padding: 4px 0; border-bottom: 1px solid var(--divider-color); }
          .ed .row .nm { flex: 1; min-width: 0; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .ed .row .nm small { display: block; color: var(--secondary-text-color); font-size: 11px; }
          .ed .row .hd { width: 28px; height: 32px; display: grid; place-items: center; cursor: grab; touch-action: none; color: var(--secondary-text-color); font-size: 18px; user-select: none; }
          .ed .row.drag { background: var(--secondary-background-color, rgba(127,127,127,.15)); border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,.25); position: relative; z-index: 2; }
          .ed .row button { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--divider-color); background: none; color: var(--primary-text-color); cursor: pointer; font-size: 15px; }
          .ed .row button:disabled { opacity: .3; cursor: default; }
        </style><div class="ed"><div id="f"></div>
          <h4>Hlavička</h4><div class="hint">Poradie položiek vedľa názvu – potiahni za ⠿. Môžeš pridať aj ďalšie (aj z inej oblasti); ostatné automatické idú za nimi.</div><div id="l_header"></div><div id="a_header"></div>
          <h4>Poradie</h4><div class="hint">Tieto entity budú na karte prvé, v tomto poradí – poradie zmeníš potiahnutím za ⠿. Entitu z inej oblasti sem pridáš a ukáže sa aj v tejto izbe.</div><div id="l_order"></div><div id="a_order"></div>
          <h4>Sekundárne</h4><div class="hint">Menšie tlačidlá v spodnom riadku (alebo štítok „Sekundárne“).</div><div id="l_secondary"></div><div id="a_secondary"></div></div>`;
        const f = this._form = document.createElement('ha-form');
        f.schema = [
          { name: 'area', required: true, selector: { area: {} } },
          { name: 'title', selector: { text: {} } },
          { name: 'columns', selector: { number: { min: 3, max: 10, mode: 'box' } } },
          { name: 'title_tap', selector: { select: { mode: 'dropdown', options: [{ value: 'none', label: 'nič' }, { value: 'toggle', label: 'zapnúť/zhasnúť svetlá' }, { value: 'more-info', label: 'detail prvého svetla' }] } } },
          { type: 'grid', name: '', schema: [{ name: 'collapsible', selector: { boolean: {} } }, { name: 'collapsed', selector: { boolean: {} } }] }
        ];
        f.computeLabel = (s) => ({ area: 'Oblasť', title: 'Nadpis (voliteľné)', columns: 'Tlačidiel v riadku (voliteľné)', title_tap: 'Ťuk na nadpis (nezbaliteľná karta)', collapsible: 'Zbaliteľná na jeden riadok', collapsed: 'Na začiatku zbalená' })[s.name] || s.name;
        f.addEventListener('value-changed', (e) => {
          const v = e.detail.value, c = Object.assign({}, this._cfg);
          ['area', 'title', 'columns', 'title_tap'].forEach((k) => { if (v[k] === undefined || v[k] === '' || v[k] === null) delete c[k]; else c[k] = v[k]; });
          if (v.collapsible) c.collapsible = true; else delete c.collapsible;
          if (v.collapsed === false) c.collapsed = false; else delete c.collapsed;
          this._cfg = c; this._emit(); this._lists();
        });
        this.querySelector('#f').appendChild(f);
        this._adders = ['header', 'order', 'secondary'].map((k) => {
          const a = document.createElement('ha-form');
          a.schema = [{ name: 'add', selector: { entity: {} } }];
          a.computeLabel = () => 'Pridať entitu';
          a.data = {};
          a.addEventListener('value-changed', (e) => {
            const id = e.detail.value && e.detail.value.add; if (!id) return;
            const list = [].concat(this._cfg[k] || []); if (!list.includes(id)) list.push(id);
            this._set(k, list); a.data = {}; this._lists();
          });
          this.querySelector('#a_' + k).appendChild(a);
          return a;
        });
      }
      this._form.hass = this._hass; this._form.data = Object.assign({ collapsed: true }, this._cfg);
      this._adders.forEach((a) => { a.hass = this._hass; });
      this._lists();
    }
    _lists() {
      ['header', 'order', 'secondary'].forEach((k) => {
        const list = [].concat(this._cfg[k] || []), box = this.querySelector('#l_' + k); if (!box) return;
        box.innerHTML = list.map((id, i) => {
          const h = this._hass, s = h.states[id], n = s ? s.attributes.friendly_name || id : id, e = h.entities && h.entities[id];
          const d = e && e.device_id && h.devices[e.device_id], aid = e && (e.area_id || (d && d.area_id)), area = aid && h.areas[aid];
          const other = this._cfg.area && aid !== this._cfg.area && (!area || area.name !== this._cfg.area);
          return `<div class="row" data-i="${i}"><div class="hd" title="Chyť a posuň">⠿</div><div class="nm">${esc(n)}<small>${esc(id)}${other ? ' · ' + esc(area ? area.name : 'bez oblasti') : ''}</small></div>
            <button data-a="del" data-i="${i}" title="Odstrániť">✕</button></div>`;
        }).join('');
        box.querySelectorAll('button[data-a="del"]').forEach((b) => b.onclick = () => {
          const l = [].concat(this._cfg[k] || []); l.splice(+b.getAttribute('data-i'), 1); this._set(k, l); this._lists();
        });
        // chyť za ⠿ a posuň (myš aj dotyk)
        box.querySelectorAll('.hd').forEach((hd) => {
          hd.addEventListener('pointerdown', (ev) => {
            ev.preventDefault();
            const row = hd.parentNode, rows = [...box.children], from = rows.indexOf(row), y0 = ev.clientY;
            const hgt = row.getBoundingClientRect().height; let to = from;
            row.classList.add('drag'); hd.setPointerCapture(ev.pointerId);
            const move = (e) => {
              const dy = e.clientY - y0; row.style.transform = `translateY(${dy}px)`;
              to = Math.max(0, Math.min(rows.length - 1, from + Math.round(dy / hgt)));
              rows.forEach((r, idx) => {
                if (r === row) return;
                const shift = from < to && idx > from && idx <= to ? -hgt : from > to && idx < from && idx >= to ? hgt : 0;
                r.style.transition = 'transform .15s'; r.style.transform = shift ? `translateY(${shift}px)` : '';
              });
            };
            const up = () => {
              hd.removeEventListener('pointermove', move); hd.removeEventListener('pointerup', up); hd.removeEventListener('pointercancel', up);
              rows.forEach((r) => { r.style.transform = ''; r.style.transition = ''; }); row.classList.remove('drag');
              if (to !== from) { const l = [].concat(this._cfg[k] || []); const [m] = l.splice(from, 1); l.splice(to, 0, m); this._set(k, l); }
              this._lists();
            };
            hd.addEventListener('pointermove', move); hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
          });
        });
      });
    }
  }
  if (!customElements.get('igy-room-card-editor')) customElements.define('igy-room-card-editor', AreaRoomCardEditor);
  if (!customElements.get('igy-room-card')) customElements.define('igy-room-card', AreaRoomCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-room-card'))
    window.customCards.push({ type: 'igy-room-card', name: 'Igy Room Card', description: 'Karta izby – zariadenia sa berú z oblasti a štítkov', preview: true });
  console.info('%c IGY-ROOM-CARD %c ' + VERSION + ' ', 'background:#0a84ff;color:#fff;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();
