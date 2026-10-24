'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

let seed = 0x42f17e;
function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; }
function word(prefix) { return `${prefix}_${rnd().toString(36)}`; }

const REL = word('relation');
const novelVerb = word('novelverb');
const entities = Array.from({ length: 6 }, () => word('entity'));
const values = Array.from({ length: 3 }, () => word('value'));
const target = word('target');
const targetValue = word('targetvalue');
const correctedValue = word('correctedvalue');
const assignment = [0, 0, 1, 1, 2, 2];

for (const file of [
  'mind.js', 'mind-relational.js', 'surface-template.js', 'ordered-surface-contact.js',
  'raw-proposal-expression-grounding.js', 'surface-structure-grounding.js',
]) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const secret of [REL, novelVerb, target, targetValue, correctedValue])
    assert(!source.includes(secret), `${file} contains runtime-generated paraphrase fixture ${secret}`);
}

function teach(M, input, output, facts) {
  Mind.C(M, { surface: { input, output }, relations: { facts } });
}
function has(M, s, r, o) {
  return (M.knowledge?.current?.facts || []).some(f => f.subject === s && f.relation === r && f.object === o);
}
function proposed(M, s, r, o) {
  return (M.knowledge?.facts || []).some(f => f.relation === 'ρ:proposes_relation' && f.object &&
    f.object.subject === s && f.object.relation === r && f.object.object === o);
}
function ask(M, input) {
  const q = structuredClone(M);
  Mind.C(q, { surface: { input } });
  return q.current?.sequence;
}

const M = Mind.one(1, 1);

// Give this individual a grounded relation and ordinary endpoint names. The novel
// construction itself never receives a semantic triple or channel.
for (let round = 0; round < 2; round++) {
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i], v = values[assignment[i]];
    teach(M, `${e} has mark ${v}.`, 'noted.', [[e, REL, v]]);
    teach(M, `what mark has ${e}?`, `mark ${v}.`, [[e, REL, v]]);
  }
}

// Ground target/value surface identities through unrelated relations only. The
// held-out REL fact must remain absent before the novel construction is applied.
for (let i = 0; i < 3; i++) {
  teach(M, `${target} is specimen.`, 'noted.', [[target, `kindrel_${i}`, 'specimen']]);
  teach(M, `${targetValue} is token.`, 'noted.', [[targetValue, `valuerel_a_${i}`, 'token']]);
  teach(M, `${correctedValue} is token.`, 'noted.', [[correctedValue, `valuerel_b_${i}`, 'token']]);
}
assert(!has(M, target, REL, targetValue));
assert(!has(M, target, REL, correctedValue));

// Completely new order and opaque verb. These sentences describe facts M already
// knows, but no semantic triples/channels accompany the sentences. Their only
// possible semantic grounding comes from comparing raw surface endpoints with
// canonical M facts across independently varying examples.
for (let i = 0; i < entities.length; i++) {
  const e = entities[i], v = values[assignment[i]];
  Mind.C(M, { surface: { input: `${v} ${novelVerb} ${e}.`, output: 'noted.' } });
}

// Lifetime access for learned surface structure is a rebuildable acceleration,
// not a semantic store. Ordinary updates append-sync it; deleting or invalidating
// it must reconstruct identical proposal behavior from canonical M.
const index = M.structure?.surface_structure_index;
assert(index && index.version === 1 && index.authority === 'zero_authority_rebuildable',
  'surface structure acceleration is missing or claims authority');
assert(Number.isInteger(index.fact_count) && index.fact_count <= M.knowledge.facts.length,
  'surface structure index lacks a valid canonical-M watermark');
assert(Number.isInteger(index.incremental_syncs) && index.incremental_syncs > 0,
  'surface structure index did not incrementally synchronize later facts');

