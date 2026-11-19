// Usage: node tools/preview.js <levelIndex> [score=3 jumps=2 ...] [pause]
const C = require('../core.js');
const L = require('../levels.js');
const i = +process.argv[2] || 0;
const st = C.newState(L, i);
for (const a of process.argv.slice(3)) {
  if (a === 'pause') st.paused = true;
  else { const [k, v] = a.split('='); st.values[k] = +v; }
}
C.rebuild(st);
const lv = L[i];
console.log(`#${i} ${lv.name}`, JSON.stringify(st.values), st.paused ? 'PAUSE' : '');
const ch = ['.', '#', 'D', 'W', 'P'];
for (let y = 0; y < C.ROWS; y++) {
  let row = '';
  for (let x = 0; x < C.COLS; x++) {
    let c = ch[st.grid[y * C.COLS + x]];
    if (st.parsed.spikes.some(s => s.x === x && s.y === y)) c = '^';
    if (st.parsed.start.x === x && st.parsed.start.y === y) c = 'S';
    if (st.parsed.exit && st.parsed.exit.x === x && st.parsed.exit.y === y) c = 'E';
    (lv.pickups || []).forEach(k => { if (k.x === x && k.y === y) c = 'o'; });
    row += c;
  }
  console.log(String(y).padStart(2) + ' ' + row);
}
