'use strict';

const assert=require('assert');
const {MOP}=require('./universal-math-graph');
const {inferMathTypes}=require('./universal-math-types');
const {INTENT_ORDER}=require('./abstract-intent-kernel');
const {
  DEF,oneRecursiveIntentState,addAtom,addClause,reviseDefinition,setDefinitionActive,
  defaultDefinitionTemplate,recursiveIntentLegend,buildRecursiveSource,compileRecursiveIntent,
  anonymousRecursiveIntent,helpers
}=require('./recursive-intent-composition');

function makeFlat(definition,subject='a',namespace=''){
  const S=oneRecursiveIntentState();
  addAtom(S,'p','p');
  addClause(S,'root',{definition,subject,content:'p'});
  return {S,compiled:compileRecursiveIntent(S,'root',{namespace})};
}

function makeNested(outerDef,innerDef,{outerSubject='a',innerSubject='b',namespace='',ids=['p','inner','root']}={}){
  const [p,inner,root]=ids;
  const S=oneRecursiveIntentState();
  addAtom(S,p,'p');
  addClause(S,inner,{definition:innerDef,subject:innerSubject,content:p});
  addClause(S,root,{definition:outerDef,subject:outerSubject,content:inner});
  return {S,p,inner,root,compiled:compileRecursiveIntent(S,root,{namespace})};
}

function makeNestedSource(outerDef,innerDef,{outerSubject='a',innerSubject='b'}={}){
  const S=oneRecursiveIntentState();
  addAtom(S,'p','p');
  addClause(S,'inner',{definition:innerDef,subject:innerSubject,content:'p'});
  addClause(S,'root',{definition:outerDef,subject:outerSubject,content:'inner'});
  return {S,source:buildRecursiveSource(S,'root')};
}

function walk(expr,fn){
  fn(expr);
  if(expr&&expr.kind==='app')expr.args.forEach(x=>walk(x,fn));
}

function expressionSize(expr){let n=0;walk(expr,()=>n++);return n;}

function containsEmbeddedObject(expr,target){
  let found=false;
  walk(expr,x=>{
    if(x&&x.kind==='app'&&x.op===MOP.QUOTE&&x.args[0]===target)found=true;
  });
  return found;
}

assert.strictEqual(Object.keys(DEF).length,INTENT_ORDER.length);
assert.strictEqual(Object.keys(recursiveIntentLegend()).length,INTENT_ORDER.length);

const flatBelief=makeFlat(DEF.BELIEF).compiled;
const beliefDoubt=makeNested(DEF.BELIEF,DEF.DOUBT);
const doubtBelief=makeNested(DEF.DOUBT,DEF.BELIEF);

// 1. Recursive order is mathematical structure, not a surface string.
assert.notStrictEqual(flatBelief.graph.signature,beliefDoubt.compiled.graph.signature);
assert.notStrictEqual(beliefDoubt.compiled.graph.signature,doubtBelief.compiled.graph.signature);
assert(beliefDoubt.compiled.graph.vertex_count>flatBelief.graph.vertex_count);
assert(doubtBelief.compiled.graph.vertex_count>flatBelief.graph.vertex_count);

// 2. The inner formula is literally embedded under QUOTE in the outer formula.
// It is not represented by its family name, a copied signature, or a hash.
const source=beliefDoubt.compiled.source;
assert(source.node_formulas[beliefDoubt.inner]);
assert(containsEmbeddedObject(source.root.formula,source.node_formulas[beliefDoubt.inner]));

// 3. All recursively composed source mathematics remains well-sorted under the
// same generic type system used for the other Universal-Language candidates.
assert.strictEqual(inferMathTypes(flatBelief.source.expressions).well_typed,true);
assert.strictEqual(inferMathTypes(beliefDoubt.compiled.source.expressions).well_typed,true);
assert.strictEqual(inferMathTypes(doubtBelief.compiled.source.expressions).well_typed,true);

// 4. Every current candidate anatomy can now be used as a recursive clause.
// Flat candidate graphs stay distinct, while each family can also take a full
// belief formula as nested content without family-specific recursion code.
const flatSignatures=new Set();
for(let i=0;i<INTENT_ORDER.length;i++){
  const flat=makeFlat(i,`agent-${i}`).compiled;
  assert.strictEqual(inferMathTypes(flat.source.expressions).well_typed,true,`flat definition ${i} ill-typed`);
  flatSignatures.add(flat.graph.signature);

  const nested=makeNestedSource(i,DEF.BELIEF,{outerSubject:`outer-${i}`,innerSubject:'inner-agent'}).source;
  assert.strictEqual(nested.depth,2);
  assert.strictEqual(inferMathTypes(nested.expressions).well_typed,true,`nested definition ${i} ill-typed`);
  assert(containsEmbeddedObject(nested.root.formula,nested.node_formulas.inner),`definition ${i} did not structurally embed child`);
}
assert.strictEqual(flatSignatures.size,INTENT_ORDER.length);

