// Vérifie que chaque niveau est faisable (solveur) + contrôles anti-raccourcis
// Usage : node tools/test_all.js
const L = require('../levels.js'); const S = require('./solve.js');
let ok = true;
function check(name, r, expectFail) {
  const pass = expectFail ? r.fail : !r.fail;
  ok = ok && pass;
  console.log((pass ? 'OK   ' : 'ÉCHEC') + ' ' + name + (r.path ? ` (${r.path.length} actions)` : ''));
}
for (let i = 0; i < L.length; i++) if (L[i].id !== 'final') check(`#${i} ${L[i].name}`, S.solve(i, 300000));
const F = L.findIndex(l => l.id === 'final');
// Final, vérifié en deux étapes (le chrono fait exploser l'espace d'états)
const saved = L[F].displays.find(d => d.kind === 'deaths').start;
L[F].displays.find(d => d.kind === 'deaths').start = 1;
check('#10 final, étape 1 (haut → plateforme, 1 mort)', S.solve(F, 400000, null, st => st.player.y > 17 && st.player.x > 26, true));
L[F].displays.find(d => d.kind === 'deaths').start = saved;
check('#10 final, étape 2 (pause sur 5 → sortie)', S.solve(F, 400000, st => { st.player.x = 28; st.player.y = 20.2; st.values.jumps = 5; st.values.deaths = 1; st.values.score = 7; st.taken.add(0); st.values.time = 5; st.paused = true; }));
check('#10 final, raccourci sans mourir impossible', S.solve(F, 300000, null, st => st.player.y > 15 && st.values.deaths === 0, true), true);
console.log(ok ? '\nTOUS LES TESTS PASSENT' : '\nDES TESTS ÉCHOUENT');
process.exit(ok ? 0 : 1);
