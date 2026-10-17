'use strict';

const assert=require('assert');
const {one}=require('./universal-language');
const {oneEnglishMathBridge}=require('./english-math-bridge');
const {oneMathHypothesisLedger}=require('./math-hypotheses');
const {MOP,variable,constant,app}=require('./universal-math-graph');
const {liveUniversalStep}=require('./universal-live-proposer');
const {sourceCoherence}=require('./relational-source-coherence');

const V=variable,C=constant,A=app;
const eq=(x,y)=>A(MOP.EQ,x,y);
const subset=(x,y)=>A(MOP.SUBSET,x,y);
const opts={maxCoreStates:200000,maxMatchStates:250000,maxCanonicalStates:250000};

(async()=>{
  const U=one(),L=oneMathHypothesisLedger(),B=oneEnglishMathBridge();

  // One retained occurrence contains both familiar complete relation TYPES, but
  // they concern different entities. The folder-bearing entity is not the entity
  // that is inside the world.
  const occurrence=[
    eq(V('folderEntity'),C('folder')),
    subset(V('differentEntity'),V('world'))
  ];
  await liveUniversalStep(U,L,B,{
    utterance:'opaque bound occurrence',
    math_contact:{input:occurrence,id:'binding-source',complete:true,kind:'observed-contact'}
  },null,opts);

  // The cue requires ONE AND THE SAME entity to satisfy both relations. Each
  // top-level constraint is anonymously familiar in isolation, but there is no
  // structure-preserving whole-cue embedding into the retained occurrence.
  const cue=[
    eq(V('sameEntity'),C('folder')),
    subset(V('sameEntity'),V('cueWorld'))
  ];
  const result=sourceCoherence(L,cue,opts);

  assert.strictEqual(result.all_constraints_individually_sourced,true,
    'test setup failed: both complete relation types should be individually sourced');
  assert.strictEqual(result.whole_source_supported,false,
    'source coherence ignored cross-constraint variable binding and fabricated whole-source support');
  assert.deepStrictEqual(result.whole_source_occurrence_ids,[]);
  assert.strictEqual(result.status,'binding-incoherent-source',
    'familiar relations with incompatible co-reference should remain source-incoherent');

  // Control: when one retained occurrence really preserves the shared binding,
  // the same cue should become source-supported without altering the earlier
  // occurrence.
  const coherent=[
    eq(V('oneEntity'),C('folder')),
    subset(V('oneEntity'),V('oneWorld'))
  ];
  await liveUniversalStep(U,L,B,{
    utterance:'opaque coherent occurrence',
    math_contact:{input:coherent,id:'binding-coherent',complete:true,kind:'observed-contact'}
  },null,opts);
  const after=sourceCoherence(L,cue,opts);
  assert.strictEqual(after.status,'source-supported');
  assert.strictEqual(after.whole_source_supported,true);
  assert.deepStrictEqual(after.whole_source_occurrence_ids,['binding-coherent']);

  console.log(JSON.stringify({
    independent_constraint_familiarity_does_not_erase_coreference:true,
    incompatible_binding_does_not_fabricate_whole_source:true,
    coherent_shared_binding_is_source_supported:true,
    separate_binding_memory_authority:0,
    whole:1
  },null,2));
  console.log('SOURCE BINDING COHERENCE TEST: PASS');
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
