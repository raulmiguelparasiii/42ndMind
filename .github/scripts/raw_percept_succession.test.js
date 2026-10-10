'use strict';

const assert = require('assert');
const Mind = require('../../one-mind.js');

// Generic falsification: the same raw percept must keep one identity when it
// recurs at different times. Order is supplied only by successive C contacts.
// No token position, lexical category, sentence slot, grammar, or dictionary is
// supplied. p0 is one physical categorical percept channel; p1 is a world
// property; p2 is irrelevant changing context; c0 is closed.
const A = 101;
const B = 102;
const GAP = 199;
const SCENE_AB = 10;
const SCENE_BA = 20;
const SCENE_GAP = 90;

const m = Mind.one(1, 1);
let noise = 1000;
function contact(token, scene) {
  Mind.C(m, [token, scene, noise++, 0]);
}

// A and B occur equally often in both scenes. Their individual identities
// therefore cannot distinguish SCENE_AB from SCENE_BA. Only their experienced
// succession can. GAP prevents the target pair from being created accidentally
// across episode boundaries. Noise makes whole snapshots unique.
for (let round = 0; round < 24; round++) {
  contact(A, SCENE_AB);
  contact(B, SCENE_AB);
  contact(GAP, SCENE_GAP);
  contact(B, SCENE_BA);
  contact(A, SCENE_BA);
  contact(GAP, SCENE_GAP);
}
// Flush the final contact into exact experience.
contact(GAP, SCENE_GAP);

assert.ok(Array.isArray(m.structure.temporal_symbols),
  'raw perceptual succession is not represented in M');

function sameExpansion(symbol, expansion) {
  return symbol.channel === 'p0' &&
    Array.isArray(symbol.expansion) &&
    symbol.expansion.length === expansion.length &&
    symbol.expansion.every((value, i) => value === expansion[i]);
}

const ab = m.structure.temporal_symbols.find(symbol => sameExpansion(symbol, [A, B]));
assert.ok(ab,
  'M did not stabilize the repeated same-channel A→B relation');
assert.ok(ab.support >= 8,
  'A→B did not remain supported by repeated reality contact');

// The temporal relation must participate in ordinary empirical grounding.
function groundedABRelation(state) {
  return state.structure.patterns.find(pattern =>
    pattern.active !== false &&
    pattern.target === 'p1' &&
    pattern.expected === SCENE_AB &&
    pattern.conditions.some(atom => atom.feature === ab.feature && atom.value === true)
  );
}
const groundedBefore = groundedABRelation(m);
assert.ok(groundedBefore,
  'the learned A→B relation did not ground into the concurrent world relation');

// A live recurrence of the same raw sequence, through the same p0 channel and
// with the world property withheld, must make that grounded relation usable.
const forward = structuredClone(m);
Mind.C(forward, [A, null, noise++, 0]);
Mind.C(forward, [B, null, noise++, 0]);
assert.strictEqual(forward.current.completed.p1, SCENE_AB,
  'the grounded A→B relation was not usable from raw succession');
assert.strictEqual(forward.current.completed[ab.feature], true,
  'the recurring A→B percept did not retain its learned temporal identity');

// Reversing the exact same percepts must not instantiate A→B.
const reverse = structuredClone(m);
Mind.C(reverse, [B, null, noise++, 0]);
Mind.C(reverse, [A, null, noise++, 0]);
assert.notStrictEqual(reverse.current.completed[ab.feature], true,
  'B→A incorrectly instantiated the learned A→B relation');
assert.notStrictEqual(reverse.current.completed.p1, SCENE_AB,
  'reverse order incorrectly grounded as the forward world relation');

// Continue the same M. The relation must keep the same grounded identity rather
// than being recreated as a new positional percept after more life.
const originalFeature = ab.feature;
const originalSupport = ab.support;
for (let round = 0; round < 12; round++) {
  contact(A, SCENE_AB);
  contact(B, SCENE_AB);
  contact(GAP, SCENE_GAP);
  contact(B, SCENE_BA);
  contact(A, SCENE_BA);
  contact(GAP, SCENE_GAP);
}
contact(GAP, SCENE_GAP);

const stabilized = m.structure.temporal_symbols.find(symbol => sameExpansion(symbol, [A, B]));
assert.ok(stabilized, 'continued life erased the A→B relation');
assert.strictEqual(stabilized.feature, originalFeature,
  'continued life reassigned the same grounded temporal relation a new identity');
assert.ok(stabilized.support >= originalSupport,
  'confirming experience weakened the stored support of A→B');
assert.ok(groundedABRelation(m),
  'continued reality contact erased the grounded A→B world relation');

console.log('42ndMind raw percept succession and grounding: PASS');
console.log(JSON.stringify({
  one_continuous_M: true,
  same_percept_channel: 'p0',
  artificial_token_positions: false,
  learned_temporal_symbol: stabilized.feature,
  learned_expansion: stabilized.expansion,
  support: stabilized.support,
  grounded_scene: SCENE_AB,
  reverse_order_rejected: true,
  C_language_specific_logic: false,
}));
