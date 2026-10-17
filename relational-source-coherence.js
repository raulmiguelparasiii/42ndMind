'use strict';

// Read-only source coherence for a proposed/reconstructed source-backed cue.
//
// A cue may be composed entirely of familiar complete relations while no single
// retained occurrence ever contained that combination. Component familiarity is
// inspected through the established complete-relation boundary, while whole-
// source support additionally requires one binding-consistent embedding of the
// COMPLETE cue into one retained occurrence.
//
// This module stores no source truth/status and creates no composite episode.

const {asCompiledMath,matchCompiledSubgraph}=require('./math-hypotheses');
const {constraintMapFromExpressions}=require('./relational-history-abstraction');
const {sourceCueExpressions,sourceBackedOccurrenceMaps}=require('./relational-cue-accessibility');

function sourceCoherence(L,cueInput,options={}){
  if(!L||L.whole!==1||!Array.isArray(L.evidence))throw new Error('invalid math hypothesis ledger');
  const expressions=sourceCueExpressions(cueInput);
  if(!expressions){
    return{
      whole:1,status:'incomplete-source-cue',complete:false,
      cue_constraint_count:0,whole_source_occurrence_ids:[],constraint_sources:[]
    };
  }
  const cueMap=constraintMapFromExpressions(expressions,options);
  const cueSignatures=[...cueMap.keys()].sort();
  if(!cueSignatures.length){
    return{
      whole:1,status:'none',complete:true,
      cue_constraint_count:0,whole_source_occurrence_ids:[],constraint_sources:[]
    };
  }

  const occurrences=sourceBackedOccurrenceMaps(L,options);
  const constraintSources=cueSignatures.map(signature=>({
    signature,
    occurrence_ids:occurrences.filter(x=>x.map.has(signature)).map(x=>x.id).sort()
  }));
  const unsupported=constraintSources.filter(x=>!x.occurrence_ids.length).map(x=>x.signature);

  // Co-located component signatures are useful diagnostics, but they are not
  // sufficient for whole-source support because independent canonicalization can
  // erase co-reference between top-level constraints. Preserve that distinction.
  const componentColocated=occurrences.filter(x=>cueSignatures.every(sig=>x.map.has(sig)));

  // Reuse the existing generic whole-graph matcher. Compiling the cue as one
  // graph preserves repeated source-variable identity, so one retained
  // occurrence supports the whole cue only when all constraints can embed under
  // one consistent anonymous-node mapping.
  const cueGraph=asCompiledMath(expressions,options);
  const whole=componentColocated.filter(x=>Boolean(matchCompiledSubgraph(cueGraph,x.evidence.graph,options)));
  const wholeIds=whole.map(x=>x.id).sort();
  const componentColocatedIds=componentColocated.map(x=>x.id).sort();

  let status;
  if(unsupported.length)status='partially-unsupported';
  else if(wholeIds.length)status='source-supported';
  else if(componentColocatedIds.length)status='binding-incoherent-source';
  else status='cross-source-composite';

  return{
    whole:1,
    status,
    complete:true,
    cue_constraint_count:cueSignatures.length,
    retained_source_occurrence_count:occurrences.length,
    all_constraints_individually_sourced:unsupported.length===0,
    whole_source_supported:wholeIds.length>0,
    whole_source_occurrence_ids:wholeIds,
    component_colocated_occurrence_ids:componentColocatedIds,
    unsupported_constraint_signatures:unsupported,
    constraint_sources:constraintSources
  };
}

module.exports={sourceCoherence};
