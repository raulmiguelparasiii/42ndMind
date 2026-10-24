'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Nonlinear raw-relation falsification. The target is a cubic transformation of
// one nonrepeating numerical receptor. Its same-time linear correlation is far
// below the existing affine threshold, so passing requires a genuinely broader
// relation description. A later novel source with null target must be completed
// from that learned structure without rewriting contact as observation.

const C3 = 0.618731;
const C2 = -0.347219;
const C1 = 0;
const C0 = 0.173941;
const CONCERN = 37;
const TRAIN = 128;
function f(x) { return C3 * x * x * x + C2 * x * x + C1 * x + C0; }

const learnerSource = fs.readFileSync(path.join(__dirname, 'continuous-relational-contact.js'), 'utf8');
for (const forbidden of ['0.618731', '-0.347219', '0.173941', 'nonlinear-continuous-completion'])
  assert(!learnerSource.includes(forbidden), `learner contains test-specific nonlinear fixture: ${forbidden}`);

// Preserve the same broad signed distribution but randomize presentation order.
// A monotone +/- schedule accidentally creates a second legitimate temporal
// relation in the target stream, which would confound this specifically same-time
// nonlinear falsification rather than strengthen it.
let shuffleSeed = 0x51a7c0de;
function shuffleRandom() {
  shuffleSeed ^= shuffleSeed << 13; shuffleSeed ^= shuffleSeed >>> 17; shuffleSeed ^= shuffleSeed << 5;
  return (shuffleSeed >>> 0) / 0x100000000;
}
const xs = [];
for (let k = 1; k <= TRAIN / 2; k++) xs.push(k / 16, -k / 16);
for (let i = xs.length - 1; i > 0; i--) {
  const j = Math.floor(shuffleRandom() * (i + 1));
  [xs[i], xs[j]] = [xs[j], xs[i]];
}

const M = Mind.one(1, 1);
for (const x of xs) Mind.C(M, { frame: [x, f(x), CONCERN] });

const relation = (M.knowledge?.current?.facts || []).find(fact =>
  fact.subject === 'receptor:p0' && fact.relation === 'ρ:continuous_dependence' &&
  fact.object?.target === 'receptor:p1' && fact.object.lag === 0);
assert(relation, 'raw deterministic nonlinear relation was not discovered');
assert(relation.object.transform && relation.object.transform.kind !== 'affine',
  'nonlinear relation collapsed back to an affine transform');
assert((M.knowledge?.facts || []).some(fact =>
  fact.relation === 'ρ:relation_object' && fact.object?.target === 'receptor:p1' &&
  fact.object.lag === 0 && fact.object.transform?.kind !== 'affine'),
  'nonlinear transformation did not become first-class M content');

const NOVEL = 1.23456789;
const EXPECTED = f(NOVEL);
Mind.C(M, { frame: [NOVEL, null, CONCERN] });
assert.strictEqual(M.contacts.at(-1)[1], null, 'uncontacted nonlinear target was rewritten as observation');
assert.strictEqual(M.current?.observed?.p1, undefined, 'uncontacted nonlinear target was falsely observed');
assert(M.current?.inferred?.includes('p1'), 'nonlinear learned relation did not infer the missing target');
assert(Number.isFinite(M.current?.completed?.p1), 'nonlinear completion produced no numeric value');
assert(Math.abs(M.current.completed.p1 - EXPECTED) < 1e-6,
  'nonlinear completion does not follow the relation learned from raw contact');

for (const forbidden of ['nonlinear_model', 'polynomial_state', 'sensor_model', 'world_model', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  raw_nonlinear_relation_discovered: true,
  nonlinear_transform_first_class_in_M: true,
  novel_missing_target_completed: true,
  null_contact_remained_unobserved: true,
  exact_raw_history_retained: true,
  parallel_nonlinear_authority: false,
}, null, 2));
console.log('NONLINEAR CONTINUOUS RELATION COMPLETION: PASS');
