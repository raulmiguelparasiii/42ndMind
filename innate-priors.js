'use strict';

// Innate epistemic guidance for 42ndMind.
//
// No world reward table, map, resource label, or semantic action policy exists
// here. The frame tail contains continuity-of-contact followed by N distinct
// embodied pressures.
//
// Stone: answer materially relevant pressures without hiding one inside another;
// preserve continued answerability to reality.
// Practicality: direct trial is affordable only while finite runway remains; once
// a useful relation has been learned, re-use it rather than waiting to rediscover
// the consequence firsthand.
// OneLogic: keep live possibilities, distinguish strict from defeasible inference,
// inquire while uncertainty is affordable, and revise when reality contradicts
// the represented future.

function clamp(x,lo,hi){return Math.max(lo,Math.min(hi,x));}
function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;}
function median(xs){if(!xs.length)return 0;const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function entropy(values){if(!values.length)return 0;const c=new Map();for(const v of values)c.set(v,(c.get(v)||0)+1);let h=0;for(const n of c.values()){const p=n/values.length;h-=p*Math.log2(p);}return h;}
function frameDistance(a,b){if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return Infinity;let s=0;for(let i=0;i<a.length;i++)s+=Math.abs(a[i]-b[i]);return s/Math.max(1,a.length);}
function coarseSignature(frame){return frame.map(x=>Math.floor(x/32)).join(':');}
function indexKey(frame,action){return `${action}|${coarseSignature(frame)}`;}
function maxVec(v){return v.length?Math.max(...v):0;}
function componentMax(a,b){return a.map((x,i)=>Math.max(x,b[i]));}

function one(actionCount,pressureCount=1){
  if(!Number.isInteger(pressureCount)||pressureCount<1)throw new Error('pressureCount must be positive');
  return{
    whole:1,action_count:actionCount,pressure_count:pressureCount,
    transitions:[],by_serial:new Map(),by_action:Array.from({length:actionCount},()=>[]),context_index:new Map(),uses:Array(actionCount).fill(0),
    graph:new Map(),
    decisions:{bootstrap_inquiry:0,slack_inquiry:0,practical_recall:0,foresight_strict:0,foresight_defeasible:0,practical_inquiry:0},
    prior:{
      stone:'answer every materially relevant pressure without allowing one pressure to hide another; preserve continued reality-contact',
      practicality:'finite runway makes exhaustive direct trial impossible; explore while affordable, then re-use learned consequence structure before irreversible commitment',
      onelogic:'preserve undefeated possibilities; assert only forced consequence; inquire when unresolved; reopen when defeated',
    },
  };
}

function pressureVector(state,frame){return frame.slice(frame.length-state.pressure_count);}
function continuity(state,frame){return frame.at(-(state.pressure_count+1));}
function overallPressure(state,frame){return maxVec(pressureVector(state,frame));}
function perceptVector(state,frame){return frame.slice(0,frame.length-state.pressure_count-1);}
function perceptSignature(state,frame){return perceptVector(state,frame).join(',');}
function perceptDistance(a,b){if(a.length!==b.length)return Infinity;let d=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])d++;return d/Math.max(1,a.length);}
function sensoryChange(state,a,b){const x=perceptVector(state,a),y=perceptVector(state,b);return frameDistance(x,y);}

function graphObserve(state,before,action,after){
  const from=perceptSignature(state,before),to=perceptSignature(state,after),pv=perceptVector(state,before);
  let node=state.graph.get(from);
  if(!node){node={percept:pv,actions:new Map(),visits:0};state.graph.set(from,node);}
  node.visits++;
  if(!state.graph.has(to))state.graph.set(to,{percept:perceptVector(state,after),actions:new Map(),visits:0});
  let actionMap=node.actions.get(action);if(!actionMap){actionMap=new Map();node.actions.set(action,actionMap);}
  let stat=actionMap.get(to);
  if(!stat){stat={count:0,continuity:0,relief:Array(state.pressure_count).fill(0),meanDelta:Array(state.pressure_count).fill(0)};actionMap.set(to,stat);}
  stat.count++;if(continuity(state,after)>0)stat.continuity++;
  const b=pressureVector(state,before),a=pressureVector(state,after);
  for(let i=0;i<state.pressure_count;i++){
    const delta=a[i]-b[i];stat.meanDelta[i]+= (delta-stat.meanDelta[i])/stat.count;
    if(b[i]-a[i]>3)stat.relief[i]++;
  }
}

