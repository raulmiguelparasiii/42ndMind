'use strict';

const assert=require('assert');
const Mind=require('./one-mind.js');
const {MOP,variable,constant,app}=require('./universal-math-graph');
const {
  proposeMathAlternativeInMind,contactMathSpaceInMind,currentMathHypothesisInMind
}=require('./mind-math-hypotheses');

const V=variable,C=constant,A=app;
const opts={autoRefine:false,maxMatchStates:100000,maxCanonicalStates:100000};
const relation=A(MOP.EQ,V('x'),C('v'));
const candidateRef={ref:'math-candidate:h-live'};

function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function hasFact(M,subject,relationName,object){
  return M.knowledge.current.facts.some(f=>same(f.subject,subject)&&same(f.relation,relationName)&&same(f.object,object));
}

const M=Mind.one(1,1);
proposeMathAlternativeInMind(M,'live-space',{
  id:'h-live',expressions:[relation],source:'opaque-proposer',confidence:1
},opts);
contactMathSpaceInMind(M,'live-space',[relation],{
  id:'independent-support',complete:true
},opts);

// The fundamental candidate/evidence state now lives in M and the derived view
// correctly reconstructs current warrant.
const h=currentMathHypothesisInMind(M,'h-live',{},opts);
assert.strictEqual(h.status,'supported');
assert.strictEqual(h.usable,true);

// Teach canonical M a completely ordinary higher relation that depends on the
// lower candidate's current warrant. No special downstream engine is needed if
// that warrant is part of the same live relational closure.
Mind.C(M,{relations:{rules:[{
  id:'higher:uses-h-live',
  premises:[[candidateRef,'warranted',true]],
  conclusion:['R-higher','available',true],
  categorical:true,
  provenance:{kind:'generic-dependent-relation'}
}]}});

// PRESERVED GAP: current math warrant is still produced only by the disposable
// compatibility view. Canonical C does not yet derive a warranted relation from
// the M-owned candidate/evidence structure, so the ordinary higher relation is
// not activated. Manually injecting the warrant here would hide the missing seam
// and is intentionally forbidden by this test.
assert(!hasFact(M,candidateRef,'warranted',true),
  'baseline unexpectedly exposed math warrant inside canonical relational closure');
assert(!hasFact(M,'R-higher','available',true),
  'baseline unexpectedly activated higher M relation from math warrant');

console.log(JSON.stringify({
  candidate_and_evidence_owned_by_M:true,
  disposable_view_derives_supported_warrant:true,
  warrant_available_to_canonical_relational_closure:false,
  higher_relation_automatically_uses_warrant:false,
  preserved_gap:'derived warrant has not yet become ordinary live M material for canonical C',
  whole:M.whole
},null,2));
console.log('ONE LIVE M WARRANT BASELINE: GAP PRESERVED');
