'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');
const Canonical = require('../one-mind.js');

// Frontier only. Canonical bodily grounding is already independently demonstrated;
// establish it by the actual canonical C on this same M, without replaying every
// AGI adapter. Then the public AGI C alone receives the new cue/action evidence.

const CUE = 'reopen_cue_41';
const FILLERS = ['reopen_fill_12', 'reopen_fill_27', 'reopen_fill_53', 'reopen_fill_68'];
const SURFACE_CUE = `surface:${CUE}`;
const MEANING = 'fixture:already-grounded-reopening-relation';
const ASSOCIATIONS = 12;

for (const file of ['mind.js', 'mind-relational.js', 'generic-lived-occurrences.js', 'relation-sequence-recompression.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes(CUE), `${file} contains test-specific cue fixture`);
  for (const filler of FILLERS) assert(!source.includes(filler), `${file} contains test-specific filler fixture`);
}

function ref(id) { return { ref: String(id) }; }
function surface(input) { return { surface: { input, output: 'ack.' } }; }
function actionTerm(index) { return `action:motor:${index}`; }
function frameAt(t, c0, c1) { return [t % 3, (t * 2) % 5, 255, c0, c1]; }

const M = Mind.one(4, 2);

// Briefly expose each existing actuator through the public physical boundary so
// action_term -> actuator_index is ordinary M content. This teaches no consequence.
for (let i = 0; i < 8; i++) {
  Mind.C(M, { frame: frameAt(i, 600, 500) });
  const known = new Set((M.knowledge?.facts || []).filter(f => f.relation === 'ρ:actuator_index' &&
    Number.isInteger(f.object)).map(f => f.object));
  if (known.size === M.action_count) break;
}
for (let index = 0; index < M.action_count; index++) {
  assert((M.knowledge?.facts || []).some(f => f.subject === actionTerm(index) &&
    f.relation === 'ρ:actuator_index' && f.object === index), `actuator ${index} is not M-grounded`);
}

const A = M.motor;
const B = (A + 1) % M.action_count;

// Establish independent bodily B by actual canonical learning on the same M.
// Varying raw percepts and four motors avoid the known pure-alternation artifact.
let c0 = 600, c1 = 500;
function canonicalBodyStep() {
  const acted = M.motor;
  if (acted === B) { c0 -= 11; c1 -= 7; }
  else { c0 += 4; c1 += 3; }
  Canonical.C(M, frameAt(M.experiences.length, c0, c1));
  return acted;
}
let bodyGrounded = false;
for (let i = 0; i < 48; i++) {
  canonicalBodyStep();
  if (i >= 12 && M.motor === B && M.current?.continuation?.grounded === true) {
    bodyGrounded = true;
    break;
  }
}
assert(bodyGrounded, 'canonical embodied learner did not independently ground actuator B');

// Reuse solved lexical grounding and solved old cue->A temporal competence as M
// preconditions. No cue->B relation is supplied.
const OLD = 'fixture:preexisting-cue-action-relation';
Mind.C(M, { relations: { facts: [
  [MEANING, 'ρ:kind', 'relation_term'],
  [SURFACE_CUE, 'ρ:expresses', ref(MEANING)],
  ...FILLERS.map(word => [`surface:${word}`, 'ρ:expresses', ref(MEANING)]),
  [OLD, 'ρ:kind', 'learned_ordered_relation'],
  [OLD, 'ρ:ordered_expansion', [
    { simultaneous_relations: [ref(SURFACE_CUE)] },
    { simultaneous_relations: [ref(actionTerm(A))] },
  ]],
  [OLD, 'ρ:depth', 1],
  [OLD, 'ρ:ordered_evidence_route', { kind: 'full' }],
] } });
assert.strictEqual(M.motor, B, 'relational precondition contact changed grounded bodily motor');
assert.strictEqual(M.current?.continuation?.grounded, true, 'relational precondition contact erased bodily grounding');

function expectationAt(order, term) {
  const facts = M.knowledge?.facts || [];
  const ids = new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === 'temporal_expectation')
    .map(f => String(f.subject)));
  return [...ids].find(id =>
    facts.some(f => String(f.subject) === id && f.relation === 'ρ:after_lived_order' && f.object === order) &&
    facts.some(f => String(f.subject) === id && f.relation === 'ρ:expects_term' && f.object?.ref === term));
}
function conflictAt(order) {
  const facts = M.knowledge?.facts || [];
  return facts.find(f => f.relation === 'ρ:kind' && f.object === 'temporal_expectation_conflict' &&
    facts.some(g => String(g.subject) === String(f.subject) && g.relation === 'ρ:after_lived_order' && g.object === order))?.subject;
}
function candidateHas(order, term) {
  const facts = M.knowledge?.facts || [];
  const ids = new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === 'temporal_expectation_candidate')
    .map(f => String(f.subject)));
  return [...ids].some(id =>
    facts.some(f => String(f.subject) === id && f.relation === 'ρ:after_lived_order' && f.object === order) &&
    facts.some(f => String(f.subject) === id && f.relation === 'ρ:expected_terms' && Array.isArray(f.object) &&
      f.object.some(x => x?.ref === term)));
}

