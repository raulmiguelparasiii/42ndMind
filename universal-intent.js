'use strict';

// Derived Universal-Language intent stabilization.
//
// This file owns no semantic truth, candidate status, revision, or correction.
// `math-hypotheses.js` remains the sole live authority. This layer reads the
// current live alternative space and asks a narrower mathematical question:
// which anonymous relations are forced by every currently maximal live
// alternative and are themselves warranted by the space's stored contact?
//
// For an opaque meaning-space r, let K_r be its current maximal live candidate
// frontier and let g ⪯ h mean anonymous labelled-graph substructure. A relation
// is currently stabilized when:
//
//   g ⪯ h for every h in K_r,
//   some targeted contact structurally supports g, and
//   no complete targeted contact defeats g.
//
// The full intent is resolved only when the upstream ledger resolves the space.
// Before that, stabilized lower relations can coexist with an explicitly
// unresolved remainder. Across spaces, equal canonical graph signatures are
// the same anonymous structural relation; recurrence therefore exposes candidate
// Universal-Language relations without a semantic family dictionary.

const {MOP,compileMathGraph}=require('./universal-math-graph');
const {canonicalGraph}=require('./relational-normal-form');
const {
  asCompiledMath,matchCompiledSubgraph,currentMathSpace,spaceEvidence
}=require('./math-hypotheses');
const {mathForRelation,spacesForRelation}=require('./english-math-bridge');

function uniq(xs){return[...new Set(xs)];}

// canonicalGraph stores labels in their stable serialized form. When taking an
// edge subset of an already-compiled graph, decode one layer before canonical
// labelling again so labels are not accidentally double-serialized.
function rawLabel(label){
  if(typeof label!=='string')return label;
  try{return JSON.parse(label);}catch{return label;}
}

function canonicalCompiledFromEdges(edges,options={}){
  const raw=edges.map(([label,a,b])=>[rawLabel(label),a,b]);
  const c=canonicalGraph({edges:raw},{maxStates:options.maxCanonicalStates??250000});
  return{
    version:1,vertex_count:c.vertex_count,edges:c.edges,signature:c.signature,
    canonicalization_states:c.states
  };
}

function decodedLabel(label){return rawLabel(label);}
function hasMathematicalOperator(graph){
  return graph.edges.some(([label])=>{
    const x=decodedLabel(label);
    return Array.isArray(x)&&x[0]==='o'&&Number.isInteger(Number(x[1]));
  });
}

function strictSubgraph(a,b,options={}){
  a=asCompiledMath(a,options);b=asCompiledMath(b,options);
  if(a.signature===b.signature)return false;
  return Boolean(matchCompiledSubgraph(a,b,options));
}

function maximalCandidateIds(L,ids,options={}){
  ids=uniq(ids.map(String)).filter(id=>L.candidates?.[id]);
  return ids.filter(id=>{
    const a=L.candidates[id];
    return !ids.some(other=>other!==id&&strictSubgraph(a.graph,L.candidates[other].graph,options));
  }).sort();
}

function frontierMathSpace(L,spaceId,options={}){
  const current=currentMathSpace(L,spaceId,options);
  // Weaker supported refinements do not create a second live whole while a
  // stronger supported alternative survives; use the maximal supported frontier.
  // Open alternatives are retained because unknown != false, then the combined
  // frontier is structurally maximalized once more.
  let ids=uniq([...(current.open||[]),...(current.maximal_supported||[])]);
  if(!ids.length&&current.hypothesis_id)ids=[current.hypothesis_id];
  ids=maximalCandidateIds(L,ids,options);
  return{whole:1,space:String(spaceId),current,frontier:ids};
}

function flattenTopConjuncts(expr,out=[]){
  if(expr&&expr.kind==='app'&&expr.op===MOP.AND){
    for(const a of expr.args)flattenTopConjuncts(a,out);
  }else out.push(expr);
  return out;
}

function candidateConstraintGraphs(candidate,options={}){
  if(!Array.isArray(candidate?.expressions))return[];
  const out=new Map();
  for(const top of candidate.expressions){
    for(const expr of flattenTopConjuncts(top,[])){
      const graph=compileMathGraph([expr],options);
      if(!out.has(graph.signature))out.set(graph.signature,{signature:graph.signature,graph});
    }
  }
  return[...out.values()];
}

