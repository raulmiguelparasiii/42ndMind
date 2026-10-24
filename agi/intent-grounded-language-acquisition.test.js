'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// One falsification for the missing child-like language bridge.
//
// No semantic channel, relation triple, dictionary entry, parsed command, output
// demonstration, or pre-grounded word is supplied. An utterance is only heard.
// The individual's next physical action and the world consequence are later lived
// contacts. Passing requires the one M/C substrate to discover enough stable order
// to let a later raw utterance constrain action through M's existing temporal
// completion machinery.
//
// The evaluator knows which action the other agent intends only to generate and
// score world consequences. That mapping is never presented to M.

const COMMAND_A = 'raise';
const COMMAND_B = 'lower';
const FILLERS = ['look', 'ready', 'again', 'okay'];
const CONCERN_BASE = 50;
const TRAINING_ROUNDS = 12;

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
  // Arrange a real successful interaction: hear -> act -> consequence. Targeting
  // the motor is teacher/world staging outside M, analogous to a caregiver making
  // the referent/action clear. No internal semantic fact is inserted.
  moveMotorTo(intendedAction);
  hear(raw);

  // Fail at the first missing prerequisite rather than spending a full curriculum
  // before discovering that unheard language never entered the lived substrate.
  assert(hasLivedExpression(raw), 'unknown raw command never became lived relational material');

  const acted = M.motor;
  Mind.C(M, { frame: neutralFrame(consequenceFor(intendedAction, acted)) });
  assert.strictEqual(acted, intendedAction, 'training interaction failed to enact intended action');

  // Break phase-only recurrence with unrelated language and physical variation.
  hear(filler);
  Mind.C(M, { frame: neutralFrame(CONTEXT_CONCERN[filler]) });
}

for (let round = 0; round < TRAINING_ROUNDS; round++) {
  demonstrate(COMMAND_A, ACTION_A, FILLERS[round % FILLERS.length]);
  demonstrate(COMMAND_B, ACTION_B, FILLERS[(round * 3 + 1) % FILLERS.length]);
}

// There was never an externally supplied semantic interpretation of either word.
assert.strictEqual((M.knowledge?.facts || []).some(f =>
  (f.subject === `surface:${COMMAND_A}` || f.subject === `surface:${COMMAND_B}`) && f.relation === 'ρ:expresses'), false,
  'test accidentally pre-grounded a command through an explicit semantic expression link');
assert(hasLivedExpression(COMMAND_A));
assert(hasLivedExpression(COMMAND_B));

function probe(raw, expectedAction, startingAction) {
  moveMotorTo(startingAction);
  hear('wait');
  assert.strictEqual(M.motor, startingAction);
  hear(raw);
  assert.strictEqual(M.motor, expectedAction,
    `raw utterance ${JSON.stringify(raw)} did not recover its lived intended action`);
}

probe(COMMAND_A, ACTION_A, ACTION_B);
probe(COMMAND_B, ACTION_B, ACTION_A);

const facts = M.knowledge?.facts || [];
const learnedOrdered = new Set(facts.filter(f =>
  f.relation === 'ρ:kind' && f.object === 'learned_ordered_relation').map(f => String(f.subject)));
assert(learnedOrdered.size > 0, 'no generic ordered relation was learned from the interactions');
assert(facts.some(f => f.relation === 'ρ:expects_term' &&
  (f.object?.ref === `action:motor:${ACTION_A}` || f.object?.ref === `action:motor:${ACTION_B}`)),
  'successful command use produced no M-owned expected action term');

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
  both_opposed_intents_learned: true,
  surface_only_intent_controls_existing_actuator_via_M: true,
  hidden_command_or_language_authority: false,
}, null, 2));
console.log('INTENT-GROUNDED LANGUAGE ACQUISITION: PASS');
