'use strict';

const assert = require('assert');
const Mind = require('./sequence-recompression.js');

function expansionKey(expansion) { return JSON.stringify(expansion); }
function findExpansion(state, expected) {
  const key = expansionKey(expected);
  return Mind.learnedExpansions(state).find(x => expansionKey(x.expansion) === key);
}

let m = Mind.one();

// The caller supplies only successive experiences. There are no step1/step2,
// timestamps, lag labels, or sequence classes in the input.
const first = [];
for (let i = 0; i < 40; i++) {
  first.push('request', 'ignore', `separator-a-${i}`);
}
// A few reversals exist in reality, but not enough to justify their own reusable
// description. Direction therefore has to matter to the compression itself.
for (let i = 0; i < 3; i++) first.push('ignore', 'request', `reverse-${i}`);

m = Mind.recompress(m, first);
const ordered = findExpansion(m, ['request', 'ignore']);
assert.ok(ordered, 'repeated succession request→ignore should become a learned ordered description');
assert.strictEqual(ordered.depth, 1);
assert.ok(!findExpansion(m, ['ignore', 'request']),
  'the same events in the opposite order must not be treated as the same learned structure');
assert.deepStrictEqual(Mind.decode(m), first, 'compression must exactly reconstruct the original experienced order');

// New experience repeatedly extends the already-compressible fragment. No
// caller-provided time role says that repeat is the third step.
const second = [];
for (let i = 0; i < 24; i++) {
  second.push('request', 'ignore', 'repeat', `separator-b-${i}`);
}
m = Mind.recompress(m, second);
const trajectory = findExpansion(m, ['request', 'ignore', 'repeat']);
assert.ok(trajectory, 'the prior ordered fragment should be reused inside a longer learned trajectory');
assert.ok(trajectory.depth >= 2, 'the longer trajectory must be recursively composed from learned order');
assert.deepStrictEqual(Mind.decode(m), [...first, ...second]);

// A still longer regularity tests whether learned sequence descriptions become
// representational material for later learning without widening a step schema.
const third = [];
for (let i = 0; i < 18; i++) {
  third.push('request', 'ignore', 'repeat', 'high-context', 'withdraw', `separator-c-${i}`);
}
m = Mind.recompress(m, third);
const higher = findExpansion(m, ['request', 'ignore', 'repeat', 'high-context', 'withdraw']);
assert.ok(higher, 'recompression should recursively build a longer order-sensitive abstraction');
assert.ok(higher.depth >= 3, 'the higher sequence should depend on earlier learned sequence structure');

const all = [...first, ...second, ...third];
assert.deepStrictEqual(Mind.decode(m), all, 'all learned sequence abstractions must remain losslessly grounded in history');
assert.ok(m.description_length < all.length,
  'the learned ordered grammar should be shorter than the uncompressed event stream');
assert.strictEqual(m.whole, 1);
assert.strictEqual(m.formula, 'M(t+1)=C(M(t)⊕R(t+1)); C exactly recompresses ordered update history');

console.log('42ndMind succession-native recompression: PASS');
console.log(`ordered=${ordered.symbol} depth=${ordered.depth}`);
console.log(`trajectory=${trajectory.symbol} depth=${trajectory.depth}`);
console.log(`higher=${higher.symbol} depth=${higher.depth}`);
console.log(`raw-events=${all.length} description-units=${m.description_length}`);
console.log('no step labels, timestamps, or temporal feature names were supplied');
