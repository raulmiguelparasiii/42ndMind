'use strict';

const assert=require('assert');
const {MOP}=require('./universal-math-graph');
const {inferMathTypes}=require('./universal-math-types');
const {INTENT_ORDER,candidateExpressions,candidateComposition}=require('./abstract-intent-kernel');
const {
  oneMathHypothesisLedger,proposeMath,contactMath,reviseMath,currentMathHypothesis
}=require('./math-hypotheses');
const {
  oneRecursiveIntentState,addAtom,addClause,buildRecursiveSource,
  compileRecursiveIntent,anonymousRecursiveIntent,helpers
}=require('./recursive-intent-composition');

const H=Object.freeze(Object.fromEntries(INTENT_ORDER.map((name,i)=>[name.toUpperCase(),`h${i}`])));

function refinedExpressions(name){
  const spec=candidateComposition(name);
  return candidateExpressions(name).concat([
    helpers.subset(helpers.V('corrigible_probe'),helpers.V(spec.universe)),
    helpers.neq(helpers.V('corrigible_probe'),helpers.V(spec.content))
  ]);
}

// The live ledger is the sole correction/status authority. Each initial
// candidate is supported by a slightly larger contact that also supports the
// later generic refinement, allowing revision propagation to be tested without
// inventing a second recursive correction path.
function makeLedger(){
  const L=oneMathHypothesisLedger();
  INTENT_ORDER.forEach((name,i)=>{
    const id=`h${i}`;
    proposeMath(L,{
      id,
      expressions:candidateExpressions(name),
      composition:candidateComposition(name),
      source:'candidate-proposer'
    });
    contactMath(L,refinedExpressions(name),{id:`support-${i}`,candidates:[id],complete:true});
    assert.strictEqual(L.candidates[id].status,'supported',`candidate ${i} did not become supported`);
    assert.strictEqual(L.candidates[id].usable,true,`candidate ${i} not usable`);
  });
  return L;
}

function makeFlat(L,hypothesis,subject='a',namespace=''){
  const S=oneRecursiveIntentState();
  addAtom(S,'p','p');
  addClause(S,'root',{hypothesis,subject,content:'p'});
  return {S,compiled:compileRecursiveIntent(S,L,'root',{namespace})};
}

function makeNested(L,outerHypothesis,innerHypothesis,{outerSubject='a',innerSubject='b',namespace='',ids=['p','inner','root']}={}){
  const [p,inner,root]=ids;
  const S=oneRecursiveIntentState();
  addAtom(S,p,'p');
  addClause(S,inner,{hypothesis:innerHypothesis,subject:innerSubject,content:p});
  addClause(S,root,{hypothesis:outerHypothesis,subject:outerSubject,content:inner});
  return {S,p,inner,root,compiled:compileRecursiveIntent(S,L,root,{namespace})};
}

