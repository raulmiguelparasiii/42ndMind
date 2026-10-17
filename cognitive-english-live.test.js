'use strict';

const assert=require('assert');
const {one,F}=require('./universal-language');
const {
  oneEnglishMathBridge,bindEnglishMath,currentEnglishMath,pureEnglishMathBridge
}=require('./english-math-bridge');
const {oneMathHypothesisLedger,proposeMath,contactMath}=require('./math-hypotheses');
const {COGNITIVE_ORDER,candidateExpressions}=require('./cognitive-relation-candidates');

const school={
  memory:{
    train:[
      'Mira retains the earlier event for later access.',
      'The earlier event remains available to Mira after it happened.',
      'Mira still has the past event available even though she is not recalling it now.'
    ],
    holdout:'The past event is still available to Mira without being brought to mind.'
  },
  memorize:{
    train:[
      'Mira memorizes the sequence so it will be available later.',
      'Mira commits the sequence so she can retrieve it afterward.',
      'Mira encodes the sequence into what she will retain.'
    ],
    holdout:'Mira learns the sequence now in order to retain it for later.'
  },
  remember:{
    train:[
      'Mira remembers the sequence when the hint brings it back.',
      'A partial cue makes Mira recall the retained sequence.',
      'Mira retrieves the earlier sequence from the present hint.'
    ],
    holdout:'The hint makes Mira recall the earlier sequence now.'
  },
  recollect:{
    train:[
      'Mira recollects the sequence together with where it happened.',
      'Mira recalls the episode and recovers its original setting.',
      'The cue brings back both the earlier event and its bound context.'
    ],
    holdout:'Mira recalls the event together with the context in which it occurred.'
  },
  attention:{
    train:[
      'Mira attends to the red item among what is presently available.',
      'Mira selects the red item from the current field.',
      'Mira directs her present attention toward one live item.'
    ],
    holdout:'Mira attends to that item in the current field now.'
  },
  focus:{
    train:[
      'Mira keeps focusing on the same item across the next moment.',
      'Mira maintains attention on the same target as contact continues.',
      'Mira stays focused on the target instead of shifting away.'
    ],
    holdout:'Mira keeps her attention on the same target across successive moments.'
  },
  broad_intent:{
    train:[
      'Mira intends the current possibilities to remain directed toward the target.',
      'Mira constrains what is currently considered toward an admissible target region.',
      'Mira means for the live completion frontier to stay directed toward the target.'
    ],
    holdout:'Mira means to keep the current possibilities directed toward that target.'
  }
};

function opaque(i){return `κ${String(i+1).padStart(2,'0')}`;}
function top(U){return U.current?.resolution?.components?.[0]?.relation||null;}

async function main(){
  assert.deepStrictEqual(Object.keys(school),COGNITIVE_ORDER,'English school drifted from cognitive candidate audit order');
  const U=one({config:{min_equivalence_support:2,history_limit:4096,candidate_floor:0.04}});
  const L=oneMathHypothesisLedger();
  const B=oneEnglishMathBridge();
  const ctx={domain:'opaque-cognitive-relation-school'};

  for(let i=0;i<COGNITIVE_ORDER.length;i++){
    const name=COGNITIVE_ORDER[i];
    proposeMath(L,{id:`cg${i}`,expressions:candidateExpressions(name),source:'cognitive-candidate-proposer',confidence:1});
    contactMath(L,candidateExpressions(name,`support-${i}:`),{
      id:`cg-support-${i}`,candidates:[`cg${i}`],complete:false
    });
    assert.strictEqual(L.candidates[`cg${i}`].status,'supported');
  }

  let groundedContacts=0;
  for(let i=0;i<COGNITIVE_ORDER.length;i++){
    const name=COGNITIVE_ORDER[i], id=opaque(i);
    for(const utterance of school[name].train){
      await F(U,{
        utterance,context:ctx,math_graph:L.candidates[`cg${i}`].graph,
        relations:[{id}],source:'opaque-cognitive-school'
      });
      groundedContacts++;
    }
  }

  const canonicals=COGNITIVE_ORDER.map((_,i)=>U.canonical[opaque(i)]||opaque(i));
  assert.strictEqual(new Set(canonicals).size,COGNITIVE_ORDER.length,'cognitive surface relations collapsed during structurally grounded schooling');
  for(let i=0;i<COGNITIVE_ORDER.length;i++)bindEnglishMath(B,U,L,opaque(i),`cg${i}`);

  let hits=0,baseHits=0;
  const diagnostics=[];
  for(let i=0;i<COGNITIVE_ORDER.length;i++){
    const name=COGNITIVE_ORDER[i];
    await F(U,{utterance:school[name].holdout,context:ctx});
    const resolved=currentEnglishMath(B,U,L);
    const expectedRelation=U.canonical[opaque(i)]||opaque(i);
    const expectedSignature=L.candidates[`cg${i}`].signature;
    const baseHit=top(U)===expectedRelation;
    if(baseHit)baseHits++;
    const hit=resolved.relation===expectedRelation &&
      resolved.status==='resolved-candidate-math' &&
      resolved.signature===expectedSignature;
    if(hit)hits++;
    diagnostics.push({
      index:i,name,text:school[name].holdout,
      base_relation:top(U),contrastive_relation:resolved.relation||null,
      expected_relation:expectedRelation,base_hit:baseHit,hit,
      score:resolved.surface_resolution?.score||0,
      margin:resolved.surface_resolution?.margin||0
    });
  }

  console.log('COGNITIVE ENGLISH HOLDOUT DIAGNOSTICS');
  console.log(JSON.stringify({base_hits:baseHits,contrastive_hits:hits,total:COGNITIVE_ORDER.length,diagnostics},null,2));
  assert.strictEqual(hits,COGNITIVE_ORDER.length,`only ${hits}/${COGNITIVE_ORDER.length} English holdouts reached their candidate mathematics`);

  const pure=pureEnglishMathBridge(B);
  const pureText=JSON.stringify(pure).toLowerCase();
  for(const name of ['memory','memorize','remember','recollect','attention','focus','intent']){
    assert(!pureText.includes(name),`semantic cognitive label leaked into pure bridge: ${name}`);
  }

  console.log(JSON.stringify({
    candidate_relations:COGNITIVE_ORDER.length,
    opaque_surface_relations:new Set(canonicals).size,
    math_grounded_training_contacts:groundedContacts,
    semantic_candidate_names_given_to_F:0,
    english_only_holdout_math_graphs_given:0,
    base_F_holdout_hits:baseHits,
    contrastive_live_bridge_holdout_hits:hits,
    holdout_total:COGNITIVE_ORDER.length,
    semantic_labels_in_pure_bridge:0,
    whole:pure.whole
  },null,2));
  console.log('COGNITIVE ENGLISH -> LIVE MATH TEST: PASS');
}

main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
