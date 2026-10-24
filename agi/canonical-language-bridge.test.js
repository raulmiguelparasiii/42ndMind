'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

assert.deepStrictEqual(Object.keys(Mind).sort(), ['C', 'one']);
const source = fs.readFileSync(path.join(__dirname, 'mind.js'), 'utf8').toLowerCase();
for (const fixture of ['alpha', 'beta', 'has_color', 'ember', 'red']) {
  assert(!source.includes(`'${fixture}'`) && !source.includes(`"${fixture}"`), `fixture leaked into bridge: ${fixture}`);
}

const V = name => ({ var: String(name) });
const M = Mind.one(1, 1);

function paired(input, output, fact) {
  Mind.C(M, { surface: { input, output }, relations: { facts: [fact] } });
}

// School ordinary surface attachment to generic relational topology using other
// individuals. No channel array is supplied by the test: mind.js derives only
// the generic (subject, relation, object) contact dimensions from the fact that
// occurred at the same time.
for (let round = 0; round < 3; round++) {
  paired('what color is beta?', 'it is red.', ['beta', 'has_color', 'red']);
  paired('what color is gamma?', 'it is blue.', ['gamma', 'has_color', 'blue']);
  paired('what color is delta?', 'it is green.', ['delta', 'has_color', 'green']);
  paired('what color is epsilon?', 'it is red.', ['epsilon', 'has_color', 'red']);
}

// Alpha is grounded to a completely different relation, so the name can be
// recognized but the target color answer is never supplied by surface schooling.
for (let round = 0; round < 3; round++) {
  paired('alpha is ember.', 'alpha is ember.', ['alpha', 'kind', 'ember']);
}

// Canonical M, not the language bridge, derives alpha's color.
Mind.C(M, { relations: { rules: [{
  id: 'world:ember-color',
  premises: [[V('x'), 'kind', 'ember']],
  conclusion: [V('x'), 'has_color', 'red'],
  categorical: true,
  provenance: { kind: 'world-relation' },
}] } });

const derived = M.knowledge.current.facts.some(f =>
  f.subject === 'alpha' && f.relation === 'has_color' && f.object === 'red');
assert(derived, 'canonical M failed to derive the world relation before language query');

// The held-out pair never occurred. It must bind surface alpha + color to the
// current canonical relation and realize its object with previously learned
// expression structure.
const probe = structuredClone(M);
Mind.C(probe, { surface: { input: 'what color is alpha?' } });

assert.strictEqual(probe.current.sequence.expression, 'it is red.',
  `surface failed to read canonical M: ${probe.current.sequence.expression}`);
assert.deepStrictEqual(probe.current.sequence.canonical_grounding, {
  subject: 'alpha',
  relation: 'has_color',
  object: 'red',
  source: 'M.knowledge.current.facts',
  authority: 'canonical_M',
  status: 'grounded',
});

// Anti-cheat: the exact question and answer were never part of lived schooling.
const raws = M.knowledge.facts.filter(f => f.relation === 'ρ:input_raw').map(f => f.object);
assert(!raws.includes('what color is alpha?'));
const outputs = M.knowledge.facts.filter(f => f.relation === 'ρ:output_raw').map(f => f.object);
assert(!outputs.includes('it is red.') || raws.some(x => x.includes('beta') || x.includes('epsilon')));

for (const forbidden of ['language_state', 'semantic_dictionary', 'truth_ledger', 'response_table', 'planner']) {
  assert.strictEqual(M[forbidden], undefined, `parallel authority appeared: ${forbidden}`);
}

console.log(JSON.stringify({
  one_M: M.whole === 1,
  one_C_entrypoint: true,
  test_supplied_semantic_channels: false,
  heldout_alpha_color_surface_pair_seen: false,
  canonical_relation_was_derived_before_query: true,
  ordinary_surface_read_canonical_M: true,
  reply: probe.current.sequence.expression,
  grounding_authority: probe.current.sequence.canonical_grounding.authority,
  grounding_status: probe.current.sequence.canonical_grounding.status,
  private_language_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('CANONICAL-M LANGUAGE BRIDGE FALSIFICATION: PASS');
