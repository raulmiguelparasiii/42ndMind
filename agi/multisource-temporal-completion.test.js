'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Mixed-lag multi-source falsification. p2(t) depends jointly on p0(t) and
// p1(t-3). The two source streams are independent and nonperiodic, so neither a
// unary relation nor an all-same-time source set can explain the target. Passing
// requires discovery of source identity and temporal offset inside one M relation.

const A = 0.184237;
const B = -0.263591;
const C = 0.577843;
const D = 0.071329;
const LAG = 3;
const CONCERN = 43;
const TRAIN = 160;
function f(x, z) { return A * x + B * z + C * x * z + D; }

const learnerSource = fs.readFileSync(path.join(__dirname, 'multisource-continuous-relations.js'), 'utf8');
for (const forbidden of ['0.184237', '-0.263591', '0.577843', '0.071329', 'multisource-temporal-completion'])
  assert(!learnerSource.includes(forbidden), `learner contains test-specific mixed-lag fixture: ${forbidden}`);

let seed = 0x74a31f29;
function random() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}
const x = Array.from({ length: TRAIN }, (_, i) => (random() * 4 - 2) + i * 1e-7);
const z = Array.from({ length: TRAIN }, (_, i) => (random() * 4 - 2) - i * 1e-7);

const M = Mind.one(1, 1);
for (let t = 0; t < TRAIN; t++) {
  const target = t >= LAG ? f(x[t], z[t - LAG]) : null;
  Mind.C(M, { frame: [x[t], z[t], target, CONCERN] });
}

const facts = M.knowledge?.current?.facts || [];
const targetRelations = facts.filter(fact =>
  fact.relation === 'ρ:continuous_dependence' && fact.object?.target === 'receptor:p2');

const unary = targetRelations.filter(fact => !Array.isArray(fact.object?.sources));
assert.strictEqual(unary.length, 0, 'fixture accidentally admitted a unary explanation for the mixed-lag target');

const sameTimeJoint = targetRelations.filter(fact =>
  Array.isArray(fact.object?.sources) && fact.object.sources.length >= 2 &&
  fact.object.sources.every(source => source?.lag === 0));
assert.strictEqual(sameTimeJoint.length, 0,
  'fixture accidentally admitted an all-same-time joint explanation for the mixed-lag target');

const joint = targetRelations.find(fact =>
  Array.isArray(fact.object?.sources) && fact.object.sources.length >= 2 &&
  fact.object.sources.some(source => source?.source === 'receptor:p0' && source?.lag === 0) &&
  fact.object.sources.some(source => source?.source === 'receptor:p1' && source?.lag === LAG));
assert(joint, 'mixed-lag joint relation was not discovered from raw contact');
assert(joint.object.transform, 'mixed-lag joint relation has no quantitative transformation');
assert((M.knowledge?.facts || []).some(fact =>
  fact.relation === 'ρ:relation_object' && fact.object?.target === 'receptor:p2' &&
  Array.isArray(fact.object?.sources) &&
  fact.object.sources.some(source => source?.source === 'receptor:p0' && source?.lag === 0) &&
  fact.object.sources.some(source => source?.source === 'receptor:p1' && source?.lag === LAG)),
  'mixed-lag joint transformation did not become first-class M content');

const X = 0.913579;
const CURRENT_Z = -0.428631;
const LAGGED_Z = M.contacts.at(-LAG)[1];
const EXPECTED = f(X, LAGGED_Z);
Mind.C(M, { frame: [X, CURRENT_Z, null, CONCERN] });

assert.strictEqual(M.contacts.at(-1)[2], null, 'uncontacted mixed-lag target was rewritten as observation');
assert.strictEqual(M.current?.observed?.p2, undefined, 'uncontacted mixed-lag target was falsely observed');
assert(M.current?.inferred?.includes('p2'), 'mixed-lag joint relation did not infer the missing target');
assert(Number.isFinite(M.current?.completed?.p2), 'mixed-lag completion produced no numeric value');
assert(Math.abs(M.current.completed.p2 - EXPECTED) < 1e-6,
  'mixed-lag completion does not follow the relation learned from raw contact');

for (const forbidden of ['temporal_model', 'multivariate_model', 'interaction_model', 'sensor_model', 'world_model', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  unary_shortcut_absent: true,
  same_time_joint_shortcut_absent: true,
  mixed_lag_joint_relation_discovered: true,
  mixed_lag_transform_first_class_in_M: true,
  novel_missing_target_completed: true,
  null_contact_remained_unobserved: true,
  exact_raw_history_retained: true,
  parallel_temporal_authority: false,
}, null, 2));
console.log('MIXED-LAG MULTI-SOURCE CONTINUOUS COMPLETION: PASS');
