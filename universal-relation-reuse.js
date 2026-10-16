'use strict';

// Live reuse/compression of already-stabilized Universal-Language relations.
//
// This file owns no semantic truth, relation status, revision, or correction.
// It calls `universal-intent.js` for the current stabilized relation field, which
// itself derives from the one `math-hypotheses.js` authority. A relation-use is
// therefore only a live compression handle over mathematics that is currently
// warranted as a complete stabilized relation.
//
// The local occurrence is retained because a relation such as R(x,y) must bind
// to the higher intent's actual variables. It is a use-site instantiation, not a
// copied relation definition. If the canonical relation signature ceases to be
// stabilized, the occurrence expands back to raw mathematics and can be
// refactored under the corrected live field.

const {MOP,app,compileMathGraph,validateExpr}=require('./universal-math-graph');
const {universalRelationField}=require('./universal-intent');

function uniq(xs){return[...new Set(xs)];}
function cloneExpr(expr){
  validateExpr(expr);
  if(expr.kind==='var')return{kind:'var',name:String(expr.name)};
  if(expr.kind==='const')return{kind:'const',value:expr.value};
  return{kind:'app',op:Number(expr.op),args:expr.args.map(cloneExpr)};
}

// Reuse needs only categorical complete relations, not the expensive provisional
// maximum-common graph diagnostic. The underlying stabilizer computes complete
// constraints before that diagnostic, so a one-state core budget preserves the
// same stabilized relation set while explicitly leaving provisional-core search
// incomplete whenever it would require further work.
function reusableRelationField(L,options={}){
  return universalRelationField(L,{...options,maxCoreStates:1,maxCores:1});
}

function factorAssertionNode(expr,live,options={}){
  validateExpr(expr);
  // Top-level conjunction is assertion structure, so each conjunct may reuse a
  // complete stabilized relation. Other nested operators remain intact; their
  // subformulae are not silently promoted to asserted relations.
  if(expr.kind==='app'&&expr.op===MOP.AND){
    return{kind:'and',children:expr.args.map(x=>factorAssertionNode(x,live,options))};
  }
  const occurrence=cloneExpr(expr),signature=compileMathGraph([occurrence],options).signature;
  if(live.has(signature))return{kind:'relation-use',signature,occurrence};
  return{kind:'raw',expression:occurrence};
}

function counts(node,out={relation_uses:0,raw_constraints:0}){
  if(node.kind==='relation-use')out.relation_uses++;
  else if(node.kind==='raw')out.raw_constraints++;
  else if(node.kind==='and')node.children.forEach(x=>counts(x,out));
  return out;
}
function refs(node,out=[]){
  if(node.kind==='relation-use')out.push(node.signature);
  else if(node.kind==='and')node.children.forEach(x=>refs(x,out));
  return out;
}

function factorIntentExpressions(L,expressions,options={}){
  if(!Array.isArray(expressions))throw new Error('intent factorization requires an expression array');
  expressions.forEach(validateExpr);
  const field=reusableRelationField(L,options);
  const live=new Set(field.relations.map(r=>r.signature));
  const roots=expressions.map(x=>factorAssertionNode(x,live,options));
  const c=roots.reduce((out,x)=>counts(x,out),{relation_uses:0,raw_constraints:0});
  return{
    whole:1,kind:'factored-intent',
    source_signature:compileMathGraph(expressions,options).signature,
    roots,
    relation_signatures:uniq(roots.flatMap(x=>refs(x,[]))).sort(),
    relation_uses:c.relation_uses,
    raw_constraints:c.raw_constraints
  };
}

// Expansion is representational decompression only. It deliberately does not
// claim that a referenced relation remains stabilized. This lets a higher intent
// survive lower-relation correction without preserving stale semantic authority.
function expandNode(node){
  if(!node||typeof node!=='object')throw new Error('invalid factored intent node');
  if(node.kind==='relation-use'){
    if(typeof node.signature!=='string'||!node.signature.length)throw new Error('relation-use requires a signature');
    return cloneExpr(node.occurrence);
  }
  if(node.kind==='raw')return cloneExpr(node.expression);
  if(node.kind==='and'){
    if(!Array.isArray(node.children)||!node.children.length)throw new Error('factored AND requires children');
    return app(MOP.AND,...node.children.map(expandNode));
  }
  throw new Error(`unknown factored intent node ${String(node.kind)}`);
}

function expandFactoredIntent(factored,options={}){
  if(!factored||factored.whole!==1||factored.kind!=='factored-intent'||!Array.isArray(factored.roots))throw new Error('invalid factored intent');
  const expressions=factored.roots.map(expandNode);
  const graph=compileMathGraph(expressions,options);
  if(factored.source_signature&&graph.signature!==factored.source_signature)throw new Error('factored intent no longer reconstructs its source mathematics');
  return{whole:1,expressions,graph,signature:graph.signature};
}

// Derived current validity only. No status is stored on the factorization.
function inspectFactoredIntent(L,factored,options={}){
  const expanded=expandFactoredIntent(factored,options);
  const field=reusableRelationField(L,options);
  const live=new Set(field.relations.map(r=>r.signature));
  const relationUses=[];
  const walk=node=>{
    if(node.kind==='relation-use'){
      const occurrenceSignature=compileMathGraph([node.occurrence],options).signature;
      relationUses.push({
        signature:node.signature,
        occurrence_matches:occurrenceSignature===node.signature,
        live:live.has(node.signature)
      });
    }else if(node.kind==='and')node.children.forEach(walk);
  };
  factored.roots.forEach(walk);
  const stale=relationUses.filter(r=>!r.live||!r.occurrence_matches);
  return{
    whole:1,signature:expanded.signature,graph:expanded.graph,
    relation_uses:relationUses.length,
    live_relation_uses:relationUses.length-stale.length,
    stale_dependencies:stale,
    factoring_current:stale.length===0
  };
}

function refreshIntentFactorization(L,factored,options={}){
  const expanded=expandFactoredIntent(factored,options);
  return factorIntentExpressions(L,expanded.expressions,options);
}

module.exports={
  reusableRelationField,
  factorIntentExpressions,expandFactoredIntent,inspectFactoredIntent,refreshIntentFactorization
};