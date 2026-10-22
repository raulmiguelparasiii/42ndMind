'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Conflict-reopening falsification. First create two independently warranted
// routes to the same target that disagree, proving the target becomes unresolved.
// Then provide later evaluable contact that preserves the unary route and defeats
// the joint route. The old conflict must not become sticky: a later null target
// must be completed again from the one remaining warranted explanation.

const CONCERN = 53;
const JOINT = 32;
const UNARY_ONLY = 80;
const CORRECTION = 80;
function jointValue(x, z) { return x + z + 0.25; }
function unaryValue(x) { return 2.5 * x - 0.75; }

const mindSource = fs.readFileSync(path.join(__dirname, 'mind.js'), 'utf8');
for (const forbidden of ['cross-route-conflict-reopening', '2.5 * x - 0.75'])
  assert(!mindSource.includes(forbidden), `runtime contains test-specific reopening fixture: ${forbidden}`);

let seed = 0x6bc41e27;
function random() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}
function sample() { return random() * 4 - 2; }

const M = Mind.one(1, 1);

// Phase 1: establish a genuinely joint relation.
for (let i = 0; i < JOINT; i++) {
  const x = sample(), z = sample();
  Mind.C(M, { frame: [x, z, jointValue(x, z), CONCERN] });
}

// Phase 2: make the joint route unevaluable rather than false while independently
// establishing a different unary route to the same target.
for (let i = 0; i < UNARY_ONLY; i++) {
  const x = sample();
  Mind.C(M, { frame: [x, null, unaryValue(x), CONCERN] });
}

function targetRoutes() {
  return (M.knowledge?.current?.facts || []).filter(fact =>
    fact.relation === 'ρ:continuous_dependence' && fact.object?.target === 'receptor:p2');
}
function unaryRoute(routes = targetRoutes()) {
  return routes.find(fact =>
    fact.subject === 'receptor:p0' && fact.object?.lag === 0 && !Array.isArray(fact.object?.sources));
}
function jointRoute(routes = targetRoutes()) {
  return routes.find(fact =>
    Array.isArray(fact.object?.sources) &&
    fact.object.sources.some(source => source?.source === 'receptor:p0' && source?.lag === 0) &&
    fact.object.sources.some(source => source?.source === 'receptor:p1' && source?.lag === 0));
}

assert(unaryRoute(), 'unary route was not learned before conflict');
assert(jointRoute(), 'joint route did not survive its unevaluable interval');

const CONFLICT_X = 0.8;
const CONFLICT_Z = 1.7;
Mind.C(M, { frame: [CONFLICT_X, CONFLICT_Z, null, CONCERN] });
assert(!Object.prototype.hasOwnProperty.call(M.current?.completed || {}, 'p2'),
  'initial disagreement did not leave p2 unresolved');
assert(M.current?.unresolved?.includes('p2'), 'initial disagreement was not represented as unresolved');

// Phase 3: both sources are now observed, so the old joint route is evaluable.
// Reality follows only the unary relation while p1 varies independently. Enough
// later contact must therefore defeat the joint route rather than merely hiding it.
for (let i = 0; i < CORRECTION; i++) {
  const x = sample(), z = sample();
  Mind.C(M, { frame: [x, z, unaryValue(x), CONCERN] });
}

const afterCorrection = targetRoutes();
assert(unaryRoute(afterCorrection), 'surviving unary route was lost during corrective contact');
assert(!jointRoute(afterCorrection), 'contradicted joint route remained warranted after evaluable correction');

// Historical first-class meaning is retained even though it is no longer current.
assert((M.knowledge?.facts || []).some(fact =>
  fact.relation === 'ρ:relation_object' && fact.object?.target === 'receptor:p2' &&
  Array.isArray(fact.object?.sources) && fact.object.sources.length >= 2),
  'superseded joint meaning disappeared from retained M history');

const X = -0.613579;
const Z = 1.246813;
const EXPECTED = unaryValue(X);
Mind.C(M, { frame: [X, Z, null, CONCERN] });

assert.strictEqual(M.contacts.at(-1)[2], null, 'reopened target was rewritten as observation');
assert.strictEqual(M.current?.observed?.p2, undefined, 'reopened target was falsely observed');
assert(M.current?.inferred?.includes('p2'), 'surviving warrant did not reopen inference after conflict resolution');
assert(!M.current?.unresolved?.includes('p2'), 'resolved conflict remained sticky in current unresolved state');
assert(Number.isFinite(M.current?.completed?.p2), 'reopened target has no completed numeric value');
assert(Math.abs(M.current.completed.p2 - EXPECTED) < 1e-6,
  'reopened completion does not follow the surviving unary relation');

for (const forbidden of ['conflict_model', 'arbitration_state', 'reopening_state', 'world_model', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  initial_conflict_became_unresolved: true,
  later_evaluable_contact_defeated_joint_route: true,
  unary_route_survived: true,
  historical_joint_meaning_retained: true,
  unresolved_state_not_sticky: true,
  surviving_warrant_reopened_completion: true,
  raw_null_contact_retained: true,
  parallel_reopening_authority: false,
}, null, 2));
console.log('CROSS-ROUTE CONFLICT REOPENING: PASS');
