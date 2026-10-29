/*! igy-cards v1.0.0 – 9 kariet pre Home Assistant · https://github.com/Igypop78/igy-cards · licencia MIT */

/* ===== igy-energy-card ===== */
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

/* ===== igy-weather-card ===== */
/*
 * Igy Weather Card – počasie + predpoveď výroby FVE v štýle Home Energy / Thermostat Card.
 *
 *   type: custom:igy-weather-card
 *   entity: weather.forecast_home                 # ľubovoľná entita počasia (Met.no, Open-Meteo, …)
 *   title: Bratislava                             # voliteľné – inak názov entity
 *   temperature_sensor: sensor.vonku_teplota      # voliteľné – vlastný vonkajší teplomer (aktuálna teplota + priebeh dnes)
 *   solar_today: sensor.solcast_pv_forecast_forecast_today          # Solcast – dnes (kWh, atribút detailedForecast)
 *   solar_remaining: sensor.solcast_pv_forecast_forecast_remaining_today
 *   solar_days: [sensor.solcast_pv_forecast_forecast_tomorrow, sensor.solcast_pv_forecast_forecast_day_3, sensor.solcast_pv_forecast_forecast_day_4]
 *   solar_power: sensor.pv_power                  # voliteľné – skutočná výroba (W/kW), kreslí sa do grafu za uplynulú časť dňa
 *   ring_max: 9                                 # voliteľné – kWh za hodinu pre plný prstenec okolo ikony
 *   collapsible: true                             # ťuk na hlavičku zbalí / rozbalí (pamätá si na zariadení)
 *   collapsed: true                               # na začiatku zbalená: hlavička + graf dňa
 */
