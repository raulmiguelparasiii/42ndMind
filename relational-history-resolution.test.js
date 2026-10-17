'use strict';

const assert=require('assert');
const {MOP,variable,constant,app}=require('./universal-math-graph');
const {oneMathHypothesisLedger,contactMath}=require('./math-hypotheses');
const {resolveRelationalHistory}=require('./relational-history-resolution');

const V=variable,C=constant,A=app;
const subset=(x,y)=>A(MOP.SUBSET,x,y);
const eq=(x,y)=>A(MOP.EQ,x,y);
const opts={maxCoreStates:200000,maxMatchStates:250000,maxCanonicalStates:250000};

const L=oneMathHypothesisLedger();
const broadCue=[subset(V('cueItem'),V('cueWorld'))];

// No contact, no retrieval. A cue alone must not fabricate an episode.
let q=resolveRelationalHistory(L,broadCue,opts);
assert.strictEqual(q.historical_resolution.structure_status,'none');
assert.strictEqual(q.historical_resolution.occurrence_status,'none');

// First experienced occurrence. The episode-specific context value is part of
// the mathematics itself, not merely metadata, so it can later participate in a
// structural retrieval cue. Metadata below remains audit/provenance only.
const P=V('P'),U=V('U'),ctx=V('ctx');
const episodeA=[subset(P,U),eq(ctx,C('east-entrance'))];
contactMath(L,episodeA,{
  id:'episode-a',complete:true,kind:'experienced-contact',
  source_note:'folder experience A'
},opts);
q=resolveRelationalHistory(L,broadCue,opts);
assert.strictEqual(q.historical_resolution.structure_status,'resolved');
assert.strictEqual(q.historical_resolution.occurrence_status,'resolved');
assert.deepStrictEqual(q.historical_resolution.candidate_occurrence_ids,['episode-a']);
assert(q.historical_contacts[0].completion_gain.edges>0,'partial cue did not recover missing relational structure');

// A later event with the SAME abstract schema but a different bound contextual
// value creates cue competition. The latest occurrence must not win just because
// it is newest.
const X=V('X'),W=V('W'),otherCtx=V('otherCtx');
const episodeB=[subset(X,W),eq(otherCtx,C('west-entrance'))];
contactMath(L,episodeB,{
  id:'episode-b',complete:true,kind:'experienced-contact',
  source_note:'folder experience B'
},opts);
q=resolveRelationalHistory(L,broadCue,opts);
assert.strictEqual(q.historical_resolution.structure_status,'ambiguous','same-schema contextual competitor did not create structural competition');
assert.strictEqual(q.historical_resolution.occurrence_status,'ambiguous');
assert.strictEqual(q.historical_resolution.competing_structures,true);
assert.deepStrictEqual(new Set(q.historical_resolution.candidate_occurrence_ids),new Set(['episode-a','episode-b']));
assert.notStrictEqual(q.historical_resolution.occurrence_status,'resolved','recency silently chose a source occurrence');

// Reinstating the earlier bound context releases competition and identifies the
// earlier occurrence. The context is matched through the mathematical episode,
// not by reading provenance metadata or an episode ID.
const specificA=resolveRelationalHistory(L,episodeA,opts);
assert.strictEqual(specificA.historical_resolution.structure_status,'resolved');
assert.strictEqual(specificA.historical_resolution.occurrence_status,'resolved');
assert.deepStrictEqual(specificA.historical_resolution.candidate_occurrence_ids,['episode-a']);

const specificB=resolveRelationalHistory(L,episodeB,opts);
assert.strictEqual(specificB.historical_resolution.structure_status,'resolved');
assert.strictEqual(specificB.historical_resolution.occurrence_status,'resolved');
assert.deepStrictEqual(specificB.historical_resolution.candidate_occurrence_ids,['episode-b']);

// Repeating the same episode mathematics later preserves abstract/content
// identity but creates a second occurrence. Recognition of that content no longer
// identifies which occurrence supplied it.
const P2=V('renamedP'),U2=V('renamedU'),ctx2=V('renamedCtx');
const episodeARepeat=[subset(P2,U2),eq(ctx2,C('east-entrance'))];
contactMath(L,episodeARepeat,{
  id:'episode-a-repeat',complete:true,kind:'experienced-contact',
  source_note:'same east-bound content occurred later'
},opts);
const repeated=resolveRelationalHistory(L,episodeA,opts);
assert.strictEqual(repeated.historical_resolution.structure_status,'resolved');
assert.strictEqual(repeated.historical_resolution.occurrence_status,'ambiguous');
assert.strictEqual(repeated.historical_resolution.repeated_same_structure,true);
assert.deepStrictEqual(new Set(repeated.historical_resolution.candidate_occurrence_ids),new Set(['episode-a','episode-a-repeat']));

// Querying is read-only. Recall/reaccess does not mutate the evidence ledger and
// therefore does not smuggle reconsolidation or retrieval-induced forgetting into
// the generic law. Later reality contact may still update the ledger normally.
const evidenceBefore=L.evidence.length;
resolveRelationalHistory(L,broadCue,opts);
resolveRelationalHistory(L,episodeB,opts);
assert.strictEqual(L.evidence.length,evidenceBefore,'retrieval query rewrote stored contact');

// Generic output remains semantic-label-free. The external test interprets these
// structural properties as memory phenomena; the runtime does not.
const pure=JSON.stringify({q,specificA,specificB,repeated}).toLowerCase();
for(const word of ['memory','remember','recollect','familiarity','attention','focus'])assert(!pure.includes(word));

console.log(JSON.stringify({
  no_contact_no_fabricated_occurrence:true,
  encoding_contact_changes_later_reaccess:true,
  partial_cue_completes_retained_structure:true,
  same_schema_different_context_creates_competition:true,
  newest_occurrence_not_privileged:true,
  reinstated_context_releases_interference:true,
  context_value_is_in_episode_math_not_only_metadata:true,
  repeated_structure_preserves_identity_but_not_occurrence_identity:true,
  source_occurrence_not_invented_under_ambiguity:true,
  retrieval_is_read_only_without_explicit_new_contact:true,
  semantic_faculty_labels_in_generic_output:0,
  whole:1
},null,2));
console.log('RELATIONAL HISTORY RESOLUTION TEST: PASS');
