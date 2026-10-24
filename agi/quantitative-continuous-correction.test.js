'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

// Quantitative-correction falsification. The relation keeps the same source,
// target, zero lag, and positive orientation while reality changes only the
// affine coefficients. A relation identity that ignores its quantitative meaning
// will silently keep a stale transform. The one continuing M/C life must instead
// let later recurrent contact defeat/revise the old quantitative meaning, retain
// the superseded contact, and use the new map for a novel missing target.

const CONCERN = 23;
const FIRST = { scale: 1.75, offset: -0.28 };
const SECOND = { scale: 3.125, offset: 0.63 };
const EPOCH = 96;
let seed = 0xc0ffee71;
function rnd() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}
function sample(map, t) {
  const x = rnd() * 6 - 3 + t * 1e-8;
  return [x, map.scale * x + map.offset, CONCERN];
}
function currentMap(M) {
  const f = (M.knowledge?.current?.facts || []).find(f =>
    f.subject === 'receptor:p0' && f.relation === 'ρ:continuous_dependence' &&
    f.object && f.object.target === 'receptor:p1' && f.object.lag === 0 &&
    f.object.transform?.kind === 'affine');
  return f?.object?.transform || null;
}

const M = Mind.one(1, 1);
for (let t = 0; t < EPOCH; t++) Mind.C(M, { frame: sample(FIRST, t) });
let map = currentMap(M);
assert(map, 'first quantitative relation was not learned');
assert(Math.abs(map.scale - FIRST.scale) < 1e-9 && Math.abs(map.offset - FIRST.offset) < 1e-9,
  'first quantitative meaning was learned incorrectly');

const firstHistoryLength = M.contacts.length;
for (let t = 0; t < EPOCH; t++) Mind.C(M, { frame: sample(SECOND, EPOCH + t) });
map = currentMap(M);
assert(map, 'same relation disappeared instead of being revised by later recurrent reality');
assert(Math.abs(map.scale - SECOND.scale) < 1e-9 && Math.abs(map.offset - SECOND.offset) < 1e-9,
  'current continuous relation retained stale affine meaning after reality changed');

// Superseded reality must remain available as exact history rather than being
// rewritten to make the current relation look timelessly true.
assert.strictEqual(M.contacts.length, EPOCH * 2);
for (let t = 0; t < firstHistoryLength; t++) {
  const [x, y] = M.contacts[t];
  assert(Math.abs(y - (FIRST.scale * x + FIRST.offset)) < 1e-10,
    'old quantitative contact was rewritten during correction');
}

const NOVEL = -1.23456789;
const EXPECTED = SECOND.scale * NOVEL + SECOND.offset;
Mind.C(M, { frame: [NOVEL, null, CONCERN] });
assert.strictEqual(M.contacts.at(-1)[1], null, 'novel uncontacted target was rewritten as observation');
assert.strictEqual(M.current?.observed?.p1, undefined, 'novel target was falsely observed');
assert(M.current?.inferred?.includes('p1'), 'revised quantitative relation did not infer the novel target');
assert(Math.abs(M.current?.completed?.p1 - EXPECTED) < 1e-8,
  'novel completion used stale rather than revised quantitative meaning');

const relationObjects = (M.knowledge?.facts || []).filter(f =>
  f.relation === 'ρ:relation_object' && f.object && f.object.target === 'receptor:p1' &&
  f.object.lag === 0 && f.object.transform?.kind === 'affine');
assert(relationObjects.some(f => Math.abs(f.object.transform.scale - FIRST.scale) < 1e-9),
  'superseded first quantitative relation was not retained historically');
assert(relationObjects.some(f => Math.abs(f.object.transform.scale - SECOND.scale) < 1e-9),
  'revised quantitative relation did not become first-class M content');

for (const forbidden of ['sensor_model', 'numeric_model', 'prediction_model', 'world_model', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  first_affine_meaning_learned: true,
  same_orientation_relation_revised: true,
  superseded_raw_contact_retained: true,
  new_affine_meaning_first_class_in_M: true,
  novel_completion_uses_revised_meaning: true,
  parallel_numeric_authority: false,
}, null, 2));
console.log('QUANTITATIVE CONTINUOUS RELATION CORRECTION: PASS');
