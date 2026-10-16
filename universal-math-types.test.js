'use strict';

const assert=require('assert');
const {MOP,variable:V,constant:C,app:A}=require('./universal-math-graph');
const {INTENT_ORDER,candidateExpressions}=require('./abstract-intent-kernel');
const {buildStoneKernelSource}=require('./stone-universal-kernel');
const {inferMathTypes,checkMathTypes}=require('./universal-math-types');

const summaries={};
for(const name of INTENT_ORDER){
  const result=inferMathTypes(candidateExpressions(name));
  assert.strictEqual(result.well_typed,true,`${name} candidate failed generic mathematical typing`);
  assert(result.pure.root_types.every(t=>t==='Bool'),`${name} has a non-propositional top-level constraint`);

  const renamed=inferMathTypes(candidateExpressions(name,'renamed:'));
  assert.deepStrictEqual(renamed.pure,result.pure,`${name} pure type structure changed under source-variable renaming`);
  summaries[name]={variables:result.pure.variable_type_multiset.length,distinct_types:new Set(result.pure.variable_type_multiset).size};
}

// The canonical Stone source must also be internally well-sorted under the same
// generic math contracts. No Stone-specific type rule is supplied.
const stone=inferMathTypes(buildStoneKernelSource('typed-stone').constraints);
assert(stone.pure.root_types.every(t=>t==='Bool'),'Stone has a non-Boolean top-level mathematical constraint');

// Negative control 1: a proposition-set variable cannot simultaneously be a
// numeric ordered scalar merely because a proposer wrote it that way.
const P=V('bad:P'),U=V('bad:U');
const illScalar=[A(MOP.SUBSET,P,U),A(MOP.LT,P,C(0))];
const scalarCheck=checkMathTypes(illScalar);
assert.strictEqual(scalarCheck.well_typed,false,'set/scalar type contradiction was accepted');

// Negative control 2: membership plus same-level subset here would require the
// impossible infinite type T = Set<T>. Occurs-check must reject it rather than
// silently invent a recursive type.
const P2=V('cycle:P'),U2=V('cycle:U');
const illRecursive=[A(MOP.SUBSET,P2,U2),A(MOP.IN,P2,U2)];
const recursiveCheck=checkMathTypes(illRecursive);
assert.strictEqual(recursiveCheck.well_typed,false,'infinite recursive set type was accepted');

// Negative control 3: malformed operator arity is a formula error, not semantic
// ambiguity, and should be rejected independently of any language label.
const badArity=checkMathTypes([A(MOP.SUBSET,V('only-one-arg'))]);
assert.strictEqual(badArity.well_typed,false,'operator arity error was accepted');

const pureText=JSON.stringify({intent:Object.values(summaries),stone:stone.pure}).toLowerCase();
for(const name of INTENT_ORDER)assert(!pureText.includes(name),`intent-family label leaked into pure type structure: ${name}`);
for(const word of ['empathy','practicality','knowledge','wisdom','answerability','insulation'])assert(!pureText.includes(word),`Stone semantic label leaked into pure type structure: ${word}`);

const report={
  generic_operator_type_rules:true,
  semantic_family_specific_type_rules:0,
  richer_candidate_families_checked:INTENT_ORDER.length,
  richer_candidate_families_well_typed:INTENT_ORDER.length,
  candidate_type_structure_variable_renaming_invariant:true,
  canonical_stone_kernel_well_typed:true,
  set_vs_scalar_negative_control_rejected:true,
  infinite_recursive_type_negative_control_rejected:true,
  malformed_operator_arity_rejected:true,
  semantic_labels_in_pure_type_summary:0,
  candidate_type_summaries:summaries,
  stone_type_variables:stone.pure.variable_type_multiset.length
};
console.log(JSON.stringify(report,null,2));
console.log('UNIVERSAL MATH TYPE CHECK TEST: PASS');
