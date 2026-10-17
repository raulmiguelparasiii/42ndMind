'use strict';

const assert=require('assert');
const {MOP,variable,app,compileMathGraph}=require('./universal-math-graph');
const {
  oneMathHypothesisLedger,proposeMathAlternative,contactMath,contactMathSpace,
  currentMathHypothesis,currentMathSpace
}=require('./math-hypotheses');
const {
  relationUse,rawConstraint,andNode,buildFactoredIntent,
  provisionalCompletionSuggestions,proposeRelationGuidedAlternative,queryRelationalField
}=require('./universal-relational-completion');

const V=variable,A=app;
const subset=(x,y)=>A(MOP.SUBSET,x,y);
const neq=(x,y)=>A(MOP.NEQ,x,y);
const eq=(x,y)=>A(MOP.EQ,x,y);
const lt=(x,y)=>A(MOP.LT,x,y);
const le=(x,y)=>A(MOP.LE,x,y);
const card=x=>A(MOP.CARD,x);
const opts={maxCoreStates:200000,maxMatchStates:200000,maxCanonicalStates:250000};

const L=oneMathHypothesisLedger();

// First establish an unresolved whole whose lower complete relations are already
// forced and warranted. This is ordinary upstream math-space evidence, not a
// special semantic-faculty pathway.
const P=V('P'),Q=V('Q'),U=V('U');
const common=[subset(P,U),neq(P,Q)];
const a1=[...common,lt(card(P),card(U))];
const a2=[...common,eq(card(P),card(Q))];
const h1=proposeMathAlternative(L,'muA',{id:'ha1',expressions:a1,source:'opaque-proposer'});
const h2=proposeMathAlternative(L,'muA',{id:'ha2',expressions:a2,source:'opaque-proposer'});
contactMathSpace(L,'muA',[...common,a1[2],a2[2]],{id:'muA-broad-contact',complete:true},{autoRefine:false});
assert.strictEqual(currentMathSpace(L,'muA').status,'ambiguous');

const subsetSig=compileMathGraph([subset(V('x'),V('u'))],opts).signature;
const neqSig=compileMathGraph([neq(V('x'),V('y'))],opts).signature;

// Two different occurrences may carry the same anonymous mathematics. They are
// deliberately stored only once as a structural signature for abstraction while
// remaining two distinct evidence episodes in the authoritative ledger history.
contactMath(L,[subset(V('e1x'),V('e1u'))],{
  id:'episode-1',complete:true,candidates:[],scene:'first-occurrence'
},opts);
contactMath(L,[subset(V('e2x'),V('e2u'))],{
  id:'episode-2',complete:true,candidates:[],scene:'second-occurrence'
},opts);

// A new intent can now be constructed directly from the stabilized vocabulary,
// with its still-unsupported remainder left raw. No semantic family name is
// needed to build the candidate.
const X=V('X'),Y=V('Y'),W=V('W');
const useSubset=relationUse(L,subset(X,W),opts);
const useNeq=relationUse(L,neq(X,Y),opts);
assert.strictEqual(useSubset.signature,subsetSig);
assert.strictEqual(useNeq.signature,neqSig);
const rawRemainder=le(card(Y),card(W));
const factored=buildFactoredIntent(L,[andNode(useSubset,useNeq),rawConstraint(rawRemainder)],opts);
assert.strictEqual(factored.relation_uses,2);
assert.strictEqual(factored.raw_constraints,1);
assert.deepStrictEqual(new Set(factored.relation_signatures),new Set([subsetSig,neqSig]));

const expectedExpressions=[A(MOP.AND,subset(X,W),neq(X,Y)),rawRemainder];
const expectedSignature=compileMathGraph(expectedExpressions,opts).signature;
assert.strictEqual(factored.source_signature,expectedSignature,'direct relation-use construction changed the mathematics');

