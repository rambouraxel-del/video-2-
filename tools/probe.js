// Explore un niveau et affiche les positions atteintes (carte de couverture)
const C = require('../core.js'); const L = require('../levels.js'); const S = require('./solve.js');
const idx = +process.argv[2]; const over = JSON.parse(process.argv[3] || '{}');
const lv = JSON.parse(JSON.stringify(L[idx]));
for (const d of lv.displays || []) if (over[d.kind] !== undefined) d.start = over[d.kind];
const LL = L.slice(); LL[idx] = lv;
// BFS minimal : réutilise solve en remplaçant temporairement le niveau
const orig = L[idx]; L[idx] = lv;
const reach = new Set();
const st0 = C.newState(L, idx);
const origUpdate = C.update;
C.update = function (st, i) { origUpdate(st, i); if (st.player.alive && st.player.onGround) reach.add(Math.floor(st.player.x + 0.4) + ',' + Math.floor(st.player.y + 0.5)); };
const r = S.solve(idx, +process.argv[4] || 100000);
console.log(r.fail ? 'FAIL' : 'OK ' + r.path.join(' → '));
C.update = origUpdate;
C.rebuild(st0);
for (let y = 0; y < 22; y++) { let row = ''; for (let x = 0; x < 40; x++) row += reach.has(x + ',' + y) ? '*' : '.#DWP'[st0.grid[y * 40 + x]]; console.log(String(y).padStart(2), row); }
