'use strict';

// Thin live attachment between Universal Language surface relations and the
// full mathematical-hypothesis ledger.
//
// The bridge contains no English semantics. It only records that an opaque
// learned surface relation is attached to an opaque mathematical hypothesis.
// The mathematical object is fetched live from the corrigible ledger, so if
// that hypothesis is defeated, reopened, or revised, old English does not keep
// a frozen copy of the former mathematics.

function assertBridge(B){if(!B||B.whole!==1||B.version!==1)throw new Error('invalid English-math bridge');}
function assertUniversal(U){if(!U||U.whole!==1||!U.relations)throw new Error('invalid universal-language state');}
function assertLedger(L){if(!L||L.whole!==1||!L.candidates)throw new Error('invalid math hypothesis ledger');}

function oneEnglishMathBridge(){return{whole:1,version:1,bindings:[],audit:[],step:0};}

function canonicalRelation(U,ref){
  const s=String(ref);
  if(U.canonical?.[s]) return U.canonical[s];
  if(U.relations?.[s]) return s;
  return null;
}

function bindEnglishMath(B,U,L,relationRef,hypothesisId){
  assertBridge(B);assertUniversal(U);assertLedger(L);
  const relation=canonicalRelation(U,relationRef);
  if(!relation)throw new Error(`unknown surface relation ${String(relationRef)}`);
  const h=L.candidates[String(hypothesisId)];
  if(!h)throw new Error(`unknown math hypothesis ${String(hypothesisId)}`);
  if(!h.usable)throw new Error(`math hypothesis ${h.id} is not currently supported/usable`);
  const existing=B.bindings.find(x=>x.relation_ref===String(relationRef)&&x.hypothesis_id===h.id);
  if(existing)return existing;
  const b={relation_ref:String(relationRef),hypothesis_id:h.id,created_step:++B.step};
  B.bindings.push(b);B.audit.push({step:B.step,kind:'bound',relation_ref:b.relation_ref,hypothesis_id:b.hypothesis_id});
  return b;
}

function candidatesForRelation(B,U,L,relation){
  const canon=canonicalRelation(U,relation);
  if(!canon)return[];
  const out=[];
  for(const b of B.bindings){
    if(canonicalRelation(U,b.relation_ref)!==canon)continue;
    const h=L.candidates[b.hypothesis_id];
    if(h?.usable)out.push(h);
  }
  const bySignature=new Map(out.map(h=>[h.signature,h]));
  return [...bySignature.values()];
}

function mathForRelation(B,U,L,relation){
  assertBridge(B);assertUniversal(U);assertLedger(L);
  const hs=candidatesForRelation(B,U,L,relation);
  if(hs.length!==1)return{whole:1,status:hs.length?'ambiguous':'unresolved',relation:canonicalRelation(U,relation),hypotheses:hs.map(h=>h.id),math:null};
  const h=hs[0];
  return{whole:1,status:'resolved-candidate-math',relation:canonicalRelation(U,relation),hypotheses:[h.id],revision:h.revision,signature:h.signature,math:h.graph};
}

function currentEnglishMath(B,U,L){
  assertBridge(B);assertUniversal(U);assertLedger(L);
  const relation=U.current?.resolution?.components?.[0]?.relation||null;
  if(!relation)return{whole:1,status:'unresolved',relation:null,hypotheses:[],math:null};
  return mathForRelation(B,U,L,relation);
}

function pureEnglishMathBridge(B){
  assertBridge(B);
  return{whole:1,version:B.version,bindings:B.bindings.map(x=>({relation_ref:x.relation_ref,hypothesis_id:x.hypothesis_id}))};
}

module.exports={
  oneEnglishMathBridge,canonicalRelation,bindEnglishMath,candidatesForRelation,
  mathForRelation,currentEnglishMath,pureEnglishMathBridge
};
