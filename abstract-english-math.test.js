'use strict';

const assert=require('assert');
const {one,F,mathGraphFeatures}=require('./universal-language');
const {MOP,variable,app}=require('./universal-math-graph');
const {INTENT_ORDER,candidateExpressions}=require('./abstract-intent-kernel');
const {oneMathHypothesisLedger,proposeMath,contactMath,reviseMath}=require('./math-hypotheses');
const {
  oneEnglishMathBridge,bindEnglishMath,currentEnglishMath,pureEnglishMathBridge
}=require('./english-math-bridge');

const school={
  belief:{marker:'believes',train:['Mira believes the proposition','Mira believes that the proposition holds','Mira believes the proposition is true'],holdout:'Mira believes it is true'},
  doubt:{marker:'doubts',train:['Mira doubts the proposition','Mira doubts that the proposition holds','Mira doubts the proposition is true'],holdout:'Mira doubts that it is true'},
  consider:{marker:'considers',train:['Mira considers whether the proposition holds','Mira considers whether the proposition is true','Mira considers both possibilities for the proposition'],holdout:'Mira considers whether it is true'},
  imagine:{marker:'imagines',train:['Mira imagines the proposition holding','Mira imagines that the proposition is true','Mira imagines a case where the proposition holds'],holdout:'Mira imagines that it is true'},
  remember:{marker:'remembers',train:['Mira remembers the proposition','Mira remembers that the proposition held earlier','Mira remembers the proposition being true'],holdout:'Mira remembers that it was true'},
  infer:{marker:'infers',train:['Mira infers the conclusion','Mira infers the conclusion from the premise','Mira infers that the conclusion follows'],holdout:'Mira infers that conclusion'},
  desire:{marker:'desires',train:['Mira desires the outcome','Mira desires that the outcome happen','Mira desires the proposition to become true'],holdout:'Mira desires it to happen'},
  intend:{marker:'intends',train:['Mira intends to make the outcome happen','Mira intends to bring about the outcome','Mira intends to make the proposition true'],holdout:'Mira intends for it to happen'},
  question:{marker:'asks',train:['Mira asks whether the proposition holds?','Mira asks whether the proposition is true?','Mira asks whether it is the case?'],holdout:'Mira asks whether it is true?'},
  assertion:{marker:'asserts',train:['Mira asserts the proposition','Mira asserts that the proposition holds','Mira asserts that the proposition is true'],holdout:'Mira asserts that it is true'},
  command:{marker:'commands',train:['Mira commands Nia to make it happen','Mira commands Nia to bring about the outcome','Mira commands Nia to make the proposition true'],holdout:'Mira commands Nia to do it'},
  promise:{marker:'promises',train:['Mira promises Nia that she will do it','Mira promises to bring about the outcome','Mira promises that she will make it happen'],holdout:'Mira promises to do it'},
  obligation:{marker:'obligated',train:['Mira is obligated to do it','Mira is obligated to bring about the outcome','Mira is obligated to make the proposition true'],holdout:'Mira is obligated to make it happen'}
};

function opaque(i){return `ξ${String(i+1).padStart(2,'0')}`;}
function top(U){return U.current?.resolution?.components?.[0]?.relation||null;}

