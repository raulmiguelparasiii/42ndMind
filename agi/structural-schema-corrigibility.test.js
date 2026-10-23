'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Focused frontier falsification: endpoint-independent structural transfer is
// already solved. This test asks only whether later reality evidence can constrain
// the same M-owned schema candidate without deleting its history or creating a
// parallel status/truth store.
const T = 'ρ:σ_corr_7k2';
const D = 'ρ:δ_corr_4m9';
for (const file of ['mind.js', 'structural-relational-abstraction.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes('σ_corr_7k2') && !source.includes('δ_corr_4m9'), `${file} contains corrigibility fixture knowledge`);
}

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function ref(id) { return { ref: String(id) }; }
function full(a, b, c) { return [[a, T, b], [b, T, c], [a, D, c]]; }
function cue(a, b, c) { return [[a, T, b], [b, T, c]]; }
function facts(M) { return M.knowledge?.facts || []; }
function values(M, subject, relation) {
  return facts(M).filter(f => String(f.subject) === String(subject) && f.relation === relation).map(f => f.object);
}
function proposals(M) {
  return facts(M).filter(f => f.relation === 'ρ:proposes_relation' && f.object && typeof f.object === 'object').map(f => f.object);
}
function hasProposal(M, triple) {
  return proposals(M).some(x => same(x.subject, triple[0]) && x.relation === triple[1] && same(x.object, triple[2]));
}

const M = Mind.one(1, 1);
for (const x of [
  ['n2q', 'v7m', 'k1r'],
  ['p6z', 'h3c', 'w8t'],
  ['j4f', 's9y', 'b0u'],
]) Mind.C(M, { relations: { facts: full(...x) } });

const schemas = [...new Set(facts(M)
  .filter(f => f.relation === 'ρ:kind' && f.object === 'structural_relation_schema_candidate')
  .map(f => String(f.subject)))];
assert(schemas.length >= 1, 'training motifs produced no structural schema candidate');
const schema = schemas[0];
const supportBefore = values(M, schema, 'ρ:supported_by').filter(x => x?.ref !== undefined).map(x => String(x.ref));
assert(supportBefore.length >= 2, 'schema lacks independent concrete support bindings');
assert(values(M, schema, 'ρ:formation_status').includes('proposal'), 'schema candidate was silently promoted to truth');

// First unseen isomorphic cue: transfer remains only a proposal.
const held1 = ['x5d', 'r2a', 'q8n'];
const target1 = [held1[0], D, held1[2]];
Mind.C(M, { relations: { facts: cue(...held1) } });
assert(hasProposal(M, target1), 'supported structural schema did not propose on first held-out isomorphic cue');

// Reality later supplies the proposed relation. The complete held-out instance must
// become another independent support binding for the same schema, not a new truth authority.
Mind.C(M, { relations: { facts: [target1] } });
const supportAfter = values(M, schema, 'ρ:supported_by').filter(x => x?.ref !== undefined).map(x => String(x.ref));
assert(new Set(supportAfter).size > new Set(supportBefore).size,
  'later held-out reality did not add independent support to the same structural schema');

const held2 = ['g3p', 'l7e', 'u1k'];
const target2 = [held2[0], D, held2[2]];
Mind.C(M, { relations: { facts: cue(...held2) } });
assert(hasProposal(M, target2), 'schema stopped transferring despite additional supporting reality');

// Explicit evaluable countercontact about the categorical schema candidate. This
// is ordinary structured reality contact using the repository's generic
// counterexample relation; absence of D alone is never treated as false.
const evidence = 'fixture:structural-corrigibility:counterexample';
Mind.C(M, { relations: { facts: [
  [evidence, 'ρ:kind', 'structural_schema_counterevidence'],
  [schema, 'counterexample', ref(evidence)],
] } });
assert(values(M, schema, 'counterexample').some(x => x?.ref === evidence), 'schema counterevidence was not retained in M');

// A new isomorphic cue must now remain open rather than continuing to issue the
// defeated schema completion. Historical schema/support/proposals remain intact.
const held3 = ['c8k', 'm4e', 't2v'];
const target3 = [held3[0], D, held3[2]];
Mind.C(M, { relations: { facts: cue(...held3) } });
assert(!hasProposal(M, target3),
  'counterexampled structural schema continued licensing new held-out transfer proposals');
assert(facts(M).some(f => String(f.subject) === schema && f.relation === 'ρ:kind' && f.object === 'structural_relation_schema_candidate'),
  'counterevidence deleted the historical schema candidate');
assert(values(M, schema, 'ρ:supported_by').length >= supportAfter.length,
  'counterevidence deleted historical independent schema support');
assert(hasProposal(M, target1) && hasProposal(M, target2), 'counterevidence erased historical transfer proposals');

for (const forbidden of ['schema_status', 'structural_truth_ledger', 'transfer_policy', 'rule_table', 'graph_model'])
  assert.strictEqual(M[forbidden], undefined, `parallel structural authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  structural_schema_remained_provisional: true,
  later_reality_added_independent_support: true,
  explicit_counterevidence_retained_in_M: true,
  future_transfer_reopened_after_counterevidence: true,
  historical_schema_support_and_proposals_retained: true,
  absence_not_treated_as_false: true,
  parallel_structural_status_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('STRUCTURAL SCHEMA CORRIGIBILITY FALSIFICATION: PASS');
