'use strict';

const assert=require('assert');
const Mind=require('./one-mind.js');
const {MOP,variable,constant,app}=require('./universal-math-graph');
const {
  SUPPORT_REL,assignmentRef,
  proposeMathAlternativeWithWarrant,contactMathSpaceWithWarrant,currentAssignmentWarrant
}=require('./mind-math-warrant');

const V=variable,C=constant,A=app;
const opts={autoRefine:false,maxMatchStates:100000,maxCanonicalStates:100000};
const lowerExpr=A(MOP.EQ,V('opaque_lower'),C('v1'));
const higherExpr=A(MOP.EQ,V('opaque_higher'),C('v2'));
const noise=A(MOP.EQ,V('noise'),C('different'));

function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function hasFact(M,s,r,o){
  return M.knowledge.current.facts.some(f=>same(f.subject,s)&&same(f.relation,r)&&same(f.object,o));
}
function installDownstream(M,higherAssignment){
  Mind.C(M,{relations:{rules:[
    {
      id:'downstream:r3',
      premises:[[higherAssignment,SUPPORT_REL.warranted,true]],
      conclusion:['R3','warranted',true],
      categorical:true,
      provenance:{kind:'generic-higher-relation'}
    },
    {
      id:'downstream:expression',
      premises:[['R3','warranted',true]],
      conclusion:['E','expresses','R3'],
      categorical:true,
      provenance:{kind:'surface-use'}
    },
    {
      id:'downstream:prediction',
      premises:[['R3','warranted',true]],
      conclusion:['P','supported_by','R3'],
      categorical:true,
      provenance:{kind:'prediction-use'}
    },
    {
      id:'downstream:action',
      premises:[['P','supported_by','R3']],
      conclusion:['A','predicts','C8'],
      categorical:true,
      provenance:{kind:'action-consequence-use'}
    }
  ]}});
}

function setup(prefix,withIndependentHigherSupport){
  const M=Mind.one(1,1);
  const lowerSpace=`${prefix}-lower-space`,higherSpace=`${prefix}-higher-space`;
  const lowerId=`${prefix}-lower`,higherId=`${prefix}-higher`;

  proposeMathAlternativeWithWarrant(M,lowerSpace,{
    id:lowerId,expressions:[lowerExpr],source:'opaque-proposer',confidence:0.99
  },opts);
  proposeMathAlternativeWithWarrant(M,higherSpace,{
    id:higherId,expressions:[higherExpr],source:'opaque-proposer',confidence:0.99
  },opts);

  const lowerAssignment=assignmentRef(lowerSpace,lowerId);
  const higherAssignment=assignmentRef(higherSpace,higherId);
  installDownstream(M,higherAssignment);

  // Independent reality contact warrants the lower assignment.
  contactMathSpaceWithWarrant(M,lowerSpace,[lowerExpr],{
    id:`${prefix}-lower-support`,complete:true
  },opts);
  assert.strictEqual(currentAssignmentWarrant(M,lowerSpace,lowerId).warranted,true);

  // One support route for the higher relation explicitly depends on the current
  // lower warrant. The evidence occurrence remains first-class; the dependency
  // is an ordinary relational premise on the support route, not a copied status.
  contactMathSpaceWithWarrant(M,higherSpace,[higherExpr],{
    id:`${prefix}-higher-dependent-support`,complete:true,
    support_dependencies:[[lowerAssignment,SUPPORT_REL.warranted,true]]
  },opts);
  assert.strictEqual(currentAssignmentWarrant(M,higherSpace,higherId).warranted,true);

  if(withIndependentHigherSupport){
    // A second route warrants the same higher relation from independent contact.
    contactMathSpaceWithWarrant(M,higherSpace,[higherExpr],{
      id:`${prefix}-higher-independent-support`,complete:true
    },opts);
  }

  assert(hasFact(M,'R3','warranted',true));
  assert(hasFact(M,'E','expresses','R3'));
  assert(hasFact(M,'P','supported_by','R3'));
  assert(hasFact(M,'A','predicts','C8'));

  return{M,lowerSpace,higherSpace,lowerId,higherId,lowerAssignment,higherAssignment};
}

// Case A: lower warrant is defeated, but an independent higher support route is
// still live. Only the dependent route stops closing. The higher relation and all
// downstream uses remain warranted without direct edits.
const survives=setup('survive',true);
contactMathSpaceWithWarrant(survives.M,survives.lowerSpace,[noise],{
  id:'survive-lower-counter',complete:true
},opts);
assert.strictEqual(currentAssignmentWarrant(survives.M,survives.lowerSpace,survives.lowerId).warranted,false);
assert.strictEqual(currentAssignmentWarrant(survives.M,survives.higherSpace,survives.higherId).warranted,true,
  'higher relation was crudely invalidated despite independent support');
assert(hasFact(survives.M,'R3','warranted',true));
assert(hasFact(survives.M,'E','expresses','R3'));
assert(hasFact(survives.M,'P','supported_by','R3'));
assert(hasFact(survives.M,'A','predicts','C8'));

// Case B: the higher relation has only the route that depends on the lower
// warrant. Defeating the lower assignment removes that premise. Canonical fixed-
// point closure then removes the higher warrant and every downstream consequence.
const collapses=setup('collapse',false);
contactMathSpaceWithWarrant(collapses.M,collapses.lowerSpace,[noise],{
  id:'collapse-lower-counter',complete:true
},opts);
assert.strictEqual(currentAssignmentWarrant(collapses.M,collapses.lowerSpace,collapses.lowerId).warranted,false);
assert.strictEqual(currentAssignmentWarrant(collapses.M,collapses.higherSpace,collapses.higherId).warranted,false);
assert(!hasFact(collapses.M,'R3','warranted',true));
assert(!hasFact(collapses.M,'E','expresses','R3'));
assert(!hasFact(collapses.M,'P','supported_by','R3'));
assert(!hasFact(collapses.M,'A','predicts','C8'));

// The semantic result lives in M's ordinary rules/facts. No persistent math
// status or dependency ledger has been attached to either individual.
for(const M of [survives.M,collapses.M]){
  assert.strictEqual(M.math_hypotheses,undefined);
  assert.strictEqual(M.dependency_ledger,undefined);
  assert.strictEqual(M.warrant_status,undefined);
}

console.log(JSON.stringify({
  one_persistent_M_per_case:true,
  support_routes_are_first_class_M_rules:true,
  lower_change_recomputes_affected_higher_relation:true,
  independent_support_preserves_higher_warrant:true,
  no_independent_support_reopens_higher_relation:true,
  expression_prediction_action_follow_same_closure:true,
  copied_math_status_authority:false,
  copied_dependency_authority:false,
  candidate_revision_propagation_demonstrated:false,
  whole:1
},null,2));
console.log('ONE LIVE M WARRANT PROPAGATION: PASS');
