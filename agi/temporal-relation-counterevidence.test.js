'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Frontier falsification only:
// A learned ordered relation that is used categorically for present completion
// must be constrained by the later reality outcome of the expectation it caused.
// Historical relation/evidence stays in M; the test asks only whether a directly
// counterexampled categorical successor remains silently usable afterward.

const A = 'fixture:temporal-correction:A';
const B = 'fixture:temporal-correction:B';
const C = 'fixture:temporal-correction:C';
const D = 'fixture:temporal-correction:D';
const E = 'fixture:temporal-correction:E';
const R_AB = 'fixture:temporal-correction:R_AB';
const R_DE = 'fixture:temporal-correction:R_DE';
const KIND_AB = 'fixture:temporal-correction:kind_ab';
const KIND_DE = 'fixture:temporal-correction:kind_de';

for (const file of ['mind.js', 'relation-sequence-recompression.js', 'generic-lived-occurrences.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes('fixture:temporal-correction:'), `${file} contains test-specific correction fixture`);
}

function ref(id) { return { ref: String(id) }; }
const M = Mind.one(1, 1);

function orderedRelation(id, first, second) {
  return [
    [id, 'ρ:kind', 'learned_ordered_relation'],
    [id, 'ρ:ordered_expansion', [
      { simultaneous_relations: [ref(first)] },
      { simultaneous_relations: [ref(second)] },
    ]],
    [id, 'ρ:depth', 1],
    [id, 'ρ:ordered_evidence_route', { kind: 'full' }],
    [id, 'ρ:authority', 'M_retained_lived_occurrences'],
  ];
}

Mind.C(M, { relations: { facts: [
  [A, 'ρ:instantiation_kind', KIND_AB],
  [B, 'ρ:instantiation_kind', KIND_AB],
  [C, 'ρ:instantiation_kind', KIND_AB],
  [D, 'ρ:instantiation_kind', KIND_DE],
  [E, 'ρ:instantiation_kind', KIND_DE],
  ...orderedRelation(R_AB, A, B),
  ...orderedRelation(R_DE, D, E),
] } });

function event(term, kind) {
  const order = (M.structure?.lived_contact_order || 0) + 1;
  const occurrence = `fixture:lived:${order}:${term}`;
  Mind.C(M, { relations: { facts: [
    [occurrence, 'ρ:kind', kind],
    [occurrence, 'ρ:kind', 'lived_occurrence'],
    [occurrence, 'ρ:instantiates', ref(term)],
    [occurrence, 'ρ:lived_order', order],
  ] } });
  return { order, occurrence };
}

function expectationAt(order, term) {
  const facts = M.knowledge?.facts || [];
  const ids = new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === 'temporal_expectation')
    .map(f => String(f.subject)));
  return [...ids].find(id =>
    facts.some(f => String(f.subject) === id && f.relation === 'ρ:after_lived_order' && f.object === order) &&
    facts.some(f => String(f.subject) === id && f.relation === 'ρ:expects_term' && f.object?.ref === term));
}
function evaluationOf(expectation) {
  const facts = M.knowledge?.facts || [];
  const ids = new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === 'temporal_expectation_evaluation')
    .map(f => String(f.subject)));
  return [...ids].find(id => facts.some(f => String(f.subject) === id &&
    f.relation === 'ρ:evaluates_expectation' && f.object?.ref === expectation));
}
function value(subject, relation) {
  return (M.knowledge?.facts || []).find(f => String(f.subject) === String(subject) && f.relation === relation)?.object;
}
function has(subject, relation, predicate = () => true) {
  return (M.knowledge?.facts || []).some(f => String(f.subject) === String(subject) &&
    f.relation === relation && predicate(f.object));
}

// Established categorical use: A presently licenses B through R_AB.
const firstA = event(A, KIND_AB);
const firstExpectation = expectationAt(firstA.order, B);
assert(firstExpectation, 'A did not produce the established B expectation');
assert(has(firstExpectation, 'ρ:grounded_by_ordered_relation', x => x?.ref === R_AB),
  'B expectation is not grounded by R_AB');

// Same evaluable occurrence kind, different term: this is a direct counterexample
// to the categorical immediate-successor claim B, not an unknown observation.
event(C, KIND_AB);
const violation = evaluationOf(firstExpectation);
assert(violation, 'later evaluable successor did not evaluate the prior expectation');
assert.strictEqual(value(violation, 'ρ:evaluation_result'), 'violated',
  'A->C countercontact was not represented as a violation');
assert(has(violation, 'ρ:unmet_terms', xs => Array.isArray(xs) && xs.some(x => x?.ref === B)),
  'violation did not retain B as the unmet expected term');

// Unrelated learned structure must remain usable after the violation.
const d = event(D, KIND_DE);
const unrelated = expectationAt(d.order, E);
assert(unrelated, 'unrelated D->E relation was lost while correcting A->B');
event(E, KIND_DE);
const unrelatedEvaluation = evaluationOf(unrelated);
assert(unrelatedEvaluation, 'unrelated expectation was not evaluated');
assert.strictEqual(value(unrelatedEvaluation, 'ρ:evaluation_result'), 'fulfilled');

// Probe the defeated categorical claim again. Historical R_AB must remain in M,
// but its old compression/evidence-route metadata may not, by itself, continue to
// license the exact same unique B expectation after direct countercontact.
const secondA = event(A, KIND_AB);
assert.strictEqual(expectationAt(secondA.order, B), undefined,
  'counterexampled A->B categorical successor remained silently usable');
assert(has(R_AB, 'ρ:kind', x => x === 'learned_ordered_relation'),
  'historical ordered relation was deleted instead of corrected/reopened');
assert(has(R_AB, 'ρ:ordered_expansion', Array.isArray),
  'historical ordered expansion was not retained');

for (const forbidden of ['temporal_status_ledger', 'relation_truth_state', 'sequence_policy', 'predictor_state'])
  assert.strictEqual(M[forbidden], undefined, `parallel temporal authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  categorical_temporal_claim_was_used: true,
  later_evaluable_countercontact_became_violation: true,
  violation_traces_to_source_expectation: true,
  unrelated_ordered_relation_survived: true,
  counterexampled_unique_successor_no_longer_licensed: true,
  historical_relation_retained: true,
  parallel_temporal_status_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('TEMPORAL RELATION COUNTEREVIDENCE: PASS');
