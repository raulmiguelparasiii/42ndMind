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
//
// When source expressions and a generic compositional interface are supplied,
// they live on the same candidate record as the authoritative graph/status.
// Downstream recursive composition must dereference this live record rather
// than copy definitions or maintain a second correction/status authority.
//
// Opaque math spaces group alternative candidate structures for one unresolved
// referent/meaning without copying candidate truth. Space contact is stored in
// this same ledger. A positive structural match can support a mathematical
// candidate globally, while a complete non-match defeats only that candidate's
// assignment to the space. This matters because one mathematical structure may
// be correct for a different referent. Space status is always derived live from
// the ledger; there is no second active/status flag downstream.

const {MOP,compileMathGraph,validateExpr}=require('./universal-math-graph');
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

function cloneExpr(expr){
  validateExpr(expr);
  if(expr.kind==='var') return {kind:'var',name:String(expr.name)};
  if(expr.kind==='const') return {kind:'const',value:expr.value};
  return {kind:'app',op:Number(expr.op),args:expr.args.map(cloneExpr)};
}

function sourceExpressions(input){
  const xs=Array.isArray(input)
    ? input
    : (input && Array.isArray(input.expressions) ? input.expressions : null);
  if(!xs) return null;
  xs.forEach(validateExpr);
  return xs.map(cloneExpr);
}

function variableNames(expressions){
  const out=new Set();
  const walk=e=>{
    validateExpr(e);
    if(e.kind==='var'){out.add(String(e.name));return;}
    if(e.kind==='app')e.args.forEach(walk);
  };
  (expressions||[]).forEach(walk);
  return out;
}

// A compositional interface is proposer-side scaffolding for binding a current
// mathematical candidate into a larger formula. It is deliberately generic:
// content/universe/subject are structural ports, while frame lists source
// variables to retain subject identity for anatomies that otherwise omit an
// explicit participant variable. This metadata is not emitted by pureMathLedger.
function normalizeComposition(spec,expressions){
  if(spec===undefined || spec===null) return null;
  if(!Array.isArray(expressions)) throw new Error('composition interface requires source expressions');
  const vars=variableNames(expressions);
  const need=(value,label)=>{
    if(typeof value!=='string' || !value.length) throw new Error(`composition ${label} must be a variable name`);
    if(!vars.has(value)) throw new Error(`composition ${label} variable ${value} is absent from source expressions`);
    return value;
  };
  const content=need(spec.content,'content');
  const universe=need(spec.universe,'universe');
  const subject=spec.subject===undefined||spec.subject===null ? null : need(spec.subject,'subject');
  let frame=null;
  if(spec.frame!==undefined && spec.frame!==null){
    if(!Array.isArray(spec.frame) || !spec.frame.length) throw new Error('composition frame must be a nonempty variable-name array');
    frame=spec.frame.map((x,i)=>need(x,`frame[${i}]`));
  }
  return {content,universe,subject,frame};
}

function cloneComposition(spec){
  return spec ? {content:spec.content,universe:spec.universe,subject:spec.subject,frame:spec.frame?spec.frame.slice():null} : null;
}

function suppliedComposition(input){
  if(!input || Array.isArray(input) || typeof input!=='object') return {present:false,value:null};
  return Object.prototype.hasOwnProperty.call(input,'composition')
    ? {present:true,value:input.composition}
    : {present:false,value:null};
}

function candidateMaterial(input,priorComposition=null,options={}){
  const rawMath=input && !Array.isArray(input) && input.graph!==undefined
    ? input.graph
    : (input && !Array.isArray(input) && input.expressions!==undefined ? input.expressions : input);
  const graph=asCompiledMath(rawMath,options);
  const expressions=sourceExpressions(input);

  if(expressions && input && !Array.isArray(input) && input.graph!==undefined){
    const fromSource=compileMathGraph(expressions,options);
    if(fromSource.signature!==graph.signature) throw new Error('source expressions do not match supplied math graph');
  }

  const supplied=suppliedComposition(input);
  let composition=null;
  if(expressions){
    if(supplied.present) composition=normalizeComposition(supplied.value,expressions);
    else if(priorComposition){
      try{composition=normalizeComposition(priorComposition,expressions);}catch{composition=null;}
    }
  }else if(supplied.present && supplied.value!==null){
    throw new Error('composition interface requires source expressions');
  }
  return {graph,expressions,composition};
}

function edgeKey(label,a,b){return `${stable(label)}|${String(a)}|${String(b)}`;}

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
  return {whole:1,version:3,step:0,candidates:{},signature_index:{},spaces:{},evidence:[],audit:[]};
}