function observe(state,before,action,after){
  if(!Array.isArray(before)||!Array.isArray(after)||before.length!==after.length)throw new Error('guidance observation requires equal primitive frames');
  if(!Number.isInteger(action)||action<0||action>=state.action_count)throw new Error('invalid primitive action');
  const serial=state.transitions.length?state.transitions.at(-1).serial+1:0;
  const t={before:before.slice(),action,after:after.slice(),serial};
  state.transitions.push(t);state.by_serial.set(serial,t);state.by_action[action].push(t);state.uses[action]++;
  const k=indexKey(before,action);if(!state.context_index.has(k))state.context_index.set(k,[]);state.context_index.get(k).push(t);
  graphObserve(state,before,action,after);
  if(state.transitions.length>5000){
    const removed=state.transitions.splice(0,state.transitions.length-5000),ids=new Set(removed.map(x=>x.serial));
    for(const id of ids)state.by_serial.delete(id);
    for(let a=0;a<state.action_count;a++)state.by_action[a]=state.by_action[a].filter(x=>!ids.has(x.serial));
    for(const [k,arr] of state.context_index){const kept=arr.filter(x=>!ids.has(x.serial));if(kept.length)state.context_index.set(k,kept);else state.context_index.delete(k);}
  }
}

function recentActions(state,k=5){return state.transitions.slice(-k).map(t=>t.action);}
function contextMismatch(state,t,queryActions){
  if(!queryActions||!queryActions.length)return 0;let mismatch=0,compared=0;const n=Math.min(5,queryActions.length);
  for(let j=1;j<=n;j++){const prev=state.by_serial.get(t.serial-j);if(!prev)continue;compared++;if(prev.action!==queryActions[queryActions.length-j])mismatch++;}
  return compared?mismatch/compared:0;
}
function nearestOutcomes(state,frame,action,limit=24,contextActions=null){
  const exact=state.context_index.get(indexKey(frame,action))||[],source=exact.length>=3?exact:state.by_action[action].slice(-96);
  const qctx=contextActions||recentActions(state),c=[];
  for(const t of source){const visual=frameDistance(frame,t.before),temporal=contextMismatch(state,t,qctx);c.push({...t,distance:visual+temporal*10,age:state.transitions.length-t.serial});}
  c.sort((a,b)=>a.distance-b.distance||a.age-b.age);if(!c.length)return[];
  const best=c[0].distance,radius=best*1.35+10,local=c.filter(x=>x.distance<=radius).slice(0,limit);
  return local.length>=3?local:c.slice(0,Math.min(limit,3));
}

function learnedDrift(state,frame,window=24){
  const n=state.pressure_count,samples=Array.from({length:n},()=>[]);
  for(const t of state.transitions.slice(-window)){
    const a=pressureVector(state,t.before),b=pressureVector(state,t.after);
    for(let i=0;i<n;i++){const d=b[i]-a[i];if(d>0&&d<32)samples[i].push(d);}
  }
  return samples.map(xs=>xs.length?median(xs):0);
}
function dimensionRunways(state,frame){
  const p=pressureVector(state,frame),drift=learnedDrift(state,frame);
  return p.map((x,i)=>drift[i]>0.05?(255-x)/drift[i]:Infinity);
}
function finiteRunway(state,frame){return Math.min(...dimensionRunways(state,frame));}

function nearestGraphState(state,frame){
  const exact=perceptSignature(state,frame);if(state.graph.has(exact))return exact;
  const p=perceptVector(state,frame);let best=null,bestD=Infinity;
  for(const [sig,node] of state.graph){const d=perceptDistance(p,node.percept);if(d<bestD){bestD=d;best=sig;}}
  return bestD<=0.28?best:null;
}

function graphActionNovelty(state,frame,action){
  const sig=nearestGraphState(state,frame);if(!sig)return 1;
  const node=state.graph.get(sig);return node&&node.actions.has(action)?0:1;
}

