'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Stabilization gate for the foundational contact-before-meaning invariant.
// Exact R must enter M before interpretation. If no more specific occurrence is
// formed, the raw contact must itself remain generic lived material. If a more
// specific occurrence exists, the raw provenance wrapper must not become a second
// simultaneous semantic term and perturb already learned temporal relations.

for (const file of ['mind.js', 'generic-lived-occurrences.js', 'relation-sequence-recompression.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes('fixture:contact-before-meaning:'), `${file} contains stabilization fixture`);
}

function ref(id) { return { ref: String(id) }; }
function facts(M) { return M.knowledge?.facts || []; }
function subjectsOfKind(M, kind) {
  return new Set(facts(M).filter(f => f.relation === 'ρ:kind' && f.object === kind).map(f => String(f.subject)));
}
function values(M, subject, relation) {
  return facts(M).filter(f => String(f.subject) === String(subject) && f.relation === relation).map(f => f.object);
}
function livedAt(M, order) {
  const lived = subjectsOfKind(M, 'lived_occurrence');
  return [...lived].filter(id => values(M, id, 'ρ:lived_order').includes(order));
}

// Opaque but VALID contact: a contacted relational rule whose premise has never
// occurred. Canonical C accepts the rule as R, but no more-specific lived
// occurrence represents this contact yet. Exact contact must therefore survive
// beneath a generic raw occurrence without inventing meaning for the rule.
{
  const M = Mind.one(1, 1);
  const unknown = { relations: { rules: [{
    id: 'fixture:contact-before-meaning:opaque-rule',
    premises: [[
      { var: 'x' },
      'fixture:contact-before-meaning:opaque-predicate',
      'fixture:contact-before-meaning:opaque-value',
    ]],
    conclusion: [
      { var: 'x' },
      'fixture:contact-before-meaning:opaque-conclusion',
      true,
    ],
    provenance: { kind: 'unfamiliar_contact' },
  }] } };
  Mind.C(M, unknown);

  const rawTerms = [...subjectsOfKind(M, 'reality_contact_term')];
  assert.strictEqual(rawTerms.length, 1, 'opaque valid contact did not create one raw contact term');
  assert(values(M, rawTerms[0], 'ρ:contact_content').some(x => JSON.stringify(x) === JSON.stringify(unknown)),
    'exact opaque contact was not retained before/under later interpretation');

  const rawOccurrences = [...subjectsOfKind(M, 'reality_contact_occurrence')];
  assert.strictEqual(rawOccurrences.length, 1, 'opaque valid contact did not create one raw occurrence');
  assert(subjectsOfKind(M, 'lived_occurrence').has(rawOccurrences[0]),
    'uninterpreted valid contact was not promoted to generic lived material');
  assert.strictEqual(livedAt(M, 1).length, 1,
    'uninterpreted valid contact created duplicate generic events at one lived order');
}

// Repeated ordinary valid contact must reuse one content-addressed raw term while
// retaining distinct lived instances. This is separate from rule-contact fallback
// because canonical M deliberately rejects re-ingestion of the same rule ID.
{
  const M = Mind.one(1, 1);
  const repeated = { surface: { input: 'vexa nori', output: 'ack.' } };
  Mind.C(M, repeated);
  Mind.C(M, repeated);

  const rawTerms = [...subjectsOfKind(M, 'reality_contact_term')];
  assert.strictEqual(rawTerms.length, 1,
    'identical valid contacts did not reuse one content-addressed raw term');
  assert(values(M, rawTerms[0], 'ρ:contact_content').some(x => JSON.stringify(x) === JSON.stringify(repeated)),
    'repeated valid contact lost exact raw content');
  assert.strictEqual([...subjectsOfKind(M, 'reality_contact_occurrence')].length, 2,
    'repeated valid contact did not retain two distinct lived instances');
}

// Specific occurrence: preserve raw contact/provenance, but do not let its wrapper
// alter the semantic event used by the already existing generic temporal learner.
{
  const M = Mind.one(1, 1);
  const A = 'fixture:contact-before-meaning:A';
  const B = 'fixture:contact-before-meaning:B';
  const R = 'fixture:contact-before-meaning:R';

  Mind.C(M, { relations: { facts: [
    [R, 'ρ:kind', 'learned_ordered_relation'],
    [R, 'ρ:ordered_expansion', [
      { simultaneous_relations: [ref(A)] },
      { simultaneous_relations: [ref(B)] },
    ]],
    [R, 'ρ:depth', 1],
    [R, 'ρ:ordered_evidence_route', { kind: 'full' }],
    [R, 'ρ:authority', 'M_retained_lived_occurrences'],
  ] } });

  function event(term) {
    const order = (M.structure?.lived_contact_order || 0) + 1;
    const occurrence = `fixture:external:${order}:${term}`;
    Mind.C(M, { relations: { facts: [
      [occurrence, 'ρ:kind', 'external_fixture_occurrence'],
      [occurrence, 'ρ:kind', 'lived_occurrence'],
      [occurrence, 'ρ:instantiates', ref(term)],
      [occurrence, 'ρ:lived_order', order],
    ] } });
    return { order, occurrence };
  }

  const a = event(A);
  const atA = livedAt(M, a.order);
  assert(atA.includes(a.occurrence), 'specific A occurrence was not retained as lived material');
  const rawAtA = [...subjectsOfKind(M, 'reality_contact_occurrence')]
    .filter(id => values(M, id, 'ρ:lived_order').includes(a.order));
  assert.strictEqual(rawAtA.length, 1, 'A contact lost its raw provenance occurrence');
  assert(!subjectsOfKind(M, 'lived_occurrence').has(rawAtA[0]),
    'raw contact wrapper duplicated a more specific lived occurrence');
  assert.deepStrictEqual(atA, [a.occurrence],
    'specific A event was polluted by a second generic wrapper term');

  const b = event(B);
  const evaluationIds = [...subjectsOfKind(M, 'temporal_expectation_evaluation')];
  const fulfilled = evaluationIds.filter(id => values(M, id, 'ρ:evaluation_result').includes('fulfilled'));
  assert(fulfilled.length >= 1,
    'raw contact provenance interfered with an existing A->B temporal relation');
  assert(fulfilled.some(id => values(M, id, 'ρ:successor_lived_order').includes(b.order)),
    'A->B fulfillment was not evaluated at the specific B lived order');
}

console.log(JSON.stringify({
  exact_contact_precedes_interpretation: true,
  uninterpreted_valid_contact_remains_generic_lived_material: true,
  repeated_valid_contact_reuses_raw_term: true,
  raw_provenance_is_retained_when_specific_occurrence_exists: true,
  raw_wrapper_does_not_duplicate_specific_semantic_event: true,
  existing_temporal_relation_survives_contact_before_meaning: true,
  modality_specific_semantic_gate_added: false,
  parallel_memory_authority_added: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('CONTACT BEFORE MEANING STABILIZATION: PASS');
