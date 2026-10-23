'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Frontier falsification: local schemas are already learned/transferred. This test
// requires those learned schemas to become grounded structural material for a
// higher relation whose raw composed world exceeds the fixed 8-edge local budget.
const A = ['ρ:rc_a1_7x', 'ρ:rc_a2_4m', 'ρ:rc_a3_9q', 'ρ:rc_a4_2v'];
const B = ['ρ:rc_b1_6p', 'ρ:rc_b2_3k', 'ρ:rc_b3_8n', 'ρ:rc_b4_5t'];
const Z = 'ρ:rc_cross_1h';

for (const file of ['mind.js', 'structural-relational-abstraction.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const token of [...A, ...B, Z]) assert(!source.includes(token), `${file} contains recursive-composition fixture knowledge: ${token}`);
}

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function refId(x) { return x && typeof x === 'object' && x.ref !== undefined ? String(x.ref) : null; }
function facts(M) { return M.knowledge?.facts || []; }
function values(M, subject, relation) {
  return facts(M).filter(f => String(f.subject) === String(subject) && f.relation === relation).map(f => f.object);
}
function hasTriple(M, triple) {
  return facts(M).some(f => same(f.subject, triple[0]) && f.relation === triple[1] && same(f.object, triple[2]));
}
function motifA(a, b, c) {
  return [[a, A[0], b], [b, A[1], c], [a, A[2], c], [c, A[3], b]];
}
function motifB(c, d, e) {
  return [[c, B[0], d], [d, B[1], e], [c, B[2], e], [e, B[3], d]];
}
function composed(a, b, c, d, e, includeCross = true) {
  return [...motifA(a, b, c), ...motifB(c, d, e), ...(includeCross ? [[a, Z, e]] : [])];
}
function schemaIds(M) {
  return [...new Set(facts(M).filter(f => f.relation === 'ρ:kind' && f.object === 'structural_relation_schema_candidate').map(f => String(f.subject)))];
}
function schemaLabels(M, id) {
  const edges = values(M, id, 'ρ:schema_edges').find(Array.isArray) || [];
  return new Set(edges.map(edge => {
    try { return JSON.parse(edge[0])?.relation; } catch { return null; }
  }).filter(Boolean));
}
function exactLabelSchema(M, labels) {
  const wanted = [...labels].sort();
  return schemaIds(M).find(id => {
    const got = [...schemaLabels(M, id)].sort();
    return got.length === wanted.length && got.every((x, i) => x === wanted[i]);
  });
}
function schemaDepth(M, id) {
  return values(M, id, 'ρ:schema_depth').find(Number.isFinite) || 1;
}
function proposalsFor(M, target) {
  return facts(M).filter(f => f.relation === 'ρ:proposes_relation' && f.object &&
    same(f.object.subject, target[0]) && f.object.relation === target[1] && same(f.object.object, target[2]))
    .map(f => String(f.subject));
}

const M = Mind.one(1, 1);

// Learn each local schema independently before any composed world exists.
for (const x of [
  ['a1:s', 'a1:m', 'a1:t'], ['a2:s', 'a2:m', 'a2:t'], ['a3:s', 'a3:m', 'a3:t'],
]) Mind.C(M, { relations: { facts: motifA(...x) } });
for (const x of [
  ['b1:s', 'b1:m', 'b1:t'], ['b2:s', 'b2:m', 'b2:t'], ['b3:s', 'b3:m', 'b3:t'],
]) Mind.C(M, { relations: { facts: motifB(...x) } });

const schemaA = exactLabelSchema(M, new Set(A));
const schemaB = exactLabelSchema(M, new Set(B));
assert(schemaA && schemaB, 'independent lower structural schemas were not learned before composition');
assert.notStrictEqual(schemaA, schemaB, 'distinct lower structures collapsed to one schema');

// Repeated endpoint-renamed compositions are 9 raw edges: larger than one local
// structural search view. The same two learned local schemas participate each time.
for (const x of [
  ['c1:a', 'c1:b', 'c1:j', 'c1:d', 'c1:e'],
  ['c2:a', 'c2:b', 'c2:j', 'c2:d', 'c2:e'],
  ['c3:a', 'c3:b', 'c3:j', 'c3:d', 'c3:e'],
]) {
  const world = composed(...x, true);
  assert(world.length > 8, 'composition fixture must exceed the local edge budget');
  Mind.C(M, { relations: { facts: world } });
}

// First decisive requirement: a learned schema must become a grounded instance in
// the composed world. Without this, recursive structural composition cannot begin.
const instanceIds = [...new Set(facts(M).filter(f => f.relation === 'ρ:kind' && f.object === 'structural_schema_instance').map(f => String(f.subject)))];
const instancesOfA = instanceIds.filter(id => values(M, id, 'ρ:instantiates_schema').some(x => refId(x) === schemaA));
const instancesOfB = instanceIds.filter(id => values(M, id, 'ρ:instantiates_schema').some(x => refId(x) === schemaB));
assert(instancesOfA.length >= 3 && instancesOfB.length >= 3,
  'learned local schemas did not become first-class grounded instances across renamed compositions');
assert([...instancesOfA, ...instancesOfB].every(id => values(M, id, 'ρ:based_on_contact').some(x => refId(x)?.startsWith('lived-contact:'))),
  'schema instance lost exact contact provenance');

// Repeated independent compositions must support at least one depth-2 schema that
// explicitly depends on both lower schemas, not merely another <=8-edge raw motif.
const higher = schemaIds(M).filter(id => schemaDepth(M, id) >= 2 &&
  values(M, id, 'ρ:composed_from_schema').some(x => refId(x) === schemaA) &&
  values(M, id, 'ρ:composed_from_schema').some(x => refId(x) === schemaB));
assert(higher.length >= 1, 'repeated local-schema compositions produced no first-class higher structural schema');

// Held-out composition: both complete local schemas are present, but the cross
// relation is absent. A successful proposal must include a depth-2 grounding route.
const held = ['held:a', 'held:b', 'held:j', 'held:d', 'held:e'];
const cue = composed(...held, false);
const target = [held[0], Z, held[4]];
assert(cue.length > 8, 'held-out composed cue must exceed one local search budget');
Mind.C(M, { relations: { facts: cue } });
const targetProposals = proposalsFor(M, target);
assert(targetProposals.length >= 1, 'held-out cross relation was not proposed from the learned composition');
const depth2Grounding = targetProposals.some(id => values(M, id, 'ρ:grounded_by_schema')
  .map(refId).filter(Boolean).some(schema => schemaDepth(M, schema) >= 2));
assert(depth2Grounding, 'held-out completion had no recursively composed schema grounding route');
assert(!hasTriple(M, target), 'recursive structural completion fabricated the unobserved cross relation as fact');
for (const triple of cue) assert(hasTriple(M, triple), 'held-out raw composition contact was altered or discarded');

for (const forbidden of ['schema_composition_state', 'macro_graph_model', 'recursive_schema_truth', 'composition_planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel recursive structural authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  lower_schemas_learned_independently: true,
  composed_raw_edges: 9,
  first_class_schema_instances: true,
  independent_composition_bindings: 3,
  higher_schema_depth_at_least_2: true,
  held_out_cue_exceeds_local_budget: true,
  held_out_cross_relation_proposed: true,
  depth2_grounding_route: true,
  fabricated_observation: false,
  exact_contact_retained: true,
  parallel_composition_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('RECURSIVE STRUCTURAL COMPOSITION FALSIFICATION: PASS');
