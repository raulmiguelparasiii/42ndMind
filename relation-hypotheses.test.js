'use strict';

const assert = require('assert');
const {
  oneHypothesisLedger, propose, contact, usablePatterns, patternSignature
} = require('./relation-hypotheses');

// A tiny anonymous reality graph. No semantic labels are used.
const positive = {
  nodes:['j','w','c','s','e','scale'],
  edges:[
    {op:2,from:'j',to:'w'},
    {op:2,from:'w',to:'c'},
    {op:4,from:'c',to:'s'},
    {op:0,from:'s',to:'e'},
    {op:5,from:'s',to:'scale'}
  ],
  complete_ops:[0,2,4,5]
};

const broken = {
  nodes:['j','w','c','s','e','scale'],
  edges:[
    {op:2,from:'j',to:'w'},
    {op:2,from:'w',to:'c'},
    // deliberately missing O4(c,s)
    {op:0,from:'s',to:'e'},
    {op:5,from:'s',to:'scale'}
  ],
  complete_ops:[0,2,4,5]
};

const incomplete = {
  nodes:['j','w'],
  edges:[{op:2,from:'j',to:'w'}],
  complete_ops:[2]
};

const intendedPattern={edges:[
  [2,'a','b'], [2,'b','c'], [4,'c','d'], [0,'d','e'], [5,'d','f']
]};

const wrongPattern={edges:[
  [2,'a','b'], [7,'b','c']
]};

const L=oneHypothesisLedger();
const good=propose(L,{id:'good',source:'llm-proposer',confidence:1,pattern:intendedPattern});
const same=propose(L,{id:'duplicate-from-textbook',source:'second-proposer',confidence:0.2,pattern:{edges:[
  [2,'x','y'], [2,'y','z'], [4,'z','q'], [0,'q','r'], [5,'q','t']
]}});
assert.strictEqual(same.id,'good','alpha-equivalent proposals should merge');
assert.strictEqual(good.proposals.length,2,'merged proposal provenance should be retained');

const wrong=propose(L,{id:'wrong',source:'llm-proposer',confidence:1,pattern:wrongPattern});
assert.strictEqual(good.status,'open');
assert.strictEqual(wrong.status,'open');
assert.strictEqual(usablePatterns(L).length,0,'proposal confidence must not create truth');

// Partial contact must not turn missing structure into falsehood.
contact(L,incomplete,{id:'partial'});
assert.strictEqual(good.status,'open');
assert.strictEqual(wrong.status,'open');

// Independent reality contact can promote a proposal.
contact(L,positive,{id:'positive'});
assert.strictEqual(good.status,'supported');
assert.strictEqual(good.usable,true);
assert.strictEqual(wrong.status,'defeated');
assert.strictEqual(wrong.usable,false);
assert.deepStrictEqual(usablePatterns(L).map(x=>x.id),['good']);

// Later complete counterevidence reopens what had been supported.
contact(L,broken,{id:'counterexample'});
assert.strictEqual(good.status,'contested');
assert.strictEqual(good.usable,false);
assert.strictEqual(usablePatterns(L).length,0);

// Signature is independent of arbitrary variable names.
assert.strictEqual(
  patternSignature(intendedPattern),
  patternSignature({edges:[[2,10,11],[2,11,12],[4,12,13],[0,13,14],[5,13,15]]})
);

const report={
  proposer_confidence_is_not_authority:true,
  alpha_equivalent_proposals_merged:true,
  incomplete_contact_preserves_unknown:true,
  independent_contact_can_support:true,
  complete_counterexample_can_defeat:true,
  later_counterevidence_reopens_supported_relation:true,
  final_good_status:good.status,
  final_wrong_status:wrong.status,
  whole:L.whole
};
console.log(JSON.stringify(report,null,2));
console.log('CORRIGIBLE RELATION HYPOTHESIS TEST: PASS');
