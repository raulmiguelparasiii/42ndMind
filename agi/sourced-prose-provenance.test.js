'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

const REL_ORIGIN = 'rho_source_origin_v7';
const REL_MATERIAL = 'rho_source_material_k3';
const TARGET = 'entity_source_target_q9';
const ORIGIN = 'origin_source_value_m2';
const MATERIAL = 'material_source_value_h6';
const BOOK_A = 'source_book_a_4x';
const BOOK_B = 'source_book_b_8n';

for (const file of [
  'mind.js', 'mind-relational.js', 'one-live-blueprint.js', 'surface-template.js',
  'ordered-surface-contact.js', 'raw-proposal-expression-grounding.js', 'sourced-surface-claims.js',
]) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const fixture of [REL_ORIGIN, REL_MATERIAL, TARGET, ORIGIN, MATERIAL, BOOK_A, BOOK_B])
    assert(!source.includes(fixture), `${file} contains sourced-prose fixture knowledge: ${fixture}`);
}

const entities = ['source_train_a', 'source_train_b', 'source_train_c', 'source_train_d'];
const origins = ['source_north', 'source_south'];
const materials = ['source_glass', 'source_wood'];

function paired(M, input, output, facts) {
  Mind.C(M, { surface: { input, output }, relations: { facts } });
}
function currentHas(M, s, r, o) {
  return (M.knowledge?.current?.facts || []).some(f => f.subject === s && f.relation === r && f.object === o);
}
function claims(M, subject, relation, object) {
  const facts = M.knowledge?.facts || [];
  const ids = new Set(facts
    .filter(f => f.relation === 'ρ:kind' && f.object === 'sourced_claim_occurrence')
    .map(f => String(f.subject)));
  return [...ids].filter(id =>
    facts.some(f => String(f.subject) === id && f.relation === 'ρ:claim_subject' && f.object === subject) &&
    facts.some(f => String(f.subject) === id && f.relation === 'ρ:claim_relation' && f.object === relation) &&
    facts.some(f => String(f.subject) === id && f.relation === 'ρ:claim_object' && f.object === object));
}
function sourcesFor(M, ids) {
  const set = new Set(ids.map(String));
  return new Set((M.knowledge?.facts || [])
    .filter(f => set.has(String(f.subject)) && f.relation === 'ρ:claimed_by')
    .map(f => f.object));
}

const M = Mind.one(1, 1);

// Teach only the language constructions and relation roles. Target, target values,
// and source identities never appear in schooling.
for (let round = 0; round < 3; round++) {
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i], origin = origins[i % 2], material = materials[(i >> 1) % 2];
    paired(M, `${e} comes from ${origin}.`, 'noted.', [[e, REL_ORIGIN, origin]]);
    paired(M, `${e} originates in ${origin}.`, 'noted.', [[e, REL_ORIGIN, origin]]);
    paired(M, `${e} is made of ${material}.`, 'noted.', [[e, REL_MATERIAL, material]]);
    paired(M, `${e} consists of ${material}.`, 'noted.', [[e, REL_MATERIAL, material]]);
    paired(M, `where does ${e} come from?`, `it comes from ${origin}.`, [[e, REL_ORIGIN, origin]]);
    paired(M, `what is ${e} made of?`, `it is made of ${material}.`, [[e, REL_MATERIAL, material]]);
  }
}

const passageA = `${TARGET} originates in ${ORIGIN}. ${TARGET} consists of ${MATERIAL}.`;
const passageB = `${TARGET} comes from ${ORIGIN}. ${TARGET} is made of ${MATERIAL}.`;

// Repetition within one source is repeated testimony, not repeated direct world contact.
for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: i % 2 ? passageB : passageA, output: 'noted.', source: BOOK_A } });

assert(!currentHas(M, TARGET, REL_ORIGIN, ORIGIN), 'one book silently became world actuality for origin');
assert(!currentHas(M, TARGET, REL_MATERIAL, MATERIAL), 'one book silently became world actuality for material');
let originClaims = claims(M, TARGET, REL_ORIGIN, ORIGIN);
let materialClaims = claims(M, TARGET, REL_MATERIAL, MATERIAL);
assert(originClaims.length >= 3, 'sourced origin statements were not retained as distinct claim occurrences');
assert(materialClaims.length >= 3, 'sourced material statements were not retained as distinct claim occurrences');
assert.deepStrictEqual([...sourcesFor(M, originClaims)], [BOOK_A], 'origin provenance did not remain source-specific');
assert.deepStrictEqual([...sourcesFor(M, materialClaims)], [BOOK_A], 'material provenance did not remain source-specific');

// A second source adds independent provenance, but source count itself is not a
// hard-coded truth rule. The mind knows that two sources made the claim while the
// external-world proposition remains unresolved absent independent actuality contact.
for (let i = 0; i < 2; i++) Mind.C(M, { surface: { input: i % 2 ? passageA : passageB, output: 'noted.', source: BOOK_B } });

assert(!currentHas(M, TARGET, REL_ORIGIN, ORIGIN), 'two sources were hard-coded into world truth for origin');
assert(!currentHas(M, TARGET, REL_MATERIAL, MATERIAL), 'two sources were hard-coded into world truth for material');
originClaims = claims(M, TARGET, REL_ORIGIN, ORIGIN);
materialClaims = claims(M, TARGET, REL_MATERIAL, MATERIAL);
assert.deepStrictEqual([...sourcesFor(M, originClaims)].sort(), [BOOK_A, BOOK_B].sort(), 'origin claims lost independent source provenance');
assert.deepStrictEqual([...sourcesFor(M, materialClaims)].sort(), [BOOK_A, BOOK_B].sort(), 'material claims lost independent source provenance');

// Exact unsplit book contact and its source remain in M beneath sentence segmentation.
const containers = (M.knowledge?.facts || []).filter(f => f.relation === 'ρ:kind' && f.object === 'ordered_surface_container').map(f => String(f.subject));
assert(containers.some(id => (M.knowledge?.facts || []).some(f => String(f.subject) === id && f.relation === 'ρ:source' && f.object === BOOK_A)),
  'book A provenance was not retained on the exact ordered-text contact');
assert(containers.some(id => (M.knowledge?.facts || []).some(f => String(f.subject) === id && f.relation === 'ρ:source' && f.object === BOOK_B)),
  'book B provenance was not retained on the exact ordered-text contact');
assert((M.knowledge?.facts || []).some(f => f.relation === 'ρ:input_raw' && f.object === passageA), 'exact sourced prose was not retained');

// All world routes born specifically from sourced episodes must be inactive after
// the provenance bridge supplies counterevidence to their actuality interpretation.
const sourcedDefeats = (M.knowledge?.facts || []).filter(f => f.relation === 'counterexample' && f.object?.kind === 'sourced_testimony_not_direct_actuality');
assert(sourcedDefeats.length >= 2, 'sourced testimony did not reopen its world-fact induction routes');

for (const forbidden of ['source_brain', 'book_state', 'trust_score', 'source_weight', 'truth_ledger', 'language_state', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel source authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  source_identity_retained_in_M: true,
  repeated_one_book_not_actuality: true,
  sourced_claim_occurrences_retained: originClaims.length + materialClaims.length,
  independent_sources_retained: [...sourcesFor(M, originClaims)].sort(),
  source_count_not_hardcoded_as_truth: true,
  exact_unsplit_sourced_text_retained: true,
  sourced_world_routes_reopened: sourcedDefeats.length,
  parallel_source_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('SOURCED PROSE PROVENANCE FALSIFICATION: PASS');
