'use strict';

const assert=require('assert');
const fs=require('fs');
const Mind=require('./recursive-recompression');
const {variable,constant,app,MOP}=require('./universal-math-graph');
const {
  oneMathHypothesisLedger,contactMathSpace,currentMathHypothesis,currentMathSpace
}=require('./math-hypotheses');
const {universalRelationField}=require('./universal-intent');
const {
  learnedDefinitionExpression,learnedDefinitionSignature,
  factorLearnedDefinition,inspectLearnedFactorization,proposeLearnedDefinition
}=require('./recursive-hypothesis-growth');

const V=variable,C=constant,A=app;
const eq=(x,y)=>A(MOP.EQ,x,y);
const opts={maxCoreStates:200000,maxMatchStates:250000,maxCanonicalStates:250000};

function firstStage(){
  const out=[];let n=0;
  for(let r=0;r<8;r++)for(const a of [false,true])for(const b of [false,true]){
    out.push({id:`first-${++n}`,a,b,x:a&&b});
  }
  return out;
}
function secondStage(){
  const out=[];let n=0;
  for(let r=0;r<6;r++)for(const a of [false,true])for(const b of [false,true])for(const c of [false,true])for(const d of [false,true]){
    out.push({id:`second-${++n}`,a,b,c,d,y:a&&b&&c&&d});
  }
  return out;
}
function thirdStage(){
  const out=[];let n=0;
  for(let r=0;r<3;r++)for(const a of [false,true])for(const b of [false,true])for(const c of [false,true])for(const d of [false,true])for(const e of [false,true])for(const f of [false,true]){
    out.push({id:`third-${++n}`,a,b,c,d,e,f,z:a&&b&&c&&d&&e&&f});
  }
  return out;
}
function hasAtom(symbol,feature,value=true){
  return symbol.definition.some(a=>a.feature===feature&&a.value===value);
}
function renameState(state){
  const names=new Set();
  for(const s of state.symbols){
    names.add(String(s.feature));
    for(const a of s.definition)names.add(String(a.feature));
  }
  const map=new Map([...names].sort().map((name,i)=>[name,`opaque_${(i+17)*7919}`]));
  return{
    state:{
      ...state,
      symbols:state.symbols.map(s=>({
        ...s,
        feature:map.get(String(s.feature)),
        definition:s.definition.map(a=>({...a,feature:map.get(String(a.feature))}))
      }))
    },
    map
  };
}

let R=Mind.one();
R=Mind.recompress(R,firstStage(),{maxConditions:3,maxPasses:1,maxSymbolsPerPass:8});
const h1=R.symbols.find(s=>s.definition.length===2&&hasAtom(s,'a')&&hasAtom(s,'b'));
assert(h1,'failed to learn opaque level-1 relation');

R=Mind.recompress(R,secondStage(),{maxConditions:3,maxPasses:1,maxSymbolsPerPass:16});
const h2=R.symbols.find(s=>s.depth>=2&&s.definition.length===3&&hasAtom(s,h1.feature)&&hasAtom(s,'c')&&hasAtom(s,'d'));
assert(h2,'failed to learn level-2 relation using the learned level-1 relation');

R=Mind.recompress(R,thirdStage(),{maxConditions:3,maxPasses:1,maxSymbolsPerPass:24});
const h3=R.symbols.find(s=>s.depth>=3&&s.definition.length===3&&hasAtom(s,h2.feature)&&hasAtom(s,'e')&&hasAtom(s,'f'));
assert(h3,'failed to learn level-3 relation using the learned level-2 relation');

// Canonical math must ignore arbitrary feature/handle names.
const renamed=renameState(R);
for(const h of [h1,h2,h3]){
  assert.strictEqual(
    learnedDefinitionSignature(R,h.feature,opts),
    learnedDefinitionSignature(renamed.state,renamed.map.get(h.feature),opts),
    `learned relation identity depended on surface feature name for ${h.feature}`
  );
}

const L=oneMathHypothesisLedger();
const h1Expr=learnedDefinitionExpression(R,h1.feature);
const h2Expr=learnedDefinitionExpression(R,h2.feature);
const h1Sig=learnedDefinitionSignature(R,h1.feature,opts);
const h2Sig=learnedDefinitionSignature(R,h2.feature,opts);
const noise=[eq(V('noise'),C('unrelated'))];

// Proposal cannot warrant itself. Observe this only through the public status
// boundary plus the authoritative ledger evidence count; do not reach through a
// read API for private bookkeeping arrays.
const p1=proposeLearnedDefinition(L,R,h1.feature,'learned-L1',{id:'learned-h1'},opts);
assert.strictEqual(p1.routed.relation_uses,0);
let c1=currentMathHypothesis(L,p1.routed.hypothesis_id);
assert.strictEqual(c1.status,'open');
assert.strictEqual(c1.usable,false);
assert.strictEqual(L.evidence.length,0,'proposal created evidence for itself');

// Incomplete contrary contact remains unknown rather than becoming false.
contactMathSpace(L,'learned-L1',noise,{id:'L1-incomplete',complete:false},{autoRefine:false,...opts});
c1=currentMathHypothesis(L,p1.routed.hypothesis_id);
assert.strictEqual(c1.status,'open');
assert.strictEqual(c1.usable,false);

// Independent matching contact warrants the learned relation.
contactMathSpace(L,'learned-L1',[h1Expr],{id:'L1-independent-support',complete:true},{autoRefine:false,...opts});
assert.strictEqual(currentMathSpace(L,'learned-L1',opts).status,'resolved-candidate-math');
assert(universalRelationField(L,opts).relations.some(r=>r.signature===h1Sig),'warranted L1 did not enter reusable relation field');

