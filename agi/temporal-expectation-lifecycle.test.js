'use strict';

const assert = require('assert');
const Mind = require('./mind.js');
const Canonical = require('../one-mind.js');
const RelationSequence = require('./relation-sequence-recompression.js');

// Frontier falsification. Expectation formation/completion is already solved.
// Seed only that established M anatomy, then require the public C to connect it
// to later lived occurrences that can actually bear on it. Unrelated contact
// must not erase unfinished relational pressure merely because it happened next.

const EXP = 'fixture:lifecycle:expression:A';
const REL = 'fixture:lifecycle:relation:R';
const REL_OTHER = 'fixture:lifecycle:relation:other';
const ACT_A = 'fixture:lifecycle:action:A';
const ACT_B = 'fixture:lifecycle:action:B';

assert.strictEqual(typeof RelationSequence.lifecycleUpdate, 'function',
  'generic temporal expectation lifecycle bridge is missing');
const lifecycleSource = RelationSequence.lifecycleUpdate.toString();
for (const forbidden of [
  'surface_expression_occurrence', 'relation_occurrence', 'action_occurrence',
  'expression_term', 'relation_term', 'action_term',
]) assert(!lifecycleSource.includes(forbidden),
  `temporal lifecycle contains modality-specific branch material: ${forbidden}`);

function ref(id) { return { ref: String(id) }; }
function hasFact(M, subject, relation, predicate = () => true) {
  return (M.knowledge?.facts || []).some(f => String(f.subject) === String(subject) &&
    f.relation === relation && predicate(f.object));
}

const M = Mind.one(1, 1);
Canonical.C(M, { relations: { facts: [
  [EXP, 'ρ:kind', 'expression_term'],
  [EXP, 'ρ:instantiation_kind', 'surface_expression_occurrence'],
  [REL, 'ρ:kind', 'relation_term'],
  [REL, 'ρ:instantiation_kind', 'relation_occurrence'],
  [REL_OTHER, 'ρ:kind', 'relation_term'],
  [REL_OTHER, 'ρ:instantiation_kind', 'relation_occurrence'],
  [ACT_A, 'ρ:kind', 'action_term'],
  [ACT_A, 'ρ:instantiation_kind', 'action_occurrence'],
  [ACT_B, 'ρ:kind', 'action_term'],
  [ACT_B, 'ρ:instantiation_kind', 'action_occurrence'],
  ['lived-contact:0', 'ρ:kind', 'lived_contact'],
  ['lived-contact:0', 'ρ:lived_order', 0],
] } });

let expectationSerial = 0;
function seedExpectation(terms) {
  const order = M.structure?.lived_contact_order || 0;
  const id = `fixture:lifecycle:expectation:${++expectationSerial}`;
  Canonical.C(M, { relations: { facts: [
    [id, 'ρ:kind', 'temporal_expectation'],
    [id, 'ρ:after_lived_order', order],
    [id, 'ρ:expected_terms', terms.map(ref)],
    ...terms.map(term => [id, 'ρ:expects_term', ref(term)]),
    [id, 'ρ:formation_status', 'open'],
    [`lived-contact:${order}`, 'ρ:has_temporal_expectation', ref(id)],
  ] } });
  return { id, order };
}

let occurrenceSerial = 0;
function nextEvent(entries) {
  const order = (M.structure?.lived_contact_order || 0) + 1;
  const facts = [];
  const ids = [];
  for (const { term, kind } of entries) {
    const id = `fixture:lifecycle:occurrence:${++occurrenceSerial}`;
    ids.push(id);
    facts.push(
      [id, 'ρ:kind', kind],
      [id, 'ρ:kind', 'lived_occurrence'],
      [id, 'ρ:instantiates', ref(term)],
      [id, 'ρ:lived_order', order],
    );
  }
  Mind.C(M, { relations: { facts } });
  assert.strictEqual(M.structure?.lived_contact_order, order, 'public C did not advance whole-life order once');
  return { order, ids };
}

function evaluationFor(expectation) {
  const facts = M.knowledge?.facts || [];
  const ids = new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === 'temporal_expectation_evaluation')
    .map(f => String(f.subject)));
  const id = [...ids].find(candidate => facts.some(f => String(f.subject) === candidate &&
    f.relation === 'ρ:evaluates_expectation' && f.object?.ref === expectation));
  if (!id) return null;
  const value = relation => facts.find(f => String(f.subject) === id && f.relation === relation)?.object;
  const refs = relation => (value(relation) || []).map(x => String(x?.ref)).sort();
  return {
    id,
    result: value('ρ:evaluation_result'),
    order: value('ρ:successor_lived_order'),
    fulfilled: refs('ρ:fulfilled_terms'),
    unmet: refs('ρ:unmet_terms'),
    unknown: refs('ρ:unknown_terms'),
    occurrences: refs('ρ:based_on_occurrences'),
  };
}

