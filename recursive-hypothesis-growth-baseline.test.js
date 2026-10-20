'use strict';

const assert=require('assert');
const Mind=require('./recursive-recompression');
const {oneMathHypothesisLedger}=require('./math-hypotheses');

function firstStage(){
  const out=[];let n=0;
  for(let r=0;r<8;r++)for(const a of [false,true])for(const b of [false,true]){
    out.push({id:`base-${++n}`,a,b,x:a&&b});
  }
  return out;
}

function secondStage(){
  const out=[];let n=0;
  for(let r=0;r<6;r++)for(const a of [false,true])for(const b of [false,true])for(const c of [false,true])for(const d of [false,true]){
    out.push({id:`higher-${++n}`,a,b,c,d,y:a&&b&&c&&d});
  }
  return out;
}

let M=Mind.one();
M=Mind.recompress(M,firstStage(),{maxConditions:3,maxPasses:1,maxSymbolsPerPass:8});
const h1=M.symbols.find(s=>s.depth===1&&s.definition.length===2);
assert(h1,'baseline recompressor failed to invent a first-level reusable relation');

M=Mind.recompress(M,secondStage(),{maxConditions:3,maxPasses:1,maxSymbolsPerPass:12});
const h2=M.symbols.find(s=>s.depth>=2&&s.definition.some(a=>a.feature===h1.feature&&a.value===true));
assert(h2,'baseline recompressor failed to reuse its own learned relation in a higher relation');

// This is the preserved architectural gap. Recursive recompression already grows
// a local description language, but no existing connection routes those learned
// descriptions into the live ULT hypothesis/corrigibility authority.
const L=oneMathHypothesisLedger();
assert.strictEqual(Object.keys(L.candidates).length,0);
assert.strictEqual(Object.keys(L.spaces).length,0);
assert.strictEqual(L.evidence.length,0);

console.log(JSON.stringify({
  recompression_invents_level_1_relation:true,
  recompression_reuses_level_1_inside_level_2:true,
  learned_level_1:h1.feature,
  learned_level_2:h2.feature,
  ult_candidates_after_recompression:0,
  ult_spaces_after_recompression:0,
  ult_evidence_after_recompression:0,
  preserved_gap:'no connection from learned recursive descriptions to live ULT authority',
  whole:1
},null,2));
console.log('RECURSIVE HYPOTHESIS GROWTH BASELINE: GAP PRESERVED');
