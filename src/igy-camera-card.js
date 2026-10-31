/*
 * Igy Camera Card – prehľad kamier cez WebRTC (go2rtc, napr. vo Frigate), ťuknutím kamera na celú obrazovku.
 * Vyžaduje integráciu „WebRTC Camera“ (AlexxIT) z HACS – poskytuje prvok <webrtc-camera>.
 *
 * Celá obrazovka:
 *   - hneď sa ukáže malý stream (už beží → okamžite),
 *   - na pozadí sa pripája plné rozlíšenie; keď sa rozbehne, malý stream sa vypne,
 *   - ak sa plné rozlíšenie nerozbehne, ostane malý stream (nič neostane čierne),
 *   - zoom dvoma prstami / kolieskom, posun jedným prstom, dvojité ťuknutie = priblížiť / vrátiť,
 *   - ťuknutie (bez zoomu) alebo × = zavrieť.
 *
 *   type: custom:igy-camera-card
 *   cameras:
 *     - zahrada                 # jednoduchý zápis: streamy zahrada / zahrada_sub (názvy v go2rtc)
 *     - name: vchod             # rozšírený zápis
 *       main: vchod_src         #   stream v plnom rozlíšení
 *       sub: vchod_sub_src      #   malý stream do prehľadu
 *       aspect: 16/9            #   vynútený pomer strán (oprava „zúženého“ obrazu)
 *   mode: webrtc,mse            # voliteľné – režim v prehľade
 *   full_mode: webrtc,mse       # voliteľné – režim na celej obrazovke
 *   columns: 1                  # voliteľné
 *   sub: true                   # voliteľné – v prehľade malý stream <kamera>_sub
 *   full_timeout: 12            # voliteľné – koľko sekúnd čakať na plné rozlíšenie
 *   poster: http://FRIGATE:5000/api/{name}/latest.jpg?h=480
 *                               # voliteľné – posledná snímka, kým sa nenačíta video ({name} = názov kamery)
 */