// 5. Arbitrary source/node/agent names do not determine mathematical identity.
const renamed=makeNested(DEF.BELIEF,DEF.DOUBT,{
  outerSubject:'x7',innerSubject:'y9',namespace:'renamed:',ids:['leaf9','inside4','outside2']
}).compiled;
assert.strictEqual(renamed.graph.signature,beliefDoubt.compiled.graph.signature);

// 6. Identity sharing itself does matter: one subject recursively entertaining
// another stance is not the same graph as two declared-distinct subjects.
const sameSubject=makeNested(DEF.BELIEF,DEF.DOUBT,{outerSubject:'a',innerSubject:'a'}).compiled;
assert.notStrictEqual(sameSubject.graph.signature,beliefDoubt.compiled.graph.signature);

// 7. Recursion is not hard-coded to one nesting depth or to one pair of families.
// The heterogeneous depth-six source is built and type-checked directly; exact
// graph canonicalization remains a separate bounded graph-isomorphism procedure.
const deep=oneRecursiveIntentState();
addAtom(deep,'p','p');
let child='p';
const deepDefs=[DEF.BELIEF,DEF.QUESTION,DEF.DESIRE,DEF.COMMAND,DEF.REMEMBER,DEF.OBLIGATION];
for(let i=0;i<deepDefs.length;i++){
  const id=`n${i}`;
  addClause(deep,id,{definition:deepDefs[i],subject:`s${i}`,content:child});
  child=id;
}
const deepSource=buildRecursiveSource(deep,child);
assert.strictEqual(deepSource.depth,6);
assert(expressionSize(deepSource.root_formula)>expressionSize(beliefDoubt.compiled.source.root_formula));
assert.strictEqual(inferMathTypes(deepSource.expressions).well_typed,true);

// 8. Definition correction is live. Revise only the inner anonymous relation;
// the outer node is untouched, yet recompilation of the outer whole changes.
const live=makeNested(DEF.BELIEF,DEF.DOUBT);
const outerRecordBefore=JSON.stringify(live.S.nodes[live.root]);
const beforeOuter=compileRecursiveIntent(live.S,live.root).graph.signature;
const beforeInner=compileRecursiveIntent(live.S,live.inner).graph.signature;
const refined=defaultDefinitionTemplate(DEF.DOUBT).concat([
  helpers.subset(helpers.V('K2'),helpers.V('@universe')),
  helpers.neq(helpers.V('K'),helpers.V('K2'))
]);
reviseDefinition(live.S,DEF.DOUBT,refined,'generic structural refinement');
const afterOuter=compileRecursiveIntent(live.S,live.root).graph.signature;
const afterInner=compileRecursiveIntent(live.S,live.inner).graph.signature;
assert.notStrictEqual(afterInner,beforeInner);
assert.notStrictEqual(afterOuter,beforeOuter);
assert.strictEqual(JSON.stringify(live.S.nodes[live.root]),outerRecordBefore);
assert.strictEqual(inferMathTypes(buildRecursiveSource(live.S,live.root).expressions).well_typed,true);

// Reverting the inner definition restores the old composite without touching
// or retraining the outer node.
reviseDefinition(live.S,DEF.DOUBT,defaultDefinitionTemplate(DEF.DOUBT),'revert');
assert.strictEqual(compileRecursiveIntent(live.S,live.root).graph.signature,beforeOuter);
assert.strictEqual(JSON.stringify(live.S.nodes[live.root]),outerRecordBefore);

