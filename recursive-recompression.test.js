const assert = require('assert');
const Mind = require('./recursive-recompression.js');

function firstStage() {
  const out = []; let n = 0;
  for (let r = 0; r < 8; r++) for (const a of [false, true]) for (const b of [false, true]) {
    out.push({ id: `first-${++n}`, a, b, x: a && b });
  }
  return out;
}

function secondStage() {
  const out = []; let n = 0;
  for (let r = 0; r < 6; r++) for (const a of [false, true]) for (const b of [false, true]) for (const c of [false, true]) for (const d of [false, true]) {
    out.push({ id: `second-${++n}`, a, b, c, d, y: a && b && c && d });
  }
  return out;
}

function thirdStage() {
  const out = []; let n = 0;
  for (let r = 0; r < 3; r++) for (const a of [false, true]) for (const b of [false, true]) for (const c of [false, true]) for (const d of [false, true]) for (const e of [false, true]) for (const f of [false, true]) {
    out.push({ id: `third-${++n}`, a, b, c, d, e, f, z: a && b && c && d && e && f });
  }
  return out;
}

let m = Mind.one();

m = Mind.recompress(m, firstStage(), { maxConditions: 3, maxPasses: 1, maxSymbolsPerPass: 8 });
const h1 = m.symbols.find(s =>
  s.definition.length === 2 &&
  s.definition.some(a => a.feature === 'a' && a.value === true) &&
  s.definition.some(a => a.feature === 'b' && a.value === true)
);
assert.ok(h1, 'first compression should invent a reusable a∧b description');
assert.strictEqual(h1.depth, 1);

m = Mind.recompress(m, secondStage(), { maxConditions: 3, maxPasses: 1, maxSymbolsPerPass: 12 });
const p2 = m.patterns.find(p =>
  p.target === 'y' && p.expected === true &&
  p.conditions.some(a => a.feature === h1.feature && a.value === true) &&
  p.conditions.some(a => a.feature === 'c' && a.value === true) &&
  p.conditions.some(a => a.feature === 'd' && a.value === true)
);
assert.ok(p2, 'same compression search should reuse its earlier learned description');

const h2 = m.symbols.find(s =>
  s.depth >= 2 &&
  s.definition.some(a => a.feature === h1.feature && a.value === true) &&
  s.definition.some(a => a.feature === 'c' && a.value === true) &&
  s.definition.some(a => a.feature === 'd' && a.value === true)
);
assert.ok(h2, 'the higher relation should itself enter the reusable vocabulary');

m = Mind.recompress(m, thirdStage(), { maxConditions: 3, maxPasses: 1, maxSymbolsPerPass: 16 });
const p3 = m.patterns.find(p =>
  p.target === 'z' && p.expected === true &&
  p.conditions.some(a => a.feature === h2.feature && a.value === true) &&
  p.conditions.some(a => a.feature === 'e' && a.value === true) &&
  p.conditions.some(a => a.feature === 'f' && a.value === true)
);
assert.ok(p3, 'a level-2 learned description should support a still higher learned relation');

// maxConditions=3 makes the raw six-condition relation a∧b∧c∧d∧e∧f
// inexpressible directly. Success therefore requires the system's own learned
// representation rather than silently widening the rule language for the test.
assert.ok(p3.conditions.length <= 3);

const prediction = Mind.predict(m, { a: true, b: true, c: true, d: true, e: true, f: true });
assert.strictEqual(prediction.expanded_experience[h1.feature], true);
assert.strictEqual(prediction.expanded_experience[h2.feature], true);
assert.strictEqual(prediction.best_by_target.z.expected, true);
assert.strictEqual(prediction.authority, 'defeasible_compression_only');
assert.strictEqual(m.whole, 1);

console.log('42ndMind recursive recompression: PASS');
console.log(`level-1=${h1.feature} depth=${h1.depth}`);
console.log(`level-2=${h2.feature} depth=${h2.depth}`);
console.log(`higher-rule=${p3.id} conditions=${p3.conditions.length}`);
console.log('raw six-way conjunction was outside the three-condition search language');
