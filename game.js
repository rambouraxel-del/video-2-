// POINTS DE CHUTE — rendu, entrées, audio, enchaînement des niveaux
(function () {
  'use strict';
  const C = window.CORE, LEVELS = window.LEVELS;
  const T = 24, W = C.COLS * T, H = C.ROWS * T;
  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  cv.width = W; cv.height = H;

  const COLORS = {
    score: '#ff4766', jumps: '#ffb21f', deaths: '#b77bff', time: '#3ef3a6',
    static: '#4fd6ff', stat: '#4fd6ff', word: '#4fd6ff', pause: '#ffffff'
  };
  const LABELS = { score: 'SCORE', jumps: 'SAUTS', deaths: 'MORTS', time: 'TEMPS', static: '', stat: '' };
  const FONT = '"VT323", "Courier New", monospace';

  // ---------- Sauvegarde ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignoré */ } }
  };

  // ---------- Audio (synthé WebAudio, aucun fichier) ----------
  const AU = { ctx: null, master: null, muted: store.get('pdc_muted', false), musicOn: true };
  function audioInit() {
    if (AU.ctx) return;
    try {
      AU.ctx = new (window.AudioContext || window.webkitAudioContext)();
      AU.master = AU.ctx.createGain();
      AU.master.gain.value = AU.muted ? 0 : 0.5;
      AU.master.connect(AU.ctx.destination);
      startMusic();
    } catch (e) { AU.ctx = null; }
  }
  function tone(freq, dur, type, vol, slide, delay) {
    if (!AU.ctx) return;
    const t0 = AU.ctx.currentTime + (delay || 0);
    const o = AU.ctx.createOscillator(), g = AU.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(AU.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, freq) {
    if (!AU.ctx) return;
    const n = Math.floor(AU.ctx.sampleRate * dur);
    const buf = AU.ctx.createBuffer(1, n, AU.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = AU.ctx.createBufferSource(); s.buffer = buf;
    const f = AU.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 2000;
    const g = AU.ctx.createGain(); g.gain.value = vol || 0.2;
    s.connect(f); f.connect(g); g.connect(AU.master); s.start();
  }
  const SFX = {
    jump() { tone(330, 0.12, 'square', 0.09, 660); },
    land() { noise(0.05, 0.08, 600); },
    bonk() { tone(140, 0.06, 'square', 0.06, 90); },
    morph() { tone(1200 + Math.random() * 400, 0.03, 'square', 0.035); noise(0.03, 0.05, 5000); },
    tick() { tone(2200, 0.015, 'sine', 0.03); },
    pickup(delta) {
      const base = delta >= 0 ? 523 : 392;
      [0, 4, 7, 12].forEach((s, i) => tone(base * Math.pow(2, (delta >= 0 ? s : -s) / 12), 0.1, 'square', 0.07, null, i * 0.05));
    },
    death() { noise(0.35, 0.25, 1800); tone(440, 0.4, 'sawtooth', 0.1, 55); },
    win() { [0, 4, 7, 12, 16].forEach((s, i) => tone(392 * Math.pow(2, s / 12), 0.18, 'triangle', 0.12, null, i * 0.07)); },
    pause() { tone(880, 0.08, 'sine', 0.12); tone(660, 0.12, 'sine', 0.12, null, 0.08); },
    unpause() { tone(660, 0.08, 'sine', 0.12); tone(880, 0.12, 'sine', 0.12, null, 0.08); },
    deny() { tone(200, 0.1, 'square', 0.08); tone(150, 0.15, 'square', 0.08, null, 0.1); }
  };
  // musique : petite boucle d'arpèges en mineur, discrète
  let musicTimer = null;
  function startMusic() {
    if (!AU.ctx || musicTimer) return;
    const prog = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]];
    let step = 0;
    const spb = 0.16;
    let next = AU.ctx.currentTime + 0.1;
    musicTimer = setInterval(() => {
      if (!AU.ctx) return;
      while (next < AU.ctx.currentTime + 0.3) {
        const chord = prog[Math.floor(step / 16) % prog.length];
        const paused = game.st && game.st.paused;
        if (!paused || step % 4 === 0) {
          const n = chord[[0, 2, 1, 3, 2, 1, 3, 2][step % 8]] + 12;
          playNote(n, next, 0.12, paused ? 0.012 : 0.022, 'triangle');
        }
        if (step % 8 === 0) playNote(chord[0] - 12, next, spb * 7, paused ? 0.02 : 0.045, 'sine');
        next += spb; step++;
      }
    }, 100);
  }
  function playNote(midi, t0, dur, vol, type) {
    const o = AU.ctx.createOscillator(), g = AU.ctx.createGain();
    o.type = type; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(AU.master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function toggleMute() {
    AU.muted = !AU.muted; store.set('pdc_muted', AU.muted);
    if (AU.master) AU.master.gain.value = AU.muted ? 0 : 0.5;
    toast(AU.muted ? 'Son coupé' : 'Son activé');
  }

  // ---------- Entrées ----------
  const keys = {};
  const pressed = { jump: false, pause: false, die: false };
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', Space: 'jump',
    KeyP: 'pause', Escape: 'pause', KeyR: 'die'
  };
  window.addEventListener('keydown', e => {
    audioInit();
    const a = KEYMAP[e.code];
    if (a) {
      e.preventDefault();
      if (!keys[a]) { if (a === 'jump') pressed.jump = true; if (a === 'pause') pressed.pause = true; if (a === 'die') pressed.die = true; }
      keys[a] = true;
    }
    if (e.code === 'KeyM') toggleMute();
    if (e.code === 'KeyC' && game.index === 0) continueGame();
  });
  window.addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) keys[a] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  // contrôles tactiles
  function bindTouch(id, action) {
    const el = document.getElementById(id);
    if (!el) return;
    const on = e => { e.preventDefault(); audioInit(); if (!keys[action]) { if (action in pressed) pressed[action] = true; } keys[action] = true; el.classList.add('on'); };
    const off = e => { e.preventDefault(); keys[action] = false; el.classList.remove('on'); };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
    el.addEventListener('mousedown', on); el.addEventListener('mouseup', off); el.addEventListener('mouseleave', off);
  }
  bindTouch('t-left', 'left'); bindTouch('t-right', 'right'); bindTouch('t-jump', 'jump');
  bindTouch('t-pause', 'pause'); bindTouch('t-die', 'die');
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch');

  // ---------- Jeu ----------
  const game = {
    index: 0, st: null, stats: { deaths: 0, jumps: 0, time: 0, pauses: 0 },
    particles: [], shake: 0, card: 0, toastMsg: '', toastT: 0, segAnim: new Map(),
    trail: [], transition: 0, flash: 0
  };
  window.PDC = game; // utile pour les tests automatisés

  function load(i, keepStats) {
    if (!keepStats && i <= 1) game.stats = { deaths: 0, jumps: 0, time: 0, pauses: 0 };
    game.index = i;
    game.st = C.newState(LEVELS, i, game.stats);
    game.particles = []; game.trail = []; game.segAnim = new Map();
    game.card = LEVELS[i].menu ? 0 : 2.2;
    if (i > store.get('pdc_best', 1) && !LEVELS[i].ending) store.set('pdc_best', i);
  }
  function continueGame() {
    const best = store.get('pdc_best', 1);
    if (best > 1) load(best, true);
  }
  function toast(msg) { game.toastMsg = msg; game.toastT = 2.2; }
  game.load = load;

  function nextLevel() {
    const lv = LEVELS[game.index];
    if (lv.ending) { load(0); return; }
    load(Math.min(game.index + 1, LEVELS.length - 1), true);
  }

  // ---------- Simulation à pas fixe ----------
  let acc = 0, last = performance.now();
  function frame(now) {
    let dt = Math.min(0.1, (now - last) / 1000); last = now;
    acc += dt;
    while (acc >= C.DT) { step(); acc -= C.DT; }
    render(dt);
    requestAnimationFrame(frame);
  }
  function currentInput() {
    const inp = {
      left: !!keys.left, right: !!keys.right, jump: !!keys.jump,
      jumpPressed: pressed.jump, pausePressed: pressed.pause, diePressed: pressed.die
    };
    pressed.jump = pressed.pause = pressed.die = false;
    return inp;
  }
  function step(forced) {
    const st = game.st;
    const inp = forced || currentInput();
    if (inp.pausePressed && !st.level.pause) {
      SFX.deny();
      const reached = game.index >= 8;
      toast(reached ? 'Pas de pause ici.' : 'La pause n\'a pas encore été inventée.');
      inp.pausePressed = false;
    }
    if (st.won > 0) {
      if (st.won > 1.1) nextLevel();
      else C.update(st, inp);
      return;
    }
    C.update(st, inp);
    for (const e of st.events) handleEvent(e);
    // traînée
    const p = st.player;
    if (p.alive && (Math.abs(p.vx) > 1 || Math.abs(p.vy) > 1)) game.trail.push({ x: p.x + C.PW / 2, y: p.y + C.PH / 2, life: 0.25 });
  }
  game.step = (inp, n) => { for (let i = 0; i < (n || 1); i++) step(Object.assign({ left: 0, right: 0, jump: 0, jumpPressed: 0, pausePressed: 0, diePressed: 0 }, i ? Object.assign({}, inp, { jumpPressed: 0, pausePressed: 0, diePressed: 0 }) : inp)); };

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (0.3 + Math.random()) * (speed || 8);
      game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 0.5 + Math.random() * 0.5, max: 1, color, size: 0.12 + Math.random() * 0.15 });
    }
  }
  function handleEvent(e) {
    const p = game.st.player;
    switch (e.type) {
      case 'jump': SFX.jump(); break;
      case 'land': SFX.land(); burst(p.x + 0.4, p.y + 0.8, '#ffe9a8', 5, 3); break;
      case 'bonk': SFX.bonk(); break;
      case 'morph': SFX.morph(); game.flash = Math.max(game.flash, 0.12); break;
      case 'tick': SFX.tick(); break;
      case 'pickup': SFX.pickup(e.delta); burst(e.x, e.y, COLORS[e.kind] || COLORS.score, 18, 7); break;
      case 'death':
        SFX.death(); game.shake = 0.35;
        burst(e.x, e.y, '#fff3b0', 30, 10);
        burst(e.x, e.y, COLORS.deaths, 14, 6);
        if (e.why === 'crush') toast('Écrasé par un chiffre.');
        break;
      case 'win': SFX.win(); burst(p.x + 0.4, p.y + 0.4, '#ffffff', 30, 9); break;
      case 'pause': SFX.pause(); break;
      case 'unpause': SFX.unpause(); break;
    }
  }

  // ---------- Rendu ----------
  function segPoly(x, y, w, h, horizontal) {
    // segment biseauté (style afficheur LED)
    const b = Math.min(w, h) * 0.5;
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(x, y + h / 2); ctx.lineTo(x + b, y); ctx.lineTo(x + w - b, y);
      ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w - b, y + h); ctx.lineTo(x + b, y + h);
    } else {
      ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + b); ctx.lineTo(x + w, y + h - b);
      ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h - b); ctx.lineTo(x, y + b);
    }
    ctx.closePath();
  }
  const SEGRECT = { // x, y, w, h en cases, horizontal ?
    a: [0, 0, 5, 1, 1], g: [0, 4, 5, 1, 1], d: [0, 8, 5, 1, 1],
    f: [0, 0, 1, 5, 0], b: [4, 0, 1, 5, 0], e: [0, 4, 1, 5, 0], c: [4, 4, 1, 5, 0]
  };

  function drawDisplay(st, d, di, t) {
    const color = COLORS[d.kind] || COLORS.static;
    const txt = C.displayText(d, C.valueOf(st, d));
    for (let i = 0; i < txt.length; i++) {
      const segs = C.DIGITS[txt[i]] || '';
      const ox = (d.x + i * 6) * T, oy = d.y * T;
      for (const s of 'abcdefg') {
        const on = segs.includes(s);
        const k = di + ':' + i + ':' + s;
        let a = game.segAnim.get(k);
        if (a === undefined) { a = { v: on ? 1 : 0, flash: 0 }; game.segAnim.set(k, a); }
        if (on && a.v < 1) { if (a.v < 0.5) a.flash = 1; }
        a.v += ((on ? 1 : 0) - a.v) * 0.45;
        a.flash *= 0.88;
        const [sx, sy, sw, sh, hz] = SEGRECT[s];
        const inset = 2;
        segPoly(ox + sx * T + inset, oy + sy * T + inset, sw * T - inset * 2, sh * T - inset * 2, hz);
        // fantôme toujours visible : on peut prévoir le décor
        ctx.fillStyle = 'rgba(255,255,255,0.045)';
        ctx.fill();
        ctx.strokeStyle = hexA(color, 0.16); ctx.lineWidth = 1; ctx.stroke();
        if (a.v > 0.02) {
          ctx.save();
          ctx.globalAlpha = a.v;
          ctx.shadowColor = color; ctx.shadowBlur = 18;
          ctx.fillStyle = a.flash > 0.05 ? mix(color, '#ffffff', a.flash) : color;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          segPoly(ox + sx * T + inset + 3, oy + sy * T + inset + 2, sw * T - inset * 2 - 6, Math.max(2, (sh * T - inset * 2) * (hz ? 0.3 : 1)) , hz);
          if (hz) ctx.fill();
          ctx.restore();
        }
      }
    }
    // étiquette
    const label = d.label || LABELS[d.kind];
    if (label && d.y > 1) {
      ctx.font = `18px ${FONT}`; ctx.fillStyle = color; ctx.textBaseline = 'bottom';
      ctx.globalAlpha = 0.85;
      ctx.fillText(label, d.x * T + 2, d.y * T - 2);
      ctx.globalAlpha = 1;
    } else if (label) {
      ctx.font = `16px ${FONT}`; ctx.fillStyle = color; ctx.textBaseline = 'top';
      ctx.globalAlpha = 0.85; ctx.fillText(label, d.x * T + 2, (d.y + 9) * T + 2); ctx.globalAlpha = 1;
    }
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  }
  function mix(h1, h2, t) {
    const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    const r = Math.round((a >> 16 & 255) * (1 - t) + (b >> 16 & 255) * t);
    const g = Math.round((a >> 8 & 255) * (1 - t) + (b >> 8 & 255) * t);
    const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
    return `rgb(${r},${g},${bl})`;
  }

  function drawBlocks(cells, ox, oy, color, alpha, ghost) {
    for (const [cx, cy] of cells) {
      const x = (ox + cx) * T, y = (oy + cy) * T;
      if (ghost) {
        ctx.strokeStyle = hexA(color, 0.18); ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
        ctx.strokeRect(x + 3.5, y + 3.5, T - 7, T - 7); ctx.setLineDash([]);
      } else {
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.fillStyle = color;
        roundRect(x + 2, y + 2, T - 4, T - 4, 4); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x + 5, y + 4, T - 10, 3);
        ctx.restore();
      }
    }
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  let bgCanvas = null;
  function drawBackground() {
    if (!bgCanvas) {
      bgCanvas = document.createElement('canvas'); bgCanvas.width = W; bgCanvas.height = H;
      const b = bgCanvas.getContext('2d');
      const g = b.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0b0e1d'); g.addColorStop(1, '#05060d');
      b.fillStyle = g; b.fillRect(0, 0, W, H);
      b.fillStyle = 'rgba(120,140,255,0.07)';
      for (let y = 0; y < C.ROWS; y++) for (let x = 0; x < C.COLS; x++) b.fillRect(x * T + T / 2 - 1, y * T + T / 2 - 1, 2, 2);
    }
    ctx.drawImage(bgCanvas, 0, 0);
  }

  function drawWalls(st) {
    const walls = st.parsed.walls;
    for (let y = 0; y < C.ROWS; y++) for (let x = 0; x < C.COLS; x++) {
      if (!walls[y * C.COLS + x]) continue;
      const px = x * T, py = y * T;
      ctx.fillStyle = '#161b2e'; ctx.fillRect(px, py, T, T);
      ctx.fillStyle = '#1d2440'; ctx.fillRect(px + 1, py + 1, T - 2, T - 2);
      const up = y > 0 && walls[(y - 1) * C.COLS + x];
      if (!up) { ctx.fillStyle = '#5a6aa8'; ctx.fillRect(px, py, T, 2); }
      const left = x > 0 && walls[y * C.COLS + x - 1], right = x < C.COLS - 1 && walls[y * C.COLS + x + 1];
      if (!left) { ctx.fillStyle = '#2c3560'; ctx.fillRect(px, py, 2, T); }
      if (!right) { ctx.fillStyle = '#2c3560'; ctx.fillRect(px + T - 2, py, 2, T); }
      if ((x * 7 + y * 13) % 11 === 0) { ctx.fillStyle = 'rgba(120,140,255,0.12)'; ctx.fillRect(px + 8, py + 9, 8, 2); }
    }
  }

  function drawSpikes(st, t) {
    for (const s of st.parsed.spikes) {
      const x = s.x * T, y = s.y * T;
      ctx.fillStyle = '#ff3d6e'; ctx.shadowColor = '#ff3d6e'; ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const bx = x + i * T / 3;
        ctx.moveTo(bx, y + T); ctx.lineTo(bx + T / 6, y + T * 0.45); ctx.lineTo(bx + T / 3, y + T);
      }
      ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  function drawExit(st, t) {
    const e = st.parsed.exit; if (!e) return;
    const x = e.x * T, y = (e.y - 1) * T;
    const pulse = 0.6 + 0.4 * Math.sin(t * 4);
    ctx.save();
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 20 * pulse;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.strokeRect(x + 3, y + 3, T - 6, T * 2 - 3);
    ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.15 * pulse})`;
    ctx.fillRect(x + 5, y + 5, T - 10, T * 2 - 7);
    ctx.restore();
    const label = st.level.exitLabel || 'SORTIE';
    ctx.font = `18px ${FONT}`; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(label, x + T / 2, y - 2);
    ctx.textAlign = 'left';
  }

  function drawPickups(st, t) {
    (st.level.pickups || []).forEach((k, i) => {
      if (st.taken.has(i)) return;
      const color = COLORS[k.kind || 'score'];
      const x = (k.x + 0.5) * T, y = (k.y + 0.5) * T + Math.sin(t * 3 + i) * 3;
      ctx.save();
      ctx.shadowColor = color; ctx.shadowBlur = 16;
      ctx.fillStyle = '#0b0e1d'; ctx.strokeStyle = color; ctx.lineWidth = 2;
      roundRect(x - 17, y - 11, 34, 22, 10); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = `22px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((k.delta >= 0 ? '+' : '−') + Math.abs(k.delta), x, y + 1);
      ctx.restore();
    });
  }

  function drawPlayer(st, t) {
    const p = st.player;
    // traînée
    for (const tr of game.trail) {
      ctx.fillStyle = `rgba(255,236,150,${tr.life * 1.2})`;
      const s = tr.life * 18;
      ctx.fillRect(tr.x * T - s / 2, tr.y * T - s / 2, s, s);
    }
    if (!p.alive) return;
    const cx = (p.x + C.PW / 2) * T, cy = (p.y + C.PH) * T;
    const sq = p.squash;
    const w = C.PW * T * (1 + sq * 0.5), h = C.PH * T * (1 - sq * 0.5);
    ctx.save();
    ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 22;
    ctx.fillStyle = '#fff6c2';
    roundRect(cx - w / 2, cy - h, w, h, 6); ctx.fill();
    ctx.shadowBlur = 0;
    // yeux
    const look = p.face * 2.5;
    const blink = (Math.sin(t * 1.3) > 0.985) ? 0.2 : 1;
    ctx.fillStyle = '#1a1530';
    ctx.fillRect(cx - 5 + look - 1.5, cy - h * 0.62, 3, 5 * blink);
    ctx.fillRect(cx + 3 + look - 1.5, cy - h * 0.62, 3, 5 * blink);
    ctx.restore();
  }

  function drawTexts(st) {
    ctx.textBaseline = 'top';
    for (const tx of st.level.texts || []) {
      if (!tx.t) continue;
      ctx.font = `20px ${FONT}`;
      ctx.fillStyle = 'rgba(200,210,255,0.78)';
      ctx.fillText(tx.t, tx.x * T, tx.y * T);
    }
    if (st.level.ending) {
      const s = game.stats, m = Math.floor(s.time / 60), sec = Math.floor(s.time % 60);
      ctx.font = `20px ${FONT}`; ctx.fillStyle = 'rgba(200,210,255,0.78)';
      ctx.fillText(`Temps : ${m} min ${sec} s · Pauses : ${s.pauses}`, 1 * T, 10.6 * T);
    }
    if (st.level.menu) {
      const best = store.get('pdc_best', 1);
      ctx.font = `20px ${FONT}`; ctx.fillStyle = 'rgba(200,210,255,0.6)';
      if (best > 1) ctx.fillText(`C : reprendre au niveau ${best}`, 1 * T, 16.0 * T);
      ctx.fillText('P pause · M son', 27 * T, 16.0 * T);
      ctx.fillStyle = 'rgba(255,240,180,0.85)';
      ctx.fillText('Un jeu où tes statistiques sont le décor.', 3 * T, 8.4 * T);
    }
  }

  function render(dt) {
    const st = game.st, t = performance.now() / 1000;
    // mise à jour visuelle
    for (const p of game.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 25 * dt; p.life -= dt; }
    game.particles = game.particles.filter(p => p.life > 0);
    for (const tr of game.trail) tr.life -= dt;
    game.trail = game.trail.filter(tr => tr.life > 0);
    game.shake = Math.max(0, game.shake - dt);
    game.card = Math.max(0, game.card - dt);
    game.toastT = Math.max(0, game.toastT - dt);
    game.flash = Math.max(0, game.flash - dt);

    ctx.save();
    if (game.shake > 0) ctx.translate((Math.random() - 0.5) * 14 * game.shake, (Math.random() - 0.5) * 14 * game.shake);
    drawBackground();
    drawWalls(st);
    drawTexts(st);
    drawSpikes(st, t);
    // mots-décor
    for (const w of st.level.words || []) {
      const { cells } = C.textCells(w.text);
      drawBlocks(cells, w.x, w.y, COLORS.word, 1);
    }
    // PAUSE : fantôme quand on joue, solide quand le jeu est en pause
    if (st.level.pause) {
      const { cells } = C.textCells('PAUSE');
      if (st.paused) drawBlocks(cells, st.level.pause.x, st.level.pause.y, COLORS.pause, 1);
      else drawBlocks(cells, st.level.pause.x, st.level.pause.y, COLORS.pause, 1, true);
    }
    (st.level.displays || []).forEach((d, i) => drawDisplay(st, d, i, t));
    drawExit(st, t);
    drawPickups(st, t);
    drawPlayer(st, t);
    for (const p of game.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x * T - p.size * T / 2, p.y * T - p.size * T / 2, p.size * T, p.size * T);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // voile de pause : le monde est figé (teinte froide), toi non
    if (st.paused) {
      ctx.fillStyle = 'rgba(40,60,140,0.12)'; ctx.fillRect(0, 0, W, H);
      ctx.font = `20px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('LE MONDE EST EN PAUSE. PAS TOI.', W - 10, 6); ctx.textAlign = 'left';
    }
    // scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    if (game.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${game.flash * 0.25})`; ctx.fillRect(0, 0, W, H); }

    // carton de niveau
    const lv = st.level;
    if (!lv.menu) {
      ctx.font = `18px ${FONT}`; ctx.fillStyle = 'rgba(160,170,220,0.55)'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText(lv.ending ? 'FIN' : `${game.index}/10 · ${lv.name}`, W - 8, H - 4); ctx.textAlign = 'left';
    }
    if (game.card > 0 && !lv.menu) {
      const a = Math.min(1, game.card / 0.5);
      ctx.fillStyle = `rgba(5,6,13,${0.75 * a})`; ctx.fillRect(0, H / 2 - 50, W, 100);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `26px ${FONT}`; ctx.fillStyle = `rgba(160,170,220,${a})`;
      ctx.fillText(lv.ending ? 'ÉPILOGUE' : `NIVEAU ${game.index}`, W / 2, H / 2 - 18);
      ctx.font = `44px ${FONT}`; ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillText(lv.name, W / 2, H / 2 + 16);
      ctx.textAlign = 'left';
    }
    if (st.won > 0) {
      const a = Math.min(1, st.won / 0.9);
      ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(0, 0, W, H);
    }
    if (lv.hint && (st.deaths >= 3 || st.t > 45) && !st.won) {
      ctx.font = `20px ${FONT}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      const msg = 'INDICE : ' + lv.hint, tw = ctx.measureText(msg).width + 24;
      ctx.fillStyle = 'rgba(5,6,13,0.82)'; ctx.fillRect(W / 2 - tw / 2, H - 50, tw, 26);
      ctx.fillStyle = 'rgba(255,224,102,0.95)'; ctx.fillText(msg, W / 2, H - 37);
      ctx.textAlign = 'left';
    }
    if (game.toastT > 0) {
      const a = Math.min(1, game.toastT / 0.4);
      ctx.font = `24px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(game.toastMsg).width + 30;
      ctx.fillStyle = `rgba(5,6,13,${0.85 * a})`; ctx.fillRect(W / 2 - tw / 2, 40, tw, 36);
      ctx.fillStyle = `rgba(255,240,180,${a})`; ctx.fillText(game.toastMsg, W / 2, 59);
      ctx.textAlign = 'left';
    }
  }

  // ---------- Démarrage ----------
  const q = new URLSearchParams(location.search);
  const startLvl = parseInt(q.get('lvl'), 10);
  load(isFinite(startLvl) ? Math.max(0, Math.min(LEVELS.length - 1, startLvl)) : 0, true);
  if (q.get('test') === '1') { window.PDC_TEST = true; render(0); }
  else requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
  game.render = () => render(1 / 60);
})();
