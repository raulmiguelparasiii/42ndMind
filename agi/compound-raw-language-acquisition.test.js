'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Frontier falsification: one raw surface episode can contain several independent
// propositions. School only the general compound surface structure with semantic
// contact, then remove semantic triples for the target utterance. Each inferred
// proposition must remain proposal-gated and independently corrigible in M.
const REL_TONE = 'ρ:compound_tone_7q';
const REL_FORM = 'ρ:compound_form_4m';
const TARGET = 'entity_compound_target_9v';
const ENTITIES = ['entity_cp_a1', 'entity_cp_b2', 'entity_cp_c3', 'entity_cp_d4', 'entity_cp_e5', 'entity_cp_f6'];
const TONES = ['tone_cp_r1', 'tone_cp_r2', 'tone_cp_r3'];
const FORMS = ['form_cp_x1', 'form_cp_x2', 'form_cp_x3'];
const toneIx = [0, 0, 1, 1, 2, 2];
const formIx = [0, 1, 0, 2, 1, 2];

for (const file of ['mind.js', 'mind-relational.js', 'surface-template.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const fixture of [REL_TONE, REL_FORM, TARGET, 'bears compound tone', 'while compound shaped'])
    assert(!source.includes(fixture), `${file} contains compound-language fixture knowledge: ${fixture}`);
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function currentHas(M, s, r, o) {
  return (M.knowledge?.current?.facts || []).some(f => same(f.subject, s) && f.relation === r && same(f.object, o));
}
function proposals(M, s, r, o) {
  return (M.knowledge?.facts || []).filter(f => f.relation === 'ρ:proposes_relation' && f.object &&
    same(f.object.subject, s) && f.object.relation === r && same(f.object.object, o));
}
function paired(M, input, output, facts) {
  Mind.C(M, { surface: { input, output }, relations: { facts } });
}

const M = Mind.one(1, 1);

// Values are crossed: knowing tone does not identify form and vice versa.
for (let round = 0; round < 3; round++) {
  for (let i = 0; i < ENTITIES.length; i++) {
    const e = ENTITIES[i], tone = TONES[toneIx[i]], form = FORMS[formIx[i]];
    paired(M, `${e} bears ${tone} while shaped ${form}.`, 'noted.', [
      [e, REL_TONE, tone], [e, REL_FORM, form],
    ]);
    paired(M, `what tone marks ${e}?`, `tone ${tone}.`, [[e, REL_TONE, tone]]);
    paired(M, `what form marks ${e}?`, `form ${form}.`, [[e, REL_FORM, form]]);
  }
}
for (let k = 0; k < 3; k++) {
  const toneRows = ENTITIES.map((_, i) => i).filter(i => toneIx[i] === k);
  assert(new Set(toneRows.map(i => formIx[i])).size > 1, 'tone predicts form in compound schooling');
}

// Introduce only the target surface identity; no tone/form semantics yet.
for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: `meet ${TARGET}.`, output: 'noted.', channels: [TARGET] } });
assert(!(M.knowledge?.facts || []).some(f => f.subject === TARGET && (f.relation === REL_TONE || f.relation === REL_FORM)),
  'target compound semantics leaked before raw teaching');

const tone0 = TONES[2], form0 = FORMS[0];
const raw0 = `${TARGET} bears ${tone0} while shaped ${form0}.`;
Mind.C(M, { surface: { input: raw0, output: 'noted.' } });
assert(proposals(M, TARGET, REL_TONE, tone0).length >= 1,
  'first raw compound utterance did not create the tone proposal');
assert(proposals(M, TARGET, REL_FORM, form0).length >= 1,
  'first raw compound utterance did not create the form proposal');
assert(!currentHas(M, TARGET, REL_TONE, tone0) && !currentHas(M, TARGET, REL_FORM, form0),
  'one raw compound occurrence incorrectly self-warranted semantic facts');

Mind.C(M, { surface: { input: raw0, output: 'noted.' } });
Mind.C(M, { surface: { input: raw0, output: 'noted.' } });
assert(currentHas(M, TARGET, REL_TONE, tone0), 'recurrent compound evidence did not warrant tone in canonical M');
assert(currentHas(M, TARGET, REL_FORM, form0), 'recurrent compound evidence did not warrant form in canonical M');

// Correct only one proposition through the same compound surface; the other must
// survive independently rather than being rewritten as one sentence/frame bundle.
const tone1 = TONES[1];
const raw1 = `${TARGET} bears ${tone1} while shaped ${form0}.`;
for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: raw1, output: 'noted.' } });
if (currentHas(M, TARGET, REL_TONE, tone0)) {
  console.log('COMPOUND_CORRECTION_DIAGNOSTIC ' + JSON.stringify({
    proposals: (M.knowledge?.facts || []).filter(f => f.relation === 'ρ:proposes_relation' && f.object && f.object.subject === TARGET && f.object.relation === REL_TONE)
      .map(f => ({ episode: f.subject, object: f.object.object })),
    routes: (M.knowledge?.rules || []).filter(r => r.provenance?.kind === 'surface_induction' && r.provenance?.subject === TARGET && r.provenance?.relation === REL_TONE)
      .map(r => ({ id: r.id, active: r.active, object: r.provenance.object })),
    current: (M.knowledge?.current?.facts || []).filter(f => f.subject === TARGET && f.relation === REL_TONE).map(f => f.object),
  }, null, 2));
}
assert(!currentHas(M, TARGET, REL_TONE, tone0), 'old compound tone remained current after recurrent correction');
assert(currentHas(M, TARGET, REL_TONE, tone1), 'corrected compound tone did not become current');
assert(currentHas(M, TARGET, REL_FORM, form0), 'independent form was lost when only tone changed');

// Specific queries must read the separately settled canonical facts.
const toneProbe = structuredClone(M);
Mind.C(toneProbe, { surface: { input: `what tone marks ${TARGET}?` } });
assert.strictEqual(toneProbe.current.sequence.expression, `tone ${tone1}.`);
assert.strictEqual(toneProbe.current.sequence.canonical_grounding.authority, 'canonical_M');
const formProbe = structuredClone(M);
Mind.C(formProbe, { surface: { input: `what form marks ${TARGET}?` } });
assert.strictEqual(formProbe.current.sequence.expression, `form ${form0}.`);
assert.strictEqual(formProbe.current.sequence.canonical_grounding.authority, 'canonical_M');

// Exact raw surface episodes remain below the learned relations.
const rawEpisodes = (M.knowledge?.facts || []).filter(f => f.relation === 'ρ:input_tokens' && Array.isArray(f.object) &&
  f.object.includes(TARGET) && (f.object.includes(tone0) || f.object.includes(tone1)) && f.object.includes(form0));
assert(rawEpisodes.length >= 6, 'exact compound raw surface history was not retained');
for (const forbidden of ['compound_language_state', 'semantic_dictionary', 'sentence_frame_store', 'response_table', 'planner', 'truth_ledger'])
  assert.strictEqual(M[forbidden], undefined, `parallel compound-language authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  one_C_entrypoint: true,
  one_raw_utterance_multiple_proposals: true,
  proposal_did_not_self_warrant: true,
  recurrence_warranted_both_relations: true,
  one_relation_corrected_independently: true,
  other_relation_survived_correction: true,
  specific_queries_read_canonical_M: true,
  exact_raw_surface_retained: true,
  parallel_language_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('COMPOUND RAW-LANGUAGE ACQUISITION FALSIFICATION: PASS');
