// Spojí všetky karty zo src/ do jedného súboru dist/igy-cards.js (ten načíta HACS ako jeden zdroj).
// Spustenie: node scripts/build.js        Kontrola aktuálnosti: node scripts/build.js --check
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const ORDER = ['igy-energy-card', 'igy-weather-card', 'igy-thermostat-card', 'igy-room-card', 'igy-entities-card',
  'igy-buttons-card', 'igy-markdown-card', 'igy-circuits-card', 'igy-battery-card', 'igy-camera-card', 'igy-energy-story-card'];
const extra = fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).filter((n) => !ORDER.includes(n));
if (extra.length) { console.error('Karty mimo poradia v build.js:', extra.join(', ')); process.exit(1); }
let out = `/*! igy-cards v${pkg.version} – ${ORDER.length} kariet pre Home Assistant · ${pkg.homepage} · licencia MIT */\n`;
for (const n of ORDER) out += `\n/* ===== ${n} ===== */\n` + fs.readFileSync(path.join(root, 'src', n + '.js'), 'utf8').trim() + '\n';
out += `\nconsole.info('%c IGY-CARDS %c ${pkg.version} ', 'background:#ffb340;color:#000;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');\n`;
const dst = path.join(root, 'dist', 'igy-cards.js');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : '';
  if (cur !== out) { console.error('dist/igy-cards.js nie je aktuálny – spusti: node scripts/build.js'); process.exit(1); }
  console.log('dist/igy-cards.js je aktuálny'); process.exit(0);
}
fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.writeFileSync(dst, out);
console.log('dist/igy-cards.js', (out.length / 1024).toFixed(0) + ' kB,', ORDER.length, 'kariet');