function assertLedger(L){
  if(!L || L.whole!==1) throw new Error('invalid math hypothesis ledger');
  if(!L.spaces)L.spaces={};
}

function nextCandidateId(L,prefix='h'){
  let i=Object.keys(L.candidates).length+1;
  while(L.candidates[`${prefix}${i}`])i++;
  return `${prefix}${i}`;
}

function proposeMath(L,proposal,options={}){
  assertLedger(L);
  const material=candidateMaterial(proposal, null, options);
  const graph=material.graph;
  const existing=L.signature_index[graph.signature];
  const record={source:proposal?.source ?? 'unknown',confidence:proposal?.confidence ?? null,note:proposal?.note ?? null};
  if(existing){
    const c=L.candidates[existing];
    c.proposals.push(record);
    if(!c.expressions && material.expressions){
      c.expressions=material.expressions;
      c.composition=material.composition;
    }
    L.audit.push({step:++L.step,kind:'proposal-merged',id:c.id,source:record.source});
    return c;
  }
  const id=String(proposal?.id ?? nextCandidateId(L));
  if(L.candidates[id]) throw new Error(`duplicate hypothesis id ${id}`);
  const c={
    id,revision:1,graph,signature:graph.signature,
    expressions:material.expressions,composition:material.composition,
    proposals:[record],support:[],defeat:[],status:'open',usable:false,
    spaces:[]
  };
  L.candidates[id]=c; L.signature_index[graph.signature]=id;
  L.audit.push({step:++L.step,kind:'proposed',id,source:record.source});
  return c;
}

function targetsCandidate(metadata,c){
  if(metadata?.candidates==='all') return true;
  if(Array.isArray(metadata?.candidates) && metadata.candidates.map(String).includes(String(c.id))) return true;
  if(metadata?.spaces==='all') return Array.isArray(c.spaces)&&c.spaces.length>0;
  if(Array.isArray(metadata?.spaces)){
    const own=new Set((c.spaces||[]).map(String));
    if(metadata.spaces.map(String).some(x=>own.has(x))) return true;
  }
  return false;
}

function evaluateMathCandidate(c,evidence,options={}){
  const metadata=evidence.metadata || {};
  if(!targetsCandidate(metadata,c)) return {kind:'untested'};
  const match=matchCompiledSubgraph(c.graph,evidence.graph,options);
  if(match) return {kind:'support',match};
  if(metadata.positive_only===true) return {kind:'unresolved',reason:'positive-only-contact-nonmatch'};
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
  const material=candidateMaterial(input,c.composition,options);
  const graph=material.graph;
  const collision=L.signature_index[graph.signature];
  if(collision && collision!==c.id) throw new Error(`revision converges with existing hypothesis ${collision}; explicit merge required`);
  delete L.signature_index[c.signature];
  const before=c.signature;
  c.graph=graph; c.signature=graph.signature;
  c.expressions=material.expressions; c.composition=material.composition;
  c.revision++;
  L.signature_index[c.signature]=c.id;
  recomputeMathCandidate(L,c,options);
  L.audit.push({
    step:++L.step,kind:'revised',id:c.id,from:before,to:c.signature,
    revision:c.revision,note,status:c.status,composition_ready:Boolean(c.expressions&&c.composition)
  });
  return c;
}

function currentMathHypothesis(L,id,requirements={}){
  assertLedger(L);
  const c=L.candidates[String(id)];
  if(!c) throw new Error(`unknown math hypothesis ${String(id)}`);
  if(requirements.usable && !c.usable) throw new Error(`math hypothesis ${c.id} is not currently usable (${c.status})`);
  if(requirements.expressions && !c.expressions) throw new Error(`math hypothesis ${c.id} has no current source expressions`);
  if(requirements.composition && !c.composition) throw new Error(`math hypothesis ${c.id} has no current compositional interface`);
  return {
    id:c.id,revision:c.revision,status:c.status,usable:c.usable,
    graph:c.graph,signature:c.signature,
    expressions:c.expressions?c.expressions.map(cloneExpr):null,
    composition:cloneComposition(c.composition),
    spaces:(c.spaces||[]).slice()
  };
}

function ensureMathSpace(L,id){
  assertLedger(L); id=String(id);
  if(!L.spaces[id]){
    L.spaces[id]={id,candidates:[],created_step:++L.step};
    L.audit.push({step:L.step,kind:'space-created',space:id});
  }
  return L.spaces[id];
}

