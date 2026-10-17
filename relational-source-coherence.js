'use strict';

// Read-only source coherence for a proposed/reconstructed source-backed cue.
//
// A cue may be composed entirely of familiar complete relations while no single
// retained occurrence ever contained that combination. This module detects that
// case without declaring the cue false in reality: it reports only whether the
// retained source history supports the cue AS ONE occurrence.
//
// No source truth/status is stored. No composite episode is created.

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
  const whole=occurrences.filter(x=>cueSignatures.every(sig=>x.map.has(sig))).map(x=>x.id).sort();

  let status;
  if(unsupported.length)status='partially-unsupported';
  else if(whole.length)status='source-supported';
  else status='cross-source-composite';

  return{
    whole:1,
    status,
    complete:true,
    cue_constraint_count:cueSignatures.length,
    retained_source_occurrence_count:occurrences.length,
    all_constraints_individually_sourced:unsupported.length===0,
    whole_source_supported:whole.length>0,
    whole_source_occurrence_ids:whole,
    unsupported_constraint_signatures:unsupported,
    constraint_sources:constraintSources
  };
}

module.exports={sourceCoherence};
