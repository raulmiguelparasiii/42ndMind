'use strict';

const assert = require('assert');
const Mind = require('./one-mind.js');

const M = Mind.one(2);
assert.strictEqual(M.whole, 1);
assert.strictEqual(M.experience.length, 0);
assert.strictEqual(M.relations.length, 0);
assert.strictEqual(M.want, 0);

// Situation 0. M has need, knows nothing, and tries action 0.
Mind.C(M, { sense: [0], viability: 0.50 });
assert.strictEqual(M.action, 0);
assert.strictEqual(M.want, 0.50);

// Reality confirms action 0 helped.
Mind.C(M, { sense: [0], viability: 0.70 });
assert.strictEqual(M.action, 0);
assert.strictEqual(M.experience.length, 1);

// Situation 1. Exact relation is unknown; M must vary and try action 1.
Mind.C(M, { sense: [1], viability: 0.60 });
assert.strictEqual(M.action, 1);

// Reality confirms action 1 helped.
Mind.C(M, { sense: [1], viability: 0.80 });
assert.strictEqual(M.action, 1);

// Back to situation 0. M should reuse its learned exact relation.
Mind.C(M, { sense: [0], viability: 0.60 });
assert.strictEqual(M.action, 0);

// Full viability removes the live deficit.
Mind.C(M, { sense: [0], viability: 1.00 });
assert.strictEqual(M.want, 0);
assert.strictEqual(M.action, null);

// Zero viability ends this continuing M.
Mind.C(M, { sense: [0], viability: 0.00 });
assert.strictEqual(M.alive, false);
assert.strictEqual(M.action, null);

console.log(JSON.stringify({
  pass: true,
  whole: M.whole,
  alive: M.alive,
  experiences: M.experience.length,
  relations: M.relations.length,
}, null, 2));
