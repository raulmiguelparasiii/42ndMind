'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');
const RNF = require('../relational-normal-form.js');

// Opaque physical-layout relation supplied by S as ordinary relational contact.
// C must not know what this predicate "means". The test asks only whether an
// externally contacted relation and an independently discovered numeric relation
// can enter the same generic occurrence/recompression substrate.
const TOPO = 'ρ:τ_7k3m9q';
const FIXTURE = 'τ_7k3m9q';
for (const file of [
  'mind.js', 'generic-lived-occurrences.js', 'continuous-relational-contact.js',
  'relation-sequence-recompression.js',
]) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes(FIXTURE), `${file} contains topology fixture knowledge`);
}

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function fact(M, subject, relation, predicate = () => true) {
  return (M.knowledge?.facts || []).find(f => String(f.subject) === String(subject) && f.relation === relation && predicate(f.object));
}
function termsForPredicate(M, predicate) {
  return new Set((M.knowledge?.facts || [])
    .filter(f => f.relation === 'ρ:relation_predicate' && f.object === predicate)
    .map(f => String(f.subject)));
}
function termDescriptor(M, term) {
  const facts = M.knowledge?.facts || [];
  return {
    subject: facts.find(f => String(f.subject) === String(term) && f.relation === 'ρ:relation_subject')?.object,
    predicate: facts.find(f => String(f.subject) === String(term) && f.relation === 'ρ:relation_predicate')?.object,
    object: facts.find(f => String(f.subject) === String(term) && f.relation === 'ρ:relation_object')?.object,
  };
}
function livedOccurrencesForTerm(M, term) {
  const facts = M.knowledge?.facts || [];
  const occurrences = new Set(facts
    .filter(f => f.relation === 'ρ:instantiates' && f.object?.ref === String(term))
    .map(f => String(f.subject)));
  return [...occurrences].filter(id =>
    fact(M, id, 'ρ:kind', x => x === 'lived_occurrence') &&
    fact(M, id, 'ρ:lived_order', Number.isFinite));
}

