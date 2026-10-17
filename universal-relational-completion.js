'use strict';

// Generic relational completion over the live Universal-Language field.
//
// This is a connection, not a new semantic or correction authority. It stores
// no memory, attention, focus, truth, status, or revision state. Instead it
// exposes three consequences of the existing one-ledger architecture:
//
// 1. new mathematical candidates can be proposed directly through already-live
//    stabilized relation uses plus explicit raw/unresolved remainder;
// 2. a partial mathematical cue can reopen larger live structures and matching
//    historical contact from the same ledger, without a separate memory store;
// 3. graph-only common cores may guide a proposer toward a complete source-backed
//    constraint, but remain provisional and are never promoted automatically.
//
// `math-hypotheses.js` remains the sole live candidate/evidence/status authority.

const {MOP,compileMathGraph,validateExpr}=require('./universal-math-graph');
const {
  asCompiledMath,matchCompiledSubgraph,proposeMathAlternative,currentMathHypothesis
}=require('./math-hypotheses');
const {
  reusableRelationField,factorIntentExpressions,expandFactoredIntent,inspectFactoredIntent
}=require('./universal-relation-reuse');
const {universalRelationField}=require('./universal-intent');

function cloneExpr(expr){
  validateExpr(expr);
  if(expr.kind==='var')return{kind:'var',name:String(expr.name)};
  if(expr.kind==='const')return{kind:'const',value:expr.value};
  return{kind:'app',op:Number(expr.op),args:expr.args.map(cloneExpr)};
}

function uniq(xs){return[...new Set(xs)];}

function liveRelationMap(L,options={}){
  return new Map(reusableRelationField(L,options).relations.map(r=>[r.signature,r]));
}

function relationUse(L,occurrence,options={}){
  const expression=cloneExpr(occurrence);
  const signature=compileMathGraph([expression],options).signature;
  if(!liveRelationMap(L,options).has(signature)){
    throw new Error(`relation ${signature} is not currently stabilized`);
  }
  return{kind:'relation-use',signature,occurrence:expression};
}

function rawConstraint(expression){
  return{kind:'raw',expression:cloneExpr(expression)};
}

function andNode(...children){
  if(children.length===1&&Array.isArray(children[0]))children=children[0];
  if(!children.length)throw new Error('factored AND requires children');
  return{kind:'and',children};
}

function normalizeNode(node,live,options={}){
  if(!node||typeof node!=='object')throw new Error('invalid relation-guided node');
  if(node.kind==='relation-use'){
    const occurrence=cloneExpr(node.occurrence);
    const occurrenceSignature=compileMathGraph([occurrence],options).signature;
    if(typeof node.signature!=='string'||!node.signature.length)throw new Error('relation-use requires a signature');
    if(occurrenceSignature!==node.signature)throw new Error('relation-use occurrence does not match its canonical signature');
    if(!live.has(node.signature))throw new Error(`relation ${node.signature} is not currently stabilized`);
    return{kind:'relation-use',signature:node.signature,occurrence};
  }
  if(node.kind==='raw')return{kind:'raw',expression:cloneExpr(node.expression)};
  if(node.kind==='and'){
    if(!Array.isArray(node.children)||!node.children.length)throw new Error('factored AND requires children');
    return{kind:'and',children:node.children.map(x=>normalizeNode(x,live,options))};
  }
  throw new Error(`unknown relation-guided node ${String(node.kind)}`);
}

function summarizeNodes(roots){
  const relationSignatures=[];
  let relationUses=0,rawConstraints=0;
  const walk=node=>{
    if(node.kind==='relation-use'){
      relationUses++;relationSignatures.push(node.signature);
    }else if(node.kind==='raw')rawConstraints++;
    else if(node.kind==='and')node.children.forEach(walk);
  };
  roots.forEach(walk);
  return{
    relation_uses:relationUses,
    raw_constraints:rawConstraints,
    relation_signatures:uniq(relationSignatures).sort()
  };
}