const proposed=proposeRelationGuidedAlternative(L,'muLater',{
  id:'hlater',factored,source:'generic-relation-guided-proposer',confidence:1
},opts);
assert.strictEqual(proposed.hypothesis_id,'hlater');
assert.strictEqual(proposed.source_signature,expectedSignature);
assert.strictEqual(proposed.relation_uses,2);
assert.strictEqual(proposed.raw_constraints,1);
assert.strictEqual(currentMathHypothesis(L,'hlater').signature,expectedSignature,'authoritative ledger did not receive exact expanded math');

// A partial cue queries the same live relation field. It reopens every current
// supported larger structure containing that cue and also locates retained past
// evidence contacts containing it. There is no second history/retrieval store.
const coarse=queryRelationalField(L,[subset(V('cueX'),V('cueU'))],opts);
assert(coarse.stabilized_relations.some(x=>x.signature===subsetSig),'partial cue did not hit stabilized relation');
const coarseIds=new Set(coarse.maximal_live_completions.map(x=>x.id));
assert(coarseIds.has(h1.id)&&coarseIds.has(h2.id),'partial cue failed to reopen both live whole alternatives');
const broad=coarse.historical_contacts.find(x=>x.id==='muA-broad-contact');
assert(broad,'partial cue did not recover retained historical contact');
assert.strictEqual(broad.relation,'cue-contained-in-structure');
assert(broad.completion_gain.edges>0,'larger prior contact exposed no structural completion gain');

// Same mathematical content is allowed to abstract to one signature without
// erasing occurrence identity. The current cue can therefore recover two ordered
// episodes that share exactly the same relation structure.
const episodes=coarse.historical_contacts.filter(x=>x.id==='episode-1'||x.id==='episode-2');
assert.strictEqual(episodes.length,2,'same-structure evidence occurrences collapsed into one episode');
assert.strictEqual(episodes[0].signature,subsetSig);
assert.strictEqual(episodes[1].signature,subsetSig);
assert.notStrictEqual(episodes[0].id,episodes[1].id);
assert(episodes[0].occurrence_index<episodes[1].occurrence_index,'ledger occurrence order was not preserved');
assert(Number.isFinite(episodes[0].ledger_step)&&Number.isFinite(episodes[1].ledger_step),'ledger chronology was not exposed');
assert(episodes[0].ledger_step<episodes[1].ledger_step,'ledger chronology reversed repeated occurrences');
assert.strictEqual(episodes[0].metadata.scene,'first-occurrence');
assert.strictEqual(episodes[1].metadata.scene,'second-occurrence');
assert.deepStrictEqual(episodes.map(x=>x.completion_gain),[{vertices:0,edges:0},{vertices:0,edges:0}]);

// Adding discriminating relational structure narrows the live frontier without
// an attention/focus controller. The change follows only from the cue relation.
const narrow=queryRelationalField(L,a1,opts);
const narrowIds=new Set(narrow.maximal_live_completions.map(x=>x.id));
assert(narrowIds.has(h1.id),'more specific cue lost its matching live structure');
assert(!narrowIds.has(h2.id),'more specific cue failed to narrow the live frontier');
assert(narrow.maximal_live_completions.length<coarse.maximal_live_completions.length,'relational specificity did not narrow completion');

// Complete countercontact can remove the lower relation from the active reusable
// vocabulary. It must not erase retained historical occurrences or alter
// mathematics of a higher candidate that was previously constructed from it.
contactMathSpace(L,'muA',[eq(V('d1'),V('d2'))],{id:'muA-common-defeat',complete:true},{autoRefine:false});
assert.throws(()=>relationUse(L,subset(V('laterX'),V('laterU')),opts),/not currently stabilized/,'corrected relation remained available for new construction');
assert.strictEqual(currentMathHypothesis(L,'hlater').signature,expectedSignature,'lower correction rewrote an already-proposed higher candidate');
const afterCorrection=queryRelationalField(L,[subset(V('oldX'),V('oldU'))],opts);
assert(afterCorrection.historical_contacts.some(x=>x.id==='muA-broad-contact'),'correction erased historical contact instead of only changing current warrant');
const afterEpisodes=afterCorrection.historical_contacts.filter(x=>x.id==='episode-1'||x.id==='episode-2');
assert.strictEqual(afterEpisodes.length,2,'current correction erased prior occurrence records');
assert(afterEpisodes[0].ledger_step<afterEpisodes[1].ledger_step,'correction changed historical ordering');

