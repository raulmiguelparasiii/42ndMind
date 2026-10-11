'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./one-mind.js');

// First-class discovery must support ordinary present relations even after the
// legacy flat search result is removed.
const m = Mind.one(1, 1);
for (let i = 0; i < 24; i++) {
  const a = i % 2 === 0;
  Mind.C(m, [a ? 1 : 2, a ? 10 : 20, 0]);
}
assert.ok((m.knowledge.relational_patterns || []).length > 0,
  'no first-class empirical relations were discovered');
const q = structuredClone(m);
q.structure.patterns = [];
q.structure.symbols = [];
Mind.C(q, [1, null, 0]);
assert.strictEqual(q.current.completed.p1, 10,
  'current cognition still depended on the legacy flat structure instead of first-class M');

// Here the present value 2 is deliberately ambiguous: after 1->2 comes 3, while
// after 4->2 comes 5. A deeper relation is warranted only by the route into 2.
// This tests recursive growth without a fixed temporal window.
const t = Mind.one(1, 1);
for (let round = 0; round < 8; round++) {
  for (const value of [1,2,3,9,4,2,5,9]) Mind.C(t, [value, 0]);
}
const concepts = t.knowledge.relational_concepts || [];
const successive = concepts.filter(c => c.source?.kind === 'successive');
assert.ok(successive.length > 0, 'no first-class successive relation became reusable');
assert.ok(successive.some(c => (c.depth || 1) > 1),
  'history-dependent succession did not recursively become a larger relation');

const source = fs.readFileSync(path.join(__dirname, 'one-mind.js'), 'utf8');
assert.ok(!source.includes('prior:p'), 'rejected prior:* scaffold returned');
assert.ok(!source.includes('next:p'), 'authored next:pN cognitive shortcut remained');

console.log('42ndMind first-class relational growth: PASS');
console.log(JSON.stringify({
  first_class_patterns: m.knowledge.relational_patterns.length,
  legacy_structure_removed_for_query: true,
  completion_after_legacy_removal: q.current.completed.p1,
  relational_concepts: concepts.length,
  successive_concepts: successive.length,
  max_successive_depth: successive.reduce((d, c) => Math.max(d, c.depth || 1), 0),
  history_dependent_sequence: true,
  prior_scaffold: false,
  next_percept_scaffold: false,
}));