(function () {
  'use strict';
  const VERSION = '1.5.0';
  const COL = { sol: '#ff9f0a', rain: '#64b5ff' };
  const COND = { 'clear-night': 'Jasno', cloudy: 'Zamračené', exceptional: 'Výnimočné počasie', fog: 'Hmla', hail: 'Krupobitie', lightning: 'Búrka',
    'lightning-rainy': 'Búrka s dažďom', partlycloudy: 'Polojasno', pouring: 'Lejak', rainy: 'Dážď', snowy: 'Sneženie', 'snowy-rainy': 'Dážď so snehom',
    sunny: 'Slnečno', windy: 'Veterno', 'windy-variant': 'Veterno a oblačno' };
  const DIRS = ['S', 'SV', 'V', 'JV', 'J', 'JZ', 'Z', 'SZ'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  const ui = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></svg>`;
  const UI = {
    wind: 'M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8',
    hum: 'M12 2.7c-3.3 4.2-6 7.6-6 11a6 6 0 0 0 12 0c0-3.4-2.7-6.8-6-11z',
    sunset: 'M12 9V3M8.5 6.5 12 3l3.5 3.5M4 14h2M18 14h2M6.3 9.3l1.4 1.4M16.3 10.7l1.4-1.4M8 14a4 4 0 0 1 8 0M3 18h18',
    sunrise: 'M12 3v6M8.5 5.5 12 9l3.5-3.5M4 14h2M18 14h2M6.3 9.3l1.4 1.4M16.3 10.7l1.4-1.4M8 14a4 4 0 0 1 8 0M3 18h18',
    press: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 12l4-4',
    chev: 'M6 9l6 6 6-6'
  };

  /* ---------- farebné ikony počasia ---------- */
  const SUN = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffc53d"/><g stroke="#ffc53d" stroke-width="${r * 0.3}" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const t = a * Math.PI / 180; return `<line x1="${cx + Math.cos(t) * r * 1.55}" y1="${cy + Math.sin(t) * r * 1.55}" x2="${cx + Math.cos(t) * r * 2.05}" y2="${cy + Math.sin(t) * r * 2.05}"/>`; }).join('')}</g>`;
  const MOON = (cx, cy, r) => `<path d="M${cx + r * 0.4} ${cy - r}a${r} ${r} 0 1 0 ${r * 0.6} ${r * 1.75} ${r * 1.1} ${r * 1.1} 0 0 1 -${r * 0.6} -${r * 1.75}z" fill="#c7d2fe"/>`;
  const CLOUD = (y, c) => `<path d="M18 ${y + 22}h28a10 10 0 0 0 0-20 14 14 0 0 0-26 3.5 8.3 8.3 0 0 0-2 16.5z" fill="${c}"/>`;
  const DROPS = (y, n, c) => `<g stroke="${c || COL.rain}" stroke-width="3" stroke-linecap="round">${Array.from({ length: n }, (_, i) => `<line x1="${24 + i * 9}" y1="${y}" x2="${21 + i * 9}" y2="${y + 8}"/>`).join('')}</g>`;
  const FLAKES = (y) => `<g fill="#e8f1ff">${[24, 33, 42].map((x, i) => `<circle cx="${x - 2}" cy="${y + 4 + (i % 2) * 3}" r="2.6"/>`).join('')}</g>`;
  const BOLT = (y) => `<path d="M34 ${y}l-7 11h6l-3 9 9-12h-6l3-8z" fill="#ffd60a"/>`;
  function wicon(c, night) {
    let b;
    switch (c) {
      case 'sunny': b = night ? MOON(32, 32, 14) : SUN(32, 32, 11); break;
      case 'clear-night': b = MOON(32, 32, 14); break;
      case 'partlycloudy': b = (night ? MOON(24, 22, 9) : SUN(24, 24, 8)) + CLOUD(26, '#e5e7eb'); break;
      case 'cloudy': b = CLOUD(22, '#cbd2db'); break;
      case 'fog': b = CLOUD(14, '#b8c0cc') + '<g stroke="#b8c0cc" stroke-width="3" stroke-linecap="round"><line x1="14" y1="46" x2="50" y2="46"/><line x1="18" y1="53" x2="46" y2="53"/></g>'; break;
      case 'rainy': b = CLOUD(14, '#aab3c0') + DROPS(42, 3); break;
      case 'pouring': b = CLOUD(12, '#98a2b0') + DROPS(40, 4); break;
      case 'snowy': b = CLOUD(14, '#cfd6e0') + FLAKES(42); break;
      case 'snowy-rainy': b = CLOUD(14, '#b8c0cc') + DROPS(42, 2) + `<circle cx="42" cy="47" r="2.6" fill="#e8f1ff"/>`; break;
      case 'hail': b = CLOUD(14, '#aab3c0') + `<g fill="#dbe7ff">${[24, 33, 42].map((x) => `<circle cx="${x}" cy="48" r="3"/>`).join('')}</g>`; break;
      case 'lightning': b = CLOUD(12, '#98a2b0') + BOLT(38); break;
      case 'lightning-rainy': b = CLOUD(12, '#98a2b0') + BOLT(38) + DROPS(42, 1); break;
      case 'windy': case 'windy-variant': b = (c === 'windy-variant' ? CLOUD(8, '#cbd2db') : '') + '<g stroke="#cbd2db" stroke-width="3.5" stroke-linecap="round" fill="none"><path d="M10 38h30a6 6 0 1 0-6-6"/><path d="M10 46h38a6 6 0 1 1-6 6"/></g>'; break;
      default: b = CLOUD(22, '#cbd2db');
    }
    return `<svg viewBox="0 0 64 64">${b}</svg>`;
  }
  const SUNRISE = `<svg viewBox="0 0 64 64"><path d="M14 44a18 18 0 0 1 36 0" fill="#ffc53d"/><path d="M6 46h52" stroke="#ffc53d" stroke-width="3.5" stroke-linecap="round"/><path d="M32 8v12M25 14l7-7 7 7" stroke="#ffc53d" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const SUNSET = `<svg viewBox="0 0 64 64"><path d="M14 44a18 18 0 0 1 36 0" fill="#ff8a4c"/><path d="M6 46h52" stroke="#ff8a4c" stroke-width="3.5" stroke-linecap="round"/><path d="M32 8v12M25 14l7 7 7-7" stroke="#ff8a4c" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  // farba teploty pre pruhy a krivku
  function tcol(t) {
    const S = [[-10, [150, 170, 255]], [0, [124, 196, 255]], [8, [125, 220, 192]], [15, [255, 210, 122]], [25, [255, 159, 106]], [35, [255, 105, 97]]];
    if (t <= S[0][0]) return `rgb(${S[0][1]})`;
    for (let i = 1; i < S.length; i++) if (t <= S[i][0]) {
      const a = S[i - 1], b = S[i], k = (t - a[0]) / (b[0] - a[0]);
      return `rgb(${[0, 1, 2].map((j) => Math.round(a[1][j] + (b[1][j] - a[1][j]) * k)).join(',')})`;
    }
    return `rgb(${S[S.length - 1][1]})`;
  }

  const CSS = `
    ha-card { padding: 12px 18px 16px; overflow: hidden; }
    .top { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 13px; font-weight: 600; color: var(--secondary-text-color); letter-spacing: .02em; cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
    .top .ic svg { width: 20px; height: 20px; display: block; margin: -2px 0; }
    .top .ttl { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chev { flex: none; color: var(--secondary-text-color); display: flex; }
    .chev svg { width: 18px; height: 18px; transition: transform .3s; }
    ha-card.col .chev svg { transform: rotate(-90deg); }
    ha-card.col .xp { display: none; }
    .box + .box { margin-top: 10px; } .box { border-radius: 18px; background: var(--hc-surface, rgba(127,127,127,.1)); box-shadow: inset 0 0 0 1px var(--hc-surface-line, transparent); }
    .gb { padding: 6px 12px; }
    .sw { overflow-x: auto; overflow-y: hidden; margin: 0 -12px; padding: 0 12px; scrollbar-width: none; -webkit-overflow-scrolling: touch; cursor: grab;
      mask-image: linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 22px), transparent 100%); -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 22px), transparent 100%); }
    .sw::-webkit-scrollbar { display: none; }
    .sw.drag { cursor: grabbing; }
    .strip { display: flex; width: max-content; }
    .hc { width: 50px; flex: none; text-align: center; padding: 6px 0 6px; border-radius: 14px; font-variant-numeric: tabular-nums; user-select: none; -webkit-user-select: none; }
    .hc .h { font-size: 11.5px; color: var(--secondary-text-color); white-space: nowrap; }
    .hc > i { display: block; width: 28px; height: 28px; margin: 9px auto 7px; }
    .hc > i svg { width: 28px; height: 28px; display: block; }
    .hc .t { font-size: 16px; font-weight: 500; color: var(--primary-text-color); }
    .hc .t.sm { font-size: 11px; font-weight: 400; color: var(--secondary-text-color); line-height: 22px; }
    .hc .r { font-size: 10.5px; color: ${COL.rain}; height: 14px; white-space: nowrap; }
    .hc { position: relative; isolation: isolate; }
    /* FVE: pozadie stĺpca (predvolené) – výška = výroba v danej hodine */
    .hc > i { position: relative; }
    .hc .ring { position: absolute; inset: -6px; width: 40px !important; height: 40px !important; transform: rotate(-90deg); fill: none; stroke: #ffb340; stroke-width: 2.4; stroke-linecap: round; pointer-events: none; }
    .hc .ring .rt { stroke: rgba(255,179,64,.16); }
    /* výroba FVE v kWh – malý štítok v rohu ikony, nezaberá riadok */
    .hc .pk { position: absolute; right: -18px; bottom: -4px; font-style: normal; font-size: 9.5px; font-weight: 600; line-height: 1; color: #ffc361;
      padding: 1px 3px; border-radius: 6px; background: rgba(20,18,28,.55); white-space: nowrap; }
    .hc.past .ring, .hc.past .pk { opacity: .5; }
    .hc.now { background: rgba(255,255,255,.09); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
    .hc.now .h { color: var(--primary-text-color); font-weight: 600; }
    .hc.past > i, .hc.past .t, .hc.past .h { opacity: .5; }
    .hc.day { box-shadow: inset 1px 0 0 rgba(127,127,127,.35); border-radius: 0 14px 14px 0; }
    .hc.day .h { color: var(--primary-text-color); font-weight: 600; }
    .hc.sun { width: 46px; }
    .d { display: grid; grid-template-columns: 40px 26px 30px 1fr 30px 76px; align-items: center; gap: 8px; padding: 0 12px; min-height: 46px; position: relative; font-variant-numeric: tabular-nums; }
    .d + .d::before { content: ''; position: absolute; left: 12px; right: 0; top: 0; height: 1px; background: rgba(127,127,127,.18); }
    .d .n { font-size: 14px; font-weight: 500; color: var(--primary-text-color); line-height: 1.15; white-space: nowrap; }
    .d .wi { margin-left: -4px; }
    .rb em { position: absolute; top: 50%; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 2px rgba(0,0,0,.3); }
    .d .n small { display: block; font-size: 11px; font-weight: 500; color: ${COL.rain}; }
    .d .wi svg { width: 24px; height: 24px; display: block; }
    .d .lo { font-size: 13px; color: var(--secondary-text-color); text-align: right; }
    .d .hi { font-size: 14px; color: var(--primary-text-color); }
    .rb { position: relative; height: 6px; border-radius: 99px; background: rgba(127,127,127,.18); }
    .rb i { position: absolute; top: 0; bottom: 0; border-radius: 99px; }
    .pv { display: flex; align-items: center; justify-content: flex-end; gap: 5px; font-size: 13px; color: var(--primary-text-color); white-space: nowrap; }
    .pv small { color: var(--secondary-text-color); font-size: 11px; }
    .pv u { display: block; width: 20px; height: 4px; border-radius: 99px; background: rgba(127,127,127,.2); overflow: hidden; }
    .pv u i { display: block; height: 100%; background: ${COL.sol}; border-radius: 99px; }
    .msg { font-size: 13px; color: var(--secondary-text-color); padding: 8px 0; }
  `;

  class HomeWeatherCard extends HTMLElement {
    static getConfigElement() { return document.createElement('igy-weather-card-editor'); }
    static getStubConfig(hass) {
      const st = hass ? hass.states : {}, find = (re) => Object.keys(st).find((id) => re.test(id));
      const c = { entity: find(/^weather\./) || 'weather.forecast_home' };
      const t = find(/^sensor\.solcast_pv_forecast_forecast_today/), r = find(/^sensor\.solcast_pv_forecast_forecast_remaining_today/);
      if (t) c.solar_today = t; if (r) c.solar_remaining = r;
      const ds = [find(/^sensor\.solcast_pv_forecast_forecast_tomorrow/), find(/^sensor\.solcast_pv_forecast_forecast_day_3/), find(/^sensor\.solcast_pv_forecast_forecast_day_4/)].filter(Boolean);
      if (ds.length) c.solar_days = ds;
      return c;
    }
    setConfig(c) {
      if (!c || !c.entity) throw new Error('Zadaj entitu počasia (entity: weather.…)');
      const old = this._cfg;
      this._cfg = Object.assign({ collapsible: true }, c);
      this._built = false; this._col = null;
      if (old && (old.entity !== c.entity)) { this._unsub(); this._fc = {}; }
      if (old && (old.solar_power !== c.solar_power || old.temperature_sensor !== c.temperature_sensor)) this._hist = null;
      if (this._hass) { this._render(); this._start(); }
    }
    set hass(h) { const first = !this._hass; this._hass = h; if (!this._cfg) return; this._render(); if (first) this._start(); }
    connectedCallback() { if (this._hass && this._cfg) { this._start(); requestAnimationFrame(() => this._toNow(false)); } }
    disconnectedCallback() { clearTimeout(this._backT); this._unsub(); clearInterval(this._hT); this._hT = null; }
    getCardSize() { return this._col ? 4 : 8; }
    getGridOptions() { return { columns: 12, min_columns: 6 }; }

    _lang() { return (this._hass.locale && this._hass.locale.language) || 'sk'; }
    _nf(v, d) { return Number(v).toLocaleString(this._lang(), { minimumFractionDigits: d, maximumFractionDigits: d }); }
    _st(id) { return id && this._hass.states[id]; }
    _ls(v) {
      const k = 'hwc-col:' + this._cfg.entity;
      try { if (v === undefined) { const x = localStorage.getItem(k); return x == null ? this._cfg.collapsed !== false : x === '1'; } localStorage.setItem(k, v ? '1' : '0'); } catch (_) { return this._cfg.collapsed !== false; }
      return null;
    }

    /* ---------- dáta: predpoveď (odber), história dnes ---------- */
    _start() {
      if (!this.isConnected || !this._hass || !this._cfg) return;
      this._fc = this._fc || {};
      if (!this._subs) {
        this._subs = ['hourly', 'daily'].map((type) => this._hass.connection.subscribeMessage((ev) => {
          this._fc[type] = ev.forecast || []; if (type === 'hourly') this._cacheFc(this._fc.hourly); this._sig = ''; this._render();
        }, { type: 'weather/subscribe_forecast', forecast_type: type, entity_id: this._cfg.entity }).catch((e) => { console.warn('igy-weather-card: predpoveď ' + type, e); return null; }));
      }
      if (!this._hT) { this._loadHist(); this._hT = setInterval(() => this._loadHist(), 10 * 60000); }
    }
    // hodinová predpoveď sa ukladá na zariadení – keď entita počasia nemá históriu, uplynulé hodiny sa doplnia z nej
    _cacheFc(list) {
      const d0 = new Date(); d0.setHours(0, 0, 0, 0); const key = 'hwc-fc:' + this._cfg.entity, day = d0.toDateString();
      let C = {}; try { const o = JSON.parse(localStorage.getItem(key) || '{}'); if (o.day === day) C = o.h || {}; } catch (_) { }
      const now = Date.now();
      list.forEach((f) => { const t = Date.parse(f.datetime); if (t >= d0.getTime() && t < d0.getTime() + 86400000 && (t >= now - 3600000 || !C[t])) C[t] = [f.temperature, f.condition]; });
      this._fcCache = C;
      try { localStorage.setItem(key, JSON.stringify({ day, h: C })); } catch (_) { }
    }
    _cached() {
      if (this._fcCache) return this._fcCache;
      try { const o = JSON.parse(localStorage.getItem('hwc-fc:' + this._cfg.entity) || '{}'); const d0 = new Date(); d0.setHours(0, 0, 0, 0); this._fcCache = o.day === d0.toDateString() ? o.h || {} : {}; } catch (_) { this._fcCache = {}; }
      return this._fcCache;
    }
    _unsub() { (this._subs || []).forEach((p) => p.then((u) => u && u()).catch(() => { })); this._subs = null; }
    async _loadHist() {
      const c = this._cfg, d0 = new Date(); d0.setHours(0, 0, 0, 0);
      const ids = [c.entity, c.temperature_sensor, c.solar_power].filter(Boolean);
      try {
        const r = await this._hass.callWS({ type: 'history/history_during_period', start_time: d0.toISOString(), entity_ids: ids, minimal_response: false, no_attributes: false, significant_changes_only: false });
        const H = { temp: [], cond: [], pv: [] }, ts = (x) => ((x.lu != null ? x.lu : x.lc) || 0) * 1000;
        let a = {};
        (r[c.entity] || []).forEach((x) => { if (x.a) a = x.a; const t = Math.max(d0.getTime(), ts(x)); H.cond.push([t, x.s]); if (!c.temperature_sensor && a.temperature != null) H.temp.push([t, +a.temperature]); });
        if (c.temperature_sensor) (r[c.temperature_sensor] || []).forEach((x) => { const v = parseFloat(x.s); if (!isNaN(v)) H.temp.push([Math.max(d0.getTime(), ts(x)), v]); });
        if (c.solar_power) {
          let u = '';
          (r[c.solar_power] || []).forEach((x) => { if (x.a && x.a.unit_of_measurement) u = x.a.unit_of_measurement; const v = parseFloat(x.s); if (!isNaN(v)) H.pv.push([Math.max(d0.getTime(), ts(x)), v]); });
          const k = u === 'W' || (!u && Math.max(0, ...H.pv.map((p) => p[1])) > 100) ? 0.001 : 1; H.pv = H.pv.map(([t, v]) => [t, Math.max(0, v * k)]);
        }
        if (!(r[c.entity] || []).length) console.info('igy-weather-card: ' + c.entity + ' nemá históriu (vylúčená z recordera?) – priebeh teploty dnes nastav cez temperature_sensor.');
        this._hist = H; this._sig = ''; this._render();
      } catch (e) { console.warn('igy-weather-card: história', e); }
    }

    /* ---------- výpočty ---------- */
    _sun() {
      const s = this._st('sun.sun'); if (!s) return null;
      const d0 = new Date(); d0.setHours(0, 0, 0, 0); const d1 = d0.getTime() + 86400000;
      const fix = (iso) => { let t = Date.parse(iso); if (isNaN(t)) return null; while (t >= d1) t -= 86400000; while (t < d0.getTime()) t += 86400000; return t; };
      return { rise: fix(s.attributes.next_rising), set: fix(s.attributes.next_setting) };
    }
    // noc podľa času dňa – funguje aj pre zajtrajšie hodiny (východ/západ sa medzi dňami posunú len o pár minút)
    _isNight(t, sun) {
      const md = (x) => { const d = new Date(x); return d.getHours() * 60 + d.getMinutes(); };
      if (!sun || sun.rise == null || sun.set == null) { const h = new Date(t).getHours(); return h < 6 || h >= 19; }
      const m = md(t); return m < md(sun.rise) || m > md(sun.set);
    }
    _hm(t) { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
    // priemer do košov (min) – krokový priebeh
    _bins(pts, t0, t1, step) {
      const out = []; if (!pts.length) return out; let k = 0, last = null;
      for (let a = t0; a < t1; a += step) {
        const b = Math.min(t1, a + step); let sum = 0, w = 0, t = a;
        while (k < pts.length && pts[k][0] <= a) { last = pts[k][1]; k++; }
        let j = k;
        while (j < pts.length && pts[j][0] < b) { if (last != null) { sum += last * (pts[j][0] - t); w += pts[j][0] - t; } t = pts[j][0]; last = pts[j][1]; j++; }
        if (last != null) { sum += last * (b - t); w += b - t; }
        k = j; out.push([a + (b - a) / 2, w ? sum / w : null]);
      }
      return out;
    }

    // hodinový pás: dnes od polnoci do „teraz + 24 h“ (posúva sa doprava), s východom/západom slnka
    _strip() {
      const c = this._cfg, fc = this._fc || {}, H = this._hist || { temp: [], cond: [], pv: [] }, now = Date.now(), HR = 3600000;
      const d0 = new Date(); d0.setHours(0, 0, 0, 0); const t0 = d0.getTime();
      const sun = this._sun(), ws = this._st(c.entity), ts = this._st(c.temperature_sensor);
      const curT = ts && !isNaN(parseFloat(ts.state)) ? parseFloat(ts.state) : ws && ws.attributes.temperature;
      const hourly = (fc.hourly || []).map((f) => ({ t: Date.parse(f.datetime), f })).filter((x) => !isNaN(x.t));
      // uplynulé hodiny: história (alebo uložená predpoveď z rána)
      const C = this._cached(), cpts = Object.keys(C).map((k) => [+k, C[k]]).filter((x) => x[0] < now).sort((a, b) => a[0] - b[0]);
      const pastT = (H.temp.length ? H.temp : cpts.filter((x) => x[1][0] != null).map((x) => [x[0], +x[1][0]])).filter((p) => p[0] <= now).sort((a, b) => a[0] - b[0]);
      const pastC = H.cond.length ? H.cond : cpts.filter((x) => x[1][1]).map((x) => [x[0], x[1][1]]);
      const tAt = (t) => { if (!pastT.length || t < pastT[0][0] - 1800000) return null; let v = null; pastT.forEach((p) => { if (p[0] <= t + 1800000) v = p[1]; }); return v; };
      const cAt = (t) => { let v = null; pastC.forEach((p) => { if (p[0] <= t + 1800000) v = p[1]; }); return v; };
      const fAt = (t) => hourly.find((x) => Math.abs(x.t - t) < 1800000);
      // FVE: predpoveď kWh za hodinu (Solcast 30-min kW × 0,5 h) dnes + zajtra, skutočnosť z histórie výkonu
      const det = [c.solar_today].concat((c.solar_days || []).slice(0, 1)).map((id) => this._st(id)).filter(Boolean)
        .flatMap((s) => s.attributes.detailedForecast || s.attributes.detailed_forecast || []);
      const pvF = {}; det.forEach((x) => { const t = Date.parse(x.period_start), h = Math.floor(t / HR) * HR; pvF[h] = (pvF[h] || 0) + (+(x.pv_estimate != null ? x.pv_estimate : x.pv_estimate50 || 0)) * 0.5; });
      const act = c.solar_power ? this._bins(H.pv, t0, Math.floor(now / HR) * HR, HR) : [];
      const pvA = {}; act.forEach((p) => { if (p[1] != null) pvA[Math.floor(p[0] / HR) * HR] = p[1]; });
      const cols = [], tEnd = Math.floor(now / HR) * HR + 24 * HR;
      for (let t = t0; t <= tEnd; t += HR) {
        const cur = t <= now && now < t + HR, past = t + HR <= now, f = fAt(t);
        const temp = cur && curT != null ? +curT : !past && f && f.f.temperature != null ? +f.f.temperature : tAt(t);
        const cond = cur ? (ws && ws.state) : !past && f ? f.f.condition : cAt(t);
        let rain = '';
        if (!past && f) { const pp = f.f.precipitation_probability, mm = f.f.precipitation; rain = pp != null ? (pp >= 20 ? pp + ' %' : '') : (mm >= 0.1 ? this._nf(mm, 1) + ' mm' : ''); }
        const pv = past && pvA[t] != null ? pvA[t] : pvF[t] != null ? pvF[t] : (past ? pvA[t] : null);
        const dm = new Date(t);
        cols.push({ t, cur, past, temp, cond, rain, pv, real: past && pvA[t] != null, lab: cur ? 'Teraz' : dm.getHours() === 0 && t > t0 ? 'Zajtra' : String(dm.getHours()).padStart(2, '0') });
        // východ / západ slnka v tejto hodine
        if (sun) [[sun.rise, 'rise'], [sun.set, 'set'], [sun.rise && sun.rise + 86400000, 'rise'], [sun.set && sun.set + 86400000, 'set']].forEach(([st, k]) => {
          if (st && st >= t && st < t + HR && st <= tEnd) cols.push({ sun: k, t: st, past: st < now, lab: this._hm(st) });
        });
      }
      const html = cols.map((x) => {
        if (x.sun) return `<div class="hc sun${x.past ? ' past' : ''}"><div class="h">${x.lab}</div><i>${x.sun === 'rise' ? SUNRISE : SUNSET}</i><div class="t sm">${x.sun === 'rise' ? 'východ' : 'západ'}</div><div class="r"></div></div>`;
        // prstenec: plný kruh = ring_max kWh za hodinu (predvolene 9)
        const rg = x.pv != null && x.pv >= 0.05 ? Math.max(3, Math.min(100, x.pv / (+this._cfg.ring_max || 9) * 100)) : 0;
        return `<div class="hc${x.cur ? ' now' : ''}${x.past ? ' past' : ''}${x.lab === 'Zajtra' ? ' day' : ''}"${x.cur ? ' id="nowc"' : ''}>
          <div class="h">${x.lab}</div><i>${x.cond ? wicon(x.cond, this._isNight(x.t + 1800000, sun)) : ''}${rg ? `<svg class="ring" viewBox="0 0 40 40"><circle class="rt" cx="20" cy="20" r="18"/><circle cx="20" cy="20" r="18" pathLength="100" stroke-dasharray="${rg.toFixed(1)} 100"/></svg><em class="pk">${this._nf(x.pv, x.pv < 10 ? 1 : 0)}</em>` : ''}</i>
          <div class="t">${x.temp != null ? Math.round(x.temp) + '°' : '–'}</div><div class="r">${x.rain}</div></div>`;
      }).join('');
      return { html, rain: hourly };
    }
    _toNow(smooth) {
      const sw = this.shadowRoot && this.shadowRoot.getElementById('sw'), nc = this.shadowRoot && this.shadowRoot.getElementById('nowc');
      if (!sw || !nc || !sw.clientWidth) return;
      this._autoScroll = true; this._scrolledAt = 0;
      sw.scrollTo({ left: Math.max(0, nc.offsetLeft - 12 - 50), behavior: smooth ? 'smooth' : 'auto' });
      setTimeout(() => { this._autoScroll = false; }, smooth ? 800 : 50);
    }
    // posúvanie ťahaním myšou (dotyk a touchpad fungujú natívne)
    _dragBind(sw) {
      // po návrate na dashboard (karta bola skrytá) skočí späť na „Teraz“
      if (window.ResizeObserver) {
        let w = sw.clientWidth;
        new ResizeObserver(() => { const nw = sw.clientWidth; if (nw > 0 && w === 0) this._toNow(false); w = nw; }).observe(sw);
      }
      let x0 = 0, s0 = 0, on = false, moved = false;
      // po 20 s bez posúvania sa pás plynulo vráti na „Teraz“
      sw.addEventListener('scroll', () => {
        if (this._autoScroll) return;
        this._scrolledAt = Date.now(); clearTimeout(this._backT);
        this._backT = setTimeout(() => this._toNow(true), 20000);
      }, { passive: true });
      sw.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; on = true; moved = false; x0 = e.clientX; s0 = sw.scrollLeft; });
      sw.addEventListener('pointermove', (e) => { if (!on) return; const dx = e.clientX - x0; if (Math.abs(dx) > 4) { moved = true; sw.classList.add('drag'); } sw.scrollLeft = s0 - dx; });
      const end = () => { on = false; sw.classList.remove('drag'); };
      sw.addEventListener('pointerup', end); sw.addEventListener('pointerleave', end);
      sw.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);
    }

    /* ---------- vykreslenie ---------- */
    _render() {
      if (!this._hass || !this._cfg) return;
      const c = this._cfg, ws = this._st(c.entity);
      const ids = [c.entity, c.temperature_sensor, c.solar_today, c.solar_remaining, c.solar_power, 'sun.sun'].concat(c.solar_days || []);
      const sig = ids.map((id) => { const s = this._st(id); return s ? s.state + (s.last_updated || '') : '-'; }).join('|') + Math.floor(Date.now() / 300000);
      if (this._built && sig === this._sig) return;
      this._sig = sig;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      if (!this._built) {
        this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card><div id="c"></div></ha-card>`;
        this._card = this.shadowRoot.querySelector('ha-card'); this._built = true;
        if (c.collapsible !== false) { if (this._col == null) this._col = this._ls(); } else this._col = false;
        this._card.classList.toggle('col', !!this._col);
        this._card.addEventListener('click', (e) => {
          const t = e.target.closest('[data-more]');
          if (t) { this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: t.dataset.more }, bubbles: true, composed: true })); return; }
          if (e.target.closest('.top') && c.collapsible !== false) {
            this._col = !this._col; this._card.classList.toggle('col', this._col); this._ls(this._col);
            this.dispatchEvent(new Event('iron-resize', { bubbles: true, composed: true }));
          }
        });
      }
      const box = this.shadowRoot.getElementById('c');
      if (!ws) { box.innerHTML = `<div class="msg">Entita ${esc(c.entity)} neexistuje.</div>`; return; }
      const a = ws.attributes, fc = this._fc || {}, now = Date.now(), sun = this._sun();
      const ts = this._st(c.temperature_sensor), curT = ts && !isNaN(parseFloat(ts.state)) ? parseFloat(ts.state) : a.temperature;
      const tu = (ts && ts.attributes.unit_of_measurement) || a.temperature_unit || '°C';
      // dnešné max/min a ďalšie dni z dennej predpovede
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const daily = (fc.daily || []).map((f) => ({ t: Date.parse(f.datetime), f })).filter((x) => !isNaN(x.t));
      const dToday = daily.find((x) => new Date(x.t).toDateString() === today.toDateString());
      const next = daily.filter((x) => x.t >= today.getTime() + 86400000 - 3600000 && new Date(x.t).toDateString() !== today.toDateString()).slice(0, 3);
      const ch = this._strip();
      const night = this._isNight(now, sun);
      // FVE dnes
      const so = this._st(c.solar_today), sr = this._st(c.solar_remaining);
      const kwh = (s) => { if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v * (/^Wh$/i.test(s.attributes.unit_of_measurement || '') ? 0.001 : 1); };
      const pvT = kwh(so), pvR = kwh(sr);
      // ďalšie dni
      const dkwh = (c.solar_days || []).map((id) => kwh(this._st(id)));
      const dmax = Math.max(1, ...dkwh.filter((v) => v != null), pvT || 0);
      const rows = (dToday ? [dToday] : []).concat(next), today1 = !!dToday;
      const lows = rows.map((x) => x.f.templow != null ? x.f.templow : x.f.temperature).concat(curT != null && today1 ? [+curT] : []), highs = rows.map((x) => x.f.temperature).concat(curT != null && today1 ? [+curT] : []);
      const gmin = Math.min(...lows), gmax = Math.max(...highs), gr = Math.max(1, gmax - gmin);
      const days = rows.map((x, j) => {
        const isT = today1 && j === 0, i = today1 ? j - 1 : j;
        const f = x.f, d = new Date(x.t), lo2 = f.templow != null ? f.templow : f.temperature, hi2 = f.temperature, l = (lo2 - gmin) / gr * 100, w = Math.max(3, (hi2 - lo2) / gr * 100);
        const nm = isT ? 'Dnes' : ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'][d.getDay()];
        const pr = f.precipitation_probability != null ? (f.precipitation_probability >= 20 ? f.precipitation_probability + ' %' : '') : (f.precipitation >= 0.5 ? this._nf(f.precipitation, f.precipitation < 10 ? 1 : 0) + ' mm' : '');
        const pv = isT ? pvT : dkwh[i], pid = isT ? c.solar_today : c.solar_days && c.solar_days[i];
        const dot = isT && curT != null ? `<em style="left:${((curT - gmin) / gr * 100).toFixed(1)}%"></em>` : '';
        return `<div class="d"><span class="n">${esc(nm)}${pr ? `<small>${pr}</small>` : ''}</span><span class="wi">${wicon(isT ? ws.state : f.condition, isT && night)}</span>
          <span class="lo">${Math.round(lo2)}°</span><div class="rb"><i style="left:${l.toFixed(1)}%;width:${Math.min(100 - l, w).toFixed(1)}%;background:linear-gradient(90deg,${tcol(lo2)},${tcol(hi2)})"></i>${dot}</div><span class="hi">${Math.round(hi2)}°</span>
          <span class="pv"${pid ? ` data-more="${pid}"` : ''}>${pv != null ? `${this._nf(pv, 1)}<small>kWh</small><u><i style="width:${Math.min(100, pv / dmax * 100).toFixed(0)}%"></i></u>` : ''}</span></div>`;
      }).join('');
      const html = `
        <div class="top"><span class="ic">${wicon(ws.state, night)}</span><span class="ttl">${esc(c.title || 'Počasie')}</span>${c.collapsible !== false ? `<span class="chev">${ui(UI.chev)}</span>` : ''}</div>
        <div class="box gb">
          <div class="sw" id="sw"><div class="strip">${ch.html}</div></div>
        </div>
        ${days ? `<div class="box xp">${days}</div>` : ''}`;
      if (box.__h !== html) {
        const old = this.shadowRoot.getElementById('sw'), sl = old ? old.scrollLeft : null;
        box.__h = html; box.innerHTML = html;
        const sw = this.shadowRoot.getElementById('sw');
        if (sw) {
          // pri prvom zobrazení (alebo po minúte bez posúvania) skočí na „Teraz“, inak ostane kde bol
          const nc = this.shadowRoot.getElementById('nowc');
          if (sl != null && Date.now() - (this._scrolledAt || 0) < 60000) sw.scrollLeft = sl;
          else requestAnimationFrame(() => this._toNow(false));
          this._dragBind(sw);
        }
      }
    }
  }

  /* ================= Editor ================= */
  class HomeWeatherCardEditor extends HTMLElement {
    setConfig(c) { this._cfg = Object.assign({}, c); if (this._f) this._f.data = this._data(); }
    _data() { const c = this._cfg || {}; return Object.assign({ collapsible: true, collapsed: true }, c); }
    set hass(h) {
      this._hass = h;
      if (!this._f) {
        const f = this._f = document.createElement('ha-form');
        const sens = (n) => ({ name: n, selector: { entity: { domain: ['sensor', 'input_number', 'number'] } } });
        f.schema = [
          { name: 'entity', required: true, selector: { entity: { domain: 'weather' } } },
          { name: 'title', selector: { text: {} } },
          sens('temperature_sensor'),
          { type: 'expandable', name: '', title: 'Predpoveď výroby FVE (Solcast)', icon: 'mdi:solar-power-variant', expanded: true, schema: [
            sens('solar_today'), sens('solar_remaining'), { name: 'solar_days', selector: { entity: { domain: 'sensor', multiple: true } } }, sens('solar_power')] },
          { type: 'grid', name: '', schema: [{ name: 'collapsible', selector: { boolean: {} } }, { name: 'collapsed', selector: { boolean: {} } }] }
        ];
        const L = { entity: 'Entita počasia', title: 'Miesto (voliteľné)', temperature_sensor: 'Vonkajší teplomer (voliteľné)', solar_today: 'Predpoveď na dnes', solar_remaining: 'Zostáva dnes',
          solar_days: 'Predpoveď na ďalšie dni (zajtra, +2, +3)', solar_power: 'Skutočná výroba – výkon (voliteľné)', collapsible: 'Zbaliteľná', collapsed: 'Na začiatku zbalená' };
        const Hh = { entity: 'Napr. Met.no alebo Open-Meteo – musí vedieť hodinovú a dennú predpoveď.', title: 'Zobrazí sa pod stavom počasia. Prázdne = názov entity.',
          temperature_sensor: 'Ak ho máš, karta ukáže jeho teplotu a dnešný priebeh namiesto údajov z predpovede.',
          solar_today: 'Solcast „forecast today“ – z atribútu detailedForecast sa kreslí krivka.', solar_days: 'V poradí zajtra, pozajtra, popozajtra.',
          solar_power: 'Uplynulá časť dňa sa nakreslí sýtou farbou podľa skutočnosti.', collapsed: 'Zbalená ukazuje len hlavičku a graf dňa.' };
        f.computeLabel = (x) => L[x.name] || x.title || x.name;
        f.computeHelper = (x) => Hh[x.name];
        f.addEventListener('value-changed', (e) => {
          const v = e.detail.value, c = { type: (this._cfg && this._cfg.type) || 'custom:igy-weather-card' };
          Object.keys(v).forEach((k) => { if (k === 'type' || v[k] === '' || v[k] == null || (Array.isArray(v[k]) && !v[k].length)) return; if ((k === 'collapsible' || k === 'collapsed') && v[k] === true) return; c[k] = v[k]; });
          this._cfg = c;
          this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: c }, bubbles: true, composed: true }));
        });
        this.appendChild(f);
      }
      this._f.hass = h; this._f.data = this._data();
    }
  }

  if (!customElements.get('igy-weather-card-editor')) customElements.define('igy-weather-card-editor', HomeWeatherCardEditor);
  if (!customElements.get('igy-weather-card')) customElements.define('igy-weather-card', HomeWeatherCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-weather-card'))
    window.customCards.push({ type: 'igy-weather-card', name: 'Igy Weather Card', description: 'Počasie s grafom dňa a predpoveďou výroby FVE (Solcast).', preview: true });
  console.info('%c IGY-WEATHER-CARD %c ' + VERSION + ' ', 'background:#64b5ff;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();

/* ===== igy-thermostat-card ===== */
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

/* ===== igy-room-card ===== */
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

/* ===== igy-entities-card ===== */
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
      if (!c) throw new Error('Chybná konfigurácia.');
      this._config = normalize(c); this._card = null; this._open = null; this._edit = null; this._gpts = null;
      if (this._hass) this._render();
      this._gStart();
    }
    set hass(h) { const first = !this._hass; this._hass = h; this._render(); if (first) this._gStart(); }
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
      if (isNaN(m)) return ''; if (m < 1) return 'práve teraz'; if (m < 60) return `pred ${m} min`;
      const h = Math.floor(m / 60); if (h < 24) return `pred ${h} h`; const d = Math.floor(h / 24); return d === 1 ? 'včera' : `pred ${d} d`;
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
            html += `<div class="more${ms[i] ? ' o' : ''}" data-m="${i}"><div class="mt"><span class="ic">${ICO_MORE}</span><span class="nm"><b><span class="ms">Ďalšie</span><span class="mh">Skryť</span></b></span><span class="mc">@@N${i}@@</span><span class="chev">${ICO_CHEV}</span></div><div class="mb">`;
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
        if (!s) sec = 'entita nenájdená';
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
      if (k === 'run') return `<span class="pill run"><span>${dom(e.entity) === 'scene' ? 'Aktivovať' : 'Spustiť'}</span></span>`;
      if (k === 'text') return `<span class="pill"><span>Upraviť</span></span>`;
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
  const SEC_OPTS = [{ value: 'none', label: 'Nič' }, { value: 'last-changed', label: 'Posledná zmena' }, { value: 'last-updated', label: 'Posledná aktualizácia' }, { value: 'entity-id', label: 'ID entity' }];

  class HomeEntitiesCardEditor extends HTMLElement {
    setConfig(config) {
      const c = normalize(config);
      if (this._last && JSON.stringify(c) === this._last) return;
      this._cfg = c; this._last = JSON.stringify(c);
      if (this._hass) this._build();
    }
    set hass(h) {
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
        <div class="sec">Entity</div>
        <div class="hint">Poradie zmeníš potiahnutím za ⠿. Ťukni na položku pre názov, ikonu a druhý riadok. Oddeľovač začne novú skupinu.</div>
        <div class="items" id="items"></div>
        <div class="add"><div class="lbl">+ Pridať entitu</div><div id="addp"></div></div>
        <button class="btn" id="adddiv">+ Pridať oddeľovač</button>
        <div class="sec">Graf dole</div>
        <div id="graph"></div>
      </div>`;
      const c = this._cfg;
      this.querySelector('#top').appendChild(this._form({ title: c.title || '', icon: c.icon || '', state_color: c.state_color !== false },
        [{ name: 'title', selector: { text: {} } }, { name: 'icon', selector: { icon: {} } }, { name: 'state_color', selector: { boolean: {} } }],
        { title: 'Nadpis karty (voliteľné)', icon: 'Ikona pri nadpise', state_color: 'Zafarbiť ikonu, keď je zapnuté' },
        (v) => { ['title', 'icon'].forEach((k) => { if (v[k]) c[k] = v[k]; else delete c[k]; }); if (v.state_color === false) c.state_color = false; else c.state_color = true; this._emit(); }));
      const box = this.querySelector('#items');
      c.entities.forEach((e, i) => box.appendChild(this._item(e, i, open.has(i))));
      this.querySelector('#addp').appendChild(this._form({}, [{ name: 'entity', selector: { entity: {} } }], { entity: 'Vyber entitu' }, (v) => {
        if (!v.entity) return; c.entities.push({ entity: v.entity }); this._emit(); this._open = new Set(); this._build();
      }));
      this.querySelector('#adddiv').onclick = () => { c.entities.push({ type: 'divider' }); this._emit(); this._open = new Set([c.entities.length - 1]); this._build(); };
      const g = c.graph || {};
      this.querySelector('#graph').appendChild(this._form({ entity: g.entity || '', hours: g.hours || 12 },
        [{ name: 'entity', selector: { entity: { domain: 'sensor' } } }, { name: 'hours', selector: { number: { min: 1, max: 168, step: 1, mode: 'box', unit_of_measurement: 'h' } } }],
        { entity: 'Entita grafu (prázdne = bez grafu)', hours: 'Koľko hodín dozadu' },
        (v) => { if (v.entity) c.graph = { entity: v.entity, hours: Number(v.hours) || 12 }; else delete c.graph; this._emit(); }));
    }

    _item(e, i, isOpen) {
      const c = this._cfg, it = document.createElement('div'), isDiv = e.type === 'divider';
      it.className = 'it' + (isOpen ? ' open' : '') + (isDiv ? ' div' : '');
      const s = !isDiv && this._hass.states[e.entity];
      it.innerHTML = `<div class="ih"><span class="hd" title="Potiahni pre zmenu poradia">⠿</span><span class="tx"><b></b><small></small></span>
        <button class="ib exp" title="Upraviť">${ICO.down}</button><button class="ib del" title="Odstrániť">${ICO.del}</button></div><div class="body"></div>`;
      const setTx = () => {
        it.querySelector('.tx b').textContent = isDiv ? (e.label ? 'Skupina: ' + e.label : '— oddeľovač —') : e.name || (s && s.attributes.friendly_name) || e.entity;
        const sm = it.querySelector('.tx small'); sm.className = !isDiv && !s ? 'warn' : '';
        sm.textContent = isDiv ? 'začína novú skupinu' : (s ? e.entity : e.entity + ' – entita neexistuje') + (e.collapsed ? ' · zbalená' : '');
      };
      setTx();
      const toggle = () => { it.classList.toggle('open'); this._open = new Set([...this.querySelectorAll('.it')].map((x, k) => x.classList.contains('open') ? k : -1).filter((k) => k >= 0)); };
      it.querySelector('.tx').onclick = toggle; it.querySelector('.exp').onclick = toggle;
      it.querySelector('.del').onclick = () => { c.entities.splice(i, 1); this._emit(); this._open = new Set(); this._build(); };
      const f = isDiv
        ? this._form({ label: e.label || '' }, [{ name: 'label', selector: { text: {} } }], { label: 'Nadpis skupiny (voliteľné)' }, (v) => {
          if (v.label) e.label = v.label; else delete e.label; setTx(); this._emit();
        })
        : this._form({ entity: e.entity, name: e.name || '', icon: e.icon || '', secondary_info: e.secondary_info || 'none', collapsed: !!e.collapsed },
          [{ name: 'entity', required: true, selector: { entity: {} } }, { name: 'name', selector: { text: {} } }, { name: 'icon', selector: { icon: {} } },
            { name: 'secondary_info', selector: { select: { mode: 'dropdown', options: SEC_OPTS } } }, { name: 'collapsed', selector: { boolean: {} } }],
          { entity: 'Entita', name: 'Vlastný názov (prázdny = názov z HA)', icon: 'Ikona (prázdna = podľa HA)', secondary_info: 'Druhý riadok', collapsed: 'Zbalená – skryť pod „Ďalšie“ (susedné zbalené entity sa spoja)' },
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
    window.customCards.push({ type: 'igy-entities-card', name: 'Igy Entities Card', description: 'Zoznam entít s peknými prepínačmi, výbermi a krokovačmi.', preview: true });
  console.info('%c IGY-ENTITIES-CARD %c ' + VERSION + ' ', 'background:#ff9f0a;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();

/* ===== igy-buttons-card ===== */
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

/* ===== igy-markdown-card ===== */
/*
 * Igy Markdown Card – Markdown karta v štýle Home Energy / Thermostat / Entities Card.
 * Šablóny (Jinja) počíta HA rovnako ako pri štandardnej Markdown karte – stačí zmeniť type.
 *
 *   type: custom:igy-markdown-card
 *   title: AI plán            # voliteľné – nadpis karty
 *   icon: mdi:robot           # voliteľné – ikona pri nadpise
 *   grouped: true             # --- rozdelí obsah do zaoblených skupín (predvolené true)
 *   content: |
 *     ### Nadpis
 *     **tučné**, *kurzíva*, `kód`, [odkaz](https://…), <sub>poznámka</sub>
 *     - položka zoznamu (emoji na začiatku sa zobrazí ako ikona)
 *     - **tučná položka** – zvýraznený riadok
 *     ---
 *
 * Podporované: nadpisy #–######, odseky, zoznamy (- * + 1.), --- oddeľovač, > citát,
 * tabuľky | a | b |, tučné, kurzíva, prečiarknuté, kód, odkazy, <sub> <sup> <small> <br> <b> <i> <u>.
 */
(function () {
  'use strict';
  const VERSION = '1.0.1';
  const ACC = '#ff9f0a';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  const EMO = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2})️?(?:‍\p{Extended_Pictographic}️?)*)\s*/u;

  /* ---------- Markdown → HTML (malý, bezpečný parser) ---------- */
  function inline(t) {
    const code = [];
    t = t.replace(/`([^`]+)`/g, (m, c) => { code.push(c); return '\u0000' + (code.length - 1) + '\u0000'; });
    t = esc(t);
    // povolené HTML značky
    t = t.replace(/&lt;(\/?)(sub|sup|small|b|i|u|strong|em|br)\s*\/?&gt;/gi, '<$1$2>');
    t = t.replace(/&lt;ha-icon icon=&quot;([a-z0-9:-]+)&quot;&gt;&lt;\/ha-icon&gt;/gi, '<ha-icon icon="$1"></ha-icon>');
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>').replace(/(^|\W)_(?!\s)(.+?)_(?!\w)/g, '$1<em>$2</em>');
    t = t.replace(/~~(.+?)~~/g, '<del>$1</del>');
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => /^(https?:|\/|#)/i.test(url.replace(/&amp;/g, '&')) ? `<a href="${url}" target="${url.startsWith('/') ? '_self' : '_blank'}" rel="noreferrer">${txt}</a>` : m);
    t = t.replace(/(\d) (%|€|°C|kWh|kW|W|A|h|min|l\/h|l\/min|m³)(?=[\s,.;:)·]|$)/g, '$1\u00a0$2');   // číslo a jednotka sa nerozdelia
    return t.replace(/\u0000(\d+)\u0000/g, (m, i) => `<code>${esc(code[+i])}</code>`);
  }

  // položka zoznamu: tučný začiatok = zvýraznená, emoji na začiatku = ikona
  function item(raw) {
    let h = inline(raw.trim()), hi = false, ic = '';
    if (h.startsWith('<strong>')) hi = true;
    const pre = hi ? '<strong>' : '', body = hi ? h.slice(8) : h, m = body.match(EMO);
    if (m) { ic = m[1]; h = pre + body.slice(m[0].length); }
    return { h, hi, ic };
  }

  function parse(md, grouped) {
    const lines = String(md == null ? '' : md).replace(/\r/g, '').split('\n');
    const sections = [[]];
    let i = 0;
    const cur = () => sections[sections.length - 1];
    while (i < lines.length) {
      const l = lines[i];
      if (/^\s*$/.test(l)) { i++; continue; }
      if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { if (grouped) sections.push([]); else cur().push('<hr>'); i++; continue; }
      let m = l.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (m) { cur().push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
      if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) {
        const ord = /^\s*\d/.test(l), its = [];
        while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
          let t = lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, ''); i++;
          while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) { t += '\n' + lines[i].trim(); i++; }
          its.push(t);
        }
        cur().push(`<${ord ? 'ol' : 'ul'}>${its.map((t, k) => {
          const x = item(t.replace(/\n/g, '  \n'));
          return `<li class="${x.hi ? 'hi' : ''}"><span class="li-ic">${x.ic ? x.ic : ord ? (k + 1) + '.' : '<i class="dot"></i>'}</span><span class="li-t">${x.h.replace(/ {2}\n/g, '<br>')}</span></li>`;
        }).join('')}</${ord ? 'ol' : 'ul'}>`);
        continue;
      }
      if (/^\s*>/.test(l)) {
        const q = []; while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        cur().push(`<blockquote>${q.map(inline).join('<br>')}</blockquote>`); continue;
      }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-+/.test(lines[i + 1])) {
        const row = (s) => s.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const head = row(l), al = row(lines[i + 1]).map((c) => /:$/.test(c) ? (/^:/.test(c) ? 'center' : 'right') : 'left'); i += 2;
        let h = `<div class="tw"><table><tr>${head.map((c, k) => `<th style="text-align:${al[k] || 'left'}">${inline(c)}</th>`).join('')}</tr>`;
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { h += `<tr>${row(lines[i]).map((c, k) => `<td style="text-align:${al[k] || 'left'}">${inline(c)}</td>`).join('')}</tr>`; i++; }
        cur().push(h + '</table></div>'); continue;
      }
      // odsek – jednoduché zalomenie riadku = <br> (ako v HA)
      const p = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^\s{0,3}(#{1,6}\s|(-{3,}|\*{3,}|_{3,})\s*$)/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) && !/^\s*>/.test(lines[i])) { p.push(lines[i]); i++; }
      const ph = p.map(inline).join('<br>');
      // odsek celý tučný = nadpis skupiny
      const lead = /^<strong>[^]*<\/strong>/.test(ph) && ph.indexOf('</strong>') > ph.length * 0.4;
      cur().push(`<p class="${lead ? 'lead' : ''}">${ph}</p>`);
    }
    return sections.filter((s) => s.length);
  }

  const CSS = `
    ha-card { padding: 18px; overflow: hidden; }
    ha-card.plain { background: none; box-shadow: none; border: 0; padding: 0; }
    .hl { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--secondary-text-color); letter-spacing: .02em; margin-bottom: 14px; }
    .hl ha-icon { --mdc-icon-size: 16px; }
    .body { color: var(--primary-text-color); font-size: 14px; line-height: 1.45; overflow-wrap: anywhere; }
    .sec + .sec { margin-top: 10px; }
    .sec.g { border-radius: 18px; background: var(--hc-surface, rgba(127,127,127,.1)); box-shadow: inset 0 0 0 1px var(--hc-surface-line, transparent); padding: 12px 14px; }
    .sec > :first-child { margin-top: 0; } .sec > :last-child { margin-bottom: 0; }
    h1, h2, h3, h4, h5, h6 { margin: 14px 0 6px; font-weight: 600; letter-spacing: -.01em; line-height: 1.25; }
    h1 { font-size: 24px; font-weight: 300; letter-spacing: -.02em; } h2 { font-size: 20px; font-weight: 400; } h3 { font-size: 17px; }
    h4 { font-size: 15px; } h5, h6 { font-size: 13px; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: .04em; }
    p { margin: 6px 0; color: var(--secondary-text-color); }
    p strong, li strong, td strong { color: var(--primary-text-color); font-weight: 600; }
    p.lead { color: var(--primary-text-color); font-size: 14px; margin-bottom: 8px; }
    p.lead strong { font-weight: 600; }
    em { font-style: italic; } del { opacity: .6; }
    sub, small { font-size: 11.5px; color: var(--secondary-text-color); vertical-align: baseline; line-height: 1.4; display: inline-block; opacity: .85; }
    a { color: var(--c, ${ACC}); text-decoration: none; } a:hover { text-decoration: underline; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; padding: 1px 6px; border-radius: 6px; background: rgba(127,127,127,.16); }
    hr { border: 0; height: 1px; background: rgba(127,127,127,.18); margin: 12px 0; }
    blockquote { margin: 8px 0; padding: 8px 12px; border-left: 3px solid var(--c, ${ACC}); border-radius: 0 10px 10px 0; background: rgba(127,127,127,.08); color: var(--secondary-text-color); }
    ul, ol { list-style: none; margin: 4px 0; padding: 0; }
    li { display: flex; gap: 10px; align-items: baseline; padding: 7px 8px; margin: 0 -8px; border-radius: 10px; color: var(--primary-text-color); }
    li + li { box-shadow: inset 0 1px 0 rgba(127,127,127,.12); }
    li + li.hi, li.hi + li { box-shadow: none; }
    .li-ic { flex: none; width: 20px; text-align: center; font-size: 15px; line-height: 1.3; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
    .li-ic .dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: .6; vertical-align: middle; }
    .li-t { flex: 1; min-width: 0; font-variant-numeric: tabular-nums; }
    li.hi { background: color-mix(in srgb, var(--c, ${ACC}) 16%, transparent); }
    li.hi .li-t strong { color: var(--primary-text-color); font-weight: 600; }
    li.hi .li-ic { filter: none; }
    .tw { overflow-x: auto; margin: 6px 0; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; font-variant-numeric: tabular-nums; }
    th { font-weight: 500; color: var(--secondary-text-color); font-size: 12px; padding: 4px 8px; border-bottom: 1px solid rgba(127,127,127,.2); }
    td { padding: 6px 8px; border-bottom: 1px solid rgba(127,127,127,.1); }
    tr:last-child td { border-bottom: 0; }
    .err { color: var(--error-color, #ff6961); font-size: 13px; white-space: pre-wrap; font-family: ui-monospace, monospace; }
    .ld { color: var(--secondary-text-color); font-size: 13px; }
  `;

  class HomeMarkdownCard extends HTMLElement {
    static getConfigElement() { return document.createElement('igy-markdown-card-editor'); }
    static getStubConfig() { return { title: 'Poznámka', content: '### Nadpis\nText s **tučným** písmom.\n- ☀️ položka zoznamu\n- **🔋 zvýraznená položka**' }; }
    setConfig(c) {
      if (!c || c.content == null) throw new Error('Chýba content.');
      const changed = !this._config || c.content !== this._config.content;
      this._config = Object.assign({}, c); this._built = false;
      if (changed) { this._unsub(); this._res = null; this._err = null; }
      if (this._hass) { this._render(); this._sub(); }
    }
    set hass(h) { const first = !this._hass; this._hass = h; if (first && this._config) { this._render(); this._sub(); } }
    connectedCallback() { if (this._hass) this._sub(); }
    disconnectedCallback() { this._unsub(); }
    getCardSize() { return 3 + Math.round(((this._res || this._config.content || '').match(/\n/g) || []).length / 3); }
    getGridOptions() { return { columns: 12, min_columns: 4 }; }

    _isTpl() { return /\{[{%#]/.test(this._config.content); }
    async _sub() {
      if (!this._hass || !this._config || this._subP || !this.isConnected) return;
      if (!this._isTpl()) { this._res = this._config.content; this._draw(); return; }
      const conn = this._hass.connection; if (!conn) return;
      this._subP = conn.subscribeMessage((msg) => {
        if (msg.error) { this._err = msg.error; } else if ('result' in msg) { this._err = null; this._res = String(msg.result); }
        this._draw();
      }, { type: 'render_template', template: this._config.content, strict: false, report_errors: true,
        variables: { config: this._config, user: this._hass.user && this._hass.user.name } }).catch((e) => { this._err = e.message || String(e); this._subP = null; this._draw(); });
    }
    _unsub() { const p = this._subP; this._subP = null; if (p) p.then((u) => u && u()).catch(() => { }); }

    _render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const c = this._config;
      this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card class="${c.text_only ? 'plain' : ''}">
        ${c.title ? `<div class="hl">${c.icon ? `<ha-icon icon="${esc(c.icon)}"></ha-icon>` : ''}<span>${esc(c.title)}</span></div>` : ''}
        <div class="body" id="b"><div class="ld">Načítavam…</div></div></ha-card>`;
      this._built = true; this._last = null;
      if (this._res != null || this._err) this._draw();
    }
    _draw() {
      if (!this._built) return;
      const b = this.shadowRoot.getElementById('b'), g = this._config.grouped !== false;
      let h;
      if (this._err) h = `<div class="err">${esc(this._err)}</div>`;
      else if (this._res == null) return;
      else {
        const secs = parse(this._res, g);
        // 1. sekcia (pred prvým ---) ostáva bez rámčeka, ostatné sú skupiny
        h = secs.map((s, k) => `<div class="sec${g && k > 0 ? ' g' : ''}">${s.join('')}</div>`).join('');
      }
      if (h === this._last) return; this._last = h;
      b.innerHTML = h;
    }
  }

  /* ================= Editor ================= */
  class HomeMarkdownCardEditor extends HTMLElement {
    setConfig(c) { this._cfg = Object.assign({}, c); if (this._f) this._f.data = this._data(); }
    _data() { const c = this._cfg || {}; return { title: c.title || '', icon: c.icon || '', grouped: c.grouped !== false, text_only: !!c.text_only, content: c.content || '' }; }
    set hass(h) {
      this._hass = h;
      if (!this._f) {
        const f = this._f = document.createElement('ha-form');
        f.schema = [{ name: 'title', selector: { text: {} } }, { name: 'icon', selector: { icon: {} } },
          { type: 'grid', name: '', schema: [{ name: 'grouped', selector: { boolean: {} } }, { name: 'text_only', selector: { boolean: {} } }] },
          { name: 'content', selector: { template: {} } }];
        const L = { title: 'Nadpis karty (voliteľné)', icon: 'Ikona pri nadpise', grouped: '--- rozdelí obsah do skupín', text_only: 'Bez pozadia karty', content: 'Obsah (Markdown + šablóny)' };
        f.computeLabel = (x) => L[x.name] || x.name;
        f.addEventListener('value-changed', (e) => {
          const v = e.detail.value, c = Object.assign({ type: 'custom:igy-markdown-card' }, this._cfg);
          ['title', 'icon'].forEach((k) => { if (v[k]) c[k] = v[k]; else delete c[k]; });
          if (v.grouped === false) c.grouped = false; else delete c.grouped;
          if (v.text_only) c.text_only = true; else delete c.text_only;
          c.content = v.content || '';
          this._cfg = c;
          this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: c }, bubbles: true, composed: true }));
        });
        const hint = document.createElement('div');
        hint.style.cssText = 'font-size:13px;color:var(--secondary-text-color);line-height:1.4;margin-bottom:12px';
        hint.innerHTML = 'Obsah funguje rovnako ako v štandardnej Markdown karte (aj Jinja šablóny). Navyše: <b>---</b> začne novú skupinu, <b>emoji</b> na začiatku položky zoznamu je ikona, <b>tučná položka</b> sa zvýrazní.';
        this.appendChild(hint); this.appendChild(f);
      }
      this._f.hass = h; this._f.data = this._data();
    }
  }

  if (!customElements.get('igy-markdown-card-editor')) customElements.define('igy-markdown-card-editor', HomeMarkdownCardEditor);
  if (!customElements.get('igy-markdown-card')) customElements.define('igy-markdown-card', HomeMarkdownCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-markdown-card'))
    window.customCards.push({ type: 'igy-markdown-card', name: 'Igy Markdown Card', description: 'Markdown so šablónami v jednotnom štýle, skupiny cez ---.', preview: true });
  console.info('%c IGY-MARKDOWN-CARD %c ' + VERSION + ' ', 'background:#ff9f0a;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();

/* ===== igy-circuits-card ===== */
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
    static getStubConfig() { return { title: 'Spotreba po okruhoch', groups: [{ name: 'Skupina 1', rows: [] }] }; }
    setConfig(c) {
      if (!c) throw new Error('Chybná konfigurácia.');
      this._cfg = normalize(c); this._built = false;
      if (this._hass) this._render();
    }
    set hass(h) { this._hass = h; if (this._cfg) this._render(); }
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
      let h = `<div class="hl">${BOLT}<span>${esc(c.title || 'Spotreba po okruhoch')}</span><span class="tot" data-more="${esc(c.total || '')}"><span id="tv">–</span><small id="tu">W</small></span></div>`;
      if (c.phases.length) {
        h += `<div class="box ph" style="--n:${c.phases.length}">` + c.phases.map((p, i) => {
          const n = p.name || 'L' + (i + 1), col = p.color || PH[n] || PH['L' + (i + 1)] || '#a3acbd';
          return `<div class="pc" style="--c:${col}" data-more="${esc(p.entity)}"><span class="pn"><i></i>${esc(n)}</span><b data-p="${i}">–</b><div class="pb"><i data-pb="${i}" style="width:0"></i></div></div>`;
        }).join('') + '</div>';
      }
      c.groups.forEach((g, gi) => {
        const ph = [...new Set(g.rows.map((r) => r.phase).filter((x) => PH[x]))];
        h += `<div class="box grp${this._isOpen(g, gi) ? ' open' : ''}" data-g="${gi}"><div class="gh" data-tg="${gi}"><span class="gn">${esc(g.name || 'Skupina ' + (gi + 1))}</span>`
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
    set hass(h) { const f = !this._hass; this._hass = h; if (f && this._cfg) this._build(); this.querySelectorAll('ha-form').forEach((x) => { x.hass = h; }); }
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
      this.innerHTML = `<style>${EDCSS}</style><div class="ed"><div id="top"></div><div class="sec">Fázy</div><div id="ph"></div>
        <div class="sec">Skupiny ističov</div><div class="hint">Ťukni na skupinu pre názov a jej okruhy. Poradie zmeníš šípkami. Skupiny sú v karte predvolene zbalené.</div>
        <div class="items" id="items"></div><button class="btn" id="addg">+ Pridať skupinu</button></div>`;
      const ent = (n) => ({ name: n, selector: { entity: { domain: 'sensor' } } });
      this.querySelector('#top').appendChild(this._form({ title: c.title || '', total: c.total || '', phase_max: c.phase_max || 3680, circuit_max: c.circuit_max || 3680 },
        [{ name: 'title', selector: { text: {} } }, ent('total'),
          { type: 'grid', name: '', schema: [{ name: 'phase_max', selector: { number: { min: 500, max: 20000, step: 10, mode: 'box', unit_of_measurement: 'W' } } },
            { name: 'circuit_max', selector: { number: { min: 100, max: 20000, step: 10, mode: 'box', unit_of_measurement: 'W' } } }] }],
        { title: 'Nadpis', total: 'Celková spotreba domu (voliteľné)', phase_max: 'Plný pásik fázy', circuit_max: 'Plný pásik okruhu' },
        { total: 'Bez nej sa zobrazí súčet fáz.', phase_max: '16 A × 230 V = 3680 W' },
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
      this.querySelector('#addg').onclick = () => { c.groups.push({ name: 'Skupina ' + (c.groups.length + 1), rows: [] }); open.add('g' + (c.groups.length - 1)); this._emit(); this._build(); };
    }
    _head(it, title, sub, warn, onUp, onDn, onDel, upDis, dnDis, key) {
      it.innerHTML = `<div class="ih"><span class="tx"><b></b><small></small></span><button class="ib up" title="Vyššie">${ICO.up}</button><button class="ib dn" title="Nižšie">${ICO.dn}</button><button class="ib exp" title="Upraviť">${ICO.down}</button><button class="ib del" title="Odstrániť">${ICO.del}</button></div><div class="body"></div>`;
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
      const body = this._head(it, esc(g.name || 'Skupina ' + (gi + 1)), g.rows.length + ' ' + (g.rows.length === 1 ? 'okruh' : g.rows.length >= 2 && g.rows.length <= 4 ? 'okruhy' : 'okruhov') + (g.expanded ? ' · predvolene rozbalená' : ''), false,
        mv(-1), mv(1), () => { c.groups.splice(gi, 1); this._open = new Set(); this._emit(); this._build(); }, gi === 0, gi === c.groups.length - 1, 'g' + gi);
      body.appendChild(this._form({ name: g.name || '', entity: g.entity || '', expanded: !!g.expanded }, [{ name: 'name', selector: { text: {} } }, { name: 'entity', selector: { entity: { domain: 'sensor' } } }, { name: 'expanded', selector: { boolean: {} } }],
        { name: 'Názov skupiny', entity: 'Súčet skupiny (voliteľné)', expanded: 'Predvolene rozbalená' }, { entity: 'Bez neho karta sčíta okruhy v skupine.' }, (v) => {
          g.name = v.name || ''; if (v.entity) g.entity = v.entity; else delete g.entity; if (v.expanded) g.expanded = true; else delete g.expanded;
          const ih = it.querySelector(':scope > .ih'); ih.querySelector('.tx b').textContent = g.name || 'Skupina ' + (gi + 1); this._emit();
        }));
      const rows = document.createElement('div'); rows.className = 'items';
      g.rows.forEach((r, ri) => rows.appendChild(this._row(g, gi, r, ri)));
      body.appendChild(rows);
      const add = document.createElement('button'); add.className = 'btn'; add.textContent = '+ Pridať okruh';
      add.onclick = () => { const last = g.rows[g.rows.length - 1], ph = last && last.phase ? ['L1', 'L2', 'L3'][(['L1', 'L2', 'L3'].indexOf(last.phase) + 1) % 3] : 'L1';
        g.rows.push({ phase: ph }); this._openSet().add('g' + gi).add('r' + gi + '.' + (g.rows.length - 1)); this._emit(); this._build(); };
      body.appendChild(add);
      return it;
    }
    _row(g, gi, r, ri) {
      const it = document.createElement('div'), key = 'r' + gi + '.' + ri; it.className = 'it' + (this._openSet().has(key) ? ' open' : '');
      const s = r.entity && this._hass.states[r.entity];
      const title = () => (r.phase ? `<span class="pk">${r.phase}</span>` : '') + esc(r.name || (s && s.attributes.friendly_name) || r.entity || 'Nový okruh');
      const mv = (d) => () => { const j = ri + d; [g.rows[ri], g.rows[j]] = [g.rows[j], g.rows[ri]]; this._emit(); this._build(); };
      const body = this._head(it, title(), r.entity ? (s ? r.entity : r.entity + ' – entita neexistuje') : 'vyber entitu', !!r.entity && !s,
        mv(-1), mv(1), () => { g.rows.splice(ri, 1); this._open = new Set(['g' + gi]); this._emit(); this._build(); }, ri === 0, ri === g.rows.length - 1, key);
      body.appendChild(this._form({ entity: r.entity || '', name: r.name || '', phase: r.phase || 'none' },
        [{ name: 'entity', selector: { entity: { domain: 'sensor' } } }, { name: 'name', selector: { text: {} } },
          { name: 'phase', selector: { select: { mode: 'box', options: PHO } } }],
        { entity: 'Senzor výkonu okruhu', name: 'Názov (napr. čo je na okruhu)', phase: 'Fáza' }, null, (v) => {
          const n = {}; if (v.entity) n.entity = v.entity; if (v.name) n.name = v.name; if (v.phase && v.phase !== 'none') n.phase = v.phase; if (r.max) n.max = r.max;
          Object.keys(r).forEach((k) => delete r[k]); Object.assign(r, n);
          const ns = r.entity && this._hass.states[r.entity];
          const ih = it.querySelector(':scope > .ih'); ih.querySelector('.tx b').innerHTML = (r.phase ? `<span class="pk">${r.phase}</span>` : '') + esc(r.name || (ns && ns.attributes.friendly_name) || r.entity || 'Nový okruh');
          const sm = ih.querySelector('.tx small'); sm.textContent = r.entity ? (ns ? r.entity : r.entity + ' – entita neexistuje') : 'vyber entitu'; sm.className = r.entity && !ns ? 'warn' : '';
          this._emit();
        }));
      return it;
    }
  }

  if (!customElements.get('igy-circuits-card-editor')) customElements.define('igy-circuits-card-editor', HomeCircuitsCardEditor);
  if (!customElements.get('igy-circuits-card')) customElements.define('igy-circuits-card', HomeCircuitsCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-circuits-card'))
    window.customCards.push({ type: 'igy-circuits-card', name: 'Igy Circuits Card', description: 'Spotreba po okruhoch a fázach – zbaľovacie skupiny ističov.', preview: true });
  console.info('%c IGY-CIRCUITS-CARD %c ' + VERSION + ' ', 'background:#34d399;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();

/* ===== igy-battery-card ===== */
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

console.info('%c IGY-CARDS %c 1.0.0 ', 'background:#ffb340;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
