'use strict';

const assert=require('assert');
const {MOP,variable,app,compileMathGraph}=require('./universal-math-graph');
const {
  oneMathHypothesisLedger,proposeMathAlternative,contactMathSpace,currentMathSpace
}=require('./math-hypotheses');
const {
  oneEnglishMathBridge,bindEnglishMathSpace,mathForRelation
}=require('./english-math-bridge');
const {
  maximumCommonSubgraphs,stabilizedIntent,universalRelationField,
  factorIntentExpressions,expandFactoredIntent,inspectFactoredIntent,refreshIntentFactorization,
  stabilizedMathForRelation
}=require('./universal-intent');

const V=variable,A=app;
const subset=(x,y)=>A(MOP.SUBSET,x,y);
const neq=(x,y)=>A(MOP.NEQ,x,y);
const eq=(x,y)=>A(MOP.EQ,x,y);
const lt=(x,y)=>A(MOP.LT,x,y);
const le=(x,y)=>A(MOP.LE,x,y);
const card=x=>A(MOP.CARD,x);

const L=oneMathHypothesisLedger();

// muA has two structurally different whole-intent candidates. They share two
// lower mathematical relations but differ in the remaining constraint.
const P=V('P'),Q=V('Q'),U=V('U');
const commonA=[subset(P,U),neq(P,Q)];
const a1=[...commonA,lt(card(P),card(U))];
const a2=[...commonA,eq(card(P),card(Q))];
const hA1=proposeMathAlternative(L,'muA',{id:'ha1',expressions:a1,source:'opaque-proposer',confidence:1});
proposeMathAlternative(L,'muA',{id:'ha2',expressions:a2,source:'opaque-proposer',confidence:1});
contactMathSpace(L,'muA',[...commonA,a1[2],a2[2]],{id:'muA-broad-contact',complete:true},{autoRefine:false});
assert.strictEqual(currentMathSpace(L,'muA').status,'ambiguous','whole intent should remain ambiguous');

const opts={maxCoreStates:200000,maxMatchStates:200000,maxCanonicalStates:250000};
const sA=stabilizedIntent(L,'muA',opts);
assert.strictEqual(sA.status,'ambiguous');
assert.strictEqual(sA.unresolved,true);
assert(sA.stabilized_relations.length>=2,'ambiguous whole exposed no warranted lower relations');
assert.strictEqual(sA.common_core.search_complete,true,'bounded exact common-core search did not complete');
assert(sA.structural_common_edge_ratio>0&&sA.structural_common_edge_ratio<1,'ambiguous whole should have a proper common structural core');

const subsetSig=compileMathGraph([subset(V('x'),V('w'))]).signature;
const neqSig=compileMathGraph([neq(V('x'),V('y'))]).signature;
const stableASigs=new Set(sA.stabilized_relations.map(x=>x.signature));
assert(stableASigs.has(subsetSig),'shared subset relation failed to stabilize');
assert(stableASigs.has(neqSig),'shared incompatibility relation failed to stabilize');

// muB is a different whole-intent space with different outer mathematics but
// the same two lower relations under arbitrary variable renaming.
const X=V('X'),Y=V('Y'),W=V('W');
const commonB=[subset(X,W),neq(X,Y)];
const b1=[...commonB,le(card(X),card(W))];
const b2=[...commonB,eq(card(Y),card(W))];
proposeMathAlternative(L,'muB',{id:'hb1',expressions:b1,source:'opaque-proposer'});
proposeMathAlternative(L,'muB',{id:'hb2',expressions:b2,source:'opaque-proposer'});
contactMathSpace(L,'muB',[...commonB,b1[2],b2[2]],{id:'muB-broad-contact',complete:true},{autoRefine:false});
assert.strictEqual(currentMathSpace(L,'muB').status,'ambiguous');
const sB=stabilizedIntent(L,'muB',opts);
const stableBSigs=new Set(sB.stabilized_relations.map(x=>x.signature));
assert(stableBSigs.has(subsetSig));
assert(stableBSigs.has(neqSig));

// The Universal-Language relation field quotients by anonymous canonical
// structure, so the same lower relation recurring in different whole intents is
// one relation structure rather than two semantic-name entries.
let field=universalRelationField(L,opts);
const recurrentBySig=new Map(field.recurrent_relations.map(x=>[x.signature,x]));
assert(recurrentBySig.get(subsetSig)?.occurrence_count>=2,'same lower relation did not recur across intent spaces');
assert(recurrentBySig.get(neqSig)?.occurrence_count>=2,'same lower relation did not recur across intent spaces');

