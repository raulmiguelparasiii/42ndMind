'use strict';

// Innate epistemic guidance for 42ndMind.
//
// No world reward table or semantic map exists here. The mind receives primitive
// sensor frames and a primitive motor alphabet. At the tail of each frame are a
// continuity contact followed by N distinct embodied pressure contacts.
//
// Stone: answer every materially relevant pressure rather than allowing one to
// hide another; preserve continued reality-contact.
// Practicality: time/capacity are finite and some consequences are irreversible,
// so exhaustive direct trial is not always available. Project learned consequences
// before commitment when constraint makes direct trial unaffordable.
// OneLogic: preserve undefeated possible futures, distinguish strict from
// defeasible consequence, inquire when unresolved, and reopen when reality wins.

function clamp(x,lo,hi){return Math.max(lo,Math.min(hi,x));}
function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;}
function entropy(values){
  if(!values.length)return 0;const c=new Map();
  for(const v of values)c.set(v,(c.get(v)||0)+1);
  let h=0;for(const n of c.values()){const p=n/values.length;h-=p*Math.log2(p);}return h;
}
function frameDistance(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return Infinity;
  let s=0;for(let i=0;i<a.length;i++)s+=Math.abs(a[i]-b[i]);return s/Math.max(1,a.length);
}
function coarseSignature(frame){return frame.map(x=>Math.floor(x/32)).join(':');}
function indexKey(frame,action){return `${action}|${coarseSignature(frame)}`;}
function maxVec(v){return v.length?Math.max(...v):0;}
function componentMax(a,b){return a.map((x,i)=>Math.max(x,b[i]));}
function componentDelta(after,before){return after.map((x,i)=>x-before[i]);}
function worstWorsening(after,before){return Math.max(...componentDelta(after,before));}
function paretoNonWorsening(before,after,eps=1.5){return after.every((x,i)=>x<=before[i]+eps);}
function paretoResolves(before,after,eps=1.5){return paretoNonWorsening(before,after,eps)&&after.some((x,i)=>x<before[i]-eps);}

function one(actionCount,pressureCount=1){
  if(!Number.isInteger(pressureCount)||pressureCount<1)throw new Error('pressureCount must be positive');
  return{
    whole:1,action_count:actionCount,pressure_count:pressureCount,transitions:[],by_serial:new Map(),
    by_action:Array.from({length:actionCount},()=>[]),context_index:new Map(),uses:Array(actionCount).fill(0),
    decisions:{bootstrap_inquiry:0,foresight_strict:0,foresight_defeasible:0,practical_inquiry:0},
    prior:{
      stone:'answer all materially relevant pressures without allowing improvement in one to hide failure in another; preserve continued reality-contact',
      practicality:'finite time/capacity makes exhaustive direct trial impossible; infer from learned consequences before irreversible commitment when warranted',
      onelogic:'preserve undefeated possibilities; assert only forced consequence; inquire when unresolved; reopen when defeated',
    },
  };
}

function pressureVector(state,frame){return frame.slice(frame.length-state.pressure_count);}
function continuity(state,frame){return frame.at(-(state.pressure_count+1));}
function overallPressure(state,frame){return maxVec(pressureVector(state,frame));}
function sensoryChange(state,a,b){
  const n=Math.max(0,Math.min(a.length,b.length)-state.pressure_count-1);if(!n)return 0;
  let s=0;for(let i=0;i<n;i++)s+=Math.abs(a[i]-b[i]);return s/n;
}

