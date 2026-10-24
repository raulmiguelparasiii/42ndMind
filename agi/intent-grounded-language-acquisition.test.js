'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// One falsification for child-like intent-grounded language acquisition.
//
// No semantic channel, relation triple, dictionary entry, parsed command, output
// demonstration, or pre-grounded word is supplied. Utterances are only heard.
// Actions and their consequences are separate lived contacts. Training wording is
// deliberately crossed and varied: no exact action-specific phrase reaches the
// temporal support threshold, while the action-bearing word does. Held-out probes
// combine familiar pieces in forms never demonstrated. Passing therefore requires
// stable relational learning below whole-utterance memorization.

const COMMAND_A = 'raise';
const COMMAND_B = 'lower';
const FILLERS = ['look', 'ready', 'again', 'okay'];
const CONCERN_BASE = 50;
const TRAINING_ROUNDS = 12;
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

for (const file of [
  'mind.js',
  'mind-relational.js',
  'generic-lived-occurrences.js',
  'relation-sequence-recompression.js',
  'surface-relation-grounding.js',
]) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const word of [COMMAND_A, COMMAND_B])
    assert(!source.includes(`'${word}'`) && !source.includes(`\"${word}\"`), `${file} contains command-specific knowledge: ${word}`);
}

// Each exact action-specific training utterance occurs below the learner's support
// threshold. The recurring lexical invariant is the action-bearing word itself.
for (const form of [...A_FORMS, ...B_FORMS]) {
  const appearances = TRAINING_ROUNDS / 3;
  assert(appearances < TEMPORAL_SUPPORT, 'an exact training phrase could reach temporal support by itself');
}
assert(!A_FORMS.includes(HELD_OUT_A) && !B_FORMS.includes(HELD_OUT_B));

const M = Mind.one(2, 1);
assert.strictEqual(M.whole, 1);

function neutralFrame(concern = CONCERN_BASE) {
  const t = M.contacts.length;
  return [((t * 7) % 11) / 10, concern];
}

for (let i = 0; i < 4; i++) Mind.C(M, { frame: neutralFrame() });
const ACTION_A = M.motor;
const ACTION_B = ACTION_A === 0 ? 1 : 0;

function moveMotorTo(target) {
  for (let i = 0; i < 6 && M.motor !== target; i++) Mind.C(M, { frame: neutralFrame() });
  assert.strictEqual(M.motor, target, `embodiment failed to expose actuator ${target}`);
}

function hear(raw) {
  Mind.C(M, { surface: { input: raw } });
}

function hasLivedExpression(raw) {
  const term = `surface:${raw}`;
  const facts = M.knowledge?.facts || [];
  const occurrences = new Set(facts.filter(f =>
    f.relation === 'ρ:instantiates' && f.object?.ref === term).map(f => String(f.subject)));
  return facts.some(f => occurrences.has(String(f.subject)) && f.relation === 'ρ:kind' && f.object === 'lived_occurrence');
}

function consequenceFor(intendedAction, actualAction) {
  return actualAction === intendedAction ? CONCERN_BASE - 12 : CONCERN_BASE + 12;
}

const CONTEXT_CONCERN = {
  look: CONCERN_BASE + 3,
  ready: CONCERN_BASE - 2,
  again: CONCERN_BASE + 5,
  okay: CONCERN_BASE - 4,
};

function demonstrate(raw, intendedAction, filler) {
  // Caregiver/world staging makes a successful referent/action episode available
  // without inserting its interpretation into M: hear -> embodied action -> result.
  moveMotorTo(intendedAction);
  hear(raw);
  assert(hasLivedExpression(raw), 'unknown raw utterance never became lived relational material');

  const acted = M.motor;
  Mind.C(M, { frame: neutralFrame(consequenceFor(intendedAction, acted)) });
  assert.strictEqual(acted, intendedAction, 'training interaction failed to enact intended action');

  // Unrelated language and physical variation prevent phase-only recurrence.
  hear(filler);
  Mind.C(M, { frame: neutralFrame(CONTEXT_CONCERN[filler]) });
}

for (let round = 0; round < TRAINING_ROUNDS; round++) {
  demonstrate(A_FORMS[round % A_FORMS.length], ACTION_A, FILLERS[round % FILLERS.length]);
  demonstrate(B_FORMS[(round + 1) % B_FORMS.length], ACTION_B, FILLERS[(round * 3 + 1) % FILLERS.length]);
}

// No explicit semantic interpretation of either verb was ever supplied.
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

// Shared context words were deliberately crossed over both opposed intentions.
// They must not become the action discriminator.
for (const shared of ['please', 'could', 'you', 'now', 'it']) {
  assert(!(hasLearnedSuccessor(`surface:${shared}`, `action:motor:${ACTION_A}`) &&
           hasLearnedSuccessor(`surface:${shared}`, `action:motor:${ACTION_B}`)),
    `shared context token ${shared} became an indiscriminate command shortcut`);
}

function probe(raw, expectedAction, startingAction) {
  moveMotorTo(startingAction);
  hear('wait');
  assert.strictEqual(M.motor, startingAction);
  hear(raw);
  assert.strictEqual(M.motor, expectedAction,
    `held-out utterance ${JSON.stringify(raw)} did not recover its lived intended action`);
}

// Neither whole probe utterance occurred during schooling. The same learned word
// meaning must remain effective inside a new surface context.
probe(HELD_OUT_A, ACTION_A, ACTION_B);
probe(HELD_OUT_B, ACTION_B, ACTION_A);

const facts = M.knowledge?.facts || [];
const learnedOrdered = new Set(facts.filter(f =>
  f.relation === 'ρ:kind' && f.object === 'learned_ordered_relation').map(f => String(f.subject)));
assert(learnedOrdered.size > 0, 'no generic ordered relation was learned from the interactions');
assert(facts.some(f => f.relation === 'ρ:expects_term' &&
  (f.object?.ref === `action:motor:${ACTION_A}` || f.object?.ref === `action:motor:${ACTION_B}`)),
  'successful held-out command use produced no M-owned expected action term');

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
  demonstrated_outputs_supplied: 0,
  raw_unknown_expressions_became_lived_material: true,
  action_and_consequence_followed_as_separate_reality_contacts: true,
  opposed_intents_learned_from_varied_wording: true,
  exact_action_specific_phrase_below_support_threshold: true,
  shared_context_words_crossed_between_intents: true,
  held_out_surface_combinations: [HELD_OUT_A, HELD_OUT_B],
  held_out_language_controls_existing_actuator_via_M: true,
  hidden_command_or_language_authority: false,
}, null, 2));
console.log('INTENT-GROUNDED LANGUAGE ACQUISITION AND TRANSFER: PASS');