// A new whole intent may reuse those stabilized relations without copying their
// truth/status. Local occurrences retain variable binding. Top-level AND shape is
// preserved exactly, while an unsupported complete constraint remains raw.
const A0=V('A0'),B0=V('B0'),U0=V('U0');
const laterIntent=[A(MOP.AND,subset(A0,U0),neq(A0,B0)),le(card(B0),card(U0))];
const laterSignature=compileMathGraph(laterIntent).signature;
const factored=factorIntentExpressions(L,laterIntent,opts);
assert.strictEqual(factored.relation_uses,2,'stable relations were not reused inside later intent');
assert.strictEqual(factored.raw_constraints,1,'unsupported remainder was incorrectly promoted');
assert.deepStrictEqual(new Set(factored.relation_signatures),new Set([subsetSig,neqSig]));
assert.strictEqual(expandFactoredIntent(factored,opts).signature,laterSignature,'factorization changed intent mathematics');
let factorView=inspectFactoredIntent(L,factored,opts);
assert.strictEqual(factorView.factoring_current,true);
assert.strictEqual(factorView.stale_dependencies.length,0);

// Arbitrary variable renaming changes neither reusable relation identity nor the
// whole mathematical identity of an otherwise identical intent.
const AA=V('renamedA'),BB=V('renamedB'),UU=V('renamedU');
const renamedIntent=[A(MOP.AND,subset(AA,UU),neq(AA,BB)),le(card(BB),card(UU))];
const renamedFactor=factorIntentExpressions(L,renamedIntent,opts);
assert.deepStrictEqual(new Set(renamedFactor.relation_signatures),new Set(factored.relation_signatures));
assert.strictEqual(renamedFactor.source_signature,factored.source_signature);

// Surface language can remain attached to an unresolved whole while exposing
// only the mathematics that has actually stabilized. The base bridge stays
// conservative: a pending space with no independently usable whole candidate is
// unresolved. This derived view may expose warranted lower mathematics without
// changing that upstream whole-intent verdict.
const Ustate={
  whole:1,
  relations:{xi:{support:1,lexical:{'txt:u:opaque':1}}},
  canonical:{xi:'xi'},
  equivalence_sets:[{representative:'xi',members:['xi']}]
};
const B=oneEnglishMathBridge();
bindEnglishMathSpace(B,Ustate,L,'xi','muA');
assert.strictEqual(mathForRelation(B,Ustate,L,'xi').status,'unresolved');
const surface=stabilizedMathForRelation(B,Ustate,L,'xi',opts);
assert.strictEqual(surface.status,'partially-stabilized-math');
const surfaceSigs=new Set(surface.stabilized_relations.map(x=>x.signature));
assert(surfaceSigs.has(subsetSig)&&surfaceSigs.has(neqSig),'surface attachment did not expose stabilized lower math');

// Discriminating contact resolves the whole muA candidate. The lower recurring
// relations remain present because they are literal warranted parts of the now
// resolved whole, while muB can remain ambiguous.
contactMathSpace(L,'muA',a1,{id:'muA-discriminating-contact',complete:true},{autoRefine:false});
assert.strictEqual(currentMathSpace(L,'muA').status,'resolved-candidate-math');
const resolvedA=stabilizedIntent(L,'muA',opts);
assert.strictEqual(resolvedA.unresolved,false);
assert.strictEqual(resolvedA.resolved_hypothesis,hA1.id);
assert.strictEqual(resolvedA.structural_common_edge_ratio,1);
const resolvedSigs=new Set(resolvedA.stabilized_relations.map(x=>x.signature));
assert(resolvedSigs.has(subsetSig)&&resolvedSigs.has(neqSig));
assert.strictEqual(currentMathSpace(L,'muB').status,'ambiguous');
field=universalRelationField(L,opts);
assert(field.recurrent_relations.some(x=>x.signature===subsetSig&&x.occurrence_count>=2));

// Incomplete nonmatching contact remains unknown and cannot erase the already
// warranted structure.
contactMathSpace(L,'muA',[eq(V('m'),V('n'))],{id:'muA-incomplete',complete:false},{autoRefine:false});
const afterIncomplete=stabilizedIntent(L,'muA',opts);
assert(afterIncomplete.stabilized_relations.some(x=>x.signature===subsetSig),'incomplete contact erased warranted relation');
assert.strictEqual(inspectFactoredIntent(L,factored,opts).factoring_current,true,'incomplete contact invalidated a live relation dependency');

// Complete countercontact can remove those relations from every current source
// space. The higher intent's mathematics is not destroyed: its occurrences
// expand back to raw math and a refresh drops only the no-longer-live handles.
contactMathSpace(L,'muA',[eq(V('d1'),V('d2'))],{id:'muA-common-defeat',complete:true},{autoRefine:false});
contactMathSpace(L,'muB',[eq(V('d3'),V('d4'))],{id:'muB-common-defeat',complete:true},{autoRefine:false});
factorView=inspectFactoredIntent(L,factored,opts);
assert.strictEqual(factorView.factoring_current,false,'defeated stabilization remained live downstream');
assert.strictEqual(factorView.stale_dependencies.length,2,'not all corrected lower dependencies became stale');
const rawAgain=refreshIntentFactorization(L,factored,opts);
assert.strictEqual(rawAgain.relation_uses,0,'refresh retained stale relation handles');
assert.strictEqual(rawAgain.source_signature,laterSignature,'correction changed the higher intent mathematics');
assert.strictEqual(expandFactoredIntent(rawAgain,opts).signature,laterSignature);

