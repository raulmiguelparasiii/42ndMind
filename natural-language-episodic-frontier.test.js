'use strict';

const assert=require('assert');
const {one,F}=require('./universal-language');
const {oneEnglishMathBridge}=require('./english-math-bridge');
const {oneMathHypothesisLedger}=require('./math-hypotheses');
const {MOP,variable,constant,app,compileMathGraph}=require('./universal-math-graph');
const {liveUniversalStep}=require('./universal-live-proposer');

const V=variable,C=constant,A=app;
const subset=(x,y)=>A(MOP.SUBSET,x,y);
const eq=(x,y)=>A(MOP.EQ,x,y);
const opts={maxCoreStates:200000,maxMatchStates:250000,maxCanonicalStates:250000,surfaceTieTolerance:1e-9};

(async()=>{
  const U=one({config:{min_equivalence_support:2,history_limit:4096,candidate_floor:0.04,max_components:4}});
  const L=oneMathHypothesisLedger();
  const B=oneEnglishMathBridge();
  const ctx={domain:'paired-episodic-language'};

  const itemE=V('itemE'),worldE=V('worldE'),placeE=V('placeE');
  const east=[
    subset(itemE,worldE),
    eq(itemE,C('folder')),
    eq(placeE,C('east-entrance'))
  ];
  const itemW=V('itemW'),worldW=V('worldW'),placeW=V('placeW');
  const west=[
    subset(itemW,worldW),
    eq(itemW,C('folder')),
    eq(placeW,C('west-entrance'))
  ];
  const eastGraph=compileMathGraph(east,opts),westGraph=compileMathGraph(west,opts);

  // Each first ordinary-language experience creates an opaque surface relation,
  // proposes its mathematics, and carries independent source-backed contact in
  // the SAME live step. Proposal is installed before explicit contact is routed,
  // but the proposal itself does not count as evidence.
  const eastFirst=await liveUniversalStep(U,L,B,{
    utterance:'I left the folder beside the east entrance.',context:ctx,math_graph:eastGraph,
    math_contact:{input:east,id:'east-experience',complete:true,kind:'observed-contact',spaces:['east-space']}
  },async()=>({
    surface:{candidates:[{id:'surface-east',label:'opaque-east',support:1}]},
    math_spaces:[{relation_ref:'surface-east',space_id:'east-space',alternatives:[{id:'east-h',expressions:east,source:'episode-proposer'}]}]
  }),opts);
  assert.strictEqual(eastFirst.mathematical.entered_contact.id,'east-experience');
  assert.strictEqual(eastFirst.mathematical.current.status,'resolved-candidate-math');

  const westFirst=await liveUniversalStep(U,L,B,{
    utterance:'I left the folder beside the west entrance.',context:ctx,math_graph:westGraph,
    math_contact:{input:west,id:'west-experience',complete:true,kind:'observed-contact',spaces:['west-space']}
  },async()=>({
    surface:{candidates:[{id:'surface-west',label:'opaque-west',support:1}]},
    math_spaces:[{relation_ref:'surface-west',space_id:'west-space',alternatives:[{id:'west-h',expressions:west,source:'episode-proposer'}]}]
  }),opts);
  assert.strictEqual(westFirst.mathematical.entered_contact.id,'west-experience');
  assert.strictEqual(westFirst.mathematical.current.status,'resolved-candidate-math');

  // Symmetric, structurally grounded language schooling gives the surface layer
  // enough varied wording to separate context-rich cues without naming either
  // relation semantically inside the runtime.
  const pairs=[
    ['The folder was beside the east entrance.','The folder was beside the west entrance.'],
    ['I remember the folder near the east entrance.','I remember the folder near the west entrance.'],
    ['The folder remained near the east entrance.','The folder remained near the west entrance.']
  ];
  for(const [e,w] of pairs){
    await F(U,{utterance:e,context:ctx,math_graph:eastGraph,relations:[{id:'surface-east'}],source:'paired-surface-school'});
    await F(U,{utterance:w,context:ctx,math_graph:westGraph,relations:[{id:'surface-west'}],source:'paired-surface-school'});
  }
  const eastCanon=U.canonical['surface-east']||'surface-east';
  const westCanon=U.canonical['surface-west']||'surface-west';
  assert.notStrictEqual(eastCanon,westCanon,'different contextual episode meanings collapsed during surface schooling');

  // A context-rich English-only cue should collapse to one mathematical episode
  // and reaccess its source occurrence without any explicit math cue.
  const eastCue=await liveUniversalStep(U,L,B,{
    utterance:'I left the folder near the east entrance.',context:ctx
  },null,opts);
  assert.strictEqual(eastCue.mathematical.current.status,'resolved-candidate-math');
  assert.strictEqual(eastCue.mathematical.current.relation,eastCanon);
  assert.strictEqual(eastCue.mathematical.surface_math_frontier.status,'resolved-candidate-math');
  assert.strictEqual(eastCue.mathematical.surface_math_frontier.relation_count,1);
  assert.strictEqual(eastCue.mathematical.active_completion_frontier.status,'resolved-candidate-math');
  assert.deepStrictEqual(eastCue.mathematical.active_completion_frontier.historical_resolution.candidate_occurrence_ids,['east-experience']);

  // Remove only the distinguishing context word. Both learned surface meanings
  // are now exactly equally supported. Deterministic lexical ordering may still
  // have a first row internally, but the bridge is forbidden to turn that tie
  // into one mathematical/source answer.
  const ambiguous=await liveUniversalStep(U,L,B,{
    utterance:'I left the folder beside the entrance.',context:ctx
  },null,opts);
  assert.strictEqual(ambiguous.mathematical.current.status,'ambiguous','surface tie fabricated one current mathematical answer');
  assert.strictEqual(ambiguous.mathematical.current.relation,null,'ambiguous English cue exposed an arbitrary singular relation');
  assert.strictEqual(ambiguous.mathematical.active_completion,null,'legacy singular completion survived an acknowledged surface ambiguity');
  assert.strictEqual(ambiguous.mathematical.surface_math_frontier.surface_status,'ambiguous');
  assert.strictEqual(ambiguous.mathematical.surface_math_frontier.status,'ambiguous');
  assert.strictEqual(ambiguous.mathematical.surface_math_frontier.relation_count,2);
  assert.strictEqual(ambiguous.mathematical.active_completion_frontier.status,'ambiguous');
  assert.strictEqual(ambiguous.mathematical.active_completion_frontier.alternative_count,2);
  assert.deepStrictEqual(
    new Set(ambiguous.mathematical.active_completion_frontier.historical_resolution.candidate_occurrence_ids),
    new Set(['east-experience','west-experience'])
  );
  assert.strictEqual(ambiguous.mathematical.active_completion_frontier.historical_resolution.occurrence_status,'ambiguous');
  assert.strictEqual(ambiguous.mathematical.active_completion_frontier.historical_resolution.competing_structures,true);

  // Even while source is ambiguous, repeated episode structure can expose safe
  // common complete relations. The east/west bound context itself must not leak
  // into that common abstraction.
  const common=ambiguous.mathematical.active_completion_frontier.historical_abstraction;
  assert.strictEqual(common.status,'derived-common-relations');
  const folderSig=compileMathGraph([eq(V('item'),C('folder'))],opts).signature;
  const eastContextSig=compileMathGraph([eq(V('place'),C('east-entrance'))],opts).signature;
  const westContextSig=compileMathGraph([eq(V('place'),C('west-entrance'))],opts).signature;
  const commonSigs=new Set(common.relations.map(r=>r.signature));
  assert(commonSigs.has(folderSig),'ambiguous recall lost the complete relation common to both episodes');
  assert(!commonSigs.has(eastContextSig)&&!commonSigs.has(westContextSig),'episode-specific source context leaked into common abstraction');

  // Reinstating one context word collapses the surface->math frontier and source
  // ambiguity without rebinding or writing any new evidence.
  const evidenceBefore=L.evidence.length;
  const westCue=await liveUniversalStep(U,L,B,{
    utterance:'I left the folder near the west entrance.',context:ctx
  },null,opts);
  assert.strictEqual(westCue.mathematical.current.status,'resolved-candidate-math');
  assert.strictEqual(westCue.mathematical.current.relation,westCanon);
  assert.strictEqual(westCue.mathematical.surface_math_frontier.relation_count,1);
  assert.deepStrictEqual(westCue.mathematical.active_completion_frontier.historical_resolution.candidate_occurrence_ids,['west-experience']);
  assert.strictEqual(L.evidence.length,evidenceBefore,'English-only source disambiguation rewrote retained evidence');

  const pure=JSON.stringify({eastCue,ambiguous,westCue}).toLowerCase();
  for(const word of ['episodic memory','source memory','attention controller'])assert(!pure.includes(word));

  console.log(JSON.stringify({
    ordinary_language_experience_can_enter_live_math_and_contact_same_step:true,
    context_rich_english_cue_recovers_matching_episode:true,
    exact_surface_tie_returns_ambiguous_not_arbitrary_math:true,
    ambiguous_english_cue_keeps_two_live_completion_alternatives:true,
    ambiguous_source_does_not_fabricate_occurrence:true,
    common_relations_can_survive_source_ambiguity:true,
    episode_specific_context_stays_outside_common_abstraction:true,
    richer_english_context_collapses_frontier_without_rebinding:true,
    english_only_reaccess_writes_new_evidence:0,
    separate_memory_or_source_controller:0,
    whole:1
  },null,2));
  console.log('NATURAL-LANGUAGE EPISODIC FRONTIER TEST: PASS');
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
