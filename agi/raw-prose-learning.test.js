'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Frontier falsification: after ordinary grounded language schooling, one raw
// prose contact may combine several independently learned sentence structures.
// No semantic triples/channels are supplied for the prose. The same canonical M
// must extract proposal-gated relations from each sentence, settle them only
// after independent recurring surface evidence, answer novel questions from the
// resulting current facts, and correct one learned claim without erasing the
// others. No paragraph parser, book knowledge, or target vocabulary may live in C.

const REL_ORIGIN = 'rho_prose_origin_q7';
const REL_MATERIAL = 'rho_prose_material_m4';
const REL_USE = 'rho_prose_use_v9';
const TARGET = 'oriva_prose_target';
const ORIGIN = 'selune_prose_origin';
const MATERIAL = 'varin_prose_material';
const USE = 'lumet_prose_use';
const MATERIAL2 = 'tressa_prose_material';

for (const file of ['mind.js', 'mind-relational.js', 'one-live-blueprint.js', 'surface-template.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const fixture of [REL_ORIGIN, REL_MATERIAL, REL_USE, TARGET, ORIGIN, MATERIAL, USE, MATERIAL2])
    assert(!source.includes(fixture), `${file} contains prose fixture knowledge: ${fixture}`);
}

const entities = ['alden_p', 'bira_p', 'covan_p', 'dessa_p', 'evren_p', 'fara_p'];
const origins = ['north_p', 'south_p', 'east_p'];
const materials = ['glass_p', 'stone_p', 'wood_p'];
const uses = ['signal_p', 'shelter_p', 'measure_p'];
const oi = [0, 0, 1, 1, 2, 2];
const mi = [0, 1, 0, 2, 1, 2];
const ui = [0, 1, 1, 2, 2, 0];

function paired(M, input, output, facts) {
  Mind.C(M, { surface: { input, output }, relations: { facts } });
}
function has(M, s, r, o) {
  return (M.knowledge?.current?.facts || []).some(f => f.subject === s && f.relation === r && f.object === o);
}
function ask(M, input) {
  const q = structuredClone(M);
  Mind.C(q, { surface: { input } });
  return q.current?.sequence || null;
}

const M = Mind.one(1, 1);

// School three relations through independently crossed bindings and three
// distinct ordinary surface forms for each. The target and its values never
// appear in schooling.
for (let round = 0; round < 2; round++) {
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i], origin = origins[oi[i]], material = materials[mi[i]], use = uses[ui[i]];

    paired(M, `${e} comes from ${origin}.`, 'noted.', [[e, REL_ORIGIN, origin]]);
    paired(M, `${e} originates in ${origin}.`, 'noted.', [[e, REL_ORIGIN, origin]]);
    paired(M, `${origin} is where ${e} comes from.`, 'noted.', [[e, REL_ORIGIN, origin]]);

    paired(M, `${e} is made of ${material}.`, 'noted.', [[e, REL_MATERIAL, material]]);
    paired(M, `${e} consists of ${material}.`, 'noted.', [[e, REL_MATERIAL, material]]);
    paired(M, `${material} is the material of ${e}.`, 'noted.', [[e, REL_MATERIAL, material]]);

    paired(M, `${e} is used for ${use}.`, 'noted.', [[e, REL_USE, use]]);
    paired(M, `people use ${e} for ${use}.`, 'noted.', [[e, REL_USE, use]]);
    paired(M, `${use} is what ${e} is used for.`, 'noted.', [[e, REL_USE, use]]);

    paired(M, `where does ${e} come from?`, `it comes from ${origin}.`, [[e, REL_ORIGIN, origin]]);
    paired(M, `what is ${e} made of?`, `it is made of ${material}.`, [[e, REL_MATERIAL, material]]);
    paired(M, `what is ${e} used for?`, `it is used for ${use}.`, [[e, REL_USE, use]]);

    paired(M, `tell me what you know about ${e}.`,
      `${e} comes from ${origin}. it is made of ${material}, and it is used for ${use}.`, [
        [e, REL_ORIGIN, origin], [e, REL_MATERIAL, material], [e, REL_USE, use],
      ]);
  }
}

assert(!has(M, TARGET, REL_ORIGIN, ORIGIN));
assert(!has(M, TARGET, REL_MATERIAL, MATERIAL));
assert(!has(M, TARGET, REL_USE, USE));
const before = ask(M, `what is ${TARGET} made of?`);
assert(!(before?.canonical_grounding?.subject === TARGET && before.canonical_grounding.status === 'grounded'),
  'target was answerable before the prose was read');