// Build the existing factored-intent representation directly from live relation
// uses. The representation is still only compression: expansion reconstructs the
// exact mathematical expressions, and no dependency status is stored here.
function buildFactoredIntent(L,roots,options={}){
  if(!Array.isArray(roots)||!roots.length)throw new Error('relation-guided intent requires roots');
  const live=liveRelationMap(L,options);
  const normalized=roots.map(x=>normalizeNode(x,live,options));
  const draft={whole:1,kind:'factored-intent',roots:normalized};
  const expanded=expandFactoredIntent(draft,options);
  const counts=summarizeNodes(normalized);
  const factored={
    ...draft,
    source_signature:expanded.signature,
    relation_signatures:counts.relation_signatures,
    relation_uses:counts.relation_uses,
    raw_constraints:counts.raw_constraints
  };
  const view=inspectFactoredIntent(L,factored,options);
  if(!view.factoring_current)throw new Error('relation-guided intent contains a stale relation dependency');
  return factored;
}

function flattenTopConjuncts(expr,out=[]){
  validateExpr(expr);
  if(expr.kind==='app'&&expr.op===MOP.AND){
    for(const a of expr.args)flattenTopConjuncts(a,out);
  }else out.push(expr);
  return out;
}

// A provisional graph core is allowed to point at a complete source-backed
// constraint that contains it. The complete constraint is returned as a proposal
// target only. Nothing here adds it to the stabilized field or marks it true.
function provisionalCompletionSuggestions(L,expressions,options={}){
  if(!Array.isArray(expressions))throw new Error('provisional guidance requires expressions');
  expressions.forEach(validateExpr);
  const complete=[];
  for(const top of expressions){
    for(const expr of flattenTopConjuncts(top,[])){
      const graph=compileMathGraph([expr],options);
      complete.push({expression:cloneExpr(expr),graph,signature:graph.signature});
    }
  }
  const field=universalRelationField(L,options);
  const out=[];
  const seen=new Set();
  for(const s of field.spaces){
    for(const provisional of s.provisional_invariants||[]){
      if(provisional.kind!=='maximum-common-structural-core')continue;
      for(const c of complete){
        if(!matchCompiledSubgraph(provisional.graph,c.graph,options))continue;
        const key=`${s.space}|${provisional.signature}|${c.signature}`;
        if(seen.has(key))continue;seen.add(key);
        out.push({
          space:s.space,
          provisional_signature:provisional.signature,
          complete_constraint_signature:c.signature,
          complete_expression:c.expression,
          status:'proposal-only'
        });
      }
    }
  }
  return out.sort((a,b)=>a.space.localeCompare(b.space)||a.provisional_signature.localeCompare(b.provisional_signature)||a.complete_constraint_signature.localeCompare(b.complete_constraint_signature));
}

function preparedProposalObject(proposal,expressions){
  const out={expressions:expressions.map(cloneExpr)};
  for(const key of ['id','source','confidence','note','composition']){
    if(Object.prototype.hasOwnProperty.call(proposal,key))out[key]=proposal[key];
  }
  if(!Object.prototype.hasOwnProperty.call(out,'source'))out.source='relation-guided-proposer';
  return out;
}

// Existing complete expressions can be factored automatically, or a proposer can
// submit an already-factored structure built directly from stabilized relation
// uses. Either route expands to ordinary source mathematics before entering the
// one authoritative hypothesis ledger.
function prepareRelationGuidedProposal(L,proposal,options={}){
  if(!proposal||typeof proposal!=='object')throw new Error('relation-guided proposal must be an object');
  let factored,expanded;
  if(proposal.factored){
    factored=buildFactoredIntent(L,proposal.factored.roots,options);
    expanded=expandFactoredIntent(factored,options);
  }else if(Array.isArray(proposal.expressions)){
    proposal.expressions.forEach(validateExpr);
    factored=factorIntentExpressions(L,proposal.expressions,options);
    expanded=expandFactoredIntent(factored,options);
  }else throw new Error('relation-guided proposal requires expressions or factored roots');

  const guidance=options.provisionalGuidance===true
    ? provisionalCompletionSuggestions(L,expanded.expressions,options)
    : [];
  return{
    whole:1,
    proposal:preparedProposalObject(proposal,expanded.expressions),
    factored,
    source_signature:expanded.signature,
    relation_uses:factored.relation_uses,
    raw_constraints:factored.raw_constraints,
    relation_signatures:factored.relation_signatures.slice(),
    provisional_suggestions:guidance
  };
}