// 9. Corrigibility is generic across all thirteen proposals. Every definition
// can be structurally revised and reverted while its enclosing clause remains
// untouched. This checks the shared mechanism rather than adding family-specific
// correction branches.
let corrigibleFamilies=0;
for(let i=0;i<INTENT_ORDER.length;i++){
  const x=makeNestedSource(DEF.BELIEF,i,{outerSubject:'outer',innerSubject:'inner'});
  const outerBefore=JSON.stringify(x.S.nodes.root);
  const sourceBefore=JSON.stringify(x.source.root_formula);
  const probe=defaultDefinitionTemplate(i).concat([
    helpers.subset(helpers.V('corrigible_probe'),helpers.V('@universe')),
    helpers.neq(helpers.V('corrigible_probe'),helpers.V('@content'))
  ]);
  reviseDefinition(x.S,i,probe,'corrigibility probe');
  const changed=buildRecursiveSource(x.S,'root');
  assert.notStrictEqual(JSON.stringify(changed.root_formula),sourceBefore,`definition ${i} did not propagate correction`);
  assert.strictEqual(inferMathTypes(changed.expressions).well_typed,true,`corrected definition ${i} ill-typed`);
  assert.strictEqual(JSON.stringify(x.S.nodes.root),outerBefore,`outer node changed for definition ${i}`);
  reviseDefinition(x.S,i,defaultDefinitionTemplate(i),'revert corrigibility probe');
  const reverted=buildRecursiveSource(x.S,'root');
  assert.strictEqual(JSON.stringify(reverted.root_formula),sourceBefore,`definition ${i} failed to restore`);
  assert.strictEqual(JSON.stringify(x.S.nodes.root),outerBefore,`outer node changed on restore for definition ${i}`);
  corrigibleFamilies++;
}
assert.strictEqual(corrigibleFamilies,INTENT_ORDER.length);

// 10. A proposal can also be suspended/defeated rather than silently remaining
// authoritative. Any enclosing composition then becomes unavailable until that
// definition is restored; restoring it recovers the old math without touching
// the enclosing node.
const suspend=makeNested(DEF.BELIEF,DEF.PROMISE);
const suspendBefore=suspend.compiled.graph.signature;
const suspendOuter=JSON.stringify(suspend.S.nodes[suspend.root]);
setDefinitionActive(suspend.S,DEF.PROMISE,false,'counterevidence');
assert.throws(()=>compileRecursiveIntent(suspend.S,suspend.root),/inactive recursive definition/);
assert.strictEqual(JSON.stringify(suspend.S.nodes[suspend.root]),suspendOuter);
setDefinitionActive(suspend.S,DEF.PROMISE,true,'restored support');
assert.strictEqual(compileRecursiveIntent(suspend.S,suspend.root).graph.signature,suspendBefore);
assert.strictEqual(JSON.stringify(suspend.S.nodes[suspend.root]),suspendOuter);

// 11. Cycles stay explicit errors rather than disappearing into nontermination.
const cyclic=oneRecursiveIntentState();
addClause(cyclic,'a',{definition:DEF.BELIEF,subject:'x',content:'b'});
addClause(cyclic,'b',{definition:DEF.DOUBT,subject:'y',content:'a'});
assert.throws(()=>compileRecursiveIntent(cyclic,'a'),/cycle/);

// 12. Pure mathematical output contains no family names, subject names, node
// names, proposition token, or embedded signature string.
const rich=makeNested(DEF.PROMISE,DEF.INTEND,{outerSubject:'speaker-x',innerSubject:'agent-y'});
const pure=anonymousRecursiveIntent(rich.S,rich.root);
const pureText=JSON.stringify(pure).toLowerCase();
for(const forbidden of [...INTENT_ORDER,'alice','bob','inner','root','atom:p','subject:a','subject:b','speaker-x','agent-y']){
  assert(!pureText.includes(forbidden),`pure recursive math leaked ${forbidden}`);
}
assert.strictEqual(pure.whole,1);

console.log('RECURSIVE INTENT COMPOSITION TEST: PASS');
console.log(JSON.stringify({
  candidate_definitions:INTENT_ORDER.length,
  distinct_flat_candidate_graphs:flatSignatures.size,
  all_candidates_accept_recursive_content:true,
  all_candidates_corrigible:corrigibleFamilies===INTENT_ORDER.length,
  candidate_suspension_propagates:true,
  flat_belief_vertices:flatBelief.graph.vertex_count,
  belief_of_doubt_vertices:beliefDoubt.compiled.graph.vertex_count,
  doubt_of_belief_vertices:doubtBelief.compiled.graph.vertex_count,
  recursive_order_distinct:true,
  alpha_rename_invariant:true,
  same_vs_distinct_subjects_distinct:true,
  inner_formula_embedded_by_structure:true,
  live_inner_revision_changed_outer:true,
  outer_node_edited_during_inner_revision:false,
  reverted_inner_restored_outer:true,
  heterogeneous_depth_six_source_built_and_typed:true,
  semantic_labels_in_pure_graph:0,
  whole:pure.whole
},null,2));
