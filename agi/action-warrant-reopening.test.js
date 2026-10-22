'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Frontier only. Reuse the already-demonstrated cue->action temporal relation as
// M content. New evidence must come through the real canonical embodied learner
// and lived-order recompression: independently grounded B must survive stale A,
// then repeated cue->B life must reopen the temporal action conclusion.

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

const M = Mind.one(2, 1);
Mind.C(M, { relations: { facts: [
  [MEANING, 'ρ:kind', 'relation_term'],
  [SURFACE_CUE, 'ρ:expresses', ref(MEANING)],
  ...FILLERS.map(word => [`surface:${word}`, 'ρ:expresses', ref(MEANING)]),
] } });

for (let i = 0; i < 3; i++) Mind.C(M, { frame: [null, 40] });
for (let index = 0; index < 2; index++) {
  assert((M.knowledge?.facts || []).some(f => f.subject === actionTerm(index) &&
    f.relation === 'ρ:actuator_index' && f.object === index), `actuator ${index} is not M-grounded`);
}

const A = M.motor;
const B = A === 0 ? 1 : 0;
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

let concern = 220;
Mind.C(M, { frame: [null, concern] });
const bodyActions = [];
function bodyStep() {
  const acted = M.motor;
  bodyActions.push(acted);
  concern += acted === B ? -5 : 2;
  concern = Math.max(20, Math.min(240, concern));
  Mind.C(M, { frame: [null, concern] });
  return acted;
}

let bodyGrounded = false;
for (let i = 0; i < 48; i++) {
  bodyStep();
  if (i >= 16 && M.motor === B && M.current?.continuation?.grounded === true) {
    bodyGrounded = true;
    break;
  }
}
if (!bodyGrounded) {
  const actionPatterns = (M.structure?.patterns || []).filter(p => p.target === 'action').map(p => ({
    active: p.active !== false,
    expected: p.expected,
    conditions: p.conditions,
    reliability: p.reliability,
    base_rate: p.base_rate,
    covered: p.covered,
    eligible: p.eligible,
    bits_saved: p.bits_saved,
    predictive_code_bits: p.predictive_code_bits,
  }));
  const consequencePatterns = (M.structure?.patterns || []).filter(p =>
    /^relation_c\d+_order$/.test(p.target) && p.conditions.some(c => c.feature === 'action')).map(p => ({
      active: p.active !== false,
      target: p.target,
      expected: p.expected,
      conditions: p.conditions,
      reliability: p.reliability,
      base_rate: p.base_rate,
      covered: p.covered,
      eligible: p.eligible,
      bits_saved: p.bits_saved,
    }));
  console.error('ACTION_REOPENING_BODY_DIAGNOSTIC', JSON.stringify({
    A, B,
    experiences: M.experiences?.length,
    current_motor: M.motor,
    continuation: M.current?.continuation,
    body_action_counts: [0, 1].map(x => bodyActions.filter(a => a === x).length),
    action_patterns: actionPatterns.slice(0, 16),
    consequence_patterns: consequencePatterns.slice(0, 16),
  }));
}
assert(bodyGrounded, 'canonical embodied learner did not independently ground actuator B');

Mind.C(M, surface(CUE));
let order = M.structure?.lived_contact_order;
assert(expectationAt(order, actionTerm(A)), 'old cue->A temporal warrant was not active before correction');
assert.strictEqual(M.motor, B, 'stale temporal A overrode independently grounded bodily B');
assert.strictEqual(M.current?.continuation?.grounded, true, 'independent bodily B lost its grounding at the cue');
bodyStep();
Mind.C(M, surface(FILLERS[0]));
Mind.C(M, surface(FILLERS[1]));

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
