'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Generic-occurrence temporal falsification.
//
// One continuing individual learns a raw numerical relation, grounds an opaque
// surface expression to that relation from lived co-occurrence, and has exactly
// one physical motor. The later life repeatedly contains three genuinely
// different occurrence types at the same lived moments:
//   learned relation occurrence + grounded expression occurrence + self action.
// Passing requires those events to share the same generic temporal substrate and
// participate in recursive ordered recompression. No language/action-specific
// sequence learner or semantic rule is supplied by the test.

const WORD = 'kestrel_nova_73';
const CONCERN = 29;
const TRAIN = 40;
const CADENCE = 8;
const LABELS = 3;
const REPEATS = 16;
function f(x) { return 2.137 * x - 0.481; }

for (const file of ['mind.js', 'mind-relational.js', 'one-live-blueprint.js',
  'surface-relation-grounding.js', 'relation-sequence-recompression.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes(WORD), `${file} contains test-specific occurrence fixture`);
}

let seed = 0x71c3a55e;
function random() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}
function frame() {
  const x = random() * 4 - 2;
  return [x, f(x), CONCERN];
}

const M = Mind.one(1, 1); // one actuator => one stable physical action identity
for (let i = 0; i < TRAIN; i++) Mind.C(M, { frame: frame() });

function continuousRelation() {
  return (M.knowledge?.current?.facts || []).find(fact =>
    fact.subject === 'receptor:p0' && fact.relation === 'ρ:continuous_dependence' &&
    fact.object?.target === 'receptor:p1' && fact.object?.lag === 0 && fact.object?.transform);
}
function relationTermFor(relation) {
  const stable = value => JSON.stringify(value, Object.keys(value || {}).sort());
  return (M.knowledge?.facts || []).find(fact =>
    fact.relation === 'ρ:relation_object' &&
    JSON.stringify(fact.object) === JSON.stringify(relation.object))?.subject;
}

assert(continuousRelation(), 'raw continuous relation was not learned before occurrence unification');

// Ground the word only on evidence cadences where the learned relation has a
// fresh first-class occurrence. Context changes prevent a fixed surrounding
// sentence from being the grounding authority.
let labels = 0;
while (labels < LABELS) {
  const next = (M.contacts?.length || 0) + 1;
  const onCadence = next % CADENCE === 0;
  Mind.C(M, {
    frame: frame(),
    ...(onCadence ? { surface: { input: `context_${labels} ${WORD} sample_${next}`, output: 'noted.' } } : {}),
  });
  if (onCadence) labels++;
}

const relation = continuousRelation();
assert(relation, 'raw relation disappeared during grounding');
const relationTerm = relationTermFor(relation);
assert(relationTerm, 'raw relation lacks a first-class relation term');
assert((M.knowledge?.current?.facts || []).some(f =>
  f.subject === `surface:${WORD}` && f.relation === 'ρ:expresses' && f.object?.ref === String(relationTerm)),
  'surface expression did not ground to the learned raw relation');

// Continue one uninterrupted life. Put the grounded expression only on relation
// evidence cadences. The single motor acts throughout. Thus each selected cadence
// physically contains relation + expression + action, while intervening actions
// provide non-selected temporal context rather than a manufactured event table.
let repeats = 0;
while (repeats < REPEATS) {
  const next = (M.contacts?.length || 0) + 1;
  const onCadence = next % CADENCE === 0;
  Mind.C(M, {
    frame: frame(),
    ...(onCadence ? { surface: { input: WORD } } : {}),
  });
  if (onCadence) repeats++;
}

const facts = M.knowledge?.facts || [];
function subjectsOfKind(kind) {
  return new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === kind).map(f => String(f.subject)));
}
function instantiation(occurrence) {
  return facts.find(f => String(f.subject) === String(occurrence) && f.relation === 'ρ:instantiates' && f.object?.ref !== undefined)?.object?.ref;
}
function orderOf(occurrence) {
  return facts.find(f => String(f.subject) === String(occurrence) && f.relation === 'ρ:order' && Number.isFinite(f.object))?.object;
}

