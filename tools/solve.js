// Solveur par recherche en largeur sur des macro-actions (vérifie qu'un niveau est faisable)
// Usage: node tools/solve.js <levelIndex> [maxStates]
const C = require('../core.js');
const L = require('../levels.js');

function clone(st) {
  const s = Object.assign({}, st);
  s.player = Object.assign({}, st.player);
  s.values = Object.assign({}, st.values);
  s.taken = new Set(st.taken);
  s.stats = Object.assign({}, st.stats);
  s.events = [];
  s.grid = new Uint8Array(st.grid);
  return s;
}
const NONE = { left: 0, right: 0, jump: 0, jumpPressed: 0, pausePressed: 0, diePressed: 0 };
function inp(o) { return Object.assign({}, NONE, o); }

// exécute une séquence d'entrées puis attend le repos ; renvoie {st, frames, ok}
function run(st, seq) {
  let frames = 0;
  for (const [n, o] of seq) {
    for (let i = 0; i < n; i++) {
      C.update(st, i === 0 ? o : Object.assign({}, o, { jumpPressed: 0, pausePressed: 0, diePressed: 0 }));
      frames++;
      if (st.won) return { st, frames, win: true };
    }
  }
  // repos
  for (let i = 0; i < 400; i++) {
    if (st.won) return { st, frames, win: true };
    if (st.player.alive && st.player.onGround && Math.abs(st.player.vx) < 0.01 && st.dead <= 0) return { st, frames };
    C.update(st, NONE); frames++;
  }
  return { st, frames, stuck: true };
}

function actions(lv) {
  const A = [];
  for (const d of [-1, 1]) {
    const k = d < 0 ? { left: 1 } : { right: 1 };
    for (const n of [4, 8, 15, 30, 60]) A.push({ name: `walk${d}x${n}`, seq: [[n, inp(k)]] });
    for (const hold of [8, 14, 60]) for (const air of [4, 10, 18, 30, 80]) {
      A.push({ name: `jump${d} h${hold} a${air}`, seq: [[air, inp(Object.assign({ jump: 1, jumpPressed: 1 }, k, air > hold ? {} : {}))]].map(x => x), hold, air, d });
    }
    for (const run of [8, 20]) for (const air of [10, 30, 80])
      A.push({ name: `run${d}x${run} jump a${air}`, seq: [[run, inp(k)], [air, inp(Object.assign({ jump: 1, jumpPressed: 1 }, k))]] });
  }
  for (const hold of [6, 14, 60]) A.push({ name: `hop h${hold}`, seq: [[hold, inp({ jump: 1, jumpPressed: 1 })]] });
  // saut vertical puis dérive
  for (const d of [-1, 1]) for (const delay of [10, 22]) {
    const k = d < 0 ? { left: 1 } : { right: 1 };
    A.push({ name: `hop then ${d} @${delay}`, seq: [[delay, inp({ jump: 1, jumpPressed: 1 })], [60, inp(Object.assign({ jump: 1 }, k))]] });
  }
  if (lv.pause) A.push({ name: 'PAUSE', seq: [[1, inp({ pausePressed: 1 })]] });
  if ((lv.displays || []).some(d => d.kind === 'time')) A.push({ name: 'wait', seq: [[30, NONE]] }, { name: 'wait long', seq: [[120, NONE]] });
  if ((lv.displays || []).some(d => d.kind === 'deaths')) A.push({ name: 'DIE', seq: [[1, inp({ diePressed: 1 })], [100, NONE]] });
  // transforme les sauts : maintien du saut 'hold' frames, direction pendant 'air' frames
  return A.map(a => {
    if (a.hold === undefined) return a;
    const k = a.d < 0 ? { left: 1 } : { right: 1 };
    const seq = [];
    const both = Math.min(a.hold, a.air);
    seq.push([both, inp(Object.assign({ jump: 1, jumpPressed: 1 }, k))]);
    if (a.air > a.hold) seq.push([a.air - a.hold, inp(k)]);
    else if (a.hold > a.air) seq.push([a.hold - a.air, inp({ jump: 1 })]);
    return { name: a.name, seq };
  });
}

function key(st, ignoreTime) {
  const p = st.player;
  const td = (st.level.displays || []).find(d => d.kind === 'time');
  const has = k => (st.level.displays || []).some(d => d.kind === k);
  return [Math.round(p.x * 4), Math.round(p.y * 10), st.values.score, has('jumps') ? st.values.jumps : '', has('deaths') ? st.values.deaths % Math.pow(10, Math.max(...st.level.displays.filter(d => d.kind === 'deaths').map(d => d.digits))) : '',
    td && !ignoreTime ? st.values.time + ':' + (st.paused ? 0 : Math.floor(st.timeAcc * 4)) : '', st.paused ? 1 : 0, [...st.taken].sort().join(',')].join('|');
}

function solve(idx, maxStates = 60000, init, goal, ignoreTime) {
  const lv = L[idx];
  let st0 = C.newState(L, idx);
  if (init) { init(st0); C.rebuild(st0); }
  st0 = run(st0, []).st;
  const A = actions(lv);
  const seen = new Map([[key(st0, ignoreTime), null]]);
  let frontier = [{ st: st0, path: [] }];
  let count = 0;
  while (frontier.length && count < maxStates) {
    const next = [];
    for (const node of frontier) {
      for (const a of A) {
        const r = run(clone(node.st), a.seq);
        count++;
        if (r.win || (goal && r.st.player.alive && goal(r.st))) return { path: node.path.concat(a.name), trace: (node.trace||[]).concat(a.name+' WIN'), states: count };
        if (r.stuck || !r.st.player.alive) continue;
        const k = key(r.st, ignoreTime);
        if (seen.has(k)) continue;
        seen.set(k, 1);
        const p = r.st.player;
        next.push({ st: r.st, path: node.path.concat(a.name), trace: (node.trace||[]).concat(`${a.name} => (${p.x.toFixed(1)},${p.y.toFixed(1)}) ${JSON.stringify(r.st.values)} d${r.st.deaths}${r.st.paused?' P':''}`) });
      }
    }
    frontier = next;
  }
  return { fail: true, states: count, explored: seen.size };
}

if (require.main === module) {
  const idxs = process.argv[2] === 'all' ? L.map((_, i) => i) : [+process.argv[2]];
  for (const i of idxs) {
    const t = Date.now();
    const r = solve(i, +process.argv[3] || 60000);
    if (process.argv[4] && !r.fail) console.log(r.trace.join('\n'));
    console.log(`#${i} ${L[i].name}:`, r.fail ? `ÉCHEC (${r.explored} états)` : `OK en ${r.path.length} actions : ${r.path.join(' → ')}`, `${Date.now() - t}ms`);
  }
}
module.exports = { solve, clone, run, actionsFor: i => actions(L[i]) };
