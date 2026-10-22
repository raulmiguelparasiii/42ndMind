'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Frontier falsification:
// a grounded expression must become usable as the prefix of an independently
// learned lived expression -> action order. A later expression-only cue must
// produce an open M-owned expectation for one of multiple existing action terms
// and the physical actuator boundary must realize that expectation without a
// cue table, planner, reward policy, or command-specific branch. Later opposite
// lived order must reopen the cue as conflict rather than leave a copied policy.

const CUE = 'velin_cue_73';
const FILLERS = ['mora_fill_11', 'tavi_fill_28', 'selo_fill_46', 'pira_fill_65'];
const SURFACE_CUE = `surface:${CUE}`;
const CONCERN = 29;
const TRAIN = 40;
const CADENCE = 8;
const GROUND_EPISODES = 3;
const ASSOCIATIONS = 12;

for (const file of [
  'mind.js',
  'mind-relational.js',
  'surface-relation-grounding.js',
  'generic-lived-occurrences.js',
  'relation-sequence-recompression.js',
]) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes(CUE), `${file} contains test-specific cue fixture`);
  for (const filler of FILLERS)
    assert(!source.includes(filler), `${file} contains test-specific filler fixture`);
}

let seed = 0x73ac51e9;
function random() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}
function relationValue(x) { return 1.731 * x - 0.392; }
function groundingFrame() {
  const x = random() * 4 - 2;
  return [x, relationValue(x), CONCERN];
}
function neutralFrame() { return [null, null, CONCERN]; }
function surface(input) { return { surface: { input, output: 'ack.' } }; }

const M = Mind.one(2, 1);
for (let i = 0; i < TRAIN; i++) Mind.C(M, { frame: groundingFrame() });
assert.strictEqual(M.whole, 1);
assert.strictEqual(M.action_count, 2);

function continuousRelation() {
  return (M.knowledge?.current?.facts || []).find(fact =>
    fact.subject === 'receptor:p0' && fact.relation === 'ρ:continuous_dependence' &&
    fact.object?.target === 'receptor:p1' && fact.object?.lag === 0 && fact.object?.transform);
}
function relationTermFor(relation) {
  return (M.knowledge?.facts || []).find(fact =>
    fact.relation === 'ρ:relation_object' && fact.object?.target === relation.object.target &&
    fact.object?.lag === relation.object.lag && fact.object?.orientation === relation.object.orientation &&
    fact.object?.transform?.kind === relation.object.transform?.kind)?.subject;
}
assert(continuousRelation(), 'raw relation was not learned before expression/action training');

const layouts = [
  [CUE, ...FILLERS],
  [FILLERS[1], CUE, FILLERS[3], FILLERS[0], FILLERS[2]],
  [FILLERS[3], FILLERS[2], CUE, FILLERS[1], FILLERS[0]],
];
let grounded = 0;
while (grounded < GROUND_EPISODES) {
  const next = (M.contacts?.length || 0) + 1;
  const onCadence = next % CADENCE === 0;
  Mind.C(M, {
    frame: groundingFrame(),
    ...(onCadence ? { surface: {
      input: `ctx_${grounded} ${layouts[grounded].join(' ')} tail_${grounded}`,
      output: 'ack.',
    } } : {}),
  });
  if (onCadence) grounded++;
}

const relation = continuousRelation();
const relationTerm = relation && relationTermFor(relation);
assert(relationTerm, 'learned raw relation lacks a first-class term');
for (const word of [CUE, ...FILLERS]) {
  const term = `surface:${word}`;
  assert((M.knowledge?.current?.facts || []).some(f =>
    f.subject === term && f.relation === 'ρ:expresses' && f.object?.ref === String(relationTerm)),
    `${term} did not ground from lived co-occurrence`);
}

