'use strict';

// Read-only occurrence/structure resolution over the existing Universal-Language
// relational-history query. This stores no memory state, activation, confidence,
// source authority, or correction status. It only summarizes what the current
// cue can and cannot identify from evidence already retained in the one math
// ledger.
//
// Crucial distinction:
//   one abstract mathematical structure may have many historical occurrences;
//   one cue may match several different historical structures.
// A caller therefore must not silently turn recognition of structure into a
// claim about which occurrence/source was recovered.

const {queryRelationalField}=require('./universal-relational-completion');

function uniqueSorted(xs){return[...new Set(xs.map(String))].sort();}

function summarizeHistoricalContacts(contacts){
  if(!Array.isArray(contacts))throw new Error('historical contacts must be an array');
  const structures=new Map();
  const occurrenceIds=[];
  const occurrenceIndices=[];
  let exactOccurrences=0,completedOccurrences=0;

  for(const c of contacts){
    const signature=String(c.signature);
    occurrenceIds.push(String(c.id));
    if(Number.isInteger(c.occurrence_index))occurrenceIndices.push(c.occurrence_index);
    if(c.relation==='exact')exactOccurrences++;
    if(c.relation==='cue-contained-in-structure')completedOccurrences++;
    let s=structures.get(signature);
    if(!s){
      s={signature,occurrence_ids:[],occurrence_indices:[],exact_occurrences:0,completion_occurrences:0};
      structures.set(signature,s);
    }
    s.occurrence_ids.push(String(c.id));
    if(Number.isInteger(c.occurrence_index))s.occurrence_indices.push(c.occurrence_index);
    if(c.relation==='exact')s.exact_occurrences++;
    if(c.relation==='cue-contained-in-structure')s.completion_occurrences++;
  }

  const structureSignatures=[...structures.keys()].sort();
  const occurrenceCount=contacts.length;
  const structureCount=structureSignatures.length;

  return{
    whole:1,
    structure_status:structureCount===0?'none':structureCount===1?'resolved':'ambiguous',
    occurrence_status:occurrenceCount===0?'none':occurrenceCount===1?'resolved':'ambiguous',
    structure_count:structureCount,
    occurrence_count:occurrenceCount,
    structure_signatures:structureSignatures,
    candidate_occurrence_ids:uniqueSorted(occurrenceIds),
    candidate_occurrence_indices:[...new Set(occurrenceIndices)].sort((a,b)=>a-b),
    exact_occurrence_count:exactOccurrences,
    completion_occurrence_count:completedOccurrences,
    repeated_same_structure:structureCount===1&&occurrenceCount>1,
    competing_structures:structureCount>1,
    structures:[...structures.values()].sort((a,b)=>a.signature.localeCompare(b.signature)).map(s=>({
      signature:s.signature,
      occurrence_ids:uniqueSorted(s.occurrence_ids),
      occurrence_indices:[...new Set(s.occurrence_indices)].sort((a,b)=>a-b),
      exact_occurrences:s.exact_occurrences,
      completion_occurrences:s.completion_occurrences
    }))
  };
}

function resolveRelationalHistory(L,cueInput,options={}){
  const field=queryRelationalField(L,cueInput,options);
  return{
    ...field,
    historical_resolution:summarizeHistoricalContacts(field.historical_contacts)
  };
}

module.exports={summarizeHistoricalContacts,resolveRelationalHistory};
