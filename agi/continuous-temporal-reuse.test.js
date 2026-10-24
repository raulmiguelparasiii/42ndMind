'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

// Falsification target:
// Raw numerical contact must first become ordinary first-class relations in M.
// Repeated observations of a multi-relation event must then become input to the
// already-existing generic ordered-recompression law. The learned ordered relation
// must itself be first-class M content, and recursive recompression must be able
// to make a later learned relation whose component is an earlier learned relation.
//
// No surface language, semantic relation labels, episode labels, or modality
// knowledge are supplied. Correction and high-dimensional scaling have separate
// gates; this world contains only what is necessary to falsify recursive reuse.

let seed = 0x42c0ffee;
function rnd() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}

const CHANNELS = 4;
const CONCERN = 29;
// Detector cadence is 8. From contact 24 through 144 there are sixteen evidence
// cadences. Sixteen repeated multi-relation events are enough for the existing
// MDL compressor to learn a depth-1 pair and then a depth-2 pair of learned pairs.
const TOTAL = 144;

function rawFrame() {
  const x = Array.from({ length: CHANNELS }, () => rnd() * 2 - 1 + rnd() * 1e-10);
  // Two independent raw sources produce two unrelated same-time dependencies.
  x[1] = 2.375 * x[0] - 0.417;
  x[3] = -3.125 * x[2] + 0.731;
  return [...x, CONCERN];
}

const M = Mind.one(2, 1);
for (let t = 0; t < TOTAL; t++) Mind.C(M, { frame: rawFrame() });

assert.strictEqual(M.whole, 1);
assert.strictEqual(Object.keys(Mind).sort().join(','), 'C,one');
assert.strictEqual(M.contacts.length, TOTAL, 'raw continuous history was not retained exactly');

const allFacts = M.knowledge?.facts || [];
const relationTerms = allFacts
  .filter(f => f.relation === 'ρ:kind' && f.object === 'relation_term')
  .map(f => f.subject);
assert(relationTerms.length >= 2,
  'continuous relations never became first-class relation terms in M');

const occurrences = new Map();
for (const f of allFacts) {
  if (!occurrences.has(f.subject)) occurrences.set(f.subject, {});
  const o = occurrences.get(f.subject);
  if (f.relation === 'ρ:kind' && f.object === 'relation_occurrence') o.kind = true;
  else if (f.relation === 'ρ:instantiates' && f.object && f.object.ref) o.term = f.object.ref;
  else if (f.relation === 'ρ:order' && Number.isFinite(f.object)) o.order = f.object;
}
const orderedOccurrences = [...occurrences.entries()]
  .filter(([, o]) => o.kind && o.term && Number.isFinite(o.order))
  .sort((a, b) => a[1].order - b[1].order || String(a[0]).localeCompare(String(b[0])));
assert(orderedOccurrences.length >= 32,
  'fresh reality-derived relation observations were not retained as ordered occurrences');
assert(new Set(orderedOccurrences.map(([, o]) => o.term)).size >= 2,
  'ordered occurrences did not preserve distinct first-order relation identities');

const higher = new Map();
for (const f of allFacts) {
  if (!higher.has(f.subject)) higher.set(f.subject, {});
  const h = higher.get(f.subject);
  if (f.relation === 'ρ:kind' && f.object === 'learned_ordered_relation') h.kind = true;
  else if (f.relation === 'ρ:ordered_expansion' && Array.isArray(f.object)) h.expansion = f.object;
  else if (f.relation === 'ρ:depth' && Number.isFinite(f.object)) h.depth = f.object;
  else if (f.relation === 'ρ:occurrences_at_birth' && Number.isFinite(f.object)) h.support = f.object;
}
const learned = [...higher.entries()].filter(([, h]) => h.kind && h.expansion && h.depth >= 1);
assert(learned.length > 0,
  'repeated first-order continuous relations did not become a learned ordered relation in M');

const firstOrderSet = new Set(relationTerms.map(String));
function refs(value, out = []) {
  if (Array.isArray(value)) for (const v of value) refs(v, out);
  else if (value && typeof value === 'object') {
    if (value.ref !== undefined) out.push(String(value.ref));
    for (const [k, v] of Object.entries(value)) if (k !== 'ref') refs(v, out);
  }
  return out;
}
assert(learned.some(([, h]) => new Set(refs(h.expansion).filter(id => firstOrderSet.has(id))).size >= 2),
  'higher ordered relation did not actually combine multiple first-order learned relations');

const learnedIds = new Set(learned.map(([id]) => String(id)));
assert(learned.some(([, h]) => h.depth >= 2 && refs(h.expansion).some(id => learnedIds.has(id))),
  'recursive recompression did not form a relation whose component is another learned relation');

// The hierarchy must not replace its grounding.
assert(M.contacts[15][0] !== M.contacts[16][0], 'raw source accidentally repeated');
assert.strictEqual(M.contacts[15].length, CHANNELS + 1);
for (const forbidden of ['audio_state', 'vision_state', 'temporal_mind', 'memory_state', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  exact_raw_contact_retained: true,
  first_class_continuous_relation_terms: relationTerms.length,
  ordered_relation_occurrences: orderedOccurrences.length,
  learned_ordered_relations: learned.length,
  maximum_recursive_depth: Math.max(...learned.map(([, h]) => h.depth)),
  multi_relation_event_became_higher_relation: true,
  learned_relation_used_inside_learned_relation: true,
  modality_specific_temporal_authority: false,
}, null, 2));
console.log('CONTINUOUS RELATION -> HIGHER TEMPORAL RELATION: PASS');
