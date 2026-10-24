'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Cross-modal lexical-grounding falsification. A quantitative relation is learned
// from raw numeric contact. Later, a novel surface token recurs in varied phrases
// while fresh raw contact instantiates that same relation. No structured semantic
// relation is ever supplied. The token must acquire an M-owned expression link to
// the learned relation term, and a later surface-only token must recover it.

const WORD = 'velin_ground_raw';
const WORD_TERM = `surface:${WORD}`;
const CONCERN = 59;
function f(x) { return 0.713 * x * x + 0.287; }

for (const file of ['mind.js', 'mind-relational.js', 'continuous-relational-contact.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes(WORD), `${file} contains test-specific lexical fixture`);
}

let seed = 0x73a5c1d9;
function random() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}
function shuffled(xs) {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function symmetricBatch() {
  const out = [];
  for (let k = 1; k <= 32; k++) {
    const magnitude = k / 8;
    out.push(magnitude, -magnitude);
  }
  return shuffled(out);
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

const M = Mind.one(1, 1);

// Pure raw numeric development first. Repeated ± magnitudes make p1 -> p0
// non-functional while p0 -> p1 remains a simple nonlinear relation.
for (const x of [...symmetricBatch(), ...symmetricBatch()])
  Mind.C(M, { frame: [x, f(x), CONCERN] });

const learnedFact = (M.knowledge?.current?.facts || []).find(fact =>
  fact.subject === 'receptor:p0' && fact.relation === 'ρ:continuous_dependence' &&
  fact.object?.target === 'receptor:p1' && fact.object?.lag === 0 && fact.object?.transform);
assert(learnedFact, 'raw nonlinear relation was not learned before lexical grounding');

const relationTermFact = (M.knowledge?.facts || []).find(fact =>
  fact.relation === 'ρ:relation_object' && same(fact.object, learnedFact.object));
assert(relationTermFact, 'learned raw relation has no first-class relation term');
const relationTerm = relationTermFact.subject;
const relationRef = { ref: String(relationTerm) };

// Varied language context prevents the relation label from being inferred from a
// fixed whole phrase. Only WORD recurs across all input contexts. Every teaching
// contact is frame + surface only: no structured relations or semantic channels.
let labelIndex = 0;
for (const x of symmetricBatch()) {
  const i = labelIndex++;
  const phrases = [
    `${WORD} trace_${i}`,
    `mark_${i} ${WORD}`,
    `observe ${WORD} sample_${i}`,
    `case_${i} carries ${WORD}`,
  ];
  Mind.C(M, {
    frame: [x, f(x), CONCERN],
    surface: { input: phrases[i % phrases.length], output: 'noted.' },
  });
}

const expression = (M.knowledge?.current?.facts || []).find(fact =>
  fact.subject === WORD_TERM && fact.relation === 'ρ:expresses' && same(fact.object, relationRef));
assert(expression,
  'recurrent surface contact did not ground the novel word to the raw-learned relation in canonical M');
assert((M.knowledge?.rules || []).some(rule =>
  rule.active !== false && rule.provenance?.kind === 'surface_relation_grounding' &&
  rule.provenance?.surface === WORD_TERM && rule.provenance?.relation_term === relationTerm),
  'lexical grounding has no recurrent-support route in canonical M');

// The exact utterances and raw sensor values remain historical contact beneath the
// learned cross-modal expression relation.
assert((M.knowledge?.facts || []).some(fact => fact.relation === 'ρ:input_raw' && String(fact.object).includes(WORD)));
assert(M.contacts.some(frame => frame[0] !== null && frame[1] !== null));

// Surface-only recall: no frame and no relations are supplied here. The derived
// current surface view must recover the same M-owned relation meaning.
Mind.C(M, { surface: { input: WORD } });
const lexical = M.current?.sequence?.lexical_grounding;
assert(Array.isArray(lexical) && lexical.some(item =>
  item.token === WORD && item.surface === WORD_TERM && item.relation_term === relationTerm &&
  item.authority === 'canonical_M'),
  'surface-only use of the grounded word did not recover its raw-learned relation meaning from canonical M');

for (const forbidden of ['lexicon_state', 'semantic_dictionary', 'language_state', 'grounding_model', 'world_model', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  raw_relation_learned_before_language: true,
  no_structured_semantic_teaching: true,
  varied_surface_context: true,
  word_grounded_to_relation_term_in_M: true,
  recurrent_support_route_in_M: true,
  surface_only_semantic_recall: true,
  exact_sensor_and_surface_history_retained: true,
  parallel_lexical_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('CROSS-MODAL RAW LEXICAL GROUNDING: PASS');
