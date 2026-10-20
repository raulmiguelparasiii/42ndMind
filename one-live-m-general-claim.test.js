'use strict';

// Strong bounded falsification of the one-live-M hypothesis.
//
// The test imports ONLY canonical one-mind.js. One continuing individual receives
// embodied contact and structured relational contact through the same C. No ULT
// ledger, planner, language engine, dependency engine, proposer, or other
// cognitive authority is invoked by the test.
//
// Passing this test does not by itself prove unrestricted AGI. It asks the more
// precise architectural question: can materially different cognitive-looking
// consequences arise in one life from one M under one content-neutral C, while a
// learned relation becomes material for higher relations and later correction?

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./one-mind.js');

assert.deepStrictEqual(Object.keys(Mind).sort(), ['C', 'one']);
const source = fs.readFileSync(path.join(__dirname, 'one-mind.js'), 'utf8');
for (const forbidden of [
  'general-claim', 'surface:q7', 'life:R1', 'life:R2', 'life:R3',
  'route:r1-from-learned', 'route:r2-independent',
]) assert.ok(!source.includes(forbidden), `test-specific cognition leaked into C: ${forbidden}`);

const ACTIVE = Object.freeze({ structural: 'active' });
const V = name => ({ var: String(name) });
const ref = id => ({ ref: String(id) });
const stable = value => {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
};
const same = (a, b) => stable(a) === stable(b);
function hasCurrent(M, subject, relation, object) {
  return M.knowledge.current.facts.some(f =>
    same(f.subject, subject) && same(f.relation, relation) && same(f.object, object));
}
function rule(M, id) { return M.knowledge.rules.find(x => x.id === id); }

// ---------------------------------------------------------------------------
// 1. One embodied life: C must discover reusable action/consequence structure.
// ---------------------------------------------------------------------------

const M = Mind.one(4, 2);
let frame = [0, 0, 255, null, 32, 24]; // p3 stays uncontacted: unknown != false.
Mind.C(M, frame);

function advance(preferredAction) {
  const action = M.motor;
  let c0 = frame.at(-2) + 2;
  let c1 = frame.at(-1) + 1;
  if (action === preferredAction) { c0 -= 11; c1 -= 7; }
  else { c0 += 2; c1 += 2; }
  c0 = Math.max(1, Math.min(220, c0));
  c1 = Math.max(1, Math.min(220, c1));
  const t = M.experiences.length;
  frame = [t % 3, (t * 2) % 5, 255, null, c0, c1];
  Mind.C(M, frame);
  return action;
}

const lateActions = [];
for (let i = 0; i < 28; i++) {
  const action = advance(2);
  if (i >= 18) lateActions.push(action);
}

assert.strictEqual(M.whole, 1);
assert.ok(M.structure.patterns.length > 0, 'one life formed no reusable empirical relations');
assert.ok(M.structure.fixed_point_passes >= 1, 'whole-life recompression never reached its bounded fixed point');
assert.ok(lateActions.includes(2), 'the reality-closing action never became available after experience');

// Pick an actually learned live relation. The test does not prescribe its exact
// feature anatomy; it only requires the relation to be grounded in this life and
// to concern the experienced preferred action/consequence structure.
const learned = M.structure.patterns.find(p =>
  p.active !== false &&
  (p.conditions || []).some(a => a.feature === 'action' && a.value === 2) &&
  (p.target === 'relation_c0_order' || p.target === 'immediate_c0_order') &&
  p.expected === 'less'
);
assert.ok(learned, 'C did not learn a live relation connecting experienced action 2 to lower concern');

// Canonical C exposes its empirical relations to the same relational closure as
// ordinary first-class relation descriptors. This identifier is current M
// content, not a semantic name supplied to the learner.
const learnedRef = ref(`empirical:${learned.id}`);

// ---------------------------------------------------------------------------
// 2. Same M, same C: surface attachment + relations about the learned relation.
// ---------------------------------------------------------------------------

const WORD = 'surface:q7';
const R1 = 'life:R1';
const R2 = 'life:R2';
const R3 = 'life:R3';
const E = 'life:E';
const P = 'life:P';
const A = 'life:A';

Mind.C(M, { relations: {
  facts: [
    [WORD, 'ρ:expresses', learnedRef],
    ['source:independent', 'ρ:available', true],
    ['teaching:word', 'ρ:provenance', 'contact:surface-teaching'],
  ],
  rules: [
    // The learned relation itself becomes material for a later relation.
    {
      id: 'route:r1-from-learned',
      premises: [
        [learnedRef, 'kind', 'empirical_relation'],
        [learnedRef, ACTIVE, true],
        [WORD, 'ρ:expresses', learnedRef],
      ],
      conclusion: [R1, 'ρ:warranted', true],
      categorical: true,
      provenance: { kind: 'learned-relation-use' },
    },
    // R2 has one dependency route through R1...
    {
      id: 'route:r2-dependent',
      premises: [[R1, 'ρ:warranted', true]],
      conclusion: [R2, 'ρ:support', 'dependent'],
      categorical: true,
      provenance: { kind: 'dependent-support' },
    },
    // ...and one genuinely independent route.
    {
      id: 'route:r2-independent',
      premises: [['source:independent', 'ρ:available', true]],
      conclusion: [R2, 'ρ:support', 'independent'],
      categorical: true,
      provenance: { kind: 'independent-support' },
    },
    {
      id: 'route:r2-warrant',
      premises: [[R2, 'ρ:support', V('route')]],
      conclusion: [R2, 'ρ:warranted', true],
      categorical: true,
      provenance: { kind: 'generic-warrant-from-live-support' },
    },
    {
      id: 'route:r3',
      premises: [[R2, 'ρ:warranted', true]],
      conclusion: [R3, 'ρ:warranted', true],
      categorical: true,
      provenance: { kind: 'higher-relation' },
    },
    {
      id: 'route:expression',
      premises: [[R3, 'ρ:warranted', true]],
      conclusion: [E, 'ρ:expresses', R3],
      categorical: true,
      provenance: { kind: 'surface-expression' },
    },
    {
      id: 'route:prediction',
      premises: [[R3, 'ρ:warranted', true]],
      conclusion: [P, 'ρ:supported_by', R3],
      categorical: true,
      provenance: { kind: 'prediction' },
    },
    {
      id: 'route:action-consequence',
      premises: [[P, 'ρ:supported_by', R3]],
      conclusion: [A, 'ρ:predicts', 'life:C8'],
      categorical: true,
      provenance: { kind: 'action-consequence' },
    },
  ],
} });

