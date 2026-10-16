'use strict';

// Thin live attachment between Universal Language surface relations and the
// full mathematical-hypothesis ledger.
//
// The bridge contains no intent-family semantics. It records that an opaque
// learned surface relation is attached to an opaque mathematical hypothesis.
// The mathematical object is fetched live from the corrigible ledger, so if
// that hypothesis is defeated, reopened, or revised, old English does not keep
// a frozen copy of the former mathematics.
//
// Surface disambiguation is contrastive rather than a second semantic theory:
// lexical dimensions shared by many learned relations are downweighted, while
// dimensions that discriminate among the current relation field receive more
// weight. This is the ordinary information-retrieval IDF principle applied to
// the language-specific surface interface; no English word or intent family is
// privileged by the algorithm.

const EPS=1e-12;

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

function unit(v){
  let n=0;for(const x of Object.values(v||{}))n+=x*x;n=Math.sqrt(n);
  if(n<=EPS)return{};
  const out={};for(const [k,x] of Object.entries(v||{}))if(Math.abs(x)>EPS)out[k]=x/n;
  return out;
}
function aggregateCanonicalLexical(U){
  const sets=Array.isArray(U.equivalence_sets)&&U.equivalence_sets.length
    ? U.equivalence_sets
    : Object.keys(U.relations||{}).map(id=>({representative:id,members:[id]}));
  return sets.map(set=>{
    const v={};let total=0;
    for(const id of set.members||[]){
      const r=U.relations[id];if(!r)continue;
      const w=Math.max(EPS,Number(r.support)||1);total+=w;
      for(const [k,x] of Object.entries(r.lexical||{}))v[k]=(v[k]||0)+w*x;
    }
    if(total>EPS)for(const k of Object.keys(v))v[k]/=total;
    return{relation:set.representative,lexical:unit(v)};
  }).filter(x=>Object.keys(x.lexical).length);
}
function idfWeights(docs){
  const N=docs.length,df={};
  for(const d of docs){
    for(const k of Object.keys(d.lexical||{}))if(Math.abs(d.lexical[k])>EPS)df[k]=(df[k]||0)+1;
  }
  const out={};
  for(const [k,n] of Object.entries(df))out[k]=1+Math.log((N+1)/(n+1));
  return out;
}
function weightedCos(a,b,w){
  const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);
  let dot=0,aa=0,bb=0;
  for(const k of keys){
    const weight=w[k]||1,x=a?.[k]||0,y=b?.[k]||0;
    dot+=weight*x*y;aa+=weight*x*x;bb+=weight*y*y;
  }
  const d=Math.sqrt(aa*bb);return d>EPS?Math.max(-1,Math.min(1,dot/d)):0;
}

// Returns a language-surface relation using only the learned lexical field.
// Common features (speaker names, articles, generic scaffolding words, etc.)
// lose discriminating power automatically because they occur across many
// relation documents. No stop-word list or intent-specific token rule exists.
function contrastiveSurfaceRelation(U){
  assertUniversal(U);
  const encounter=[...(U.encounters||[])].reverse().find(e=>e.step===U.current?.step)||(U.encounters||[]).at(-1);
  const query=encounter?.parts?.lexical||{};
  if(!Object.keys(query).length)return{relation:null,score:0,margin:0,ranked:[]};
  const docs=aggregateCanonicalLexical(U),weights=idfWeights(docs);
  const ranked=docs.map(d=>({relation:d.relation,score:weightedCos(query,d.lexical,weights)}))
    .sort((a,b)=>b.score-a.score||a.relation.localeCompare(b.relation));
  const best=ranked[0]||{relation:null,score:0};
  return{
    relation:best.relation,
    score:best.score,
    margin:best.score-(ranked[1]?.score||0),
    ranked:ranked.slice(0,8)
  };
}

function currentEnglishMath(B,U,L){
  assertBridge(B);assertUniversal(U);assertLedger(L);
  const surface=contrastiveSurfaceRelation(U);
  if(!surface.relation)return{whole:1,status:'unresolved',relation:null,hypotheses:[],math:null,surface_resolution:surface};
  const out=mathForRelation(B,U,L,surface.relation);
  return{...out,surface_resolution:{method:'contrastive-idf',...surface}};
}

function pureEnglishMathBridge(B){
  assertBridge(B);
  return{whole:1,version:B.version,bindings:B.bindings.map(x=>({relation_ref:x.relation_ref,hypothesis_id:x.hypothesis_id}))};
}

module.exports={
  oneEnglishMathBridge,canonicalRelation,bindEnglishMath,candidatesForRelation,
  mathForRelation,currentEnglishMath,pureEnglishMathBridge,contrastiveSurfaceRelation,
  aggregateCanonicalLexical,idfWeights,weightedCos
};