function proposeRelationGuidedAlternative(L,spaceId,proposal,options={}){
  const prepared=prepareRelationGuidedProposal(L,proposal,options);
  const candidate=proposeMathAlternative(L,spaceId,prepared.proposal,options);
  return{
    whole:1,
    space:String(spaceId),
    hypothesis_id:candidate.id,
    source_signature:prepared.source_signature,
    relation_uses:prepared.relation_uses,
    raw_constraints:prepared.raw_constraints,
    relation_signatures:prepared.relation_signatures,
    provisional_suggestions:prepared.provisional_suggestions,
    current:currentMathHypothesis(L,candidate.id)
  };
}

function strictSubgraph(a,b,options={}){
  if(a.signature===b.signature)return false;
  return Boolean(matchCompiledSubgraph(a.graph,b.graph,options));
}

function maximalCompletions(items,options={}){
  return items.filter(a=>!items.some(b=>a.id!==b.id&&strictSubgraph(a,b,options)));
}

function classifyAgainstCue(cue,graph,options={}){
  if(cue.signature===graph.signature)return'exact';
  if(matchCompiledSubgraph(cue,graph,options))return'cue-contained-in-structure';
  if(matchCompiledSubgraph(graph,cue,options))return'structure-contained-in-cue';
  return null;
}

// Query-relative access to the same relational field. A cue does not copy or
// activate semantic memory state; it simply asks which current live structures
// and which retained evidence contacts stand in a structural relation to it.
function queryRelationalField(L,cueInput,options={}){
  const cue=asCompiledMath(cueInput,options);
  const stable=reusableRelationField(L,options).relations;
  const stabilized_relations=[];
  for(const r of stable){
    const relation=classifyAgainstCue(cue,r.graph,options);
    if(relation)stabilized_relations.push({signature:r.signature,relation,spaces:r.spaces.slice(),occurrence_count:r.occurrence_count});
  }

  const live=[];
  for(const c of Object.values(L.candidates||{})){
    if(!c.usable)continue;
    const relation=classifyAgainstCue(cue,c.graph,options);
    if(relation==='exact'||relation==='cue-contained-in-structure'){
      live.push({id:c.id,signature:c.signature,graph:c.graph,relation,revision:c.revision});
    }
  }
  const maximal=maximalCompletions(live,options).map(x=>({id:x.id,signature:x.signature,relation:x.relation,revision:x.revision}));

  const historical_contacts=[];
  for(const e of L.evidence||[]){
    const relation=classifyAgainstCue(cue,e.graph,options);
    if(relation==='exact'||relation==='cue-contained-in-structure'){
      historical_contacts.push({id:e.id,signature:e.graph.signature,relation,metadata:{...(e.metadata||{})}});
    }
  }

  return{
    whole:1,
    cue:{signature:cue.signature,vertex_count:cue.vertex_count,edge_count:cue.edges.length},
    stabilized_relations,
    live_completions:live.map(x=>({id:x.id,signature:x.signature,relation:x.relation,revision:x.revision})),
    maximal_live_completions:maximal,
    historical_contacts
  };
}

module.exports={
  relationUse,rawConstraint,andNode,buildFactoredIntent,
  provisionalCompletionSuggestions,prepareRelationGuidedProposal,
  proposeRelationGuidedAlternative,queryRelationalField
};