function actionTerm(index) { return `action:motor:${index}`; }
for (let index = 0; index < 2; index++) {
  const term = actionTerm(index);
  assert((M.knowledge?.facts || []).some(f =>
    f.subject === term && f.relation === 'ρ:kind' && f.object === 'action_term'),
    `actuator ${index} never became a first-class action term`);
  assert((M.knowledge?.facts || []).some(f =>
    f.subject === term && f.relation === 'ρ:actuator_index' && f.object === index),
    `action term ${term} is not grounded to its existing actuator index`);
}

// Choose the first target from the actual live motor boundary rather than naming
// one action as semantically preferred. The other available actuator becomes the
// later contradictory route.
assert(Number.isInteger(M.motor) && M.motor >= 0 && M.motor < 2,
  'existing embodied motor boundary is unavailable');
const TARGET_A = M.motor;
const TARGET_B = TARGET_A === 0 ? 1 : 0;

function moveMotorTo(target) {
  for (let i = 0; i < 8 && M.motor !== target; i++) Mind.C(M, { frame: neutralFrame() });
  assert.strictEqual(M.motor, target, `existing motor variation could not expose actuator ${target}`);
}
function trainCueTo(target, other, offset = 0) {
  for (let i = 0; i < ASSOCIATIONS; i++) {
    moveMotorTo(target);
    Mind.C(M, surface(CUE));
    Mind.C(M, { frame: neutralFrame() }); // lived action = target
    assert.strictEqual(M.motor, other,
      'neutral embodiment no longer exposes the alternate actuator after the target action');
    Mind.C(M, surface(FILLERS[(i + offset) % FILLERS.length]));
    Mind.C(M, { frame: neutralFrame() }); // consume alternate action; next motor returns target
    Mind.C(M, surface(FILLERS[(i * 3 + 1 + offset) % FILLERS.length]));
  }
}
function factsAtCurrentOrder() {
  const order = M.structure?.lived_contact_order;
  const facts = M.knowledge?.facts || [];
  return { order, facts };
}
function expectationForAction(order, term) {
  const facts = M.knowledge?.facts || [];
  const ids = new Set(facts.filter(f =>
    f.relation === 'ρ:kind' && f.object === 'temporal_expectation').map(f => String(f.subject)));
  return [...ids].find(id =>
    facts.some(f => String(f.subject) === id && f.relation === 'ρ:after_lived_order' && f.object === order) &&
    facts.some(f => String(f.subject) === id && f.relation === 'ρ:expects_term' && f.object?.ref === term));
}
function conflictAt(order) {
  const facts = M.knowledge?.facts || [];
  const ids = new Set(facts.filter(f =>
    f.relation === 'ρ:kind' && f.object === 'temporal_expectation_conflict').map(f => String(f.subject)));
  return [...ids].find(id => facts.some(f =>
    String(f.subject) === id && f.relation === 'ρ:after_lived_order' && f.object === order));
}
function assertNotObservedHere(order, term) {
  const facts = M.knowledge?.facts || [];
  const lived = new Set(facts.filter(f =>
    f.relation === 'ρ:lived_order' && f.object === order).map(f => String(f.subject)));
  assert.strictEqual(facts.some(f => lived.has(String(f.subject)) &&
    f.relation === 'ρ:instantiates' && f.object?.ref === term), false,
  `expected action ${term} was fabricated as an observed occurrence`);
}

trainCueTo(TARGET_A, TARGET_B, 0);

// Make the pre-cue physical motor point to the other actuator. Passing therefore
// requires the new M-owned expectation to actually cross the actuator boundary.
moveMotorTo(TARGET_B);
Mind.C(M, surface(FILLERS[0]));
assert.strictEqual(M.motor, TARGET_B);
Mind.C(M, surface(CUE));
let { order: firstProbeOrder } = factsAtCurrentOrder();
const firstExpectedTerm = actionTerm(TARGET_A);
const firstExpectation = expectationForAction(firstProbeOrder, firstExpectedTerm);
assert(firstExpectation,
  'learned expression/action order did not produce an M-owned expected action term');
assertNotObservedHere(firstProbeOrder, firstExpectedTerm);
assert.strictEqual(M.motor, TARGET_A,
  'expected action term did not realize through the existing actuator boundary');