function evidenceVerdict(L,spaceId,graph,options={}){
  const support=[],defeat=[],unresolved=[];
  for(const e of spaceEvidence(L,spaceId)){
    const match=matchCompiledSubgraph(graph,e.graph,options);
    if(match)support.push({evidence:e.id,match});
    else if(e.metadata?.complete===true)defeat.push({evidence:e.id,reason:'complete-space-counterexample'});
    else unresolved.push({evidence:e.id,reason:'incomplete-space-contact'});
  }
  let status='open';
  if(support.length&&defeat.length)status='contested';
  else if(support.length)status='supported';
  else if(defeat.length)status='defeated';
  return{status,support,defeat,unresolved,warranted:status==='supported'};
}

function sharedConstraintRelations(L,spaceId,frontier,options={}){
  if(!frontier.length)return[];
  const per=frontier.map(id=>candidateConstraintGraphs(L.candidates[id],options));
  if(per.some(xs=>!xs.length))return[];
  const maps=per.map(xs=>new Map(xs.map(x=>[x.signature,x])));
  const shared=[...maps[0].keys()].filter(sig=>maps.every(m=>m.has(sig))).sort();
  return shared.map(signature=>{
    const graph=maps[0].get(signature).graph;
    const evidence=evidenceVerdict(L,spaceId,graph,options);
    return{
      kind:'complete-constraint',signature,graph,
      frontier_support:frontier.slice(),evidence
    };
  });
}

function commonToAll(pattern,graphs,options={}){
  for(const graph of graphs){
    if(!matchCompiledSubgraph(pattern,graph,options))return false;
  }
  return true;
}

// Exact within a bounded search budget: breadth-first edge deletion starts at
// the smallest current frontier graph. The first common level therefore has the
// maximum number of relational edges among all edge-subgraphs of that graph.
// If a search/canonicalization budget is exceeded, no pseudo-answer is returned.
function maximumCommonSubgraphs(graphInputs,options={}){
  const graphs=graphInputs.map(x=>asCompiledMath(x,options));
  if(!graphs.length)return{complete:true,reason:'no-frontier',edge_count:0,cores:[],states:0};
  const base=graphs.slice().sort((a,b)=>a.edges.length-b.edges.length||a.signature.localeCompare(b.signature))[0];
  const maxStates=options.maxCoreStates??20000;
  const maxCores=options.maxCores??64;
  let states=0;
  let level=new Map([[base.signature,base]]);
  const seen=new Set([base.signature]);

  while(level.size){
    const common=[];
    for(const pattern of level.values()){
      states++;
      if(states>maxStates)return{complete:false,reason:'core-search-state-limit',edge_count:null,cores:[],states};
      try{
        if(pattern.edges.length&&hasMathematicalOperator(pattern)&&commonToAll(pattern,graphs,options))common.push(pattern);
      }catch(error){
        return{complete:false,reason:'subgraph-match-limit',error:String(error.message||error),edge_count:null,cores:[],states};
      }
    }
    if(common.length){
      const unique=new Map(common.map(g=>[g.signature,g]));
      if(unique.size>maxCores)return{complete:false,reason:'too-many-maximal-cores',edge_count:null,cores:[],states};
      const cores=[...unique.values()].sort((a,b)=>a.signature.localeCompare(b.signature));
      return{complete:true,reason:'maximum-common-subgraph',edge_count:cores[0].edges.length,cores,states};
    }

    const next=new Map();
    try{
      for(const pattern of level.values()){
        if(pattern.edges.length<=1)continue;
        for(let i=0;i<pattern.edges.length;i++){
          const edges=pattern.edges.filter((_,j)=>j!==i);
          const child=canonicalCompiledFromEdges(edges,options);
          if(seen.has(child.signature))continue;
          seen.add(child.signature);next.set(child.signature,child);
          if(seen.size>maxStates)return{complete:false,reason:'core-search-state-limit',edge_count:null,cores:[],states:seen.size};
        }
      }
    }catch(error){
      return{complete:false,reason:'canonicalization-limit',error:String(error.message||error),edge_count:null,cores:[],states};
    }
    level=next;
  }
  return{complete:true,reason:'no-meaningful-common-subgraph',edge_count:0,cores:[],states};
}

function dedupeRelations(relations){
  const by=new Map();
  for(const r of relations){
    const old=by.get(r.signature);
    if(!old){by.set(r.signature,r);continue;}
    const kinds=uniq([...(old.kinds||[old.kind]),...(r.kinds||[r.kind])]).filter(Boolean).sort();
    by.set(r.signature,{...old,kinds});
  }
  return[...by.values()].sort((a,b)=>a.signature.localeCompare(b.signature));
}

