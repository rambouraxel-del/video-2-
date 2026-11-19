# POINTS DE CHUTE

**Un jeu où tes statistiques sont le décor.**

Tu es le **point décimal** échappé d'un tableau des scores. Dans ce monde, les chiffres
des afficheurs 7 segments sont **solides** : chaque segment allumé est un sol ou un mur.

Et ces chiffres, ce sont **tes propres statistiques** :

| Afficheur | Ce qui le fait changer | Ce que ça veut dire |
|-----------|------------------------|---------------------|
| **SCORE** (rouge) | les bonus `+1`, `+6`… | ramasser un nombre déplace des murs |
| **SAUTS** (orange) | chaque saut | sauter redessine le niveau, en plein vol |
| **MORTS** (violet) | chaque mort | mourir est un outil : certains passages exigent 1… ou 10 morts |
| **TEMPS** (vert) | chaque seconde | le décor bouge tout seul |
| **PAUSE** | la touche P | le monde se fige… sauf toi, qui vis dans l'interface. Et le mot « PAUSE » devient une plateforme |

Même le menu est un niveau (on marche jusqu'à « JOUER »), et à la fin,
**ton nombre total de morts et de sauts devient le paysage** que tu traverses.

## Lancer le jeu

Ouvrir `index.html` dans un navigateur (double-clic). Aucune installation.

## Commandes

- `←` `→` (ou A/D, Q/D) : bouger
- `↑` / `Espace` / `Z` / `W` : sauter (maintenir = plus haut)
- `R` : mourir (ça compte !)
- `P` / `Échap` : pause (à partir du niveau 8)
- `M` : couper le son · `C` (au menu) : reprendre au dernier niveau
- Sur mobile/tablette : boutons tactiles à l'écran

Astuce : les segments éteints restent visibles en transparence, pour prévoir le décor.
Un indice apparaît après 3 morts ou 45 secondes dans un niveau.

## Niveaux

0 Menu · 1 Le sol est un score · 2 Choisir ses additions · 3 Chaque saut compte · 4 Le sas ·
5 Il faudra mourir · 6 La dizaine · 7 Tic tac · 8 La pause · 9 Arrêt sur image ·
10 Le tableau des scores · Épilogue

Aller directement à un niveau : `index.html?lvl=5`

## Technique

HTML5 Canvas + JavaScript pur, aucune dépendance. Sons et musique synthétisés (WebAudio).

- `core.js` : moteur (physique, afficheurs 7 segments solides, règles) — sans affichage, testable sous Node
- `levels.js` : les 12 niveaux
- `game.js` : rendu, audio, commandes
- `tools/` : outils de test (Node + Playwright)
  - `node tools/test_all.js` : un **solveur automatique** vérifie que chaque niveau est faisable,
    et que le final ne peut pas être fini sans mourir
  - `node tools/preview.js 3 jumps=5` : aperçu texte d'un niveau
  - `node tools/e2e.js` / `node tools/shots.js` : tests navigateur et captures (nécessitent Playwright)