const relationOccurrences = subjectsOfKind('relation_occurrence');
const expressionOccurrences = subjectsOfKind('surface_expression_occurrence');
const actionOccurrences = subjectsOfKind('action_occurrence');
assert(relationOccurrences.size, 'learned relation produced no first-class occurrences');
assert(expressionOccurrences.size, 'grounded expression produced no first-class occurrences');
assert(actionOccurrences.size, 'self action produced no first-class action occurrences');

const actionTerms = subjectsOfKind('action_term');
assert(actionTerms.size === 1, 'single physical motor did not have one first-class action term');
const actionTerm = [...actionTerms][0];
const surfaceTerm = `surface:${WORD}`;
assert(facts.some(f => f.subject === surfaceTerm && f.relation === 'ρ:kind' && f.object === 'expression_term'),
  'grounded surface expression lacks a first-class expression term');

// Every occurrence type must expose the same minimal generic anatomy needed by
// temporal cognition: identity of what occurred + one lived order coordinate.
for (const [kind, set] of [
  ['relation', relationOccurrences],
  ['expression', expressionOccurrences],
  ['action', actionOccurrences],
]) {
  for (const occurrence of set) {
    assert(instantiation(occurrence) !== undefined, `${kind} occurrence lacks generic instantiation`);
    assert(Number.isFinite(orderOf(occurrence)), `${kind} occurrence lacks generic lived order`);
  }
}

const mixedOrders = new Set();
for (const r of relationOccurrences) {
  if (String(instantiation(r)) !== String(relationTerm)) continue;
  const order = orderOf(r);
  const hasSurface = [...expressionOccurrences].some(o => orderOf(o) === order && String(instantiation(o)) === surfaceTerm);
  const hasAction = [...actionOccurrences].some(o => orderOf(o) === order && String(instantiation(o)) === actionTerm);
  if (hasSurface && hasAction) mixedOrders.add(order);
}
assert(mixedOrders.size >= REPEATS,
  'relation, grounded expression, and self action did not inhabit the same lived order axis');

const ordered = new Map();
for (const fact of facts) {
  if (!ordered.has(String(fact.subject))) ordered.set(String(fact.subject), {});
  const x = ordered.get(String(fact.subject));
  if (fact.relation === 'ρ:kind' && fact.object === 'learned_ordered_relation') x.kind = true;
  else if (fact.relation === 'ρ:ordered_expansion' && Array.isArray(fact.object)) x.expansion = fact.object;
  else if (fact.relation === 'ρ:depth' && Number.isFinite(fact.object)) x.depth = fact.object;
}
const learned = [...ordered.entries()].filter(([, x]) => x.kind && x.expansion).map(([id, x]) => ({ id, ...x }));
assert(learned.length, 'generic occurrence stream produced no learned ordered relation');
assert(Math.max(...learned.map(x => x.depth || 0)) >= 2,
  'cross-modal occurrence stream did not recursively reuse a learned ordered relation');

function expansionContainsAll(expansion) {
  for (const component of expansion || []) {
    const simultaneous = component?.simultaneous_relations;
    if (!Array.isArray(simultaneous)) continue;
    const refs = new Set(simultaneous.map(x => String(x?.ref)));
    if (refs.has(String(relationTerm)) && refs.has(surfaceTerm) && refs.has(actionTerm)) return true;
  }
  return false;
}
assert(learned.some(x => expansionContainsAll(x.expansion)),
  'no ordered relation contains learned relation + grounded expression + self action as one lived event');

// Exact histories remain separately available beneath the cross-modal relation.
assert((M.contacts || []).length >= TRAIN + LABELS * CADENCE + REPEATS * CADENCE,
  'exact numeric contact history was not retained');
assert(facts.some(f => f.relation === 'ρ:input_raw' && String(f.object).includes(WORD)),
  'exact surface history was not retained');
assert((M.experiences || []).length > 0, 'exact embodied action/consequence history was not retained');

for (const forbidden of ['temporal_language_state', 'action_sequence_model', 'crossmodal_controller', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  relation_expression_action_share_generic_occurrence_anatomy: true,
  same_lived_order_axis: true,
  recursive_crossmodal_temporal_relation: true,
  exact_numeric_surface_action_history_retained: true,
  parallel_crossmodal_temporal_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('GENERIC OCCURRENCE TEMPORAL UNIFICATION: PASS');
