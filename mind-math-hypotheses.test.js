'use strict';

const assert=require('assert');
const Mind=require('./one-mind.js');
const {MOP,variable,constant,app}=require('./universal-math-graph');
const {
  REL,KIND,mathLedgerFromMind,proposeMathAlternativeInMind,
  contactMathSpaceInMind,currentMathHypothesisInMind,currentMathSpaceInMind
}=require('./mind-math-hypotheses');

const V=variable,C=constant,A=app;
const opts={autoRefine:false,maxMatchStates:100000,maxCanonicalStates:100000};
const relation=A(MOP.EQ,V('opaque_x'),C('opaque_value'));
const noise=A(MOP.EQ,V('other_x'),C('different_value'));

const M=Mind.one(1,1);
assert.strictEqual(M.math_hypotheses,undefined);
assert.strictEqual(M.ledger,undefined);

// Proposal and alternative membership enter through ordinary structured M
// contact. Confidence remains proposal metadata and cannot self-warrant.
let h=proposeMathAlternativeInMind(M,'space-alpha',{
  id:'h-alpha',
  expressions:[relation],
  source:'opaque-proposer',
  confidence:0.999,
  note:'proposal only'
},opts);
assert.strictEqual(h.status,'open');
assert.strictEqual(h.usable,false);
assert.strictEqual(currentMathSpaceInMind(M,'space-alpha',opts).status,'unresolved');

// The persistent source of authority is canonical M. Rebuilding a disposable
// ledger view from M reproduces the same unresolved state.
let L=mathLedgerFromMind(M,opts);
assert.strictEqual(Object.keys(L.candidates).length,1);
assert.strictEqual(L.evidence.length,0);
assert.strictEqual(L.candidates['h-alpha'].status,'open');

// No derived status/usable/support/defeat facts are persisted as local truth.
for(const f of M.knowledge.facts){
  assert.notStrictEqual(f.relation,'status');
  assert.notStrictEqual(f.relation,'usable');
  assert.notStrictEqual(f.relation,'support');
  assert.notStrictEqual(f.relation,'defeat');
}

// Independent matching contact is retained as a distinct evidence occurrence in
// the same M. Current warrant is recomputed from M-owned candidate/evidence facts.
contactMathSpaceInMind(M,'space-alpha',[relation],{
  id:'e-alpha-support',complete:true,provenance:{source:'independent-contact'}
},opts);
h=currentMathHypothesisInMind(M,'h-alpha',{},opts);
assert.strictEqual(h.status,'supported');
assert.strictEqual(h.usable,true);
assert.strictEqual(currentMathSpaceInMind(M,'space-alpha',opts).status,'resolved-candidate-math');

L=mathLedgerFromMind(M,opts);
assert.strictEqual(L.evidence.length,1);
assert.strictEqual(L.evidence[0].id,'e-alpha-support');
assert.strictEqual(L.candidates['h-alpha'].status,'supported');

// Candidate, proposal, alternative-space and evidence identities are ordinary
// first-class relational subjects inside M rather than fields on a second mind.
const kinds=M.knowledge.facts.filter(f=>f.relation===REL.kind).map(f=>f.object);
assert(kinds.includes(KIND.candidate));
assert(kinds.includes(KIND.proposal));
assert(kinds.includes(KIND.space));
assert(kinds.includes(KIND.evidence));
assert(M.knowledge.episodes.length>=3,'M did not preserve the structured contact occurrences');

// Persistence belongs to M. A plain durable-state round trip is sufficient to
// recover current mathematical warrant; no live ledger object has to survive.
const restored=JSON.parse(JSON.stringify(M));
const restoredH=currentMathHypothesisInMind(restored,'h-alpha',{},opts);
assert.strictEqual(restoredH.status,'supported');
assert.strictEqual(restoredH.usable,true);
assert.strictEqual(restored.math_hypotheses,undefined);

// Later complete countercontact changes the derived assignment on rebuild. The
// evidence is appended to M; nobody edits a stored candidate status flag.
contactMathSpaceInMind(restored,'space-alpha',[noise],{
  id:'e-alpha-counter',complete:true,provenance:{source:'independent-countercontact'}
},opts);
const after=currentMathSpaceInMind(restored,'space-alpha',opts);
assert.notStrictEqual(after.status,'resolved-candidate-math');
assert.strictEqual(mathLedgerFromMind(restored,opts).evidence.length,2);

console.log(JSON.stringify({
  canonical_M_owns_candidate_definition:true,
  canonical_M_owns_proposal:true,
  canonical_M_owns_alternative_membership:true,
  canonical_M_owns_evidence_occurrences:true,
  proposer_confidence_self_warrant:false,
  status_is_derived_not_persisted:true,
  restart_rebuild_preserves_warrant:true,
  later_countercontact_recomputes_assignment:true,
  persistent_second_math_ledger:false,
  revision_migration_demonstrated:false,
  automatic_refinement_migration_demonstrated:false,
  whole:restored.whole
},null,2));
console.log('MIND MATH HYPOTHESES: BOUNDED STATE-AUTHORITY MIGRATION PASS');
