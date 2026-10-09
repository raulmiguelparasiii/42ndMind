'use strict';

// Innate epistemic guidance for 42ndMind.
//
// No world reward table or semantic map exists here. The mind receives primitive
// sensor frames and a primitive motor alphabet. The final two channels are
// continuity-of-reality-contact and embodied friction.
//
// Stone: answer real pressure rather than insulating from it; continued reality-
// contact is a prerequisite for answerability.
// Practicality: time/capacity are finite and some consequences are irreversible,
// so exhaustive direct trial is not always available. Learned consequences may
// need to be projected before commitment, with stronger warrant under constraint.
// OneLogic: preserve undefeated possibilities, distinguish strict from defeasible
// consequence, seek discriminating contact when unresolved, and reopen when wrong.

function clamp(x,lo,hi){return Math.max(lo,Math.min(hi,x));}
function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;}
function pressure(f){return f.at(-1);}
function continuity(f){return f.at(-2);}
function entropy(values){
  if(!values.length)return 0; const c=new Map();
  for(const v of values)c.set(v,(c.get(v)||0)+1);
  let h=0; for(const n of c.values()){const p=n/values.length;h-=p*Math.log2(p);} return h;
}
function frameDistance(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return Infinity;
  let s=0;for(let i=0;i<a.length;i++)s+=Math.abs(a[i]-b[i]);return s/Math.max(1,a.length);
}
function sensoryChange(a,b){
  const n=Math.max(0,Math.min(a.length,b.length)-2); if(!n)return 0;
  let s=0;for(let i=0;i<n;i++)s+=Math.abs(a[i]-b[i]);return s/n;
}
function coarseSignature(frame){
  return frame.map((x,i)=>Math.floor(x/(i>=frame.length-2?16:32))).join(':');
}
function indexKey(frame,action){return `${action}|${coarseSignature(frame)}`;}

function one(actionCount){
  return {
    whole:1, action_count:actionCount, transitions:[],
    by_action:Array.from({length:actionCount},()=>[]), context_index:new Map(),
    uses:Array(actionCount).fill(0),
    decisions:{bootstrap_inquiry:0,foresight_strict:0,foresight_defeasible:0,practical_inquiry:0},
    prior:{
      stone:'resolve real pressure through answerable reality-contact; do not prefer insulation; preserve continued reality-contact',
      practicality:'finite time/capacity makes exhaustive direct trial impossible; infer from learned consequences before irreversible commitment when warranted',
      onelogic:'preserve undefeated possibilities; assert only forced consequence; inquire when unresolved; reopen when defeated',
    },
  };
}

function observe(state,before,action,after){
  if(!Array.isArray(before)||!Array.isArray(after)||before.length!==after.length)throw new Error('guidance observation requires equal primitive frames');
  if(!Number.isInteger(action)||action<0||action>=state.action_count)throw new Error('invalid primitive action');
  const t={before:before.slice(),action,after:after.slice(),serial:state.transitions.length};
  state.transitions.push(t);state.by_action[action].push(t);state.uses[action]++;
  const k=indexKey(before,action);if(!state.context_index.has(k))state.context_index.set(k,[]);state.context_index.get(k).push(t);
  if(state.transitions.length>5000){
    const removed=state.transitions.splice(0,state.transitions.length-5000),ids=new Set(removed.map(x=>x.serial));
    for(let a=0;a<state.action_count;a++)state.by_action[a]=state.by_action[a].filter(x=>!ids.has(x.serial));
    for(const [k,arr] of state.context_index){const kept=arr.filter(x=>!ids.has(x.serial));if(kept.length)state.context_index.set(k,kept);else state.context_index.delete(k);}
  }
}

function nearestOutcomes(state,frame,action,limit=24){
  const exact=state.context_index?state.context_index.get(indexKey(frame,action))||[]:[];
  const source=exact.length>=3?exact:(state.by_action?state.by_action[action].slice(-96):state.transitions.filter(t=>t.action===action).slice(-96));
  const c=[];for(const t of source)c.push({...t,distance:frameDistance(frame,t.before),age:state.transitions.length-t.serial});
  c.sort((a,b)=>a.distance-b.distance||a.age-b.age);if(!c.length)return[];
  const best=c[0].distance,radius=best*1.35+10,local=c.filter(x=>x.distance<=radius).slice(0,limit);
  return local.length>=3?local:c.slice(0,Math.min(limit,3));
}