function findReliefPlan(state,frame,pressureIndex,maxDepth=18){
  const start=nearestGraphState(state,frame);if(!start)return null;
  const queue=[{sig:start,path:[],cost:0}],best=new Map([[start,0]]);let answer=null;
  while(queue.length){
    queue.sort((a,b)=>a.cost-b.cost);const cur=queue.shift();
    if(answer&&cur.cost>=answer.cost)continue;
    if(cur.path.length>maxDepth)continue;
    const node=state.graph.get(cur.sig);if(!node)continue;

    for(const [action,nexts] of node.actions){
      let total=0;for(const st of nexts.values())total+=st.count;
      let reliefEvidence=0,continuityEvidence=0;
      for(const st of nexts.values()){reliefEvidence+=st.relief[pressureIndex];continuityEvidence+=st.continuity;}
      if(reliefEvidence>0&&continuityEvidence/Math.max(1,total)>=0.75){
        const targetCost=cur.cost+1+1/Math.sqrt(reliefEvidence);
        if(!answer||targetCost<answer.cost)answer={firstAction:cur.path.length?cur.path[0]:action,path:[...cur.path,action],cost:targetCost,reliefEvidence};
      }
      if(cur.path.length>=maxDepth)continue;
      for(const [to,st] of nexts){
        const cont=st.continuity/Math.max(1,st.count);if(cont<0.75)continue;
        const prob=st.count/Math.max(1,total),nextCost=cur.cost+1-Math.log(Math.max(0.05,prob))*0.7;
        if(nextCost>=(best.get(to)??Infinity))continue;
        best.set(to,nextCost);queue.push({sig:to,path:[...cur.path,action],cost:nextCost});
      }
    }
  }
  return answer;
}

function trajectoryOutcome(state,candidate,horizon=6){
  let final=pressureVector(state,candidate.after),pathMax=final.slice(),minContinuity=continuity(state,candidate.after),last=candidate.after,serial=candidate.serial,length=1;
  while(length<horizon){const t=state.by_serial.get(++serial);if(!t||frameDistance(last,t.before)>1e-9)break;final=pressureVector(state,t.after);pathMax=componentMax(pathMax,final);minContinuity=Math.min(minContinuity,continuity(state,t.after));last=t.after;length++;if(continuity(state,t.after)<=0)break;}
  return{finalPressures:final,pathMaxPressures:pathMax,minContinuity,length};
}
function actionModel(state,frame,action,contextActions=null){
  const live=nearestOutcomes(state,frame,action,20,contextActions),current=pressureVector(state,frame);
  if(!live.length)return{action,unknown:true,support:0,contactGain:Infinity,outcomeEntropy:Infinity,contextDistance:Infinity,contactPreservedFraction:1,meanFinalPressures:null,worstFinalPressures:null};
  const tr=live.map(x=>trajectoryOutcome(state,x,3)),finals=tr.map(x=>x.finalPressures),pres=tr.filter(x=>x.minContinuity>0).length/tr.length;
  const meanFinal=current.map((_,i)=>mean(finals.map(v=>v[i]))),worstFinal=current.map((_,i)=>Math.max(...finals.map(v=>v[i])));
  return{action,unknown:false,support:live.length,contactGain:mean(live.map(x=>sensoryChange(state,x.before,x.after))),outcomeEntropy:entropy(live.map(x=>coarseSignature(x.after))),contextDistance:mean(live.map(x=>x.distance)),contactPreservedFraction:pres,meanFinalPressures:meanFinal,worstFinalPressures:worstFinal};
}

