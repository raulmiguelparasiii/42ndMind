'use strict';

const assert=require('assert');
const {
  MOP, compileMathGraph, equivalentMathSystems
}=require('./universal-math-graph');
const {
  INTENT_ORDER,candidateExpressions,compileIntentCandidates,anonymousIntentBasis,
  recurringConstraintMotifs,equivalentCandidateUnderRename
}=require('./abstract-intent-kernel');

function ops(expr,out=[]){
  if(expr && expr.kind==='app'){
    out.push(expr.op);
    for(const a of expr.args) ops(a,out);
  }
  return out;
}
function familyOps(name){return candidateExpressions(name).flatMap(e=>ops(e,[]));}
function constraintSignatures(name){
  return new Set(candidateExpressions(name).map(e=>compileMathGraph([e]).signature));
}
function subsetOf(A,B){for(const x of A) if(!B.has(x)) return false; return true;}

const compiled=compileIntentCandidates();
assert.strictEqual(compiled.length,13);
assert.strictEqual(new Set(compiled.map(x=>x.graph.signature)).size,13,'candidate families collapsed');

for(const name of INTENT_ORDER){
  const renamed=equivalentCandidateUnderRename(name);
  assert(renamed.equivalent,`${name} changed under arbitrary variable renaming`);
  const xs=candidateExpressions(name);
  assert(equivalentMathSystems(xs,xs.slice().reverse()).equivalent,`${name} changed under constraint order`);
}

const pure=anonymousIntentBasis();
const pureText=JSON.stringify(pure).toLowerCase();
for(const word of INTENT_ORDER) assert(!pureText.includes(word),`semantic family label leaked into pure object: ${word}`);

const recurring=recurringConstraintMotifs(2);
assert(recurring.length>=3,'expected several recurring anonymous mathematical constraints');
assert(recurring[0].family_count>=10,'expected at least one broad cross-family mathematical relation');

// Structural reuse: richer families literally preserve the mathematical
// constraints of simpler candidate cores and add further relations.
const desireS=constraintSignatures('desire');
const intendS=constraintSignatures('intend');
assert(subsetOf(desireS,intendS),'intention candidate should preserve desire-ranking core');
assert(intendS.size>desireS.size,'intention must add action-realization structure beyond desire');

const doubtS=constraintSignatures('doubt');
assert(subsetOf(doubtS,constraintSignatures('consider')),'consideration should preserve unresolved possibility partition');
assert(subsetOf(doubtS,constraintSignatures('question')),'yes/no question should preserve unresolved possibility partition');

// Critical neighboring distinctions. These are candidate-anatomy distinctions,
// not claims that the final decompositions can never be revised.
const sig=Object.fromEntries(compiled.map(x=>[INTENT_ORDER[x.index],x.graph.signature]));
for(const [a,b] of [
  ['belief','doubt'],['belief','assertion'],['doubt','consider'],['consider','imagine'],
  ['desire','intend'],['question','assertion'],['command','promise'],
  ['promise','obligation'],['infer','assertion'],['remember','belief']
]) assert.notStrictEqual(sig[a],sig[b],`${a} and ${b} collapsed`);

// Some semantic non-identities have concrete generic-math witnesses.
assert(!familyOps('belief').includes(MOP.TRANSITION),'belief candidate should not itself be a public/state transition');
assert(familyOps('assertion').includes(MOP.TRANSITION),'assertion candidate should alter a public claim state');
assert(!familyOps('desire').includes(MOP.TRANSITION),'desire candidate should not by itself commit an action transition');
assert(familyOps('promise').includes(MOP.TRANSITION),'promise candidate should create a commitment-state transition');
assert(familyOps('question').includes(MOP.INTERSECT),'question candidate should preserve the unresolved proposition partition');
assert(familyOps('intend').includes(MOP.APPLY) && familyOps('intend').includes(MOP.SUBSET),'intention candidate should contain action-to-outcome realization structure');

const summary={
  candidate_families:INTENT_ORDER.length,
  candidate_status:'proposed_corrigible_anatomy',
  distinct_anonymous_math_structures:new Set(compiled.map(x=>x.graph.signature)).size,
  semantic_family_labels_in_pure_object:0,
  all_variable_renaming_invariant:true,
  all_constraint_order_invariant:true,
  recurring_anonymous_constraint_motifs:recurring.length,
  broadest_recurring_motif_family_count:recurring[0].family_count,
  desire_core_preserved_inside_intention:true,
  doubt_core_preserved_inside_consideration_and_question:true,
  belief_not_assertion:true,
  desire_not_intention:true,
  question_not_assertion:true,
  command_not_promise:true,
  promise_not_obligation:true,
  inference_not_assertion:true,
  memory_not_belief:true,
  pure_graph_vertices_total:compiled.reduce((n,x)=>n+x.graph.vertex_count,0)
};
console.log(JSON.stringify(summary,null,2));
console.log('ABSTRACT INTENT KERNEL TEST: PASS');
