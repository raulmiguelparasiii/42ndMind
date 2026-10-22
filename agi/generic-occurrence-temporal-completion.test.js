'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Frontier falsification:
// Repeated lived occurrence order must become usable for present completion.
// After learning A -> B from exact generic lived occurrences, a new current A
// must support an explicit expectation of B without fabricating B as observed.
// No semantic sequence rule, planner, temporal memory, or test-specific term is
// supplied to C.

const WORD_A = 'vexa_arc_41';
const WORD_B = 'nori_flux_86';
const SURFACE_A = `surface:${WORD_A}`;
const SURFACE_B = `surface:${WORD_B}`;
const CONCERN = 29;
const TRAIN = 40;
const CADENCE = 8;
const LABELS = 3;
const PAIRS = 16;

for (const file of [
  'mind.js',
  'mind-relational.js',
  'surface-relation-grounding.js',
  'generic-lived-occurrences.js',
  'relation-sequence-recompression.js',
]) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes(WORD_A), `${file} contains test-specific A fixture`);
  assert(!source.includes(WORD_B), `${file} contains test-specific B fixture`);
}

let seed = 0x5e71c9ab;
function random() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}
function relationValue(x) { return 1.913 * x + 0.274; }
function frame() {
  const x = random() * 4 - 2;
  return [x, relationValue(x), CONCERN];
}

const M = Mind.one(1, 1);
for (let i = 0; i < TRAIN; i++) Mind.C(M, { frame: frame() });

function continuousRelation() {
  return (M.knowledge?.current?.facts || []).find(fact =>
    fact.subject === 'receptor:p0' && fact.relation === 'ρ:continuous_dependence' &&
    fact.object?.target === 'receptor:p1' && fact.object?.lag === 0 && fact.object?.transform);
}
function relationTermFor(relation) {
  return (M.knowledge?.facts || []).find(fact =>
    fact.relation === 'ρ:relation_object' && fact.object?.target === relation.object.target &&
    fact.object?.lag === relation.object.lag && fact.object?.orientation === relation.object.orientation &&
    fact.object?.transform?.kind === relation.object.transform?.kind)?.subject;
}
assert(continuousRelation(), 'raw relation was not learned before temporal-completion training');

// Ground two opaque expressions to the same already-learned relation from lived
// cross-modal co-occurrence. Their later alternating order is not taught.
let labels = 0;
while (labels < LABELS) {
  const next = (M.contacts?.length || 0) + 1;
  const onCadence = next % CADENCE === 0;
  Mind.C(M, {
    frame: frame(),
    ...(onCadence ? {
      surface: {
        input: `context_${labels} ${WORD_A} bridge_${labels} ${WORD_B} sample_${next}`,
        output: 'noted.',
      },
    } : {}),
  });
  if (onCadence) labels++;
}

const relation = continuousRelation();
const relationTerm = relation && relationTermFor(relation);
assert(relationTerm, 'learned raw relation lacks a first-class term');
const currentFactsAfterGrounding = M.knowledge?.current?.facts || [];
for (const surface of [SURFACE_A, SURFACE_B]) assert(currentFactsAfterGrounding.some(f =>
  f.subject === surface && f.relation === 'ρ:expresses' && f.object?.ref === String(relationTerm)),
  `${surface} did not ground from lived co-occurrence`);

// Surface-only recurrence now supplies the temporal evidence. With no frame there
// is no action occurrence and no new world-relation occurrence, so the sequence
// evidence is exactly the two generic expression terms in alternating order.
for (let i = 0; i < PAIRS; i++) {
  Mind.C(M, { surface: { input: WORD_A } });
  Mind.C(M, { surface: { input: WORD_B } });
}

