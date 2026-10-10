'use strict';

const assert = require('assert');
const Mind = require('../../one-mind.js');

const A = 101;
const B = 102;
const GAP = 199;
const SCENE_AB = 10;
const SCENE_BA = 20;
const SCENE_GAP = 90;

const m = Mind.one(1, 1);
assert.ok(Array.isArray(m.structure.temporal_symbols),
  'raw perceptual succession is not represented in M');

let noise = 1000;
function contactOn(state, token, scene) {
  Mind.C(state, [token, scene, noise++, 0]);
}
function contact(token, scene) {
  contactOn(m, token, scene);
}

// One continuous individual experiences the same two opposite ordered relations.
// The changing third percept prevents a fixed whole-frame alias from carrying the result.
for (let round = 0; round < 12; round++) {
  contact(A, SCENE_AB);
  contact(B, SCENE_AB);
  contact(GAP, SCENE_GAP);
  contact(B, SCENE_BA);
  contact(A, SCENE_BA);
  contact(GAP, SCENE_GAP);
}
contact(GAP, SCENE_GAP);

function sameExpansion(symbol, expansion) {
  return symbol.channel === 'p0' &&
    Array.isArray(symbol.expansion) &&
    symbol.expansion.length === expansion.length &&
    symbol.expansion.every((value, i) => value === expansion[i]);
}

const ab = m.structure.temporal_symbols.find(symbol => sameExpansion(symbol, [A, B]));
assert.ok(ab, 'M did not stabilize repeated same-channel A→B');
assert.ok(ab.support >= 8, 'repeated reality did not strengthen A→B');

const grounded = m.structure.patterns.find(pattern =>
  pattern.active !== false &&
  pattern.target === 'p1' &&
  pattern.expected === SCENE_AB &&
  pattern.conditions.some(atom => atom.feature === ab.feature && atom.value === true)
);
assert.ok(grounded, 'A→B did not ground into its concurrent world relation');

const forward = structuredClone(m);
contactOn(forward, A, null);
contactOn(forward, B, null);
assert.strictEqual(forward.current.completed[ab.feature], true,
  'recurring A→B did not reuse the same temporal identity');
assert.strictEqual(forward.current.completed.p1, SCENE_AB,
  'grounded A→B was not usable live');

const reverse = structuredClone(m);
contactOn(reverse, B, null);
contactOn(reverse, A, null);
assert.notStrictEqual(reverse.current.completed[ab.feature], true,
  'B→A incorrectly instantiated A→B');
assert.notStrictEqual(reverse.current.completed.p1, SCENE_AB,
  'B→A incorrectly reached the A→B grounding');

// Null means this channel was not contacted now. Old p0 history must therefore
// remain historical rather than masquerading as a temporal relation occurring now.
const absent = structuredClone(m);
Mind.C(absent, [null, null, noise++, 0]);
assert.notStrictEqual(absent.current.completed[ab.feature], true,
  'uncontacted current p0 reused an old A→B window as present evidence');

const originalFeature = ab.feature;
const originalSupport = ab.support;
for (let round = 0; round < 6; round++) {
  contact(A, SCENE_AB);
  contact(B, SCENE_AB);
  contact(GAP, SCENE_GAP);
  contact(B, SCENE_BA);
  contact(A, SCENE_BA);
  contact(GAP, SCENE_GAP);
}
contact(GAP, SCENE_GAP);

const stabilized = m.structure.temporal_symbols.find(symbol => sameExpansion(symbol, [A, B]));
assert.ok(stabilized, 'continued life erased A→B');
assert.strictEqual(stabilized.feature, originalFeature,
  'continued life reassigned the same relation a new identity');
assert.ok(stabilized.support >= originalSupport,
  'continued confirming reality weakened A→B support');

console.log('42ndMind raw percept succession: PASS');
console.log(JSON.stringify({
  one_continuous_M: true,
  relation: 'same-channel A→B',
  learned_temporal_symbol: stabilized.feature,
  support_before: originalSupport,
  support_after: stabilized.support,
  grounded_scene: SCENE_AB,
  live_reuse: true,
  reverse_order_rejected: true,
  absent_current_contact_not_reused: true,
  identity_stable_through_continued_life: true,
  C_language_specific_logic: false,
}));