// Partial: expression and action occur as expected; another relation occurrence
// makes the relation channel evaluable, but the expected relation itself is absent.
const partialExpectation = seedExpectation([EXP, REL, ACT_A]);
const partialEvent = nextEvent([
  { term: EXP, kind: 'surface_expression_occurrence' },
  { term: REL_OTHER, kind: 'relation_occurrence' },
  { term: ACT_A, kind: 'action_occurrence' },
]);
const partial = evaluationFor(partialExpectation.id);
assert(partial, 'evaluable successor did not create M-owned expectation evaluation');
assert.strictEqual(partial.result, 'partial');
assert.strictEqual(partial.order, partialEvent.order);
assert.deepStrictEqual(partial.fulfilled, [ACT_A, EXP].sort());
assert.deepStrictEqual(partial.unmet, [REL]);
assert.deepStrictEqual(partial.unknown, []);
assert(partial.occurrences.length === 3, 'partial evaluation lost exact successor occurrence provenance');

// Unknown is not false and is not completion. An action expectation must remain
// live while an unrelated expression event passes through the same one M.
const continuingExpectation = seedExpectation([ACT_B]);
const unrelatedEvent = nextEvent([{ term: EXP, kind: 'surface_expression_occurrence' }]);
assert.strictEqual(evaluationFor(continuingExpectation.id), null,
  'wholly unrelated contact incorrectly became an expectation lifecycle event');
assert(!hasFact(M, continuingExpectation.id, 'ρ:resolved_by', x => x?.ref !== undefined),
  'unrelated contact incorrectly extinguished unfinished relational pressure');

// The same still-open expectation must then meet the first later event capable of
// bearing on it, without a copied predictor/workspace state.
const laterBearingEvent = nextEvent([{ term: ACT_B, kind: 'action_occurrence' }]);
const continued = evaluationFor(continuingExpectation.id);
assert(continued, 'unfinished expectation did not survive to later bearing reality');
assert.strictEqual(continued.result, 'fulfilled');
assert.strictEqual(continued.order, laterBearingEvent.order);
assert.deepStrictEqual(continued.fulfilled, [ACT_B]);
assert.deepStrictEqual(continued.unmet, []);
assert.deepStrictEqual(continued.unknown, []);

// True violation: an action occurrence was contacted, but it instantiated a
// different action term from the expected one.
const violatedExpectation = seedExpectation([ACT_B]);
const violatedEvent = nextEvent([{ term: ACT_A, kind: 'action_occurrence' }]);
const violated = evaluationFor(violatedExpectation.id);
assert(violated, 'evaluable contradictory successor was not represented');
assert.strictEqual(violated.result, 'violated');
assert.strictEqual(violated.order, violatedEvent.order);
assert.deepStrictEqual(violated.fulfilled, []);
assert.deepStrictEqual(violated.unmet, [ACT_B]);
assert.deepStrictEqual(violated.unknown, []);

// Full fulfillment.
const fulfilledExpectation = seedExpectation([REL]);
const fulfilledEvent = nextEvent([{ term: REL, kind: 'relation_occurrence' }]);
const fulfilled = evaluationFor(fulfilledExpectation.id);
assert(fulfilled, 'fulfilled successor was not represented');
assert.strictEqual(fulfilled.result, 'fulfilled');
assert.strictEqual(fulfilled.order, fulfilledEvent.order);
assert.deepStrictEqual(fulfilled.fulfilled, [REL]);
assert.deepStrictEqual(fulfilled.unmet, []);
assert.deepStrictEqual(fulfilled.unknown, []);

for (const expectation of [partialExpectation, continuingExpectation, violatedExpectation, fulfilledExpectation]) {
  assert(hasFact(M, expectation.id, 'ρ:formation_status', x => x === 'open'),
    'original expectation formation history was mutated away');
  assert(hasFact(M, expectation.id, 'ρ:resolved_by', x => x?.ref !== undefined),
    'bearing reality failed to settle a historical expectation');
}
for (const event of [partialEvent, unrelatedEvent, laterBearingEvent, violatedEvent, fulfilledEvent])
  for (const occurrence of event.ids) assert(hasFact(M, occurrence, 'ρ:lived_order', x => x === event.order),
    'exact successor occurrence history was not retained');

for (const forbidden of ['temporal_lifecycle_state', 'expectation_status_ledger', 'predictor_state'])
  assert.strictEqual(M[forbidden], undefined, `parallel lifecycle authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_public_C_for_new_life: true,
  expression_relation_action_terms_share_lifecycle: true,
  partial_fulfillment_preserved: true,
  unrelated_contact_does_not_resolve: true,
  unfinished_relation_survives_to_later_bearing_contact: true,
  evaluable_contradiction_is_violation: true,
  fulfillment_provenanced_to_exact_occurrences: true,
  original_expectation_history_retained: true,
  parallel_lifecycle_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('TEMPORAL EXPECTATION LIFECYCLE: PASS');