// Reverse the cue/action evidence under an independently grounded embodied route.
// Reality now makes TARGET_B lower the open concern. Once canonical embodied
// completion grounds B, a surface-only cue may not override that independent live
// route merely because old temporal order expects A. This lets opposite lived
// cue->B evidence accumulate without test-side motor mutation.
let bodyConcern = 220;
function bodyStep(preferred) {
  const action = M.motor;
  bodyConcern += action === preferred ? -5 : 2;
  bodyConcern = Math.max(20, Math.min(240, bodyConcern));
  Mind.C(M, { frame: [null, null, bodyConcern] });
  return action;
}
let embodiedGrounded = false;
for (let i = 0; i < 36; i++) {
  bodyStep(TARGET_B);
  if (M.motor === TARGET_B && M.current?.continuation?.grounded) {
    embodiedGrounded = true;
    if (i >= 18) break;
  }
}
assert(embodiedGrounded,
  'independent embodied action/consequence learning did not ground the alternate actuator');

for (let i = 0; i < ASSOCIATIONS; i++) {
  for (let guard = 0; guard < 8 && !(M.motor === TARGET_B && M.current?.continuation?.grounded); guard++)
    bodyStep(TARGET_B);
  assert.strictEqual(M.motor, TARGET_B, 'independent embodied route lost the alternate actuator');
  assert.strictEqual(M.current?.continuation?.grounded, true,
    'alternate actuator was no longer grounded before contradictory cue contact');

  // Until enough contrary temporal evidence exists, the old cue can still expect A.
  // A grounded bodily continuation is independent support and must not be erased by
  // that temporal route.
  Mind.C(M, surface(CUE));
  assert.strictEqual(M.motor, TARGET_B,
    'old temporal cue expectation overrode an independently grounded motor route');
  bodyStep(TARGET_B); // lived action = TARGET_B
  Mind.C(M, surface(FILLERS[(i + 2) % FILLERS.length]));
  Mind.C(M, surface(FILLERS[(i * 3 + 3) % FILLERS.length]));
}

for (let guard = 0; guard < 8 && !(M.motor === TARGET_B && M.current?.continuation?.grounded); guard++)
  bodyStep(TARGET_B);
Mind.C(M, surface(FILLERS[2]));
const motorBeforeConflict = M.motor;
Mind.C(M, surface(CUE));
const { order: conflictOrder } = factsAtCurrentOrder();
assert(conflictAt(conflictOrder),
  'opposite lived expression/action evidence did not reopen the cue as a temporal conflict');
assert.strictEqual(expectationForAction(conflictOrder, actionTerm(TARGET_A)), undefined,
  'conflicted cue retained a unique old action expectation');
assert.strictEqual(expectationForAction(conflictOrder, actionTerm(TARGET_B)), undefined,
  'conflicted cue was silently replaced by a unique new action expectation');
assert.strictEqual(M.motor, motorBeforeConflict,
  'open temporal action conflict displaced the independently grounded motor');

for (const forbidden of ['planner', 'policy', 'reward_policy', 'action_table', 'command_table', 'temporal_action_state'])
  assert.strictEqual(M[forbidden], undefined, `parallel action authority appeared: ${forbidden}`);
assert((M.knowledge?.facts || []).some(f => f.relation === 'ρ:input_raw' && String(f.object).includes(CUE)),
  'exact surface cue history was not retained');

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  multiple_existing_actuators: true,
  grounded_expression_occurrence: SURFACE_CUE,
  expression_action_order_learned_from_lived_occurrences: true,
  expected_action_first_class_in_M: true,
  expected_action_not_fabricated_as_observed: true,
  expected_action_realized_through_existing_actuator_boundary: true,
  opposite_lived_order_reopens_action_warrant: true,
  action_conflict_left_unresolved: true,
  planner_or_cue_table_added: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('GROUNDED EXPRESSION -> ACTION REALIZATION: PASS');
