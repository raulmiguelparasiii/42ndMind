'use strict';

const assert=require('assert');
const {one}=require('./universal-language');
const {oneEnglishMathBridge}=require('./english-math-bridge');
const {oneMathHypothesisLedger,contactMathSpace,currentMathSpace}=require('./math-hypotheses');
const {MOP,variable,constant,app,compileMathGraph}=require('./universal-math-graph');
const {liveUniversalStep}=require('./universal-live-proposer');

const V=variable,C=constant,A=app;
const eq=(x,y)=>A(MOP.EQ,x,y);
const opts={maxCoreStates:200000,maxMatchStates:250000,maxCanonicalStates:250000};

(async()=>{
  const U=one(),L=oneMathHypothesisLedger(),B=oneEnglishMathBridge();

  // Two retained occurrences share one complete source-backed relation while
  // differing in episode-specific context. No candidate/generalization exists
  // yet: recurrence must not silently create one.
  const east=[eq(V('eastItem'),C('folder')),eq(V('eastPlace'),C('east-entrance'))];
  const west=[eq(V('westItem'),C('folder')),eq(V('westPlace'),C('west-entrance'))];
  await liveUniversalStep(U,L,B,{
    utterance:'opaque episode east',
    math_contact:{input:east,id:'episode-east',complete:true,kind:'observed-contact'}
  },null,opts);
  await liveUniversalStep(U,L,B,{
    utterance:'opaque episode west',
    math_contact:{input:west,id:'episode-west',complete:true,kind:'observed-contact'}
  },null,opts);
  assert.strictEqual(Object.keys(L.candidates).length,0,'retained recurrence silently created a mathematical candidate');
  assert.strictEqual(Object.keys(L.spaces).length,0,'retained recurrence silently created a math space');

  const folderCue=[eq(V('cueItem'),C('folder'))];
  const folderSig=compileMathGraph(folderCue,opts).signature;
  let seen=null;

  // The ordinary proposer may inspect the read-only recurrence clue. To use it
  // blindly through the existing relation-guided proposal path, the clue must
  // preserve one COMPLETE source expression as variable-name scaffolding. Its
  // anonymous signature remains the identity; the expression is not truth.
  const proposed=await liveUniversalStep(U,L,B,{
    utterance:'opaque later cue',math_cue:folderCue
  },async view=>{
    const recurrence=view.universal_math.cue_completion?.historical_recurrence;
    assert(recurrence,'live proposer did not receive historical recurrence');
    assert.strictEqual(recurrence.authority,'proposal-only');
    seen=recurrence.relations.find(r=>r.signature===folderSig)||null;
    assert(seen,'shared complete folder relation was absent from recurrence');
    assert.strictEqual(seen.authority,'proposal-only');
    assert(seen.complete_expression,'recurrence clue lost the complete source expression needed by the generic proposer');
    assert.strictEqual(compileMathGraph([seen.complete_expression],opts).signature,folderSig,
      'recurrence proposal expression does not reconstruct its anonymous relation');

    return{
      surface:{candidates:[{id:'surface-recurrence',label:'opaque-recurrence',support:1}]},
      math_spaces:[{
        relation_ref:'surface-recurrence',space_id:'recurrence-space',
        alternatives:[{
          id:'recurrence-h',expressions:[seen.complete_expression],
          source:'cross-occurrence-recurrence-proposer'
        }]
      }]
    };
  },opts);

  assert(seen);
  assert.strictEqual(proposed.mathematical.routed_spaces.length,1);
  assert.strictEqual(proposed.mathematical.routed_spaces[0].space_id,'recurrence-space');
  assert.strictEqual(L.candidates['recurrence-h'].support.length,0,
    'recurrence proposal reused its source occurrences as automatic candidate evidence');
  assert.strictEqual(L.candidates['recurrence-h'].defeat.length,0);
  assert.strictEqual(L.candidates['recurrence-h'].status,'open');
  assert.strictEqual(L.candidates['recurrence-h'].usable,false);
  assert.notStrictEqual(currentMathSpace(L,'recurrence-space').status,'resolved-candidate-math',
    'proposal-only recurrence resolved its own math space');

  // Only later independent targeted contact can warrant the proposed relation.
  contactMathSpace(L,'recurrence-space',[seen.complete_expression],{
    id:'independent-recurrence-contact',complete:true
  },{autoRefine:false,...opts});
  const resolved=currentMathSpace(L,'recurrence-space',opts);
  assert.strictEqual(resolved.status,'resolved-candidate-math');
  assert.strictEqual(resolved.hypothesis_id,'recurrence-h');

  console.log(JSON.stringify({
    repeated_occurrences_create_candidates_automatically:0,
    recurrence_clue_authority:'proposal-only',
    recurrence_preserves_complete_expression_scaffolding:true,
    recurrence_expression_identity_is_anonymous_signature:true,
    proposer_can_route_recurrence_through_existing_math_space:true,
    recurrence_source_occurrences_auto_warrant_proposal:0,
    independent_targeted_contact_required_for_resolution:true,
    separate_semantic_generalization_authority:0,
    whole:1
  },null,2));
  console.log('RECURRENCE-GUIDED PROPOSAL TEST: PASS');
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