function addMathAlternative(L,spaceId,candidateId,options={}){
  const s=ensureMathSpace(L,spaceId);
  const c=L.candidates[String(candidateId)];
  if(!c) throw new Error(`unknown math hypothesis ${String(candidateId)}`);
  if(!s.candidates.includes(c.id)){
    s.candidates.push(c.id);
    if(!Array.isArray(c.spaces))c.spaces=[];
    if(!c.spaces.includes(s.id))c.spaces.push(s.id);
    recomputeMathCandidate(L,c,options);
    L.audit.push({step:++L.step,kind:'space-alternative-added',space:s.id,id:c.id});
  }
  return c;
}

function proposeMathAlternative(L,spaceId,proposal,options={}){
  const c=proposeMath(L,proposal,options);
  addMathAlternative(L,spaceId,c.id,options);
  return c;
}

function spaceEvidence(L,spaceId){
  assertLedger(L); spaceId=String(spaceId);
  return L.evidence.filter(e=>Array.isArray(e.metadata?.spaces)&&e.metadata.spaces.map(String).includes(spaceId));
}

function evaluateMathSpaceAlternative(L,spaceId,candidateId,options={}){
  assertLedger(L);
  const s=L.spaces[String(spaceId)];
  if(!s) throw new Error(`unknown math space ${String(spaceId)}`);
  const c=L.candidates[String(candidateId)];
  if(!c || !s.candidates.includes(c.id)) throw new Error(`math hypothesis ${String(candidateId)} is not in space ${s.id}`);
  const support=[],defeat=[],unresolved=[];
  for(const e of spaceEvidence(L,s.id)){
    const match=matchCompiledSubgraph(c.graph,e.graph,options);
    if(match) support.push({evidence:e.id,match});
    else if(e.metadata?.complete===true) defeat.push({evidence:e.id,reason:'complete-space-counterexample'});
    else unresolved.push({evidence:e.id,reason:'incomplete-space-contact'});
  }
  let status='open';
  if(support.length&&defeat.length)status='contested';
  else if(support.length)status='supported';
  else if(defeat.length)status='defeated';
  return {id:c.id,status,support,defeat,unresolved,globally_usable:c.usable,global_status:c.status};
}

function strictMathSubgraph(a,b,options={}){
  if(a.signature===b.signature)return false;
  return Boolean(matchCompiledSubgraph(a.graph,b.graph,options));
}

function currentMathSpace(L,spaceId,options={}){
  assertLedger(L); spaceId=String(spaceId);
  const s=L.spaces[spaceId];
  if(!s) throw new Error(`unknown math space ${spaceId}`);
  const alternatives=s.candidates.map(id=>evaluateMathSpaceAlternative(L,spaceId,id,options));
  const open=alternatives.filter(a=>a.status==='open' && a.global_status!=='defeated' && a.global_status!=='contested');
  const viable=alternatives.filter(a=>a.status==='supported' && a.globally_usable);
  const suspended=alternatives.filter(a=>a.status==='supported' && !a.globally_usable);
  const eliminated=alternatives.filter(a=>a.status==='defeated'||a.status==='contested'||a.global_status==='defeated'||a.global_status==='contested');

  const maximal=viable.filter(a=>{
    const ca=L.candidates[a.id];
    return !viable.some(b=>b.id!==a.id && strictMathSubgraph(ca,L.candidates[b.id],options));
  });

  let status='unresolved';
  let chosen=null;
  if(open.length)status='unresolved';
  else if(maximal.length===1){status='resolved-candidate-math';chosen=L.candidates[maximal[0].id];}
  else if(maximal.length>1)status='ambiguous';
  else if(suspended.length)status='suspended';
  else if(alternatives.length && eliminated.length===alternatives.length)status='no-live-alternative';

  return {
    whole:1,space:spaceId,status,
    candidate_count:alternatives.length,
    open:open.map(x=>x.id),
    supported:viable.map(x=>x.id),
    suspended:suspended.map(x=>x.id),
    eliminated:eliminated.map(x=>x.id),
    maximal_supported:maximal.map(x=>x.id),
    hypothesis_id:chosen?.id ?? null,
    revision:chosen?.revision ?? null,
    signature:chosen?.signature ?? null,
    math:chosen?.graph ?? null,
    alternatives
  };
}

function sourceAblations(c){
  if(!Array.isArray(c.expressions)||!c.expressions.length)return[];
  const xs=c.expressions.map(cloneExpr);
  const out=[];
  if(xs.length>1){
    for(let i=0;i<xs.length;i++)out.push(xs.filter((_,j)=>j!==i).map(cloneExpr));
    return out;
  }
  const root=xs[0];
  if(root.kind==='app' && root.op===MOP.AND && root.args.length>1){
    for(let i=0;i<root.args.length;i++){
      const args=root.args.filter((_,j)=>j!==i).map(cloneExpr);
      out.push([args.length===1?args[0]:{kind:'app',op:MOP.AND,args}]);
    }
  }
  return out;
}

