'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

const V = name => ({ var: String(name) });
const M = Mind.one(1, 1);

function paired(input, output, fact) {
  Mind.C(M, { surface: { input, output }, relations: { facts: [fact] } });
}

const relation = 'rel_texture_runtime';
const kindRelation = 'rel_kind_runtime';
const kindValue = 'kind_ember_runtime';
const objectA = 'obj_a_runtime';
const objectB = 'obj_b_runtime';
const objectC = 'obj_c_runtime';

// Same relational answer role, deliberately different output lengths.
for (let round = 0; round < 3; round++) {
  paired('what texture is beta?', 'it feels coarse.', ['beta', relation, objectA]);
  paired('what texture is gamma?', 'it feels very smooth.', ['gamma', relation, objectB]);
  paired('what texture is delta?', 'it feels soft and silky.', ['delta', relation, objectC]);
  paired('what texture is epsilon?', 'it feels coarse.', ['epsilon', relation, objectA]);
  paired('what texture is zeta?', 'it feels very smooth.', ['zeta', relation, objectB]);
  paired('what texture is eta?', 'it feels soft and silky.', ['eta', relation, objectC]);
}

// Alpha is only surface-grounded through another relation.
for (let round = 0; round < 3; round++) {
  paired('alpha is ember.', 'alpha is ember.', ['alpha', kindRelation, kindValue]);
}

// Canonical M derives the held-out target relation.
Mind.C(M, { relations: { rules: [{
  id: 'world:runtime-texture',
  premises: [[V('x'), kindRelation, kindValue]],
  conclusion: [V('x'), relation, objectC],
  categorical: true,
}] } });

assert(M.knowledge.current.facts.some(f =>
  f.subject === 'alpha' && f.relation === relation && f.object === objectC));

const probe = structuredClone(M);
Mind.C(probe, { surface: { input: 'what texture is alpha?' } });

assert.strictEqual(probe.current.sequence.expression, 'it feels soft and silky.');
assert.strictEqual(probe.current.sequence.canonical_grounding.authority, 'canonical_M');
assert.strictEqual(probe.current.sequence.canonical_grounding.object, objectC);

// The held-out pair was never experienced directly.
const inputs = M.knowledge.facts.filter(f => f.relation === 'ρ:input_raw').map(f => f.object);
assert(!inputs.includes('what texture is alpha?'));

for (const forbidden of ['language_state', 'semantic_dictionary', 'response_table', 'planner']) {
  assert.strictEqual(M[forbidden], undefined);
}

console.log(JSON.stringify({
  variable_length_training_outputs: true,
  heldout_pair_seen: false,
  canonical_M_supplied_object: true,
  variable_length_expression: probe.current.sequence.expression,
  one_M: M.whole === 1,
  one_C: true,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('VARIABLE-LENGTH LANGUAGE FALSIFICATION: PASS');