// This frame path is now part of the frontier: it must both retain bodily B and
// enter B as the actually lived action after each cue.
function publicBodyStep() {
  const acted = M.motor;
  if (acted === B) { c0 -= 11; c1 -= 7; }
  else { c0 += 4; c1 += 3; }
  Mind.C(M, { frame: frameAt(M.experiences.length, c0, c1) });
  return acted;
}

// Old temporal A remains warranted, but independent grounded B must prevent A from
// overwriting the body merely to block contradictory experience.
Mind.C(M, surface(CUE));
let order = M.structure?.lived_contact_order;
assert(expectationAt(order, actionTerm(A)), 'old cue->A temporal warrant was not active before correction');
assert.strictEqual(M.motor, B, 'stale temporal A overrode independently grounded bodily B');
assert.strictEqual(M.current?.continuation?.grounded, true, 'independent bodily B lost grounding at the cue');
publicBodyStep();
Mind.C(M, surface(FILLERS[0]));
Mind.C(M, surface(FILLERS[1]));

// Actual contrary cue->B life. Rotating fillers keep the repeated relation focused
// on cue -> B rather than on a boundary phase.
for (let i = 1; i < ASSOCIATIONS; i++) {
  assert.strictEqual(M.motor, B, 'independent bodily route lost actuator B');
  assert.strictEqual(M.current?.continuation?.grounded, true, 'bodily B was no longer grounded');
  Mind.C(M, surface(CUE));
  assert.strictEqual(M.motor, B, 'temporal pressure displaced independently grounded B during correction');
  publicBodyStep();
  assert.strictEqual(M.motor, B, 'public bodily contact failed to preserve grounded B');
  assert.strictEqual(M.current?.continuation?.grounded, true, 'public bodily contact lost B grounding');
  Mind.C(M, surface(FILLERS[i % FILLERS.length]));
  Mind.C(M, surface(FILLERS[(i * 3 + 1) % FILLERS.length]));
}

Mind.C(M, surface(FILLERS[3]));
const beforeConflictMotor = M.motor;
Mind.C(M, surface(CUE));
order = M.structure?.lived_contact_order;

assert(conflictAt(order), 'opposite lived cue->B evidence did not reopen temporal action warrant');
assert(candidateHas(order, actionTerm(A)), 'reopened conflict lost the old cue->A alternative');
assert(candidateHas(order, actionTerm(B)), 'reopened conflict lacks the newly lived cue->B alternative');
assert.strictEqual(expectationAt(order, actionTerm(A)), undefined, 'conflict retained a unique A action expectation');
assert.strictEqual(expectationAt(order, actionTerm(B)), undefined, 'conflict silently replaced A with a unique B expectation');
assert.strictEqual(beforeConflictMotor, B);
assert.strictEqual(M.motor, B, 'open temporal conflict arbitrarily displaced independently grounded B');
assert.strictEqual(M.current?.continuation?.grounded, true, 'independent B support disappeared under temporal conflict');

for (const forbidden of ['planner', 'policy', 'reward_policy', 'action_table', 'command_table', 'temporal_action_state'])
  assert.strictEqual(M[forbidden], undefined, `parallel action authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  canonical_body_grounding_reused_on_same_M: true,
  old_temporal_action_precondition_reused: true,
  independent_embodied_B_grounded: true,
  stale_A_did_not_block_contrary_life: true,
  later_cue_B_evidence_entered_same_lived_order: true,
  temporal_action_warrant_reopened_as_conflict: true,
  both_action_alternatives_retained: true,
  conflict_selected_no_temporal_actuator: true,
  independent_B_remained_usable: true,
  planner_or_policy_added: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('ACTION WARRANT CORRECTION / REOPENING: PASS');