function stabilizedIntent(L,spaceId,options={}){
  const f=frontierMathSpace(L,spaceId,options);
  const graphs=f.frontier.map(id=>L.candidates[id].graph);
  const constraints=sharedConstraintRelations(L,spaceId,f.frontier,options);
  const core=maximumCommonSubgraphs(graphs,options);
  const coreRelations=core.complete?core.cores.map(graph=>({
    kind:'maximum-common-relational-core',signature:graph.signature,graph,
    frontier_support:f.frontier.slice(),evidence:evidenceVerdict(L,spaceId,graph,options)
  })):[];
  const invariants=dedupeRelations([...constraints,...coreRelations]);
  const stabilized=invariants.filter(r=>r.evidence?.warranted);
  const provisional=invariants.filter(r=>!r.evidence?.warranted);
  const maxEdges=graphs.reduce((n,g)=>Math.max(n,g.edges.length),0);
  const structuralCommonEdgeRatio=core.complete&&core.edge_count!==null&&maxEdges
    ? core.edge_count/maxEdges
    : (graphs.length?null:0);
  return{
    whole:1,
    space:String(spaceId),
    status:f.current.status,
    resolved_hypothesis:f.current.hypothesis_id,
    frontier:f.frontier,
    frontier_count:f.frontier.length,
    stabilized_relations:stabilized,
    provisional_invariants:provisional,
    common_core:{
      search_complete:core.complete,reason:core.reason,states:core.states,
      edge_count:core.edge_count,signatures:core.cores.map(g=>g.signature)
    },
    structural_common_edge_ratio:structuralCommonEdgeRatio,
    unresolved:f.current.status!=='resolved-candidate-math'
  };
}

function universalRelationField(L,options={}){
  const spaces=Object.keys(L.spaces||{}).sort().map(id=>stabilizedIntent(L,id,options));
  const by=new Map();
  for(const s of spaces){
    for(const r of s.stabilized_relations){
      if(!by.has(r.signature))by.set(r.signature,{signature:r.signature,graph:r.graph,spaces:[],kinds:new Set()});
      const x=by.get(r.signature);x.spaces.push(s.space);x.kinds.add(r.kind);
    }
  }
  const relations=[...by.values()].map(x=>({
    signature:x.signature,graph:x.graph,spaces:uniq(x.spaces).sort(),
    occurrence_count:uniq(x.spaces).length,kinds:[...x.kinds].sort()
  })).sort((a,b)=>b.occurrence_count-a.occurrence_count||a.signature.localeCompare(b.signature));
  const ratios=spaces.map(s=>s.structural_common_edge_ratio).filter(x=>Number.isFinite(x));
  return{
    whole:1,
    spaces,
    relations,
    recurrent_relations:relations.filter(r=>r.occurrence_count>1),
    metrics:{
      spaces:spaces.length,
      resolved_spaces:spaces.filter(s=>s.status==='resolved-candidate-math').length,
      spaces_with_warranted_relations:spaces.filter(s=>s.stabilized_relations.length).length,
      stabilized_relation_structures:relations.length,
      recurrent_relation_structures:relations.filter(r=>r.occurrence_count>1).length,
      mean_current_structural_common_edge_ratio:ratios.length?ratios.reduce((a,b)=>a+b,0)/ratios.length:null
    }
  };
}

// Surface-language readout over the same live attachment. The existing bridge
// can remain unresolved while this view exposes only the warranted lower
// mathematics common to every current live interpretation. No binding, graph,
// or status is copied into a second authority.
function stabilizedMathForRelation(B,U,L,relation,options={}){
  const base=mathForRelation(B,U,L,relation);
  const spaceViews=spacesForRelation(B,U,L,relation).map(s=>stabilizedIntent(L,s.space,options));
  const stable=dedupeRelations(spaceViews.flatMap(s=>s.stabilized_relations));
  let status=base.status;
  if(status!=='resolved-candidate-math'&&stable.length)status='partially-stabilized-math';
  return{
    ...base,status,
    stabilized_relations:stable,
    stabilized_spaces:spaceViews.map(s=>({
      space:s.space,status:s.status,frontier:s.frontier,
      stabilized_relation_signatures:s.stabilized_relations.map(r=>r.signature),
      common_core:s.common_core,
      structural_common_edge_ratio:s.structural_common_edge_ratio
    }))
  };
}

module.exports={
  frontierMathSpace,candidateConstraintGraphs,evidenceVerdict,
  maximumCommonSubgraphs,stabilizedIntent,universalRelationField,
  stabilizedMathForRelation
};