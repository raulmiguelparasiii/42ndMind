'use strict';

const assert = require('assert');
const fs = require('fs');
const Mind = require('../../one-mind.js');

const STAGE = process.env.STAGE || 'all';
function checkpoint(name, payload = {}) {
  console.log(JSON.stringify({ checkpoint: name, ...payload }));
  if (STAGE === name) process.exit(0);
}

const A = 101;
const B = 102;
const GAP = 199;
const SCENE_AB = 10;
const SCENE_BA = 20;
const SCENE_GAP = 90;

const m = Mind.one(1, 1);
assert.ok(Array.isArray(m.structure.temporal_symbols),
  'raw perceptual succession is not represented in M');
checkpoint('structure');

let noise = 1000;
function contactOn(state, token, scene) {
  Mind.C(state, [token, scene, noise++, 0]);
}
function contact(token, scene) {
  contactOn(m, token, scene);
}

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
assert.ok(ab, 'M did not stabilize the repeated same-channel A→B relation');
assert.ok(ab.support >= 8, 'A→B did not remain supported by repeated reality contact');
checkpoint('formation', { feature: ab.feature, support: ab.support });

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
checkpoint('grounding', { feature: ab.feature, pattern: groundedBefore.id });

const forward = structuredClone(m);
contactOn(forward, A, null);
contactOn(forward, B, null);
assert.strictEqual(forward.current.completed[ab.feature], true,
  'the recurring A→B percept did not retain its learned temporal identity');
assert.strictEqual(forward.current.completed.p1, SCENE_AB,
  'the grounded A→B relation was not usable from raw succession');
checkpoint('forward', { feature: ab.feature, completed_scene: forward.current.completed.p1 });

const reverse = structuredClone(m);
contactOn(reverse, B, null);
contactOn(reverse, A, null);
assert.notStrictEqual(reverse.current.completed[ab.feature], true,
  'B→A incorrectly instantiated the learned A→B temporal identity');
checkpoint('reverse_identity', {
  ab_value: reverse.current.completed[ab.feature] ?? null,
  completed_scene: reverse.current.completed.p1 ?? null,
});

if (STAGE === 'reverse_debug') {
  const satisfied = pattern => pattern.conditions.every(atom =>
    Object.prototype.hasOwnProperty.call(reverse.current.completed, atom.feature) &&
    JSON.stringify(reverse.current.completed[atom.feature]) === JSON.stringify(atom.value)
  );
  const inferredSet = new Set(reverse.current.inferred);
  const targetRoutes = reverse.structure.patterns
    .filter(pattern => pattern.active !== false && pattern.target === 'p1')
    .map(pattern => ({
      id: pattern.id,
      expected: pattern.expected,
      conditions: pattern.conditions,
      satisfied_after_completion: satisfied(pattern),
      support: pattern.support,
      exceptions: pattern.exceptions,
      reliability: pattern.reliability,
      predictive_code_bits: pattern.predictive_code_bits,
      dependency_count: pattern.dependency_count,
    }));
  const inferredRoutes = reverse.structure.patterns
    .filter(pattern => pattern.active !== false && inferredSet.has(pattern.target))
    .map(pattern => ({
      id: pattern.id,
      target: pattern.target,
      expected: pattern.expected,
      conditions: pattern.conditions,
      satisfied_after_completion: satisfied(pattern),
      support: pattern.support,
      exceptions: pattern.exceptions,
      reliability: pattern.reliability,
      predictive_code_bits: pattern.predictive_code_bits,
    }));
  const inferredSymbols = reverse.structure.symbols
    .filter(symbol => inferredSet.has(symbol.feature))
    .map(symbol => ({
      feature: symbol.feature,
      depth: symbol.depth,
      definition: symbol.definition,
      source: symbol.source,
    }));
  const temporalTrue = Object.fromEntries(Object.entries(reverse.current.completed)
    .filter(([feature, value]) => feature.startsWith('§t') && value === true));
  const diagnostic = {
    ab_feature: ab.feature,
    reverse_completed_scene: reverse.current.completed.p1 ?? null,
    reverse_observed: reverse.current.observed,
    reverse_inferred: reverse.current.inferred,
    reverse_unresolved: reverse.current.unresolved,
    temporal_true: temporalTrue,
    temporal_symbols: reverse.structure.temporal_symbols
      .filter(symbol => symbol.channel === 'p0')
      .map(symbol => ({ feature: symbol.feature, expansion: symbol.expansion, support: symbol.support })),
    inferred_symbols: inferredSymbols,
    inferred_target_routes: inferredRoutes,
    active_p1_routes: targetRoutes,
  };
  fs.mkdirSync('.github/diagnostics', { recursive: true });
  fs.writeFileSync('.github/diagnostics/reverse-grounding.json', JSON.stringify(diagnostic, null, 2) + '\n');
  console.log(JSON.stringify({ checkpoint: 'reverse_debug', file: '.github/diagnostics/reverse-grounding.json' }));
  process.exit(0);
}

assert.notStrictEqual(reverse.current.completed.p1, SCENE_AB,
  'B→A reached the A→B scene through some other learned completion route');
checkpoint('reverse_grounding', { completed_scene: reverse.current.completed.p1 ?? null });

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
assert.ok(stabilized, 'continued life erased the A→B relation');
assert.strictEqual(stabilized.feature, originalFeature,
  'continued life reassigned the same grounded temporal relation a new identity');
assert.ok(stabilized.support >= originalSupport,
  'confirming experience weakened the stored support of A→B');
assert.ok(groundedABRelation(m),
  'continued reality contact erased the grounded A→B world relation');
checkpoint('persistence', { feature: stabilized.feature, support: stabilized.support });

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
