// Captures d'écran de chaque niveau + vérification d'absence d'erreurs JS
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || '/tmp/shots';
  require('fs').mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 528 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const url = 'file://' + path.resolve(__dirname, '../index.html');
  const which = process.argv[3] ? process.argv[3].split(',').map(Number) : [...Array(12).keys()];
  for (const i of which) {
    await p.goto(url + '?lvl=' + i);
    await p.waitForTimeout(2600);
    await p.screenshot({ path: `${out}/lvl${i}.png` });
  }
  console.log(errors.length ? 'ERREURS: ' + errors.join('\n') : 'aucune erreur JS');
  await b.close();
})();