// Same underlying physical stream for every developed life. Exact source values
// do not repeat, so discovered numeric relations cannot be equality memorization.
let seed = 0x34ac91ef;
function rnd() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}
const STEPS = 88; // eight post-min-support continuous evidence cadences
const latent = Array.from({ length: STEPS }, () => rnd() * 2 - 1 + rnd() * 1e-9);
const noise = Array.from({ length: STEPS }, () => [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);

function physicalFrame(t) {
  const a = latent[t];
  const b = t >= 1 ? 2.25 * latent[t - 1] + 0.375 : noise[t][1];
  const c = t >= 2 ? -1.6 * (2.25 * latent[t - 2] + 0.375) + 0.21 : noise[t][2];
  return [a, b, c];
}
function receptor(channel) { return `receptor:p${channel}`; }
function topologyFacts(channelOfPhysical, physicalEdges) {
  return physicalEdges.map(([from, to]) => [
    receptor(channelOfPhysical[from]), TOPO, { ref: receptor(channelOfPhysical[to]) },
  ]);
}

function runLife(channelOfPhysical, physicalEdges) {
  const M = Mind.one(1, 1);
  const topology = topologyFacts(channelOfPhysical, physicalEdges);
  for (let t = 0; t < STEPS; t++) {
    const physical = physicalFrame(t);
    const channels = Array(3);
    for (let p = 0; p < 3; p++) channels[channelOfPhysical[p]] = physical[p];
    Mind.C(M, { frame: [...channels, 30], relations: { facts: topology } });
  }
  return { M, topologyFacts: topology };
}
function oneTopologyContact(channelOfPhysical, physicalEdges) {
  const M = Mind.one(1, 1);
  const topology = topologyFacts(channelOfPhysical, physicalEdges);
  const physical = physicalFrame(0);
  const channels = Array(3);
  for (let p = 0; p < 3; p++) channels[channelOfPhysical[p]] = physical[p];
  Mind.C(M, { frame: [...channels, 30], relations: { facts: topology } });
  return { M, topologyFacts: topology };
}

function assertTopologyBecameGeneric(M, topology, minimumOccurrences) {
  const terms = termsForPredicate(M, TOPO);
  assert.strictEqual(terms.size, topology.length,
    'structured topology contact did not become reusable first-class relation terms');

  for (const triple of topology) {
    const matching = [...terms].filter(term => {
      const d = termDescriptor(M, term);
      return same(d.subject, triple[0]) && d.predicate === triple[1] && same(d.object, triple[2]);
    });
    assert.strictEqual(matching.length, 1, 'topology relation term lost exact contacted endpoints');
    assert(livedOccurrencesForTerm(M, matching[0]).length >= minimumOccurrences,
      'structured topology contact did not become generic lived occurrences');
  }
  return terms;
}

function learnedIndex(M) {
  const out = new Map();
  for (const f of M.knowledge?.facts || []) {
    const id = String(f.subject);
    if (!out.has(id)) out.set(id, {});
    const x = out.get(id);
    if (f.relation === 'ρ:kind' && f.object === 'learned_ordered_relation') x.kind = true;
    else if (f.relation === 'ρ:ordered_expansion' && Array.isArray(f.object)) x.expansion = f.object;
  }
  return out;
}
function flattenRelation(id, index, trail = new Set()) {
  if (trail.has(id)) throw new Error(`cyclic learned relation ${id}`);
  const node = index.get(id);
  if (!node?.kind || !Array.isArray(node.expansion)) return [];
  const next = new Set(trail); next.add(id);
  const events = [];
  for (const component of node.expansion) {
    if (component?.ref !== undefined) {
      events.push(...flattenRelation(String(component.ref), index, next));
      continue;
    }
    if (Array.isArray(component?.simultaneous_relations))
      events.push(component.simultaneous_relations.map(x => String(x.ref)).sort());
  }
  return events;
}
function mixedHigherRelation(M, topologyTerms) {
  const continuousTerms = termsForPredicate(M, 'ρ:continuous_dependence');
  assert(continuousTerms.size >= 2, 'raw numeric dynamics did not form the already-supported continuous relations');
  const index = learnedIndex(M);
  for (const [id, node] of index) {
    if (!node.kind) continue;
    const events = flattenRelation(id, index);
    if (events.some(event =>
      event.some(term => topologyTerms.has(term)) && event.some(term => continuousTerms.has(term)))) return id;
  }
  return null;
}

function topologyGraphSignature(topology) {
  return RNF.canonicalGraph({ edges: topology.map(([from, predicate, to]) => [predicate, from, to.ref]) }).signature;
}
function combinedGraphSignature(M, topology) {
  const edges = topology.map(([from, predicate, to]) => [predicate, from, to.ref]);
  for (const f of M.knowledge?.current?.facts || []) {
    if (f.relation !== 'ρ:continuous_dependence' || !f.object?.target) continue;
    edges.push([`κ:${f.object.lag}:${f.object.orientation}`, String(f.subject), String(f.object.target)]);
  }
  return RNF.canonicalGraph({ edges }).signature;
}

// A: physical chain A->B->C on channels 0,1,2.
const A = runLife([0, 1, 2], [[0, 1], [1, 2]]);
assert.strictEqual(new Set(A.M.contacts.slice(8).map(x => x[0])).size, A.M.contacts.length - 8,
  'continuous source accidentally repeated exact values');
const topologyA = assertTopologyBecameGeneric(A.M, A.topologyFacts, 8);
assert(mixedHigherRelation(A.M, topologyA),
  'topology contact and learned raw dynamics never became one reusable higher relation');

// B: same physical chain, arbitrary channel renaming/permutation.
const B = runLife([2, 0, 1], [[0, 1], [1, 2]]);
const topologyB = assertTopologyBecameGeneric(B.M, B.topologyFacts, 8);
assert(mixedHigherRelation(B.M, topologyB),
  'renamed topology failed to enter the same generic higher-relation path');
assert.strictEqual(topologyGraphSignature(A.topologyFacts), topologyGraphSignature(B.topologyFacts),
  'channel renaming changed contacted topology structure');
assert.strictEqual(combinedGraphSignature(A.M, A.topologyFacts), combinedGraphSignature(B.M, B.topologyFacts),
  'channel renaming changed the learned/contacted relational structure');

// C: one contact with the same numeric layout as A but a genuinely different
// topology. No long third developmental replay is needed to test distinguishability.
const C = oneTopologyContact([0, 1, 2], [[0, 1], [0, 2]]);
assertTopologyBecameGeneric(C.M, C.topologyFacts, 1);
assert.notStrictEqual(topologyGraphSignature(A.topologyFacts), topologyGraphSignature(C.topologyFacts),
  'different contacted topology collapsed merely because flattened numeric layout matched');

for (const M of [A.M, B.M, C.M]) {
  assert.strictEqual(M.whole, 1);
  for (const forbidden of ['vision_state', 'spatial_model', 'topology_state', 'sensor_model', 'planner', 'truth_ledger'])
    assert.strictEqual(M[forbidden], undefined, `parallel/domain authority appeared: ${forbidden}`);
}

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  opaque_topology_contact: true,
  structured_contact_became_generic_occurrence: true,
  raw_numeric_relations_discovered_independently: true,
  topology_and_dynamics_became_higher_relation: true,
  channel_renaming_invariant: true,
  different_topology_remained_distinguishable: true,
  exact_numeric_and_relational_contact_retained: true,
  spatial_or_vision_specific_cognitive_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('TOPOLOGY / DYNAMICS GENERIC-INTEGRATION FALSIFICATION: PASS');
