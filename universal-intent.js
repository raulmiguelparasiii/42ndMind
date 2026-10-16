'use strict';

// Derived Universal-Language intent stabilization and reuse.
//
// This file owns no semantic truth, candidate status, revision, or correction.
// `math-hypotheses.js` remains the sole live authority. This layer reads the
// current live alternative space and asks which complete lower mathematical
// relations are forced by every currently maximal live alternative and are
// themselves warranted by stored contact.
//
// For an opaque meaning-space r, let K_r be its current maximal live candidate
// frontier and let g ⪯ h mean anonymous labelled-graph substructure. A complete
// source-backed relation is currently stabilized when:
//
//   g ⪯ h for every h in K_r,
//   some targeted contact structurally supports g, and
//   no complete targeted contact defeats g.
//
// Stabilized complete relations may then be used as compression/dependency
// handles inside later intent mathematics. A use-site stores only the canonical
// relation signature plus its local mathematical occurrence (needed to preserve
// variable binding). Whether that signature is still a stabilized relation is
// always re-derived from the live field. If it ceases to be stabilized, the
// occurrence safely expands back to raw mathematics and can be refactored under
// the corrected field; no copied local status or definition survives.
//
// The full intent is resolved only when the upstream ledger resolves the space.
// Graph-only maximum-common subgraphs remain provisional discovery structure
// because arbitrary edge-subgraphs can be serialization fragments rather than
// complete mathematical relations.

const {MOP,app,compileMathGraph,validateExpr}=require('./universal-math-graph');
const {canonicalGraph}=require('./relational-normal-form');
const {
  asCompiledMath,matchCompiledSubgraph,currentMathSpace,spaceEvidence
}=require('./math-hypotheses');
const {mathForRelation,spacesForRelation}=require('./english-math-bridge');

