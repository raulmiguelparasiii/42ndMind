'use strict';

const assert=require('assert');
const {MOP,variable,app}=require('./universal-math-graph');
const {oneMathHypothesisLedger,contactMath}=require('./math-hypotheses');
const {resolveRelationalHistory}=require('./relational-history-resolution');

const V=variable,A=app;
const subset=(x,y)=>A(MOP.SUBSET,x,y);
const eq=(x,y)=>A(MOP.EQ,x,y);
const neq=(x,y)=>A(MOP.NEQ,x,y);
const tuple=(...xs)=>A(MOP.TUPLE,...xs);
const opts={maxCoreStates:200000,maxMatchStates:250000,maxCanonicalStates:250000};

const L=oneMathHypothesisLedger();
const broadCue=[subset(V('cueItem'),V('cueWorld'))];

// No contact, no retrieval. A cue alone must not fabricate an episode.
let q=resolveRelationalHistory(L,broadCue,opts);
assert.strictEqual(q.historical_resolution.structure_status,'none');
assert.strictEqual(q.historical_resolution.occurrence_status,'none');

// First experienced occurrence: partial cue can complete into one retained larger
// structure and one occurrence. Metadata is provenance only; the match comes from
// anonymous mathematical structure.
const P=V('P'),U=V('U'),ctx=V('ctx');
const episodeA=[subset(P,U),eq(ctx,tuple(P,U))];
contactMath(L,episodeA,{
  id:'episode-a',complete:true,kind:'experienced-contact',
  context:'east-entrance',surface:'I left the folder by the east entrance.'
},opts);
q=resolveRelationalHistory(L,broadCue,opts);
assert.strictEqual(q.historical_resolution.structure_status,'resolved');
assert.strictEqual(q.historical_resolution.occurrence_status,'resolved');
assert.deepStrictEqual(q.historical_resolution.candidate_occurrence_ids,['episode-a']);
assert(q.historical_contacts[0].completion_gain.edges>0,'partial cue did not recover missing relational structure');

// A later related but structurally different occurrence creates retrieval
// competition. The latest occurrence must NOT win merely because it is newest.
const X=V('X'),W=V('W'),otherCtx=V('otherCtx');
const episodeB=[subset(X,W),neq(otherCtx,X)];
contactMath(L,episodeB,{
  id:'episode-b',complete:true,kind:'experienced-contact',
  context:'west-entrance',surface:'I left the folder by the west entrance.'
},opts);
q=resolveRelationalHistory(L,broadCue,opts);
assert.strictEqual(q.historical_resolution.structure_status,'ambiguous','related later experience did not create structural competition');
assert.strictEqual(q.historical_resolution.occurrence_status,'ambiguous');
assert.strictEqual(q.historical_resolution.competing_structures,true);
assert.deepStrictEqual(new Set(q.historical_resolution.candidate_occurrence_ids),new Set(['episode-a','episode-b']));
assert.notStrictEqual(q.historical_resolution.occurrence_status,'resolved','recency silently chose a source occurrence');

// Reinstating enough of the earlier relational context releases the competition
// and identifies the earlier occurrence. This is structural cue specificity, not
// a source-name lookup.
const specificA=resolveRelationalHistory(L,episodeA,opts);
assert.strictEqual(specificA.historical_resolution.structure_status,'resolved');
assert.strictEqual(specificA.historical_resolution.occurrence_status,'resolved');
assert.deepStrictEqual(specificA.historical_resolution.candidate_occurrence_ids,['episode-a']);

// Repeating the same anonymous structure later preserves abstract identity but
// creates a second occurrence. The structure is recognizable while the exact
// occurrence/source is no longer inferable from structure alone.
const P2=V('renamedP'),U2=V('renamedU'),ctx2=V('renamedCtx');
const episodeARepeat=[subset(P2,U2),eq(ctx2,tuple(P2,U2))];
contactMath(L,episodeARepeat,{
  id:'episode-a-repeat',complete:true,kind:'experienced-contact',
  context:'east-entrance-later',surface:'Later, the same relational event happened again.'
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
const pure=JSON.stringify({q,specificA,repeated}).toLowerCase();
for(const word of ['memory','remember','recollect','familiarity','attention','focus'])assert(!pure.includes(word));

console.log(JSON.stringify({
  no_contact_no_fabricated_occurrence:true,
  encoding_contact_changes_later_reaccess:true,
  partial_cue_completes_retained_structure:true,
  related_later_occurrence_creates_competition:true,
  newest_occurrence_not_privileged:true,
  richer_context_releases_interference:true,
  repeated_structure_preserves_identity_but_not_occurrence_identity:true,
  source_occurrence_not_invented_under_ambiguity:true,
  retrieval_is_read_only_without_explicit_new_contact:true,
  semantic_faculty_labels_in_generic_output:0,
  whole:1
},null,2));
console.log('RELATIONAL HISTORY RESOLUTION TEST: PASS');