assert(hasCurrent(M, learnedRef, 'kind', 'empirical_relation'), 'learned embodied relation did not enter the relational closure');
assert(hasCurrent(M, learnedRef, ACTIVE, true), 'learned embodied relation was not currently live');
assert(hasCurrent(M, R1, 'ρ:warranted', true));
assert(hasCurrent(M, R2, 'ρ:warranted', true));
assert(hasCurrent(M, R3, 'ρ:warranted', true));
assert(hasCurrent(M, E, 'ρ:expresses', R3));
assert(hasCurrent(M, P, 'ρ:supported_by', R3));
assert(hasCurrent(M, A, 'ρ:predicts', 'life:C8'));

// p3 was never contacted. C may leave it unknown; it must not invent false.
assert.ok(!Object.prototype.hasOwnProperty.call(M.current.observed, 'p3'));
assert.notStrictEqual(M.current.completed.p3, false);

// ---------------------------------------------------------------------------
// 3. Correction in the SAME M. No downstream object is manually edited.
// ---------------------------------------------------------------------------

// Defeat only the route from the learned relation to R1. Seeded, corrigible T10
// inside M disables that categorical route. R1 disappears. R2 must be recomputed
// from ALL remaining support and survive through the independent route.
Mind.C(M, { relations: { facts: [
  [ref('route:r1-from-learned'), 'counterexample', 'counter:learned-route'],
] } });

assert.strictEqual(rule(M, 'route:r1-from-learned').active, false);
assert(!hasCurrent(M, R1, 'ρ:warranted', true), 'defeated lower route left R1 stale');
assert(hasCurrent(M, R2, 'ρ:warranted', true), 'R2 was crudely invalidated despite independent support');
assert(hasCurrent(M, R3, 'ρ:warranted', true));
assert(hasCurrent(M, E, 'ρ:expresses', R3));
assert(hasCurrent(M, P, 'ρ:supported_by', R3));
assert(hasCurrent(M, A, 'ρ:predicts', 'life:C8'));

// Now independently defeat the only remaining R2 support route. Canonical closure
// must remove R2/R3/expression/prediction/action consequences without direct edits.
Mind.C(M, { relations: { facts: [
  [ref('route:r2-independent'), 'counterexample', 'counter:independent-route'],
] } });

assert.strictEqual(rule(M, 'route:r2-independent').active, false);
assert(!hasCurrent(M, R2, 'ρ:warranted', true));
assert(!hasCurrent(M, R3, 'ρ:warranted', true));
assert(!hasCurrent(M, E, 'ρ:expresses', R3));
assert(!hasCurrent(M, P, 'ρ:supported_by', R3));
assert(!hasCurrent(M, A, 'ρ:predicts', 'life:C8'));

// The original surface attachment and exact lived contacts remain; correction
// changed current warrant, not history.
assert(M.knowledge.facts.some(f => same(f.subject, WORD) && same(f.relation, 'ρ:expresses') && same(f.object, learnedRef)));
assert.strictEqual(M.contacts.length, M.experiences.length + 1);
assert.ok(M.knowledge.episodes.length >= 3);
assert.ok(M.knowledge.rules.some(r => same(r.provenance, { kind: 'learned-relation-use' })));

// No parallel cognitive state was introduced.
for (const forbidden of ['math_hypotheses','dependency_ledger','planner','language_state','memory_state','warrant_status']) {
  assert.strictEqual(M[forbidden], undefined, `parallel authority appeared on M: ${forbidden}`);
}

console.log(JSON.stringify({
  one_continuing_M: M.whole === 1,
  one_C_entrypoint: true,
  embodied_recurrence_learned_relation: true,
  learned_relation_became_higher_order_material: true,
  surface_expression_used_same_relation: true,
  higher_relation_recomputed_after_lower_change: true,
  independent_support_preserved_higher_relation: true,
  final_support_loss_unwound_expression_prediction_action: true,
  unknown_was_not_coerced_to_false: true,
  exact_lived_contact_retained: true,
  provenance_retained: true,
  parallel_cognitive_authority: false,
  unrestricted_AGI_demonstrated: false,
  whole: 1,
}, null, 2));
console.log('ONE LIVE M GENERAL-CLAIM FALSIFICATION: PASS');