const factsBeforeProbe = M.knowledge?.facts || [];
const ordered = new Map();
for (const fact of factsBeforeProbe) {
  const id = String(fact.subject);
  if (!ordered.has(id)) ordered.set(id, {});
  const x = ordered.get(id);
  if (fact.relation === 'ρ:kind' && fact.object === 'learned_ordered_relation') x.kind = true;
  else if (fact.relation === 'ρ:ordered_expansion' && Array.isArray(fact.object)) x.expansion = fact.object;
}
function eventRefs(component) {
  return Array.isArray(component?.simultaneous_relations)
    ? component.simultaneous_relations.map(x => String(x?.ref)).sort()
    : null;
}
function flattenOrdered(id, trail = new Set()) {
  if (trail.has(String(id))) throw new Error(`cyclic ordered relation: ${id}`);
  const relationNode = ordered.get(String(id));
  if (!relationNode?.kind || !relationNode.expansion) return [];
  const next = new Set(trail); next.add(String(id));
  const out = [];
  for (const component of relationNode.expansion) {
    if (component && component.ref !== undefined) out.push(...flattenOrdered(String(component.ref), next));
    else {
      const refs = eventRefs(component);
      if (refs) out.push(refs);
    }
  }
  return out;
}
function singleton(event, term) {
  return Array.isArray(event) && event.length === 1 && event[0] === term;
}
const learnedAB = [...ordered.entries()].find(([id, x]) => {
  if (!x.kind || !x.expansion) return false;
  const events = flattenOrdered(id);
  return events.length >= 2 && singleton(events[0], SURFACE_A) && singleton(events[1], SURFACE_B);
});
assert(learnedAB, 'alternating lived expression occurrences did not become a learned A -> B order');

// Present only the prefix. This is the actual completion probe.
Mind.C(M, { surface: { input: WORD_A } });
const currentOrder = M.structure?.lived_contact_order;
assert(Number.isFinite(currentOrder), 'current lived order is unavailable');
const facts = M.knowledge?.facts || [];

const expectationIds = new Set(facts.filter(f =>
  f.relation === 'ρ:kind' && f.object === 'temporal_expectation').map(f => String(f.subject)));
const expectation = [...expectationIds].find(id => {
  const after = facts.some(f => String(f.subject) === id && f.relation === 'ρ:after_lived_order' && f.object === currentOrder);
  const expectsB = facts.some(f => String(f.subject) === id && f.relation === 'ρ:expects_term' && f.object?.ref === SURFACE_B);
  const grounded = facts.some(f => String(f.subject) === id && f.relation === 'ρ:grounded_by_ordered_relation' && f.object?.ref === String(learnedAB[0]));
  return after && expectsB && grounded;
});
assert(expectation,
  'learned past order did not produce an M-owned present expectation for the unseen next term');

// Expectation is not observation. B existed historically, but the probe contact
// contained only A, so no current lived occurrence may instantiate B.
const livedHere = new Set(facts.filter(f =>
  f.relation === 'ρ:lived_order' && f.object === currentOrder).map(f => String(f.subject)));
const fabricatedB = facts.some(f => livedHere.has(String(f.subject)) &&
  f.relation === 'ρ:instantiates' && f.object?.ref === SURFACE_B);
assert.strictEqual(fabricatedB, false, 'temporal completion fabricated the expected term as observed');
assert(facts.some(f => String(f.subject) === String(expectation) &&
  f.relation === 'ρ:based_on_occurrences' && Array.isArray(f.object) && f.object.length > 0),
  'temporal expectation is not provenance-linked to exact lived prefix occurrences');

assert((M.knowledge?.facts || []).some(f => f.relation === 'ρ:input_raw' && String(f.object).includes(WORD_A)),
  'exact surface history was not retained');
for (const forbidden of ['temporal_completion_state', 'sequence_predictor', 'temporal_mind', 'memory_state', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel temporal authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  opaque_terms_grounded_from_lived_contact: true,
  temporal_order_learned_from_generic_occurrences: true,
  partial_present_sequence_completed: true,
  expectation_first_class_in_M: true,
  expectation_linked_to_exact_prefix_evidence: true,
  unseen_next_term_not_fabricated_as_observed: true,
  parallel_temporal_completion_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('GENERIC OCCURRENCE TEMPORAL COMPLETION: PASS');
