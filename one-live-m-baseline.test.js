'use strict';

const assert=require('assert');
const Mind=require('./one-mind.js');
const Recompress=require('./recursive-recompression');
const {oneMathHypothesisLedger,contactMathSpace,currentMathSpace}=require('./math-hypotheses');
const {learnedDefinitionExpression,proposeLearnedDefinition}=require('./recursive-hypothesis-growth');

const opts={maxCoreStates:200000,maxMatchStates:250000,maxCanonicalStates:250000};

function episodes(){
  const out=[];let n=0;
  for(let r=0;r<8;r++)for(const a of [false,true])for(const b of [false,true]){
    out.push({id:`opaque-${++n}`,a,b,x:a&&b});
  }
  return out;
}

// PR #47 proves that a recursively learned description can enter the live ULT
// authority, receive independent warrant, and become reusable. This baseline
// asks a different architectural question: did that epistemically meaningful
// relation thereby become part of the one canonical individual M? Today: no.
let R=Recompress.one();
R=Recompress.recompress(R,episodes(),{maxConditions:3,maxPasses:1,maxSymbolsPerPass:8});
const h1=R.symbols.find(s=>s.depth===1&&s.definition.length===2);
assert(h1,'failed to learn baseline relation');

const L=oneMathHypothesisLedger();
const p=proposeLearnedDefinition(L,R,h1.feature,'one-live-m-gap',{id:'learned-gap-h1'},opts);
const expr=learnedDefinitionExpression(R,h1.feature);
contactMathSpace(L,'one-live-m-gap',[expr],{id:'independent-support',complete:true},{autoRefine:false,...opts});
assert.strictEqual(currentMathSpace(L,'one-live-m-gap',opts).status,'resolved-candidate-math');

const M=Mind.one(1,1);
const snapshot=JSON.stringify(M.knowledge);

// This is the preserved architectural gap. The warranted relation exists in a
// second experimental state object L. Canonical M has not acquired its candidate,
// evidence, warrant, definition, provenance, or dependency structure merely
// because ULT warranted it.
assert.strictEqual(M.knowledge.math_hypotheses,undefined);
assert(!snapshot.includes(p.routed.hypothesis_id));
assert(!snapshot.includes(p.definition_signature));
assert.strictEqual(Object.keys(L.candidates).length,1);
assert.strictEqual(L.evidence.length,1);

console.log(JSON.stringify({
  pr47_warranted_relation_exists:true,
  ult_candidate_count:Object.keys(L.candidates).length,
  ult_evidence_count:L.evidence.length,
  canonical_M_contains_warranted_relation:false,
  canonical_M_contains_ult_evidence:false,
  preserved_gap:'epistemically meaningful ULT state remains outside canonical M',
  whole:M.whole
},null,2));
console.log('ONE LIVE M BASELINE: STATE-SEPARATION GAP PRESERVED');
