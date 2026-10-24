'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

// Continuous epistemic falsification: absence of evaluable contact is not
// counterevidence. A learned relation must survive a long interval in which both
// participating receptors are explicitly uncontacted (null), then be defeated
// only after enough later *evaluable* contradictory contact arrives.

const CONCERN = 31;
const TRAIN = 96;
const UNKNOWN = 80;
const CONTRADICT = 80;
let seed = 0x0badf00d;
function rnd() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}
function hasRelation(M) {
  return (M.knowledge?.current?.facts || []).some(f =>
    f.subject === 'receptor:p0' && f.relation === 'ρ:continuous_dependence' &&
    f.object?.target === 'receptor:p1' && f.object.lag === 0);
}

const M = Mind.one(1, 1);
for (let t = 0; t < TRAIN; t++) {
  const x = rnd() * 4 - 2 + t * 1e-8;
  const z = rnd() * 2 - 1;
  Mind.C(M, { frame: [x, 2.25 * x - 0.375, z, CONCERN] });
}
assert(hasRelation(M), 'stable raw relation was not learned before the unknown interval');
const beforeUnknown = structuredClone(M);

// Neither p0 nor p1 is contacted. p2 continues changing so the individual keeps
// receiving raw reality rather than being paused/reset.
for (let t = 0; t < UNKNOWN; t++) {
  Mind.C(M, { frame: [null, null, rnd() * 2 - 1, CONCERN] });
}
assert(hasRelation(M),
  'unevaluable null contact was treated as counterevidence against a learned continuous relation');
assert.strictEqual(M.contacts[TRAIN][0], null);
assert.strictEqual(M.contacts[TRAIN][1], null);

// Now both receptors return, but p1 is independent of p0. Only this evaluable
// later reality is allowed to defeat the old route.
for (let t = 0; t < CONTRADICT; t++) {
  const x = rnd() * 4 - 2;
  const y = rnd() * 7 - 3.5;
  Mind.C(M, { frame: [x, y, rnd() * 2 - 1, CONCERN] });
}
assert(!hasRelation(M), 'recurrent evaluable contradiction failed to defeat the old relation');

// Historical contact and the old first-class relation remain available beneath
// the corrected current state.
for (let t = 0; t < TRAIN; t++) {
  assert.strictEqual(M.contacts[t][1], beforeUnknown.contacts[t][1], 'old contact changed during correction');
}
assert((M.knowledge?.facts || []).some(f =>
  f.relation === 'ρ:relation_object' && f.object?.target === 'receptor:p1' && f.object.lag === 0),
  'superseded relation meaning was deleted from M history');
for (const forbidden of ['sensor_model', 'unknown_state', 'truth_ledger', 'memory_state', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  learned_relation_survived_unevaluable_interval: true,
  null_contact_remained_unknown: true,
  later_evaluable_contradiction_defeated_relation: true,
  exact_old_contact_retained: true,
  parallel_unknown_truth_authority: false,
}, null, 2));
console.log('CONTINUOUS UNKNOWN IS NOT FALSE: PASS');
