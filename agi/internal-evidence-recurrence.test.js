'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Frontier falsification only:
// An internally formed lifecycle evaluation is meaningful M content. It must be
// able to enter the same generic lived-occurrence stream as relation/expression/
// action occurrences so recurrence can discover relations over it. The evaluation
// is not fabricated world contact: its exact provenance remains the expectation
// and later lived event that caused M to form it.

const A = 'fixture:internal-evidence:A';
const B = 'fixture:internal-evidence:B';
const D = 'fixture:internal-evidence:D';
const R_AB = 'fixture:internal-evidence:R_AB';
const REPEATS = 12;

for (const file of ['mind.js', 'relation-sequence-recompression.js', 'generic-lived-occurrences.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes('fixture:internal-evidence:'), `${file} contains test-specific internal-evidence fixture`);
}

function ref(id) { return { ref: String(id) }; }
const M = Mind.one(1, 1);
Mind.C(M, { relations: { facts: [
  [R_AB, 'ρ:kind', 'learned_ordered_relation'],
  [R_AB, 'ρ:ordered_expansion', [
    { simultaneous_relations: [ref(A)] },
    { simultaneous_relations: [ref(B)] },
  ]],
  [R_AB, 'ρ:depth', 1],
  [R_AB, 'ρ:ordered_evidence_route', { kind: 'full' }],
  [R_AB, 'ρ:authority', 'M_retained_lived_occurrences'],
] } });

function event(term) {
  const order = (M.structure?.lived_contact_order || 0) + 1;
  const occurrence = `fixture:external-lived:${order}:${term}`;
  Mind.C(M, { relations: { facts: [
    [occurrence, 'ρ:kind', 'external_fixture_occurrence'],
    [occurrence, 'ρ:kind', 'lived_occurrence'],
    [occurrence, 'ρ:instantiates', ref(term)],
    [occurrence, 'ρ:lived_order', order],
  ] } });
  return order;
}
function values(subject, relation) {
  return (M.knowledge?.facts || []).filter(f => String(f.subject) === String(subject) && f.relation === relation).map(f => f.object);
}
function evaluations() {
  const facts = M.knowledge?.facts || [];
  const ids = new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === 'temporal_expectation_evaluation')
    .map(f => String(f.subject)));
  return [...ids].map(id => ({
    id,
    result: values(id, 'ρ:evaluation_result')[0],
    successor: values(id, 'ρ:successor_lived_order')[0],
    terms: values(id, 'ρ:instantiates').filter(x => x?.ref !== undefined).map(x => String(x.ref)),
    lived: values(id, 'ρ:kind').includes('lived_occurrence'),
    livedOrders: values(id, 'ρ:lived_order').filter(Number.isFinite),
  }));
}

// Establish one lifecycle evaluation, then require it to have generic occurrence
// anatomy at the order where M formed it.
const a0 = event(A);
const b0 = event(B);
assert(b0 > a0);
let fulfilled = evaluations().filter(e => e.result === 'fulfilled');
assert(fulfilled.length >= 1, 'A->B did not produce a fulfilled lifecycle evaluation');
const first = fulfilled.at(-1);
assert(first.lived, 'internally formed evaluation did not become a generic lived occurrence');
assert(first.livedOrders.includes(b0), 'evaluation occurrence was not placed at its formation/successor lived order');
assert.strictEqual(first.terms.length, 1, 'evaluation does not instantiate one reusable structural term');
const evaluationTerm = first.terms[0];
assert.notStrictEqual(evaluationTerm, first.id, 'evaluation used its unique event id as reusable identity');
assert((M.knowledge?.facts || []).some(f => String(f.subject) === evaluationTerm &&
  f.relation === 'ρ:kind' && f.object === 'relation_term'),
  'evaluation structural identity is not a first-class relation term');

// Repeat the same relational outcome in different lived positions. All fulfilled
// evaluations must reuse the same structurally derived term rather than event IDs.
for (let i = 1; i < REPEATS; i++) {
  event(D);
  event(A);
  event(B);
}
fulfilled = evaluations().filter(e => e.result === 'fulfilled');
assert(fulfilled.length >= REPEATS, 'repeated fulfilled evaluations were not retained');
const reused = new Set(fulfilled.flatMap(e => e.terms));
assert.deepStrictEqual([...reused], [evaluationTerm],
  'equivalent internal evaluations did not converge on one reusable structural term');

// The existing generic ordered recompressor must be able to discover a learned
// relation whose recursively expanded event contains the evaluation term.
const facts = M.knowledge?.facts || [];
const learned = new Map();
for (const fact of facts) {
  const id = String(fact.subject);
  if (!learned.has(id)) learned.set(id, {});
  const x = learned.get(id);
  if (fact.relation === 'ρ:kind' && fact.object === 'learned_ordered_relation') x.kind = true;
  else if (fact.relation === 'ρ:ordered_expansion' && Array.isArray(fact.object)) x.expansion = fact.object;
}
function flatten(id, trail = new Set()) {
  if (trail.has(id)) throw new Error(`cyclic learned relation ${id}`);
  const x = learned.get(id);
  if (!x?.kind || !Array.isArray(x.expansion)) return [];
  const next = new Set(trail); next.add(id);
  const out = [];
  for (const component of x.expansion) {
    if (component?.ref !== undefined) out.push(...flatten(String(component.ref), next));
    else if (Array.isArray(component?.simultaneous_relations))
      out.push(component.simultaneous_relations.map(t => String(t?.ref)).sort());
  }
  return out;
}
const usedByDiscovery = [...learned.entries()].some(([id, x]) => x.kind &&
  flatten(id).some(eventTerms => eventTerms.includes(evaluationTerm)));
assert(usedByDiscovery,
  'internally formed evaluation never became material for generic ordered relation discovery');

// Exact provenance remains beneath the reusable abstraction.
assert(fulfilled.every(e => values(e.id, 'ρ:evaluates_expectation').some(x => x?.ref !== undefined)),
  'evaluation occurrence lost its expectation provenance');
assert(fulfilled.every(e => values(e.id, 'ρ:based_on_occurrences').some(Array.isArray)),
  'evaluation occurrence lost exact successor-occurrence provenance');
for (const forbidden of ['evaluation_sequence_state', 'internal_event_model', 'meta_relation_learner', 'predictor_state'])
  assert.strictEqual(M[forbidden], undefined, `parallel internal-evidence authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  lifecycle_evaluation_became_generic_occurrence: true,
  evaluation_formation_order_preserved: true,
  structurally_equivalent_evaluations_reused_one_term: true,
  internal_evidence_entered_existing_ordered_discovery: true,
  exact_evaluation_provenance_retained: true,
  fabricated_external_contact: false,
  parallel_meta_cognitive_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('INTERNAL EVIDENCE -> GENERIC DISCOVERY MATERIAL: PASS');
