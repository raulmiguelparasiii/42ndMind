'use strict';

// Read-only abstraction over retained mathematical contact.
//
// This derives only COMPLETE source-backed top-level relations that recur across
// every currently selected historical occurrence. It creates no semantic store,
// truth/status authority, forgetting rule, or graph-fragment promotion.
//
// Why source boundaries matter: a maximum common graph fragment can cut through
// serialization and therefore is not automatically a mathematical relation.
// Here an occurrence contributes only whole asserted source constraints retained
// with the original contact. If any selected occurrence lacks complete source
// boundaries, categorical cross-occurrence abstraction stays unresolved.

const {MOP,compileMathGraph,validateExpr}=require('./universal-math-graph');
const {queryRelationalField}=require('./universal-relational-completion');

function cloneExpr(expr){
  validateExpr(expr);
  if(expr.kind==='var')return{kind:'var',name:String(expr.name)};
  if(expr.kind==='const')return{kind:'const',value:expr.value};
  return{kind:'app',op:Number(expr.op),args:expr.args.map(cloneExpr)};
}

function flattenTop(expr,out=[]){
  validateExpr(expr);
  if(expr.kind==='app'&&expr.op===MOP.AND){
    for(const a of expr.args)flattenTop(a,out);
  }else out.push(expr);
  return out;
}

function evidenceById(L,id){return (L.evidence||[]).find(e=>String(e.id)===String(id))||null;}

function constraintMapFromExpressions(expressions,options={}){
  if(!Array.isArray(expressions))return null;
  const map=new Map();
  for(const top of expressions){
    for(const expr of flattenTop(top,[])){
      const graph=compileMathGraph([expr],options);
      if(!map.has(graph.signature))map.set(graph.signature,{signature:graph.signature,graph,expression:cloneExpr(expr)});
    }
  }
  return map;
}

function completeConstraintMap(evidence,options={}){
  const xs=evidence?.metadata?.source_expressions;
  if(evidence?.metadata?.complete!==true||!Array.isArray(xs))return null;
  return constraintMapFromExpressions(xs,options);
}

function abstractHistoricalContacts(L,historicalContacts,options={}){
  if(!L||L.whole!==1||!Array.isArray(L.evidence))throw new Error('invalid math hypothesis ledger');
  if(!Array.isArray(historicalContacts))throw new Error('historicalContacts must be an array');
  const minimum=Math.max(2,Number(options.minimum_occurrences)||2);
  const ids=[...new Set(historicalContacts.map(x=>String(x.id)))];
  const occurrences=ids.map(id=>evidenceById(L,id)).filter(Boolean);

  const base={
    whole:1,
    selected_occurrence_ids:ids,
    selected_occurrence_count:ids.length,
    found_occurrence_count:occurrences.length,
    minimum_occurrences:minimum
  };
  if(!ids.length)return{...base,status:'none',complete:true,relations:[],relation_count:0};
  if(occurrences.length!==ids.length)return{...base,status:'incomplete-ledger-reference',complete:false,relations:[],relation_count:0};
  if(ids.length<minimum)return{...base,status:'insufficient-recurrence',complete:true,relations:[],relation_count:0};

  const maps=occurrences.map(e=>completeConstraintMap(e,options));
  if(maps.some(x=>x===null)){
    return{
      ...base,status:'incomplete-source-boundaries',complete:false,
      source_backed_occurrences:maps.filter(Boolean).length,
      relations:[],relation_count:0
    };
  }

  let common=new Set(maps[0].keys());
  for(const m of maps.slice(1))common=new Set([...common].filter(sig=>m.has(sig)));

  const relations=[...common].sort().map(signature=>{
    const occurrence_ids=[];
    for(let i=0;i<maps.length;i++)if(maps[i].has(signature))occurrence_ids.push(ids[i]);
    const exemplar=maps[0].get(signature);
    return{
      signature,
      graph:exemplar.graph,
      expression:exemplar.expression,
      occurrence_ids,
      occurrence_count:occurrence_ids.length,
      status:'derived-common-complete-relation'
    };
  });

  const union=new Set(maps.flatMap(m=>[...m.keys()]));
  return{
    ...base,
    status:relations.length?'derived-common-relations':'no-common-complete-relation',
    complete:true,
    source_backed_occurrences:maps.length,
    relation_count:relations.length,
    differing_relation_count:union.size-common.size,
    relations
  };
}

function abstractRelationalHistory(L,cueInput,options={}){
  const field=queryRelationalField(L,cueInput,options);
  return{
    whole:1,
    cue:field.cue,
    historical_contacts:field.historical_contacts,
    abstraction:abstractHistoricalContacts(L,field.historical_contacts,options)
  };
}

module.exports={
  constraintMapFromExpressions,completeConstraintMap,
  abstractHistoricalContacts,abstractRelationalHistory
};