// Three independently worded passages. Each passage combines sentence forms that
// were learned separately; no multi-sentence assertion paragraph was schooled.
const passages = [
  `${TARGET} originates in ${ORIGIN}. ${TARGET} consists of ${MATERIAL}. people use ${TARGET} for ${USE}.`,
  `${ORIGIN} is where ${TARGET} comes from. ${MATERIAL} is the material of ${TARGET}. ${USE} is what ${TARGET} is used for.`,
  `${TARGET} comes from ${ORIGIN}. ${TARGET} is made of ${MATERIAL}. ${TARGET} is used for ${USE}.`,
];

Mind.C(M, { surface: { input: passages[0], output: 'noted.' } });
assert(!has(M, TARGET, REL_ORIGIN, ORIGIN) && !has(M, TARGET, REL_MATERIAL, MATERIAL) && !has(M, TARGET, REL_USE, USE),
  'one prose passage self-warranted its own semantic claims');
Mind.C(M, { surface: { input: passages[1], output: 'noted.' } });
Mind.C(M, { surface: { input: passages[2], output: 'noted.' } });

assert(has(M, TARGET, REL_ORIGIN, ORIGIN), 'raw prose did not teach origin into canonical M');
assert(has(M, TARGET, REL_MATERIAL, MATERIAL), 'raw prose did not teach material into canonical M');
assert(has(M, TARGET, REL_USE, USE), 'raw prose did not teach use into canonical M');

const originAnswer = ask(M, `where does ${TARGET} come from?`);
const materialAnswer = ask(M, `what is ${TARGET} made of?`);
const useAnswer = ask(M, `what is ${TARGET} used for?`);
assert(originAnswer?.expression?.includes(ORIGIN), 'post-reading origin question did not use newly learned M knowledge');
assert(materialAnswer?.expression?.includes(MATERIAL), 'post-reading material question did not use newly learned M knowledge');
assert(useAnswer?.expression?.includes(USE), 'post-reading use question did not use newly learned M knowledge');
for (const seq of [originAnswer, materialAnswer, useAnswer])
  assert.strictEqual(seq.canonical_grounding?.authority, 'canonical_M');

const broad = ask(M, `tell me what you know about ${TARGET}.`);
assert.strictEqual(broad?.canonical_grounding?.authority, 'canonical_M');
assert.strictEqual(broad?.canonical_grounding?.status, 'grounded_discourse');
assert(broad.expression.includes(ORIGIN) && broad.expression.includes(MATERIAL) && broad.expression.includes(USE),
  'broad discourse did not integrate all prose-learned facts');

// Later prose corrects exactly one relation. The old raw text remains retained;
// unrelated prose-learned facts must survive.
const corrections = [
  `${TARGET} consists of ${MATERIAL2}.`,
  `${MATERIAL2} is the material of ${TARGET}.`,
  `${TARGET} is made of ${MATERIAL2}.`,
];
for (const input of corrections) Mind.C(M, { surface: { input, output: 'noted.' } });
assert(!has(M, TARGET, REL_MATERIAL, MATERIAL), 'old prose-learned material stayed current after correction');
assert(has(M, TARGET, REL_MATERIAL, MATERIAL2), 'later prose did not correct material in canonical M');
assert(has(M, TARGET, REL_ORIGIN, ORIGIN), 'material correction erased independent origin knowledge');
assert(has(M, TARGET, REL_USE, USE), 'material correction erased independent use knowledge');
assert((M.knowledge?.facts || []).some(f => f.relation === 'ρ:input_raw' && f.object === passages[0]),
  'original prose contact was erased after correction');

for (const forbidden of ['book_state', 'prose_state', 'language_state', 'semantic_dictionary', 'response_table', 'truth_ledger', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  one_C_entrypoint: true,
  semantic_triples_supplied_for_target_prose: 0,
  multi_sentence_assertion_paragraphs_schooled: 0,
  first_passage_self_warranted: false,
  independently_worded_prose_became_M_knowledge: true,
  pre_reading_target_answerable: false,
  post_reading_target_answerable: true,
  broad_discourse_uses_prose_knowledge: broad.expression,
  later_raw_prose_corrected_one_relation: true,
  independent_relations_survived_correction: true,
  exact_original_prose_retained: true,
  parallel_language_or_book_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('RAW PROSE LEARNING FALSIFICATION: PASS');
