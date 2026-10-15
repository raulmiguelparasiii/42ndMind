'use strict';

const assert = require('assert');
const {
  PRIMER, POLES, OPERATOR_AXIOMS, RELATION_OPERATOR, recursivelyExpand,
  compileStone, delta, signedCoordinatesFromFits, l1, projectSurface,
  anonymousBasis
} = require('./stone-closed-math');

const banned = [
  'empathy','practicality','knowledge','wisdom','answerability','insulation','absence',
  'concern','welfare','constraint','information','interpretation','context','correction',
  'orientation','actuality','reality','consequence','action','referent',
  'tracks','restricts','represents','preserves','controls','subordinated'
];

function key(x){return JSON.stringify(x);}
function uniqueWitnesses() {
  const expanded=Object.fromEntries(POLES.map(p=>[p,recursivelyExpand(p)]));
  const freq=new Map();
  for(const p of POLES){for(const f of new Set(expanded[p].map(key)))freq.set(f,(freq.get(f)||0)+1);}
  return Object.fromEntries(POLES.map(p=>[p,expanded[p].filter(f=>freq.get(key(f))===1)]));
}
function fitsFromWitnesses(observed,witnesses){
  const have=new Set(observed.map(key)), out={};
  for(const p of POLES){const ws=witnesses[p];out[p]=ws.length?ws.filter(f=>have.has(key(f))).length/ws.length:0;}
  return out;
}
function near(a,b,e=1e-12){return Math.abs(a-b)<=e;}

// Every source relation word must be eliminated into the fixed generic basis.
const usedSourceRelations=new Set();
for(const facts of Object.values(PRIMER)) for(const [,r] of facts) usedSourceRelations.add(r);
for(const r of usedSourceRelations) assert(RELATION_OPERATOR[r],`unreduced source relation: ${r}`);
assert.equal(OPERATOR_AXIOMS.length,11);

const compiled=compileStone();
assert.equal(Object.keys(compiled).length,7);
assert.equal(new Set(Object.values(compiled).map(x=>x.signature)).size,7);
for(const c of Object.values(compiled)){
  assert(c.pure.operators.every(i=>Number.isInteger(i)&&i>=0&&i<OPERATOR_AXIOMS.length));
}

// Removing every audit legend leaves a pure finite mathematical object with no
// Stone or lower semantic word serving as an algebraic variable/operator.
const pure=anonymousBasis();
const pureText=JSON.stringify(pure).toLowerCase();
for(const word of banned) assert(!pureText.includes(word),`semantic word leaked into anonymous math: ${word}`);
assert.equal(pure.structures.length,7);
for(const s of pure.structures){
  assert(s.operator_basis_version===1);
  assert(s.operators.length>0);
  assert(s.vertex_count>0);
  assert(s.incidence.length+s.scalar.length>0);
}

// Lower ingredients are recursively expanded rather than retained only as
// opaque upper-level symbols.
for(const p of ['empathy','practicality','knowledge','wisdom','answerability','insulation']){
  assert(recursivelyExpand(p).length>PRIMER[p].length,`${p} did not recursively expand`);
}

const witnesses=uniqueWitnesses();
for(const p of POLES) assert(witnesses[p].length>0,`${p} has no discriminating structural witness`);

// Structural pole anatomies produce the six limiting signed directions.
const expected={
  empathy:[1,0,0], practicality:[-1,0,0],
  answerability:[0,1,0], insulation:[0,-1,0],
  wisdom:[0,0,1], knowledge:[0,0,-1]
};
const vertices={};
for(const [p,v] of Object.entries(expected)){
  const fits=fitsFromWitnesses(recursivelyExpand(p),witnesses);
  const q=signedCoordinatesFromFits(fits);
  const surface=projectSurface(q);
  const got=[surface.x,surface.y,surface.z];
  v.forEach((x,i)=>assert(near(got[i],x),`${p} expected ${v} got ${got}`));
  assert(near(l1(surface),1));
  vertices[p]=got;
}

// Null/absence is the zero relation case, not negative accountability.
const absence=compiled.absence.pure;
assert(absence.scalar.some(x=>x[0]===10&&x[2]===0),'absence did not compile to cardinality zero');
const zeroFits=Object.fromEntries(POLES.map(p=>[p,0]));
const nullQ=signedCoordinatesFromFits(zeroFits);
const nullSurface=projectSurface(nullQ);
assert.deepEqual([nullSurface.x,nullSurface.y,nullSurface.z],[0,0,0]);
assert.equal(nullSurface.formed,false);
assert.deepEqual(vertices.insulation,[0,-1,0]);

// Higher-order signed relations are normalized differences. Equal counterpart
// support integrates/cancels the unresolved lateral displacement.
assert.equal(delta(1,0),1);
assert.equal(delta(0,1),-1);
assert.equal(delta(1,1),0);
assert.equal(delta(0,0),0);
const integrated=signedCoordinatesFromFits({empathy:1,practicality:1,wisdom:1,knowledge:1,answerability:1,insulation:0});
assert.deepEqual(integrated,{x:0,y:1,z:0});
assert.deepEqual(projectSurface(integrated),{x:0,y:1,z:0,completion:1,formed:true});

console.log(JSON.stringify({
  recursive_poles:7,
  source_relations_reduced_to_fixed_math_operators:true,
  fixed_operator_count:OPERATOR_AXIOMS.length,
  anonymous_math_contains_semantic_words:false,
  distinct_anonymous_signatures:7,
  all_lower_layers_expanded:true,
  discriminating_witnesses:Object.fromEntries(POLES.map(p=>[p,witnesses[p].length])),
  six_limiting_vertices_recovered:true,
  null_is_cardinality_zero:true,
  null_is_origin:true,
  null_distinct_from_insulation:true,
  normalized_signed_difference_verified:true,
  integrated_peak_recovered:true,
  whole_on_surface:1
},null,2));
console.log('STONE CLOSED MATHEMATICS TEST: PASS');
