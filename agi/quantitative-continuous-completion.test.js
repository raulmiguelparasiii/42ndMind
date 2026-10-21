'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

// Quantitative-relation falsification. Raw nonrepeating numerical contact contains
// an affine dependence. After that relation is learned, a novel source value is
// contacted while the target receptor is explicitly uncontacted (null). The same
// one-M/one-C individual must preserve the null raw contact but complete the open
// target from the learned quantitative relation. No coefficient, formula, semantic
// label, or sensor model is supplied to cognition.

const SCALE = -2.375;
const OFFSET = 0.417;
const CONCERN = 19;
const TRAIN = 96;
let seed = 0xa11f1ae;
function rnd() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}

const M = Mind.one(1, 1);
for (let t = 0; t < TRAIN; t++) {
  const x = rnd() * 4 - 2 + t * 1e-8;
  Mind.C(M, { frame: [x, SCALE * x + OFFSET, CONCERN] });
}

const deps = (M.knowledge?.current?.facts || []).filter(f =>
  f.subject === 'receptor:p0' && f.relation === 'ρ:continuous_dependence' &&
  f.object && f.object.target === 'receptor:p1' && f.object.lag === 0);
assert(deps.length > 0, 'raw affine dependence was not learned');
const learned = deps.find(f => f.object.transform && f.object.transform.kind === 'affine');
assert(learned, 'continuous relation did not retain its quantitative transformation in M');
assert(Math.abs(learned.object.transform.scale - SCALE) < 1e-9,
  'learned affine scale does not match retained raw contact');
assert(Math.abs(learned.object.transform.offset - OFFSET) < 1e-9,
  'learned affine offset does not match retained raw contact');

const NOVEL = 1.23456789;
const EXPECTED = SCALE * NOVEL + OFFSET;
Mind.C(M, { frame: [NOVEL, null, CONCERN] });

assert.strictEqual(M.contacts.at(-1)[1], null,
  'uncontacted target was rewritten as if it had been observed');
assert.strictEqual(M.current?.observed?.p1, undefined,
  'uncontacted target was falsely placed in observed contact');
assert(M.current?.inferred?.includes('p1'),
  'learned quantitative relation did not mark the missing target as inferred');
assert(Number.isFinite(M.current?.completed?.p1),
  'learned quantitative relation did not complete the missing numerical target');
assert(Math.abs(M.current.completed.p1 - EXPECTED) < 1e-8,
  'quantitative completion does not follow the learned transformation');

const term = M.knowledge.facts.find(f =>
  f.relation === 'ρ:relation_object' && f.object &&
  f.object.target === 'receptor:p1' && f.object.lag === 0 &&
  f.object.transform && f.object.transform.kind === 'affine');
assert(term, 'quantitative transformation was not first-class relation content in M');

for (const forbidden of ['sensor_model', 'numeric_model', 'prediction_model', 'world_model', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  raw_affine_relation_learned: true,
  quantitative_transform_first_class_in_M: true,
  missing_target_completed_from_learned_relation: true,
  null_contact_remained_unobserved: true,
  exact_raw_history_retained: true,
  parallel_numeric_authority: false,
}, null, 2));
console.log('QUANTITATIVE CONTINUOUS RELATION COMPLETION: PASS');
