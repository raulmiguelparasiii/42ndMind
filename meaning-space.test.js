'use strict';

const assert=require('assert');
const {MOP,variable,app}=require('./universal-math-graph');
const {
  oneMathHypothesisLedger,proposeMathAlternative,addMathAlternative,
  contactMathSpace,currentMathSpace,evaluateMathSpaceAlternative
}=require('./math-hypotheses');
const {
  oneEnglishMathBridge,bindEnglishMathSpace,mathForRelation,pureEnglishMathBridge
}=require('./english-math-bridge');

const V=variable,A=app;
const subset=(x,y)=>A(MOP.SUBSET,x,y);
const neq=(x,y)=>A(MOP.NEQ,x,y);
const lt=(x,y)=>A(MOP.LT,x,y);
const card=x=>A(MOP.CARD,x);

const L=oneMathHypothesisLedger();
const root=proposeMathAlternative(L,'mu1',{
  id:'root',
  expressions:[subset(V('P'),V('U')),subset(V('Q'),V('U')),neq(V('P'),V('Q'))],
  source:'blind-proposer',confidence:0.999999
});
assert.strictEqual(root.status,'open','proposer confidence became authority');
assert.strictEqual(currentMathSpace(L,'mu1').status,'unresolved');

// A surface relation may attach while its mathematics is still unresolved.
// The bridge stores only the opaque space reference.
const U={
  whole:1,
  relations:{xi:{support:1,lexical:{'txt:u:x':1}}},
  canonical:{xi:'xi'},
  equivalence_sets:[{representative:'xi',members:['xi']}]
};
const B=oneEnglishMathBridge();
bindEnglishMathSpace(B,U,L,'xi','mu1');
assert.strictEqual(mathForRelation(B,U,L,'xi').status,'unresolved');

// First complete contact supports two set-inclusion relations but not the extra
// inequality. The failed assignment does not globally falsify the graph.
const c1=contactMathSpace(L,'mu1',[
  subset(V('X'),V('W')),subset(V('Y'),V('W'))
],{id:'contact-two',complete:true});
assert.notStrictEqual(L.candidates.root.status,'defeated','space mismatch globally falsified reusable math');
const rootInMu1=evaluateMathSpaceAlternative(L,'mu1','root');
assert(rootInMu1.defeat.some(x=>x.evidence==='contact-two'),'complete mismatch did not defeat the assignment');
assert(c1.refinement.generated>0,'complete countercontact did not expose structural alternatives');
let s1=currentMathSpace(L,'mu1');
assert.strictEqual(s1.status,'resolved-candidate-math',`first contact remained ${s1.status}`);
const first=s1.hypothesis_id;
assert(first && first!=='root','failed original candidate remained chosen');
const firstCandidate=L.candidates[first];
assert.strictEqual(firstCandidate.expressions.length,2,'maximal surviving two-constraint anatomy was not selected');
const firstSignature=s1.signature;
let english1=mathForRelation(B,U,L,'xi');
assert.strictEqual(english1.status,'resolved-candidate-math');
assert.strictEqual(english1.signature,firstSignature,'surface binding did not dereference resolved space');

// The same original mathematical object can still be a candidate for another
// referent. A matching contact there supports it globally, while mu1 keeps its
// own assignment counterevidence.
addMathAlternative(L,'mu2','root');
contactMathSpace(L,'mu2',[
  subset(V('A'),V('Z')),subset(V('B'),V('Z')),neq(V('A'),V('B'))
],{id:'contact-root-match',complete:true},{autoRefine:false});
assert.strictEqual(L.candidates.root.status,'supported','matching second referent could not support reusable math');
assert.strictEqual(currentMathSpace(L,'mu2').status,'resolved-candidate-math');
assert.strictEqual(currentMathSpace(L,'mu2').hypothesis_id,'root');
assert(evaluateMathSpaceAlternative(L,'mu1','root').defeat.length>0,'second-space support erased first-space assignment counterevidence');

// A later complete contact narrows mu1 further to a single inclusion relation.
const c2=contactMathSpace(L,'mu1',[subset(V('X'),V('W'))],{id:'contact-one',complete:true});
assert(c2.refinement.generated>=0);
let s2=currentMathSpace(L,'mu1');
assert.strictEqual(s2.status,'resolved-candidate-math',`second contact remained ${s2.status}`);
assert.notStrictEqual(s2.signature,firstSignature,'new complete contact did not change resolved structure');
const second=L.candidates[s2.hypothesis_id];
assert.strictEqual(second.expressions.length,1,'single surviving relation was not selected');
assert.strictEqual(evaluateMathSpaceAlternative(L,'mu1',first).status,'contested','former resolution did not reopen under later countercontact');
let english2=mathForRelation(B,U,L,'xi');
assert.strictEqual(english2.status,'resolved-candidate-math');
assert.strictEqual(english2.signature,s2.signature,'old surface binding froze the former mathematical answer');
assert.notStrictEqual(english2.signature,english1.signature,'surface binding failed to follow corrected space');

// A high-confidence incompatible proposal arriving late must replay historical
// space evidence immediately. Arrival order and confidence do not reopen mu1.
const late=proposeMathAlternative(L,'mu1',{
  id:'late-bad',expressions:[lt(card(V('P')),card(V('U')))],
  source:'late-proposer',confidence:1
});
assert.strictEqual(late.status,'open','proposal confidence became global support');
const lateFit=evaluateMathSpaceAlternative(L,'mu1',late.id);
assert.strictEqual(lateFit.status,'defeated','late alternative escaped historical complete contact');
const s3=currentMathSpace(L,'mu1');
assert.strictEqual(s3.status,'resolved-candidate-math');
assert.strictEqual(s3.signature,s2.signature,'defeated late proposal disturbed resolved space');

const pureBridge=pureEnglishMathBridge(B);
assert.strictEqual(pureBridge.bindings[0].space_id,'mu1');
assert(!Object.prototype.hasOwnProperty.call(pureBridge.bindings[0],'math'),'bridge copied mathematical truth downstream');

// Space verdicts are derived from the central candidate/evidence ledger.
for(const space of Object.values(L.spaces)){
  assert(!Object.prototype.hasOwnProperty.call(space,'status'));
  assert(!Object.prototype.hasOwnProperty.call(space,'active'));
  assert(!Object.prototype.hasOwnProperty.call(space,'revision'));
}

const report={
  proposer_confidence_is_not_authority:true,
  opaque_space_initially_unresolved:true,
  complete_contact_can_defeat_assignment_without_global_graph_defeat:true,
  bounded_conjunctive_refinement_generated:c1.refinement.generated,
  first_resolution_constraints:firstCandidate.expressions.length,
  second_contact_reopens_prior_assignment:true,
  second_resolution_constraints:second.expressions.length,
  same_math_can_be_supported_for_another_referent:true,
  late_alternative_replays_history:true,
  surface_can_bind_before_resolution:true,
  surface_follows_live_space_correction_without_rebinding:true,
  downstream_space_status_authority:0,
  whole:L.whole
};
console.log(JSON.stringify(report,null,2));
console.log('LIVE MATHEMATICAL MEANING SPACE TEST: PASS');
