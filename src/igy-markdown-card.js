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
  // jazyk podľa Home Assistanta: sk = slovenčina, inak angličtina (texty v kóde sú po slovensky, preklady v EN)
  let LANG = String((typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || (typeof navigator !== 'undefined' && navigator.language) || 'en').slice(0, 2).toLowerCase();
  const setLang = (h) => { const l = h && ((h.locale && h.locale.language) || h.language); if (l) LANG = String(l).slice(0, 2).toLowerCase(); };
  const _ = (s, ...a) => { let r = LANG === 'sk' ? s : (EN[s] != null ? EN[s] : s); a.forEach((v, i) => { r = r.split('{' + i + '}').join(v); }); return r; };
  const EN = {
    "Poznámka": "Note",
    "### Nadpis\nText s **tučným** písmom.\n- ☀️ položka zoznamu\n- **🔋 zvýraznená položka**": "### Heading\nText with **bold** font.\n- ☀️ list item\n- **🔋 highlighted item**",
    "Chýba content.": "Missing content.",
    "Načítavam…": "Loading…",
    "Nadpis karty (voliteľné)": "Card title (optional)",
    "Ikona pri nadpise": "Title icon",
    "--- rozdelí obsah do skupín": "--- splits content into groups",
    "Bez pozadia karty": "No card background",
    "Obsah (Markdown + šablóny)": "Content (Markdown + templates)",
    "Obsah funguje rovnako ako v štandardnej Markdown karte (aj Jinja šablóny). Navyše: <b>---</b> začne novú skupinu, <b>emoji</b> na začiatku položky zoznamu je ikona, <b>tučná položka</b> sa zvýrazní.": "Content works like the standard Markdown card (Jinja templates included). In addition: <b>---</b> starts a new group, an <b>emoji</b> at the start of a list item becomes its icon, a <b>bold item</b> is highlighted.",
    "Markdown so šablónami v jednotnom štýle, skupiny cez ---.": "Markdown with templates in the shared style, groups via ---."
  };

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
    static getStubConfig() { return { title: _('Poznámka'), content: _('### Nadpis\nText s **tučným** písmom.\n- ☀️ položka zoznamu\n- **🔋 zvýraznená položka**') }; }
    setConfig(c) {
      if (!c || c.content == null) throw new Error(_('Chýba content.'));
      const changed = !this._config || c.content !== this._config.content;
      this._config = Object.assign({}, c); this._built = false;
      if (changed) { this._unsub(); this._res = null; this._err = null; }
      if (this._hass) { this._render(); this._sub(); }
    }
    set hass(h) { setLang(h); const first = !this._hass; this._hass = h; if (first && this._config) { this._render(); this._sub(); } }
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
        <div class="body" id="b"><div class="ld">${_('Načítavam…')}</div></div></ha-card>`;
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
    set hass(h) { setLang(h);
      this._hass = h;
      if (!this._f) {
        const f = this._f = document.createElement('ha-form');
        f.schema = [{ name: 'title', selector: { text: {} } }, { name: 'icon', selector: { icon: {} } },
          { type: 'grid', name: '', schema: [{ name: 'grouped', selector: { boolean: {} } }, { name: 'text_only', selector: { boolean: {} } }] },
          { name: 'content', selector: { template: {} } }];
        const L = { title: _('Nadpis karty (voliteľné)'), icon: _('Ikona pri nadpise'), grouped: _('--- rozdelí obsah do skupín'), text_only: _('Bez pozadia karty'), content: _('Obsah (Markdown + šablóny)') };
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
        hint.innerHTML = _('Obsah funguje rovnako ako v štandardnej Markdown karte (aj Jinja šablóny). Navyše: <b>---</b> začne novú skupinu, <b>emoji</b> na začiatku položky zoznamu je ikona, <b>tučná položka</b> sa zvýrazní.');
        this.appendChild(hint); this.appendChild(f);
      }
      this._f.hass = h; this._f.data = this._data();
    }
  }

  if (!customElements.get('igy-markdown-card-editor')) customElements.define('igy-markdown-card-editor', HomeMarkdownCardEditor);
  if (!customElements.get('igy-markdown-card')) customElements.define('igy-markdown-card', HomeMarkdownCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === 'igy-markdown-card'))
    window.customCards.push({ type: 'igy-markdown-card', name: 'Igy Markdown Card', description: _('Markdown so šablónami v jednotnom štýle, skupiny cez ---.'), preview: true });
  console.info('%c IGY-MARKDOWN-CARD %c ' + VERSION + ' ', 'background:#ff9f0a;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();
