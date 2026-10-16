'use strict';

// Corrigible hypothesis ledger for full Universal-Language mathematical graphs.
//
// This generalizes relation-hypotheses.js beyond the older O0..O10 motif
// representation. A proposer can submit any expression system accepted by
// universal-math-graph.js. Proposal confidence has no epistemic authority.
// Evidence must explicitly say which anonymous hypotheses it tests; incomplete
// evidence stays unresolved, complete non-matching evidence may defeat, and a
// later revision of a candidate replays all stored evidence against the new
// structure.

const {compileMathGraph}=require('./universal-math-graph');
const {canonicalGraph,stable}=require('./relational-normal-form');

function asCompiledMath(input,options={}){
  if(Array.isArray(input)) return compileMathGraph(input,options);
  if(input && Array.isArray(input.expressions)) return compileMathGraph(input.expressions,options);
  if(input && typeof input.signature==='string' && Array.isArray(input.edges)) {
    return {
      version:input.version ?? 1,
      vertex_count:Number(input.vertex_count ?? 0),
      edges:input.edges.map(e=>e.slice()),
      signature:input.signature,
      canonicalization_states:input.canonicalization_states ?? null
    };
  }
  if(input && Array.isArray(input.edges)){
    const c=canonicalGraph({edges:input.edges},options);
    return {version:1,vertex_count:c.vertex_count,edges:c.edges,signature:c.signature,canonicalization_states:c.states};
  }
  throw new Error('math hypothesis/contact requires expressions or a compiled graph');
}

function edgeKey(label,a,b){return `${stable(label)}|${String(a)}|${String(b)}`;}

// Generic injective directed labelled subgraph match. Exact canonical identity
// exits immediately. The matcher knows nothing about English or intent kinds.
function matchCompiledSubgraph(patternInput,graphInput,options={}){
  const pattern=asCompiledMath(patternInput,options);
  const graph=asCompiledMath(graphInput,options);
  if(pattern.signature===graph.signature) return {exact:true,mapping:null,states:0};
  if(pattern.vertex_count>graph.vertex_count || pattern.edges.length>graph.edges.length) return null;

  const pVertices=[...new Set(pattern.edges.flatMap(e=>[String(e[1]),String(e[2])]))];
  const gVertices=[...new Set(graph.edges.flatMap(e=>[String(e[1]),String(e[2])]))];
  const gEdgeSet=new Set(graph.edges.map(e=>edgeKey(e[0],e[1],e[2])));
  const maxStates=options.maxMatchStates ?? 200000;
  let states=0;

  const selfLabels=(edges,v)=>edges.filter(e=>String(e[1])===v && String(e[2])===v).map(e=>stable(e[0])).sort();
  const pSelf=new Map(pVertices.map(v=>[v,selfLabels(pattern.edges,v)]));
  const gSelf=new Map(gVertices.map(v=>[v,new Set(selfLabels(graph.edges,v))]));
  const degree=(edges,v)=>edges.filter(e=>String(e[1])===v||String(e[2])===v).length;
  pVertices.sort((a,b)=>degree(pattern.edges,b)-degree(pattern.edges,a));

  const candidates=new Map(pVertices.map(p=>[
    p,
    gVertices.filter(g=>pSelf.get(p).every(x=>gSelf.get(g).has(x)))
  ]));
  if([...candidates.values()].some(xs=>!xs.length)) return null;

  const map={};
  const used=new Set();
  function consistent(){
    for(const [label,a,b] of pattern.edges){
      const aa=map[String(a)], bb=map[String(b)];
      if(aa!==undefined && bb!==undefined && !gEdgeSet.has(edgeKey(label,aa,bb))) return false;
    }
    return true;
  }
  function dfs(i){
    if(++states>maxStates) throw new Error('math subgraph match state limit exceeded');
    if(i===pVertices.length) return {...map};
    const p=pVertices[i];
    for(const g of candidates.get(p)){
      if(used.has(g)) continue;
      map[p]=g; used.add(g);
      if(consistent()){
        const r=dfs(i+1);
        if(r) return r;
      }
      used.delete(g); delete map[p];
    }
    return null;
  }
  const mapping=dfs(0);
  return mapping ? {exact:false,mapping,states} : null;
}

function oneMathHypothesisLedger(){
  return {whole:1,version:1,step:0,candidates:{},signature_index:{},evidence:[],audit:[]};
}

function assertLedger(L){if(!L || L.whole!==1) throw new Error('invalid math hypothesis ledger');}

