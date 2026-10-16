'use strict';

const assert=require('assert');
const {
  expandPattern, recursiveNormalForm, equivalentUnderReduction
}=require('./relational-normal-form');

// Two independently named relation systems reduce to the same terminal
// operator structure. Surface relation names, variable names, and edge order
// must not determine identity.
const defsA={
  R0:{params:['x','y'],edges:[[0,'x','m'],[2,'m','y']]},
  R1:{params:['a','b'],edges:[['R0','a','b']]},
  R2:{params:['left','right'],edges:[['R1','left','right']]}
};
const defsB={
  Z9:{params:['u','v'],edges:[[2,'middle','v'],[0,'u','middle']]}
};

const A={edges:[['R2','alice','bob']]};
const B={edges:[['Z9','q','r']]};
const eq=equivalentUnderReduction(A,B,defsA,defsB);
assert.equal(eq.equivalent,true);
assert.deepEqual(eq.A.unresolved_relations,[]);
assert.deepEqual(eq.B.unresolved_relations,[]);
assert(!eq.A.signature.includes('R0'));
assert(!eq.A.signature.includes('R1'));
assert(!eq.A.signature.includes('R2'));
assert(!eq.B.signature.includes('Z9'));

// A materially different terminal relation must remain different.
const defsDifferent={
  Z9:{params:['u','v'],edges:[[4,'middle','v'],[0,'u','middle']]}
};
assert.equal(equivalentUnderReduction(A,B,defsA,defsDifferent).equivalent,false);

// Internal variables are local to each definition occurrence, not shared by
// spelling. Two uses of the same definition therefore receive distinct hidden
// vertices.
const doubled=recursiveNormalForm({edges:[['R0','a','b'],['R0','a','c']]},defsA);
assert.equal(doubled.vertex_count,5); // a,b,c + two occurrence-local m vertices
assert.equal(doubled.edges.length,4);

// Correcting a definition must change every dependent structure on the next
// reduction; no frozen compiled answer survives the correction.
const before=recursiveNormalForm({edges:[['R1','a','b']]},defsA);
const correctedA={...defsA,R0:{params:['x','y'],edges:[[0,'x','m'],[4,'m','y']]}};
const after=recursiveNormalForm({edges:[['R1','a','b']]},correctedA);
assert.notEqual(before.signature,after.signature);

// Recursive/circular definitions must terminate explicitly rather than loop or
// invent a lower meaning. The circular relation remains in the normal form and
// is reported as unresolved reduction.
const cyclic={
  C:{params:['x','y'],edges:[['D','x','y']]},
  D:{params:['x','y'],edges:[['C','x','y']]}
};
const cycle=recursiveNormalForm({edges:[['C','a','b']]},cyclic);
assert(cycle.unresolved_relations.length>0);
assert.equal(cycle.edges.length,1);

// Pure alpha-renaming and input edge order are irrelevant even without any
// reducible relation definitions.
const p1={edges:[[0,'a','b'],[2,'b','c'],[4,'c','d']]};
const p2={edges:[[4,'w','z'],[0,'x','y'],[2,'y','w']]};
assert.equal(equivalentUnderReduction(p1,p2).equivalent,true);

const report={
  recursively_reducible_relations:true,
  nested_surface_relation_names_removed:true,
  alpha_renaming_invariant:true,
  edge_order_invariant:true,
  local_internal_variables_preserved:true,
  corrected_definition_recomputes_dependents:true,
  circular_definition_remains_explicit:true,
  inequivalent_terminal_structure_rejected:true,
  example_normal_form:eq.A.signature
};
console.log(JSON.stringify(report,null,2));
console.log('RECURSIVE RELATIONAL NORMAL FORM TEST: PASS');
