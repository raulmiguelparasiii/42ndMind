'use strict';

const assert=require('assert');
const {one}=require('./universal-language');
const {oneEnglishMathBridge}=require('./english-math-bridge');
const {oneMathHypothesisLedger}=require('./math-hypotheses');
const {MOP,variable,constant,app,compileMathGraph}=require('./universal-math-graph');
const {liveUniversalStep}=require('./universal-live-proposer');

const V=variable,C=constant,A=app;
const subset=(x,y)=>A(MOP.SUBSET,x,y);
const eq=(x,y)=>A(MOP.EQ,x,y);
const opts={maxCoreStates:200000,maxMatchStates:250000,maxCanonicalStates:250000};

(async()=>{
  const U=one();
  const L=oneMathHypothesisLedger();
  const B=oneEnglishMathBridge();

  const P=V('P'),W=V('W'),ctx=V('ctx');
  const east=[subset(P,W),eq(ctx,C('east-entrance'))];
  const X=V('X'),Z=V('Z'),ctx2=V('ctx2');
  const west=[subset(X,Z),eq(ctx2,C('west-entrance'))];

  // A normal live step can carry explicit independent mathematical contact. The
  // contact is retained by the existing evidence ledger; no direct storage call
  // or separate history object is used by the caller.
  const first=await liveUniversalStep(U,L,B,{
    utterance:'opaque experience one',context:{stream:'ordinary-live-input'},
    math_contact:{input:east,id:'live-east',complete:true,kind:'observed-contact'}
  },async view=>{
    // The proposer runs before this step's explicit contact is entered, so it
    // cannot manufacture evidence by proposing something and then reading it as
    // already experienced within the same oracle view.
    assert.strictEqual(view.universal_math.cue_completion,null);
    return null;
  },opts);
  assert.strictEqual(first.mathematical.entered_contact.id,'live-east');
  assert.strictEqual(first.mathematical.entered_contact.source_backed,true);
  assert.strictEqual(L.evidence.length,1);
  assert.strictEqual(L.evidence[0].id,'live-east');

  // A second ordinary contact with the same event schema but a different bound
  // context becomes a separate occurrence in the same ledger.
  const second=await liveUniversalStep(U,L,B,{
    utterance:'opaque experience two',context:{stream:'ordinary-live-input'},
    math_contact:{input:west,id:'live-west',complete:true,kind:'observed-contact'}
  },null,opts);
  assert.strictEqual(second.mathematical.entered_contact.id,'live-west');
  assert.strictEqual(second.mathematical.entered_contact.source_backed,true);
  assert.strictEqual(L.evidence.length,2);

  // Later, only a coarse cue is supplied. It must reopen BOTH compatible past
  // occurrences and remain ambiguous rather than selecting the newest one.
  // At the same time, the source-backed cross-occurrence view may expose only
  // complete relations shared by both episodes; their different context values
  // remain outside that common abstraction.
  const coarseCue=[subset(V('cueP'),V('cueW'))];
  let coarse=null;
  await liveUniversalStep(U,L,B,{
    utterance:'opaque later cue',context:{stream:'ordinary-live-input'},
    math_cue:coarseCue
  },async view=>{
    coarse=view.universal_math.cue_completion;
    return null;
  },opts);
  assert(coarse,'later live cue did not reaccess retained contact');
  assert.strictEqual(coarse.historical_resolution.structure_status,'ambiguous');
  assert.strictEqual(coarse.historical_resolution.occurrence_status,'ambiguous');
  assert.deepStrictEqual(new Set(coarse.historical_resolution.candidate_occurrence_ids),new Set(['live-east','live-west']));
  assert.strictEqual(coarse.historical_abstraction.status,'derived-common-relations');
  const subsetSig=compileMathGraph([subset(V('s'),V('u'))],opts).signature;
  assert(coarse.historical_abstraction.relations.some(r=>r.signature===subsetSig),'live cross-occurrence view lost the complete relation shared by both episodes');
  const eastContextSig=compileMathGraph([eq(V('c'),C('east-entrance'))],opts).signature;
  const westContextSig=compileMathGraph([eq(V('c'),C('west-entrance'))],opts).signature;
  assert(!coarse.historical_abstraction.relations.some(r=>r.signature===eastContextSig||r.signature===westContextSig),'episode-specific context leaked into common live abstraction');

  // Reinstating the east-bound contextual relation identifies the east episode.
  // This uses the mathematical content of the earlier contact, not its id. A
  // single resolved occurrence is deliberately insufficient for cross-episode
  // abstraction.
  let eastRecall=null;
  await liveUniversalStep(U,L,B,{
    utterance:'opaque contextual cue',context:{stream:'ordinary-live-input'},
    math_cue:east
  },async view=>{eastRecall=view.universal_math.cue_completion;return null;},opts);
  assert(eastRecall);
  assert.strictEqual(eastRecall.historical_resolution.structure_status,'resolved');
  assert.strictEqual(eastRecall.historical_resolution.occurrence_status,'resolved');
  assert.deepStrictEqual(eastRecall.historical_resolution.candidate_occurrence_ids,['live-east']);
  assert.strictEqual(eastRecall.historical_abstraction.status,'insufficient-recurrence');

  // A later recurrence of the identical east-bound content is a new occurrence.
  // Content recognition remains resolved, while source occurrence becomes
  // ambiguous. Shared structure can now be derived across those two occurrences
  // without erasing the fact that they remain distinct episodes.
  const P3=V('P3'),W3=V('W3'),ctx3=V('ctx3');
  const eastAgain=[subset(P3,W3),eq(ctx3,C('east-entrance'))];
  await liveUniversalStep(U,L,B,{
    utterance:'opaque repeated experience',context:{stream:'ordinary-live-input'},
    math_contact:{input:eastAgain,id:'live-east-repeat',complete:true,kind:'observed-contact'}
  },null,opts);

  let repeated=null;
  await liveUniversalStep(U,L,B,{
    utterance:'opaque repeated cue',context:{stream:'ordinary-live-input'},
    math_cue:east
  },async view=>{repeated=view.universal_math.cue_completion;return null;},opts);
  assert.strictEqual(repeated.historical_resolution.structure_status,'resolved');
  assert.strictEqual(repeated.historical_resolution.occurrence_status,'ambiguous');
  assert.strictEqual(repeated.historical_resolution.repeated_same_structure,true);
  assert.deepStrictEqual(new Set(repeated.historical_resolution.candidate_occurrence_ids),new Set(['live-east','live-east-repeat']));
  assert.strictEqual(repeated.historical_abstraction.status,'derived-common-relations');
  assert(repeated.historical_abstraction.relation_count>=2,'identical repeated episode content did not expose its shared complete relations');

  // Reaccess itself remains read-only. Only explicit later contact adds an entry.
  const before=L.evidence.length;
  await liveUniversalStep(U,L,B,{utterance:'opaque cue only',math_cue:coarseCue},null,opts);
  assert.strictEqual(L.evidence.length,before);

  const pure=JSON.stringify({first,second,coarse,eastRecall,repeated}).toLowerCase();
  for(const word of ['memory','remember','recollect','attention','focus'])assert(!pure.includes(word));

  console.log(JSON.stringify({
    ordinary_live_contact_enters_existing_evidence_ledger:true,
    proposal_path_cannot_self_certify_same_step_contact:true,
    later_partial_cue_reaccesses_prior_live_contacts:true,
    overlapping_prior_contacts_compete:true,
    recency_does_not_choose_source:true,
    common_complete_relations_derive_across_competing_episodes:true,
    episode_specific_context_stays_outside_common_abstraction:true,
    reinstated_context_identifies_prior_occurrence:true,
    one_occurrence_does_not_generalize:true,
    repeated_identical_content_does_not_invent_occurrence_identity:true,
    repeated_identical_content_can_expose_shared_relations:true,
    cue_only_reaccess_is_read_only:true,
    separate_history_or_semantic_store:0,
    semantic_faculty_labels_in_generic_output:0,
    whole:1
  },null,2));
  console.log('LIVE EPISODIC REACCESS TEST: PASS');
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
