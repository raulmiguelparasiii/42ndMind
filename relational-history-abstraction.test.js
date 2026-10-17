'use strict';

const assert=require('assert');
const {one}=require('./universal-language');
const {oneEnglishMathBridge}=require('./english-math-bridge');
const {oneMathHypothesisLedger}=require('./math-hypotheses');
const {MOP,variable,constant,app,compileMathGraph}=require('./universal-math-graph');
const {liveUniversalStep}=require('./universal-live-proposer');
const {recurrentRelationalHistory}=require('./relational-history-abstraction');

const V=variable,C=constant,A=app;
const subset=(x,y)=>A(MOP.SUBSET,x,y);
const eq=(x,y)=>A(MOP.EQ,x,y);
const opts={maxCoreStates:200000,maxMatchStates:250000,maxCanonicalStates:250000};

(async()=>{
  const U=one(),L=oneMathHypothesisLedger(),B=oneEnglishMathBridge();
  const folderCue=[eq(V('cueItem'),C('folder'))];

  // One source-backed occurrence is retained, but one episode is not enough for
  // a cross-occurrence recurrence clue.
  const P=V('P'),W=V('W'),ctx=V('ctx');
  const east=[subset(P,W),eq(P,C('folder')),eq(ctx,C('east-entrance'))];
  const first=await liveUniversalStep(U,L,B,{
    utterance:'opaque east episode',
    math_contact:{input:east,id:'east-folder',complete:true,kind:'observed-contact'}
  },null,opts);
  assert.strictEqual(first.mathematical.entered_contact.source_backed,true);
  assert(Array.isArray(L.evidence[0].metadata.source_expressions),'live source expressions were not retained with contact provenance');

  let view=recurrentRelationalHistory(L,folderCue,opts);
  assert.strictEqual(view.recurrence.result,'insufficient-recurrence');
  assert.strictEqual(view.recurrence.authority,'proposal-only');
  assert.strictEqual(view.recurrence.relation_count,0);

  // A second episode has the SAME item/world and item/folder relation schemas but
  // a different bound context. Recurrence may expose only complete relations
  // shared across both source-backed occurrences. This is still only a clue for
  // later proposal/evidence, not semantic stabilization.
  const X=V('X'),Z=V('Z'),ctx2=V('ctx2');
  const west=[subset(X,Z),eq(X,C('folder')),eq(ctx2,C('west-entrance'))];
  await liveUniversalStep(U,L,B,{
    utterance:'opaque west episode',
    math_contact:{input:west,id:'west-folder',complete:true,kind:'observed-contact'}
  },null,opts);

  view=recurrentRelationalHistory(L,folderCue,opts);
  assert.strictEqual(view.recurrence.result,'recurrent-complete-relations');
  assert.strictEqual(view.recurrence.complete,true);
  assert.strictEqual(view.recurrence.authority,'proposal-only');
  assert.strictEqual(view.recurrence.selected_occurrence_count,2);

  const subsetSig=compileMathGraph([subset(V('a'),V('b'))],opts).signature;
  const folderSig=compileMathGraph([eq(V('a'),C('folder'))],opts).signature;
  const eastSig=compileMathGraph([eq(V('a'),C('east-entrance'))],opts).signature;
  const westSig=compileMathGraph([eq(V('a'),C('west-entrance'))],opts).signature;
  const sigs=new Set(view.recurrence.relations.map(r=>r.signature));
  assert(sigs.has(subsetSig),'shared complete subset relation was not exposed as a recurrence clue');
  assert(sigs.has(folderSig),'shared complete folder relation was not exposed as a recurrence clue');
  assert(!sigs.has(eastSig)&&!sigs.has(westSig),'episode-specific context leaked into common recurrence');
  assert(view.recurrence.relations.every(r=>r.kind==='cross-occurrence-complete-recurrence-clue'));
  assert(view.recurrence.relations.every(r=>r.authority==='proposal-only'));
  assert(view.recurrence.relations.every(r=>r.occurrence_count===2));
  assert(view.recurrence.differing_relation_count>=2,'episode-specific remainder disappeared instead of staying different');

  // Variable naming is irrelevant: the common identities above matched despite
  // distinct source variable names in the two episodes.
  assert.notDeepStrictEqual(east.map(JSON.stringify),west.map(JSON.stringify));

  // A matching graph-only occurrence lacks complete source formula boundaries.
  // It must block categorical recurrence rather than letting a maximum-common
  // serialization fragment masquerade as a mathematical relation.
  const graphOnly=compileMathGraph([
    subset(V('g'),V('world')),eq(V('g'),C('folder')),eq(V('where'),C('north-entrance'))
  ],opts);
  await liveUniversalStep(U,L,B,{
    utterance:'opaque graph-only episode',
    math_contact:{input:graphOnly,id:'graph-only-folder',complete:true,kind:'observed-contact'}
  },null,opts);
  const blocked=recurrentRelationalHistory(L,folderCue,opts);
  assert.strictEqual(blocked.recurrence.result,'incomplete-source-boundaries');
  assert.strictEqual(blocked.recurrence.complete,false);
  assert.strictEqual(blocked.recurrence.authority,'proposal-only');
  assert.strictEqual(blocked.recurrence.relation_count,0,'graph-only occurrence allowed categorical recurrence without source boundaries');

  // This read path must not create a new candidate, support, status, or reusable
  // relation. Warrant still belongs upstream to math-hypotheses + stabilization.
  assert.strictEqual(Object.keys(L.candidates).length,0);
  assert.strictEqual(Object.keys(L.spaces).length,0);

  const pure=JSON.stringify({view,blocked}).toLowerCase();
  for(const word of ['memory','remember','recollect','semantic memory','episodic memory'])assert(!pure.includes(word));

  console.log(JSON.stringify({
    single_occurrence_does_not_generalize:true,
    repeated_source_backed_occurrences_expose_proposal_only_complete_recurrence:true,
    existing_complete_relation_boundary_reused:true,
    variable_names_do_not_define_cross_episode_identity:true,
    context_specific_remainder_stays_episode_specific:true,
    graph_fragment_not_promoted_to_cross_episode_relation:true,
    graph_only_selected_occurrence_blocks_categorical_recurrence:true,
    candidates_created_by_recurrence_read:0,
    spaces_created_by_recurrence_read:0,
    separate_semantic_store:0,
    whole:1
  },null,2));
  console.log('RELATIONAL HISTORY RECURRENCE TEST: PASS');
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
