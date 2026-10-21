'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

// Falsification target:
// Raw numerical contact must first become ordinary first-class relations in M.
// Repeated changes among those relations must then become input to the already
// existing generic ordered-recompression law. A learned ordered relation must
// itself be a first-class M term, and recursive recompression must be able to
// build a learned relation whose component is another learned relation.
//
// No surface language, semantic relation labels, episode labels, or modality
// knowledge are supplied to the individual.

let seed = 0x42c0ffee;
function rnd() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}

const CHANNELS = 8;
const CONCERN = 29;
// One complete detector window per regime is sufficient. Nine A/B cycles leave
// 18 possible relation activations while the target still requires >=16 and
// recursive compression depth >=2.
const PHASE = 64;
const CYCLES = 9;
const TOTAL = PHASE * CYCLES * 2;

function rawFrame(t) {
  const phase = Math.floor(t / PHASE) % 2;
  const x = Array.from({ length: CHANNELS }, () => rnd() * 2 - 1 + rnd() * 1e-10);
  // p0 is the changing raw source. In alternating phases, exactly one different
  // receptor becomes a strong same-time affine consequence of that source.
  if (phase === 0) x[1] = 2.375 * x[0] - 0.417;
  else x[2] = -3.125 * x[0] + 0.731;
  return [...x, CONCERN];
}

const M = Mind.one(2, 1);
for (let t = 0; t < TOTAL; t++) Mind.C(M, { frame: rawFrame(t) });

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
assert(orderedOccurrences.length >= 16,
  'repeated reality-derived relation activations were not retained as ordered relation occurrences');
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
assert(learned.some(([, h]) => refs(h.expansion).some(id => firstOrderSet.has(id))),
  'higher ordered relation does not actually reference first-order learned relations');

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
  learned_relation_used_inside_learned_relation: true,
  modality_specific_temporal_authority: false,
}, null, 2));
console.log('CONTINUOUS RELATION -> HIGHER TEMPORAL RELATION: PASS');
