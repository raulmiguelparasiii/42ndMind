'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

// Quantitative fixed-point falsification. Two affine relations are learned from
// disjoint raw observation types so p0 and p2 are never simultaneously contacted.
// A later novel p0 with both downstream receptors null must therefore complete
// p1 first and then use that inferred value to complete p2. No direct p0->p2
// relation, coefficient, formula, semantic label, or planner is supplied.

const A = { scale: -1.875, offset: 0.42 };
const B = { scale: 2.625, offset: -0.73 };
const CONCERN = 27;
const TRAIN = 96;
let seed = 0xc14a1eed;
function rnd() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}

const M = Mind.one(1, 1);
for (let t = 0; t < TRAIN; t++) {
  if (t % 2 === 0) {
    const x = rnd() * 5 - 2.5 + t * 1e-9;
    Mind.C(M, { frame: [x, A.scale * x + A.offset, null, CONCERN] });
  } else {
    const y = rnd() * 4 - 2 + t * 1e-9;
    Mind.C(M, { frame: [null, y, B.scale * y + B.offset, CONCERN] });
  }
}

function hasCurrent(source, target, lag = 0) {
  return (M.knowledge?.current?.facts || []).some(f =>
    f.subject === `receptor:p${source}` && f.relation === 'ρ:continuous_dependence' &&
    f.object?.target === `receptor:p${target}` && f.object.lag === lag);
}
assert(hasCurrent(0, 1), 'first raw quantitative relation was not learned');
assert(hasCurrent(1, 2), 'second raw quantitative relation was not learned');
assert(!hasCurrent(0, 2), 'a direct p0->p2 shortcut was learned despite no same-time paired contact');
for (const frame of M.contacts) assert(!(frame[0] !== null && frame[2] !== null),
  'training accidentally co-observed p0 and p2');

const NOVEL = 1.234567891;
const P1 = A.scale * NOVEL + A.offset;
const P2 = B.scale * P1 + B.offset;
Mind.C(M, { frame: [NOVEL, null, null, CONCERN] });

assert.strictEqual(M.contacts.at(-1)[1], null, 'first missing receptor was rewritten as observation');
assert.strictEqual(M.contacts.at(-1)[2], null, 'second missing receptor was rewritten as observation');
assert.strictEqual(M.current?.observed?.p1, undefined, 'p1 was falsely observed');
assert.strictEqual(M.current?.observed?.p2, undefined, 'p2 was falsely observed');
assert(M.current?.inferred?.includes('p1'), 'first learned relation did not infer p1');
assert(M.current?.inferred?.includes('p2'), 'fixed-point completion did not reuse inferred p1 to infer p2');
assert(Math.abs(M.current.completed.p1 - P1) < 1e-8, 'p1 completion is quantitatively wrong');
assert(Math.abs(M.current.completed.p2 - P2) < 1e-8, 'p2 completion is quantitatively wrong');

for (const forbidden of ['numeric_model', 'composition_state', 'world_model', 'planner', 'memory_state'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  disjoint_raw_training: true,
  no_direct_p0_to_p2_shortcut: true,
  first_missing_value_inferred: true,
  inferred_relation_output_reused_as_input: true,
  second_missing_value_inferred: true,
  exact_null_contact_retained: true,
  parallel_composition_authority: false,
}, null, 2));
console.log('QUANTITATIVE RELATION CHAIN COMPLETION: PASS');
