'use strict';

const assert=require('assert');
const {one}=require('./universal-language');
const {oneEnglishMathBridge}=require('./english-math-bridge');
const {oneMathHypothesisLedger}=require('./math-hypotheses');
const {MOP,variable,constant,app,compileMathGraph}=require('./universal-math-graph');
const {liveUniversalStep}=require('./universal-live-proposer');
const {cueAccessibility}=require('./relational-cue-accessibility');

const V=variable,C=constant,A=app;
const eq=(x,y)=>A(MOP.EQ,x,y);
const opts={maxCoreStates:200000,maxMatchStates:250000,maxCanonicalStates:250000};

(async()=>{
  const U=one(),L=oneMathHypothesisLedger(),B=oneEnglishMathBridge();
  const episode=(tag,place)=>[
    eq(V(`${tag}:item`),C('folder')),
    eq(V(`${tag}:place`),C(place))
  ];
  const east=episode('e','east-entrance');
  const west=episode('w','west-entrance');
  const north=episode('n','north-entrance');

  // Retain two ordinary source-backed episodes. Accessibility is derived later;
  // nothing here writes a strength, activation, decay, or retrieval index.
  await liveUniversalStep(U,L,B,{
    utterance:'opaque east event',
    math_contact:{input:east,id:'east',complete:true,kind:'observed-contact'}
  },null,opts);
  await liveUniversalStep(U,L,B,{
    utterance:'opaque west event',
    math_contact:{input:west,id:'west',complete:true,kind:'observed-contact'}
  },null,opts);
  assert.strictEqual(L.evidence.length,2);

  // A weak complete cue matches one relation in both episodes. Both are equally
  // accessible; deterministic ledger order/recency must not make either unique.
  const coarse=[eq(V('cue:item'),C('folder'))];
  let coarseView=null;
  await liveUniversalStep(U,L,B,{utterance:'opaque weak cue',math_cue:coarse},async view=>{
    coarseView=view.universal_math.cue_completion;
    return null;
  },opts);
  assert(coarseView);
  assert.strictEqual(coarseView.cue_accessibility.status,'ambiguous-best');
  assert.strictEqual(coarseView.cue_accessibility.competing_occurrence_count,2);
  assert.strictEqual(coarseView.cue_accessibility.interference_count,1);
  assert.deepStrictEqual(new Set(coarseView.cue_accessibility.top_occurrence_ids),new Set(['east','west']));

  // Add another similar episode. The old contacts remain byte-for-byte present,
  // while the same coarse cue acquires another competitor. This is interference
  // through relational competition, not deletion or decay.
  const beforeIds=L.evidence.map(e=>e.id);
  await liveUniversalStep(U,L,B,{
    utterance:'opaque north event',
    math_contact:{input:north,id:'north',complete:true,kind:'observed-contact'}
  },null,opts);
  assert.deepStrictEqual(L.evidence.slice(0,2).map(e=>e.id),beforeIds);

  let crowded=null;
  await liveUniversalStep(U,L,B,{utterance:'opaque crowded cue',math_cue:coarse},async view=>{
    crowded=view.universal_math.cue_completion;
    return null;
  },opts);
  assert.strictEqual(crowded.cue_accessibility.status,'ambiguous-best');
  assert.strictEqual(crowded.cue_accessibility.competing_occurrence_count,3);
  assert.strictEqual(crowded.cue_accessibility.interference_count,2);
  assert.deepStrictEqual(new Set(crowded.cue_accessibility.top_occurrence_ids),new Set(['east','west','north']));

  // Add one relevant context relation to the cue. East now covers the entire cue;
  // west/north still match the shared folder relation and therefore remain live
  // competitors at lower accessibility rather than being erased.
  const richer=[
    eq(V('cue:item2'),C('folder')),
    eq(V('cue:place2'),C('east-entrance'))
  ];
  let richView=null;
  await liveUniversalStep(U,L,B,{utterance:'opaque richer cue',math_cue:richer},async view=>{
    richView=view.universal_math.cue_completion;
    return null;
  },opts);
  const access=richView.cue_accessibility;
  assert.strictEqual(access.status,'unique-best');
  assert.deepStrictEqual(access.top_occurrence_ids,['east']);
  assert.strictEqual(access.competing_occurrence_count,3,'richer context deleted competitors instead of changing accessibility');
  const byId=Object.fromEntries(access.candidates.map(x=>[x.id,x]));
  assert.strictEqual(byId.east.cue_coverage,1);
  assert.strictEqual(byId.west.cue_coverage,0.5);
  assert.strictEqual(byId.north.cue_coverage,0.5);
  assert.strictEqual(richView.historical_resolution.occurrence_status,'resolved','strict complete cue did not resolve its matching occurrence');
  assert.deepStrictEqual(richView.historical_resolution.candidate_occurrence_ids,['east']);

  // The accessibility calculation itself can be called directly and is exactly
  // the same read-only relation over cue and retained source contact.
  const direct=cueAccessibility(L,richer,opts);
  assert.deepStrictEqual(direct.top_occurrence_ids,['east']);
  const evidenceBeforeQueries=L.evidence.length;
  cueAccessibility(L,coarse,opts);cueAccessibility(L,richer,opts);
  assert.strictEqual(L.evidence.length,evidenceBeforeQueries,'accessibility query mutated retained evidence');

  // A compiled graph has no complete source formula boundaries. It may be useful
  // elsewhere for structural matching, but it cannot receive this categorical
  // source-backed accessibility score because arbitrary graph pieces can cut
  // through mathematical serialization.
  const graphOnlyCue=compileMathGraph(richer,opts);
  const unsafe=cueAccessibility(L,graphOnlyCue,opts);
  assert.strictEqual(unsafe.status,'incomplete-source-cue');
  assert.strictEqual(unsafe.complete,false);
  assert.strictEqual(unsafe.candidates.length,0);

  const pure=JSON.stringify({coarse:coarseView.cue_accessibility,crowded:crowded.cue_accessibility,rich:access}).toLowerCase();
  for(const word of ['memory strength','forgetting module','decay rate','attention controller'])assert(!pure.includes(word));

  console.log(JSON.stringify({
    weak_cue_can_leave_multiple_occurrences_equally_accessible:true,
    added_similar_episode_increases_interference_without_deletion:true,
    richer_context_can_create_unique_best_accessibility:true,
    lower_ranked_competitors_remain_retained_and_accessible:true,
    strict_source_resolution_and_graded_accessibility_are_distinct:true,
    accessibility_query_is_read_only:true,
    graph_only_cue_refused_for_source_backed_accessibility:true,
    stored_decay_or_memory_strength:0,
    separate_forgetting_or_attention_module:0,
    whole:1
  },null,2));
  console.log('CUE ACCESSIBILITY / INTERFERENCE TEST: PASS');
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
