const C = require('../core.js'); const L = require('../levels.js'); const S = require('./solve.js');
const idx = +process.argv[2];
const r = S.solve(idx, 40000);
console.log(r.fail ? 'FAIL' : r.path.join(' → '));
