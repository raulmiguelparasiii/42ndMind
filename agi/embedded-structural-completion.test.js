'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Frontier falsification: a previously learned small schema must remain usable
// when its cue is embedded in a larger connected contacted world. Unrelated edges
// may be ignored only by a derived matching view; exact contact remains untouched.
const A = 'ρ:embed_a_3q';
const B = 'ρ:embed_b_7m';
const C = 'ρ:embed_c_1v';
const NOISE = Array.from({ length: 10 }, (_, i) => `ρ:embed_noise_${i}_k9`);
for (const file of ['mind.js', 'structural-relational-abstraction.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes('embed_a_3q') && !source.includes('embed_noise_0_k9'), `${file} contains embedded-completion fixture knowledge`);
}

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function motif(a, b, c) { return [[a, A, b], [b, B, c], [a, C, c]]; }
function cue(a, b, c) { return [[a, A, b], [b, B, c]]; }
function facts(M) { return M.knowledge?.facts || []; }
function values(M, subject, relation) {
  return facts(M).filter(f => String(f.subject) === String(subject) && f.relation === relation).map(f => f.object);
}
function schemas(M) {
  return [...new Set(facts(M).filter(f => f.relation === 'ρ:kind' && f.object === 'structural_relation_schema_candidate').map(f => String(f.subject)))];
}
function targetProposalRecord(M, target) {
  const proposalFact = facts(M).find(f => f.relation === 'ρ:proposes_relation' && f.object &&
    same(f.object.subject, target[0]) && f.object.relation === target[1] && same(f.object.object, target[2]));
  return proposalFact ? String(proposalFact.subject) : null;
}

const M = Mind.one(1, 1);
for (const x of [
  ['train1:s', 'train1:m', 'train1:t'],
  ['train2:s', 'train2:m', 'train2:t'],
  ['train3:s', 'train3:m', 'train3:t'],
]) Mind.C(M, { relations: { facts: motif(...x) } });

const smallSchema = schemas(M).find(id => {
  const edges = values(M, id, 'ρ:schema_edges').find(Array.isArray);
  return Array.isArray(edges) && edges.length === 3;
});
assert(smallSchema, 'small structural schema was not learned before large-world cue');

const s = 'held:s', m = 'held:m', t = 'held:t';
const largeCue = cue(s, m, t);
let previous = t;
for (let i = 0; i < NOISE.length; i++) {
  const next = `held:noise:${i}`;
  largeCue.push([previous, NOISE[i], next]);
  previous = next;
}
assert(largeCue.length > 8, 'fixture must exceed the local structural-view budget');
const target = [s, C, t];
Mind.C(M, { relations: { facts: largeCue } });

const proposal = targetProposalRecord(M, target);
assert(proposal,
  'learned small schema could not complete its cue when embedded in a larger connected world');
assert(values(M, proposal, 'ρ:grounded_by_schema').some(x => x?.ref === smallSchema),
  'embedded completion did not remain grounded by the previously learned small schema');
assert(!facts(M).some(f => same(f.subject, target[0]) && f.relation === target[1] && same(f.object, target[2])),
  'embedded completion was fabricated as observed/current reality instead of remaining a proposal');
for (const triple of largeCue)
  assert(facts(M).some(f => same(f.subject, triple[0]) && f.relation === triple[1] && same(f.object, triple[2])),
    'large connected cue contact was altered or discarded');

for (const forbidden of ['clutter_filter', 'schema_match_state', 'embedded_world_model', 'subgraph_truth_store'])
  assert.strictEqual(M[forbidden], undefined, `parallel embedded-structure authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  small_schema_learned_before_large_cue: true,
  large_connected_cue_edges: largeCue.length,
  embedded_local_completion_proposed: true,
  proposal_grounded_by_existing_schema: true,
  exact_large_cue_retained: true,
  fabricated_observation: false,
  parallel_matching_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('EMBEDDED LOCAL STRUCTURAL COMPLETION FALSIFICATION: PASS');