// L2 is now constructible through the live L1 relation rather than through a
// second copied status/definition authority.
let f2=factorLearnedDefinition(L,R,h2.feature,opts);
assert.strictEqual(f2.relation_uses,1);
assert(f2.relation_signatures.includes(h1Sig));
assert.strictEqual(inspectLearnedFactorization(L,f2,opts).factoring_current,true);
const f2Frozen=JSON.stringify(f2);

// Complete contrary contact removes L1 from current reuse. The unchanged higher
// construction becomes stale solely because the upstream live field changed.
contactMathSpace(L,'learned-L1',noise,{id:'L1-complete-countercontact',complete:true},{autoRefine:false,...opts});
let f2View=inspectLearnedFactorization(L,f2,opts);
assert.strictEqual(f2View.factoring_current,false);
assert.strictEqual(f2View.stale_dependencies.length,1);
assert.strictEqual(JSON.stringify(f2),f2Frozen,'lower correction edited the dependent construction object');

// The same anonymous relation can become warranted in another referent without
// rebinding or editing the old factorization.
proposeLearnedDefinition(L,R,h1.feature,'learned-L1-restored',{id:'learned-h1-restored'},opts);
contactMathSpace(L,'learned-L1-restored',[h1Expr],{id:'L1-restored-support',complete:true},{autoRefine:false,...opts});
f2View=inspectLearnedFactorization(L,f2,opts);
assert.strictEqual(f2View.factoring_current,true);
assert.strictEqual(JSON.stringify(f2),f2Frozen);

// Route L2 through that live L1 dependency, then require independent evidence.
const beforeL2Evidence=L.evidence.length;
const p2=proposeLearnedDefinition(L,R,h2.feature,'learned-L2',{id:'learned-h2'},opts);
assert.strictEqual(p2.routed.relation_uses,1);
assert(p2.routed.relation_signatures.includes(h1Sig));
let c2=currentMathHypothesis(L,p2.routed.hypothesis_id);
assert.strictEqual(c2.status,'open');
assert.strictEqual(c2.usable,false);
assert.strictEqual(L.evidence.length,beforeL2Evidence,'L2 proposal created evidence for itself');
contactMathSpace(L,'learned-L2',[h1Expr,h2Expr],{id:'L2-independent-support',complete:true},{autoRefine:false,...opts});
assert.strictEqual(currentMathSpace(L,'learned-L2',opts).status,'resolved-candidate-math');
assert(universalRelationField(L,opts).relations.some(r=>r.signature===h2Sig),'warranted L2 did not become reusable');

// The third learned relation must now use L2 as part of its hypothesis language.
const f3=factorLearnedDefinition(L,R,h3.feature,opts);
assert.strictEqual(f3.relation_uses,1);
assert(f3.relation_signatures.includes(h2Sig));
assert.strictEqual(inspectLearnedFactorization(L,f3,opts).factoring_current,true);
const f3Frozen=JSON.stringify(f3);

// Defeating L2 removes the live dependency and invalidates the L3 construction
// path without modifying L3 itself or copying a local status flag.
contactMathSpace(L,'learned-L2',noise,{id:'L2-complete-countercontact',complete:true},{autoRefine:false,...opts});
let f3View=inspectLearnedFactorization(L,f3,opts);
assert.strictEqual(f3View.factoring_current,false);
assert.strictEqual(f3View.stale_dependencies.length,1);
assert.strictEqual(JSON.stringify(f3),f3Frozen);

// Re-warrant the same L2 mathematics elsewhere; the untouched L3 construction
// becomes valid again through the same canonical relation signature.
const p2r=proposeLearnedDefinition(L,R,h2.feature,'learned-L2-restored',{id:'learned-h2-restored'},opts);
assert.strictEqual(p2r.routed.relation_uses,1);
contactMathSpace(L,'learned-L2-restored',[h1Expr,h2Expr],{id:'L2-restored-support',complete:true},{autoRefine:false,...opts});
f3View=inspectLearnedFactorization(L,f3,opts);
assert.strictEqual(f3View.factoring_current,true);
assert.strictEqual(JSON.stringify(f3),f3Frozen);

// The connection itself must remain free of benchmark/domain operation names.
const source=fs.readFileSync(require.resolve('./recursive-hypothesis-growth'),'utf8').toLowerCase();
for(const forbidden of ['arc','grid','rotate','rotation','crop','mirror','panel','pixel']){
  assert(!new RegExp(`\\b${forbidden}\\b`).test(source),`connection contains benchmark/domain operator ${forbidden}`);
}

const report={
  recursive_description_depth_reached:h3.depth,
  learned_relations_reified_without_semantic_names:3,
  proposal_self_warrant:0,
  incomplete_countercontact_forced_false:0,
  independent_contact_required_for_warrant:true,
  level_2_hypothesis_uses_live_level_1_relation:true,
  level_3_hypothesis_uses_live_level_2_relation:true,
  lower_defeat_stales_unchanged_higher_construction:true,
  later_recurrence_restores_unchanged_higher_construction:true,
  arbitrary_feature_renaming_preserves_relation_identity:true,
  copied_downstream_status_authority:0,
  benchmark_specific_operator_vocabulary:0,
  whole:L.whole
};
console.log(JSON.stringify(report,null,2));
console.log('RECURSIVE HYPOTHESIS-LANGUAGE GROWTH: PASS');
