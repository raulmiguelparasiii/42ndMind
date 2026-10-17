'use strict';

// Thin live attachment between Universal Language surface relations and the
// full mathematical-hypothesis ledger.
//
// The bridge contains no intent-family semantics. It records that an opaque
// learned surface relation is attached either to an opaque mathematical
// hypothesis or to an opaque unresolved mathematical alternative space. The
// mathematical object is fetched live from math-hypotheses.js; no graph/status
// is copied into the bridge.
//
// Surface disambiguation is contrastive rather than a second semantic theory:
// lexical dimensions shared by many learned relations are downweighted, while
// dimensions that discriminate among the current relation field receive more
// weight. This is the ordinary information-retrieval IDF principle applied to
// the language-specific surface interface; no English word or intent family is
// privileged by the algorithm.

const {currentMathSpace}=require('./math-hypotheses');
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

// Surface language may attach before one mathematical candidate has won. The
// bridge stores only the opaque space reference. Resolution/correction remains
// entirely inside math-hypotheses.js and is dereferenced on every read.
function bindEnglishMathSpace(B,U,L,relationRef,spaceId){
  assertBridge(B);assertUniversal(U);assertLedger(L);
  const relation=canonicalRelation(U,relationRef);
  if(!relation)throw new Error(`unknown surface relation ${String(relationRef)}`);
  const id=String(spaceId);
  const s=L.spaces?.[id];
  if(!s)throw new Error(`unknown math space ${id}`);
  if(!Array.isArray(s.candidates)||!s.candidates.length)throw new Error(`math space ${id} has no candidates`);
  const existing=B.bindings.find(x=>x.relation_ref===String(relationRef)&&x.space_id===id);
  if(existing)return existing;
  const b={relation_ref:String(relationRef),space_id:id,created_step:++B.step};
  B.bindings.push(b);B.audit.push({step:B.step,kind:'space-bound',relation_ref:b.relation_ref,space_id:b.space_id});
  return b;
}

function bindingsForRelation(B,U,relation){
  const canon=canonicalRelation(U,relation);
  if(!canon)return[];
  return B.bindings.filter(b=>canonicalRelation(U,b.relation_ref)===canon);
}

function candidatesForRelation(B,U,L,relation){
  const out=[];
  for(const b of bindingsForRelation(B,U,relation)){
    if(!b.hypothesis_id)continue;
    const h=L.candidates[b.hypothesis_id];
    if(h?.usable)out.push(h);
  }
  const bySignature=new Map(out.map(h=>[h.signature,h]));
  return [...bySignature.values()];
}

function spacesForRelation(B,U,L,relation){
  const out=[];
  for(const b of bindingsForRelation(B,U,relation)){
    if(!b.space_id)continue;
    if(!L.spaces?.[b.space_id])continue;
    out.push(currentMathSpace(L,b.space_id));
  }
  return out;
}