function observe(state,before,action,after){
  if(!Array.isArray(before)||!Array.isArray(after)||before.length!==after.length)throw new Error('guidance observation requires equal primitive frames');
  if(!Number.isInteger(action)||action<0||action>=state.action_count)throw new Error('invalid primitive action');
  const serial=state.transitions.length?state.transitions.at(-1).serial+1:0;
  const t={before:before.slice(),action,after:after.slice(),serial};
  state.transitions.push(t);state.by_serial.set(serial,t);state.by_action[action].push(t);state.uses[action]++;
  const k=indexKey(before,action);if(!state.context_index.has(k))state.context_index.set(k,[]);state.context_index.get(k).push(t);
  if(state.transitions.length>5000){
    const removed=state.transitions.splice(0,state.transitions.length-5000),ids=new Set(removed.map(x=>x.serial));
    for(const id of ids)state.by_serial.delete(id);
    for(let a=0;a<state.action_count;a++)state.by_action[a]=state.by_action[a].filter(x=>!ids.has(x.serial));
    for(const [k,arr] of state.context_index){const kept=arr.filter(x=>!ids.has(x.serial));if(kept.length)state.context_index.set(k,kept);else state.context_index.delete(k);}
  }
}

function recentActions(state,k=5){return state.transitions.slice(-k).map(t=>t.action);}
function contextMismatch(state,t,queryActions){
  if(!queryActions||!queryActions.length)return 0;
  let mismatch=0,compared=0;const n=Math.min(5,queryActions.length);
  for(let j=1;j<=n;j++){
    const prev=state.by_serial.get(t.serial-j);if(!prev)continue;
    compared++;if(prev.action!==queryActions[queryActions.length-j])mismatch++;
  }
  return compared?mismatch/compared:0;
}

function nearestOutcomes(state,frame,action,limit=24,contextActions=null){
  const exact=state.context_index.get(indexKey(frame,action))||[];
  const source=exact.length>=3?exact:state.by_action[action].slice(-96);
  const qctx=contextActions||recentActions(state),c=[];
  for(const t of source){
    const visual=frameDistance(frame,t.before),temporal=contextMismatch(state,t,qctx);
    c.push({...t,distance:visual+temporal*10,visualDistance:visual,contextMismatch:temporal,age:state.transitions.length-t.serial});
  }
  c.sort((a,b)=>a.distance-b.distance||a.age-b.age);if(!c.length)return[];
  const best=c[0].distance,radius=best*1.35+10,local=c.filter(x=>x.distance<=radius).slice(0,limit);
  return local.length>=3?local:c.slice(0,Math.min(limit,3));
}

function trajectoryOutcome(state,candidate,horizon=6){
  let final=pressureVector(state,candidate.after),pathMax=final.slice(),minContinuity=continuity(state,candidate.after),last=candidate.after;
  let serial=candidate.serial,length=1;
  while(length<horizon){
    const t=state.by_serial.get(++serial);if(!t||frameDistance(last,t.before)>1e-9)break;
    final=pressureVector(state,t.after);pathMax=componentMax(pathMax,final);minContinuity=Math.min(minContinuity,continuity(state,t.after));
    last=t.after;length++;if(continuity(state,t.after)<=0)break;
  }
  return{finalPressures:final,pathMaxPressures:pathMax,minContinuity,length};
}

function actionModel(state,frame,action,contextActions=null){
  const live=nearestOutcomes(state,frame,action,24,contextActions),current=pressureVector(state,frame);
  if(!live.length)return{action,live,unknown:true,support:0,currentPressures:current,resolvingFraction:0,nonWorseningFraction:0,
    worstFinalPressure:null,worstWorsening:Infinity,outcomeEntropy:Infinity,contactGain:Infinity,contextDistance:Infinity,
    contactPreservedFraction:1,anyContactLoss:false,forcedContactLoss:false,forcedImprovement:false,insulating:false};
  const tr=live.map(x=>trajectoryOutcome(state,x));
  const final=tr.map(x=>x.finalPressures),pres=tr.filter(x=>x.minContinuity>0).length/tr.length;
  const resolving=final.filter(v=>paretoResolves(current,v)).length/final.length;
  const nonWorsening=final.filter(v=>paretoNonWorsening(current,v)).length/final.length;
  const worstFinal=Math.max(...final.map(maxVec));
  const worstDelta=Math.max(...final.map(v=>worstWorsening(v,current)));
  const gain=mean(live.map(x=>sensoryChange(state,x.before,x.after)));
  return{
    action,live,unknown:false,support:live.length,currentPressures:current,resolvingFraction:resolving,nonWorseningFraction:nonWorsening,
    worstFinalPressure:worstFinal,worstWorsening:worstDelta,outcomeEntropy:entropy(live.map(x=>coarseSignature(x.after))),contactGain:gain,
    contextDistance:mean(live.map(x=>x.distance)),contactPreservedFraction:pres,anyContactLoss:tr.some(x=>x.minContinuity<=0),
    forcedContactLoss:tr.every(x=>x.minContinuity<=0),forcedImprovement:pres===1&&final.every(v=>paretoResolves(current,v)),
    insulating:final.length>=3&&resolving===0&&gain<3,
  };
}

