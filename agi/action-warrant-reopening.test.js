'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Frontier only. Old cue->A temporal competence is a solved precondition. New
// evidence must come through the real canonical embodied learner and lived-order
// recompression: independently grounded B must survive stale A, then actual
// cue->B life must reopen the temporal action conclusion.

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
Mind.C(M, { relations: { facts: [
  [MEANING, 'ρ:kind', 'relation_term'],
  [SURFACE_CUE, 'ρ:expresses', ref(MEANING)],
  ...FILLERS.map(word => [`surface:${word}`, 'ρ:expresses', ref(MEANING)]),
] } });

// Expose the existing physical actuator boundary without teaching consequences.
let exposure = 0;
while (exposure < 12) {
  Mind.C(M, { frame: frameAt(exposure, 40, 30) });
  exposure++;
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
const OLD = 'fixture:preexisting-cue-action-relation';
Mind.C(M, { relations: { facts: [
  [OLD, 'ρ:kind', 'learned_ordered_relation'],
  [OLD, 'ρ:ordered_expansion', [
    { simultaneous_relations: [ref(SURFACE_CUE)] },
    { simultaneous_relations: [ref(actionTerm(A))] },
  ]],
  [OLD, 'ρ:depth', 1],
  [OLD, 'ρ:ordered_evidence_route', { kind: 'full' }],
] } });

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

// Canonical body world: raw percept variation prevents a two-action phase from
// becoming the test. Only B lowers both pressures; every other actuator raises
// them. No motor is selected or mutated by the harness.
let c0 = 180, c1 = 150;
Mind.C(M, { frame: frameAt(M.experiences.length, c0, c1) });
function bodyStep() {
  const acted = M.motor;
  if (acted === B) { c0 -= 11; c1 -= 7; }
  else { c0 += 4; c1 += 3; }
  c0 = Math.max(2, Math.min(220, c0));
  c1 = Math.max(2, Math.min(220, c1));
  Mind.C(M, { frame: frameAt(M.experiences.length, c0, c1) });
  return acted;
}

let bodyGrounded = false;
for (let i = 0; i < 80; i++) {
  bodyStep();
  if (i >= 20 && M.motor === B && M.current?.continuation?.grounded === true) {
    bodyGrounded = true;
    break;
  }
}
assert(bodyGrounded, 'canonical embodied learner did not independently ground actuator B');

// Old temporal A is still live, but it may not erase independent grounded B and
// thereby prevent contradictory experience from entering the same life.
Mind.C(M, surface(CUE));
let order = M.structure?.lived_contact_order;
assert(expectationAt(order, actionTerm(A)), 'old cue->A temporal warrant was not active before correction');
assert.strictEqual(M.motor, B, 'stale temporal A overrode independently grounded bodily B');
assert.strictEqual(M.current?.continuation?.grounded, true, 'independent bodily B lost grounding at the cue');
bodyStep();
Mind.C(M, surface(FILLERS[0]));
Mind.C(M, surface(FILLERS[1]));

// Actual contrary cue->B life. Rotating fillers stop boundary/phase pairs from
// becoming the repeated relation under test.
for (let i = 1; i < ASSOCIATIONS; i++) {
  for (let guard = 0; guard < 8 && !(M.motor === B && M.current?.continuation?.grounded === true); guard++) bodyStep();
  assert.strictEqual(M.motor, B, 'independent bodily route lost actuator B');
  assert.strictEqual(M.current?.continuation?.grounded, true, 'bodily B was no longer grounded');
  Mind.C(M, surface(CUE));
  assert.strictEqual(M.motor, B, 'temporal pressure displaced independently grounded B during correction');
  bodyStep();
  Mind.C(M, surface(FILLERS[i % FILLERS.length]));
  Mind.C(M, surface(FILLERS[(i * 3 + 1) % FILLERS.length]));
}

for (let guard = 0; guard < 8 && !(M.motor === B && M.current?.continuation?.grounded === true); guard++) bodyStep();
assert.strictEqual(M.motor, B);
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