function makeNestedSource(L,outerHypothesis,innerHypothesis,{outerSubject='a',innerSubject='b'}={}){
  const S=oneRecursiveIntentState();
  addAtom(S,'p','p');
  addClause(S,'inner',{hypothesis:innerHypothesis,subject:innerSubject,content:'p'});
  addClause(S,'root',{hypothesis:outerHypothesis,subject:outerSubject,content:'inner'});
  return {S,source:buildRecursiveSource(S,L,'root')};
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

const L=makeLedger();
assert.strictEqual(Object.keys(L.candidates).length,INTENT_ORDER.length);

const flatBelief=makeFlat(L,H.BELIEF).compiled;
const beliefDoubt=makeNested(L,H.BELIEF,H.DOUBT);
const doubtBelief=makeNested(L,H.DOUBT,H.BELIEF);

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

// 4. Every current candidate anatomy can be used as a recursive clause. Flat
// candidate graphs stay distinct, while each family can take a full belief
// formula as nested content without family-specific recursion code.
const flatSignatures=new Set();
for(let i=0;i<INTENT_ORDER.length;i++){
  const id=`h${i}`;
  const flat=makeFlat(L,id,`agent-${i}`).compiled;
  assert.strictEqual(inferMathTypes(flat.source.expressions).well_typed,true,`flat candidate ${i} ill-typed`);
  flatSignatures.add(flat.graph.signature);

  const nested=makeNestedSource(L,id,H.BELIEF,{outerSubject:`outer-${i}`,innerSubject:'inner-agent'}).source;
  assert.strictEqual(nested.depth,2);
  assert.strictEqual(inferMathTypes(nested.expressions).well_typed,true,`nested candidate ${i} ill-typed`);
  assert(containsEmbeddedObject(nested.root.formula,nested.node_formulas.inner),`candidate ${i} did not structurally embed child`);
}
assert.strictEqual(flatSignatures.size,INTENT_ORDER.length);

// 5. Arbitrary source/node/agent names do not determine mathematical identity.
const renamed=makeNested(L,H.BELIEF,H.DOUBT,{
  outerSubject:'x7',innerSubject:'y9',namespace:'renamed:',ids:['leaf9','inside4','outside2']
}).compiled;
assert.strictEqual(renamed.graph.signature,beliefDoubt.compiled.graph.signature);

// 6. Identity sharing itself does matter: one subject recursively entertaining
// another stance is not the same graph as two declared-distinct subjects.
const sameSubject=makeNested(L,H.BELIEF,H.DOUBT,{outerSubject:'a',innerSubject:'a'}).compiled;
assert.notStrictEqual(sameSubject.graph.signature,beliefDoubt.compiled.graph.signature);

// 7. Recursion is not hard-coded to one nesting depth or pair of candidates.
// The heterogeneous depth-six source is built and type-checked directly; exact
// graph canonicalization remains a separate bounded graph-isomorphism procedure.
const deep=oneRecursiveIntentState();
addAtom(deep,'p','p');
let child='p';
const deepIds=[H.BELIEF,H.QUESTION,H.DESIRE,H.COMMAND,H.REMEMBER,H.OBLIGATION];
for(let i=0;i<deepIds.length;i++){
  const id=`n${i}`;
  addClause(deep,id,{hypothesis:deepIds[i],subject:`s${i}`,content:child});
  child=id;
}
const deepSource=buildRecursiveSource(deep,L,child);
assert.strictEqual(deepSource.depth,6);
assert(expressionSize(deepSource.root_formula)>expressionSize(beliefDoubt.compiled.source.root_formula));
assert.strictEqual(inferMathTypes(deepSource.expressions).well_typed,true);

// 8. Corrigibility propagates from the AUTHORITATIVE math-hypothesis ledger.
// There are no recursive-specific revision/status calls. Revise only the inner
// live hypothesis; the enclosing node stays byte-for-byte unchanged while its
// compiled mathematics changes. Repeat across all thirteen candidates.
let correctedFamilies=0;
for(let i=0;i<INTENT_ORDER.length;i++){
  const name=INTENT_ORDER[i], innerId=`h${i}`;
  const outerId=innerId===H.BELIEF?H.DOUBT:H.BELIEF;
  const x=makeNestedSource(L,outerId,innerId,{outerSubject:'outer',innerSubject:'inner'});
  const outerBefore=JSON.stringify(x.S.nodes.root);
  const sourceBefore=JSON.stringify(x.source.root_formula);

  const revised=reviseMath(L,innerId,{expressions:refinedExpressions(name)},'authoritative refinement');
  assert.strictEqual(revised.status,'supported',`revised candidate ${i} lost its seeded support`);
  assert.strictEqual(revised.usable,true,`revised candidate ${i} not usable`);
  const changed=buildRecursiveSource(x.S,L,'root');
  assert.notStrictEqual(JSON.stringify(changed.root_formula),sourceBefore,`candidate ${i} revision did not propagate`);
  assert.strictEqual(inferMathTypes(changed.expressions).well_typed,true,`revised candidate ${i} ill-typed`);
  assert.strictEqual(JSON.stringify(x.S.nodes.root),outerBefore,`outer node changed for candidate ${i}`);

  const reverted=reviseMath(L,innerId,{expressions:candidateExpressions(name)},'authoritative revert');
  assert.strictEqual(reverted.status,'supported',`candidate ${i} did not regain supported state`);
  const restored=buildRecursiveSource(x.S,L,'root');
  assert.strictEqual(JSON.stringify(restored.root_formula),sourceBefore,`candidate ${i} failed to restore`);
  assert.strictEqual(JSON.stringify(x.S.nodes.root),outerBefore,`outer node changed on restore for candidate ${i}`);
  correctedFamilies++;
}
assert.strictEqual(correctedFamilies,INTENT_ORDER.length);

// 9. Defeat/contestation in the same ledger suspends enclosing composition.
// Restore through the ledger and the old enclosing node resolves again.
const suspended=makeNested(L,H.BELIEF,H.PROMISE);
const suspendBefore=suspended.compiled.graph.signature;
const suspendOuter=JSON.stringify(suspended.S.nodes[suspended.root]);
reviseMath(L,H.PROMISE,{expressions:refinedExpressions('promise')},'refine before counterevidence');
contactMath(L,candidateExpressions('promise','counter:'),{
  id:'promise-complete-countercontact',candidates:[H.PROMISE],complete:true
});
assert.strictEqual(L.candidates[H.PROMISE].status,'contested');
assert.strictEqual(L.candidates[H.PROMISE].usable,false);
assert.throws(()=>compileRecursiveIntent(suspended.S,L,suspended.root),/not currently usable/);
assert.strictEqual(JSON.stringify(suspended.S.nodes[suspended.root]),suspendOuter);
reviseMath(L,H.PROMISE,{expressions:candidateExpressions('promise')},'restore candidate through authority');
assert.strictEqual(L.candidates[H.PROMISE].status,'supported');
assert.strictEqual(L.candidates[H.PROMISE].usable,true);
assert.strictEqual(compileRecursiveIntent(suspended.S,L,suspended.root).graph.signature,suspendBefore);
assert.strictEqual(JSON.stringify(suspended.S.nodes[suspended.root]),suspendOuter);

// 10. A graph-only authoritative revision must not keep stale source/template
// scaffolding. Composition becomes explicitly unavailable until source math is
// restored through the same ledger.
const graphOnly=makeNested(L,H.BELIEF,H.QUESTION);
const questionGraph=currentMathHypothesis(L,H.QUESTION).graph;
reviseMath(L,H.QUESTION,questionGraph,'graph-only revision');
assert.throws(()=>compileRecursiveIntent(graphOnly.S,L,graphOnly.root),/no current source expressions/);
reviseMath(L,H.QUESTION,{
  expressions:candidateExpressions('question'),
  composition:candidateComposition('question')
},'restore source representation');
assert.strictEqual(L.candidates[H.QUESTION].usable,true);
assert.strictEqual(compileRecursiveIntent(graphOnly.S,L,graphOnly.root).graph.signature,graphOnly.compiled.graph.signature);

// 11. Cycles stay explicit errors rather than disappearing into nontermination.
const cyclic=oneRecursiveIntentState();
addClause(cyclic,'a',{hypothesis:H.BELIEF,subject:'x',content:'b'});
addClause(cyclic,'b',{hypothesis:H.DOUBT,subject:'y',content:'a'});
assert.throws(()=>compileRecursiveIntent(cyclic,L,'a'),/cycle/);

// 12. Pure mathematical output contains no family names, subject names, node
// names, proposition token, hypothesis IDs, or embedded signature string.
const rich=makeNested(L,H.PROMISE,H.INTEND,{outerSubject:'speaker-x',innerSubject:'agent-y'});
const pure=anonymousRecursiveIntent(rich.S,L,rich.root);
const pureText=JSON.stringify(pure).toLowerCase();
for(const forbidden of [...INTENT_ORDER,'alice','bob','inner','root','atom:p','subject:a','subject:b','speaker-x','agent-y',...Object.values(H)]){
  assert(!pureText.includes(forbidden),`pure recursive math leaked ${forbidden}`);
}
assert.strictEqual(pure.whole,1);

// 13. The recursive state itself contains no copied candidate definitions,
// revision counters, or local active/status authority.
const stateText=JSON.stringify(rich.S);
assert(!stateText.includes('definitions'));
assert(!stateText.includes('active'));
assert(!stateText.includes('template'));
assert(!stateText.includes('definition_revision'));
assert.strictEqual(Object.prototype.hasOwnProperty.call(rich.S,'definitions'),false);

console.log('RECURSIVE INTENT COMPOSITION TEST: PASS');
console.log(JSON.stringify({
  candidate_hypotheses:INTENT_ORDER.length,
  distinct_flat_candidate_graphs:flatSignatures.size,
  all_candidates_accept_recursive_content:true,
  all_candidates_corrected_through_live_ledger:correctedFamilies===INTENT_ORDER.length,
  recursive_local_correction_authority:false,
  authoritative_defeat_suspends_dependents:true,
  authoritative_restore_recovers_dependents:true,
  graph_only_revision_cannot_reuse_stale_template:true,
  flat_belief_vertices:flatBelief.graph.vertex_count,
  belief_of_doubt_vertices:beliefDoubt.compiled.graph.vertex_count,
  doubt_of_belief_vertices:doubtBelief.compiled.graph.vertex_count,
  recursive_order_distinct:true,
  alpha_rename_invariant:true,
  same_vs_distinct_subjects_distinct:true,
  inner_formula_embedded_by_structure:true,
  outer_node_edited_during_inner_revision:false,
  heterogeneous_depth_six_source_built_and_typed:true,
  semantic_labels_in_pure_graph:0,
  whole:pure.whole
},null,2));