// The same relations can later become warranted again from another live space.
// The old factored intent needs no semantic rebinding: its signatures become
// live again; the raw-expanded version can also be refactored back into them.
const D=V('D'),E=V('E'),Z=V('Z');
const d1=[subset(D,Z),neq(D,E),le(card(D),card(Z))];
const d2=[subset(D,Z),neq(D,E),eq(card(E),card(Z))];
proposeMathAlternative(L,'muD',{id:'hd1',expressions:d1,source:'opaque-proposer'});
proposeMathAlternative(L,'muD',{id:'hd2',expressions:d2,source:'opaque-proposer'});
contactMathSpace(L,'muD',[...d1,d2[2]],{id:'muD-broad-contact',complete:true},{autoRefine:false});
assert.strictEqual(currentMathSpace(L,'muD').status,'ambiguous');
assert.strictEqual(inspectFactoredIntent(L,factored,opts).factoring_current,true,'old relation handles did not revive from live structure');
const compactAgain=refreshIntentFactorization(L,rawAgain,opts);
assert.strictEqual(compactAgain.relation_uses,2,'corrected field did not refactor higher intent back through live relations');
assert.strictEqual(compactAgain.source_signature,laterSignature);

// Graph-only candidates have no proposer-side source expressions. Their exact
// bounded common graph remains useful discovery structure, but arbitrary graph
// fragments are not promoted to stabilized mathematical relations merely because
// the same serialization fragment recurs.
const R=V('R'),S=V('S'),T=V('T');
const g1=compileMathGraph([subset(R,T),lt(card(R),card(T))]);
const g2=compileMathGraph([subset(R,T),eq(card(R),card(S))]);
proposeMathAlternative(L,'muC',{id:'hc1',graph:g1,source:'graph-only'});
proposeMathAlternative(L,'muC',{id:'hc2',graph:g2,source:'graph-only'});
contactMathSpace(L,'muC',[subset(R,T),lt(card(R),card(T)),eq(card(R),card(S))],{id:'muC-contact',complete:true},{autoRefine:false});
const sC=stabilizedIntent(L,'muC',opts);
assert.strictEqual(sC.status,'ambiguous');
assert.strictEqual(sC.common_core.search_complete,true);
assert.strictEqual(sC.stabilized_relations.length,0,'graph-only fragment was promoted without a complete relation representation');
assert(sC.provisional_invariants.some(x=>x.kind==='maximum-common-structural-core'),'graph-only ambiguity exposed no provisional structural core');
const fieldWithGraphOnly=universalRelationField(L,opts);
const muCView=fieldWithGraphOnly.spaces.find(x=>x.space==='muC');
assert(muCView&&muCView.stabilized_relations.length===0,'universal relation field promoted graph-only structural fragment');

// Bounded search failure is explicit. A tiny state budget must never return a
// guessed pseudo-core and call it stabilized meaning.
const hard1=compileMathGraph([lt(card(V('a')),card(V('u')))]);
const hard2=compileMathGraph([eq(card(V('a')),card(V('u')))]);
const bounded=maximumCommonSubgraphs([hard1,hard2],{maxCoreStates:1});
assert.strictEqual(bounded.complete,false);
assert.strictEqual(bounded.cores.length,0);

const pure=JSON.stringify({
  muA:{status:sA.status,relations:sA.stabilized_relations.map(x=>x.signature)},
  muB:{status:sB.status,relations:sB.stabilized_relations.map(x=>x.signature)},
  factor:{relation_signatures:factored.relation_signatures,roots:factored.roots.map(x=>x.kind)},
  field:universalRelationField(L,opts).relations.map(x=>({signature:x.signature,occurrence_count:x.occurrence_count}))
}).toLowerCase();
for(const semantic of ['belief','desire','intention','promise','obligation'])assert(!pure.includes(semantic));

const report={
  ambiguous_whole_can_contain_warranted_stable_relations:true,
  stable_relations_survive_variable_renaming:true,
  recurrent_structure_unifies_across_different_intent_spaces:true,
  later_intent_reuses_stabilized_relations_as_live_dependencies:true,
  factorization_preserves_exact_intent_math:true,
  lower_relation_correction_reopens_higher_intent_factorization:true,
  higher_intent_survives_by_expanding_stale_handles_to_raw_math:true,
  restored_relation_structure_refactors_higher_intent_without_semantic_rebinding:true,
  surface_can_expose_partial_stable_math_before_whole_resolution:true,
  discriminating_contact_resolves_whole_without_erasing_recurring_lower_relations:true,
  incomplete_contact_remains_unknown:true,
  graph_only_structural_core_remains_provisional:true,
  bounded_search_never_guesses_on_truncation:true,
  semantic_family_labels_in_stabilization_or_reuse:0,
  whole:L.whole
};
console.log(JSON.stringify(report,null,2));
console.log('UNIVERSAL INTENT STABILIZATION + REUSE TEST: PASS');