// Recurrence elsewhere can warrant the same anonymous relation again. The same
// canonical signature becomes constructible without semantic rebinding.
const R=V('R'),S=V('S'),T=V('T');
const b1=[subset(R,T),neq(R,S),le(card(R),card(T))];
const b2=[subset(R,T),neq(R,S),eq(card(S),card(T))];
proposeMathAlternative(L,'muB',{id:'hb1',expressions:b1,source:'opaque-proposer'});
proposeMathAlternative(L,'muB',{id:'hb2',expressions:b2,source:'opaque-proposer'});
contactMathSpace(L,'muB',[...b1,b2[2]],{id:'muB-broad-contact',complete:true},{autoRefine:false});
assert.strictEqual(relationUse(L,subset(V('againX'),V('againU')),opts).signature,subsetSig,'same relation signature did not revive from corrected recurrence');

// Graph-only common structure remains only a clue. When it occurs inside a
// complete source-backed constraint, the connection may suggest that complete
// constraint to a proposer, but it cannot stabilize or assert it by itself.
const G=V('G'),H=V('H'),Z=V('Z');
const g1=compileMathGraph([subset(G,Z),lt(card(G),card(Z))],opts);
const g2=compileMathGraph([subset(G,Z),eq(card(G),card(H))],opts);
proposeMathAlternative(L,'muC',{id:'hc1',graph:g1,source:'graph-only'});
proposeMathAlternative(L,'muC',{id:'hc2',graph:g2,source:'graph-only'});
contactMathSpace(L,'muC',[subset(G,Z),lt(card(G),card(Z)),eq(card(G),card(H))],{id:'muC-contact',complete:true},{autoRefine:false});
const suggestions=provisionalCompletionSuggestions(L,[subset(V('candidateX'),V('candidateU'))],opts);
assert(suggestions.some(x=>x.space==='muC'&&x.status==='proposal-only'),'graph-only invariant did not guide any complete relation proposal');
assert(suggestions.every(x=>x.status==='proposal-only'),'provisional guidance silently promoted structure');

// The pure generic connection contains no semantic faculty label. Such meanings
// may later attach to this behavior through the Universal Language, but are not
// coded into the mechanism.
const pure=JSON.stringify({coarse,narrow,suggestions,proposed}).toLowerCase();
for(const semantic of ['memory','remember','recollect','attention','focus'])assert(!pure.includes(semantic));

const report={
  stabilized_vocabulary_builds_new_candidate_directly:true,
  unresolved_remainder_stays_explicit:true,
  candidate_enters_existing_live_hypothesis_authority:true,
  partial_cue_reopens_live_relational_completions:true,
  retained_evidence_is_reaccessed_without_separate_store:true,
  repeated_same_math_contacts_remain_distinct_ordered_occurrences:true,
  abstract_relation_identity_and_episode_identity_are_nonidentical:true,
  larger_historical_contact_reports_completion_gain:true,
  more_specific_cue_narrows_live_frontier:true,
  correction_removes_current_reuse_without_erasing_history:true,
  prior_higher_candidate_survives_lower_relation_correction:true,
  corrected_recurrence_restores_same_relation_signature:true,
  graph_only_invariant_guides_complete_proposal_without_promotion:true,
  semantic_faculty_labels_in_generic_connection:0,
  whole:L.whole
};
console.log(JSON.stringify(report,null,2));
console.log('UNIVERSAL RELATIONAL COMPLETION TEST: PASS');