function mathForRelation(B,U,L,relation){
  assertBridge(B);assertUniversal(U);assertLedger(L);
  const canon=canonicalRelation(U,relation);
  const direct=candidatesForRelation(B,U,L,relation);
  const spaces=spacesForRelation(B,U,L,relation);
  const resolvedSpaces=spaces.filter(s=>s.status==='resolved-candidate-math'&&s.hypothesis_id)
    .map(s=>L.candidates[s.hypothesis_id]).filter(Boolean);
  const live=[...direct,...resolvedSpaces];
  const bySignature=new Map(live.filter(h=>h.usable).map(h=>[h.signature,h]));
  const hs=[...bySignature.values()];
  const pending=spaces.filter(s=>s.status!=='resolved-candidate-math');

  if(pending.length){
    return{
      whole:1,
      status:hs.length?'ambiguous':'unresolved',
      relation:canon,
      hypotheses:hs.map(h=>h.id),
      spaces:spaces.map(s=>({space:s.space,status:s.status,hypothesis_id:s.hypothesis_id})),
      math:null
    };
  }
  if(hs.length!==1)return{
    whole:1,status:hs.length?'ambiguous':'unresolved',relation:canon,
    hypotheses:hs.map(h=>h.id),spaces:spaces.map(s=>({space:s.space,status:s.status,hypothesis_id:s.hypothesis_id})),math:null
  };
  const h=hs[0];
  return{
    whole:1,status:'resolved-candidate-math',relation:canon,hypotheses:[h.id],
    spaces:spaces.map(s=>({space:s.space,status:s.status,hypothesis_id:s.hypothesis_id})),
    revision:h.revision,signature:h.signature,math:h.graph
  };
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

// Base F and the contrastive bridge are two generic surface estimators over the
// same learned field. The bridge must not automatically overwrite F merely
// because its top score is microscopically larger than its own runner-up. When
// the estimators disagree, compare their separation margins and keep the more
// discriminating decision. This arbitration is relation/name agnostic.
function baseSurfaceRelation(U){
  assertUniversal(U);
  const matches=U.current?.resolution?.matches||[];
  const top=matches[0]||null;
  if(!top)return{relation:null,score:0,margin:0,ranked:[]};
  return{
    relation:top.relation,
    score:Number(top.score)||0,
    margin:Math.max(0,(Number(top.score)||0)-(Number(matches[1]?.score)||0)),
    ranked:matches.slice(0,8).map(x=>({relation:x.relation,score:Number(x.score)||0}))
  };
}

function surfaceResolution(U){
  const base=baseSurfaceRelation(U),contrastive=contrastiveSurfaceRelation(U);
  if(!base.relation)return{method:'contrastive-idf',...contrastive,base,contrastive};
  if(!contrastive.relation)return{method:'base-f',...base,base,contrastive};
  if(base.relation===contrastive.relation){
    return{method:'base+contrastive-agree',...contrastive,relation:base.relation,base,contrastive};
  }
  const chooseContrastive=contrastive.margin>base.margin+EPS;
  const chosen=chooseContrastive?contrastive:base;
  return{
    method:chooseContrastive?'contrastive-idf-margin':'base-f-margin',
    ...chosen,base,contrastive
  };
}

function tiedMaxRelations(ranked,tolerance=1e-9){
  if(!Array.isArray(ranked)||!ranked.length)return[];
  const best=Number(ranked[0].score)||0;
  return ranked.filter(x=>Math.abs(best-(Number(x.score)||0))<=tolerance).map(x=>String(x.relation));
}

// Preserve genuinely tied surface meanings as a frontier rather than letting
// deterministic relation-id ordering fabricate a unique meaning. This is a
// derived read of the two existing generic estimators. It stores no ambiguity
// state and does not weaken a clearly separated winner.
function surfaceRelationFrontier(U,options={}){
  assertUniversal(U);
  const tolerance=options.surfaceTieTolerance??1e-9;
  const s=surfaceResolution(U);
  let relations=[];
  if(s.base?.relation&&s.contrastive?.relation&&s.base.relation===s.contrastive.relation){
    relations=[...new Set([
      ...tiedMaxRelations(s.base.ranked,tolerance),
      ...tiedMaxRelations(s.contrastive.ranked,tolerance)
    ])];
  }else if(s.method==='contrastive-idf-margin'||s.method==='contrastive-idf'){
    relations=tiedMaxRelations(s.contrastive?.ranked||s.ranked,tolerance);
  }else{
    relations=tiedMaxRelations(s.base?.ranked||s.ranked,tolerance);
  }
  if(!relations.length&&s.relation)relations=[String(s.relation)];
  relations=[...new Set(relations.map(r=>canonicalRelation(U,r)||r))].sort();
  return{
    whole:1,
    status:relations.length===0?'unresolved':relations.length===1?'resolved':'ambiguous',
    relations,
    relation_count:relations.length,
    chosen_relation:s.relation||null,
    method:s.method,
    base_margin:s.base?.margin??0,
    contrastive_margin:s.contrastive?.margin??0
  };
}

function surfaceMathFrontier(B,U,L,options={}){
  assertBridge(B);assertUniversal(U);assertLedger(L);
  const surface=surfaceRelationFrontier(U,options);
  const alternatives=surface.relations.map(relation=>{
    const math=mathForRelation(B,U,L,relation);
    return{
      relation,
      status:math.status,
      hypotheses:(math.hypotheses||[]).slice(),
      signature:math.signature||null,
      revision:math.revision??null,
      math:math.math||null
    };
  });
  const resolved=alternatives.filter(x=>x.status==='resolved-candidate-math'&&x.signature&&x.math);
  const signatures=[...new Set(resolved.map(x=>x.signature))];
  const pending=alternatives.filter(x=>x.status!=='resolved-candidate-math');
  let status='unresolved';
  if(signatures.length>1)status='ambiguous';
  else if(signatures.length===1&&!pending.length)status='resolved-candidate-math';
  else if(signatures.length||pending.length>1)status='ambiguous';
  return{
    whole:1,
    status,
    surface_status:surface.status,
    chosen_relation:surface.chosen_relation,
    relation_count:surface.relation_count,
    resolved_signature_count:signatures.length,
    alternatives
  };
}

function currentEnglishMath(B,U,L){
  assertBridge(B);assertUniversal(U);assertLedger(L);
  const surface=surfaceResolution(U);
  if(!surface.relation)return{whole:1,status:'unresolved',relation:null,hypotheses:[],math:null,surface_resolution:surface};
  const out=mathForRelation(B,U,L,surface.relation);
  return{...out,surface_resolution:surface};
}

function pureEnglishMathBridge(B){
  assertBridge(B);
  return{
    whole:1,version:B.version,
    bindings:B.bindings.map(x=>x.hypothesis_id
      ? {relation_ref:x.relation_ref,hypothesis_id:x.hypothesis_id}
      : {relation_ref:x.relation_ref,space_id:x.space_id})
  };
}

module.exports={
  oneEnglishMathBridge,canonicalRelation,bindEnglishMath,bindEnglishMathSpace,
  candidatesForRelation,spacesForRelation,mathForRelation,currentEnglishMath,
  pureEnglishMathBridge,contrastiveSurfaceRelation,baseSurfaceRelation,
  surfaceResolution,surfaceRelationFrontier,surfaceMathFrontier,
  aggregateCanonicalLexical,idfWeights,weightedCos
};