function proposeRefinement(L,spaceId,parent,expressions,options={}){
  const graph=compileMathGraph(expressions,options);
  const existing=L.signature_index[graph.signature];
  if(existing){
    const c=L.candidates[existing];
    const before=(c.spaces||[]).includes(String(spaceId));
    addMathAlternative(L,spaceId,c.id,options);
    return {candidate:c,created:false,added_to_space:!before};
  }
  const base={
    id:nextCandidateId(L),expressions,
    source:'structural-ablation',confidence:null,
    note:`derived from ${parent.id} by removing one top-level conjunctive source constraint`
  };
  let c;
  if(parent.composition){
    try{c=proposeMath(L,{...base,composition:parent.composition},options);}catch(_){c=proposeMath(L,base,options);}
  }else c=proposeMath(L,base,options);
  addMathAlternative(L,spaceId,c.id,options);
  return {candidate:c,created:true,added_to_space:true};
}

function refineMathSpace(L,spaceId,evidenceId,options={}){
  assertLedger(L); spaceId=String(spaceId); evidenceId=String(evidenceId);
  const s=L.spaces[spaceId];
  if(!s) throw new Error(`unknown math space ${spaceId}`);
  const evidence=L.evidence.find(e=>e.id===evidenceId);
  if(!evidence) throw new Error(`unknown evidence ${evidenceId}`);
  if(!Array.isArray(evidence.metadata?.spaces)||!evidence.metadata.spaces.map(String).includes(spaceId)) throw new Error('refinement evidence does not target this math space');
  if(evidence.metadata?.complete!==true) return {whole:1,space:spaceId,evidence:evidenceId,generated:0,processed:0,truncated:false,reason:'incomplete-space-contact'};

  const maxNewCandidates=options.maxNewCandidates ?? 256;
  const queue=s.candidates.filter(id=>evaluateMathSpaceAlternative(L,spaceId,id,options).defeat.some(d=>d.evidence===evidenceId));
  const processed=new Set();
  let generated=0,created=0,truncated=false;

  while(queue.length){
    const id=queue.shift();
    if(processed.has(id))continue;
    processed.add(id);
    const parent=L.candidates[id];
    if(!parent)continue;
    for(const expressions of sourceAblations(parent)){
      if(generated>=maxNewCandidates){truncated=true;break;}
      const r=proposeRefinement(L,spaceId,parent,expressions,options);
      if(r.candidate.id===parent.id)continue;
      if(r.added_to_space)generated++;
      if(r.created)created++;
      const fit=evaluateMathSpaceAlternative(L,spaceId,r.candidate.id,options);
      if(fit.defeat.some(d=>d.evidence===evidenceId))queue.push(r.candidate.id);
    }
    if(truncated)break;
  }
  L.audit.push({step:++L.step,kind:'space-refined',space:spaceId,evidence:evidenceId,generated,created,processed:processed.size,truncated});
  return {whole:1,space:spaceId,evidence:evidenceId,generated,created,processed:processed.size,truncated};
}

function contactMathSpace(L,spaceId,input,metadata={},options={}){
  assertLedger(L); spaceId=String(spaceId);
  ensureMathSpace(L,spaceId);
  if(Object.prototype.hasOwnProperty.call(metadata,'candidates')) throw new Error('space contact targets the space; do not supply candidate ids');
  const id=String(metadata.id ?? `e${L.evidence.length+1}`);
  const spaces=[...new Set([spaceId,...(Array.isArray(metadata.spaces)?metadata.spaces.map(String):[])])];
  const results=contactMath(L,input,{...metadata,id,spaces,positive_only:true},options);
  const refinement=metadata.complete===true && options.autoRefine!==false
    ? refineMathSpace(L,spaceId,id,options)
    : null;
  return {whole:1,space:spaceId,evidence:id,results,refinement,current:currentMathSpace(L,spaceId,options)};
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
  evaluateMathCandidate,contactMath,reviseMath,currentMathHypothesis,
  usableMathPatterns,pureMathLedger,recomputeMathCandidate,
  normalizeComposition,
  ensureMathSpace,addMathAlternative,proposeMathAlternative,spaceEvidence,
  evaluateMathSpaceAlternative,currentMathSpace,refineMathSpace,contactMathSpace
};
