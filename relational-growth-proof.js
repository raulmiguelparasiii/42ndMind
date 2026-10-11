'use strict';

const assert = require('assert');
const Mind = require('./one-mind.js');

const m = Mind.one(1, 1);
for (let i = 0; i < 40; i++) {
  const a = i % 2 === 0;
  Mind.C(m, [a ? 1 : 2, a ? 10 : 20, 0]);
}
const contactFacts = (m.knowledge.facts || []).filter(f => typeof f.subject === 'string' && f.subject.startsWith('contact:'));
const p0Facts = contactFacts.filter(f => f.relation === 'p0');
const p1Facts = contactFacts.filter(f => f.relation === 'p1');
console.log('FIRST_CLASS_DISCOVERY_DIAGNOSTIC ' + JSON.stringify({
  experiences: m.experiences.length,
  contact_facts: contactFacts.length,
  p0_facts: p0Facts.length,
  p1_facts: p1Facts.length,
  p0_values: [...new Set(p0Facts.map(f => f.object))],
  p1_values: [...new Set(p1Facts.map(f => f.object))],
  relational_patterns: m.knowledge.relational_patterns || [],
  relational_concepts: (m.knowledge.relational_concepts || []).slice(0, 8),
  next_relation_recompression_at: m.knowledge.next_relation_recompression_at,
}));
assert.ok((m.knowledge.relational_patterns || []).length > 0, 'no first-class empirical relations were discovered');

const q = structuredClone(m);
q.structure.patterns = [];
q.structure.symbols = [];
Mind.C(q, [1, null, 0]);
assert.strictEqual(q.current.completed.p1, 10,
  'current cognition still depended on the legacy flat structure instead of first-class M');

const t = Mind.one(1, 1);
for (let round = 0; round < 20; round++) {
  Mind.C(t, [1, 0]);
  Mind.C(t, [2, 0]);
  Mind.C(t, [3, 0]);
  Mind.C(t, [4, 0]);
}
const concepts = t.knowledge.relational_concepts || [];
const successive = concepts.filter(c => c.source?.kind === 'successive');
assert.ok(successive.length > 0, 'no first-class successive relation became reusable');
assert.ok(successive.some(c => (c.depth || 1) > 1),
  'successive relations did not recursively become terms of larger relations');
const source = require('fs').readFileSync(require('path').join(__dirname, 'one-mind.js'), 'utf8');
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
  prior_scaffold: false,
  next_percept_scaffold: false,
}));
