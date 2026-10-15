'use strict';

// Temporary source transformer for the generic lexical-exemplar correction.
// It changes only universal-language.js representation machinery. Training
// utterances already stored as provenance in U become runtime evidence; no
// English word or semantic class is hard-coded here.

const fs = require('fs');
const file = 'universal-language.js';
let s = fs.readFileSync(file, 'utf8');

const oldRuntime = "if(!U._runtime) Object.defineProperty(U,'_runtime',{value:{step:-1,revision:-1,canon:[],byId:new Map(),lexDf:{},lexWeight:{},invLex:new Map(),invCtx:new Map(),invGround:new Map()},enumerable:false,writable:true,configurable:true});";
const newRuntime = "if(!U._runtime) Object.defineProperty(U,'_runtime',{value:{step:-1,revision:-1,canon:[],byId:new Map(),lexDf:{},lexWeight:{},invLex:new Map(),invCtx:new Map(),invGround:new Map(),exemplars:new Map()},enumerable:false,writable:true,configurable:true});";
if (s.includes(oldRuntime)) s = s.replace(oldRuntime, newRuntime);
else if (!s.includes('exemplars:new Map()')) throw new Error('runtime anchor missing');

const oldBuild = "function buildRuntime(U){\n  const rt=runtime(U);if(rt.step===U.step&&rt.revision===U.canonical_revision)return rt;const canon=canonicalRelationsUncached(U),byId=new Map(canon.map(r=>[r.id,r])),lexDf={};for(const r of canon)for(const k of Object.keys(r.lexical||{}))lexDf[k]=(lexDf[k]||0)+1;const n=Math.max(1,canon.length),lexWeight={};for(const [k,df] of Object.entries(lexDf))lexWeight[k]=1+Math.log((n+1)/(df+1));const invLex=new Map(),invCtx=new Map(),invGround=new Map();for(const r of canon){for(const k of Object.keys(r.lexical||{}))invAdd(invLex,k,r.id);for(const k of Object.keys(r.context||{}))invAdd(invCtx,k,r.id);for(const k of Object.keys(r.ground||{}))invAdd(invGround,k,r.id);}Object.assign(rt,{step:U.step,revision:U.canonical_revision,canon,byId,lexDf,lexWeight,invLex,invCtx,invGround});return rt;\n}";
const newBuild = `function relationExemplars(U,r){
  const seen=new Set(),out=[];
  for(const id of r.members||[r.id]) for(const p of U.relations[id]?.provenance||[]){
    const text=String(p?.utterance||'').trim();
    if(!text||seen.has(text))continue;
    seen.add(text);out.push(textFeatures(text));
  }
  return out.slice(-16);
}
function buildRuntime(U){
  const rt=runtime(U);if(rt.step===U.step&&rt.revision===U.canonical_revision)return rt;const canon=canonicalRelationsUncached(U),byId=new Map(canon.map(r=>[r.id,r])),lexDf={};for(const r of canon)for(const k of Object.keys(r.lexical||{}))lexDf[k]=(lexDf[k]||0)+1;const n=Math.max(1,canon.length),lexWeight={};for(const [k,df] of Object.entries(lexDf))lexWeight[k]=1+Math.log((n+1)/(df+1));const invLex=new Map(),invCtx=new Map(),invGround=new Map(),exemplars=new Map();for(const r of canon){for(const k of Object.keys(r.lexical||{}))invAdd(invLex,k,r.id);for(const k of Object.keys(r.context||{}))invAdd(invCtx,k,r.id);for(const k of Object.keys(r.ground||{}))invAdd(invGround,k,r.id);exemplars.set(r.id,relationExemplars(U,r));}Object.assign(rt,{step:U.step,revision:U.canonical_revision,canon,byId,lexDf,lexWeight,invLex,invCtx,invGround,exemplars});return rt;
}`;
if (s.includes(oldBuild)) s = s.replace(oldBuild, newBuild);
else if (!s.includes('function relationExemplars(')) throw new Error('buildRuntime anchor missing');

const oldLex = `function lexicalSimilarity(U,r,p){
  const weight=k=>lexicalWeight(U,k);let best=vCosWeighted(p.lexical,r.lexical,weight);
  for(const span of spanVectors(U,p)){const cos=vCosWeighted(span.v,r.lexical,weight),coverage=directedLexicalCoverage(U,span.v,r.lexical);best=Math.max(best,.92*cos,coverage);}
  return clamp(best);
}`;
const newLex = `function lexicalSimilarity(U,r,p){
  const rt=buildRuntime(U),weight=k=>lexicalWeight(U,k),examples=rt.exemplars.get(r.id)||[];
  let best=vCosWeighted(p.lexical,r.lexical,weight);
  for(const ex of examples) best=Math.max(best,1.04*vCosWeighted(p.lexical,ex,weight),directedLexicalCoverage(U,p.lexical,ex));
  for(const span of spanVectors(U,p)){
    const cos=vCosWeighted(span.v,r.lexical,weight),coverage=directedLexicalCoverage(U,span.v,r.lexical);
    best=Math.max(best,.92*cos,coverage);
    for(const ex of examples) best=Math.max(best,1.02*vCosWeighted(span.v,ex,weight),directedLexicalCoverage(U,span.v,ex));
  }
  return clamp(best);
}`;
if (s.includes(oldLex)) s = s.replace(oldLex, newLex);
else if (!s.includes('rt.exemplars.get(r.id)')) throw new Error('lexicalSimilarity anchor missing');

fs.writeFileSync(file, s);
console.log('generic lexical exemplar correction applied');
