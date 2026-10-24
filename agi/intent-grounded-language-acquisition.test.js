'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// One falsification for child-like intent-grounded language acquisition.
//
// No semantic channel, relation triple, dictionary entry, parsed command, output
// demonstration, or pre-grounded word is supplied. Utterances are only heard.
// Actions and their consequences are separate lived contacts. Initial wording is
// crossed and varied so exact action-specific sentences cannot reach support while
// the stable action-bearing word can. Later, a genuinely absent synonym is learned
// in the same life by sharing intent with an already-grounded word. The new word is
// then required to control action inside wording never demonstrated.

const COMMAND_A = 'raise';
const COMMAND_B = 'lower';
const LATE_WORD = 'ascend';
const FILLERS = ['look', 'ready', 'again', 'okay'];
const CONCERN_BASE = 50;
const TRAINING_ROUNDS = 12;
const LATE_ROUNDS = 9;
const TEMPORAL_SUPPORT = 8;

const A_FORMS = [
  'please raise now',
  'could you raise',
  'raise it please',
];
const B_FORMS = [
  'please lower now',
  'could you lower',
  'lower it please',
];
const HELD_OUT_A = 'please could you raise it now';
const HELD_OUT_B = 'please could you lower it now';

// The late word is never defined. Each teaching utterance simply places it in the
// same live intent as a word M already understands. The known word must itself
// produce the action, and reality supplies the consequence afterwards.
const LATE_TEACH_FORMS = [
  'ascend please raise now',
  'could you ascend and raise',
  'raise it ascend please',
];
const HELD_OUT_LATE = 'please could you ascend it now';

for (const file of [
  'mind.js',
  'mind-relational.js',
  'generic-lived-occurrences.js',
  'relation-sequence-recompression.js',
  'surface-relation-grounding.js',
]) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const word of [COMMAND_A, COMMAND_B, LATE_WORD])
    assert(!source.includes(`'${word}'`) && !source.includes(`\"${word}\"`), `${file} contains curriculum-specific knowledge: ${word}`);
}

for (const form of [...A_FORMS, ...B_FORMS]) {
  const appearances = TRAINING_ROUNDS / 3;
  assert(appearances < TEMPORAL_SUPPORT, 'an exact initial training phrase could reach temporal support by itself');
}
for (const form of LATE_TEACH_FORMS) {
  const appearances = LATE_ROUNDS / 3;
  assert(appearances < TEMPORAL_SUPPORT, 'an exact late teaching phrase could reach temporal support by itself');
}
assert(!A_FORMS.includes(HELD_OUT_A) && !B_FORMS.includes(HELD_OUT_B) && !LATE_TEACH_FORMS.includes(HELD_OUT_LATE));

const M = Mind.one(2, 1);
assert.strictEqual(M.whole, 1);

function neutralFrame(concern = CONCERN_BASE) {
  const t = M.contacts.length;
  return [((t * 7) % 11) / 10, concern];
}

for (let i = 0; i < 4; i++) Mind.C(M, { frame: neutralFrame() });
const ACTION_A = M.motor;
const ACTION_B = ACTION_A === 0 ? 1 : 0;

// Initial caregiver/world staging only makes both embodied outcomes available
// before either word has meaning. Nothing about the intended word enters M.
function moveMotorTo(target) {
  for (let i = 0; i < 6 && M.motor !== target; i++) Mind.C(M, { frame: neutralFrame() });
  assert.strictEqual(M.motor, target, `initial embodiment failed to expose actuator ${target}`);
}
function hear(raw) { Mind.C(M, { surface: { input: raw } }); }

function hasLivedExpression(raw) {
  const term = `surface:${raw}`;
  const facts = M.knowledge?.facts || [];
  const occurrences = new Set(facts.filter(f =>
    f.relation === 'ρ:instantiates' && f.object?.ref === term).map(f => String(f.subject)));
  return facts.some(f => occurrences.has(String(f.subject)) && f.relation === 'ρ:kind' && f.object === 'lived_occurrence');
}
function hasAnySurfaceTerm(raw) {
  const term = `surface:${raw}`;
  return (M.knowledge?.facts || []).some(f => f.subject === term || f.object?.ref === term);
}

function consequenceFor(intendedAction, actualAction) {
  return actualAction === intendedAction ? CONCERN_BASE - 12 : CONCERN_BASE + 12;
}
const CONTEXT_CONCERN = { look: 53, ready: 48, again: 55, okay: 46 };

function demonstrate(raw, intendedAction, filler) {
  moveMotorTo(intendedAction);
  hear(raw);
  assert(hasLivedExpression(raw), 'unknown raw utterance never became lived relational material');
  const acted = M.motor;
  Mind.C(M, { frame: neutralFrame(consequenceFor(intendedAction, acted)) });
  assert.strictEqual(acted, intendedAction, 'initial teaching interaction failed to enact intended action');
  hear(filler);
  Mind.C(M, { frame: neutralFrame(CONTEXT_CONCERN[filler]) });
}

for (let round = 0; round < TRAINING_ROUNDS; round++) {
  demonstrate(A_FORMS[round % A_FORMS.length], ACTION_A, FILLERS[round % FILLERS.length]);
  demonstrate(B_FORMS[(round + 1) % B_FORMS.length], ACTION_B, FILLERS[(round * 3 + 1) % FILLERS.length]);
}

assert.strictEqual((M.knowledge?.facts || []).some(f =>
  (f.subject === `surface:${COMMAND_A}` || f.subject === `surface:${COMMAND_B}`) && f.relation === 'ρ:expresses'), false,
  'test accidentally pre-grounded an action word through an explicit semantic expression link');
assert(hasLivedExpression(COMMAND_A));
assert(hasLivedExpression(COMMAND_B));