function keepDiverse(nodes,limit){
  if(nodes.length<=limit)return nodes;const chosen=[],seen=new Set();
  function take(sorted,n){for(const x of sorted){const k=`${x.firstAction}|${x.depth}|${coarseSignature(x.frame)}|${x.minContinuity}|${x.context.slice(-3).join(',')}`;if(seen.has(k))continue;seen.add(k);chosen.push(x);if(chosen.length>=n)break;}}
  const q=Math.max(1,Math.floor(limit/4));
  take(nodes.slice().sort((a,b)=>a.minContinuity-b.minContinuity||maxVec(b.pathMax)-maxVec(a.pathMax)),q);
  take(nodes.slice().sort((a,b)=>maxVec(b.finalPressures)-maxVec(a.finalPressures)),q*2);
  take(nodes.slice().sort((a,b)=>maxVec(a.finalPressures)-maxVec(b.finalPressures)),q*3);
  take(nodes.slice().sort((a,b)=>a.distance-b.distance),limit);return chosen.slice(0,limit);
}
function prospectAction(state,frame,firstAction,horizon=4,beam=14,contextActions=null){
  const baseContext=contextActions||recentActions(state),initial=nearestOutcomes(state,frame,firstAction,4,baseContext),current=pressureVector(state,frame),drift=learnedDrift(state,frame);
  if(!initial.length)return{action:firstAction,unknown:true,support:0,contactPreservedFraction:1,uncertainty:1,information:Infinity,meanFinalPressures:null,worstFinalPressures:null,worstPathPressures:null,strictResolving:false};
  let nodes=initial.map(x=>{const p=pressureVector(state,x.after);return{firstAction,frame:x.after.slice(),minContinuity:continuity(state,x.after),pathMax:p.slice(),finalPressures:p,distance:x.distance,depth:1,context:[...baseContext,firstAction].slice(-5)};});
  for(let depth=1;depth<horizon;depth++){
    const expanded=[];
    for(const node of nodes){
      if(node.minContinuity<=0){expanded.push(node);continue;}let known=0;
      for(let a=0;a<state.action_count;a++){
        const outs=nearestOutcomes(state,node.frame,a,2,node.context);if(!outs.length)continue;known++;
        for(const out of outs){const p=pressureVector(state,out.after);expanded.push({firstAction,frame:out.after.slice(),minContinuity:Math.min(node.minContinuity,continuity(state,out.after)),pathMax:componentMax(node.pathMax,p),finalPressures:p,distance:node.distance+out.distance,depth:depth+1,context:[...node.context,a].slice(-5)});}
      }
      if(!known)expanded.push({...node,unknown:true,depth:depth+1});
    }
    nodes=keepDiverse(expanded,beam);
  }
  const finals=nodes.map(x=>x.finalPressures),meanFinal=current.map((_,i)=>mean(finals.map(v=>v[i]))),worstFinal=current.map((_,i)=>Math.max(...finals.map(v=>v[i]))),worstPath=current.map((_,i)=>Math.max(...nodes.map(x=>x.pathMax[i])));
  const preserved=nodes.filter(x=>x.minContinuity>0).length/nodes.length,unknown=nodes.filter(x=>x.unknown).length/nodes.length;
  const worstNow=maxVec(current),bottlenecks=current.map((p,i)=>({p,i})).filter(x=>x.p>=worstNow-8).map(x=>x.i),allowance=drift.map(d=>2+d*horizon*1.5);
  const strictResolving=unknown===0&&preserved===1&&finals.every(v=>mean(bottlenecks.map(i=>current[i]-v[i]))>1&&v.every((x,i)=>x<=current[i]+allowance[i]));
  return{action:firstAction,unknown:false,support:initial.length,horizon,contactPreservedFraction:preserved,uncertainty:unknown,information:entropy(nodes.map(x=>coarseSignature(x.frame))),meanFinalPressures:meanFinal,worstFinalPressures:worstFinal,worstPathPressures:worstPath,strictResolving};
}

function leastUsed(state){let b=0;for(let a=1;a<state.action_count;a++)if(state.uses[a]<state.uses[b])b=a;return b;}

