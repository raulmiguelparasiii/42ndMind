'use strict';

const assert=require('assert');
const {MOP,variable:V,constant:C,app:A,compileMathGraph,equivalentMathSystems}=require('./universal-math-graph');
const {buildStoneKernelSource,compileStoneUniversalKernel}=require('./stone-universal-kernel');
const {stoneRelation,realize,sameEntityAcrossRealization}=require('./stone-referent-frame');

function walk(expr,fn){
  fn(expr);
  if(expr?.kind==='app') expr.args.forEach(x=>walk(x,fn));
}
function hasOp(expr,op){let yes=false;walk(expr,x=>{if(x?.kind==='app'&&x.op===op)yes=true;});return yes;}
function divContainsDelta(expr){
  let bad=false;
  walk(expr,x=>{
    if(x?.kind==='app'&&x.op===MOP.DIV && x.args.some(a=>hasOp(a,MOP.DELTA))) bad=true;
  });
  return bad;
}

// Generic math serialization: surface variable names and assertion order are
// irrelevant, while a real structural change remains distinguishable.
const a=V('a'),b=V('b'),x=V('x'),y=V('y');
const sysA=[A(MOP.EQ,A(MOP.ADD,a,b),C(1)),A(MOP.LE,C(0),a)];
const sysB=[A(MOP.LE,C(0),x),A(MOP.EQ,C(1),A(MOP.ADD,y,x))];
assert(equivalentMathSystems(sysA,sysB).equivalent,'alpha-renamed/reordered math systems diverged');
const sysC=[A(MOP.EQ,A(MOP.ADD,a,b),C(2)),A(MOP.LE,C(0),a)];
assert(!equivalentMathSystems(sysA,sysC).equivalent,'changed mathematical constant collapsed to same system');

const sourceA=buildStoneKernelSource('alpha');
const sourceB=buildStoneKernelSource('totally-different-surface-names');
const kA=compileMathGraph(sourceA.constraints,{maxStates:500000});
const kB=compileMathGraph(sourceB.constraints.slice().reverse(),{maxStates:500000});
assert.equal(kA.signature,kB.signature,'Stone kernel depends on variable names or constraint order');

const compiled=compileStoneUniversalKernel('compile-source');
assert.equal(compiled.pure.structures.length,7);
assert.deepEqual(compiled.pure.signed_pairs,[[0,1],[4,5],[3,2]]);
assert.equal(compiled.pure.math.signature,compileMathGraph(buildStoneKernelSource('another').constraints,{maxStates:500000}).signature);

// Pure runtime object contains anonymous math/structure only. English semantic
// labels remain audit scaffolding outside it.
const pureText=JSON.stringify(compiled.pure).toLowerCase();
for(const word of [
  'empathy','practicality','knowledge','wisdom','answerability','insulation','absence',
  'purpose','meaning','accountability','maturity','collapse','prejudice','realization',
  'development','experience','welfare','constraint','interpretation','referent','entity','orientation'
]) assert(!pureText.includes(word),`semantic label leaked into pure Stone kernel: ${word}`);

// The canonical Stone source constrains Delta structurally (range +
// antisymmetry) but deliberately does not smuggle in the experiment's earlier
// normalized-difference estimator as if the paper had specified it.
assert(sourceA.constraints.some(e=>hasOp(e,MOP.DELTA)),'signed Delta relation missing');
assert(!sourceA.constraints.some(divContainsDelta),'Delta was silently defined by a ratio');
assert.equal(compiled.audit.coordinate_measurement_rule.includes('not supplied'),true);

// Formal kernel contains the distinct mathematical machinery needed for scope
// revision, evidential regions, and exactness rather than conflating them with
// the actual orientation.
for(const op of [MOP.TRANSITION,MOP.SUBSET,MOP.CARD,MOP.DELTA,MOP.SQRT,MOP.IFF]){
  assert(sourceA.constraints.some(e=>hasOp(e,op)),`kernel missing math op ${op}`);
}

// The numeric referent frame agrees with the source semantics: L1 is already
// development, L2 is experience, and realization can move the same entity
// inward when the active referent changes.
const developing=stoneRelation('q','r',{x:0.2,y:0.3,z:-0.1});
assert(Math.abs(developing.development-0.6)<1e-12);
assert(Math.abs(developing.experience-Math.sqrt(0.14))<1e-12);
assert.equal(developing.state,'developing');

const stance=stoneRelation('q','r',{x:0.4,y:0.4,z:0.2});
assert.equal(stance.state,'stance');
const realized=realize(stance,'r-prime',{x:0.1,y:0.2,z:0.1});
assert(sameEntityAcrossRealization(realized));
assert.equal(realized.after.state,'developing');
assert(realized.after.development<realized.before.development);

// Removing a genuine canonical constraint changes the universal form.
const altered=compileMathGraph(sourceA.constraints.slice(0,-1),{maxStates:500000});
assert.notEqual(kA.signature,altered.signature,'kernel lost sensitivity to a canonical constraint');

console.log(JSON.stringify({
  anonymous_structure_count:compiled.pure.structures.length,
  semantic_labels_in_pure_object:0,
  variable_renaming_invariant:true,
  constraint_order_invariant:true,
  delta_kept_as_constrained_relation_without_invented_ratio:true,
  referent_transition_present:true,
  evidence_region_distinct:true,
  l1_development_l2_experience_verified:true,
  realization_can_return_same_entity_to_interior:true,
  canonical_constraint_sensitivity:true,
  math_graph_vertices:compiled.pure.math.vertex_count,
  math_graph_signature:compiled.pure.math.signature
},null,2));
console.log('STONE UNIVERSAL KERNEL TEST: PASS');