function orderedRelationExpansions() {
  const facts = M.knowledge?.facts || [];
  const ids = new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === 'learned_ordered_relation').map(f => String(f.subject)));
  return facts.filter(f => ids.has(String(f.subject)) && f.relation === 'ρ:ordered_expansion' && Array.isArray(f.object))
    .map(f => ({ id: String(f.subject), expansion: f.object }));
}
function eventTerms(component) {
  return (component?.simultaneous_relations || []).filter(x => x?.ref !== undefined).map(x => String(x.ref));
}
function hasLearnedSuccessor(anchor, successor) {
  return orderedRelationExpansions().some(row => row.expansion.length === 2 &&
    eventTerms(row.expansion[0]).includes(anchor) && eventTerms(row.expansion[1]).includes(successor));
}

assert(hasLearnedSuccessor(`surface:${COMMAND_A}`, `action:motor:${ACTION_A}`),
  'stable lived experience did not learn the first word-to-action successor');
assert(hasLearnedSuccessor(`surface:${COMMAND_B}`, `action:motor:${ACTION_B}`),
  'stable lived experience did not learn the second word-to-action successor');

// Shared context words occur under both opposed intents and therefore cannot be
// accepted as the action discriminator.
for (const shared of ['please', 'could', 'you', 'now', 'it']) {
  assert(!(hasLearnedSuccessor(`surface:${shared}`, `action:motor:${ACTION_A}`) &&
           hasLearnedSuccessor(`surface:${shared}`, `action:motor:${ACTION_B}`)),
    `shared context token ${shared} became an indiscriminate command shortcut`);
}

function probe(raw, expectedAction, startingAction) {
  // Use learned language itself to establish the opposing starting action once
  // initial acquisition has succeeded; no later physical teacher staging occurs.
  if (startingAction === ACTION_A) hear(HELD_OUT_A);
  else hear(HELD_OUT_B);
  assert.strictEqual(M.motor, startingAction, 'learned language could not establish probe starting action');
  hear('wait');
  assert.strictEqual(M.motor, startingAction);
  hear(raw);
  assert.strictEqual(M.motor, expectedAction,
    `held-out utterance ${JSON.stringify(raw)} did not recover its lived intended action`);
}

probe(HELD_OUT_A, ACTION_A, ACTION_B);
probe(HELD_OUT_B, ACTION_B, ACTION_A);

// Continuous learning. `ascend` and every phrase containing it are absent from the
// earlier life. Each late episode first uses known `lower` to establish the
// opposing actuator. The teaching utterance then contains both new `ascend` and
// known `raise`; `raise` must make M enact ACTION_A. The new word therefore shares
// an independently grounded intent/action/consequence episode without any semantic
// definition or direct motor staging.
assert.strictEqual(hasAnySurfaceTerm(LATE_WORD), false, 'late word leaked into earlier life');
for (let round = 0; round < LATE_ROUNDS; round++) {
  hear(HELD_OUT_B);
  assert.strictEqual(M.motor, ACTION_B, 'known lower intent failed before late teaching episode');
  const raw = LATE_TEACH_FORMS[round % LATE_TEACH_FORMS.length];
  hear(raw);
  assert(hasLivedExpression(LATE_WORD), 'late word did not enter lived M');
  const acted = M.motor;
  assert.strictEqual(acted, ACTION_A, 'known raise intent inside late teaching utterance failed to enact ACTION_A');
  Mind.C(M, { frame: neutralFrame(consequenceFor(ACTION_A, acted)) });
  const filler = FILLERS[(round + 2) % FILLERS.length];
  hear(filler);
  Mind.C(M, { frame: neutralFrame(CONTEXT_CONCERN[filler]) });
}

assert.strictEqual((M.knowledge?.facts || []).some(f =>
  f.subject === `surface:${LATE_WORD}` && f.relation === 'ρ:expresses'), false,
  'late word received an explicit semantic dictionary link');
assert(hasLearnedSuccessor(`surface:${LATE_WORD}`, `action:motor:${ACTION_A}`),
  'late-life shared intent did not acquire the new word');
probe(HELD_OUT_LATE, ACTION_A, ACTION_B);

const facts = M.knowledge?.facts || [];
assert(facts.some(f => f.relation === 'ρ:expects_term' &&
  (f.object?.ref === `action:motor:${ACTION_A}` || f.object?.ref === `action:motor:${ACTION_B}`)),
  'successful language use produced no M-owned expected action term');

for (const forbidden of [
  'english_parser', 'semantic_dictionary', 'language_state', 'command_table',
  'intent_table', 'planner', 'policy', 'reward_policy', 'teacher_state',
]) assert.strictEqual(M[forbidden], undefined, `parallel language/action authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  semantic_relations_supplied_during_language_learning: 0,
  pregrounded_command_words: 0,
  parsed_commands_supplied: 0,
  raw_unknown_expressions_became_lived_material: true,
  action_and_consequence_are_separate_reality_contacts: true,
  opposed_intents_learned_from_varied_wording: true,
  exact_action_specific_phrase_below_support_threshold: true,
  shared_context_words_crossed_between_intents: true,
  initial_held_out_surface_combinations: [HELD_OUT_A, HELD_OUT_B],
  late_word_absent_before_late_life: true,
  late_word_teacher_semantics_supplied: 0,
  late_word_bootstrapped_through_already_grounded_intent: true,
  late_held_out_surface_combination: HELD_OUT_LATE,
  continuous_language_controls_existing_actuator_via_M: true,
  hidden_command_or_language_authority: false,
}, null, 2));
console.log('CONTINUOUS INTENT-GROUNDED LANGUAGE ACQUISITION AND TRANSFER: PASS');
