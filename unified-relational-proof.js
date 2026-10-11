'use strict';

const assert = require('assert');
const Mind = require('./one-mind.js');

// 1) Empirical relation -> structured knowledge -> current completion.
// C must be able to continue one relation through what used to be two substrates.
const m = Mind.one(1, 1);
for (let i = 0; i < 32; i++) {
  const a = i % 2 === 0;
  Mind.C(m, [a ? 1 : 2, a ? 10 : 20, null, 0]);
}
Mind.C(m, { relations: { rules: [{
  id: 'proof:empirical-to-knowledge',
  premises: [[{ var: 's' }, 'p1', 10]],
  conclusion: [{ var: 's' }, 'p2', 99],
  provenance: 'structural-proof',
}] } });
const q1 = structuredClone(m);
Mind.C(q1, [1, null, null, 0]);
assert.strictEqual(q1.current.completed.p1, 10, 'empirical relation did not complete p1');
assert.strictEqual(q1.current.completed.p2, 99, 'empirical completion could not continue through M.knowledge');

// 2) Structured knowledge -> empirical relation -> current completion.
Mind.C(m, { relations: { rules: [{
  id: 'proof:knowledge-to-empirical',
  premises: [[{ var: 's' }, 'p2', 77]],
  conclusion: [{ var: 's' }, 'p1', 20],
  provenance: 'structural-proof',
}] } });
const q2 = structuredClone(m);
Mind.C(q2, [null, null, 77, 0]);
assert.strictEqual(q2.current.completed.p1, 20, 'M.knowledge did not complete a current empirical term');
assert.strictEqual(q2.current.completed.p0, 2, 'knowledge completion could not continue through empirical relations');

// 3) The same structured substrate must be able to complete action directly.
const a = Mind.one(2, 1);
Mind.C(a, { relations: { rules: [{
  id: 'proof:knowledge-to-action',
  premises: [
    [{ var: 's' }, 'p0', 7],
    [{ var: 's' }, 'relation_c0_order', 'less'],
  ],
  conclusion: [{ var: 's' }, 'action', 1],
  provenance: 'structural-proof',
}] } });
Mind.C(a, [7, 10]);
assert.strictEqual(a.motor, 1, 'M.knowledge could not complete action through the ordinary continuation relation');

// 4) Exact lived transitions must themselves become first-class relational M,
// including ordinary later percepts rather than only concern summaries.
Mind.C(a, [8, 7]);
const facts = a.knowledge.facts;
function has(subject, relation, object) {
  return facts.some(f => JSON.stringify(f.subject) === JSON.stringify(subject) &&
    JSON.stringify(f.relation) === JSON.stringify(relation) &&
    JSON.stringify(f.object) === JSON.stringify(object));
}
assert.ok(has('contact:0', 'p0', 7), 'before percept absent from first-class relational M');
assert.ok(has('contact:1', 'p0', 8), 'later percept absent from first-class relational M');
assert.ok(has('contact:0', 'next', 'contact:1'), 'experienced succession absent from first-class relational M');
assert.ok(has('experience:0', 'action', 1), 'experienced action absent from first-class relational M');
assert.ok(has('experience:0', 'before', 'contact:0') && has('experience:0', 'after', 'contact:1'),
  'before/action/after episode was not preserved as one first-class relation');

console.log('42ndMind unified relational substrate: PASS');
console.log(JSON.stringify({
  empirical_to_knowledge_to_completion: true,
  knowledge_to_empirical_to_completion: true,
  knowledge_to_action: true,
  exact_transition_first_class: true,
  later_percept_first_class: true,
  experiences_reified: a.knowledge.experience_relations_through,
}));
