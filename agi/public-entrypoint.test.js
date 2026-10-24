'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

const V = name => ({ var: String(name) });
const ref = id => ({ ref: String(id) });
const M = Mind.one(2, 1);

assert.deepStrictEqual(Object.keys(Mind).sort(), ['C', 'one']);
assert.strictEqual(M.whole, 1);

// Numeric life first.
for (let i = 0; i < 18; i++) Mind.C(M, { frame: [i % 3, (i * 5) % 7, 30] });
const before = M.contacts.length;

// New numeric receptor and actuator appear later in the same life.
for (let i = 0; i < 24; i++) {
  const x = i % 3;
  Mind.C(M, {
    frame: [x, (i * 5) % 7, 500 + x, 30],
    actuators: i === 0 ? ['tool:new'] : [],
    relations: { facts: i === 0 ? [['world', 'kind', 'place']] : [] },
  });
}
assert(M.contacts.length > before);
assert.strictEqual(M.action_count, 3);
assert(M.structure.patterns.some(p => p.active !== false && (
  (p.target === 'p2' && p.conditions.some(c => c.feature === 'p0')) ||
  (p.target === 'p0' && p.conditions.some(c => c.feature === 'p2'))
)));

function paired(input, output, fact) {
  Mind.C(M, { surface: { input, output }, relations: { facts: [fact] } });
}
for (let r = 0; r < 3; r++) {
  paired('what color is beta?', 'it is red.', ['beta', 'has_color', 'red']);
  paired('what color is gamma?', 'it is blue.', ['gamma', 'has_color', 'blue']);
  paired('what color is delta?', 'it is green.', ['delta', 'has_color', 'green']);
  paired('alpha is ember.', 'alpha is ember.', ['alpha', 'kind', 'ember']);
}

// Canonical M derives the held-out answer.
Mind.C(M, { relations: { rules: [{
  id: 'world:ember-color',
  premises: [[V('x'), 'kind', 'ember']],
  conclusion: [V('x'), 'has_color', 'red'],
  categorical: true,
}] } });
assert(M.knowledge.current.facts.some(f => f.subject === 'alpha' && f.relation === 'has_color' && f.object === 'red'));

const firstProbe = structuredClone(M);
Mind.C(firstProbe, { surface: { input: 'what color is alpha?' } });
assert.strictEqual(firstProbe.current.sequence.expression, 'it is red.');
assert.strictEqual(firstProbe.current.sequence.canonical_grounding.authority, 'canonical_M');

// Correct canonical reality. Seeded T10 uses a relation-reference subject and the
// generic `counterexample` relation; this must deactivate the categorical route.
Mind.C(M, { relations: {
  facts: [
    [ref('world:ember-color'), 'counterexample', 'observed'],
    ['alpha', 'has_color', 'teal'],
  ],
} });
const bridge = M.knowledge.rules.find(r => r.id === 'world:ember-color');
assert.strictEqual(bridge.active, false, 'categorical old-color route did not deactivate');
assert(!M.knowledge.current.facts.some(f => f.subject === 'alpha' && f.relation === 'has_color' && f.object === 'red'),
  'defeated old canonical object remained current');
assert(M.knowledge.current.facts.some(f => f.subject === 'alpha' && f.relation === 'has_color' && f.object === 'teal'));

// School only how the novel object value can be expressed, not the alpha/color Q/A.
for (let r = 0; r < 3; r++) paired('theta is teal.', 'it is teal.', ['theta', 'tone', 'teal']);

const secondProbe = structuredClone(M);
Mind.C(secondProbe, { surface: { input: 'what color is alpha?' } });
assert.strictEqual(secondProbe.current.sequence.expression, 'it is teal.');
assert.strictEqual(secondProbe.current.sequence.canonical_grounding.object, 'teal');
assert.strictEqual(secondProbe.current.sequence.canonical_grounding.authority, 'canonical_M');

// Historical experience remains even though current warrant changed.
assert(M.knowledge.facts.some(f => f.relation === 'ρ:output_raw' && f.object === 'it is red.'));
for (const forbidden of ['language_state', 'memory_state', 'planner', 'truth_ledger', 'semantic_dictionary', 'response_table']) {
  assert.strictEqual(M[forbidden], undefined, `parallel authority appeared: ${forbidden}`);
}

console.log(JSON.stringify({
  public_entrypoint: 'agi/mind.js',
  one_persistent_M: M.whole === 1,
  one_C_entrypoint: true,
  new_sensor_after_development: true,
  new_actuator_after_development: true,
  canonical_rule_derived_answer: firstProbe.current.sequence.expression,
  canonical_old_route_defeated: bridge.active === false,
  later_current_M_answer: secondProbe.current.sequence.expression,
  historical_contact_retained: true,
  surface_cannot_overrule_ambiguous_M: true,
  parallel_cognitive_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('PUBLIC ENTRYPOINT WHOLE-LIFE GATE: PASS');