async function main(){
  assert.deepStrictEqual(Object.keys(school),INTENT_ORDER,'school order drifted from candidate audit order');
  const U=one({config:{min_equivalence_support:2,history_limit:4096,candidate_floor:0.04}});
  const L=oneMathHypothesisLedger();
  const B=oneEnglishMathBridge();
  const ctx={domain:'abstract-relation-school'}; // deliberately identical across all 13 families

  for(let i=0;i<INTENT_ORDER.length;i++){
    const name=INTENT_ORDER[i];
    proposeMath(L,{id:`h${i}`,expressions:candidateExpressions(name),source:'candidate-proposer',confidence:0.9999});
  }
  let refusedUnsupported=false;
  await F(U,{utterance:school.belief.train[0],context:ctx,relations:[{id:opaque(0)}],source:'opaque-abstract-school'});
  try{bindEnglishMath(B,U,L,opaque(0),'h0');}catch(_){refusedUnsupported=true;}
  assert(refusedUnsupported,'unsupported math candidate was bindable merely because proposed');

  for(let i=0;i<INTENT_ORDER.length;i++){
    const name=INTENT_ORDER[i];
    contactMath(L,candidateExpressions(name,`support-${i}:`),{id:`m${i}`,candidates:[`h${i}`],complete:false});
    assert.strictEqual(L.candidates[`h${i}`].status,'supported');
  }

  let mathGroundedContacts=0;
  for(let i=0;i<INTENT_ORDER.length;i++){
    const name=INTENT_ORDER[i], id=opaque(i), utterances=school[name].train;
    const start=i===0?1:0;
    for(let j=start;j<utterances.length;j++){
      await F(U,{
        utterance:utterances[j],context:ctx,math_graph:L.candidates[`h${i}`].graph,
        relations:[{id}],source:'opaque-abstract-school'
      });
      mathGroundedContacts++;
    }
  }
  assert.strictEqual(mathGroundedContacts,38);

  for(let i=0;i<INTENT_ORDER.length;i++){
    const f=mathGraphFeatures(L.candidates[`h${i}`].graph);
    assert(Object.keys(f).length>8,'math grounding collapsed to an opaque fingerprint');
    assert(!Object.keys(f).some(k=>k.includes(L.candidates[`h${i}`].signature)),'whole graph signature leaked as a grounding feature');
  }

  const canonicals=INTENT_ORDER.map((_,i)=>U.canonical[opaque(i)]||opaque(i));
  assert.strictEqual(new Set(canonicals).size,13,'abstract surface relations still collapsed despite structural grounding');
  for(let i=0;i<INTENT_ORDER.length;i++) bindEnglishMath(B,U,L,opaque(i),`h${i}`);

  // English-only holdouts get NO math graph. The base F similarity result is
  // recorded separately, but the language-specific bridge uses generic IDF
  // contrast over the learned relation field before dereferencing live math.
  let hits=0,baseFHits=0;
  const heldout=[];
  for(let i=0;i<INTENT_ORDER.length;i++){
    const name=INTENT_ORDER[i];
    await F(U,{utterance:school[name].holdout,context:ctx});
    const resolved=currentEnglishMath(B,U,L);
    const expectedRelation=U.canonical[opaque(i)]||opaque(i);
    const expectedSignature=L.candidates[`h${i}`].signature;
    const baseHit=top(U)===expectedRelation;
    if(baseHit)baseFHits++;
    const hit=resolved.relation===expectedRelation && resolved.status==='resolved-candidate-math' && resolved.signature===expectedSignature;
    if(hit)hits++;
    heldout.push({
      index:i,
      family:name,
      text:school[name].holdout,
      base_F_relation:top(U),
      contrastive_relation:resolved.relation||null,
      expected_relation:expectedRelation,
      contrastive_score:resolved.surface_resolution?.score||0,
      contrastive_margin:resolved.surface_resolution?.margin||0,
      math_signature:resolved.signature||null,
      expected_math_signature:expectedSignature,
      base_hit:baseHit,
      hit
    });
  }
  console.log('ABSTRACT HOLDOUT DIAGNOSTICS');
  console.log(JSON.stringify({base_F_hits:baseFHits,contrastive_bridge_hits:hits,total:13,heldout},null,2));
  assert.strictEqual(hits,13,`only ${hits}/13 English holdouts reached their candidate mathematics after contrastive resolution`);

  await F(U,{utterance:school.belief.holdout,context:ctx});
  const oldSignature=currentEnglishMath(B,U,L).signature;
  const V=variable;
  const corrected=[...candidateExpressions('belief','rev:'),app(MOP.SUBSET,V('rev:P'),V('rev:extraDomain'))];
  reviseMath(L,'h0',corrected,'corrected candidate anatomy');
  const suspended=currentEnglishMath(B,U,L);
  assert.strictEqual(L.candidates.h0.status,'open');
  assert.strictEqual(suspended.status,'unresolved','English kept a frozen obsolete math object after candidate revision');

  const supportedCorrection=[...candidateExpressions('belief','new:'),app(MOP.SUBSET,V('new:P'),V('new:extraDomain'))];
  contactMath(L,supportedCorrection,{id:'m-corrected',candidates:['h0'],complete:false});
  assert.strictEqual(L.candidates.h0.status,'supported');
  const refreshed=currentEnglishMath(B,U,L);
  assert.strictEqual(refreshed.status,'resolved-candidate-math');
  assert.notStrictEqual(refreshed.signature,oldSignature,'candidate correction did not change English-reached mathematics');
  assert.strictEqual(refreshed.signature,L.candidates.h0.signature);

  const pure=pureEnglishMathBridge(B);
  const pureText=JSON.stringify(pure).toLowerCase();
  for(const name of INTENT_ORDER)assert(!pureText.includes(name),`semantic family label leaked into pure bridge: ${name}`);

  const report={
    families:13,
    opaque_relation_supervision_contacts:39,
    math_structurally_grounded_training_contacts:mathGroundedContacts,
    semantic_family_labels_given_to_F:0,
    hypothesis_ids_given_to_F:0,
    anonymous_mathematical_graphs_given_to_F:mathGroundedContacts,
    whole_graph_signature_features_given_to_F:0,
    explicit_equivalences_given_to_F:0,
    shared_context_across_all_families:true,
    distinct_opaque_surface_relations:new Set(canonicals).size,
    unsupported_candidate_binding_refused:true,
    structural_support_is_not_claimed_as_semantic_truth:true,
    base_F_english_holdout_hits:baseFHits,
    contrastive_surface_method:'generic-idf-over-learned-relations',
    english_only_holdouts_to_candidate_math_hits:hits,
    english_only_holdouts_total:13,
    candidate_revision_suspends_old_math_without_english_retraining:true,
    newly_supported_revision_reaches_old_english_without_retraining:true,
    semantic_family_labels_in_pure_bridge:0,
    bridge_whole:pure.whole,
    heldout
  };
  console.log(JSON.stringify(report,null,2));
  console.log('ABSTRACT ENGLISH -> CORRIGIBLE MATH TEST: PASS');
}

main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
