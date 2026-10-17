'use strict';

// Read-only cue accessibility over retained source-backed mathematical contact.
//
// This is not truth, confidence, memory strength, or decay. It asks only how much
// of the present COMPLETE source-backed cue is shared by each retained occurrence.
// A weak cue may therefore leave several episodes equally accessible; a richer cue
// may make one uniquely best while all competitors remain in the same evidence
// ledger. No occurrence is weakened or deleted by this read.

const {constraintMapFromExpressions,completeConstraintMap}=require('./relational-history-abstraction');

function cueExpressions(input){
  if(Array.isArray(input))return input;
  if(input&&typeof input==='object'&&Array.isArray(input.expressions))return input.expressions;
  return null;
}

function cueAccessibility(L,cueInput,options={}){
  if(!L||L.whole!==1||!Array.isArray(L.evidence))throw new Error('invalid math hypothesis ledger');
  const expressions=cueExpressions(cueInput);
  if(!expressions){
    return{
      whole:1,status:'incomplete-source-cue',complete:false,
      cue_constraint_count:0,retained_source_occurrence_count:0,
      competing_occurrence_count:0,top_occurrence_ids:[],candidates:[]
    };
  }
  const cueMap=constraintMapFromExpressions(expressions,options);
  const cueSignatures=[...cueMap.keys()];
  if(!cueSignatures.length){
    return{
      whole:1,status:'none',complete:true,
      cue_constraint_count:0,retained_source_occurrence_count:0,
      competing_occurrence_count:0,top_occurrence_ids:[],candidates:[]
    };
  }

  const sourceBacked=[];
  for(const e of L.evidence){
    const map=completeConstraintMap(e,options);
    if(map)sourceBacked.push({e,map});
  }

  const candidates=[];
  for(const {e,map} of sourceBacked){
    const matched=cueSignatures.filter(sig=>map.has(sig));
    if(!matched.length)continue;
    candidates.push({
      id:String(e.id),
      cue_coverage:matched.length/cueSignatures.length,
      matched_constraint_count:matched.length,
      cue_constraint_count:cueSignatures.length,
      occurrence_constraint_count:map.size,
      matched_signatures:matched.slice().sort()
    });
  }
  candidates.sort((a,b)=>
    b.cue_coverage-a.cue_coverage ||
    b.matched_constraint_count-a.matched_constraint_count ||
    a.id.localeCompare(b.id)
  );

  const tolerance=options.accessibilityTieTolerance??1e-12;
  const best=candidates[0]?.cue_coverage??null;
  const top=best===null?[]:candidates.filter(x=>Math.abs(x.cue_coverage-best)<=tolerance);
  const status=!candidates.length?'none':top.length===1?'unique-best':'ambiguous-best';
  return{
    whole:1,
    status,
    complete:true,
    cue_constraint_count:cueSignatures.length,
    retained_source_occurrence_count:sourceBacked.length,
    competing_occurrence_count:candidates.length,
    interference_count:Math.max(0,candidates.length-1),
    best_cue_coverage:best,
    top_occurrence_ids:top.map(x=>x.id),
    candidates
  };
}

module.exports={cueAccessibility};
