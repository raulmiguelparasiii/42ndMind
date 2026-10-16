'use strict';

const assert=require('assert');
const {MOP,variable,constant,app}=require('./universal-math-graph');
const {INTENT_ORDER,candidateExpressions}=require('./abstract-intent-kernel');
const {
  oneMathHypothesisLedger,proposeMath,contactMath,reviseMath,
  usableMathPatterns,pureMathLedger,matchCompiledSubgraph
}=require('./math-hypotheses');

const V=variable, C=constant, A=app;
const subset=(x,y)=>A(MOP.SUBSET,x,y);
const card=x=>A(MOP.CARD,x);
const lt=(x,y)=>A(MOP.LT,x,y);

// All thirteen richer candidates can enter under opaque ids. English names are
// used only by this external harness to fetch the proposed anatomy.
const L=oneMathHypothesisLedger();
INTENT_ORDER.forEach((name,i)=>{
  const c=proposeMath(L,{id:`h${i}`,expressions:candidateExpressions(name),source:'proposer-A',confidence:0.999});
  assert.strictEqual(c.status,'open','proposal confidence became authority');
});
assert.strictEqual(Object.keys(L.candidates).length,13);

// Alpha-equivalent second proposal must merge rather than make a duplicate.
const beforeCount=Object.keys(L.candidates).length;
const merged=proposeMath(L,{id:'should-not-appear',expressions:candidateExpressions('belief','independent-renaming:'),source:'proposer-B',confidence:0.01});
assert.strictEqual(merged.id,'h0');
assert.strictEqual(Object.keys(L.candidates).length,beforeCount);
assert.strictEqual(merged.proposals.length,2);
assert.strictEqual(merged.status,'open');

// Evidence aimed at one hypothesis does not affect unrelated hypotheses.
const partialBelief=candidateExpressions('belief','partial:').slice(0,2);
contactMath(L,partialBelief,{id:'e-partial',candidates:['h0'],complete:false});
assert.strictEqual(L.candidates.h0.status,'open');
assert.strictEqual(L.candidates.h1.status,'open');

// Complete, independently renamed structural contact supports the candidate.
contactMath(L,candidateExpressions('belief','contact:'),{id:'e-belief',candidates:['h0'],complete:true});
assert.strictEqual(L.candidates.h0.status,'supported');
assert.strictEqual(L.candidates.h0.usable,true);

// Complete targeted countercontact can defeat/reopen a formerly usable result.
contactMath(L,partialBelief,{id:'e-counter',candidates:['h0'],complete:true});
assert.strictEqual(L.candidates.h0.status,'contested');
assert.strictEqual(L.candidates.h0.usable,false);

// The same structural machinery handles all richer candidate graphs. This is
// structural support only; it is not claimed as independent semantic truth.
for(let i=1;i<INTENT_ORDER.length;i++){
  const name=INTENT_ORDER[i];
  contactMath(L,candidateExpressions(name,`contact-${i}:`),{id:`e${i}`,candidates:[`h${i}`],complete:true});
  assert.strictEqual(L.candidates[`h${i}`].status,'supported',`${name} failed renamed structural support`);
}
assert.strictEqual(usableMathPatterns(L).length,12);

// A candidate can match inside a larger mathematical contact rather than only
// by exact signature.
const a=V('a'), u=V('u'), extra=V('extra');
const small=[subset(a,u)];
const larger=[subset(V('x'),V('y')),lt(C(0),card(extra))];
assert(matchCompiledSubgraph(small,larger),'generic subgraph support failed');

// Candidate correction replays stored evidence instead of freezing the old
// judgement. Add a genuinely new connected requirement to belief.
const correctedBelief=[...candidateExpressions('belief','corrected:'),subset(V('corrected:P'),V('corrected:extraDomain'))];
const revised=reviseMath(L,'h0',correctedBelief,'candidate decomposition corrected');
assert.strictEqual(revised.revision,2);
assert.strictEqual(revised.status,'defeated','old complete contacts were not replayed against revised candidate');

// New matching contact can support the revision, but old complete contrary
// evidence remains visible, so status becomes contested rather than erased.
contactMath(L,[...candidateExpressions('belief','new-contact:'),subset(V('new-contact:P'),V('new-contact:extraDomain'))],{
  id:'e-corrected',candidates:['h0'],complete:true
});
assert.strictEqual(L.candidates.h0.status,'contested');
assert(L.candidates.h0.support.length>=1);
assert(L.candidates.h0.defeat.length>=1);

const pure=pureMathLedger(L);
const text=JSON.stringify(pure).toLowerCase();
for(const word of INTENT_ORDER) assert(!text.includes(word),`semantic family label leaked into pure ledger: ${word}`);
assert.strictEqual(pure.whole,1);

const summary={
  anonymous_candidate_hypotheses:13,
  proposer_confidence_is_not_authority:true,
  alpha_equivalent_full_math_proposals_merge:true,
  incomplete_targeted_contact_preserves_unknown:true,
  complete_matching_contact_can_support:true,
  complete_countercontact_reopens_supported_candidate:true,
  evidence_scope_does_not_touch_untargeted_candidates:true,
  larger_contact_can_support_by_structural_embedding:true,
  revised_candidate_replays_old_evidence:true,
  old_contrary_evidence_not_erased_by_new_support:true,
  semantic_family_labels_in_pure_ledger:0,
  usable_after_test:usableMathPatterns(L).length,
  whole:pure.whole
};
console.log(JSON.stringify(summary,null,2));
console.log('CORRIGIBLE MATH HYPOTHESIS TEST: PASS');
