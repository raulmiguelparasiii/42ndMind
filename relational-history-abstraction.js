'use strict';

// Read-only recurrence view over retained mathematical contact.
//
// This is a CONNECTION to the complete-relation boundary already established by
// universal-intent.js. It does not define another notion of mathematical
// completeness, stabilization, truth, status, or semantic abstraction.
//
// Selected historical occurrences may expose complete source-backed relations
// that recur across every occurrence. Those recurrences are proposal clues only.
// They become warranted Universal-Language relations only through the existing
// math-space evidence/stabilization authority. If any selected occurrence lacks
// complete source boundaries, no categorical recurrence clue is emitted.

const {candidateConstraintGraphs}=require('./universal-intent');
const {queryRelationalField}=require('./universal-relational-completion');

function evidenceById(L,id){return (L.evidence||[]).find(e=>String(e.id)===String(id))||null;}

// Compatibility utility used by cue-accessibility/source-coherence. It now
// delegates to the same complete top-level relation extraction used by PR #28,
// rather than maintaining a parallel definition of mathematical completeness.
function constraintMapFromExpressions(expressions,options={}){
  if(!Array.isArray(expressions))return null;
  const relations=candidateConstraintGraphs({expressions},options);
  return new Map(relations.map(r=>[r.signature,{signature:r.signature,graph:r.graph}]));
}

function completeConstraintMap(evidence,options={}){
  const xs=evidence?.metadata?.source_expressions;
  if(evidence?.metadata?.complete!==true||!Array.isArray(xs))return null;
  return constraintMapFromExpressions(xs,options);
}

function recurrentHistoricalRelations(L,historicalContacts,options={}){
  if(!L||L.whole!==1||!Array.isArray(L.evidence))throw new Error('invalid math hypothesis ledger');
  if(!Array.isArray(historicalContacts))throw new Error('historicalContacts must be an array');
  const minimum=Math.max(2,Number(options.minimum_occurrences)||2);
  const ids=[...new Set(historicalContacts.map(x=>String(x.id)))];
  const occurrences=ids.map(id=>evidenceById(L,id)).filter(Boolean);

  const base={
    whole:1,
    authority:'proposal-only',
    selected_occurrence_ids:ids,
    selected_occurrence_count:ids.length,
    found_occurrence_count:occurrences.length,
    minimum_occurrences:minimum
  };
  if(!ids.length)return{...base,result:'none',complete:true,relations:[],relation_count:0};
  if(occurrences.length!==ids.length)return{...base,result:'incomplete-ledger-reference',complete:false,relations:[],relation_count:0};
  if(ids.length<minimum)return{...base,result:'insufficient-recurrence',complete:true,relations:[],relation_count:0};

  const maps=occurrences.map(e=>completeConstraintMap(e,options));
  if(maps.some(x=>x===null)){
    return{
      ...base,result:'incomplete-source-boundaries',complete:false,
      source_backed_occurrences:maps.filter(Boolean).length,
      relations:[],relation_count:0
    };
  }

  let common=new Set(maps[0].keys());
  for(const m of maps.slice(1))common=new Set([...common].filter(sig=>m.has(sig)));

  const relations=[...common].sort().map(signature=>{
    const occurrence_ids=[];
    for(let i=0;i<maps.length;i++)if(maps[i].has(signature))occurrence_ids.push(ids[i]);
    return{
      kind:'cross-occurrence-complete-recurrence-clue',
      authority:'proposal-only',
      signature,
      graph:maps[0].get(signature).graph,
      occurrence_ids,
      occurrence_count:occurrence_ids.length
    };
  });

  const union=new Set(maps.flatMap(m=>[...m.keys()]));
  return{
    ...base,
    result:relations.length?'recurrent-complete-relations':'no-recurrent-complete-relation',
    complete:true,
    source_backed_occurrences:maps.length,
    relation_count:relations.length,
    differing_relation_count:union.size-common.size,
    relations
  };
}

function recurrentRelationalHistory(L,cueInput,options={}){
  const field=queryRelationalField(L,cueInput,options);
  return{
    whole:1,
    cue:field.cue,
    historical_contacts:field.historical_contacts,
    recurrence:recurrentHistoricalRelations(L,field.historical_contacts,options)
  };
}

// Compatibility aliases for existing callers during the repair. They expose the
// same proposal-only recurrence view and own no independent semantics/status.
const abstractHistoricalContacts=recurrentHistoricalRelations;
function abstractRelationalHistory(L,cueInput,options={}){
  const x=recurrentRelationalHistory(L,cueInput,options);
  return{...x,abstraction:x.recurrence};
}

module.exports={
  constraintMapFromExpressions,completeConstraintMap,
  recurrentHistoricalRelations,recurrentRelationalHistory,
  abstractHistoricalContacts,abstractRelationalHistory
};
