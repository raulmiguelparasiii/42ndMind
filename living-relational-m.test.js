'use strict';

const assert=require('assert');
const Mind=require('./one-mind.js');

function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function hasFact(M,subject,relation,object){
  return M.knowledge.current.facts.some(f=>same(f.subject,subject)&&same(f.relation,relation)&&same(f.object,object));
}
function isActive(M,id){
  return M.knowledge.rules.find(r=>r.id===id)?.active!==false;
}

// This is an architectural regression, not a new cognitive faculty. It asks
// whether canonical M already has the bounded reactive/fixed-point property the
// one-live-M architecture requires: changing a lower warranted route must cause
// dependent relational consequences to be recomputed from the remaining live
// structure, without manually editing each downstream conclusion.
const M=Mind.one(1,1);

Mind.C(M,{relations:{
  facts:[
    ['contact:r1','present',true],
    ['contact:r2-independent','present',true],
  ],
  rules:[
    {
      id:'route:r1',
      premises:[['contact:r1','present',true]],
      conclusion:['R1','warranted',true],
      categorical:true,
      provenance:{kind:'test-contact-route'}
    },
    {
      id:'route:r2-via-r1',
      premises:[['R1','warranted',true]],
      conclusion:['R2','warranted',true],
      categorical:true,
      provenance:{kind:'dependent-route'}
    },
    {
      id:'route:r2-independent',
      premises:[['contact:r2-independent','present',true]],
      conclusion:['R2','warranted',true],
      categorical:true,
      provenance:{kind:'independent-route'}
    },
    {
      id:'route:r3',
      premises:[['R2','warranted',true]],
      conclusion:['R3','warranted',true],
      categorical:true,
      provenance:{kind:'dependent-route'}
    },
    {
      id:'route:expression',
      premises:[['R3','warranted',true]],
      conclusion:['E','expresses','R3'],
      categorical:true,
      provenance:{kind:'surface-use'}
    },
    {
      id:'route:prediction',
      premises:[['R3','warranted',true]],
      conclusion:['P','supported_by','R3'],
      categorical:true,
      provenance:{kind:'prediction-use'}
    },
    {
      id:'route:action',
      premises:[['P','supported_by','R3']],
      conclusion:['A','predicts','C8'],
      categorical:true,
      provenance:{kind:'action-consequence-use'}
    },
  ]
}});

assert(hasFact(M,'R1','warranted',true));
assert(hasFact(M,'R2','warranted',true));
assert(hasFact(M,'R3','warranted',true));
assert(hasFact(M,'E','expresses','R3'));
assert(hasFact(M,'P','supported_by','R3'));
assert(hasFact(M,'A','predicts','C8'));

// Reality supplies a counterexample to the lower route. Seeded T10 is ordinary
// corrigible M-content and deactivates that route. Nobody tells R2/R3/E/P/A what
// to do. Canonical relational closure is recomputed from the remaining live
// relational structure.
Mind.C(M,{relations:{facts:[[
  {ref:'route:r1'},'counterexample','case:r1-defeat'
]]}});

assert.strictEqual(isActive(M,'route:r1'),false,'lower route did not lose authority');
assert(!hasFact(M,'R1','warranted',true),'stale R1 conclusion survived lower defeat');

// R2 survives because it has a genuinely independent route. Therefore every
// downstream relation that still follows from R2 survives as well.
assert(hasFact(M,'R2','warranted',true),'R2 was crudely invalidated despite independent support');
assert(hasFact(M,'R3','warranted',true),'R3 should survive while R2 remains warranted');
assert(hasFact(M,'E','expresses','R3'),'expression relation was incorrectly dropped');
assert(hasFact(M,'P','supported_by','R3'),'prediction relation was incorrectly dropped');
assert(hasFact(M,'A','predicts','C8'),'action consequence relation was incorrectly dropped');

// Remove the remaining independent route. Again, no downstream object is
// directly edited. The same fixed-point closure must remove every conclusion
// that no longer follows.
Mind.C(M,{relations:{facts:[[
  {ref:'route:r2-independent'},'counterexample','case:r2-independent-defeat'
]]}});

assert.strictEqual(isActive(M,'route:r2-independent'),false);
assert(!hasFact(M,'R2','warranted',true),'R2 remained stale after all support routes disappeared');
assert(!hasFact(M,'R3','warranted',true),'R3 remained stale after R2 disappeared');
assert(!hasFact(M,'E','expresses','R3'),'surface attachment remained stale after R3 disappeared');
assert(!hasFact(M,'P','supported_by','R3'),'prediction remained stale after R3 disappeared');
assert(!hasFact(M,'A','predicts','C8'),'action consequence remained stale after prediction disappeared');

console.log(JSON.stringify({
  one_continuing_M:true,
  lower_change_recomputes_downstream_without_manual_edits:true,
  independent_support_preserves_higher_relation:true,
  exhausted_support_removes_dependent_relations:true,
  closure_is_fixed_point:true,
  separate_dependency_truth_authority:false,
  whole:M.whole
},null,2));
console.log('LIVING RELATIONAL M: BOUNDED FIXED-POINT INVARIANT PASS');