function keepDiverse(nodes,limit){
  if(nodes.length<=limit)return nodes;const chosen=[],seen=new Set();
  function take(sorted,n){for(const x of sorted){const k=`${x.firstAction}|${x.depth}|${coarseSignature(x.frame)}|${x.minContinuity}|${x.context.slice(-3).join(',')}`;if(seen.has(k))continue;seen.add(k);chosen.push(x);if(chosen.length>=n)break;}}
  const q=Math.max(1,Math.floor(limit/4));
  take(nodes.slice().sort((a,b)=>a.minContinuity-b.minContinuity||maxVec(b.pathMax)-maxVec(a.pathMax)),q);
  take(nodes.slice().sort((a,b)=>maxVec(b.finalPressures)-maxVec(a.finalPressures)),q*2);
  take(nodes.slice().sort((a,b)=>maxVec(a.finalPressures)-maxVec(b.finalPressures)||b.support-a.support),q*3);
  take(nodes.slice().sort((a,b)=>a.distance-b.distance||b.support-a.support),limit);return chosen.slice(0,limit);
}

function prospectAction(state,frame,firstAction,horizon=3,beam=16,contextActions=null){
  const baseContext=contextActions||recentActions(state),initial=nearestOutcomes(state,frame,firstAction,4,baseContext),current=pressureVector(state,frame);
  if(!initial.length)return{action:firstAction,unknown:true,support:0,horizon,contactPreservedFraction:1,forcedContactLoss:false,
    resolvingFraction:0,nonWorseningFraction:0,worstFinalPressure:null,worstWorsening:Infinity,uncertainty:1,information:Infinity,forcedImprovement:false};
  let nodes=initial.map(x=>{
    const p=pressureVector(state,x.after);
    return{firstAction,frame:x.after.slice(),minContinuity:continuity(state,x.after),pathMax:p.slice(),finalPressures:p,support:1,distance:x.distance,depth:1,context:[...baseContext,firstAction].slice(-5)};
  });
  for(let depth=1;depth<horizon;depth++){
    const expanded=[];
    for(const node of nodes){
      if(node.minContinuity<=0){expanded.push(node);continue;}
      let known=0;
      for(let a=0;a<state.action_count;a++){
        const outs=nearestOutcomes(state,node.frame,a,2,node.context);if(!outs.length)continue;known++;
        for(const out of outs){const p=pressureVector(state,out.after);expanded.push({
          firstAction,frame:out.after.slice(),minContinuity:Math.min(node.minContinuity,continuity(state,out.after)),pathMax:componentMax(node.pathMax,p),finalPressures:p,
          support:node.support+1,distance:node.distance+out.distance,depth:depth+1,context:[...node.context,a].slice(-5)});}
      }
      if(!known)expanded.push({...node,unknown:true,depth:depth+1});
    }
    nodes=keepDiverse(expanded,beam);
  }
  const preserved=nodes.filter(x=>x.minContinuity>0).length/nodes.length,unknown=nodes.filter(x=>x.unknown).length/nodes.length;
  const finals=nodes.map(x=>x.finalPressures),resolving=finals.filter(v=>paretoResolves(current,v)).length/finals.length;
  const nonWorsening=finals.filter(v=>paretoNonWorsening(current,v)).length/finals.length;
  return{
    action:firstAction,unknown:false,support:initial.length,horizon,leaves:nodes.length,contactPreservedFraction:preserved,
    forcedContactLoss:nodes.every(x=>x.minContinuity<=0),resolvingFraction:resolving,nonWorseningFraction:nonWorsening,
    worstFinalPressure:Math.max(...finals.map(maxVec)),worstWorsening:Math.max(...finals.map(v=>worstWorsening(v,current))),
    uncertainty:unknown,information:entropy(nodes.map(x=>coarseSignature(x.frame))),
    forcedImprovement:unknown===0&&preserved===1&&finals.every(v=>paretoResolves(current,v)),
  };
}

