'use strict';

const assert=require('assert');
const {
  interventionDependence, mineRealityContact, stoneStructuresContaining,
  crossEntityRelevance, connectRealityToStone
}=require('./stone-reality-contact');

function cartesian(fields, values, f){
  const out=[];
  function rec(i,row){
    if(i===fields.length){out.push(f({...row}));return;}
    const k=fields[i];
    for(const v of values[k]){row[k]=v;rec(i+1,row);}
  }
  rec(0,{}); return out;
}

// Anonymous finite world. The ids intentionally carry no semantic words.
// mode='cross' makes the response genuinely sensitive to the non-self state;
// mode='self' removes that relation; mode='spurious' correlates the non-self
// channel with a context variable without intervention-identifiable dependence.
function world(ids,mode='cross'){
  const {subject,other,selfQ,otherQ,event,response,context}=ids;
  const transition=cartesian(['a','b','c'],{a:[0,1],b:[-2,0,2],c:[0,1]},r=>({
    in:{[event]:r.a, [`pre:${otherQ}`]:r.b, [context]:r.c},
    out:{[otherQ]:r.b+(r.a?1:-1)}
  }));

  let evaluation;
  if(mode==='spurious'){
    evaluation=[];
    for(const c of [0,1]) for(const s of [-1,1]){
      const q=c?2:-2; // correlation only; q never varies with c held fixed
      evaluation.push({in:{[otherQ]:q,[selfQ]:s,[context]:c},out:{[response]:c?'r1':'r0'}});
      evaluation.push({in:{[otherQ]:q,[selfQ]:-s,[context]:c},out:{[response]:c?'r1':'r0'}});
    }
  } else {
    evaluation=cartesian(['q','s','c'],{q:[-2,0,2],s:[-1,1],c:[0,1]},r=>{
      let y;
      if(mode==='cross'){
        // Categorical, contextual orientation; no scalar reward is assumed.
        y = r.c===0 ? (r.q<0?'r0':r.q>0?'r2':'r1') : (r.q<0?'r3':r.q>0?'r5':'r4');
      } else {
        y = r.c===0 ? (r.s<0?'r0':'r1') : (r.s<0?'r2':'r3');
      }
      return {in:{[otherQ]:r.q,[selfQ]:r.s,[context]:r.c},out:{[response]:y}};
    });
  }

  return {
    subject,
    entities:[subject,other],
    channels:[
      {id:selfQ,owner:subject,ordinal:true},
      {id:otherQ,owner:other,ordinal:true},
      {id:response,owner:subject,ordinal:false}
    ],
    experiments:[
      {id:'x0',inputs:[event,`pre:${otherQ}`,context],outputs:[otherQ],events:[event],state_outputs:[otherQ],trials:transition},
      {id:'x1',inputs:[otherQ,selfQ,context],outputs:[response],events:[],state_outputs:[],trials:evaluation}
    ]
  };
}

const ids1={subject:'e7',other:'e2',selfQ:'q9',otherQ:'q4',event:'u3',response:'r8',context:'k6'};
const positive=mineRealityContact(world(ids1,'cross'));
const bridge=connectRealityToStone(positive,{subject:ids1.subject,response:ids1.response});

assert.equal(bridge.instantiated,true,'cross-entity consequence sensitivity was not grounded');
assert.equal(bridge.reality_matches.length>0,true);
assert.equal(bridge.reality_matches[0].entity,ids1.other);
assert.equal(bridge.reality_matches[0].quantity,ids1.otherQ);
assert.equal(bridge.reality_matches[0].state,ids1.otherQ);
assert.equal(bridge.reality_matches[0].response,ids1.response);

// The anonymous operational motif must be a structural consequence of exactly
// one of the seven compiled Stone structures, rather than a post-hoc word label.
const containing=stoneStructuresContaining();
assert.equal(containing.length,1,`operational motif was not unique across Stone structures: ${containing.map(x=>x.index)}`);
assert.equal(bridge.unique_structure_index,containing[0].index);
assert(bridge.unique_structure_signature);

// Direct causal evidence: with context and all other inputs controlled, varying
// the non-self state changes the response in every comparable group.
const evalExp=world(ids1,'cross').experiments[1];
const dep=interventionDependence(evalExp,ids1.otherQ,ids1.response);
assert(dep.support>=4);
assert.equal(dep.score,1);

// New world, entirely new entity/channel/action ids and different response
// symbols. The same mathematics must transfer without retraining or labels.
const ids2={subject:'α',other:'β',selfQ:'m17',otherQ:'m03',event:'z91',response:'h44',context:'d08'};
const novel=mineRealityContact(world(ids2,'cross'));
const novelBridge=connectRealityToStone(novel,{subject:ids2.subject,response:ids2.response});
assert.equal(novelBridge.instantiated,true);
assert.equal(novelBridge.unique_structure_signature,bridge.unique_structure_signature);
assert.equal(novelBridge.reality_matches[0].entity,ids2.other);
assert.equal(novelBridge.reality_matches[0].quantity,ids2.otherQ);

// The structure is usable: without an English word, the machine can recover
// which non-self consequence-bearing magnitude is materially connected to the
// queried orientation in a never-seen world.
const relevant=crossEntityRelevance(novel,{subject:ids2.subject,response:ids2.response});
assert(relevant.some(x=>x.entity===ids2.other && x.quantity===ids2.otherQ));

// Negative control 1: identical world dynamics, but the response is sensitive
// only to the subject's own magnitude. This must not instantiate the motif.
const selfOnly=mineRealityContact(world(ids1,'self'));
assert.equal(connectRealityToStone(selfOnly,{subject:ids1.subject,response:ids1.response}).instantiated,false);

// Negative control 2: observational correlation between other-state and
// response with no controlled intervention support must not count as grounding.
const spurious=mineRealityContact(world(ids1,'spurious'));
assert.equal(connectRealityToStone(spurious,{subject:ids1.subject,response:ids1.response}).instantiated,false);

// Destructive ablation: remove the action->other-state transition experiment.
// Mere response sensitivity is insufficient; consequence linkage is required.
const ablatedSpec=world(ids1,'cross');
ablatedSpec.experiments=ablatedSpec.experiments.slice(1);
const ablated=mineRealityContact(ablatedSpec);
assert.equal(connectRealityToStone(ablated,{subject:ids1.subject,response:ids1.response}).instantiated,false);

console.log(JSON.stringify({
  semantic_labels_given_to_reality_miner:0,
  stone_pole_names_given_to_reality_miner:0,
  positive_world_grounded:true,
  novel_id_world_grounded:true,
  unique_anonymous_stone_structure:bridge.unique_structure_index,
  cross_entity_channel_recovered:ids2.otherQ,
  self_only_negative_control_rejected:true,
  spurious_correlation_rejected:true,
  broken_consequence_chain_rejected:true,
  controlled_dependence_support:dep.support,
  controlled_dependence_score:dep.score
},null,2));
console.log('EMPATHY REALITY-CONTACT TEST: PASS');