function chooseAction(state,frame){
  if(!Array.isArray(frame)||frame.length<state.pressure_count+1)throw new Error('guidance requires continuity and pressure contacts');
  const current=pressureVector(state,frame),worst=maxVec(current),runways=dimensionRunways(state,frame),runway=Math.min(...runways),context=recentActions(state),inquiryBudget=Math.max(32,state.action_count*10);

  if(state.transitions.length<state.action_count*2&&runway>inquiryBudget){const action=leastUsed(state);state.decisions.bootstrap_inquiry++;return{action,mode:'bootstrap_inquiry',runway};}

  const models=Array.from({length:state.action_count},(_,a)=>actionModel(state,frame,a,context)),slack=runway>inquiryBudget&&worst<170;
  if(slack){
    const candidates=models.filter(m=>m.unknown||m.contactPreservedFraction>=0.8);
    const score=m=>{
      if(m.unknown)return 60-state.uses[m.action]*2+graphActionNovelty(state,frame,m.action)*16;
      const underused=1/Math.sqrt(1+state.uses[m.action]),projectedRisk=maxVec(m.worstFinalPressures)-worst;
      return m.outcomeEntropy*3+m.contactGain*0.12+underused*8+graphActionNovelty(state,frame,m.action)*12+clamp(m.contextDistance/32,0,3)-Math.max(0,projectedRisk)*0.12;
    };
    candidates.sort((a,b)=>score(b)-score(a)||a.action-b.action);state.decisions.slack_inquiry++;
    return{action:candidates[0].action,mode:'slack_inquiry',runway,models};
  }

  // Re-use already discovered pressure-relieving trajectories before inventing a
  // fresh trial. The graph is learned entirely from this mind's own contacts.
  const order=current.map((p,i)=>({i,p,r:runways[i]})).sort((a,b)=>a.r-b.r||b.p-a.p);
  let bestPlan=null;
  for(const x of order){
    if(x.p<16)continue;
    const plan=findReliefPlan(state,frame,x.i,18);if(!plan)continue;
    if(Number.isFinite(x.r)&&plan.path.length+4>=x.r)continue;
    const score=plan.cost-x.p/64;
    if(!bestPlan||score<bestPlan.score)bestPlan={...plan,score,pressureIndex:x.i};
  }
  if(bestPlan){state.decisions.practical_recall++;return{action:bestPlan.firstAction,mode:'practical_recall',runway,plan:bestPlan};}

  const horizon=runway<=state.action_count*4?7:runway<=inquiryBudget?6:4;
  const prospects=Array.from({length:state.action_count},(_,a)=>prospectAction(state,frame,a,horizon,14,context));
  const strict=prospects.filter(p=>!p.unknown&&p.support>=2&&p.strictResolving);
  if(strict.length){strict.sort((a,b)=>maxVec(a.worstFinalPressures)-maxVec(b.worstFinalPressures)||b.contactPreservedFraction-a.contactPreservedFraction||a.action-b.action);state.decisions.foresight_strict++;return{action:strict[0].action,mode:'foresight_strict',runway,prospects};}

  const bottlenecks=current.map((p,i)=>({p,i})).filter(x=>x.p>=worst-8).map(x=>x.i),viable=prospects.filter(p=>!p.unknown&&p.contactPreservedFraction>=0.8&&maxVec(p.worstPathPressures)<255);
  if(viable.length){
    const score=p=>{const relief=mean(bottlenecks.map(i=>current[i]-p.meanFinalPressures[i])),collateral=Math.max(...p.meanFinalPressures.map((x,i)=>x-current[i])),worstRisk=maxVec(p.worstFinalPressures)-worst;return relief*2.2-collateral*1.1-Math.max(0,worstRisk)*0.6+p.contactPreservedFraction*12-p.uncertainty*18;};
    viable.sort((a,b)=>score(b)-score(a)||a.action-b.action);state.decisions.foresight_defeasible++;return{action:viable[0].action,mode:'foresight_defeasible',runway,prospects};
  }

  let admissible=models.filter(m=>m.unknown||m.contactPreservedFraction>=0.75);if(!admissible.length)admissible=models.slice();
  const urgency=clamp(1-(runway/inquiryBudget),0,1),score=m=>m.unknown?(urgency<0.35?25-state.uses[m.action]:-50-state.uses[m.action]):m.outcomeEntropy*2+m.contactGain*0.08-(maxVec(m.worstFinalPressures)-worst)*urgency;
  admissible.sort((a,b)=>score(b)-score(a)||a.action-b.action);state.decisions.practical_inquiry++;return{action:admissible[0].action,mode:'practical_inquiry',runway,models};
}

function paretoNonWorsening(before,after,eps=1.5){return after.every((x,i)=>x<=before[i]+eps);}
function paretoResolves(before,after,eps=1.5){return paretoNonWorsening(before,after,eps)&&after.some((x,i)=>x<before[i]-eps);}

module.exports={one,observe,chooseAction,actionModel,nearestOutcomes,frameDistance,trajectoryOutcome,prospectAction,recentActions,pressureVector,overallPressure,finiteRunway,dimensionRunways,learnedDrift,findReliefPlan,perceptSignature,paretoResolves,paretoNonWorsening};