function leastUsed(state){let b=0;for(let a=1;a<state.action_count;a++)if(state.uses[a]<state.uses[b])b=a;return b;}

function chooseAction(state,frame){
  if(!Array.isArray(frame)||frame.length<state.pressure_count+1)throw new Error('guidance requires continuity and embodied pressure contacts');
  const current=pressureVector(state,frame),currentWorst=maxVec(current),constraint=clamp(currentWorst/255,0,1),context=recentActions(state);
  if(state.transitions.length<state.action_count*2&&constraint<0.35){const action=leastUsed(state);state.decisions.bootstrap_inquiry++;return{action,mode:'bootstrap_inquiry',models:[],prospects:[]};}
  const models=Array.from({length:state.action_count},(_,a)=>actionModel(state,frame,a,context));
  const horizon=constraint>=0.55?4:constraint>=0.25?3:2;
  const prospects=Array.from({length:state.action_count},(_,a)=>prospectAction(state,frame,a,horizon,16,context));

  if(currentWorst>=8){
    const strict=prospects.filter(p=>!p.unknown&&p.support>=2&&p.forcedImprovement&&!p.forcedContactLoss);
    if(strict.length){
      strict.sort((a,b)=>a.worstFinalPressure-b.worstFinalPressure||a.worstWorsening-b.worstWorsening||b.contactPreservedFraction-a.contactPreservedFraction||b.support-a.support||a.action-b.action);
      state.decisions.foresight_strict++;return{action:strict[0].action,mode:'foresight_strict',models,prospects};
    }
    const plausible=prospects.filter(p=>!p.unknown&&!p.forcedContactLoss&&p.contactPreservedFraction>=0.90&&p.nonWorseningFraction>=0.65&&p.resolvingFraction>=0.40);
    if(plausible.length){
      const score=p=>(currentWorst-p.worstFinalPressure)-Math.max(0,p.worstWorsening)*(0.8+constraint*1.5)+p.resolvingFraction*10+p.nonWorseningFraction*8+p.contactPreservedFraction*12-p.uncertainty*(8+constraint*24);
      plausible.sort((a,b)=>score(b)-score(a)||b.support-a.support||a.action-b.action);
      state.decisions.foresight_defeasible++;return{action:plausible[0].action,mode:'foresight_defeasible',models,prospects};
    }
  }

  let admissible=prospects.filter(p=>!p.forcedContactLoss&&p.contactPreservedFraction>=(constraint>0.5?0.95:0.70)&&p.worstWorsening<=(constraint>0.5?8:24));
  if(!admissible.length)admissible=prospects.filter(p=>!p.forcedContactLoss&&p.contactPreservedFraction>=0.75);
  if(!admissible.length)admissible=prospects.filter(p=>!p.forcedContactLoss);
  if(!admissible.length)admissible=prospects.slice();
  const score=p=>p.unknown?(constraint<0.25?40-state.uses[p.action]:-60-state.uses[p.action]):
    p.information*1.3+p.contactPreservedFraction*14+p.nonWorseningFraction*8-p.uncertainty*(6+constraint*24)-Math.max(0,p.worstWorsening)*(0.25+constraint*1.5)-Math.max(0,p.worstFinalPressure-currentWorst)*0.15;
  admissible.sort((a,b)=>score(b)-score(a)||a.action-b.action);state.decisions.practical_inquiry++;return{action:admissible[0].action,mode:'practical_inquiry',models,prospects};
}

module.exports={one,observe,chooseAction,actionModel,nearestOutcomes,frameDistance,trajectoryOutcome,prospectAction,recentActions,pressureVector,overallPressure,paretoResolves,paretoNonWorsening};