(function () {
  'use strict';
  // jazyk podľa Home Assistanta: sk = slovenčina, inak angličtina (texty v kóde sú po slovensky, preklady v EN)
  let LANG = String((typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || (typeof navigator !== 'undefined' && navigator.language) || 'en').slice(0, 2).toLowerCase();
  const setLang = (h) => { const l = h && ((h.locale && h.locale.language) || h.language); if (l) LANG = String(l).slice(0, 2).toLowerCase(); };
  const _ = (s, ...a) => { let r = LANG === 'sk' ? s : (EN[s] != null ? EN[s] : s); a.forEach((v, i) => { r = r.split('{' + i + '}').join(v); }); return r; };
  const EN = {
    "Zobrazenie": "Display",
    "Chybná konfigurácia.": "Invalid configuration.",
    "Pridaj kamery v nastaveniach karty (názvy streamov v go2rtc).": "Add cameras in the card settings (go2rtc stream names).",
    "Čakám na kartu <b>WebRTC Camera</b> (AlexxIT) – nainštaluj ju cez HACS.": "Waiting for the <b>WebRTC Camera</b> card (AlexxIT) – install it from HACS.",
    "NAČÍTAVAM PLNÉ ROZLÍŠENIE…": "LOADING FULL RESOLUTION…",
    "ZNÍŽENÉ ROZLÍŠENIE": "REDUCED RESOLUTION",
    "WebRTC, inak MSE": "WebRTC, fallback MSE",
    "Len WebRTC": "WebRTC only",
    "Len MSE": "MSE only",
    "Všetko (WebRTC → MJPEG)": "All (WebRTC → MJPEG)",
    "Karta potrebuje integráciu WebRTC Camera (AlexxIT) z HACS.": "This card needs the WebRTC Camera integration (AlexxIT) from HACS.",
    "Kamery": "Cameras",
    "Názov = stream v go2rtc. Malý stream do prehľadu je predvolene &lt;názov&gt;_sub.": "Name = go2rtc stream. The small overview stream defaults to &lt;name&gt;_sub.",
    "+ Pridať kameru": "+ Add camera",
    "Stĺpcov": "Columns",
    "Čakať na plné rozlíšenie": "Wait for full resolution",
    "V prehľade malý stream (_sub)": "Small stream in the overview (_sub)",
    "Zobraziť názov kamery": "Show camera name",
    "Režim v prehľade": "Overview mode",
    "Režim na celej obrazovke": "Full-screen mode",
    "Snímka kým sa načíta video (voliteľné)": "Still image while the video loads (optional)",
    "Napr. http://frigate:5000/api/{name}/latest.jpg?h=480 – {name} sa nahradí názvom kamery.": "E.g. http://frigate:5000/api/{name}/latest.jpg?h=480 – {name} is replaced by the camera name.",
    "Nová kamera": "New camera",
    "zadaj názov streamu": "enter the stream name",
    "Názov (stream v go2rtc)": "Name (go2rtc stream)",
    "Stream v plnom rozlíšení (voliteľné)": "Full-resolution stream (optional)",
    "Malý stream do prehľadu (voliteľné)": "Small overview stream (optional)",
    "Pomer strán (napr. 16/9, voliteľné)": "Aspect ratio (e.g. 16/9, optional)",
    "Prázdne = rovnaký ako názov.": "Empty = same as the name.",
    "Prázdne = <názov>_sub.": "Empty = <name>_sub.",
    "Kamery cez WebRTC (go2rtc), ťuknutím na celú obrazovku so zoomom. Potrebuje WebRTC Camera z HACS.": "Cameras via WebRTC (go2rtc), tap for full screen with zoom. Needs WebRTC Camera from HACS."
  };

  const VERSION = '1.0.0';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  function cams(list) {
    return (list || []).filter(Boolean).map((c) => {
      if (typeof c === 'string') return { name: c, main: c, sub: `${c}_sub` };
      const n = c.name || c.main || '';
      return { name: n, main: c.main || n, sub: c.sub || `${n}_sub`, aspect: c.aspect };
    }).filter((c) => c.name);
  }

  class IgyCameraCard extends HTMLElement {
    static getConfigElement() { return document.createElement('igy-camera-card-editor'); }
    static getStubConfig() { return { cameras: [] }; }
    setConfig(config) {
      if (!config) throw new Error(_('Chybná konfigurácia.'));
      this._config = Object.assign({ mode: 'webrtc,mse', full_mode: 'webrtc,mse', sub: true, columns: 1, full_timeout: 12, poster: '' }, config, { cameras: cams(config.cameras) });
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this._build();
    }
    set hass(hass) { setLang(hass); this._hass = hass; this._allCams().forEach((el) => { el.hass = hass; }); }
    getCardSize() { const c = this._config || {}; return Math.max(1, Math.ceil((c.cameras || []).length / (c.columns || 1))) * 4; }
    getGridOptions() { return { columns: 12, min_columns: 6 }; }
    disconnectedCallback() { this._close(); }

    _allCams() {
      const list = this.shadowRoot ? [...this.shadowRoot.querySelectorAll('webrtc-camera')] : [];
      if (this._overlay) list.push(...this._overlay.querySelectorAll('webrtc-camera'));
      return list;
    }
    _posterUrl(cam) {
      const p = this._config.poster; if (!p) return null;
      return p.replace('{name}', encodeURIComponent(cam.name)) + (p.includes('?') ? '&' : '?') + '_=' + Date.now();
    }
    _createCam(url, mode, aspect, poster, full) {
      const el = document.createElement('webrtc-camera');
      const cfg = { url, mode: mode || this._config.mode, muted: true };
      if (full) {
        // na celej obrazovke: WebRTC Camera inak zastaví stream, keď je viditeľných < 75 % videa (pri zoome)
        cfg.intersection = 0;
        cfg.background = true;
      }
      if (poster) cfg.poster = poster;
      // kamera hlási zlý pomer pixelov → prehliadaču vnútime správny pomer strán
      if (aspect) cfg.style = `video { aspect-ratio: ${aspect}; object-fit: fill; width: 100%; height: auto; }`;
      el.setConfig(cfg);
      if (this._hass) el.hass = this._hass;
      return el;
    }

    async _build() {
      const c = this._config, root = this.shadowRoot, gen = (this._gen = (this._gen || 0) + 1);
      const css = `<style>
        .grid { display: grid; gap: 8px; grid-template-columns: repeat(${Math.max(1, +c.columns || 1)}, minmax(0, 1fr)); }
        .tile { position: relative; border-radius: var(--ha-card-border-radius, 12px); overflow: hidden; background: #000; background-size: cover; background-position: center; min-height: 60px; }
        .hit { position: absolute; inset: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .lbl { position: absolute; left: 8px; bottom: 8px; padding: 2px 8px; border-radius: 99px; font: 500 11px/1.6 system-ui, sans-serif; color: #fff; background: rgba(0,0,0,.45); pointer-events: none; }
        .msg { padding: 16px; font-size: 14px; color: var(--secondary-text-color); background: var(--ha-card-background, var(--card-background-color)); border-radius: var(--ha-card-border-radius, 12px); line-height: 1.45; }
      </style>`;
      if (!c.cameras.length) { root.innerHTML = css + '<div class="msg">' + _('Pridaj kamery v nastaveniach karty (názvy streamov v go2rtc).') + '</div>'; return; }
      if (!customElements.get('webrtc-camera')) {
        root.innerHTML = css + '<div class="msg">' + _('Čakám na kartu <b>WebRTC Camera</b> (AlexxIT) – nainštaluj ju cez HACS.') + '</div>';
        await customElements.whenDefined('webrtc-camera');
        if (gen !== this._gen) return;
      }
      root.innerHTML = css + '<div class="grid"></div>';
      const grid = root.querySelector('.grid');
      for (const cam of c.cameras) {
        const tile = document.createElement('div'); tile.className = 'tile';
        const poster = this._posterUrl(cam);
        if (poster) tile.style.backgroundImage = `url("${poster}")`;
        if (cam.aspect) tile.style.aspectRatio = String(cam.aspect).replace('/', ' / ');
        tile.appendChild(this._createCam(c.sub ? cam.sub : cam.main, c.mode, cam.aspect, poster));
        if (c.show_name) { const l = document.createElement('div'); l.className = 'lbl'; l.textContent = cam.title || cam.name; tile.appendChild(l); }
        const hit = document.createElement('div'); hit.className = 'hit';
        hit.addEventListener('click', () => this._open(cam));
        tile.appendChild(hit); grid.appendChild(tile);
      }
    }

    _findVideo(el) { return el.video || el.querySelector('video') || (el.shadowRoot && el.shadowRoot.querySelector('video')) || null; }

    _open(cam) {
      this._close();
      const c = this._config, ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:#000;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;';
      const stage = document.createElement('div');
      stage.style.cssText = 'position:absolute;top:0;left:0;width:100vw;height:100vh;transform-origin:0 0;will-change:transform;pointer-events:none;';
      ov.appendChild(stage);
      const camCss = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(100vw, calc(100vh * 16 / 9));display:block;';
      // 1) malý stream – okamžite, 2) plné rozlíšenie nad ním, zatiaľ neviditeľné
      const low = c.sub ? this._createCam(cam.sub, c.full_mode, cam.aspect, this._posterUrl(cam), true) : null;
      if (low) { low.style.cssText = camCss; stage.appendChild(low); }
      const high = this._createCam(cam.main, c.full_mode, cam.aspect, null, true);
      high.style.cssText = camCss + (low ? 'opacity:0;' : '');
      stage.appendChild(high);
      const tag = document.createElement('div');
      tag.style.cssText = 'position:absolute;top:16px;left:16px;padding:6px 12px;border-radius:999px;font:500 13px system-ui,sans-serif;letter-spacing:.06em;color:#cbd5e1;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.15);pointer-events:none;';
      tag.textContent = low ? _('NAČÍTAVAM PLNÉ ROZLÍŠENIE…') : '';
      if (!low) tag.style.display = 'none';
      ov.appendChild(tag);
      const x = document.createElement('div');
      x.textContent = '×';
      x.style.cssText = 'position:absolute;top:12px;right:16px;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:300 30px system-ui,sans-serif;color:#fff;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.15);cursor:pointer;z-index:2;';
      x.addEventListener('click', (e) => { e.stopPropagation(); this._close(); });
      ov.appendChild(x);
      document.body.appendChild(ov);
      this._overlay = ov;
      // prepnutie na plné rozlíšenie, keď sa naozaj rozbehne
      if (low) {
        const t0 = Date.now();
        this._poll = setInterval(() => {
          const v = this._findVideo(high);
          if (v && v.readyState >= 3 && v.videoWidth > 0) {
            clearInterval(this._poll); this._poll = null;
            high.style.opacity = '1'; low.remove(); tag.style.display = 'none';
          } else if (Date.now() - t0 > (+c.full_timeout || 12) * 1000) {
            clearInterval(this._poll); this._poll = null;
            high.remove(); tag.textContent = _('ZNÍŽENÉ ROZLÍŠENIE');
          }
        }, 250);
      }
      this._setupZoom(ov, stage);
      this._onFsChange = () => { if (!document.fullscreenElement && this._overlay) this._close(); };
      if (ov.requestFullscreen) ov.requestFullscreen().then(() => document.addEventListener('fullscreenchange', this._onFsChange)).catch(() => {});
    }

    // zoom dvoma prstami, posun jedným, dvojité ťuknutie, ťuknutie = zavrieť
    _setupZoom(ov, stage) {
      let s = 1, tx = 0, ty = 0, pinch = null, pan = null, tapStart = null, lastTap = 0, tapTimer = null;
      const pts = new Map(), W = () => ov.clientWidth, H = () => ov.clientHeight;
      const clamp = () => { s = Math.max(1, Math.min(6, s)); tx = Math.min(0, Math.max((1 - s) * W(), tx)); ty = Math.min(0, Math.max((1 - s) * H(), ty)); if (s === 1) { tx = 0; ty = 0; } };
      const apply = (anim) => { clamp(); stage.style.transition = anim ? 'transform .25s ease' : 'none'; stage.style.transform = `translate(${tx}px,${ty}px) scale(${s})`; };
      const zoomAt = (px, py, ns) => { const lx = (px - tx) / s, ly = (py - ty) / s; s = ns; tx = px - s * lx; ty = py - s * ly; };
      ov.addEventListener('pointerdown', (e) => {
        if (ov.setPointerCapture) ov.setPointerCapture(e.pointerId);
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tx, ty }; pan = null; tapStart = null; }
        else if (pts.size === 1) { pan = { x: e.clientX, y: e.clientY, tx, ty }; tapStart = { x: e.clientX, y: e.clientY, t: Date.now() }; }
      });
      ov.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch && pts.size >= 2) {
          const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const ns = Math.max(1, Math.min(6, pinch.s * d / pinch.d)), lx = (pinch.mx - pinch.tx) / pinch.s, ly = (pinch.my - pinch.ty) / pinch.s;
          s = ns; tx = mx - s * lx; ty = my - s * ly; apply(false);
        } else if (pan && pts.size === 1 && s > 1) { tx = pan.tx + (e.clientX - pan.x); ty = pan.ty + (e.clientY - pan.y); apply(false); }
        if (tapStart && Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) > 10) tapStart = null;
      });
      const up = (e) => {
        pts.delete(e.pointerId);
        if (pts.size < 2) pinch = null;
        if (pts.size === 1) { const [p] = [...pts.values()]; pan = { x: p.x, y: p.y, tx, ty }; }
        if (pts.size === 0) {
          pan = null;
          if (tapStart && Date.now() - tapStart.t < 300) {
            const now = Date.now();
            if (now - lastTap < 300) { clearTimeout(tapTimer); lastTap = 0; if (s > 1) { s = 1; tx = 0; ty = 0; } else zoomAt(e.clientX, e.clientY, 2.5); apply(true); }
            else { lastTap = now; tapTimer = setTimeout(() => { if (s === 1) this._close(); }, 300); }
          }
          tapStart = null;
        }
      };
      ov.addEventListener('pointerup', up); ov.addEventListener('pointercancel', up);
      ov.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.max(1, Math.min(6, s * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))); apply(false); }, { passive: false });
    }

    _close() {
      if (this._poll) { clearInterval(this._poll); this._poll = null; }
      if (this._onFsChange) { document.removeEventListener('fullscreenchange', this._onFsChange); this._onFsChange = null; }
      if (document.fullscreenElement && document.fullscreenElement === this._overlay) document.exitFullscreen().catch(() => {});
      if (this._overlay) { this._overlay.remove(); this._overlay = null; }
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
    .warn { font-size: 13px; color: var(--warning-color, #ffa600); }
  `;
  const ICO = {
    down: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6z"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 14l5-5 5 5z"/></svg>',
    dn: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9m0 5h2v9H9V8m4 0h2v9h-2V8z"/></svg>'
  };
  const MODES = () => [{ value: 'webrtc,mse', label: _('WebRTC, inak MSE') }, { value: 'webrtc', label: _('Len WebRTC') }, { value: 'mse', label: _('Len MSE') }, { value: 'webrtc,mse,hls,mjpeg', label: _('Všetko (WebRTC → MJPEG)') }];
  const DEF = { mode: 'webrtc,mse', full_mode: 'webrtc,mse', sub: true, columns: 1, full_timeout: 12 };

  class IgyCameraCardEditor extends HTMLElement {
    setConfig(config) {
      const c = JSON.parse(JSON.stringify(config || {}));
      // kamery v editore vždy ako objekty; jednoduchý zápis sa zachová, kým sa kamera nezmení
      c.cameras = (c.cameras || []).filter(Boolean).map((x) => typeof x === 'string' ? { name: x } : x);
      const sig = JSON.stringify(c); if (sig === this._last) return;
      this._cfg = c; this._last = sig; if (this._hass) this._build();
    }
    set hass(h) { setLang(h); const f = !this._hass; this._hass = h; if (f && this._cfg) this._build(); this.querySelectorAll('ha-form').forEach((x) => { x.hass = h; }); }
    _emit() {
      const c = JSON.parse(JSON.stringify(Object.assign({ type: 'custom:igy-camera-card' }, this._cfg)));
      // kamera len s názvom → jednoduchý zápis
      c.cameras = c.cameras.map((x) => Object.keys(x).length === 1 && x.name ? x.name : x);
      this._last = JSON.stringify(Object.assign({}, c, { cameras: this._cfg.cameras }));
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: c }, bubbles: true, composed: true }));
    }
    _form(data, schema, L, H, cb) {
      const f = document.createElement('ha-form'); f.hass = this._hass; f.data = data; f.schema = schema;
      f.computeLabel = (x) => L[x.name] || x.name; f.computeHelper = (x) => H && H[x.name];
      f.addEventListener('value-changed', (e) => { e.stopPropagation(); const v = Object.assign({}, e.detail.value); try { cb(v); } catch (err) { console.error('igy-camera-card editor:', err); } });
      return f;
    }
    _build() {
      const c = this._cfg, open = this._open || (this._open = new Set());
      this.innerHTML = `<style>${EDCSS}</style><div class="ed">
        ${customElements.get('webrtc-camera') ? '' : '<div class="warn">' + _('Karta potrebuje integráciu WebRTC Camera (AlexxIT) z HACS.') + '</div>'}
        <div class="sec">${_('Kamery')}</div><div class="hint">${_('Názov = stream v go2rtc. Malý stream do prehľadu je predvolene &lt;názov&gt;_sub.')}</div>
        <div class="items" id="items"></div><button class="btn" id="add">${_('+ Pridať kameru')}</button>
        <div class="sec">${_('Zobrazenie')}</div><div id="opt"></div></div>`;
      const box = this.querySelector('#items');
      c.cameras.forEach((cam, i) => box.appendChild(this._item(cam, i, open.has(i))));
      this.querySelector('#add').onclick = () => { c.cameras.push({ name: '' }); open.add(c.cameras.length - 1); this._emit(); this._build(); };
      const keys = ['columns', 'sub', 'show_name', 'mode', 'full_mode', 'full_timeout', 'poster'];
      const data = {}; keys.forEach((k) => { data[k] = c[k] != null ? c[k] : (DEF[k] != null ? DEF[k] : (k === 'show_name' ? false : '')); });
      this.querySelector('#opt').appendChild(this._form(data, [
        { type: 'grid', name: '', schema: [{ name: 'columns', selector: { number: { min: 1, max: 4, mode: 'box' } } }, { name: 'full_timeout', selector: { number: { min: 3, max: 60, mode: 'box', unit_of_measurement: 's' } } }] },
        { name: 'sub', selector: { boolean: {} } }, { name: 'show_name', selector: { boolean: {} } },
        { name: 'mode', selector: { select: { mode: 'dropdown', options: MODES() } } }, { name: 'full_mode', selector: { select: { mode: 'dropdown', options: MODES() } } },
        { name: 'poster', selector: { text: {} } }],
        { columns: _('Stĺpcov'), full_timeout: _('Čakať na plné rozlíšenie'), sub: _('V prehľade malý stream (_sub)'), show_name: _('Zobraziť názov kamery'), mode: _('Režim v prehľade'), full_mode: _('Režim na celej obrazovke'), poster: _('Snímka kým sa načíta video (voliteľné)') },
        { poster: _('Napr. http://frigate:5000/api/{name}/latest.jpg?h=480 – {name} sa nahradí názvom kamery.') },
        (v) => {
          keys.forEach((k) => { const d = DEF[k] != null ? DEF[k] : (k === 'show_name' ? false : ''); if (v[k] === '' || v[k] == null || v[k] === d) delete c[k]; else c[k] = v[k]; });
          this._emit();
        }));
    }
    _item(cam, i, isOpen) {
      const c = this._cfg, it = document.createElement('div'); it.className = 'it' + (isOpen ? ' open' : '');
      it.innerHTML = `<div class="ih"><span class="tx"><b></b><small></small></span><button class="ib up">${ICO.up}</button><button class="ib dn">${ICO.dn}</button><button class="ib exp">${ICO.down}</button><button class="ib del">${ICO.del}</button></div><div class="body"></div>`;
      const setTx = () => { it.querySelector('.tx b').textContent = cam.name || _('Nová kamera'); it.querySelector('.tx small').textContent = cam.name ? `${cam.main || cam.name} · ${cam.sub || cam.name + '_sub'}${cam.aspect ? ' · ' + cam.aspect : ''}` : _('zadaj názov streamu'); };
      setTx();
      const tog = () => { it.classList.toggle('open'); if (it.classList.contains('open')) this._open.add(i); else this._open.delete(i); };
      it.querySelector('.tx').onclick = tog; it.querySelector('.exp').onclick = tog;
      const mv = (d) => () => { const j = i + d; [c.cameras[i], c.cameras[j]] = [c.cameras[j], c.cameras[i]]; this._open = new Set(); this._emit(); this._build(); };
      const u = it.querySelector('.up'), dn = it.querySelector('.dn'); u.disabled = i === 0; dn.disabled = i === c.cameras.length - 1; u.onclick = mv(-1); dn.onclick = mv(1);
      it.querySelector('.del').onclick = () => { c.cameras.splice(i, 1); this._open = new Set(); this._emit(); this._build(); };
      it.querySelector('.body').appendChild(this._form({ name: cam.name || '', main: cam.main || '', sub: cam.sub || '', aspect: cam.aspect || '' },
        [{ name: 'name', selector: { text: {} } }, { name: 'main', selector: { text: {} } }, { name: 'sub', selector: { text: {} } }, { name: 'aspect', selector: { text: {} } }],
        { name: _('Názov (stream v go2rtc)'), main: _('Stream v plnom rozlíšení (voliteľné)'), sub: _('Malý stream do prehľadu (voliteľné)'), aspect: _('Pomer strán (napr. 16/9, voliteľné)') },
        { main: _('Prázdne = rovnaký ako názov.'), sub: _('Prázdne = <názov>_sub.') },
        (v) => { ['name', 'main', 'sub', 'aspect'].forEach((k) => { if (v[k]) cam[k] = v[k]; else delete cam[k]; }); setTx(); this._emit(); }));
      return it;
    }
  }

  if (!customElements.get('igy-camera-card-editor')) customElements.define('igy-camera-card-editor', IgyCameraCardEditor);
  if (!customElements.get('igy-camera-card')) customElements.define('igy-camera-card', IgyCameraCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-camera-card'))
    window.customCards.push({ type: 'igy-camera-card', name: 'Igy Camera Card', description: _('Kamery cez WebRTC (go2rtc), ťuknutím na celú obrazovku so zoomom. Potrebuje WebRTC Camera z HACS.'), preview: false });
  console.info('%c IGY-CAMERA-CARD %c ' + VERSION + ' ', 'background:#64d2ff;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();
