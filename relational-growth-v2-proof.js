'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./one-mind.js');

// Ordinary learned relation must survive removal of the legacy flat learner.
const m = Mind.one(1, 1);
for (let i = 0; i < 16; i++) {
  const a = i % 2 === 0;
  Mind.C(m, [a ? 1 : 2, a ? 10 : 20, 0]);
}
assert.ok((m.knowledge.relational_patterns || []).some(p =>
  p.target === 'p1' && p.expected === 10 &&
  (p.conditions || []).some(a => a.feature === 'p0' && a.value === 1)),
  'first-class M did not discover the repeated p0=1 -> p1=10 relation');

const q = structuredClone(m);
q.structure.patterns = [];
q.structure.symbols = [];
Mind.C(q, [1, null, 0]);
assert.strictEqual(q.current.completed.p1, 10,
  'current completion still depended on the legacy flat structure');

// The present state 2 is ambiguous. 1->2 leads to 3 while 4->2 leads to 5.
// Therefore a deeper relation is warranted by the route into 2, not by 2 alone.
const t = Mind.one(1, 1);
for (let round = 0; round < 6; round++) {
  for (const value of [1,2,3,9,4,2,5,9]) Mind.C(t, [value, 0]);
}
const concepts = t.knowledge.relational_concepts || [];
const successive = concepts.filter(c => c.source?.kind === 'successive');
assert.ok(successive.length > 0, 'no first-class successive relation formed');
assert.ok(successive.some(c => (c.depth || 1) > 1),
  'history-dependent succession did not grow recursively from an earlier relation');

const source = fs.readFileSync(path.join(__dirname, 'one-mind.js'), 'utf8');
assert.ok(!source.includes('prior:p'), 'rejected prior:* scaffold returned');
assert.ok(!source.includes('next:p'), 'authored next:pN cognitive shortcut returned');

console.log('42ndMind incremental first-class relational growth: PASS');
console.log(JSON.stringify({
  first_class_patterns: m.knowledge.relational_patterns.length,
  completion_after_legacy_structure_removed: q.current.completed.p1,
  relational_concepts: concepts.length,
  successive_concepts: successive.length,
  maximum_successive_depth: successive.reduce((d, c) => Math.max(d, c.depth || 1), 0),
  history_dependent_growth: true,
  prior_scaffold: false,
  next_percept_scaffold: false,
}));