function trajectoryOutcome(state,candidate,horizon=6){
  const ps=[pressure(candidate.after)],cs=[continuity(candidate.after)];let last=candidate.after;
  const start=state.transitions.findIndex(t=>t.serial===candidate.serial);
  if(start<0)return{finalPressure:pressure(candidate.after),minContinuity:continuity(candidate.after),length:1};
  for(let j=start+1;j<state.transitions.length&&ps.length<horizon;j++){
    const t=state.transitions[j];if(frameDistance(last,t.before)>1e-9)break;
    ps.push(pressure(t.after));cs.push(continuity(t.after));last=t.after;if(continuity(t.after)<=0)break;
  }
  return{finalPressure:mean(ps.slice(-Math.min(2,ps.length))),minContinuity:Math.min(...cs),length:ps.length};
}

function actionModel(state,frame,action){
  const live=nearestOutcomes(state,frame,action),p0=pressure(frame);
  if(!live.length)return{action,live,unknown:true,support:0,currentPressure:p0,meanPressure:null,maxPressure:null,minPressure:null,
    improvementFraction:0,outcomeEntropy:Infinity,contactGain:Infinity,contextDistance:Infinity,contactPreservedFraction:1,
    anyContactLoss:false,forcedContactLoss:false,forcedImprovement:false,forcedWorsening:false,insulating:false};
  const tr=live.map(x=>trajectoryOutcome(state,x)),ps=tr.map(x=>x.finalPressure),gain=mean(live.map(x=>sensoryChange(x.before,x.after)));
  const minP=Math.min(...ps),maxP=Math.max(...ps),avg=mean(ps),pres=tr.filter(x=>x.minContinuity>0).length/tr.length;
  return{action,live,unknown:false,support:live.length,currentPressure:p0,minPressure:minP,meanPressure:avg,maxPressure:maxP,
    improvementFraction:ps.filter(p=>p<p0).length/ps.length,outcomeEntropy:entropy(live.map(x=>coarseSignature(x.after))),contactGain:gain,
    contextDistance:mean(live.map(x=>x.distance)),contactPreservedFraction:pres,anyContactLoss:tr.some(x=>x.minContinuity<=0),
    forcedContactLoss:tr.every(x=>x.minContinuity<=0),forcedImprovement:pres===1&&maxP<p0-0.5,forcedWorsening:minP>p0+0.5,
    insulating:ps.length>=3&&avg>=p0-0.25&&gain<3};
}

function keepDiverse(nodes,limit){
  if(nodes.length<=limit)return nodes;const chosen=[],seen=new Set();
  function take(sorted,n){for(const x of sorted){const k=`${x.firstAction}|${x.depth}|${coarseSignature(x.frame)}|${x.minContinuity}`;if(seen.has(k))continue;seen.add(k);chosen.push(x);if(chosen.length>=n)break;}}
  const q=Math.max(1,Math.floor(limit/4));
  take(nodes.slice().sort((a,b)=>a.minContinuity-b.minContinuity||b.maxPressure-a.maxPressure),q);
  take(nodes.slice().sort((a,b)=>b.maxPressure-a.maxPressure||b.finalPressure-a.finalPressure),q*2);
  take(nodes.slice().sort((a,b)=>a.finalPressure-b.finalPressure||b.support-a.support),q*3);
  take(nodes.slice().sort((a,b)=>a.distance-b.distance||b.support-a.support),limit);return chosen.slice(0,limit);
}

