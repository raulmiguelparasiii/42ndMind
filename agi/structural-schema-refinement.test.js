'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Reuse-first frontier: a defeated broad schema must not freeze development.
// Recurrent extra structure may form a distinct narrower schema through the same
// generic graph abstraction, with no context table or fixture-specific branch.
const T = 'ρ:τ_refine_2q7';
const D = 'ρ:δ_refine_8m4';
const K = 'ρ:κ_refine_5v1';
for (const file of ['mind.js', 'structural-relational-abstraction.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const needle of ['τ_refine_2q7', 'δ_refine_8m4', 'κ_refine_5v1'])
    assert(!source.includes(needle), `${file} contains refinement fixture knowledge: ${needle}`);
}

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function ref(id) { return { ref: String(id) }; }
function broad(a, b, c) { return [[a, T, b], [b, T, c], [a, D, c]]; }
function broadCue(a, b, c) { return [[a, T, b], [b, T, c]]; }
function contextual(a, b, c, x) { return [...broad(a, b, c), [a, K, x]]; }
function contextualCue(a, b, c, x) { return [...broadCue(a, b, c), [a, K, x]]; }
function facts(M) { return M.knowledge?.facts || []; }
function values(M, subject, relation) {
  return facts(M).filter(f => String(f.subject) === String(subject) && f.relation === relation).map(f => f.object);
}
function schemas(M) {
  const ids = [...new Set(facts(M).filter(f => f.relation === 'ρ:kind' && f.object === 'structural_relation_schema_candidate').map(f => String(f.subject)))];
  return ids.map(id => ({ id, edges: values(M, id, 'ρ:schema_edges').find(Array.isArray) || [] }));
}
function proposals(M) {
  return facts(M).filter(f => f.relation === 'ρ:proposes_relation' && f.object && typeof f.object === 'object').map(f => f.object);
}
function hasProposal(M, triple) {
  return proposals(M).some(x => same(x.subject, triple[0]) && x.relation === triple[1] && same(x.object, triple[2]));
}

const M = Mind.one(1, 1);
for (const x of [
  ['a7n', 'b2v', 'c9k'],
  ['d4p', 'e1h', 'f6w'],
  ['g8j', 'h3s', 'i5b'],
]) Mind.C(M, { relations: { facts: broad(...x) } });

const broadSchema = schemas(M).find(x => x.edges.length === 3);
assert(broadSchema, 'broad structural schema was not learned');

// Reopen the broad claim explicitly. Its history stays, but it may no longer
// license context-free transfer.
const broadEvidence = 'fixture:refine:broad-counterexample';
Mind.C(M, { relations: { facts: [
  [broadEvidence, 'ρ:kind', 'structural_schema_counterevidence'],
  [broadSchema.id, 'counterexample', ref(broadEvidence)],
] } });
const plainAfterDefeat = ['j2x', 'k8r', 'l1q'];
const plainTarget = [plainAfterDefeat[0], D, plainAfterDefeat[2]];
Mind.C(M, { relations: { facts: broadCue(...plainAfterDefeat) } });
assert(!hasProposal(M, plainTarget), 'counterexampled broad schema still transferred without context');

// Reality then repeatedly presents a more specific topology: the old chain plus
// one additional opaque contextual edge. Two independent bindings are enough for
// the existing endpoint-independent abstraction to propose a distinct schema.
for (const x of [
  ['m3c', 'n7t', 'o0y', 'ctx4u'],
  ['p9f', 'q5d', 'r2z', 'ctx8e'],
  ['s1m', 't6g', 'u3v', 'ctx0k'],
]) Mind.C(M, { relations: { facts: contextual(...x) } });

const specificSchemas = schemas(M).filter(x => x.edges.length === 4 && x.id !== broadSchema.id);
assert(specificSchemas.length >= 1, 'context-specific recurrence did not form a narrower structural schema');
assert(facts(M).some(f => String(f.subject) === broadSchema.id && f.relation === 'counterexample'),
  'learning a narrower schema erased the broad schema counterevidence');

// Held-out context-matched cue: only D is missing from the four-edge schema, so
// the narrower structure may propose it.
const held = ['v4a', 'w7c', 'x0n', 'ctx2p'];
const heldTarget = [held[0], D, held[2]];
Mind.C(M, { relations: { facts: contextualCue(...held) } });
assert(hasProposal(M, heldTarget),
  'narrower context-specific schema did not transfer to an unseen matching context');

// Same T-chain without K-context must remain open: broad schema is counterexampled
// and the specific schema is missing two edges, so neither may invent D.
const noContext = ['y5r', 'z1h', 'aa8q'];
const noContextTarget = [noContext[0], D, noContext[2]];
Mind.C(M, { relations: { facts: broadCue(...noContext) } });
assert(!hasProposal(M, noContextTarget),
  'narrower schema leaked into a structurally unmatched context-free cue');

for (const forbidden of ['context_table', 'schema_status', 'refinement_policy', 'exception_table', 'rule_table'])
  assert.strictEqual(M[forbidden], undefined, `parallel structural-refinement authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  broad_schema_reopened_not_deleted: true,
  context_specific_schema_learned_by_same_abstraction: true,
  held_out_context_matched_transfer: true,
  context_free_transfer_remained_open: true,
  opaque_context_relation: true,
  hidden_exception_or_context_policy: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('STRUCTURAL SCHEMA REFINEMENT AFTER DEFEAT: PASS');