const probeText = `${targetValue} ${novelVerb} ${target}.`;
const cachedProbe = structuredClone(M);
Mind.C(cachedProbe, { surface: { input: probeText, output: 'noted.' } });
assert(proposed(cachedProbe, target, REL, targetValue), 'cached learned construction did not propose target fact');

const rebuiltProbe = structuredClone(M);
delete rebuiltProbe.structure.surface_structure_index;
Mind.C(rebuiltProbe, { surface: { input: probeText, output: 'noted.' } });
assert(proposed(rebuiltProbe, target, REL, targetValue), 'deleting surface structure index changed learned-construction behavior');
assert(rebuiltProbe.structure.surface_structure_index?.authority === 'zero_authority_rebuildable',
  'surface structure index did not rebuild from canonical M');

const staleProbe = structuredClone(M);
staleProbe.structure.surface_structure_index.version = -1;
Mind.C(staleProbe, { surface: { input: probeText, output: 'noted.' } });
assert(proposed(staleProbe, target, REL, targetValue), 'invalidating surface structure index changed learned-construction behavior');
assert.strictEqual(staleProbe.structure.surface_structure_index.version, 1, 'stale surface structure index was not rebuilt');

// Applying the same newly learned construction to unseen target/value must create
// only a proposal first, then become current after recurrent raw evidence.
Mind.C(M, { surface: { input: probeText, output: 'noted.' } });
assert(!has(M, target, REL, targetValue), 'one use of newly learned paraphrase self-warranted target fact');
Mind.C(M, { surface: { input: probeText, output: 'noted.' } });
Mind.C(M, { surface: { input: probeText, output: 'noted.' } });

assert(has(M, target, REL, targetValue),
  'mind did not learn a new target fact through a construction whose meaning had to be learned from known facts');
const answer = ask(M, `what mark has ${target}?`);
assert(answer?.expression?.includes(targetValue), 'newly learned paraphrase fact was not available to conversation');
assert.strictEqual(answer?.canonical_grounding?.authority, 'canonical_M');

// The learned construction must remain corrigible through the same route family.
// One contradictory use stays a proposal; recurrent later use reopens the old
// route and establishes the corrected value without erasing the construction.
Mind.C(M, { surface: { input: `${correctedValue} ${novelVerb} ${target}.`, output: 'noted.' } });
assert(has(M, target, REL, targetValue) && !has(M, target, REL, correctedValue),
  'one contradictory use of learned construction prematurely rewrote current knowledge');
Mind.C(M, { surface: { input: `${correctedValue} ${novelVerb} ${target}.`, output: 'noted.' } });
Mind.C(M, { surface: { input: `${correctedValue} ${novelVerb} ${target}.`, output: 'noted.' } });
assert(!has(M, target, REL, targetValue), 'old learned-construction route remained current after recurrent correction');
assert(has(M, target, REL, correctedValue), 'learned construction did not support later correction');
const corrected = ask(M, `what mark has ${target}?`);
assert(corrected?.expression?.includes(correctedValue), 'corrected learned-construction fact was not conversationally accessible');
assert.strictEqual(corrected?.canonical_grounding?.authority, 'canonical_M');

for (const forbidden of ['grammar_state', 'parser_state', 'semantic_dictionary', 'language_state', 'response_table', 'truth_ledger'])
  assert.strictEqual(M[forbidden], undefined, `parallel language authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  seed: '0x42f17e',
  novel_surface_token_generated_at_runtime: novelVerb,
  novel_construction_semantic_triples_supplied: 0,
  known_facts_used_to_ground_new_construction: true,
  target_semantic_triples_supplied: 0,
  first_target_use_self_warranted: false,
  surface_structure_index_zero_authority_rebuildable: true,
  new_construction_transferred_to_new_target: true,
  learned_construction_remained_corrigible: true,
  conversational_access_from_canonical_M: true,
  one_persistent_M: M.whole === 1,
  unrestricted_english_demonstrated: false,
}, null, 2));
console.log('RAW PARAPHRASE LEARNING FALSIFICATION: PASS');