function prospectAction(state,frame,firstAction,horizon=3,beam=16){
  const initial=nearestOutcomes(state,frame,firstAction,4),p0=pressure(frame);
  if(!initial.length)return{action:firstAction,unknown:true,support:0,horizon,contactPreservedFraction:1,anyContactLoss:false,forcedContactLoss:false,
    improvementFraction:0,meanPressure:null,maxPressure:null,minPressure:null,uncertainty:1,information:Infinity,forcedImprovement:false};
  let nodes=initial.map(x=>({firstAction,frame:x.after.slice(),minContinuity:continuity(x.after),maxPressure:pressure(x.after),finalPressure:pressure(x.after),support:1,distance:x.distance,depth:1}));
  for(let depth=1;depth<horizon;depth++){
    const expanded=[];
    for(const node of nodes){
      if(node.minContinuity<=0){expanded.push(node);continue;}
      let known=0;
      for(let a=0;a<state.action_count;a++){
        const outs=nearestOutcomes(state,node.frame,a,2);if(!outs.length)continue;known++;
        for(const out of outs)expanded.push({firstAction,frame:out.after.slice(),minContinuity:Math.min(node.minContinuity,continuity(out.after)),
          maxPressure:Math.max(node.maxPressure,pressure(out.after)),finalPressure:pressure(out.after),support:node.support+1,distance:node.distance+out.distance,depth:depth+1});
      }
      if(!known)expanded.push({...node,unknown:true,depth:depth+1});
    }
    nodes=keepDiverse(expanded,beam);
  }
  const pres=nodes.filter(x=>x.minContinuity>0).length/nodes.length,finals=nodes.map(x=>x.finalPressure),unk=nodes.filter(x=>x.unknown).length/nodes.length;
  return{action:firstAction,unknown:false,support:initial.length,horizon,leaves:nodes.length,contactPreservedFraction:pres,
    anyContactLoss:nodes.some(x=>x.minContinuity<=0),forcedContactLoss:nodes.every(x=>x.minContinuity<=0),
    improvementFraction:finals.filter(p=>p<p0).length/finals.length,meanPressure:mean(finals),maxPressure:Math.max(...finals),minPressure:Math.min(...finals),
    uncertainty:unk,information:entropy(nodes.map(x=>coarseSignature(x.frame))),forcedImprovement:unk===0&&pres===1&&Math.max(...finals)<p0-0.5};
}

function leastUsed(state){let b=0;for(let a=1;a<state.action_count;a++)if(state.uses[a]<state.uses[b])b=a;return b;}

function chooseAction(state,frame){
  if(!Array.isArray(frame)||frame.length<2)throw new Error('guidance requires primitive contact, continuity, and friction');
  const p0=pressure(frame),constraint=clamp(p0/255,0,1);
  if(state.transitions.length<state.action_count*2&&constraint<0.35){const action=leastUsed(state);state.decisions.bootstrap_inquiry++;return{action,mode:'bootstrap_inquiry',models:[],prospects:[]};}
  const models=Array.from({length:state.action_count},(_,a)=>actionModel(state,frame,a));
  const horizon=constraint>=0.55?4:constraint>=0.25?3:2;
  const prospects=Array.from({length:state.action_count},(_,a)=>prospectAction(state,frame,a,horizon));
  if(p0>=8){
    const strict=prospects.filter(p=>!p.unknown&&p.support>=2&&p.forcedImprovement&&!p.forcedContactLoss);
    if(strict.length){strict.sort((a,b)=>a.maxPressure-b.maxPressure||b.contactPreservedFraction-a.contactPreservedFraction||b.support-a.support||a.action-b.action);state.decisions.foresight_strict++;return{action:strict[0].action,mode:'foresight_strict',models,prospects};}
    const plausible=prospects.filter(p=>!p.unknown&&!p.forcedContactLoss&&p.contactPreservedFraction>=0.85&&p.improvementFraction>=0.50);
    if(plausible.length){const score=p=>p.contactPreservedFraction*24+(p0-p.meanPressure)-Math.max(0,p.maxPressure-p0)*0.45-p.uncertainty*(8+constraint*24)+Math.min(6,p.information)*0.15;
      plausible.sort((a,b)=>score(b)-score(a)||b.support-a.support||a.action-b.action);state.decisions.foresight_defeasible++;return{action:plausible[0].action,mode:'foresight_defeasible',models,prospects};}
  }
  let admissible=prospects.filter(p=>!p.forcedContactLoss&&p.contactPreservedFraction>=(constraint>0.5?0.9:0.65));
  if(!admissible.length)admissible=prospects.filter(p=>!p.forcedContactLoss);if(!admissible.length)admissible=prospects.slice();
  const score=p=>p.unknown?(constraint<0.25?40-state.uses[p.action]:-40-state.uses[p.action]):p.information*1.6+p.contactPreservedFraction*12-p.uncertainty*(6+constraint*20)-Math.max(0,p.meanPressure-p0)*(0.08+constraint*0.25);
  admissible.sort((a,b)=>score(b)-score(a)||a.action-b.action);state.decisions.practical_inquiry++;return{action:admissible[0].action,mode:'practical_inquiry',models,prospects};
}

module.exports={one,observe,chooseAction,actionModel,nearestOutcomes,frameDistance,trajectoryOutcome,prospectAction};
