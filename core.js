// POINTS DE CHUTE — moteur de simulation (sans DOM, testable sous Node)
(function (root) {
  'use strict';

  const COLS = 40, ROWS = 22;
  const G = 62, JV = 23.2, SPEED = 8.2, MAXFALL = 26;
  const PW = 0.8, PH = 0.8; // le joueur est un point décimal : petit et carré
  const DT = 1 / 120;

  // Afficheur 7 segments : chiffre de 5 x 9 cases
  //  aaaaa
  //  f   b
  //  f   b
  //  f   b
  //  ggggg
  //  e   c
  //  e   c
  //  e   c
  //  ddddd
  const DIGITS = {
    0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc',
    5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', ' ': ''
  };
  // cases de chaque segment (hors coins)
  const SEGCELLS = {
    a: [[1, 0], [2, 0], [3, 0]], g: [[1, 4], [2, 4], [3, 4]], d: [[1, 8], [2, 8], [3, 8]],
    f: [[0, 1], [0, 2], [0, 3]], b: [[4, 1], [4, 2], [4, 3]],
    e: [[0, 5], [0, 6], [0, 7]], c: [[4, 5], [4, 6], [4, 7]]
  };
  // coins : allumés si un segment voisin l'est
  const CORNERS = [
    [0, 0, 'af'], [4, 0, 'ab'], [0, 4, 'feg'], [4, 4, 'bcg'], [0, 8, 'ed'], [4, 8, 'cd']
  ];

  function digitCells(ch) {
    const segs = DIGITS[ch] || '';
    const cells = [];
    for (const s of segs) for (const c of SEGCELLS[s]) cells.push(c);
    for (const [x, y, n] of CORNERS) {
      for (const s of n) if (segs.includes(s)) { cells.push([x, y]); break; }
    }
    return cells;
  }

  // Police 3x5 pour les mots-décor (PAUSE, menus, générique)
  const FONT = {
    A: '.#.#.#####.##.#',
    B: '##.#.###.#.###.',
    C: '####..#..#..###',
    D: '##.#.##.##.###.',
    E: '####..####..###',
    F: '####..####..#..',
    G: '####..#.##.####',
    H: '#.##.#####.##.#',
    I: '###.#..#..#.###',
    J: '..#..#..##.####',
    K: '#.##.###.#.##.#',
    L: '#..#..#..#..###',
    M: '#.########.##.#',
    N: '##.#.##.##.##.#',
    O: '####.##.##.####',
    P: '####.#####..#..',
    Q: '####.##.####..#',
    R: '##.#.###.#.##.#',
    S: '####..###..####',
    T: '###.#..#..#..#.',
    U: '#.##.##.##.####',
    V: '#.##.##.##.#.#.',
    W: '#.##.########.#',
    X: '#.##.#.#.#.##.#',
    Y: '#.##.#.#..#..#.',
    Z: '###..#.#.#..###',
    ' ': '...............',
    '!': '.#..#..#.....#.',
    '?': '###..#.##....#.',
    '.': '.............#.',
    "'": '.#..#..........',
    '-': '......###......',
    0: '####.##.##.####',
    1: '.#.##..#..#.###',
    2: '###..#####..###',
    3: '###..####..####',
    4: '#.##.####..#..#',
    5: '####..###..####',
    6: '####..####.####',
    7: '###..#..#..#..#',
    8: '####.#####.####',
    9: '####.####..####',
    '<': '..#.#.#...#...#',
    '>': '#...#...#.#.#..'
  };
  function glyph(ch) {
    const g = FONT[ch] || FONT[' '];
    const cells = [];
    for (let i = 0; i < 15; i++) if (g[i] === '#') cells.push([i % 3, Math.floor(i / 3)]);
    return cells;
  }
  function textCells(text) {
    const cells = [];
    let x = 0;
    for (const ch of text.toUpperCase()) {
      for (const [cx, cy] of glyph(ch)) cells.push([x + cx, cy]);
      x += 4;
    }
    return { cells, width: Math.max(0, x - 1) };
  }

  function mod(v, n) { return ((v % n) + n) % n; }

  // ----- État -----
  function displayText(d, v) {
    const n = Math.pow(10, d.digits);
    let s = String(mod(v, n));
    while (s.length < d.digits) s = (d.blank ? ' ' : '0') + s;
    return s;
  }

  function parseMap(level) {
    const walls = new Uint8Array(COLS * ROWS);
    const spikes = [];
    let start = { x: 1, y: 1 }, exit = null;
    const map = level.map || [];
    for (let y = 0; y < ROWS; y++) {
      const row = map[y] || '';
      for (let x = 0; x < COLS; x++) {
        const c = row[x] || '.';
        if (c === '#') walls[y * COLS + x] = 1;
        else if (c === '^') spikes.push({ x, y });
        else if (c === 'S') start = { x, y };
        else if (c === 'E') exit = { x, y };
      }
    }
    return { walls, spikes, start, exit };
  }

  function newState(levels, index, globalStats) {
    const st = {
      levels, index, level: levels[index],
      stats: globalStats || { deaths: 0, jumps: 0, time: 0, pauses: 0 },
      events: [], deaths: 0, t: 0
    };
    const lv = st.level;
    st.parsed = parseMap(lv);
    st.deaths = 0;
    resetLevel(st);
    return st;
  }

  function startValue(lv, kind) {
    const d = (lv.displays || []).find(d => d.kind === kind);
    return d && d.start !== undefined ? d.start : 0;
  }

  function resetLevel(st) {
    const lv = st.level, p = st.parsed;
    st.values = {
      score: startValue(lv, 'score'), jumps: startValue(lv, 'jumps'),
      deaths: startValue(lv, 'deaths') + st.deaths, time: startValue(lv, 'time'), static: 0
    };
    st.timeAcc = 0;
    st.paused = false;
    st.taken = new Set();
    st.player = {
      x: p.start.x + (1 - PW) / 2, y: p.start.y + 1 - PH, vx: 0, vy: 0,
      onGround: false, coyote: 0, jumpBuf: 0, face: 1, alive: true, squash: 0
    };
    st.dead = 0; st.won = 0; st.crushed = false;
    rebuild(st);
  }

  function valueOf(st, d) {
    if (d.kind === 'static') return d.start || 0;
    if (d.kind === 'stat') return Math.floor(st.stats[d.key] || 0);
    return st.values[d.kind];
  }

  function rebuild(st) {
    const lv = st.level;
    const grid = new Uint8Array(st.parsed.walls);
    for (const d of lv.displays || []) {
      const txt = displayText(d, valueOf(st, d));
      for (let i = 0; i < txt.length; i++) {
        for (const [cx, cy] of digitCells(txt[i])) setCell(grid, d.x + i * 6 + cx, d.y + cy, 2);
      }
    }
    for (const w of lv.words || []) {
      if (!wordActive(st, w)) continue;
      for (const [cx, cy] of textCells(w.text).cells) setCell(grid, w.x + cx, w.y + cy, 3);
    }
    if (lv.pause && st.paused) {
      for (const [cx, cy] of textCells('PAUSE').cells) setCell(grid, lv.pause.x + cx, lv.pause.y + cy, 4);
    }
    st.grid = grid;
  }
  function wordActive(st, w) {
    if (w.solid === false) return false;
    if (w.when === 'pause') return st.paused;
    if (w.when === 'play') return !st.paused;
    return true;
  }
  function setCell(grid, x, y, v) {
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS) grid[y * COLS + x] = v;
  }
  function solid(st, x, y) {
    if (x < 0 || x >= COLS) return true;
    if (y < 0 || y >= ROWS) return false;
    return st.grid[y * COLS + x] !== 0;
  }
  function overlapsSolid(st, x, y) {
    const x0 = Math.floor(x + 1e-6), x1 = Math.floor(x + PW - 1e-6);
    const y0 = Math.floor(y + 1e-6), y1 = Math.floor(y + PH - 1e-6);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solid(st, tx, ty)) return true;
    return false;
  }

  // Quand le décor change sous le joueur : on le pousse, sinon il est écrasé
  function changed(st, why) {
    rebuild(st);
    st.events.push({ type: 'morph', why });
    const p = st.player;
    if (!p.alive || !overlapsSolid(st, p.x, p.y)) return;
    const tries = [];
    for (let d = 0.05; d <= 1.6; d += 0.05) {
      tries.push([0, -d]);
      if (d <= 1.0) { tries.push([d, 0]); tries.push([-d, 0]); }
      if (d <= 0.9) tries.push([0, d]);
    }
    for (const [dx, dy] of tries) {
      if (!overlapsSolid(st, p.x + dx, p.y + dy)) {
        p.x += dx; p.y += dy;
        if (dy < 0) p.vy = Math.min(p.vy, 0);
        return;
      }
    }
    st.crushed = true;
    kill(st, 'crush');
  }

  function kill(st, why) {
    const p = st.player;
    if (!p.alive || st.won) return;
    p.alive = false;
    st.dead = 0.75;
    st.deaths++;
    st.stats.deaths++;
    st.values.deaths++;
    st.events.push({ type: 'death', why, x: p.x + PW / 2, y: p.y + PH / 2 });
    rebuild(st); // le compteur de morts change le décor à l'instant même
  }

  function addValue(st, kind, delta) {
    const d = (st.level.displays || []).find(d => d.kind === kind);
    st.values[kind] = d ? mod(st.values[kind] + delta, Math.pow(10, d.digits)) : st.values[kind] + delta;
  }

  function update(st, input) {
    st.events.length = 0;
    st.t += DT;
    const lv = st.level, p = st.player;

    if (st.won > 0) { st.won += DT; return; }
    if (!p.alive) {
      st.dead -= DT;
      if (st.dead <= 0) { resetLevel(st); st.events.push({ type: 'respawn' }); }
      return;
    }
    st.stats.time += DT;

    if (input.diePressed) { kill(st, 'self'); return; }

    if (input.pausePressed && lv.pause) {
      st.paused = !st.paused;
      if (st.paused) st.stats.pauses++;
      st.events.push({ type: st.paused ? 'pause' : 'unpause' });
      changed(st, 'pause');
      if (!p.alive) return;
    }

    // Le temps (ne s'écoule pas pendant la pause — mais toi, si)
    const td = (lv.displays || []).find(d => d.kind === 'time');
    if (td && !st.paused) {
      st.timeAcc += DT;
      const period = td.period || 1;
      while (st.timeAcc >= period) {
        st.timeAcc -= period;
        addValue(st, 'time', td.dir || 1);
        st.events.push({ type: 'tick' });
        changed(st, 'time');
        if (!p.alive) return;
      }
    }

    // Déplacement horizontal
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) p.face = dir;
    const target = dir * SPEED;
    const acc = p.onGround ? 90 : 55;
    if (p.vx < target) p.vx = Math.min(target, p.vx + acc * DT);
    else if (p.vx > target) p.vx = Math.max(target, p.vx - acc * DT);

    // Saut
    if (input.jumpPressed) p.jumpBuf = 0.13;
    else p.jumpBuf = Math.max(0, p.jumpBuf - DT);
    if (p.onGround) p.coyote = 0.1; else p.coyote = Math.max(0, p.coyote - DT);
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -JV; p.jumpBuf = 0; p.coyote = 0; p.onGround = false; p.squash = -0.35;
      st.stats.jumps++;
      st.events.push({ type: 'jump' });
      if ((lv.displays || []).some(d => d.kind === 'jumps')) {
        addValue(st, 'jumps', (lv.displays.find(d => d.kind === 'jumps').dir) || 1);
        changed(st, 'jumps');
        if (!p.alive) return;
      } else if ((lv.displays || []).some(d => d.kind === 'stat')) { changed(st, 'stat'); if (!p.alive) return; }
    }
    if (!input.jump && p.vy < -JV * 0.42) p.vy = -JV * 0.42;

    p.vy = Math.min(MAXFALL, p.vy + G * DT);

    // X
    let nx = p.x + p.vx * DT;
    if (overlapsSolid(st, nx, p.y)) {
      if (p.vx > 0) nx = Math.floor(nx + PW) - PW - 1e-4;
      else if (p.vx < 0) nx = Math.floor(nx) + 1 + 1e-4;
      if (overlapsSolid(st, nx, p.y)) nx = p.x;
      p.vx = 0;
    }
    p.x = nx;
    // Y
    let ny = p.y + p.vy * DT;
    const wasGround = p.onGround;
    p.onGround = false;
    if (overlapsSolid(st, p.x, ny)) {
      if (p.vy > 0) { ny = Math.floor(ny + PH) - PH - 1e-4; p.onGround = true; if (!wasGround && p.vy > 8) { p.squash = 0.4; st.events.push({ type: 'land' }); } }
      else if (p.vy < 0) { ny = Math.floor(ny) + 1 + 1e-4; st.events.push({ type: 'bonk' }); }
      if (overlapsSolid(st, p.x, ny)) ny = p.y;
      p.vy = 0;
    }
    p.y = ny;
    p.squash *= 0.86;

    // Dangers
    if (p.y > ROWS + 1) { kill(st, 'fall'); return; }
    for (const s of st.parsed.spikes) {
      if (p.x < s.x + 0.85 && p.x + PW > s.x + 0.15 && p.y + PH > s.y + 0.45 && p.y < s.y + 1) { kill(st, 'spike'); return; }
    }

    // Bonus
    (lv.pickups || []).forEach((k, i) => {
      if (st.taken.has(i)) return;
      const cx = k.x + 0.5, cy = k.y + 0.5;
      if (cx > p.x - 0.4 && cx < p.x + PW + 0.4 && cy > p.y - 0.4 && cy < p.y + PH + 0.4) {
        st.taken.add(i);
        const kind = k.kind || 'score';
        addValue(st, kind, k.delta);
        st.events.push({ type: 'pickup', x: cx, y: cy, delta: k.delta, kind });
        changed(st, kind);
      }
    });
    if (!p.alive) return;

    // Sortie
    const e = st.parsed.exit;
    if (e && p.onGround && p.x < e.x + 1 && p.x + PW > e.x && p.y < e.y + 1 && p.y + PH > e.y) {
      st.won = DT;
      st.events.push({ type: 'win' });
    }
  }

  const API = {
    COLS, ROWS, DT, PW, PH, DIGITS, SEGCELLS, digitCells, textCells, displayText,
    newState, resetLevel, update, rebuild, valueOf, solid
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.CORE = API;
})(this);