function proposeMath(L,proposal,options={}){
  assertLedger(L);
  const graph=asCompiledMath(proposal.graph ?? proposal.expressions ?? proposal,options);
  const existing=L.signature_index[graph.signature];
  const record={source:proposal.source ?? 'unknown',confidence:proposal.confidence ?? null,note:proposal.note ?? null};
  if(existing){
    const c=L.candidates[existing];
    c.proposals.push(record);
    L.audit.push({step:++L.step,kind:'proposal-merged',id:c.id,source:record.source});
    return c;
  }
  const id=String(proposal.id ?? `h${Object.keys(L.candidates).length+1}`);
  if(L.candidates[id]) throw new Error(`duplicate hypothesis id ${id}`);
  const c={id,revision:1,graph,signature:graph.signature,proposals:[record],support:[],defeat:[],status:'open',usable:false};
  L.candidates[id]=c; L.signature_index[graph.signature]=id;
  L.audit.push({step:++L.step,kind:'proposed',id,source:record.source});
  return c;
}

function targetsCandidate(metadata,c){
  if(metadata?.candidates==='all') return true;
  if(!Array.isArray(metadata?.candidates)) return false;
  return metadata.candidates.map(String).includes(String(c.id));
}

function evaluateMathCandidate(c,evidence,options={}){
  const metadata=evidence.metadata || {};
  if(!targetsCandidate(metadata,c)) return {kind:'untested'};
  const match=matchCompiledSubgraph(c.graph,evidence.graph,options);
  if(match) return {kind:'support',match};
  return metadata.complete===true
    ? {kind:'defeat',reason:'complete-targeted-counterexample'}
    : {kind:'unresolved',reason:'incomplete-targeted-contact'};
}

function statusFrom(c){
  if(c.support.length && c.defeat.length){c.status='contested';c.usable=false;}
  else if(c.support.length){c.status='supported';c.usable=true;}
  else if(c.defeat.length){c.status='defeated';c.usable=false;}
  else {c.status='open';c.usable=false;}
  return c;
}

function recomputeMathCandidate(L,c,options={}){
  c.support=[]; c.defeat=[];
  for(const e of L.evidence){
    const r=evaluateMathCandidate(c,e,options);
    if(r.kind==='support') c.support.push({evidence:e.id,match:r.match});
    if(r.kind==='defeat') c.defeat.push({evidence:e.id,reason:r.reason});
  }
  return statusFrom(c);
}

function contactMath(L,input,metadata={},options={}){
  assertLedger(L);
  const graph=asCompiledMath(input,options);
  const id=String(metadata.id ?? `e${L.evidence.length+1}`);
  if(L.evidence.some(e=>e.id===id)) throw new Error(`duplicate evidence id ${id}`);
  const evidence={id,graph,metadata:{...metadata,id}};
  L.evidence.push(evidence);
  const results=[];
  for(const c of Object.values(L.candidates)){
    const before=c.status;
    recomputeMathCandidate(L,c,options);
    const latest=evaluateMathCandidate(c,evidence,options);
    results.push({id:c.id,result:latest.kind,before,status:c.status,usable:c.usable});
  }
  L.audit.push({step:++L.step,kind:'evidence',id,results});
  return results;
}

function reviseMath(L,id,input,note=null,options={}){
  assertLedger(L);
  const c=L.candidates[String(id)];
  if(!c) throw new Error(`unknown hypothesis ${String(id)}`);
  const graph=asCompiledMath(input,options);
  const collision=L.signature_index[graph.signature];
  if(collision && collision!==c.id) throw new Error(`revision converges with existing hypothesis ${collision}; explicit merge required`);
  delete L.signature_index[c.signature];
  const before=c.signature;
  c.graph=graph; c.signature=graph.signature; c.revision++;
  L.signature_index[c.signature]=c.id;
  recomputeMathCandidate(L,c,options);
  L.audit.push({step:++L.step,kind:'revised',id:c.id,from:before,to:c.signature,revision:c.revision,note,status:c.status});
  return c;
}

function usableMathPatterns(L){
  assertLedger(L);
  return Object.values(L.candidates).filter(c=>c.usable).map(c=>({id:c.id,revision:c.revision,graph:c.graph,signature:c.signature}));
}

function pureMathLedger(L){
  assertLedger(L);
  return {
    whole:1,
    version:L.version,
    candidates:Object.values(L.candidates).map(c=>({
      id:c.id,revision:c.revision,graph:c.graph,status:c.status,usable:c.usable,
      support_count:c.support.length,defeat_count:c.defeat.length
    }))
  };
}

module.exports={
  asCompiledMath,matchCompiledSubgraph,oneMathHypothesisLedger,proposeMath,
  evaluateMathCandidate,contactMath,reviseMath,usableMathPatterns,pureMathLedger,
  recomputeMathCandidate
};
