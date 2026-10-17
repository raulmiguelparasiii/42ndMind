'use strict';

const assert=require('assert');
const {one}=require('./universal-language');
const {oneEnglishMathBridge}=require('./english-math-bridge');
const {oneMathHypothesisLedger}=require('./math-hypotheses');
const {MOP,variable,constant,app,compileMathGraph}=require('./universal-math-graph');
const {liveUniversalStep}=require('./universal-live-proposer');
const {abstractRelationalHistory}=require('./relational-history-abstraction');

const V=variable,C=constant,A=app;
const subset=(x,y)=>A(MOP.SUBSET,x,y);
const eq=(x,y)=>A(MOP.EQ,x,y);
const opts={maxCoreStates:200000,maxMatchStates:250000,maxCanonicalStates:250000};

(async()=>{
  const U=one(),L=oneMathHypothesisLedger(),B=oneEnglishMathBridge();
  const folderCue=[eq(V('cueItem'),C('folder'))];

  // One source-backed occurrence is retained, but one episode is not enough for
  // cross-occurrence abstraction.
  const P=V('P'),W=V('W'),ctx=V('ctx');
  const east=[subset(P,W),eq(P,C('folder')),eq(ctx,C('east-entrance'))];
  const first=await liveUniversalStep(U,L,B,{
    utterance:'opaque east episode',
    math_contact:{input:east,id:'east-folder',complete:true,kind:'observed-contact'}
  },null,opts);
  assert.strictEqual(first.mathematical.entered_contact.source_backed,true);
  assert(Array.isArray(L.evidence[0].metadata.source_expressions),'live source expressions were not retained with contact provenance');

  let view=abstractRelationalHistory(L,folderCue,opts);
  assert.strictEqual(view.abstraction.status,'insufficient-recurrence');
  assert.strictEqual(view.abstraction.relation_count,0);

  // A second episode has the SAME item/world and item/folder relation schemas but
  // a different bound context. The categorical abstraction may retain only the
  // complete relations shared across both source-backed occurrences.
  const X=V('X'),Z=V('Z'),ctx2=V('ctx2');
  const west=[subset(X,Z),eq(X,C('folder')),eq(ctx2,C('west-entrance'))];
  await liveUniversalStep(U,L,B,{
    utterance:'opaque west episode',
    math_contact:{input:west,id:'west-folder',complete:true,kind:'observed-contact'}
  },null,opts);

  view=abstractRelationalHistory(L,folderCue,opts);
  assert.strictEqual(view.abstraction.status,'derived-common-relations');
  assert.strictEqual(view.abstraction.complete,true);
  assert.strictEqual(view.abstraction.selected_occurrence_count,2);

  const subsetSig=compileMathGraph([subset(V('a'),V('b'))],opts).signature;
  const folderSig=compileMathGraph([eq(V('a'),C('folder'))],opts).signature;
  const eastSig=compileMathGraph([eq(V('a'),C('east-entrance'))],opts).signature;
  const westSig=compileMathGraph([eq(V('a'),C('west-entrance'))],opts).signature;
  const sigs=new Set(view.abstraction.relations.map(r=>r.signature));
  assert(sigs.has(subsetSig),'shared complete subset relation was not abstracted across episodes');
  assert(sigs.has(folderSig),'shared complete folder relation was not abstracted across episodes');
  assert(!sigs.has(eastSig)&&!sigs.has(westSig),'episode-specific context leaked into cross-episode common relation');
  assert(view.abstraction.relations.every(r=>r.status==='derived-common-complete-relation'));
  assert(view.abstraction.relations.every(r=>r.occurrence_count===2));
  assert(view.abstraction.differing_relation_count>=2,'episode-specific remainder disappeared instead of staying different');

  // Variable naming is irrelevant: the common identities above matched despite
  // distinct source variable names in the two episodes.
  assert.notDeepStrictEqual(east.map(JSON.stringify),west.map(JSON.stringify));

  // A matching graph-only occurrence lacks complete source formula boundaries.
  // It must block categorical abstraction rather than letting a maximum-common
  // serialization fragment masquerade as semantic structure.
  const graphOnly=compileMathGraph([
    subset(V('g'),V('world')),eq(V('g'),C('folder')),eq(V('where'),C('north-entrance'))
  ],opts);
  await liveUniversalStep(U,L,B,{
    utterance:'opaque graph-only episode',
    math_contact:{input:graphOnly,id:'graph-only-folder',complete:true,kind:'observed-contact'}
  },null,opts);
  const blocked=abstractRelationalHistory(L,folderCue,opts);
  assert.strictEqual(blocked.abstraction.status,'incomplete-source-boundaries');
  assert.strictEqual(blocked.abstraction.complete,false);
  assert.strictEqual(blocked.abstraction.relation_count,0,'graph-only occurrence allowed categorical abstraction without source boundaries');

  const pure=JSON.stringify({view,blocked}).toLowerCase();
  for(const word of ['memory','remember','recollect','semantic memory','episodic memory'])assert(!pure.includes(word));

  console.log(JSON.stringify({
    single_occurrence_does_not_generalize:true,
    repeated_source_backed_occurrences_expose_common_complete_relations:true,
    variable_names_do_not_define_cross_episode_identity:true,
    context_specific_remainder_stays_episode_specific:true,
    graph_fragment_not_promoted_to_cross_episode_relation:true,
    graph_only_selected_occurrence_blocks_categorical_abstraction:true,
    separate_semantic_store:0,
    whole:1
  },null,2));
  console.log('RELATIONAL HISTORY ABSTRACTION TEST: PASS');
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
