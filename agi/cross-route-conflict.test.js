'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Cross-route arbitration falsification. First learn a genuine two-source relation.
// Then p1 becomes unobserved, so that joint relation remains warranted-but-unevaluable
// while a different unary relation p0 -> p2 is learned from later contact. A query
// makes both sources available again. The two independently warranted relations
// disagree, so p2 must remain unresolved; helper execution order must not choose.

const CONCERN = 47;
const JOINT = 32;
const UNARY = 80;
function jointValue(x, z) { return x + z + 0.25; }
function unaryValue(x) { return 2.5 * x - 0.75; }

const mindSource = fs.readFileSync(path.join(__dirname, 'mind.js'), 'utf8');
assert(!mindSource.includes('cross-route-conflict'), 'runtime contains test-specific conflict fixture');

let seed = 0x5a17c9e3;
function random() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}

const M = Mind.one(1, 1);
for (let i = 0; i < JOINT; i++) {
  const x = random() * 4 - 2;
  const z = random() * 4 - 2;
  Mind.C(M, { frame: [x, z, jointValue(x, z), CONCERN] });
}

let facts = M.knowledge?.current?.facts || [];
assert(facts.some(fact =>
  fact.relation === 'ρ:continuous_dependence' && fact.object?.target === 'receptor:p2' &&
  Array.isArray(fact.object?.sources) &&
  fact.object.sources.some(source => source?.source === 'receptor:p0' && source?.lag === 0) &&
  fact.object.sources.some(source => source?.source === 'receptor:p1' && source?.lag === 0)),
  'joint relation was not learned before the unary-only interval');

for (let i = 0; i < UNARY; i++) {
  const x = random() * 4 - 2;
  Mind.C(M, { frame: [x, null, unaryValue(x), CONCERN] });
}

facts = M.knowledge?.current?.facts || [];
const unary = facts.find(fact =>
  fact.subject === 'receptor:p0' && fact.relation === 'ρ:continuous_dependence' &&
  fact.object?.target === 'receptor:p2' && fact.object?.lag === 0 && !fact.object.sources);
const joint = facts.find(fact =>
  fact.relation === 'ρ:continuous_dependence' && fact.object?.target === 'receptor:p2' &&
  Array.isArray(fact.object?.sources) &&
  fact.object.sources.some(source => source?.source === 'receptor:p0' && source?.lag === 0) &&
  fact.object.sources.some(source => source?.source === 'receptor:p1' && source?.lag === 0));
assert(unary, 'later unary relation was not learned');
assert(joint, 'joint relation was incorrectly falsified by an unevaluable interval');

const X = 0.8;
const Z = 1.7;
const unaryPrediction = unaryValue(X);
const jointPrediction = jointValue(X, Z);
assert(Math.abs(unaryPrediction - jointPrediction) > 0.25, 'conflict fixture predictions accidentally agree');

Mind.C(M, { frame: [X, Z, null, CONCERN] });
assert.strictEqual(M.contacts.at(-1)[2], null, 'uncontacted conflict target was rewritten as observation');
assert.strictEqual(M.current?.observed?.p2, undefined, 'uncontacted conflict target was falsely observed');
assert(!Object.prototype.hasOwnProperty.call(M.current?.completed || {}, 'p2'),
  'conflicting warranted relations were resolved by helper execution order');
assert(M.current?.unresolved?.includes('p2'),
  'conflicting warranted relations did not leave the target explicitly unresolved');
assert(!M.current?.inferred?.includes('p2'),
  'conflicting warranted relations incorrectly marked the target inferred');

for (const forbidden of ['conflict_model', 'arbitration_state', 'world_model', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  joint_relation_remained_warranted_through_unknown_interval: true,
  later_unary_relation_learned: true,
  independent_predictions_disagreed: true,
  disagreement_remained_unresolved: true,
  helper_execution_order_not_authority: true,
  raw_null_contact_retained: true,
  parallel_arbitration_authority: false,
}, null, 2));
console.log('CROSS-ROUTE CONTINUOUS CONFLICT: PASS');
