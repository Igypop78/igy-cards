/*
 * Igy Energy Card – prehľad energie v štýle iOS / Tesla pre Home Assistant.
 *
 *   type: custom:igy-energy-card
 *   home_power: sensor.home_actual_power_keep
 *   solar_power: sensor.pv_power_inverter_keep
 *   solar_forecast: sensor.solcast_pv_forecast_forecast_remaining_today_keep   # voliteľné – koľko ešte dnes vyrobí (kWh)
 *   pv1_power: sensor.pv1_power_inverter_keep      # voliteľné
 *   pv1_name: Strecha
 *   pv2_power: sensor.pv2_power_inverter_keep      # voliteľné
 *   pv2_name: Prístrešok
 *   battery_soc: sensor.smartshunt_soc_keep
 *   battery_power: sensor.smartshunt_power_keep
 *   battery_invert: true        # senzor: + = nabíja → otočiť (karta počíta + = vybíja)
 *   grid_power: sensor.em_main_power_keep
 *   grid_invert: false          # karta počíta + = odber zo siete, − = predaj
 *   gas_power: sensor.gas_power_keep
 *   water_flow: sensor.watermeter_flow_rate_keep
 *   gas_meter / water_meter: sensor.…        # voliteľné – stav počítadla pri plyne / vode
 *   today: true                 # dnešné súčty (kWh) v dlaždiciach solár / batéria / sieť
 *   tuv_temp: sensor.temperature_tuv_tank_keep    # teplota TUV, farba 30 °C modrá → 70 °C červená
 *   overview: true              # rozbaľovací prehľad (deň/týždeň/mesiac/rok) z Energy dashboardu
 *   stat_solar, stat_pv1, stat_pv2, stat_grid_in, stat_grid_out, cost_grid_in, cost_grid_out,
 *   stat_battery_in, stat_battery_out, stat_gas, cost_gas, stat_water, cost_water   # voliteľné – inak z Energy dashboardu
 *   home_max: 10  solar_max: 10  battery_max: 10  grid_max: 10  gas_max: 25  water_max: 25
 * Všetko sa dá nastaviť v editore karty. Chýbajúce entity sa jednoducho nezobrazia.
 */
