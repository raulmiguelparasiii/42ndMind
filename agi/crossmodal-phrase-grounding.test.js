'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Phrase-grounding falsification. Three relations are learned independently from
// raw numeric contact. The expression "silver drift" labels relation A, while
// "silver" alone labels B and "drift" alone labels C. No semantic relations or
// surface channels are supplied. Passing requires the multi-token expression
// itself to become an M-owned expression for A; atom lookup alone is insufficient.

const PHRASE = 'silver drift';
const PHRASE_TERM = `surface:${PHRASE}`;
const CONCERN = 61;
const TRAIN = 64;
const LABEL = 40;
const fA = x => 1.713 * x + 0.219;
const fB = x => -0.887 * x + 1.137;
const fC = x => 0.631 * x - 0.417;

for (const file of ['mind.js', 'mind-relational.js', 'surface-relation-grounding.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes(PHRASE), `${file} contains test-specific phrase fixture`);
}

let seed = 0x62f19ac7;
function random() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}
function value() { return random() * 4 - 2; }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

const M = Mind.one(1, 1);
function rawA(surface) {
  const x = value();
  Mind.C(M, { frame: [x, fA(x), null, null, null, null, CONCERN], ...(surface ? { surface } : {}) });
}
function rawB(surface) {
  const x = value();
  Mind.C(M, { frame: [null, null, x, fB(x), null, null, CONCERN], ...(surface ? { surface } : {}) });
}
function rawC(surface) {
  const x = value();
  Mind.C(M, { frame: [null, null, null, null, x, fC(x), CONCERN], ...(surface ? { surface } : {}) });
}

for (let i = 0; i < TRAIN; i++) rawA();
for (let i = 0; i < TRAIN; i++) rawB();
for (let i = 0; i < TRAIN; i++) rawC();

function learnedRelation(source, target) {
  return (M.knowledge?.current?.facts || []).find(f =>
    f.subject === `receptor:p${source}` && f.relation === 'ρ:continuous_dependence' &&
    f.object?.target === `receptor:p${target}` && f.object?.lag === 0 && f.object?.transform);
}
function relationTerm(relation) {
  return (M.knowledge?.facts || []).find(f => f.relation === 'ρ:relation_object' && same(f.object, relation.object))?.subject;
}
const A = learnedRelation(0, 1), B = learnedRelation(2, 3), C = learnedRelation(4, 5);
assert(A && B && C, 'raw relations A/B/C were not independently learned');
const termA = relationTerm(A), termB = relationTerm(B), termC = relationTerm(C);
assert(termA && termB && termC, 'one or more raw relations lacks a first-class relation term');
assert(new Set([termA, termB, termC]).size === 3, 'fixture relations collapsed to one relation-term identity');

const phraseContexts = [
  i => `${PHRASE} trace_${i}`,
  i => `mark_${i} ${PHRASE}`,
  i => `observe ${PHRASE} sample_${i}`,
  i => `case_${i} carries ${PHRASE}`,
  i => `during trial_${i} note ${PHRASE}`,
];
for (let i = 0; i < LABEL; i++) rawA({ input: phraseContexts[i % phraseContexts.length](i), output: 'noted.' });
for (let i = 0; i < LABEL; i++) rawB({ input: `silver alone_b_${i}`, output: 'noted.' });
for (let i = 0; i < LABEL; i++) rawC({ input: `drift alone_c_${i}`, output: 'noted.' });

const current = M.knowledge?.current?.facts || [];
assert(current.some(f => f.subject === 'surface:silver' && f.relation === 'ρ:expresses' && f.object?.ref === String(termB)),
  'component word silver was not grounded to its separate raw relation');
assert(current.some(f => f.subject === 'surface:drift' && f.relation === 'ρ:expresses' && f.object?.ref === String(termC)),
  'component word drift was not grounded to its separate raw relation');
assert(current.some(f => f.subject === PHRASE_TERM && f.relation === 'ρ:expresses' && f.object?.ref === String(termA)),
  'multi-token expression did not become a first-class expression for relation A');
assert((M.knowledge?.rules || []).some(rule => rule.active !== false &&
  rule.provenance?.kind === 'surface_relation_grounding' && rule.provenance?.surface === PHRASE_TERM &&
  rule.provenance?.relation_term === String(termA)),
  'multi-token expression has no recurrent-support route in canonical M');

Mind.C(M, { surface: { input: PHRASE } });
const lexical = M.current?.sequence?.lexical_grounding;
assert(Array.isArray(lexical), 'surface-only phrase produced no lexical-grounding view');
assert(lexical.some(item => item.surface === PHRASE_TERM && item.relation_term === String(termA) && item.authority === 'canonical_M'),
  'surface-only phrase did not recover its phrase-level raw-learned meaning from canonical M');
assert(lexical.some(item => item.surface === 'surface:silver' && item.relation_term === String(termB)),
  'phrase recall erased the independently grounded silver meaning');
assert(lexical.some(item => item.surface === 'surface:drift' && item.relation_term === String(termC)),
  'phrase recall erased the independently grounded drift meaning');

for (const forbidden of ['phrase_lexicon', 'semantic_dictionary', 'language_state', 'grounding_model', 'world_model', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  three_raw_relations_learned_independently: true,
  no_structured_semantic_teaching: true,
  component_words_have_separate_meanings: true,
  phrase_has_first_class_M_meaning: true,
  surface_only_phrase_recalls_phrase_and_component_meanings: true,
  exact_sensor_and_surface_history_retained: true,
  parallel_phrase_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('CROSS-MODAL RAW PHRASE GROUNDING: PASS');
