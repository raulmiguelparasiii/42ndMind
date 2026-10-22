'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Reasoning-integration falsification. A novel word first acquires a relation
// meaning from raw frame+surface experience. Later the word is uttered alone.
// The utterance must become a first-class expression occurrence in canonical M,
// referring to the learned relation term. A completely generic M rule must then
// be able to reason from that reference. Mentioning a relation must not fabricate
// a new raw sensor contact or a new worldly relation occurrence.

const WORD = 'tavin_reference_raw';
const SURFACE = `surface:${WORD}`;
const CONCERN = 67;
function f(x) { return 0.719 * x * x + 0.281; }

for (const file of ['mind.js', 'surface-relation-grounding.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes(WORD), `${file} contains test-specific reference fixture`);
}

let seed = 0x51d3a79b;
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
function batch() {
  const out = [];
  for (let k = 1; k <= 32; k++) out.push(k / 8, -k / 8);
  return shuffled(out);
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

const M = Mind.one(1, 1);
for (const x of [...batch(), ...batch()]) Mind.C(M, { frame: [x, f(x), CONCERN] });

const learned = (M.knowledge?.current?.facts || []).find(fact =>
  fact.subject === 'receptor:p0' && fact.relation === 'ρ:continuous_dependence' &&
  fact.object?.target === 'receptor:p1' && fact.object?.lag === 0 && fact.object?.transform);
assert(learned, 'raw relation was not learned before reference integration');
const term = (M.knowledge?.facts || []).find(fact =>
  fact.relation === 'ρ:relation_object' && same(fact.object, learned.object))?.subject;
assert(term, 'raw learned relation lacks a first-class relation term');

let i = 0;
for (const x of batch()) {
  const contexts = [
    `${WORD} trace_${i}`,
    `mark_${i} ${WORD}`,
    `observe ${WORD} sample_${i}`,
    `case_${i} carries ${WORD}`,
  ];
  Mind.C(M, { frame: [x, f(x), CONCERN], surface: { input: contexts[i % contexts.length], output: 'noted.' } });
  i++;
}
assert((M.knowledge?.current?.facts || []).some(fact =>
  fact.subject === SURFACE && fact.relation === 'ρ:expresses' && fact.object?.ref === String(term)),
  'raw experience did not ground the word before the reference probe');

// This rule has no fixture word, no receptor, and no knowledge of the relation's
// meaning. It only demonstrates that ordinary relational closure can consume a
// current surface-reference occurrence once that occurrence exists in M.
const V_MENTION = { var: 'mention' };
const V_RELATION = { var: 'relation' };
Mind.C(M, { relations: { rules: [{
  id: 'generic-surface-reference-recognition',
  premises: [
    [V_MENTION, 'ρ:kind', 'surface_expression_occurrence'],
    [V_MENTION, 'ρ:refers_to', V_RELATION],
  ],
  conclusion: [V_MENTION, 'ρ:recognized_relation_reference', V_RELATION],
  categorical: true,
  provenance: { kind: 'generic_reference_use', fixture_independent: true },
}] } });

const contactsBefore = M.contacts.length;
const relationOccurrencesBefore = (M.knowledge?.facts || []).filter(fact =>
  fact.relation === 'ρ:kind' && fact.object === 'relation_occurrence').length;

Mind.C(M, { surface: { input: WORD } });

assert.strictEqual(M.contacts.length, contactsBefore,
  'surface-only reference fabricated a new numeric sensor contact');
assert.strictEqual((M.knowledge?.facts || []).filter(fact =>
  fact.relation === 'ρ:kind' && fact.object === 'relation_occurrence').length, relationOccurrencesBefore,
  'mentioning a relation fabricated a new worldly relation occurrence');

const mentions = (M.knowledge?.current?.facts || []).filter(fact =>
  fact.relation === 'ρ:kind' && fact.object === 'surface_expression_occurrence');
assert(mentions.length, 'grounded surface-only expression did not become a first-class occurrence in canonical M');
const mention = mentions.find(kindFact => {
  const id = kindFact.subject;
  return (M.knowledge?.current?.facts || []).some(fact =>
    fact.subject === id && fact.relation === 'ρ:surface' && fact.object === SURFACE) &&
    (M.knowledge?.current?.facts || []).some(fact =>
      fact.subject === id && fact.relation === 'ρ:refers_to' && fact.object?.ref === String(term));
});
assert(mention, 'surface occurrence did not refer to its raw-learned relation term');

const mentionId = mention.subject;
assert((M.knowledge?.current?.facts || []).some(fact =>
  fact.subject === mentionId && fact.relation === 'ρ:recognized_relation_reference' &&
  fact.object?.ref === String(term) && fact.derived_from === 'generic-surface-reference-recognition'),
  'generic relational closure could not reason from the grounded surface reference');

assert((M.knowledge?.facts || []).some(fact =>
  fact.subject === mentionId && fact.relation === 'ρ:within_surface_episode'),
  'surface reference occurrence lacks provenance to the lived utterance');

for (const forbidden of ['mention_state', 'reference_state', 'semantic_dictionary', 'language_state', 'world_model', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  raw_relation_and_word_grounded_without_structured_semantics: true,
  surface_only_utterance_became_M_occurrence: true,
  occurrence_referred_to_relation_term: true,
  generic_relational_rule_consumed_reference: true,
  mention_did_not_assert_new_world_contact: true,
  utterance_provenance_retained: true,
  parallel_reference_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('GROUNDED SURFACE REFERENCE INTEGRATION: PASS');