(function () {
  'use strict';
  const VERSION = '0.7.1';

  const DEF = { home_max: 10, solar_max: 10, battery_max: 10, grid_max: 10, gas_max: 25, water_max: 25, tuv_min: 30, tuv_max: 70, pv1_name: 'PV1', pv2_name: 'PV2', title: 'Energia', overview: true };
  const COL = { pv1: '#ff8a1f', pv2: '#ffc27a', sol: '#ff9f0a', bat: '#40c8e0', chg: '#30d158', dis: '#ff6961', imp: '#ff6961', exp: '#30d158', gas: '#ffd60a', wat: '#0a84ff' };
  const IC = {
    sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
    bat: 'M3 7h15a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM23 11v2',
    grid: 'M8 22l4-20 4 20M6 8h12M5 13h14M9.5 13L12 22l2.5-9',
    home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    gas: 'M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1.5 2-2 3-3 3s-1.5-2-1-5C7 6 5 10 5 15a7 7 0 0 0 7 7z',
    wat: 'M12 2.7c-3.3 4.2-6 7.6-6 11a6 6 0 0 0 12 0c0-3.4-2.7-6.8-6-11z',
    tuv: 'M9 3.2C6.6 6.3 4.5 8.9 4.5 11.6a4.5 4.5 0 0 0 7.2 3.6M17 4.5a1.8 1.8 0 0 1 1.8 1.8v7.6a3.4 3.4 0 1 1-3.6 0V6.3A1.8 1.8 0 0 1 17 4.5zM17 10v5.2',
    up: 'M12 19V5M5 12l7-7 7 7',
    down: 'M12 5v14M19 12l-7 7-7-7',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    eur: 'M18 6.5A7 7 0 1 0 18 17.5M4 10h9M4 14h9'
  };
  const svg = (p, c) => `<svg viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></svg>`;
  
  class HomeEnergyCard extends HTMLElement {
    static getConfigElement() { return document.createElement('igy-energy-card-editor'); }
    static getStubConfig(hass) {
      const has = (id) => hass && hass.states[id] ? id : undefined;
      const c = {
        home_power: has('sensor.home_actual_power_keep'), solar_power: has('sensor.pv_power_inverter_keep'),
        pv1_power: has('sensor.pv1_power_inverter_keep'), pv1_name: 'Strecha', pv2_power: has('sensor.pv2_power_inverter_keep'), pv2_name: 'Prístrešok',
        battery_soc: has('sensor.smartshunt_soc_keep'), battery_power: has('sensor.smartshunt_power_keep'), battery_invert: !!has('sensor.smartshunt_power_keep'),
        grid_power: has('sensor.em_main_power_keep'), solar_forecast: has('sensor.solcast_pv_forecast_forecast_remaining_today_keep'), tuv_temp: has('sensor.temperature_tuv_tank_keep'), gas_power: has('sensor.gas_power_keep'), water_flow: has('sensor.watermeter_flow_rate_keep'), gas_meter: has('sensor.gasmeter_helper_keep')
      };
      Object.keys(c).forEach((k) => c[k] === undefined && delete c[k]);
      return c;
    }
    setConfig(c) { this._cfg = Object.assign({}, DEF, c || {}); this._built = false; this._ovIdsC = null; this._ov = null; if (this._hass && this.isConnected) { clearInterval(this._ovT); this._ovT = null; setTimeout(() => this._ovStart()); } if (this._hass) this._render(); }
    set hass(h) { const first = !this._hass; this._hass = h; this._render(); if (first) this._ovStart(); }
    connectedCallback() { if (this._hass) this._ovStart(); }
    disconnectedCallback() { clearInterval(this._ovT); this._ovT = null; }
    getCardSize() { return 7; }
    getGridOptions() { return { columns: 12, min_columns: 6 }; }

    /* ---------- hodnoty ---------- */
    _st(id) { return id && this._hass.states[id]; }
    _num(id) { const s = this._st(id); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
    _W(id) { const v = this._num(id); if (v == null) return null; const u = this._st(id).attributes.unit_of_measurement; return u === 'kW' ? v * 1000 : u === 'MW' ? v * 1e6 : v; }
    _unit(id) { const s = this._st(id); return s ? s.attributes.unit_of_measurement || '' : ''; }
    _lang() { return this._hass.locale && this._hass.locale.language || undefined; }
    _nf(v, d) { return (isFinite(v) ? v : 0).toLocaleString(this._lang(), { minimumFractionDigits: d, maximumFractionDigits: d }); }
    _pw(w) { const a = Math.abs(w || 0); return a < 1000 ? [this._nf(Math.round(a), 0), 'W'] : [this._nf(a / 1000, a < 10000 ? 2 : 1), 'kW']; }
    _more(id) { if (id) this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: id }, bubbles: true, composed: true })); }

    _data() {
      const c = this._cfg;
      const pv = [[c.pv1_power, c.pv1_name, COL.pv1], [c.pv2_power, c.pv2_name, COL.pv2]].filter((x) => x[0] && this._st(x[0]))
        .map((x) => ({ id: x[0], name: x[1], col: x[2], w: Math.max(0, this._W(x[0]) || 0) }));
      const solS = this._W(c.solar_power);
      const sol = Math.max(0, solS != null ? solS : pv.reduce((a, x) => a + x.w, 0));
      const g = (c.grid_invert ? -1 : 1) * (this._W(c.grid_power) || 0);          // + odber
      const b = (c.battery_invert ? -1 : 1) * (this._W(c.battery_power) || 0);    // + vybíja
      const go = Math.max(0, -g), gi = Math.max(0, g), bo = Math.max(0, b), bi = Math.max(0, -b);
      const s2g = Math.min(go, sol), s2b = Math.min(bi, Math.max(0, sol - s2g)), s2h = Math.max(0, sol - s2g - s2b);
      const b2g = Math.max(0, go - s2g), g2b = Math.max(0, bi - s2b), b2h = Math.max(0, bo - b2g), g2h = Math.max(0, gi - g2b);
      const calc = s2h + b2h + g2h, homeS = this._W(c.home_power);
      const home = homeS != null ? Math.max(0, homeS) : calc;
      return { sol, pv, g, b, home, mix: { sol: s2h, bat: b2h, grid: g2h }, mixTot: calc || 1, soc: this._num(c.battery_soc),
        gas: this._num(c.gas_power), wat: this._num(c.water_flow), tuv: this._num(c.tuv_temp) };
    }

    /* ---------- kostra (raz) ---------- */
    _build() {
      const c = this._cfg, has = (id) => !!this._st(id);
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const tiles = [];
      const pvs = [[c.pv1_power, c.pv1_name, COL.pv1, 'pv1'], [c.pv2_power, c.pv2_name, COL.pv2, 'pv2']].filter((x) => has(x[0]));
      if (has(c.solar_power) || pvs.length) tiles.push(`
        <div class="tile" data-id="${c.solar_power || pvs[0][0]}">
          <div class="th" style="color:${COL.sol}">${svg(IC.sun)}<span>Solár</span></div>
          <div class="tv"><b id="sol_v"></b><small id="sol_u"></small></div>
          <div class="bar st" id="sol_bar">${pvs.length ? pvs.map((x) => `<i id="${x[3]}_b" title="${esc(x[1])}" style="background:${x[2]}"></i>`).join('') : `<i id="sol_b" style="background:${COL.sol}"></i>`}</div>
          <div class="td" id="sol_d"></div>
        </div>`);
      if (has(c.battery_soc) || has(c.battery_power)) tiles.push(`
        <div class="tile" data-id="${c.battery_soc || c.battery_power}">
          <div class="th" id="bat_h">${svg(IC.bat)}<span>Batéria</span><b class="soc" id="soc_v"></b></div>
          ${has(c.battery_power) ? `<div class="tv"><b id="bat_v"></b><small id="bat_u"></small></div><div class="bar"><i id="bat_b"></i></div>` : ''}
          <div class="td" id="bat_d"></div>
        </div>`);
      if (has(c.grid_power)) tiles.push(`
        <div class="tile" data-id="${c.grid_power}">
          <div class="th" id="grid_h">${svg(IC.grid)}<span>Sieť</span></div>
          <div class="tv"><b id="grid_v"></b><small id="grid_u"></small></div>
          <div class="bar"><i id="grid_b"></i></div>
          <div class="td" id="grid_d"></div>
        </div>`);
      const util = [];
      if (has(c.gas_power)) util.push(`<div class="urow" data-id="${c.gas_power}"><span class="ui" style="color:${COL.gas}">${svg(IC.gas)}</span><span class="un">Plyn</span><b id="gas_v"></b><div class="bar sm"><i id="gas_b" style="background:${COL.gas}"></i></div><small class="um" id="gas_m"></small></div>`);
      if (has(c.water_flow)) util.push(`<div class="urow" data-id="${c.water_flow}"><span class="ui" style="color:${COL.wat}">${svg(IC.wat)}</span><span class="un">Voda</span><b id="wat_v"></b><div class="bar sm"><i id="wat_b" style="background:${COL.wat}"></i></div><small class="um" id="wat_m"></small></div>`);
      if (has(c.tuv_temp)) util.push(`<div class="urow" data-id="${c.tuv_temp}"><span class="ui" id="tuv_i">${svg(IC.tuv)}</span><span class="un">TUV</span><b id="tuv_v"></b><div class="bar sm"><i id="tuv_b"></i></div></div>`);
      if (util.length) tiles.push(`<div class="tile util">${util.join('')}</div>`);

      this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card>
        <div class="hero" data-id="${c.home_power || ''}">
          <div class="hl"><span class="hi">${svg(IC.home)}</span><span>${esc(c.title || 'Energia')}</span><span class="live"></span></div>
          <div class="hv"><b id="home_v"></b><small id="home_u"></small></div>
          <div class="mix" id="mix"><i class="ms" style="background:${COL.sol}"></i><i class="mb" style="background:${COL.bat}"></i><i class="mg" style="background:${COL.imp}"></i></div>
          <div class="leg" id="leg"></div>
        </div>
        <div class="tiles">${tiles.join('')}</div>
        ${this._ovOn() ? '<div class="ov" id="ov"></div>' : ''}
      </ha-card>`;
      this._card = this.shadowRoot.querySelector('ha-card');
      this.shadowRoot.querySelectorAll('[data-id]').forEach((el) => {
        el.addEventListener('click', (e) => { e.stopPropagation(); this._more(el.getAttribute('data-id')); });
      });
      if (this._ovOn()) {
        if (this._ovMode == null) { this._ovMode = this._ls('mode') || 'day'; this._ovOff = 0; this._ovOpen = this._ls('open') === '1'; }
        this._ovBind(); this._ovDraw(); this._todayDraw();
      }
      this._built = true;
    }

    /* ---------- aktualizácia hodnôt ---------- */
    _render() {
      if (!this._hass || !this._cfg) return;
      if (!this._built) this._build();
      const r = this.shadowRoot, c = this._cfg, d = this._data();
      const $ = (id) => r.getElementById(id), T = (id, t) => { const el = $(id); if (el && el.textContent !== t) el.textContent = t; };
      const W = (id, f) => { const el = $(id); if (el) el.style.width = (Math.max(0, Math.min(1, f)) * 100).toFixed(1) + '%'; };
      // dom: dĺžka pruhu = spotreba / maximum, farby = odkiaľ ide
      let p = this._pw(d.home); T('home_v', p[0]); T('home_u', p[1]);
      const m = d.mix, tot = d.mixTot, scale = Math.min(1, d.home / 1000 / c.home_max);
      [['.ms', m.sol], ['.mb', m.bat], ['.mg', m.grid]].forEach((x) => {
        const el = r.querySelector(x[0]), f = x[1] / tot * scale;
        el.style.width = (f * 100).toFixed(2) + '%'; el.style.marginRight = f > 0.004 ? '2px' : '0';
      });
      const leg = [['Solár', m.sol, COL.sol], ['Batéria', m.bat, COL.bat], ['Sieť', m.grid, COL.imp]].filter((x) => x[1] > tot * 0.005)
        .map((x) => `<span><i style="background:${x[2]}"></i>${x[0]} <b>${Math.round(x[1] / tot * 100)} %</b></span>`).join('') || '<span>–</span>';
      if ($('leg').__h !== leg) { $('leg').__h = leg; $('leg').innerHTML = leg; }
      // solár – jeden pruh poskladaný z PV1 + PV2
      if ($('sol_v')) {
        p = this._pw(d.sol); T('sol_v', p[0]); T('sol_u', p[1]);
        const mx = c.solar_max * 1000;
        if (d.pv.length) d.pv.forEach((x, i) => { const k = $('pv' + (i + 1) + '_b') ? 'pv' + (i + 1) : (x.id === c.pv2_power ? 'pv2' : 'pv1'); W(k + '_b', x.w / mx); });
        else W('sol_b', d.sol / mx);
      }
      // batéria – SOC + jeden pruh výkonu (zelený nabíja, červený vybíja)
      if ($('soc_v')) {
        T('soc_v', d.soc == null ? '' : this._nf(d.soc, 0) + ' %');
        const chg = d.b < -20, dis = d.b > 20, col = chg ? COL.chg : dis ? COL.dis : '';
        $('bat_h').style.color = col || 'var(--secondary-text-color)';
        if ($('bat_v')) {
          p = this._pw(d.b); T('bat_v', p[0]); T('bat_u', p[1]);
          W('bat_b', Math.abs(d.b) / 1000 / c.battery_max); $('bat_b').style.background = col || COL.chg;
        }
      }
      // sieť – jeden pruh (zelený predaj, červený odber)
      if ($('grid_v')) {
        const imp = d.g > 20, exp = d.g < -20, col = imp ? COL.imp : exp ? COL.exp : '';
        p = this._pw(d.g); T('grid_v', p[0]); T('grid_u', p[1]);
        $('grid_h').style.color = col || 'var(--secondary-text-color)';
        W('grid_b', Math.abs(d.g) / 1000 / c.grid_max); $('grid_b').style.background = imp ? COL.imp : COL.exp;
      }
      // plyn, voda
      if ($('gas_v')) { T('gas_v', d.gas == null ? '–' : this._nf(d.gas, 1) + ' ' + (this._unit(c.gas_power) || 'kW')); W('gas_b', (d.gas || 0) / c.gas_max); }
      // stavy počítadiel
      [['gas_m', c.gas_meter], ['wat_m', c.water_meter]].forEach(([id, ent]) => {
        const el = $(id), st = this._st(ent); if (!el) return;
        const v = st && !isNaN(parseFloat(st.state)) ? parseFloat(st.state) : null;
        T(id, v == null ? '' : this._nf(v, v < 1000 ? 2 : 0) + ' ' + (st.attributes.unit_of_measurement || ''));
      });
      if (this._cfg.solar_forecast) this._todayDraw();
      if ($('tuv_v')) {
        const tc = tuvColor(d.tuv == null ? c.tuv_min : d.tuv, c.tuv_min, c.tuv_max);
        T('tuv_v', d.tuv == null ? '–' : this._nf(d.tuv, 0) + ' °C'); W('tuv_b', ((d.tuv || 0) - c.tuv_min) / (c.tuv_max - c.tuv_min));
        $('tuv_b').style.background = `linear-gradient(90deg, rgb(59,130,246), ${tc})`; $('tuv_i').style.color = tc;
      }
      if ($('wat_v')) { T('wat_v', d.wat == null ? '–' : this._nf(d.wat, 1) + ' ' + (this._unit(c.water_flow) || 'l/h')); W('wat_b', (d.wat || 0) / c.water_max); }
    }

    /* ---------- prehľad z Energy dashboardu (rozbaľovací) ---------- */
    _ovOn() { return this._cfg && this._cfg.overview !== false && this._cfg.economy !== false; }
    _ls(k, v) {
      const key = 'hec:' + (this._cfg.title || '') + ':' + k;
      try { if (v === undefined) return localStorage.getItem(key); localStorage.setItem(key, v); } catch (_) { return null; }
      return null;
    }
    _ovStart() {
      if (!(this._ovOn() || this._cfg.today !== false) || this._ovT || !this._hass || !this.isConnected) return;
      this._ovLoad(); this._ovT = setInterval(() => this._ovLoad(), 5 * 60000);
    }
    async _ovIds() {
      const c = this._cfg, h = this._hass;
      const prefs = await h.callWS({ type: 'energy/get_prefs' }).catch(() => ({}));
      const info = await h.callWS({ type: 'energy/info' }).catch(() => ({}));
      const cs = info.cost_sensors || {}, ids = { sol: [], pv: [], gin: [], gout: [], bin: [], bout: [], gas: [], wat: [], cin: [], cout: [], cgas: [], cwat: [] };
      (prefs.energy_sources || []).forEach((s) => {
        if (s.type === 'solar' && s.stat_energy_from) { ids.sol.push(s.stat_energy_from); ids.pv.push(s.stat_energy_from); }
        if (s.type === 'battery') { if (s.stat_energy_from) ids.bout.push(s.stat_energy_from); if (s.stat_energy_to) ids.bin.push(s.stat_energy_to); }
        if (s.type === 'grid') {
          (s.flow_from || (s.stat_energy_from ? [s] : [])).forEach((f) => {
            if (f.stat_energy_from) ids.gin.push(f.stat_energy_from);
            const k = f.stat_cost || cs[f.stat_energy_from]; if (k) ids.cin.push(k);
          });
          (s.flow_to || (s.stat_energy_to ? [s] : [])).forEach((f) => {
            if (f.stat_energy_to) ids.gout.push(f.stat_energy_to);
            const k = f.stat_compensation || cs[f.stat_energy_to]; if (k) ids.cout.push(k);
          });
        }
        if (s.type === 'gas' && s.stat_energy_from) { ids.gas.push(s.stat_energy_from); const k = s.stat_cost || cs[s.stat_energy_from]; if (k) ids.cgas.push(k); }
        if (s.type === 'water' && s.stat_energy_from) { ids.wat.push(s.stat_energy_from); const k = s.stat_cost || cs[s.stat_energy_from]; if (k) ids.cwat.push(k); }
      });
      // prepísanie v editore
      const O = { sol: 'stat_solar', gin: 'stat_grid_in', gout: 'stat_grid_out', bin: 'stat_battery_in', bout: 'stat_battery_out', gas: 'stat_gas', wat: 'stat_water', cin: 'cost_grid_in', cout: 'cost_grid_out', cgas: 'cost_gas', cwat: 'cost_water' };
      Object.keys(O).forEach((k) => { if (c[O[k]]) ids[k] = [c[O[k]]]; });
      ids.pv1 = c.stat_pv1 || (ids.pv.length > 1 ? ids.pv[0] : null);
      ids.pv2 = c.stat_pv2 || (ids.pv.length > 1 ? ids.pv[1] : null);
      // jednotky plynu a vody
      const uids = ids.gas.concat(ids.wat);
      ids.unit = {};
      if (uids.length) {
        const md = await h.callWS({ type: 'recorder/get_statistics_metadata', statistic_ids: uids }).catch(() => []);
        (md || []).forEach((m) => { ids.unit[m.statistic_id] = m.statistics_unit_of_measurement || m.display_unit_of_measurement || ''; });
      }
      return ids;
    }
    _range(mode, off) {
      const n = new Date(), lang = this._lang(), Y = n.getFullYear();
      const day0 = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
      const dm = (d) => d.getDate() + '.' + (d.getMonth() + 1) + '.';
      let a, b, per, N, idx, lab;
      if (mode === 'week') {
        const wd = n.getDay() || 7; a = new Date(Y, n.getMonth(), n.getDate() - wd + 1 + off * 7); b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7);
        per = 'day'; N = 7; idx = (t) => Math.round((day0(t) - a) / 86400000);
        lab = off === 0 ? 'Tento týždeň' : off === -1 ? 'Minulý týždeň' : dm(a) + '–' + dm(new Date(b - 86400000));
      } else if (mode === 'month') {
        a = new Date(Y, n.getMonth() + off, 1); b = new Date(a.getFullYear(), a.getMonth() + 1, 1);
        per = 'day'; N = Math.round((b - a) / 86400000); idx = (t) => new Date(t).getDate() - 1;
        lab = a.toLocaleDateString(lang, { month: 'long' }) + (a.getFullYear() !== Y ? ' ' + a.getFullYear() : '');
        lab = lab.charAt(0).toUpperCase() + lab.slice(1);
      } else if (mode === 'year') {
        a = new Date(Y + off, 0, 1); b = new Date(Y + off + 1, 0, 1); per = 'month'; N = 12; idx = (t) => new Date(t).getMonth(); lab = String(Y + off);
      } else {
        a = new Date(Y, n.getMonth(), n.getDate() + off); b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1);
        per = 'hour'; N = 24; idx = (t) => new Date(t).getHours();
        lab = off === 0 ? 'Dnes' : off === -1 ? 'Včera' : dm(a);
      }
      return { a, b, per, N, idx, lab, mode, off };
    }
    async _ovLoad() {
      if (this._ovBusy) { this._ovAgain = true; return; }
      this._ovBusy = true; this._ovDraw(true);
      try {
        if (!this._ovIdsC) this._ovIdsC = await this._ovIds();
        const ids = this._ovIdsC, mode = this._ovMode || 'day', off = this._ovOff || 0;
        const d = await this._ovCompute(ids, mode, off);
        this._today = mode === 'day' && off === 0 ? d : this._cfg.today !== false ? await this._ovCompute(ids, 'day', 0).catch(() => null) : null;
        this._todayDraw();
        this._ov = d;
      } catch (e) { console.error('igy-energy-card: prehľad', e); this._ov = { err: true, r: this._range(this._ovMode || 'day', this._ovOff || 0) }; }
      finally {
        this._ovBusy = false; this._ovDraw();
        if (this._ovAgain) { this._ovAgain = false; this._ovLoad(); }
      }
    }
    async _ovCompute(ids, mode, off) {
      const r = this._range(mode, off);
      const all = [...new Set([].concat(ids.sol, ids.gin, ids.gout, ids.bin, ids.bout, ids.gas, ids.wat, ids.cin, ids.cout, ids.cgas, ids.cwat, ids.pv1 || [], ids.pv2 || []))];
      if (!all.length) return { empty: true, r };
      const q = (a, b, period) => this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: a.toISOString(), end_time: b.toISOString(), statistic_ids: all, period, types: ['change'], units: { energy: 'kWh' } });
      const res = await q(r.a, r.b, r.per), now = Date.now();
      if (r.a <= now && now < r.b) {   // rozpracovaná hodina z 5-min štatistík
        const h0 = new Date(); h0.setMinutes(0, 0, 0);
        const p5 = await q(h0, new Date(now + 60000), '5minute').catch(() => ({}));
        Object.keys(p5 || {}).forEach((id) => { res[id] = (res[id] || []).concat(p5[id]); });
      }
      const B = (id) => { const o = new Array(r.N).fill(0); (res[id] || []).forEach((x) => { const t = typeof x.start === 'number' ? x.start : Date.parse(x.start), i = r.idx(t); if (i >= 0 && i < r.N && x.change != null) o[i] += x.change; }); return o; };
      const S = (l) => { const o = new Array(r.N).fill(0); l.forEach((id) => B(id).forEach((v, i) => { o[i] += v; })); return o; };
      const T = (l) => Math.abs(S(l).reduce((x, y) => x + y, 0));
      const toL = (id) => { const u = (ids.unit[id] || '').toLowerCase(); return u === 'm³' || u === 'm3' ? 1000 : u.startsWith('gal') ? 3.785 : u.startsWith('ft') ? 28.317 : 1; };
      const d = { r, sol: S(ids.sol), gin: S(ids.gin), gout: S(ids.gout), bin: S(ids.bin), bout: S(ids.bout), gas: S(ids.gas),
        wat: new Array(r.N).fill(0), has: {}, cin: T(ids.cin), cout: T(ids.cout), cgas: T(ids.cgas), cwat: T(ids.cwat),
        hasCost: { cin: ids.cin.length > 0, cout: ids.cout.length > 0, cgas: ids.cgas.length > 0, cwat: ids.cwat.length > 0 } };
      ids.wat.forEach((id) => { const f = toL(id); B(id).forEach((v, i) => { d.wat[i] += v * f; }); });
      d.gasU = ids.gas.length ? ids.unit[ids.gas[0]] || 'kWh' : ''; if (/^[kM]?Wh$/.test(d.gasU)) d.gasU = 'kWh';
      d.pv1 = ids.pv1 ? Math.abs(B(ids.pv1).reduce((x, y) => x + y, 0)) : null;
      d.pv2 = ids.pv2 ? Math.abs(B(ids.pv2).reduce((x, y) => x + y, 0)) : null;
      ['sol', 'gin', 'gout', 'bin', 'bout', 'gas', 'wat'].forEach((k) => { d.has[k] = ids[k].length > 0; d[k + 'T'] = d[k].reduce((x, y) => x + Math.max(0, y), 0); });
      // odkiaľ išla spotreba domu (po hodinách / dňoch)
      let s2h = 0, b2h = 0, g2h = 0, s2b = 0, g2b = 0;
      for (let i = 0; i < r.N; i++) {
        const s = Math.max(0, d.sol[i]), gi = Math.max(0, d.gin[i]), go = Math.max(0, d.gout[i]), bi = Math.max(0, d.bin[i]), bo = Math.max(0, d.bout[i]);
        const a1 = Math.min(go, s), a2 = Math.min(bi, Math.max(0, s - a1)), a3 = Math.max(0, s - a1 - a2);
        const c1 = Math.max(0, go - a1), c2 = Math.max(0, bi - a2), c3 = Math.max(0, bo - c1), c4 = Math.max(0, gi - c2);
        s2h += a3; s2b += a2; g2b += c2; b2h += c3; g2h += c4;
      }
      d.home = s2h + b2h + g2h; d.mix = { sol: s2h, bat: b2h, grid: g2h };
      d.bal = (d.hasCost.cout ? d.cout : 0) - (d.hasCost.cin ? d.cin : 0) - (d.hasCost.cgas ? d.cgas : 0) - (d.hasCost.cwat ? d.cwat : 0);
      d.anyCost = d.hasCost.cin || d.hasCost.cout || d.hasCost.cgas || d.hasCost.cwat;
      return d;
    }
    // dnešné súčty v dlaždiciach hore
    _todayDraw() {
      const r = this.shadowRoot, t = this._today, on = this._cfg.today !== false && t && !t.empty && !t.err;
      const set = (id, h) => { const el = r && r.getElementById(id); if (el && el.__h !== h) { el.__h = h; el.innerHTML = h; } };
      const fc = this._st(this._cfg.solar_forecast), fv = fc ? parseFloat(fc.state) * (/^Wh$/i.test(fc.attributes.unit_of_measurement || '') ? 0.001 : 1) : NaN;
      const rest = !isNaN(fv) && fv >= 0.05 ? ` · ešte <b>~${this._kwh(fv)}</b>` : '';
      set('sol_d', on && t.has.sol ? `dnes <b>${this._kwh(t.solT)}</b>${rest} kWh` : rest ? `ešte <b>~${this._kwh(fv)}</b> kWh` : '');
      set('bat_d', on && (t.has.bin || t.has.bout) ? `dnes <b>+${this._kwh(t.binT)}</b> / <b>−${this._kwh(t.boutT)}</b> kWh` : '');
      set('grid_d', on && (t.has.gin || t.has.gout) ? `dnes ↓ <b>${this._kwh(t.ginT)}</b> · ↑ <b>${this._kwh(t.goutT)}</b> kWh` : '');
    }
    _kwh(v) { const a = Math.abs(v || 0); return this._nf(a, a < 100 ? 1 : 0); }
    _eur(v, sign) {
      const cur = (this._hass.config && this._hass.config.currency) || 'EUR';
      const t = Math.abs(v).toLocaleString(this._lang(), { style: 'currency', currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return sign ? (v >= 0 ? '+' : '−') + t : t;
    }
    _ovDraw(loading) {
      const box = this.shadowRoot && this.shadowRoot.getElementById('ov'); if (!box) return;
      if (loading) { box.classList.add('ld'); return; }
      if (!this._ovBusy) box.classList.remove('ld');
      const d = this._ov, open = this._ovOpen, mode = this._ovMode || 'day', R = COL.imp, G = COL.exp;
      const r = this._range(mode, this._ovOff || 0);   // popisky vždy podľa výberu, dáta ostávajú do načítania nových
      const sum = d && d.anyCost ? `<span class="sum" style="color:${d.bal >= 0 ? G : R}">${this._eur(d.bal, true)}</span>` : '<span class="sum"></span>';
      let h = `<div class="ovh" data-ovt="1"><span class="hi">${svg(IC.chart)}</span><span>Prehľad · ${esc(r.lab.toLowerCase())}</span>${sum}<span class="chev">${svg('M6 9l6 6 6-6')}</span></div>`;
      if (open) {
        h += `<div class="bar2"><div class="seg">${[['day', 'Deň'], ['week', 'Týždeň'], ['month', 'Mesiac'], ['year', 'Rok']].map(([k, t]) => `<b data-mode="${k}" class="${k === mode ? 'on' : ''}">${t}</b>`).join('')}</div>
          <div class="nav"><i data-nav="-1">‹</i><span>${esc(r.lab)}</span><i data-nav="1" class="${(this._ovOff || 0) >= 0 ? 'dis' : ''}">›</i></div></div>`;
        if (!d) h += '<div class="emsg">Načítavam…</div>';
        else if (d.err) h += '<div class="emsg">Dáta z Energy dashboardu sa nepodarilo načítať.</div>';
        else if (d.empty) h += '<div class="emsg">V Energy dashboarde nie sú nastavené žiadne zdroje.</div>';
        else {
          const eu = (v, pos) => this._eur(pos ? v : -v, true), m = d.mix, mt = d.home || 1, pc = (v) => Math.round(v / mt * 100);
          // dom: spotreba, bilancia, odkiaľ išla spotreba
          h += `<div class="box hero"><div class="hr"><div class="k"><b>${this._kwh(d.home)}</b><small>kWh</small><div>spotreba domu</div></div>
            ${d.anyCost ? `<div class="e"><b style="color:${d.bal >= 0 ? G : R}">${this._eur(d.bal, true)}</b><div>bilancia domu</div></div>` : ''}</div>
            ${d.home > 0.01 ? `<div class="mix2">${[[m.sol, COL.sol], [m.bat, COL.bat], [m.grid, R]].filter((x) => x[0] > mt * 0.005).map((x) => `<i style="flex:${x[0].toFixed(3)};background:${x[1]}"></i>`).join('')}</div>
            <div class="lg">${[['solár', m.sol, COL.sol], ['batéria', m.bat, COL.bat], ['sieť', m.grid, R]].filter((x) => x[1] > mt * 0.005).map((x) => `<span><i style="background:${x[2]}"></i>${x[0]} <b>${pc(x[1])} %</b></span>`).join('')}</div>` : ''}</div>`;
          // zoznam položiek
          const row = (ic, col, name, sub, val, unit, price, pcol) => `<div class="rw"><span class="ri" style="color:${col}">${svg(ic)}</span><span class="rn"><b>${name}</b>${sub ? `<small>${sub}</small>` : ''}</span>
            <span class="rv"><b>${val}<small>${unit}</small></b>${price ? `<div style="color:${pcol}">${price}</div>` : ''}</span></div>`;
          const rows = [];
          if (d.has.sol) {
            const pv = [d.pv1 != null ? `${esc(this._cfg.pv1_name)} ${this._kwh(d.pv1)}` : '', d.pv2 != null ? `${esc(this._cfg.pv2_name)} ${this._kwh(d.pv2)}` : ''].filter(Boolean).join(' · ');
            rows.push(row(IC.sun, COL.sol, 'Výroba FVE', pv, this._kwh(d.solT), 'kWh'));
          }
          if (d.has.gout) rows.push(row(IC.up, G, 'Predaj do siete', '', this._kwh(d.goutT), 'kWh', d.hasCost.cout ? eu(d.cout, 1) : '', G));
          if (d.has.gin) rows.push(row(IC.down, R, 'Nákup zo siete', '', this._kwh(d.ginT), 'kWh', d.hasCost.cin ? eu(d.cin, 0) : '', R));
          if (d.has.bin || d.has.bout) rows.push(row(IC.bat, COL.bat, 'Batéria', '', `+${this._kwh(d.binT)}<span class="sl">/</span>−${this._kwh(d.boutT)}`, 'kWh'));
          if (d.has.gas) { const u = d.gasU || 'kWh'; rows.push(row(IC.gas, COL.gas, 'Plyn', '', u === 'kWh' ? this._kwh(d.gasT) : this._nf(d.gasT, d.gasT < 100 ? 2 : 0), esc(u), d.hasCost.cgas ? eu(d.cgas, 0) : '', R)); }
          if (d.has.wat) rows.push(row(IC.wat, COL.wat, 'Voda', `${this._nf(d.watT / 1000, 2)} m³`, this._nf(d.watT, 0), 'l', d.hasCost.cwat ? eu(d.cwat, 0) : '', R));
          if (rows.length) h += `<div class="box lst">${rows.join('')}</div>`;
        }
      }
      if (box.__h === h) return; box.__h = h;
      box.classList.toggle('open', !!open);
      box.innerHTML = h;
    }
    _ovBind() {
      const box = this.shadowRoot.getElementById('ov'); if (!box) return;
      box.addEventListener('click', (e) => {
        e.stopPropagation();
        const t = e.target.closest('[data-ovt],[data-mode],[data-nav]'); if (!t) return;
        if (t.dataset.ovt) { this._ovOpen = !this._ovOpen; this._ls('open', this._ovOpen ? '1' : '0'); this._ovDraw(); return; }
        if (t.dataset.mode) { if (t.dataset.mode === this._ovMode) return; this._ovMode = t.dataset.mode; this._ovOff = 0; this._ls('mode', this._ovMode); }
        if (t.dataset.nav) { const n = (this._ovOff || 0) + Number(t.dataset.nav); if (n > 0) return; this._ovOff = n; }
        this._ovDraw(); this._ovLoad();
      });
    }
  }
  // 30 °C modrá → svetlomodrá → žltá → oranžová → 70 °C červená (stupnica sa prispôsobí min/max)
  function tuvColor(t, mn, mx) {
    const S = [[0, [59, 130, 246]], [.25, [56, 189, 248]], [.5, [250, 204, 21]], [.75, [251, 146, 60]], [1, [239, 68, 68]]];
    const f = Math.max(0, Math.min(1, (t - mn) / ((mx - mn) || 1)));
    for (let i = 1; i < S.length; i++) if (f <= S[i][0]) {
      const a = S[i - 1], b = S[i], k = (f - a[0]) / (b[0] - a[0]);
      return 'rgb(' + [0, 1, 2].map((j) => Math.round(a[1][j] + (b[1][j] - a[1][j]) * k)).join(',') + ')';
    }
    return 'rgb(239,68,68)';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  const CSS = `
    ha-card { padding: 12px 18px 18px; overflow: hidden; }
    [data-id] { cursor: pointer; }
    .hl { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--secondary-text-color); letter-spacing: .02em; }
    .hi svg { width: 16px; height: 16px; display: block; }
    .live { width: 6px; height: 6px; border-radius: 50%; background: #30d158; box-shadow: 0 0 8px #30d158; margin-left: auto; animation: pl 2.4s infinite; }
    @keyframes pl { 50% { opacity: .3; } }
    .hv { margin-top: 2px; color: var(--primary-text-color); display: flex; align-items: baseline; }
    .hv b { font-size: 46px; font-weight: 300; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
    .hv small { font-size: 18px; font-weight: 300; color: var(--secondary-text-color); margin-left: 4px; }
    .soc { margin-left: auto; font-size: 13px; font-weight: 500; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
    .hmax { margin-left: auto; font-size: 12px; color: var(--secondary-text-color); opacity: .7; }
    .mix { display: flex; height: 12px; margin: 10px 0 8px; border-radius: 99px; overflow: hidden; background: rgba(127,127,127,.15); }
    .mix i { flex: none; min-width: 0; transition: width 1s cubic-bezier(.3,.7,.3,1); }
    .leg { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: var(--secondary-text-color); }
    .leg i, .pv span i { display: inline-block; width: 8px; height: 8px; border-radius: 3px; margin-right: 6px; }
    .leg b { color: var(--primary-text-color); font-weight: 500; }
    .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
    .tile { background: var(--hc-surface, rgba(127,127,127,.1)); box-shadow: inset 0 0 0 1px var(--hc-surface-line, transparent); border-radius: 18px; padding: 12px 13px; min-width: 0; transition: background .2s; }
    .tile:active { background: rgba(127,127,127,.2); }
    .th { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 500; transition: color .6s; }
    .th svg { width: 15px; height: 15px; }
    .th span { color: var(--secondary-text-color); }
    .tv { margin-top: 6px; color: var(--primary-text-color); display: flex; align-items: baseline; }
    .tv b { font-size: 26px; font-weight: 300; letter-spacing: -.02em; font-variant-numeric: tabular-nums; transition: color .6s; }
    .tv small { font-size: 13px; color: var(--secondary-text-color); margin-left: 3px; }
    .bar { position: relative; height: 7px; border-radius: 99px; background: rgba(127,127,127,.18); overflow: hidden; margin-top: 8px; display: flex; }
    .bar i { flex: none; height: 100%; width: 0; transition: width 1s cubic-bezier(.3,.7,.3,1), background .6s; }
    .bar:not(.st) i { border-radius: 99px; }
    .bar.st i + i { margin-left: 2px; }
    .bar.sm { height: 5px; margin-top: 6px; grid-column: 1 / -1; }
    .pv { margin-top: 7px; font-size: 12px; display: flex; justify-content: space-between; color: var(--secondary-text-color); }
    .pv span { display: flex; align-items: center; }
    .pv b, .sub b { color: var(--primary-text-color); font-weight: 500; font-variant-numeric: tabular-nums; }
    .sub { display: flex; justify-content: space-between; font-size: 12px; color: var(--secondary-text-color); margin-top: 7px; }
    .util { display: flex; flex-direction: column; justify-content: center; gap: 9px; }
    .urow { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0 8px; }
    .ui svg { width: 17px; height: 17px; display: block; } .ui { transition: color .6s; }
    .un { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    .um { grid-column: 1 / -1; font-size: 11.5px; color: var(--secondary-text-color); margin-top: 4px; font-variant-numeric: tabular-nums; text-align: right; }
    .um:empty { display: none; }
    .td { font-size: 12px; color: var(--secondary-text-color); margin-top: 8px; font-variant-numeric: tabular-nums; }
    .td:empty { display: none; }
    .td b { color: var(--primary-text-color); font-weight: 500; }
    .urow b { font-size: 15px; font-weight: 400; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
    .ov { margin-top: 16px; border-top: 1px solid rgba(127,127,127,.15); padding-top: 12px; user-select: none; -webkit-user-select: none; transition: opacity .2s; }
        .ovh { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--secondary-text-color); cursor: pointer; letter-spacing: .02em; }
    .ovh .sum { margin-left: auto; font-weight: 500; font-size: 14px; font-variant-numeric: tabular-nums; }
    .ovh .chev svg { width: 18px; height: 18px; display: block; transition: transform .3s; opacity: .7; transform: rotate(-90deg); }
    .ov.open .ovh .chev svg { transform: none; }
    .bar2 { display: flex; align-items: center; gap: 8px; margin: 12px 0 10px; }
    .seg { display: inline-flex; padding: 2px; border-radius: 9px; background: rgba(127,127,127,.16); }
    .seg b { font-size: 12.5px; font-weight: 500; padding: 4px 11px; border-radius: 7px; color: var(--primary-text-color); cursor: pointer; transition: background .2s; }
    .seg b.on { background: var(--primary-text-color); color: var(--card-background-color, #1c1c1e); }
    .nav { margin-left: auto; display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--primary-text-color); }
    .nav i { font-style: normal; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(127,127,127,.16); color: var(--secondary-text-color); cursor: pointer; font-size: 16px; }
    .nav i.dis { opacity: .3; pointer-events: none; }
    .nav span { min-width: 64px; text-align: center; white-space: nowrap; }
    .box { border-radius: 18px; background: var(--hc-surface, rgba(127,127,127,.1)); box-shadow: inset 0 0 0 1px var(--hc-surface-line, transparent); overflow: hidden; transition: opacity .2s; }
    .ov.ld .box, .ov.ld .sum { opacity: .5; }
    .box + .box { margin-top: 10px; }
    .hero { padding: 14px 14px 12px; }
    .hr { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; }
    .hr b { font-size: 30px; font-weight: 300; letter-spacing: -.03em; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
    .hr small { font-size: 13px; color: var(--secondary-text-color); margin-left: 4px; }
    .hr .k div, .hr .e div { font-size: 12px; color: var(--secondary-text-color); margin-top: 1px; }
    .hr .e { text-align: right; }
    .mix2 { display: flex; height: 8px; border-radius: 99px; overflow: hidden; gap: 2px; margin-top: 12px; }
    .lg { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: var(--secondary-text-color); margin-top: 7px; }
    .lg i { display: inline-block; width: 8px; height: 8px; border-radius: 3px; margin-right: 5px; }
    .lg b { color: var(--primary-text-color); font-weight: 500; }
    .rw { position: relative; display: flex; align-items: center; gap: 12px; padding: 0 14px; min-height: 52px; }
    .rw + .rw::before { content: ''; position: absolute; left: 48px; right: 0; top: 0; height: 1px; background: rgba(127,127,127,.18); }
    .ri { display: flex; width: 22px; justify-content: center; flex: none; }
    .ri svg { width: 20px; height: 20px; }
    .rn { flex: 1; min-width: 0; padding: 8px 0; }
    .rn b { display: block; font-size: 14px; font-weight: 500; color: var(--primary-text-color); }
    .rn small { display: block; font-size: 12px; color: var(--secondary-text-color); margin-top: 1px; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rv { text-align: right; font-variant-numeric: tabular-nums; flex: none; padding: 8px 0; }
    .rv b { font-size: 17px; font-weight: 300; color: var(--primary-text-color); white-space: nowrap; }
    .rv b small { font-size: 12px; color: var(--secondary-text-color); margin-left: 3px; font-weight: 400; }
    .rv .sl { color: var(--secondary-text-color); margin: 0 5px; opacity: .6; }
    .rv div { font-size: 12.5px; font-weight: 500; margin-top: 1px; }
    .emsg { font-size: 13px; color: var(--secondary-text-color); padding: 6px 0; }
  `;

  /* ================= Editor ================= */
  class HomeEnergyCardEditor extends HTMLElement {
    setConfig(c) { this._cfg = Object.assign({}, c); if (this._f) this._f.data = Object.assign({}, DEF, this._cfg); }
    set hass(h) {
      this._hass = h;
      if (!this._f) {
        const f = this._f = document.createElement('ha-form');
        const ent = (n) => ({ name: n, selector: { entity: { domain: ['sensor', 'input_number', 'number'] } } });   // bez filtra device_class – nie každý senzor ho má
        const num = (n, unit, max, step) => ({ name: n, selector: { number: { min: 0, max: max || 100, step: step || 0.5, mode: 'box', unit_of_measurement: unit } } });
        const st = (n) => ({ name: n, selector: { statistic: {} } });
        const stats = (list) => ({ type: 'expandable', name: '', title: 'Štatistiky pre Prehľad (prázdne = z Energy dashboardu)', icon: 'mdi:chart-box-outline', schema: list.map(st) });
        const sec = (title, icon, schema, expanded) => ({ type: 'expandable', name: '', title, icon, expanded: !!expanded, schema });
        f.schema = [
          sec('Všeobecné', 'mdi:home-lightning-bolt-outline', [
            { name: 'title', selector: { text: {} } }, ent('home_power', 'power'), num('home_max', 'kW'),
            { type: 'grid', name: '', schema: [{ name: 'overview', selector: { boolean: {} } }, { name: 'today', selector: { boolean: {} } }] }], true),
          sec('Solár', 'mdi:solar-power-variant', [ent('solar_power', 'power'), num('solar_max', 'kW'),
            { type: 'grid', name: '', schema: [ent('pv1_power', 'power'), { name: 'pv1_name', selector: { text: {} } }, ent('pv2_power', 'power'), { name: 'pv2_name', selector: { text: {} } }] },
            ent('solar_forecast', 'energy'), stats(['stat_solar', 'stat_pv1', 'stat_pv2'])]),
          sec('Batéria', 'mdi:home-battery-outline', [ent('battery_soc', 'battery'), ent('battery_power', 'power'), { name: 'battery_invert', selector: { boolean: {} } }, num('battery_max', 'kW'),
            stats(['stat_battery_in', 'stat_battery_out'])]),
          sec('Sieť', 'mdi:transmission-tower', [ent('grid_power', 'power'), { name: 'grid_invert', selector: { boolean: {} } }, num('grid_max', 'kW'),
            stats(['stat_grid_in', 'cost_grid_in', 'stat_grid_out', 'cost_grid_out'])]),
          sec('Plyn', 'mdi:fire', [ent('gas_power'), num('gas_max', '', 500, 1), ent('gas_meter'), stats(['stat_gas', 'cost_gas'])]),
          sec('Voda', 'mdi:water-outline', [ent('water_flow'), num('water_max', '', 1000, 1), ent('water_meter'), stats(['stat_water', 'cost_water'])]),
          sec('Teplá úžitková voda', 'mdi:water-thermometer-outline', [ent('tuv_temp', 'temperature'),
            { type: 'grid', name: '', schema: [num('tuv_min', '°C', 100, 1), num('tuv_max', '°C', 100, 1)] }])
        ];
        const L = {
          title: 'Nadpis karty', home_power: 'Spotreba domu – výkon', home_max: 'Mierka pruhu spotreby', overview: 'Prehľad (deň / týždeň / mesiac / rok)', today: 'Dnešné súčty v dlaždiciach',
          solar_power: 'Výkon FVE spolu', solar_max: 'Mierka FVE', pv1_power: 'PV1 – výkon', pv1_name: 'PV1 – názov', pv2_power: 'PV2 – výkon', pv2_name: 'PV2 – názov', solar_forecast: 'Predpoveď – zostávajúca výroba dnes',
          battery_soc: 'Nabitie (SOC %)', battery_power: 'Výkon batérie', battery_invert: 'Otočiť znamienko výkonu', battery_max: 'Mierka výkonu batérie',
          grid_power: 'Výkon siete', grid_invert: 'Otočiť znamienko výkonu', grid_max: 'Mierka siete',
          gas_power: 'Plyn – okamžitý výkon / prietok', gas_max: 'Mierka plynu', gas_meter: 'Stav plynomeru',
          water_flow: 'Voda – prietok', water_max: 'Mierka vody', water_meter: 'Stav vodomeru',
          tuv_temp: 'Teplota v zásobníku', tuv_min: 'Studená (modrá)', tuv_max: 'Horúca (červená)',
          stat_solar: 'Výroba FVE spolu (kWh)', stat_pv1: 'Výroba PV1 (kWh)', stat_pv2: 'Výroba PV2 (kWh)', stat_battery_in: 'Energia do batérie (kWh)', stat_battery_out: 'Energia z batérie (kWh)',
          stat_grid_in: 'Odber zo siete (kWh)', cost_grid_in: 'Náklad na odber', stat_grid_out: 'Dodávka do siete (kWh)', cost_grid_out: 'Príjem z dodávky',
          stat_gas: 'Spotreba plynu', cost_gas: 'Náklad na plyn', stat_water: 'Spotreba vody', cost_water: 'Náklad na vodu' };
        const H = {
          home_power: 'W alebo kW. Bez neho sa spotreba dopočíta zo solára, batérie a siete.',
          home_max: 'Pri tejto hodnote je pruh plný.',
          overview: 'Rozbaľovací prehľad dole, dáta z Energy dashboardu.',
          today: 'Napr. „dnes 21,5 kWh“ pod solárom, batériou a sieťou.',
          solar_power: 'Ak chýba, sčíta sa PV1 + PV2.',
          pv1_power: 'Voliteľné – pruh solára sa rozdelí na dve farby.',
          solar_forecast: 'Napr. Solcast „forecast remaining today“ (kWh).',
          battery_power: 'Karta počíta + = vybíjanie, − = nabíjanie.',
          battery_invert: 'Zapni, ak senzor ukazuje + pri nabíjaní.',
          grid_power: 'Karta počíta + = odber zo siete, − = predaj.',
          grid_invert: 'Zapni, ak senzor ukazuje + pri predaji.',
          gas_meter: 'Voliteľné – zobrazí sa pod pruhom plynu.', water_meter: 'Voliteľné – zobrazí sa pod pruhom vody.',
          tuv_temp: 'Voliteľné – farba pruhu podľa teploty.' };
        f.computeLabel = (x) => L[x.name] || x.title || x.name;
        f.computeHelper = (x) => H[x.name];
        f.addEventListener('value-changed', (e) => {
          const v = Object.assign({}, e.detail.value), c = { type: this._cfg.type || 'custom:igy-energy-card' };
          // ukladať len to, čo sa líši od predvolených hodnôt – YAML ostane krátky
          Object.keys(v).forEach((k) => { if (k === 'type' || v[k] === '' || v[k] === undefined || v[k] === null || v[k] === DEF[k] || (v[k] === false && DEF[k] === undefined)) return; c[k] = v[k]; });
          this._cfg = c;
          this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: c }, bubbles: true, composed: true }));
        });
        this.appendChild(f);
      }
      this._f.hass = h; this._f.data = Object.assign({}, DEF, this._cfg);
    }
  }

  if (!customElements.get('igy-energy-card-editor')) customElements.define('igy-energy-card-editor', HomeEnergyCardEditor);
  if (!customElements.get('igy-energy-card')) customElements.define('igy-energy-card', HomeEnergyCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-energy-card'))
    window.customCards.push({ type: 'igy-energy-card', name: 'Igy Energy Card', description: 'Prehľad energie: spotreba a jej zdroje, solár, batéria, sieť, plyn, voda', preview: true });
  console.info('%c IGY-ENERGY-CARD %c ' + VERSION + ' ', 'background:#30d158;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();
