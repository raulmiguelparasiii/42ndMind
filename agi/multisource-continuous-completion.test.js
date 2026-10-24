'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Multi-source raw-relation falsification. p2 depends jointly on p0 and p1.
// Every p0 value occurs with every p1 value in the retained evidence window, so
// no unary function of either source can explain the target. Passing therefore
// requires one relation whose meaning genuinely includes both simultaneous
// sources, then uses that M-owned relation to complete a novel null target.

const A = 0.173219;
const B = -0.211487;
const C = 0.619133;
const D = 0.093571;
const CONCERN = 41;
function f(x, z) { return A * x + B * z + C * x * z + D; }

const learnerSource = fs.readFileSync(path.join(__dirname, 'continuous-relational-contact.js'), 'utf8');
for (const forbidden of ['0.173219', '-0.211487', '0.619133', '0.093571', 'multisource-continuous-completion'])
  assert(!learnerSource.includes(forbidden), `learner contains test-specific multi-source fixture: ${forbidden}`);

const values = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2];
function grid() {
  const out = [];
  for (const x of values) for (const z of values) out.push([x, z]);
  return out;
}
let seed = 0x4d53c2a1;
function random() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}
function shuffled(xs) {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const M = Mind.one(1, 1);
// Two independently shuffled complete grids. The final 64-contact evidence
// window still contains the full Cartesian product, while temporal ordering is
// deliberately uninformative.
for (const [x, z] of [...shuffled(grid()), ...shuffled(grid())])
  Mind.C(M, { frame: [x, z, f(x, z), CONCERN] });

const currentFacts = M.knowledge?.current?.facts || [];
const unarySameTime = currentFacts.filter(fact =>
  fact.relation === 'ρ:continuous_dependence' && fact.object?.target === 'receptor:p2' &&
  fact.object?.lag === 0 && (fact.subject === 'receptor:p0' || fact.subject === 'receptor:p1'));
assert.strictEqual(unarySameTime.length, 0,
  'fixture accidentally admitted a unary same-time explanation for the joint target');

const joint = currentFacts.find(fact =>
  fact.relation === 'ρ:continuous_dependence' && fact.object?.target === 'receptor:p2' &&
  Array.isArray(fact.object?.sources) && fact.object.sources.length >= 2 &&
  fact.object.sources.some(s => s?.source === 'receptor:p0' && s?.lag === 0) &&
  fact.object.sources.some(s => s?.source === 'receptor:p1' && s?.lag === 0));
assert(joint, 'joint raw relation requiring two simultaneous sources was not discovered');
assert(joint.object.transform, 'joint relation has no quantitative transformation');
assert((M.knowledge?.facts || []).some(fact =>
  fact.relation === 'ρ:relation_object' && fact.object?.target === 'receptor:p2' &&
  Array.isArray(fact.object?.sources) && fact.object.sources.length >= 2),
  'joint transformation did not become first-class M content');

const X = 0.812345;
const Z = -1.345678;
const EXPECTED = f(X, Z);
Mind.C(M, { frame: [X, Z, null, CONCERN] });
assert.strictEqual(M.contacts.at(-1)[2], null, 'uncontacted joint target was rewritten as observation');
assert.strictEqual(M.current?.observed?.p2, undefined, 'uncontacted joint target was falsely observed');
assert(M.current?.inferred?.includes('p2'), 'joint learned relation did not infer the missing target');
assert(Number.isFinite(M.current?.completed?.p2), 'joint completion produced no numeric value');
assert(Math.abs(M.current.completed.p2 - EXPECTED) < 1e-6,
  'joint completion does not follow the relation learned from raw contact');

for (const forbidden of ['multivariate_model', 'interaction_model', 'sensor_model', 'world_model', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  no_unary_same_time_shortcut: true,
  raw_joint_relation_discovered: true,
  joint_transform_first_class_in_M: true,
  novel_missing_target_completed: true,
  null_contact_remained_unobserved: true,
  exact_raw_history_retained: true,
  parallel_multisource_authority: false,
}, null, 2));
console.log('MULTI-SOURCE CONTINUOUS RELATION COMPLETION: PASS');
