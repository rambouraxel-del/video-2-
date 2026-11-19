// POINTS DE CHUTE — niveaux
// Carte 40x22 : '#' mur, '^' pointes, 'S' départ, 'E' sortie, '.' vide
// displays : afficheurs 7 segments SOLIDES. kind = score | jumps | deaths | time | static
(function (root) {
  function M(rows) { // complète la carte à 22 lignes de 40 colonnes
    const out = [];
    for (let y = 0; y < 22; y++) out.push(((rows[y] || '') + '.'.repeat(40)).slice(0, 40));
    return out;
  }
  function fill(map, x0, y0, x1, y1, c) { // remplissage rectangle (inclus)
    for (let y = y0; y <= y1; y++) map[y] = map[y].slice(0, x0) + c.repeat(x1 - x0 + 1) + map[y].slice(x1 + 1);
    return map;
  }
  function put(map, x, y, c) { return fill(map, x, y, x, y, c); }
  function build(f) { const m = M([]); f(m); return m; }

  const LEVELS = [];

  // 0 — MENU : le titre est un décor
  LEVELS.push({
    id: 'menu', name: 'MENU', menu: true,
    map: build(m => { fill(m, 0, 18, 39, 21, '#'); fill(m, 6, 16, 8, 17, '#'); put(m, 2, 17, 'S'); put(m, 36, 17, 'E'); }),
    words: [
      { text: 'POINTS', x: 3, y: 3 }, { text: 'DE', x: 29, y: 3 }, { text: 'CHUTE', x: 12, y: 10 }
    ],
    exitLabel: 'JOUER',
    texts: [
      { x: 1, y: 20.6, t: '← → bouger   ↑ / ESPACE sauter   R mourir' }
    ]
  });

  // 1 — Le score est le sol
  LEVELS.push({
    id: 'sol', hint: 'Ramasse le +1 : le 1 deviendra un 2, qui a un toit.', name: 'LE SOL EST UN SCORE',
    map: build(m => {
      fill(m, 0, 12, 13, 21, '#'); fill(m, 19, 12, 39, 21, '#'); fill(m, 10, 10, 23, 10, '#');
      put(m, 2, 11, 'S'); put(m, 36, 11, 'E');
    }),
    displays: [{ kind: 'score', x: 14, y: 12, digits: 1, start: 1, label: 'SCORE' }],
    pickups: [{ x: 7, y: 11, delta: 1 }],
    texts: [
      { x: 1, y: 2, t: "Tu es le point décimal. Tu t'es échappé du tableau des scores." },
      { x: 1, y: 3.2, t: 'Ici, les chiffres sont solides.' }
    ]
  });

  // 2 — Retenue : choisir ses additions
  LEVELS.push({
    id: 'retenue', hint: "Il faut un 1 au bout du chemin (un 1 n'a ni toit ni plancher). Évite le +2.", name: 'CHOISIR SES ADDITIONS',
    map: build(m => {
      fill(m, 0, 10, 5, 21, '#'); fill(m, 3, 8, 13, 8, '#');
      fill(m, 11, 10, 21, 21, '#');
      fill(m, 27, 10, 39, 12, '#');
      fill(m, 22, 21, 39, 21, '#');
      put(m, 1, 9, 'S'); put(m, 36, 20, 'E');
    }),
    displays: [
      { kind: 'score', x: 6, y: 10, digits: 1, start: 4, label: 'SCORE' },
      { kind: 'score', x: 22, y: 10, digits: 1, start: 4, label: 'SCORE' }
    ],
    pickups: [{ x: 3, y: 9, delta: 1 }, { x: 14, y: 9, delta: 6 }, { x: 18, y: 9, delta: 2 }],
    texts: [
      { x: 1, y: 2, t: 'Ramasser un nombre, c\'est déplacer les murs.' },
      { x: 1, y: 3.2, t: 'Coincé ? R pour recommencer. (Ça compte comme une mort.)' }
    ]
  });


  // 3 — Sauts : chaque saut est compté
  LEVELS.push({
    id: 'sauts', hint: "La porte s'ouvre sur un 3, un 5 ou un 9. Saute sur place pour ajuster.", name: 'CHAQUE SAUT COMPTE',
    map: build(m => {
      fill(m, 0, 17, 23, 21, '#'); fill(m, 29, 9, 39, 21, '#');
      fill(m, 8, 15, 9, 16, '#'); fill(m, 15, 14, 16, 16, '#');
      fill(m, 24, 21, 28, 21, '#'); fill(m, 24, 20, 28, 20, '^');
      put(m, 2, 16, 'S'); put(m, 26, 16, 'E');
    }),
    displays: [{ kind: 'jumps', x: 24, y: 9, digits: 1, start: 0, label: 'SAUTS' }],
    texts: [
      { x: 1, y: 2, t: 'Ce compteur-là compte tes sauts.' },
      { x: 1, y: 3.2, t: 'La sortie dort dans le ventre du chiffre.' }
    ]
  });

  // 4 — Le sas : on entre dans un chiffre, on en change, on ressort
  LEVELS.push({
    id: 'sas', hint: "Entre sur un 2 ou un 3. Petits sauts dedans jusqu'au 5, puis sors à droite.", name: 'LE SAS',
    map: build(m => {
      fill(m, 0, 11, 16, 21, '#'); fill(m, 0, 7, 16, 7, '#');
      fill(m, 22, 11, 39, 21, '#'); fill(m, 22, 7, 39, 7, '#');
      put(m, 2, 10, 'S'); put(m, 36, 10, 'E');
    }),
    displays: [{ kind: 'jumps', x: 17, y: 7, digits: 1, start: 0, label: 'SAUTS' }],
    texts: [
      { x: 1, y: 2, t: 'Un chiffre est une pièce avec des portes.' },
      { x: 1, y: 3.2, t: 'Entre. Change-le de l\'intérieur. Ressors.' }
    ]
  });

  // 5 — Il faudra mourir
  LEVELS.push({
    id: 'mourir', hint: 'Un 1 laisse passer. Il te faut exactement une mort. R.', name: 'IL FAUDRA MOURIR',
    map: build(m => {
      fill(m, 0, 6, 14, 21, '#'); fill(m, 20, 6, 39, 15, '#'); fill(m, 15, 21, 39, 21, '#');
      put(m, 9, 5, '^'); put(m, 10, 5, '^');
      put(m, 2, 5, 'S'); put(m, 37, 20, 'E');
    }),
    displays: [{ kind: 'deaths', x: 15, y: 6, digits: 1, start: 0, label: 'MORTS' }],
    texts: [
      { x: 1, y: 2, t: 'Ici, rien ne s\'efface quand tu meurs.' },
      { x: 1, y: 3.2, t: 'Sauf toi.' }
    ]
  });

  // 6 — Dix
  LEVELS.push({
    id: 'dix', hint: 'Le chiffre des dizaines doit être un 1, et celui des unités doit avoir un toit.', name: 'LA DIZAINE',
    map: build(m => {
      fill(m, 0, 5, 7, 21, '#'); fill(m, 0, 3, 14, 3, '#');
      fill(m, 13, 5, 19, 21, '#'); fill(m, 25, 5, 25, 13, '#'); fill(m, 31, 5, 39, 13, '#');
      fill(m, 20, 21, 39, 21, '#');
      put(m, 1, 4, 'S'); put(m, 37, 20, 'E');
    }),
    displays: [
      { kind: 'deaths', x: 8, y: 5, digits: 1, start: 0, label: 'MORTS' },
      { kind: 'deaths', x: 20, y: 5, digits: 2, start: 0, label: 'MORTS' }
    ],
    texts: [
      { x: 1, y: 0.8, t: 'Deux afficheurs, un seul compteur.' },
      { x: 20, y: 18, t: 'Toutes les morts se valent.' }
    ]
  });

  // 7 — Le temps
  LEVELS.push({
    id: 'temps', hint: "Le 1 et le 4 n'ont pas de toit. Avance entre deux.", name: 'TIC TAC',
    map: build(m => {
      fill(m, 0, 14, 5, 21, '#'); fill(m, 31, 5, 39, 21, '#');
      put(m, 2, 13, 'S'); put(m, 36, 4, 'E');
    }),
    displays: [
      { kind: 'time', x: 8, y: 14, digits: 1, start: 0, period: 0.6, label: 'TEMPS' },
      { kind: 'time', x: 16, y: 11, digits: 1, start: 0, period: 0.6, label: 'TEMPS' },
      { kind: 'time', x: 24, y: 8, digits: 1, start: 0, period: 0.6, label: 'TEMPS' }
    ],
    texts: [
      { x: 1, y: 2, t: 'Le temps passe. Le décor aussi.' },
      { x: 1, y: 3.2, t: 'Méfie-toi du 1 et du 4.' }
    ]
  });

  // 8 — Pause
  LEVELS.push({
    id: 'pause', hint: 'Appuie sur P, puis grimpe sur les lettres.', name: 'LA PAUSE', pauseIntro: true,
    map: build(m => {
      fill(m, 0, 17, 39, 21, '#'); fill(m, 32, 9, 39, 16, '#');
      put(m, 2, 16, 'S'); put(m, 36, 8, 'E');
    }),
    pause: { x: 12, y: 13 },
    texts: [
      { x: 1, y: 2, t: 'Quand le jeu est en pause, le monde s\'arrête.' },
      { x: 1, y: 3.2, t: 'Mais toi, tu vis dans l\'interface.   [ P ]' }
    ]
  });

  // 9 — Arrêt sur image
  LEVELS.push({
    id: 'arret', hint: 'Mets en pause quand TEMPS affiche 3, 5 ou 9, puis traverse les lettres.', name: 'ARRÊT SUR IMAGE',
    map: build(m => {
      fill(m, 0, 18, 19, 21, '#'); fill(m, 29, 0, 39, 21, '#');
      put(m, 2, 17, 'S'); put(m, 26, 12, 'E');
    }),
    pause: { x: 5, y: 13 },
    displays: [{ kind: 'time', x: 24, y: 5, digits: 1, start: 0, period: 0.5, label: 'TEMPS' }],
    texts: [
      { x: 1, y: 2, t: 'La pause arrête le temps.' },
      { x: 1, y: 3.2, t: 'Choisis bien l\'instant.' }
    ]
  });

  // 10 — Final : tout le tableau des scores
  LEVELS.push({
    id: 'final', hint: 'MORTS sur 1. Sas : entre sur 2 ou 3, sors sur 5. En bas : pause quand TEMPS affiche 5 ou 6.', name: 'LE TABLEAU DES SCORES',
    map: build(m => {
      fill(m, 0, 5, 7, 12, '#'); fill(m, 0, 3, 14, 3, '#');
      fill(m, 13, 5, 17, 13, '#'); fill(m, 15, 1, 17, 1, '#'); fill(m, 15, 0, 22, 0, '^');
      fill(m, 18, 10, 22, 13, '#'); fill(m, 23, 5, 26, 13, '#'); fill(m, 32, 5, 39, 13, '#');
      fill(m, 26, 21, 39, 21, '#'); fill(m, 6, 17, 6, 21, '#');
      put(m, 1, 4, 'S'); put(m, 3, 16, 'E');
    }),
    pause: { x: 7, y: 17 },
    displays: [
      { kind: 'score', x: 8, y: 5, digits: 1, start: 4, label: 'SCORE' },
      { kind: 'jumps', x: 18, y: 1, digits: 1, start: 0, label: 'SAUTS' },
      { kind: 'deaths', x: 27, y: 5, digits: 1, start: 0, label: 'MORTS' },
      { kind: 'time', x: 1, y: 13, digits: 1, start: 0, period: 0.6, label: 'TEMPS' }
    ],
    pickups: [{ x: 4, y: 4, delta: 3 }],
    texts: [
      { x: 16, y: 1.2, t: '' }, { x: 24, y: 15.5, t: 'Tout, en une seule vie.' }, { x: 24, y: 16.7, t: '... enfin, presque.' }
    ]
  });

  // 11 — Fin : tes statistiques deviennent le paysage
  LEVELS.push({
    id: 'fin', name: 'FIN', ending: true,
    map: build(m => {
      fill(m, 0, 13, 2, 21, '#'); fill(m, 20, 13, 20, 21, '#'); fill(m, 38, 13, 39, 21, '#');
      for (const x of [8, 14, 26, 32]) put(m, x, 13, '#');
      put(m, 1, 12, 'S'); put(m, 38, 12, 'E');
    }),
    words: [{ text: 'MERCI', x: 10, y: 3 }],
    displays: [
      { kind: 'stat', key: 'deaths', x: 3, y: 13, digits: 3, label: 'TES MORTS' },
      { kind: 'stat', key: 'jumps', x: 21, y: 13, digits: 3, label: 'TES SAUTS' }
    ],
    exitLabel: 'MENU',
    texts: [
      { x: 1, y: 8.4, t: 'Tes statistiques sont devenues le paysage.' },
      { x: 1, y: 9.5, t: 'Chaque saut le redessine encore.' }
    ]
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS;
  else root.LEVELS = LEVELS;
})(this);
