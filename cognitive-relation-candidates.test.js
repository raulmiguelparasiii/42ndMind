'use strict';

const assert=require('assert');
const {compileMathGraph}=require('./universal-math-graph');
const {checkMathTypes}=require('./universal-math-types');
const {candidateExpressions:oldIntentExpressions}=require('./abstract-intent-kernel');
const {
  oneMathHypothesisLedger,proposeMathAlternative,addMathAlternative,
  contactMathSpace,currentMathSpace,matchCompiledSubgraph
}=require('./math-hypotheses');
const {
  COGNITIVE_ORDER,candidateExpressions,compileCognitiveCandidates,
  anonymousCognitiveBasis,equivalentCandidateUnderRename
}=require('./cognitive-relation-candidates');

const opts={maxCoreStates:200000,maxMatchStates:250000,maxCanonicalStates:250000};

// These are proposer-side mathematical hypotheses. First require ordinary
// mathematical coherence, alpha-renaming invariance, and actual structural
// distinction before any language label can attach to them.
for(const name of COGNITIVE_ORDER){
  const typed=checkMathTypes(candidateExpressions(name));
  assert.strictEqual(typed.well_typed,true,`${name} candidate is ill-typed: ${typed.error||''}`);
  assert.strictEqual(equivalentCandidateUnderRename(name,'A:','B:',opts).equivalent,true,`${name} depends on variable names`);
}
const compiled=compileCognitiveCandidates(opts);
assert.strictEqual(new Set(compiled.map(x=>x.graph.signature)).size,COGNITIVE_ORDER.length,'candidate relations collapsed structurally');
const pure=anonymousCognitiveBasis(opts);
const pureText=JSON.stringify(pure).toLowerCase();
for(const name of ['memory','memorize','remember','recollect','attention','focus','intent'])assert(!pureText.includes(name),'semantic label leaked into anonymous candidate basis');

const graph=name=>compileMathGraph(candidateExpressions(name),opts);
const contains=(small,big)=>Boolean(matchCompiledSubgraph(graph(small),graph(big),opts));

// Proposed structural hierarchy/non-identities. These are falsifiable candidate
// relations, not definitions baked into runtime behavior.
assert(contains('memory','remember'),'current retrieval failed to preserve retained-history core');
assert(contains('remember','recollect'),'context-rich retrieval failed to preserve generic retrieval core');
assert(contains('memory','memorize'),'encoding failed to preserve later retained-history core');
assert(!contains('remember','memorize'),'encoding silently became current retrieval');
assert(!contains('memorize','remember'),'current retrieval silently became acquisition/encoding');
assert(contains('attention','focus'),'persistent selection failed to preserve one current-selection slice');
assert(contains('attention','broad_intent'),'directed completion failed to preserve current selection');
assert(!contains('memory','attention')&&!contains('attention','memory'),'historical retention collapsed into present selection');

// Broad intent here is deliberately not the prior action-intention candidate.
// It is a candidate for target-directed completion at a more general level.
const broad=graph('broad_intent');
const actionIntention=compileMathGraph(oldIntentExpressions('intend','legacy:'),opts);
assert.notStrictEqual(broad.signature,actionIntention.signature,'broad intent collapsed into action intention');

// Put the candidate structures through the ONE live math-space authority. These
// formal contacts test that the structural distinctions are operationally
// discriminable. They do not establish that the English words are already true.
const L=oneMathHypothesisLedger();
for(const name of COGNITIVE_ORDER){
  proposeMathAlternative(L,'all-cognitive',{
    id:`c:${name}`,expressions:candidateExpressions(name),source:'cognitive-proposer',confidence:1
  },opts);
}
assert.strictEqual(currentMathSpace(L,'all-cognitive',opts).status,'unresolved','proposer confidence resolved cognitive semantics');

function spaceWith(id,names){
  for(const name of names)addMathAlternative(L,id,`c:${name}`);
}
function contactAndResolve(id,expressions,expected){
  contactMathSpace(L,id,expressions,{id:`formal:${id}`,complete:true,kind:'formal-structural-probe'},{...opts,autoRefine:false});
  const s=currentMathSpace(L,id,opts);
  assert.strictEqual(s.status,'resolved-candidate-math',`${id} did not resolve under complete formal probe`);
  assert.strictEqual(s.hypothesis_id,`c:${expected}`,`${id} resolved to ${s.hypothesis_id} instead of ${expected}`);
  return s;
}

spaceWith('retention-only',['memory','remember','recollect']);
contactAndResolve('retention-only',candidateExpressions('memory','probe-retain:'),'memory');

spaceWith('cue-retrieval',['memory','remember','recollect']);
contactAndResolve('cue-retrieval',candidateExpressions('remember','probe-remember:'),'remember');

spaceWith('context-retrieval',['memory','remember','recollect']);
contactAndResolve('context-retrieval',candidateExpressions('recollect','probe-recollect:'),'recollect');

spaceWith('acquisition',['memory','memorize','remember']);
contactAndResolve('acquisition',candidateExpressions('memorize','probe-memorize:'),'memorize');

spaceWith('current-selection',['attention','focus','broad_intent']);
contactAndResolve('current-selection',candidateExpressions('attention','probe-attention:'),'attention');

spaceWith('persistent-selection',['attention','focus']);
contactAndResolve('persistent-selection',candidateExpressions('focus','probe-focus:'),'focus');

spaceWith('directed-completion',['attention','broad_intent']);
contactAndResolve('directed-completion',candidateExpressions('broad_intent','probe-intent:'),'broad_intent');

// The formal probe source is evidence ABOUT structure only. It cannot convert the
// external audit legend into runtime semantic authority.
for(const c of Object.values(L.candidates)){
  assert(!Object.prototype.hasOwnProperty.call(c,'semantic_family'));
  assert(!Object.prototype.hasOwnProperty.call(c,'meaning'));
}

console.log(JSON.stringify({
  candidate_relations:COGNITIVE_ORDER.length,
  distinct_anonymous_graphs:new Set(compiled.map(x=>x.graph.signature)).size,
  all_candidates_well_typed:true,
  all_candidates_alpha_invariant:true,
  retention_distinct_from_present_selection:true,
  retrieval_preserves_retention_core:true,
  recollection_adds_context_recovery:true,
  memorizing_distinct_from_remembering:true,
  focus_preserves_attention_slice_and_adds_persistence:true,
  broad_intent_preserves_attention_and_adds_target_restriction:true,
  broad_intent_distinct_from_action_intention:true,
  formal_structural_spaces_resolved:7,
  proposer_confidence_resolved_semantics:false,
  semantic_authority_added:0,
  whole:L.whole
},null,2));
console.log('COGNITIVE RELATION CANDIDATES TEST: PASS');
