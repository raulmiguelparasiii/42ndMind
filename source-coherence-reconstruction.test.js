'use strict';

const assert=require('assert');
const {one}=require('./universal-language');
const {oneEnglishMathBridge}=require('./english-math-bridge');
const {oneMathHypothesisLedger}=require('./math-hypotheses');
const {MOP,variable,constant,app,compileMathGraph}=require('./universal-math-graph');
const {liveUniversalStep}=require('./universal-live-proposer');
const {sourceCoherence}=require('./relational-source-coherence');

const V=variable,C=constant,A=app;
const eq=(x,y)=>A(MOP.EQ,x,y);
const opts={maxCoreStates:200000,maxMatchStates:250000,maxCanonicalStates:250000};

(async()=>{
  const U=one(),L=oneMathHypothesisLedger(),B=oneEnglishMathBridge();
  const episodeA=[eq(V('a:item'),C('folder')),eq(V('a:place'),C('east-entrance'))];
  const episodeB=[eq(V('b:item'),C('keys')),eq(V('b:place'),C('west-entrance'))];

  await liveUniversalStep(U,L,B,{utterance:'opaque A',math_contact:{input:episodeA,id:'episode-a',complete:true,kind:'observed-contact'}},null,opts);
  await liveUniversalStep(U,L,B,{utterance:'opaque B',math_contact:{input:episodeB,id:'episode-b',complete:true,kind:'observed-contact'}},null,opts);
  assert.strictEqual(L.evidence.length,2);

  // A cue matching one retained episode as a whole has coherent source support.
  let trueView=null;
  await liveUniversalStep(U,L,B,{utterance:'opaque true cue',math_cue:episodeA},async view=>{trueView=view.universal_math.cue_completion;return null;},opts);
  assert.strictEqual(trueView.cue_source_coherence.status,'source-supported');
  assert.strictEqual(trueView.cue_source_coherence.whole_source_supported,true);
  assert.deepStrictEqual(trueView.cue_source_coherence.whole_source_occurrence_ids,['episode-a']);

  // Recombine one familiar relation from each different episode. Every component
  // has a retained source, but NO single occurrence contains the conjunction.
  // Familiar pieces therefore cannot silently become a witnessed episode.
  const hybrid=[eq(V('h:item'),C('folder')),eq(V('h:place'),C('west-entrance'))];
  let hybridView=null;
  await liveUniversalStep(U,L,B,{utterance:'opaque hybrid cue',math_cue:hybrid},async view=>{hybridView=view.universal_math.cue_completion;return null;},opts);
  const coherence=hybridView.cue_source_coherence;
  assert.strictEqual(coherence.status,'cross-source-composite');
  assert.strictEqual(coherence.all_constraints_individually_sourced,true);
  assert.strictEqual(coherence.whole_source_supported,false);
  assert.deepStrictEqual(coherence.whole_source_occurrence_ids,[]);
  assert.strictEqual(coherence.constraint_sources.length,2);
  assert.strictEqual(hybridView.historical_resolution.occurrence_status,'none','hybrid cue fabricated a matching historical occurrence');
  assert.strictEqual(hybridView.cue_accessibility.status,'ambiguous-best','familiar hybrid pieces did not expose their competing source accessibility');
  assert.deepStrictEqual(new Set(hybridView.cue_accessibility.top_occurrence_ids),new Set(['episode-a','episode-b']));

  const folderSig=compileMathGraph([eq(V('x'),C('folder'))],opts).signature;
  const westSig=compileMathGraph([eq(V('x'),C('west-entrance'))],opts).signature;
  const sources=Object.fromEntries(coherence.constraint_sources.map(x=>[x.signature,x.occurrence_ids]));
  assert.deepStrictEqual(sources[folderSig],['episode-a']);
  assert.deepStrictEqual(sources[westSig],['episode-b']);

  // A cue containing a genuinely unsourced relation is different from a
  // cross-source composite: some of its mathematics has no retained source yet.
  const partlyUnknown=[eq(V('u:item'),C('folder')),eq(V('u:place'),C('south-entrance'))];
  const unknown=sourceCoherence(L,partlyUnknown,opts);
  assert.strictEqual(unknown.status,'partially-unsupported');
  assert.strictEqual(unknown.all_constraints_individually_sourced,false);
  assert.strictEqual(unknown.whole_source_supported,false);
  assert.strictEqual(unknown.unsupported_constraint_signatures.length,1);

  // Later independent contact can make the former hybrid source-coherent without
  // editing or erasing either earlier episode. The read follows current retained
  // history rather than freezing a prior verdict.
  const evidenceBefore=L.evidence.map(e=>e.id);
  await liveUniversalStep(U,L,B,{utterance:'opaque later C',math_contact:{input:hybrid,id:'episode-c',complete:true,kind:'observed-contact'}},null,opts);
  const after=sourceCoherence(L,hybrid,opts);
  assert.strictEqual(after.status,'source-supported');
  assert.strictEqual(after.whole_source_supported,true);
  assert.deepStrictEqual(after.whole_source_occurrence_ids,['episode-c']);
  assert.deepStrictEqual(L.evidence.slice(0,2).map(e=>e.id),evidenceBefore,'new confirming episode rewrote earlier source history');

  // Read-only source checking never mutates evidence, and graph-only input is not
  // granted formula/source boundaries it does not possess.
  const count=L.evidence.length;
  sourceCoherence(L,hybrid,opts);sourceCoherence(L,partlyUnknown,opts);
  assert.strictEqual(L.evidence.length,count);
  const graphOnly=sourceCoherence(L,compileMathGraph(hybrid,opts),opts);
  assert.strictEqual(graphOnly.status,'incomplete-source-cue');
  assert.strictEqual(graphOnly.complete,false);

  const pure=JSON.stringify({coherence,unknown,after}).toLowerCase();
  for(const word of ['false memory detector','hallucination module','reconstruction controller'])assert(!pure.includes(word));

  console.log(JSON.stringify({
    whole_episode_source_support_is_distinct_from_component_familiarity:true,
    cross_source_familiar_relations_do_not_fabricate_one_occurrence:true,
    component_sources_remain_inspectable:true,
    unsourced_relation_is_distinct_from_cross_source_recombination:true,
    later_independent_contact_can_make_former_composite_source_supported:true,
    earlier_source_history_survives_later_contact:true,
    source_coherence_read_is_nonmutating:true,
    graph_only_cue_gets_no_source_coherence_claim:true,
    separate_false_memory_or_reconstruction_controller:0,
    whole:1
  },null,2));
  console.log('SOURCE COHERENCE / RECONSTRUCTION TEST: PASS');
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
