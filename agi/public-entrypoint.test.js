'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

const V = name => ({ var: String(name) });
const M = Mind.one(2, 1);

// One public entrypoint, one state.
assert.deepStrictEqual(Object.keys(Mind).sort(), ['C', 'one']);
assert.strictEqual(M.whole, 1);

// Numeric life first.
for (let i = 0; i < 18; i++) Mind.C(M, { frame: [i % 3, (i * 5) % 7, 30] });
const before = M.contacts.length;

// A new numeric receptor and actuator appear later, together with ordinary
// relational contact. No change to C.
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

// Surface experience is attached only to simultaneous generic relational facts.
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

// Reality/contact later changes canonical current structure. Old exact surface
// occurrences remain, but language must follow current M rather than a response
// cache. Defeat the categorical bridge and add the replacement fact.
Mind.C(M, { relations: {
  facts: [
    ['world:ember-color', 'ρ:counterexample', 'observed'],
    ['alpha', 'has_color', 'teal'],
  ],
} });
assert(M.knowledge.current.facts.some(f => f.subject === 'alpha' && f.relation === 'has_color' && f.object === 'teal'));

// School only how the novel object value is expressed on another relation/contact,
// not the alpha/color question-answer pair.
for (let r = 0; r < 3; r++) paired('theta is teal.', 'it is teal.', ['theta', 'tone', 'teal']);

const secondProbe = structuredClone(M);
Mind.C(secondProbe, { surface: { input: 'what color is alpha?' } });
assert.strictEqual(secondProbe.current.sequence.expression, 'it is teal.');
assert.strictEqual(secondProbe.current.sequence.canonical_grounding.object, 'teal');

// The first answer remains in historical experience; current answer changed.
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
  later_current_M_answer: secondProbe.current.sequence.expression,
  historical_contact_retained: true,
  parallel_cognitive_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('PUBLIC ENTRYPOINT WHOLE-LIFE GATE: PASS');
