'use strict';

const assert=require('assert');
const {one}=require('./universal-language');
const {oneEnglishMathBridge,mathForRelation}=require('./english-math-bridge');
const {MOP,variable,app,compileMathGraph}=require('./universal-math-graph');
const {
  oneMathHypothesisLedger,proposeMathAlternative,contactMathSpace,currentMathSpace
}=require('./math-hypotheses');
const {liveUniversalStep}=require('./universal-live-proposer');

const V=variable,A=app;
const subset=(x,y)=>A(MOP.SUBSET,x,y);
const neq=(x,y)=>A(MOP.NEQ,x,y);
const eq=(x,y)=>A(MOP.EQ,x,y);
const lt=(x,y)=>A(MOP.LT,x,y);
const le=(x,y)=>A(MOP.LE,x,y);
const card=x=>A(MOP.CARD,x);
const opts={maxCoreStates:200000,maxMatchStates:200000,maxCanonicalStates:250000};

(async()=>{
  const U=one();
  const L=oneMathHypothesisLedger();
  const B=oneEnglishMathBridge();

  // Establish two complete reusable lower relations upstream. The whole remains
  // ambiguous; the stable vocabulary is therefore genuinely lower than the
  // unresolved referent and not a disguised accepted whole candidate.
  const P=V('P'),Q=V('Q'),W=V('W');
  const common=[subset(P,W),neq(P,Q)];
  const s1=[...common,lt(card(P),card(W))];
  const s2=[...common,eq(card(P),card(Q))];
  proposeMathAlternative(L,'seed-space',{id:'seed-a',expressions:s1,source:'opaque-seed'});
  proposeMathAlternative(L,'seed-space',{id:'seed-b',expressions:s2,source:'opaque-seed'});
  contactMathSpace(L,'seed-space',[...common,s1[2],s2[2]],{id:'seed-contact',complete:true},{autoRefine:false});
  assert.strictEqual(currentMathSpace(L,'seed-space').status,'ambiguous');

  const subsetSig=compileMathGraph([subset(V('x'),V('u'))],opts).signature;
  const neqSig=compileMathGraph([neq(V('x'),V('y'))],opts).signature;

  let sawVocabulary=false;
  const X=V('X'),Y=V('Y'),Z=V('Z');
  const candidate1=[subset(X,Z),neq(X,Y),le(card(Y),card(Z))];
  const candidate2=[subset(X,Z),neq(X,Y),eq(card(Y),card(Z))];

  const first=await liveUniversalStep(U,L,B,{
    utterance:'tovan relu',context:{stream:'opaque'}
  },async view=>{
    const sigs=new Set(view.universal_math.vocabulary.relations.map(r=>r.signature));
    sawVocabulary=sigs.has(subsetSig)&&sigs.has(neqSig);
    assert.strictEqual(view.universal_math.cue_completion,null);
    assert.strictEqual(view.universal_math.proposal_contract.evidence_rule.includes('proposal is not evidence'),true);
    return{
      surface:{candidates:[{id:'surface-a',label:'opaque-a',support:1}]},
      math_spaces:[{
        relation_ref:'surface-a',space_id:'meaning-a',
        alternatives:[
          {id:'meaning-a1',expressions:candidate1,source:'generic-oracle'},
          {id:'meaning-a2',expressions:candidate2,source:'generic-oracle'}
        ]
      }]
    };
  },opts);

  assert(sawVocabulary,'ordinary F oracle did not receive stabilized mathematical vocabulary');
  assert.deepStrictEqual(first.surface.proposed_relations,['surface-a']);
  assert.strictEqual(first.mathematical.routed_spaces.length,1);
  assert.strictEqual(first.mathematical.routed_spaces[0].alternatives.length,2);
  for(const alt of first.mathematical.routed_spaces[0].alternatives){
    assert.strictEqual(alt.relation_uses,2,'candidate was not factored through both stabilized lower relations');
    assert.strictEqual(alt.raw_constraints,1,'candidate failed to preserve unresolved/raw remainder');
    assert.deepStrictEqual(new Set(alt.relation_signatures),new Set([subsetSig,neqSig]));
  }

  // The English contact plus proposer confidence supplied NO mathematical
  // evidence. The math space must remain unresolved/open after proposal.
  assert.notStrictEqual(currentMathSpace(L,'meaning-a').status,'resolved-candidate-math');
  assert.strictEqual(first.mathematical.current.status,'unresolved');
  assert.strictEqual(first.mathematical.active_completion,null,'unresolved math fabricated a current completion frontier');
  assert.strictEqual(L.candidates['meaning-a1'].support.length,0);
  assert.strictEqual(L.candidates['meaning-a2'].support.length,0);

  // Independent upstream contact can resolve the mathematical assignment. The
  // already-learned surface relation follows it through the pre-existing bridge
  // without replaying F or rebinding the English relation.
  contactMathSpace(L,'meaning-a',candidate1,{id:'meaning-a-contact',complete:true},{autoRefine:false});
  const resolved=mathForRelation(B,U,L,'surface-a');
  assert.strictEqual(resolved.status,'resolved-candidate-math');
  assert.strictEqual(resolved.hypotheses.length,1);
  assert.strictEqual(resolved.hypotheses[0],'meaning-a1');

  // With no explicit mathematical cue and no proposer, a later occurrence of an
  // already-learned surface relation resolves through ordinary F. Its live math
  // automatically becomes the present structural cue and derives a completion
  // frontier. No separately stored controller chooses it.
  const automatic=await liveUniversalStep(U,L,B,{
    utterance:'tovan relu',context:{stream:'opaque'}
  },null,opts);
  assert.strictEqual(automatic.mathematical.current.status,'resolved-candidate-math');
  assert(automatic.mathematical.active_completion,'resolved present math did not derive a current completion frontier');
  assert.strictEqual(automatic.mathematical.active_completion.cue.signature,resolved.signature);
  assert(automatic.mathematical.active_completion.historical_contacts.some(x=>x.id==='meaning-a-contact'),'automatic current frontier did not reach its warranted historical contact');
  assert(automatic.mathematical.active_completion.historical_resolution,'automatic completion omitted occurrence-safe historical resolution');
  assert.notStrictEqual(automatic.mathematical.active_completion.historical_resolution.occurrence_status,'none','automatic present cue failed to expose any retained occurrence');

  // A later blind surface step can also carry only an explicit mathematical cue.
  // The ordinary proposer receives current live relational completion and
  // retained historical contact from the same ledger. No retrieval index exists.
  let cueSeen=null;
  await liveUniversalStep(U,L,B,{
    utterance:'nemi tovan',context:{stream:'opaque'},
    math_cue:[subset(V('cueX'),V('cueZ'))]
  },async view=>{
    cueSeen=view.universal_math.cue_completion;
    return{surface:{candidates:[{id:'surface-b',label:'opaque-b',support:1}]}};
  },opts);
  assert(cueSeen,'ordinary proposer did not receive relational cue completion');
  assert(cueSeen.stabilized_relations.some(r=>r.signature===subsetSig),'cue failed to reach stabilized relation');
  assert(cueSeen.historical_contacts.some(x=>x.id==='seed-contact')||cueSeen.historical_contacts.some(x=>x.id==='meaning-a-contact'),'cue failed to reaccess retained upstream contact');
  assert(cueSeen.maximal_live_completions.length>=1,'cue failed to reopen any current larger structure');
  assert(cueSeen.historical_resolution,'explicit cue completion omitted occurrence-safe history');
  assert(cueSeen.historical_resolution.occurrence_count>=1,'explicit cue did not expose candidate historical occurrences');

  // The connector must not copy either authority into the other state.
  assert.strictEqual(Object.prototype.hasOwnProperty.call(U,'math_hypotheses'),false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(U,'stabilized_relations'),false);
  assert(B.bindings.every(x=>!Object.prototype.hasOwnProperty.call(x,'graph')&&!Object.prototype.hasOwnProperty.call(x,'status')),'bridge copied mathematical graph/status');

  // Generic mechanism/output remains free of the semantic faculties that may be
  // investigated later through this same path.
  const pure=JSON.stringify({first,automatic,cueSeen}).toLowerCase();
  for(const word of ['memory','remember','recollect','attention','focus'])assert(!pure.includes(word));

  console.log(JSON.stringify({
    ordinary_F_oracle_sees_live_stabilized_math:true,
    proposed_math_reuses_stable_relations:2,
    unresolved_remainder_preserved:true,
    proposal_created_math_evidence:0,
    upstream_contact_resolves_old_surface_binding:true,
    resolved_present_math_derives_current_frontier_automatically:true,
    active_completion_exposes_occurrence_safe_history:true,
    later_cue_reaccesses_same_live_ledger:true,
    copied_math_authority_in_U:0,
    copied_math_status_in_bridge:0,
    semantic_faculty_labels_in_generic_connection:0,
    whole:1
  },null,2));
  console.log('UNIVERSAL LIVE PROPOSER TEST: PASS');
})().catch(e=>{console.error(e);process.exit(1);});
