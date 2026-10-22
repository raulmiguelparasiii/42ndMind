'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Frontier only: lexical grounding and generic occurrence formation are already
// independently demonstrated regressions. Start from the established precondition
// that opaque expressions are M-grounded, then test the genuinely new connection:
// lived expression -> action order -> current expected action -> actuator boundary.

const CUE = 'velin_cue_73';
const FILLERS = ['mora_fill_11', 'tavi_fill_28', 'selo_fill_46', 'pira_fill_65'];
const SURFACE_CUE = `surface:${CUE}`;
const MEANING = 'fixture:already-grounded-relation';
const CONCERN = 29;
const ASSOCIATIONS = 12;

for (const file of [
  'mind.js',
  'mind-relational.js',
  'generic-lived-occurrences.js',
  'relation-sequence-recompression.js',
]) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes(CUE), `${file} contains test-specific cue fixture`);
  for (const filler of FILLERS)
    assert(!source.includes(filler), `${file} contains test-specific filler fixture`);
}

function ref(id) { return { ref: String(id) }; }
function neutralFrame() { return [null, CONCERN]; }
function surface(input) { return { surface: { input, output: 'ack.' } }; }
function actionTerm(index) { return `action:motor:${index}`; }

const M = Mind.one(2, 1);
assert.strictEqual(M.whole, 1);
assert.strictEqual(M.action_count, 2);

// Reuse the already-demonstrated lexical-grounding result rather than re-running
// continuous relation discovery and cross-modal schooling inside this frontier.
// This supplies no cue->action relation; it only states that each surface term is
// already attached to ordinary first-class M meaning.
Mind.C(M, { relations: { facts: [
  [MEANING, 'ρ:kind', 'relation_term'],
  [SURFACE_CUE, 'ρ:expresses', ref(MEANING)],
  ...FILLERS.map(word => [`surface:${word}`, 'ρ:expresses', ref(MEANING)]),
] } });

// Let the existing physical boundary expose both available actuator terms.
for (let i = 0; i < 3; i++) Mind.C(M, { frame: neutralFrame() });
for (let index = 0; index < 2; index++) {
  const term = actionTerm(index);
  assert((M.knowledge?.facts || []).some(f =>
    f.subject === term && f.relation === 'ρ:kind' && f.object === 'action_term'),
    `actuator ${index} never became a first-class action term`);
  assert((M.knowledge?.facts || []).some(f =>
    f.subject === term && f.relation === 'ρ:actuator_index' && f.object === index),
    `action term ${term} is not grounded to its existing actuator index`);
}

assert(Number.isInteger(M.motor) && M.motor >= 0 && M.motor < 2,
  'existing embodied motor boundary is unavailable');
const TARGET = M.motor;
const OTHER = TARGET === 0 ? 1 : 0;

function moveMotorTo(target) {
  for (let i = 0; i < 4 && M.motor !== target; i++) Mind.C(M, { frame: neutralFrame() });
  assert.strictEqual(M.motor, target, `physical variation could not expose actuator ${target}`);
}

// Four rotating filler expressions prevent boundary/phase pairs from repeating
// enough to compete with cue -> TARGET. Only that adjacency occurs twelve times.
for (let i = 0; i < ASSOCIATIONS; i++) {
  moveMotorTo(TARGET);
  Mind.C(M, surface(CUE));
  Mind.C(M, { frame: neutralFrame() }); // lived action = TARGET
  assert.strictEqual(M.motor, OTHER,
    'neutral embodiment no longer exposes the alternate actuator after TARGET');
  Mind.C(M, surface(FILLERS[i % FILLERS.length]));
  Mind.C(M, { frame: neutralFrame() }); // lived action = OTHER; next motor returns TARGET
  Mind.C(M, surface(FILLERS[(i * 3 + 1) % FILLERS.length]));
}

// Make current motor the other actuator and break adjacency before the probe.
// Passing therefore requires the learned M expectation to cross A mechanically.
moveMotorTo(OTHER);
Mind.C(M, surface(FILLERS[0]));
assert.strictEqual(M.motor, OTHER);
Mind.C(M, surface(CUE));

const currentOrder = M.structure?.lived_contact_order;
assert(Number.isFinite(currentOrder), 'current lived order is unavailable');
const facts = M.knowledge?.facts || [];
const expectedTerm = actionTerm(TARGET);
const expectationIds = new Set(facts.filter(f =>
  f.relation === 'ρ:kind' && f.object === 'temporal_expectation').map(f => String(f.subject)));
const expectation = [...expectationIds].find(id =>
  facts.some(f => String(f.subject) === id && f.relation === 'ρ:after_lived_order' && f.object === currentOrder) &&
  facts.some(f => String(f.subject) === id && f.relation === 'ρ:expects_term' && f.object?.ref === expectedTerm));
assert(expectation,
  'generic lived expression/action order did not produce an M-owned expected action term');

// Expectation is not observation. The cue happened; the expected action has not.
const livedHere = new Set(facts.filter(f =>
  f.relation === 'ρ:lived_order' && f.object === currentOrder).map(f => String(f.subject)));
assert.strictEqual(facts.some(f => livedHere.has(String(f.subject)) &&
  f.relation === 'ρ:instantiates' && f.object?.ref === expectedTerm), false,
'expected action was fabricated as an observed occurrence');

// This is the preserved missing connection. Temporal meaning is already in M;
// the physical boundary must map its existing action term to the existing motor.
assert.strictEqual(M.motor, TARGET,
  'expected action term did not realize through the existing actuator boundary');

for (const forbidden of ['planner', 'policy', 'reward_policy', 'action_table', 'command_table', 'temporal_action_state'])
  assert.strictEqual(M[forbidden], undefined, `parallel action authority appeared: ${forbidden}`);
assert((M.knowledge?.facts || []).some(f => f.relation === 'ρ:input_raw' && String(f.object).includes(CUE)),
  'exact cue history was not retained');

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  established_grounding_precondition_reused: true,
  multiple_existing_actuators: true,
  grounded_expression_occurrence: SURFACE_CUE,
  expression_action_order_learned_from_lived_occurrences: true,
  expected_action_first_class_in_M: true,
  expected_action_not_fabricated_as_observed: true,
  expected_action_realized_through_existing_actuator_boundary: true,
  planner_or_cue_table_added: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('GROUNDED EXPRESSION -> ACTION REALIZATION: PASS');