function uniq(xs){return[...new Set(xs)];}
function cloneExpr(expr){
  validateExpr(expr);
  if(expr.kind==='var')return{kind:'var',name:String(expr.name)};
  if(expr.kind==='const')return{kind:'const',value:expr.value};
  return{kind:'app',op:Number(expr.op),args:expr.args.map(cloneExpr)};
}

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
      if(!out.has(graph.signature))out.set(graph.signature,{signature:graph.signature,graph,expression:cloneExpr(expr)});
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
    const item=maps[0].get(signature),graph=item.graph;
    const evidence=evidenceVerdict(L,spaceId,graph,options);
    return{
      kind:'complete-constraint',signature,graph,expression:cloneExpr(item.expression),
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
// This is structural-overlap discovery only: an arbitrary edge-subgraph need not
// be a complete mathematical formula, so callers must not promote it to a
// stabilized Universal-Language relation by itself. If a search/canonicalization
// budget is exceeded, no pseudo-answer is returned.
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
    kind:'maximum-common-structural-core',signature:graph.signature,graph,
    frontier_support:f.frontier.slice(),evidence:evidenceVerdict(L,spaceId,graph,options),
    provisional_reason:'graph substructure is not necessarily a complete mathematical relation'
  })):[];

  // Only complete source-backed mathematical constraints can be promoted into
  // the categorical stabilized relation field. Graph-only common structure is
  // still exposed as a discovery invariant, but remains provisional even when
  // contact happens to contain the same graph fragment.
  const stabilized=dedupeRelations(constraints.filter(r=>r.evidence?.warranted));
  const stabilizedSignatures=new Set(stabilized.map(r=>r.signature));
  const provisional=dedupeRelations([
    ...constraints.filter(r=>!r.evidence?.warranted),
    ...coreRelations
  ]).filter(r=>!stabilizedSignatures.has(r.signature));

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
      if(!by.has(r.signature))by.set(r.signature,{signature:r.signature,graph:r.graph,expression:r.expression?cloneExpr(r.expression):null,spaces:[],kinds:new Set()});
      const x=by.get(r.signature);x.spaces.push(s.space);x.kinds.add(r.kind);
    }
  }
  const relations=[...by.values()].map(x=>({
    signature:x.signature,graph:x.graph,expression:x.expression?cloneExpr(x.expression):null,spaces:uniq(x.spaces).sort(),
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

// ---------- Live reuse of stabilized relations inside later intent mathematics ----------

function factorAssertionNode(expr,live,options={}){
  validateExpr(expr);
  // Top-level conjunction is assertion structure, so each child may independently
  // reuse a stabilized complete relation. Other nested operators are left intact;
  // a subformula is not silently promoted to a top-level asserted relation.
  if(expr.kind==='app'&&expr.op===MOP.AND){
    return{kind:'and',children:expr.args.map(x=>factorAssertionNode(x,live,options))};
  }
  const occurrence=cloneExpr(expr),signature=compileMathGraph([occurrence],options).signature;
  if(live.has(signature))return{kind:'relation-use',signature,occurrence};
  return{kind:'raw',expression:occurrence};
}

function factorNodeCounts(node,out={relation_uses:0,raw_constraints:0}){
  if(node.kind==='relation-use')out.relation_uses++;
  else if(node.kind==='raw')out.raw_constraints++;
  else if(node.kind==='and')node.children.forEach(x=>factorNodeCounts(x,out));
  return out;
}
function relationRefsInNode(node,out=[]){
  if(node.kind==='relation-use')out.push(node.signature);
  else if(node.kind==='and')node.children.forEach(x=>relationRefsInNode(x,out));
  return out;
}

function factorIntentExpressions(L,expressions,options={}){
  if(!Array.isArray(expressions))throw new Error('intent factorization requires an expression array');
  expressions.forEach(validateExpr);
  const field=universalRelationField(L,options);
  const live=new Map(field.relations.map(r=>[r.signature,r]));
  const roots=expressions.map(x=>factorAssertionNode(x,live,options));
  const counts=roots.reduce((out,x)=>factorNodeCounts(x,out),{relation_uses:0,raw_constraints:0});
  const relation_signatures=uniq(roots.flatMap(x=>relationRefsInNode(x,[]))).sort();
  return{
    whole:1,kind:'factored-intent',
    source_signature:compileMathGraph(expressions,options).signature,
    roots,relation_signatures,
    relation_uses:counts.relation_uses,raw_constraints:counts.raw_constraints
  };
}

// Expansion is representational decompression only. It does not assert that a
// referenced relation remains stabilized. This is what lets a higher intent
// survive correction of a lower reusable relation: its use-site mathematics is
// retained and can become raw structure again on the next refactor.
function expandFactorNode(node){
  if(!node||typeof node!=='object')throw new Error('invalid factored intent node');
  if(node.kind==='relation-use'){
    if(typeof node.signature!=='string'||!node.signature.length)throw new Error('relation-use requires a signature');
    return cloneExpr(node.occurrence);
  }
  if(node.kind==='raw')return cloneExpr(node.expression);
  if(node.kind==='and'){
    if(!Array.isArray(node.children)||!node.children.length)throw new Error('factored AND requires children');
    return app(MOP.AND,...node.children.map(expandFactorNode));
  }
  throw new Error(`unknown factored intent node ${String(node.kind)}`);
}
function expandFactoredIntent(factored,options={}){
  if(!factored||factored.whole!==1||factored.kind!=='factored-intent'||!Array.isArray(factored.roots))throw new Error('invalid factored intent');
  const expressions=factored.roots.map(expandFactorNode);
  const graph=compileMathGraph(expressions,options);
  if(factored.source_signature&&graph.signature!==factored.source_signature)throw new Error('factored intent no longer reconstructs its source mathematics');
  return{whole:1,expressions,graph,signature:graph.signature};
}

// This is a live validity view, not stored status. A dependency is current only
// if the same canonical complete relation is still in the derived Universal
// relation field and the local occurrence still instantiates that signature.
function inspectFactoredIntent(L,factored,options={}){
  const expanded=expandFactoredIntent(factored,options);
  const field=universalRelationField(L,options);
  const live=new Set(field.relations.map(r=>r.signature));
  const refs=[];
  const walk=node=>{
    if(node.kind==='relation-use'){
      const occurrenceSignature=compileMathGraph([node.occurrence],options).signature;
      refs.push({signature:node.signature,occurrence_matches:occurrenceSignature===node.signature,live:live.has(node.signature)});
    }else if(node.kind==='and')node.children.forEach(walk);
  };
  factored.roots.forEach(walk);
  const stale=refs.filter(r=>!r.live||!r.occurrence_matches);
  return{
    whole:1,signature:expanded.signature,
    relation_uses:refs.length,live_relation_uses:refs.length-stale.length,
    stale_dependencies:stale,
    factoring_current:stale.length===0,
    graph:expanded.graph
  };
}

function refreshIntentFactorization(L,factored,options={}){
  const expanded=expandFactoredIntent(factored,options);
  return factorIntentExpressions(L,expanded.expressions,options);
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
      provisional_relation_signatures:s.provisional_invariants.map(r=>r.signature),
      common_core:s.common_core,
      structural_common_edge_ratio:s.structural_common_edge_ratio
    }))
  };
}

module.exports={
  frontierMathSpace,candidateConstraintGraphs,evidenceVerdict,
  maximumCommonSubgraphs,stabilizedIntent,universalRelationField,
  factorIntentExpressions,expandFactoredIntent,inspectFactoredIntent,refreshIntentFactorization,
  stabilizedMathForRelation
};