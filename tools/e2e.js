// Test bout-en-bout : rejoue les solutions du solveur au clavier simulé dans le vrai jeu
const { chromium } = require('playwright');
const path = require('path');
const C = require('../core.js'); const L = require('../levels.js'); const S = require('./solve.js');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 528 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?lvl=0&test=1');
  // Menu -> niveau 1 en marchant vers JOUER (entrées injectées image par image)
  const r = S.solve(0, 50000);
  const acts = S.actionsFor(0);
  for (const name of r.path) {
    const a = acts.find(x => x.name === name);
    for (const [n, inp] of a.seq) await p.evaluate(([inp, n]) => PDC.step(inp, n), [inp, n]);
    await p.evaluate(() => PDC.step({}, 300));
  }
  await p.evaluate(() => PDC.step({}, 200));
  const idx = await p.evaluate(() => PDC.index);
  console.log('Après le menu, niveau =', idx);
  // pause indisponible avant le niveau 8
  await p.evaluate(() => PDC.step({ pausePressed: 1 }, 1));
  console.log('Message :', await p.evaluate(() => PDC.toastMsg));
  // niveau 8 : la pause fait apparaître le mot PAUSE solide
  await p.evaluate(() => PDC.load(8, true));
  await p.evaluate(() => PDC.step({ pausePressed: 1 }, 1));
  console.log('Niveau 8 en pause :', await p.evaluate(() => PDC.st.paused), 'cases PAUSE :', await p.evaluate(() => PDC.st.grid.filter(v => v === 4).length));
  // épilogue -> retour menu
  await p.evaluate(() => PDC.load(11, true));
  await p.evaluate(() => { PDC.st.won = 1.2; PDC.step({}, 1); });
  console.log('Après épilogue, niveau =', await p.evaluate(() => PDC.index));
  console.log(errors.length ? 'ERREURS: ' + errors.join('\n') : 'aucune erreur JS');
  await b.close();
})();
