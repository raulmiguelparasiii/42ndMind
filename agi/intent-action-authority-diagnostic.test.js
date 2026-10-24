'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

const FILLERS = ['look', 'ready', 'again', 'okay'];
const CONCERN_BASE = 50;
const A_FORMS = ['please raise now', 'could you raise', 'raise it please'];
const B_FORMS = ['please lower now', 'could you lower', 'lower it please'];
const LATE_FORMS = ['please ascend now', 'could you ascend', 'ascend it please'];
const HELD_OUT_A = 'please could you raise it now';
const HELD_OUT_B = 'please could you lower it now';

const M = Mind.one(2, 1);
function neutralFrame(concern = CONCERN_BASE) {
  const t = M.contacts.length;
  return [((t * 7) % 11) / 10, concern];
}
for (let i = 0; i < 4; i++) Mind.C(M, { frame: neutralFrame() });
const ACTION_A = M.motor;
const ACTION_B = ACTION_A === 0 ? 1 : 0;
function hear(raw) { Mind.C(M, { surface: { input: raw } }); }
const CONTEXT_CONCERN = { look: 53, ready: 48, again: 55, okay: 46 };

function ordinaryMove(target) {
  for (let i = 0; i < 6 && M.motor !== target; i++) Mind.C(M, { frame: neutralFrame() });
  assert.strictEqual(M.motor, target, `initial embodiment failed to expose actuator ${target}`);
}
function demonstrate(raw, intendedAction, filler) {
  ordinaryMove(intendedAction);
  hear(raw);
  const acted = M.motor;
  Mind.C(M, { frame: neutralFrame(acted === intendedAction ? 38 : 62) });
  assert.strictEqual(acted, intendedAction);
  hear(filler);
  Mind.C(M, { frame: neutralFrame(CONTEXT_CONCERN[filler]) });
}
for (let round = 0; round < 12; round++) {
  demonstrate(A_FORMS[round % 3], ACTION_A, FILLERS[round % 4]);
  demonstrate(B_FORMS[(round + 1) % 3], ACTION_B, FILLERS[(round * 3 + 1) % 4]);
}
function probe(raw, expectedAction, startingAction) {
  ordinaryMove(startingAction);
  hear('wait');
  assert.strictEqual(M.motor, startingAction);
  hear(raw);
  assert.strictEqual(M.motor, expectedAction);
}
probe(HELD_OUT_A, ACTION_A, ACTION_B);
probe(HELD_OUT_B, ACTION_B, ACTION_A);

function currentExpectationSnapshot(label, beforeMotor) {
  const facts = M.knowledge?.facts || [];
  const order = M.structure?.lived_contact_order;
  const actionTerms = new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === 'action_term').map(f => String(f.subject)));
  const expectationIds = [...new Set(facts.filter(f =>
    f.relation === 'ρ:after_lived_order' && f.object === order &&
    facts.some(k => String(k.subject) === String(f.subject) && k.relation === 'ρ:kind' && k.object === 'temporal_expectation'))
    .map(f => String(f.subject)))];
  return {
    label,
    order,
    before_motor: beforeMotor,
    after_motor: M.motor,
    continuation: M.current?.continuation,
    expectations: expectationIds.map(id => {
      const expected = facts.filter(f => String(f.subject) === id && f.relation === 'ρ:expects_term' && f.object?.ref !== undefined)
        .map(f => String(f.object.ref));
      const relations = facts.filter(f => String(f.subject) === id && f.relation === 'ρ:grounded_by_ordered_relation' && f.object?.ref !== undefined)
        .map(f => String(f.object.ref));
      return {
        id,
        expected,
        expected_actions: expected.filter(term => actionTerms.has(term)),
        relations: relations.map(relation => ({
          relation,
          expansion: facts.find(f => String(f.subject) === relation && f.relation === 'ρ:ordered_expansion')?.object,
          routes: facts.filter(f => String(f.subject) === relation && f.relation === 'ρ:ordered_evidence_route').map(f => f.object),
        })),
      };
    }),
  };
}

function diagnosticMove(target, round) {
  const snapshots = [];
  for (let i = 0; i < 6 && M.motor !== target; i++) {
    const before = M.motor;
    Mind.C(M, { frame: neutralFrame() });
    snapshots.push(currentExpectationSnapshot(`late-${round + 1}-move-${i + 1}`, before));
  }
  console.log('LATE MOVE', JSON.stringify({ round: round + 1, target, final_motor: M.motor, snapshots }, null, 2));
  if (M.motor !== target) throw new Error(`late round ${round + 1} could not expose actuator ${target}`);
}

for (let round = 0; round < 9; round++) {
  diagnosticMove(ACTION_A, round);
  const raw = LATE_FORMS[round % LATE_FORMS.length];
  hear(raw);
  const acted = M.motor;
  Mind.C(M, { frame: neutralFrame(acted === ACTION_A ? 38 : 62) });
  assert.strictEqual(acted, ACTION_A);
  const filler = FILLERS[(round + 2) % FILLERS.length];
  hear(filler);
  Mind.C(M, { frame: neutralFrame(CONTEXT_CONCERN[filler]) });
}

console.log('LATE ACTION AUTHORITY DIAGNOSTIC: ALL LATE MOVES SUCCEEDED');
