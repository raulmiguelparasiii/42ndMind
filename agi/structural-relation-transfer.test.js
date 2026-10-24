'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Opaque predicates. The developmental runtime must not know their intended role.
const T = 'ρ:σ_4p7x2';
const D = 'ρ:δ_9m3q5';
for (const file of [
  'mind.js', 'mind-relational.js', 'generic-lived-occurrences.js',
  'structural-relational-abstraction.js', 'relation-sequence-recompression.js',
]) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes('σ_4p7x2') && !source.includes('δ_9m3q5'), `${file} contains structural-transfer fixture knowledge`);
}

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function tripleEquals(f, triple) {
  return same(f.subject, triple[0]) && f.relation === triple[1] && same(f.object, triple[2]);
}
function hasCurrentTriple(M, triple) {
  return (M.knowledge?.current?.facts || []).some(f => tripleEquals(f, triple));
}
function proposedTriples(M) {
  return (M.knowledge?.facts || [])
    .filter(f => f.relation === 'ρ:proposes_relation' && f.object && typeof f.object === 'object')
    .map(f => f.object)
    .filter(x => Object.prototype.hasOwnProperty.call(x, 'subject') &&
      Object.prototype.hasOwnProperty.call(x, 'relation') && Object.prototype.hasOwnProperty.call(x, 'object'));
}
function hasProposal(M, triple) {
  return proposedTriples(M).some(x => same(x.subject, triple[0]) && x.relation === triple[1] && same(x.object, triple[2]));
}
function fullChain(a, b, c) {
  return [[a, T, b], [b, T, c], [a, D, c]];
}
function chainCue(a, b, c) {
  return [[a, T, b], [b, T, c]];
}

const M = Mind.one(1, 1);

// Independent concrete instances. Endpoint names share no lexical structure and
// no variable rule is supplied. Reality contact contains the complete motifs.
for (const [a, b, c] of [
  ['n7q', 'v2m', 'k8r'],
  ['p4z', 'h1c', 'w6t'],
  ['j9f', 's3y', 'b5u'],
]) Mind.C(M, { relations: { facts: fullChain(a, b, c) } });

// Recurrence must become an explicit M-owned candidate, never a hidden rule table.
const schemaCandidates = new Set((M.knowledge?.facts || [])
  .filter(f => f.relation === 'ρ:kind' && f.object === 'structural_relation_schema_candidate')
  .map(f => String(f.subject)));
assert(schemaCandidates.size >= 1, 'recurrent concrete motifs produced no first-class structural schema candidate');

// Held-out isomorphic chain: only the topology/cue is contacted. Generalization
// may propose the missing D edge, but must not fabricate it as observed truth.
const held = ['x2d', 'r8a', 'q1n'];
const heldTarget = [held[0], D, held[2]];
Mind.C(M, { relations: { facts: chainCue(...held) } });

assert(!hasCurrentTriple(M, heldTarget), 'structural transfer fabricated the held-out relation as observed/current fact');
assert(hasProposal(M, heldTarget),
  'repeated concrete relational motifs did not produce an endpoint-independent proposal on an unseen isomorphic chain');

// Non-isomorphic fork with the same number of opaque T edges must not inherit the
// chain completion merely from edge count or co-occurrence frequency.
const fork = ['c6k', 'm0e', 't7v'];
Mind.C(M, { relations: { facts: [[fork[0], T, fork[1]], [fork[0], T, fork[2]]] } });
const forkPairs = [];
for (const a of fork) for (const b of fork) if (a !== b) forkPairs.push([a, D, b]);
assert(!forkPairs.some(triple => hasProposal(M, triple)),
  'non-isomorphic fork received the chain completion schema');

// Exact training and cue contacts remain, while schema/proposal authority must not
// appear in a parallel store outside M.
for (const triple of fullChain('n7q', 'v2m', 'k8r'))
  assert((M.knowledge?.facts || []).some(f => tripleEquals(f, triple)), 'exact training contact was lost');
for (const triple of chainCue(...held))
  assert((M.knowledge?.facts || []).some(f => tripleEquals(f, triple)), 'exact held-out cue contact was lost');
for (const forbidden of ['schema_state', 'rule_table', 'transfer_model', 'graph_model', 'planner', 'truth_ledger'])
  assert.strictEqual(M[forbidden], undefined, `parallel structural authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  one_C_entrypoint: true,
  opaque_predicates: true,
  independent_concrete_training_instances: 3,
  first_class_schema_candidate: true,
  held_out_endpoint_names_unseen: true,
  held_out_missing_relation_observed: false,
  held_out_missing_relation_proposed: true,
  non_isomorphic_fork_rejected: true,
  exact_contact_retained: true,
  parallel_structural_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('STRUCTURAL RELATION TRANSFER FALSIFICATION: PASS');
