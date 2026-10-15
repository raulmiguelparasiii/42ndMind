'use strict';

// 42ndMind Universal Relational Language
// One state, one live update law: U(t+1) = F(U(t) ⊕ X(t+1)).
// U.whole is always 1. Arbitrary relations may enter. F grounds, compares,
// stabilizes, merges, propagates, resolves, and recursively closes them.
//
// Runtime indexes and lexical spans are non-authoritative accelerators. They are
// rebuilt from U, are never serialized, and cannot create semantic content.

const fs = require('fs');
const EPS = 1e-12;
const VERSION = 2;

const clamp = (x, a=0, b=1) => Math.max(a, Math.min(b, x));
const mean = xs => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0;
const round = (x,n=6) => { const p=10**n; return Math.round(x*p)/p; };
function stable(v){
  if(Array.isArray(v)) return '['+v.map(stable).join(',')+']';
  if(v&&typeof v==='object') return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
  return JSON.stringify(v);
}
function hash32(text){ let h=2166136261>>>0; for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;} return h.toString(36); }
const uniq = xs => [...new Set(xs)];
const has = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
function vAdd(out,v,s=1){ for(const [k,x] of Object.entries(v||{})){ const n=(out[k]||0)+x*s; if(Math.abs(n)<=EPS) delete out[k]; else out[k]=n; } return out; }
function vScale(v,s){ const out={}; for(const [k,x] of Object.entries(v||{})) if(Math.abs(x*s)>EPS) out[k]=x*s; return out; }
const vNorm = v => Math.sqrt(Object.values(v||{}).reduce((s,x)=>s+x*x,0));
function vUnit(v){ const n=vNorm(v); return n>EPS?vScale(v,1/n):{}; }
function vDot(a,b){ const [s,l]=Object.keys(a||{}).length<=Object.keys(b||{}).length?[a||{},b||{}]:[b||{},a||{}]; let z=0; for(const [k,x] of Object.entries(s)) if(has(l,k)) z+=x*l[k]; return z; }
function vCos(a,b){ const d=vNorm(a)*vNorm(b); return d>EPS?clamp(vDot(a,b)/d,-1,1):0; }
function vCosWeighted(a,b,weight){
  const keysA=Object.keys(a||{}), keysB=Object.keys(b||{}); if(!keysA.length||!keysB.length) return 0;
  const [s,l]=keysA.length<=keysB.length?[a,b]:[b,a]; let dot=0,na=0,nb=0;
  for(const [k,x] of Object.entries(a)) na+=weight(k)*x*x;
  for(const [k,x] of Object.entries(b)) nb+=weight(k)*x*x;
  for(const [k,x] of Object.entries(s)) if(has(l,k)) dot+=weight(k)*x*l[k];
  const d=Math.sqrt(na*nb); return d>EPS?clamp(dot/d,-1,1):0;
}
function vDistance(a,b){ const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]); let s=0; for(const k of keys){ const d=(a[k]||0)-(b[k]||0); s+=d*d; } return Math.sqrt(s); }
function topVector(v,n=8){ return Object.entries(v||{}).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])||a[0].localeCompare(b[0])).slice(0,n).map(([dimension,weight])=>({dimension,weight:round(weight)})); }

function flatten(v,p='',out={}){
  if(v===null||v===undefined) return out;
  if(Array.isArray(v)){ v.forEach((x,i)=>flatten(x,p?`${p}.${i}`:String(i),out)); return out; }
  if(typeof v==='object'){ for(const k of Object.keys(v).sort()) flatten(v[k],p?`${p}.${k}`:k,out); return out; }
  out[p]=v; return out;
}
const atom = v => typeof v==='string'?v.normalize('NFKC').toLowerCase():stable(v);
function tokenize(text){ return String(text||'').normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)?|[^\s\p{L}\p{N}]/gu)||[]; }
function stem(t){
  if(!/^[\p{L}]+$/u.test(t)||t.length<4) return t;
  for(const re of [/ing$/u,/ied$/u,/ed$/u,/ies$/u,/es$/u,/s$/u,/ly$/u]) if(re.test(t)&&t.replace(re,'').length>=3) return t.replace(re,'');
  return t;
}
function textFeatures(text){
  const ts=tokenize(text),out={}; const add=(k,w)=>out[k]=(out[k]||0)+w;
  for(const t of ts){ if(/^[\p{L}\p{N}]/u.test(t)){add(`txt:u:${t}`,1);add(`txt:s:${stem(t)}`,0.65);} else add(`form:p:${t}`,0.25); }
  for(let n=2;n<=3;n++) for(let i=0;i+n<=ts.length;i++) add(`txt:${n}:${ts.slice(i,i+n).join(' ')}`,0.45/n);
  if(/\?$/.test(String(text||'').trim())) add('form:question',0.7);
  return vUnit(out);
}
function contextFeatures(context){ const out={}; for(const [k,v] of Object.entries(flatten(context||{}))) out[`ctx:${k}=${atom(v)}`]=1; return vUnit(out); }
function executionFeatures(ex){
  const out={}; if(!ex||typeof ex!=='object') return out;
  const before=flatten(ex.before||{}),after=flatten(ex.after||{}),keys=new Set([...Object.keys(before),...Object.keys(after)]);
  for(const k of keys){ const b=has(before,k),a=has(after,k); if(b&&a){ if(stable(before[k])===stable(after[k])) out[`exec:${k}:same:${atom(before[k])}`]=0.7; else out[`exec:${k}:${atom(before[k])}>${atom(after[k])}`]=1.4; } else if(b) out[`exec:${k}:present>absent`]=1.4; else out[`exec:${k}:absent>present`]=1.4; }
  if(ex.action!==undefined) out[`exec:action:${atom(ex.action)}`]=0.55;
  return vUnit(out);
}
function factFeatures(facts){ const out={}; for(const f of facts||[]) out[`rel:${Array.isArray(f)&&f.length===3?stable(f[0])+'|'+stable(f[1])+'|'+stable(f[2]):stable(f)}`]=1; return vUnit(out); }
function parts(contact){ const text=contact?.utterance||contact?.text||''; return {tokens:tokenize(text),lexical:textFeatures(text),context:contextFeatures(contact?.context),ground:vUnit(vAdd(vAdd({},executionFeatures(contact?.execution)),factFeatures(contact?.facts)))}; }
function evidenceParts(evidence){
  const out={lexical:{},context:{},ground:{}}; const list=Array.isArray(evidence)?evidence:evidence?[evidence]:[];
  for(const e of list){ const k=typeof e==='string'?e:e?.dimension; if(!k) continue; const w=typeof e==='object'?Math.max(EPS,Number(e.weight)||1):1; const dst=k.startsWith('txt:')||k.startsWith('form:')?out.lexical:k.startsWith('ctx:')?out.context:out.ground; dst[k]=(dst[k]||0)+w; }
  out.lexical=vUnit(out.lexical); out.context=vUnit(out.context); out.ground=vUnit(out.ground); return out;
}

function config(overrides={}){ return {equivalence_threshold:0.82,overlap_threshold:0.52,min_equivalence_support:2,candidate_floor:0.055,max_components:48,candidate_scan_limit:256,max_span_tokens:6,relation_learning_rate:0.3,fixed_point_passes:1,history_limit:10000,...overrides}; }
function one(options={}){ return {whole:1,version:VERSION,step:0,config:config(options.config||{}),relations:{},relation_order:[],canonical:{},canonical_signature:'',canonical_revision:0,equivalence_sets:[],overlaps:[],contradictions:[],encounters:[],current:null,audit:[],metrics:{progress:0,coverage:0,resolution:0,grounding:0,consistency:1,stability:0,unknown_mass:1,relations:0,canonical_relations:0,encounters:0,fixed_point_passes:0,bar:'[------------------------------]   0.00%'}}; }
function runtime(U){
  if(!U._runtime) Object.defineProperty(U,'_runtime',{value:{step:-1,revision:-1,canon:[],byId:new Map(),lexDf:{},lexWeight:{},invLex:new Map(),invCtx:new Map(),invGround:new Map(),exemplars:new Map()},enumerable:false,writable:true,configurable:true});
  return U._runtime;
}
function invalidateRuntime(U){ const r=runtime(U); r.step=-1; r.revision=-1; }
function hydrate(U){
  U.config=config(U.config||{});runtime(U);
  for(const e of U.encounters||[])if(e.parts&&!Array.isArray(e.parts.tokens))e.parts.tokens=tokenize(e.utterance||'');
  return U;
}
function assertState(U){ if(!U||U.whole!==1||U.version!==VERSION) throw new Error('F requires one v2 universal relational state'); hydrate(U); }
function save(U,file){ assertState(U); fs.writeFileSync(file,JSON.stringify(U)); return file; }
function load(file){ const U=JSON.parse(fs.readFileSync(file,'utf8')); assertState(U); return U; }

const relationId = c => String(c.id||`r:${hash32(stable(c.label||c))}`);
function ensureRelation(U,c){
  const id=relationId(c);
  if(!U.relations[id]){ U.relations[id]={id,labels:c.label?[String(c.label)]:[],created_at:U.step,updated_at:U.step,support:0,grounded_support:0,observations:0,contradiction_support:0,lexical:{},context:{},ground:{},previous:{lexical:{},context:{},ground:{}},drift:1,stability:0,active:c.active!==false,parents:[],children:[],explicit_equivalents:[],explicit_contradictions:[],provenance:[]}; U.relation_order.push(id); }
  const r=U.relations[id]; if(c.label&&!r.labels.includes(String(c.label))) r.labels.push(String(c.label)); return r;
}
function blend(oldV,newV,a){ if(!Object.keys(oldV||{}).length) return vUnit(newV); const out=vScale(oldV,1-a);vAdd(out,newV,a);return vUnit(out); }
function updateRelation(U,c,p,provenance){
  const r=ensureRelation(U,c),ev=evidenceParts(c.evidence),obs={lexical:vUnit(vAdd(vAdd({},p.lexical),ev.lexical,1.2)),context:vUnit(vAdd(vAdd({},p.context),ev.context,1.2)),ground:vUnit(vAdd(vAdd({},p.ground),ev.ground,1.3))};
  if(c.facts) obs.ground=vUnit(vAdd(obs.ground,factFeatures(c.facts),1.3)); if(c.execution) obs.ground=vUnit(vAdd(obs.ground,executionFeatures(c.execution),1.3));
  r.previous={lexical:{...r.lexical},context:{...r.context},ground:{...r.ground}}; const a=clamp(U.config.relation_learning_rate/Math.sqrt(1+0.15*r.observations),0.055,0.42);
  r.lexical=blend(r.lexical,obs.lexical,a);r.context=blend(r.context,obs.context,a);r.ground=blend(r.ground,obs.ground,a);r.observations++;r.support+=Math.max(0.1,Number(c.support)||1);if(vNorm(obs.ground)>EPS)r.grounded_support++;r.drift=mean([vDistance(r.previous.lexical,r.lexical),vDistance(r.previous.context,r.context),vDistance(r.previous.ground,r.ground)]);r.updated_at=U.step;
  if(c.active===false)r.active=false;r.parents=uniq([...r.parents,...(c.parents||[]).map(String)]);r.children=uniq([...r.children,...(c.children||[]).map(String)]);r.explicit_equivalents=uniq([...r.explicit_equivalents,...(c.equivalent_to||c.equivalents||[]).map(String)]);r.explicit_contradictions=uniq([...r.explicit_contradictions,...(c.contradicts||[]).map(String)]);if(provenance)r.provenance.push(provenance);if(r.provenance.length>96)r.provenance.splice(0,r.provenance.length-96);invalidateRuntime(U);return r.id;
}
function resolveRef(U,ref){ const s=String(ref); if(U.relations[s])return s; return U.relation_order.find(id=>U.relations[id]?.labels?.includes(s))||null; }
function syncHierarchy(U){ for(const id of U.relation_order){const r=U.relations[id];if(!r)continue;for(const x of r.children.slice()){const c=resolveRef(U,x);if(c&&c!==id)U.relations[c].parents=uniq([...U.relations[c].parents,id]);}for(const x of r.parents.slice()){const p=resolveRef(U,x);if(p&&p!==id)U.relations[p].children=uniq([...U.relations[p].children,id]);}} }
const explicitEq=(a,b)=>a.explicit_equivalents.includes(b.id)||b.explicit_equivalents.includes(a.id)||a.labels.some(x=>b.explicit_equivalents.includes(x))||b.labels.some(x=>a.explicit_equivalents.includes(x));
const explicitContra=(a,b)=>a.explicit_contradictions.includes(b.id)||b.explicit_contradictions.includes(a.id)||a.labels.some(x=>b.explicit_contradictions.includes(x))||b.labels.some(x=>a.explicit_contradictions.includes(x));
function relationSimilarity(a,b){
  const ag=vNorm(a.ground)>EPS,bg=vNorm(b.ground)>EPS;
  if(ag&&bg){const gs=vCos(a.ground,b.ground),upper=.82*gs+.18;if(upper<.52)return clamp(.82*gs);return clamp(.82*gs+.11*vCos(a.context,b.context)+.07*vCos(a.lexical,b.lexical));}
  const ac=vNorm(a.context)>EPS,bc=vNorm(b.context)>EPS;return ac&&bc?clamp(.6*vCos(a.context,b.context)+.4*vCos(a.lexical,b.lexical)):clamp(vCos(a.lexical,b.lexical));
}
class UF{constructor(xs){this.p=Object.fromEntries(xs.map(x=>[x,x]));}find(x){let p=this.p[x];while(p!==this.p[p])p=this.p[p];while(x!==p){const n=this.p[x];this.p[x]=p;x=n;}return p;}union(a,b){a=this.find(a);b=this.find(b);if(a!==b)this.p[a<b?b:a]=a<b?a:b;}}
function bucketAdd(map,key,id){ if(!map.has(key))map.set(key,[]); map.get(key).push(id); }
function pairKey(a,b){ return a<b?`${a}\u0000${b}`:`${b}\u0000${a}`; }
function potentialPairs(U,active){
  const byId=new Map(active.map(r=>[r.id,r])),ground=new Map(),context=new Map(),lexical=new Map(),pairs=new Set();
  for(const r of active){const g=Object.keys(r.ground||{});if(g.length){for(const k of g)bucketAdd(ground,k,r.id);}else{for(const k of Object.keys(r.context||{}))bucketAdd(context,k,r.id);for(const [k] of Object.entries(r.lexical||{}).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,12))bucketAdd(lexical,k,r.id);}for(const ref of [...r.explicit_equivalents,...r.explicit_contradictions]){const other=resolveRef(U,ref);if(other&&byId.has(other)&&other!==r.id)pairs.add(pairKey(r.id,other));}}
  const addBuckets=map=>{for(const ids of map.values())for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)pairs.add(pairKey(ids[i],ids[j]));};addBuckets(ground);addBuckets(context);addBuckets(lexical);return [...pairs].map(k=>k.split('\u0000'));
}
function canonicalize(U){
  const active=U.relation_order.map(id=>U.relations[id]).filter(r=>r?.active),byId=new Map(active.map(r=>[r.id,r])),uf=new UF(active.map(r=>r.id)),overlaps=[],contradictions=[];
  for(const [aid,bid] of potentialPairs(U,active)){const a=byId.get(aid),b=byId.get(bid);if(!a||!b)continue;const sim=relationSimilarity(a,b),contra=explicitContra(a,b);if(contra)contradictions.push({a:a.id,b:b.id,similarity:round(sim)});if(!contra&&(explicitEq(a,b)||(a.support>=U.config.min_equivalence_support&&b.support>=U.config.min_equivalence_support&&sim>=U.config.equivalence_threshold)))uf.union(a.id,b.id);else if(sim>=U.config.overlap_threshold)overlaps.push({a:a.id,b:b.id,similarity:round(sim)});}
  const groups=new Map();for(const r of active){const root=uf.find(r.id);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(r.id);}U.canonical={};U.equivalence_sets=[];
  for(const ids of groups.values()){const ms=ids.map(id=>U.relations[id]).sort((a,b)=>b.grounded_support-a.grounded_support||b.support-a.support||a.id.localeCompare(b.id)),rep=ms[0].id;for(const id of ids)U.canonical[id]=rep;U.equivalence_sets.push({representative:rep,members:ids.slice().sort()});}
  U.equivalence_sets.sort((a,b)=>a.representative.localeCompare(b.representative));U.overlaps=overlaps.sort((a,b)=>b.similarity-a.similarity);U.contradictions=contradictions;const sig=stable(U.equivalence_sets),changed=sig!==U.canonical_signature;if(changed){U.canonical_signature=sig;U.canonical_revision++;}invalidateRuntime(U);return changed;
}
function canonicalRelationsUncached(U){
  const out=[];for(const set of U.equivalence_sets){const ms=set.members.map(id=>U.relations[id]).filter(Boolean),v={lexical:{},context:{},ground:{}};let total=0,support=0,grounded=0,stability=0;const labels=[],children=[],parents=[];for(const r of ms){const w=Math.max(EPS,r.support);total+=w;support+=r.support;grounded+=r.grounded_support;stability+=r.stability*w;vAdd(v.lexical,r.lexical,w);vAdd(v.context,r.context,w);vAdd(v.ground,r.ground,w);labels.push(...r.labels);children.push(...r.children);parents.push(...r.parents);}out.push({id:set.representative,members:set.members.slice(),labels:uniq(labels),lexical:vUnit(v.lexical),context:vUnit(v.context),ground:vUnit(v.ground),support,grounded_support:grounded,stability:total?stability/total:0,children:uniq(children),parents:uniq(parents)});}return out;
}
function invAdd(map,key,id){if(!map.has(key))map.set(key,new Set());map.get(key).add(id);}
function relationExemplars(U,r){
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
}
function canonicalRelations(U){return buildRuntime(U).canon;}
function lexicalWeight(U,k){return buildRuntime(U).lexWeight[k]||1+Math.log(buildRuntime(U).canon.length+1);}
function spanVectors(U,p){
  if(p._spanVectors)return p._spanVectors;const tokens=(p.tokens||[]).filter(t=>/^[\p{L}\p{N}]/u.test(t)),out=[],max=Math.min(U.config.max_span_tokens,tokens.length);
  for(let len=1;len<=max;len++)for(let i=0;i+len<=tokens.length;i++){const v=textFeatures(tokens.slice(i,i+len).join(' '));const ks=Object.keys(v).filter(k=>k.startsWith('txt:'));if(!ks.length)continue;const specificity=mean(ks.map(k=>lexicalWeight(U,k)));if(specificity<1.08&&len===1)continue;out.push({v,specificity});}
  Object.defineProperty(p,'_spanVectors',{value:out,enumerable:false,configurable:true});return out;
}
function directedLexicalCoverage(U,q,prototype){let hit=0,total=0,spec=0,count=0;for(const [k,x] of Object.entries(q||{})){if(!k.startsWith('txt:'))continue;const w=lexicalWeight(U,k),m=w*x*x;total+=m;spec+=w;count++;if(has(prototype,k))hit+=m;}if(total<=EPS)return 0;const specificity=count?spec/count:1;return clamp((hit/total)*clamp((specificity-1)/1.6,.18,1));}
function lexicalSimilarity(U,r,p){
  const rt=buildRuntime(U),weight=k=>lexicalWeight(U,k),examples=rt.exemplars.get(r.id)||[];
  let best=vCosWeighted(p.lexical,r.lexical,weight);
  for(const ex of examples) best=Math.max(best,1.04*vCosWeighted(p.lexical,ex,weight),directedLexicalCoverage(U,p.lexical,ex));
  for(const span of spanVectors(U,p)){
    const cos=vCosWeighted(span.v,r.lexical,weight),coverage=directedLexicalCoverage(U,span.v,r.lexical);
    best=Math.max(best,.92*cos,coverage);
    for(const ex of examples) best=Math.max(best,1.02*vCosWeighted(span.v,ex,weight),directedLexicalCoverage(U,span.v,ex));
  }
  return clamp(best);
}
function refreshStability(U){ for(const id of U.relation_order){const r=U.relations[id];if(!r)continue;r.stability=clamp((r.support/(r.support+2))*Math.exp(-4*r.drift)/(1+r.contradiction_support));} }
function refreshContradiction(U){for(const id of U.relation_order)if(U.relations[id])U.relations[id].contradiction_support=0;for(const c of U.contradictions){const a=U.relations[c.a],b=U.relations[c.b];if(!a||!b)continue;const p=.07*Math.min(a.support,b.support)*Math.max(.1,c.similarity);a.contradiction_support+=p;b.contradiction_support+=p;}}
function contactSimilarity(U,r,p){
  const lex=vNorm(p.lexical)>EPS&&vNorm(r.lexical)>EPS?lexicalSimilarity(U,r,p):0,ctx=vNorm(p.context)>EPS&&vNorm(r.context)>EPS?Math.max(0,vCos(p.context,r.context)):0,g=vNorm(p.ground)>EPS&&vNorm(r.ground)>EPS?Math.max(0,vCos(p.ground,r.ground)):0;
  return clamp(.78*lex+.18*ctx+.86*g);
}
function canonicalHints(U,hints){let x=null;return uniq((hints||[]).map(h=>U.canonical[h]||((x=resolveRef(U,h))&&(U.canonical[x]||x))).filter(Boolean));}
function candidateIds(U,p,hints=[]){
  const rt=buildRuntime(U),scores=new Map(),hintIds=canonicalHints(U,hints),add=(id,w)=>scores.set(id,(scores.get(id)||0)+w);for(const id of hintIds)add(id,1e6);for(const [k,x] of Object.entries(p.ground||{}))for(const id of rt.invGround.get(k)||[])add(id,8*Math.abs(x));for(const [k,x] of Object.entries(p.context||{}))for(const id of rt.invCtx.get(k)||[])add(id,1.4*Math.abs(x));for(const [k,x] of Object.entries(p.lexical||{})){const idf=lexicalWeight(U,k);for(const id of rt.invLex.get(k)||[])add(id,idf*Math.abs(x));}if(!scores.size){for(const r of rt.canon.slice().sort((a,b)=>b.support-a.support).slice(0,U.config.candidate_scan_limit))add(r.id,0);}return [...scores.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,U.config.candidate_scan_limit).map(([id])=>id);
}
function resolveInside(U,r,trail=new Set()){
  const rt=buildRuntime(U);if(trail.has(r.id))return{whole:1,components:[],self_mass:1,cycle:true};const next=new Set(trail);next.add(r.id);const ids=canonicalHints(U,r.children).filter(id=>id!==r.id&&rt.byId.has(id));if(!ids.length)return null;const scored=ids.map(id=>{const c=rt.byId.get(id),score=clamp(.55*vCos(r.ground,c.ground)+.25*vCos(r.context,c.context)+.2*vCos(r.lexical,c.lexical));return{relation:id,labels:c.labels,score,inside:resolveInside(U,c,next)};}).filter(x=>x.score>.01).sort((a,b)=>b.score-a.score);if(!scored.length)return{whole:1,components:[],self_mass:1};const covered=clamp(.2+.7*mean(scored.map(x=>x.score)),.05,.95),z=scored.reduce((s,x)=>s+x.score,0)||1;for(const x of scored)x.mass=covered*x.score/z;return{whole:1,components:scored,self_mass:1-covered};
}
function resolveParts(U,p,hints=[]){
  const rt=buildRuntime(U),hintSet=new Set(canonicalHints(U,hints));let scored=candidateIds(U,p,hints).map(id=>rt.byId.get(id)).filter(Boolean).map(r=>{let score=contactSimilarity(U,r,p);if(hintSet.has(r.id))score=clamp(score+.22);return{relation:r.id,members:r.members,labels:r.labels,score,stability:r.stability,inside:resolveInside(U,r)};}).filter(x=>x.score>=U.config.candidate_floor||hintSet.has(x.relation)).sort((a,b)=>b.score-a.score||b.stability-a.stability||a.relation.localeCompare(b.relation));if(!scored.length)return{components:[],matches:[],unknown_mass:1,unresolved_dimensions:topUnresolved(p)};scored=scored.slice(0,Math.max(U.config.max_components,32));const best=scored[0].score,second=scored[1]?.score||0,margin=Math.max(0,best-second),known=clamp(.72*best+.28*Math.min(1,margin*3),0,.985),selected=scored.filter(x=>x.score>=Math.max(U.config.candidate_floor,best*.30)).slice(0,U.config.max_components),z=selected.reduce((s,x)=>s+Math.pow(x.score,2),0)||1,components=selected.map(x=>({...x,mass:known*Math.pow(x.score,2)/z}));return{components,matches:scored.map(x=>({relation:x.relation,labels:x.labels,score:round(x.score),members:x.members})),unknown_mass:1-known,unresolved_dimensions:topUnresolved(p)};
}
function topUnresolved(p){const all={};vAdd(all,p.lexical);vAdd(all,p.context);vAdd(all,p.ground);return topVector(all,10);}
function relevantToChanged(U,e,changed){if(!changed.size)return true;for(const c of e.resolution?.components||[])if(changed.has(c.relation))return true;const ids=candidateIds(U,e.parts,[]);return ids.some(id=>changed.has(id));}
function reResolve(U,fieldChanged,changedIds=[]){const changed=new Set(canonicalHints(U,changedIds));for(const e of U.encounters){const grounded=(e.hints||[]).length>0,hSig=grounded?stable(canonicalHints(U,e.hints)):'',hintChanged=grounded&&hSig!==(e.hint_signature||''),must=!e.resolution||hintChanged||(!grounded&&fieldChanged&&relevantToChanged(U,e,changed));if(!must)continue;e.resolution=resolveParts(U,e.parts,e.hints);e.hint_signature=hSig;e.resolved_revision=U.canonical_revision;}}
function refreshMetrics(U,passes){const active=U.relation_order.map(id=>U.relations[id]).filter(r=>r?.active),rs=U.encounters.map(e=>e.resolution).filter(Boolean),unknown=mean(rs.map(r=>r.unknown_mass)),resolution=mean(rs.map(r=>r.matches?.[0]?.score||0)),grounding=active.length?mean(active.map(r=>clamp(r.grounded_support/Math.max(1,r.observations)))):0,stability=active.length?mean(active.map(r=>r.stability)):0,consistency=active.length?clamp(1-mean(active.map(r=>clamp(r.contradiction_support/Math.max(1,r.support))))):1,coverage=1-unknown,vals=[coverage,resolution,grounding,stability,consistency].map(x=>Math.max(EPS,x)),progress=Math.exp(vals.reduce((s,x)=>s+Math.log(x),0)/vals.length),w=30,n=Math.round(w*progress);U.metrics={progress:round(progress),coverage:round(coverage),resolution:round(resolution),grounding:round(grounding),consistency:round(consistency),stability:round(stability),unknown_mass:round(unknown),relations:active.length,canonical_relations:U.equivalence_sets.length,encounters:U.encounters.length,fixed_point_passes:passes,bar:`[${'#'.repeat(n)}${'-'.repeat(w-n)}] ${(100*progress).toFixed(2).padStart(6)}%`};}
function fixedPoint(U,fieldChanged,changedIds=[]){refreshStability(U);const changed=canonicalize(U);refreshContradiction(U);refreshStability(U);buildRuntime(U);reResolve(U,fieldChanged||changed,changedIds);refreshMetrics(U,1);return 1;}
function candidates(contact,signal){const out=[];for(const [src,name] of [[contact?.relations,contact?.source||'contact'],[contact?.candidates,contact?.source||'contact'],[signal?.relations,'semantic_signal'],[signal?.candidates,'semantic_signal']])if(Array.isArray(src))for(const c of src)if(c&&typeof c==='object')out.push({candidate:c,source:name});return out;}
function oracleView(U,contact,p){return{law:'U(t+1)=F(U(t)⊕X(t+1)); whole=1',step:U.step,contact:{utterance:contact.utterance||contact.text||null,context:contact.context||null,execution:contact.execution||null,facts:contact.facts||null},relations:canonicalRelations(U).sort((a,b)=>b.support-a.support).map(r=>({id:r.id,labels:r.labels,members:r.members,support:round(r.support),stability:round(r.stability),lexical:topVector(r.lexical,4),context:topVector(r.context,4),ground:topVector(r.ground,4)})),observed:{lexical:topVector(p.lexical),context:topVector(p.context),ground:topVector(p.ground)},signal_contract:{candidates:[{id:'optional',label:'optional',evidence:['optional dimensions'],parents:['optional'],children:['optional'],equivalent_to:['optional'],contradicts:['optional']}]}};}
async function F(U,contact,oracle=null){
  assertState(U);if(!contact||typeof contact!=='object')throw new Error('X must be a contact object');U.step++;invalidateRuntime(U);const p=parts(contact);let signal=null;if(oracle){if(typeof oracle!=='function')throw new Error('oracle must be a function');signal=await oracle(oracleView(U,contact,p));if(signal!=null&&typeof signal!=='object')throw new Error('oracle signal must be object or null');}
  const proposed=candidates(contact,signal),ids=[];for(const {candidate,source} of proposed)ids.push(updateRelation(U,candidate,p,{step:U.step,source,utterance:contact.utterance||contact.text||null}));syncHierarchy(U);if((contact.facts||[]).length&&!proposed.length)ids.push(updateRelation(U,{label:`§relation-${U.step}`,facts:contact.facts,support:.35},p,{step:U.step,source:'structured_contact'}));
  const e={id:`i:${U.step}:${hash32(stable({u:contact.utterance||contact.text||null,c:contact.context||null,e:contact.execution||null}))}`,step:U.step,utterance:contact.utterance||contact.text||null,parts:p,hints:ids.slice(),resolution:null,hint_signature:'',resolved_revision:-1};U.encounters.push(e);if(U.encounters.length>U.config.history_limit)U.encounters.splice(0,U.encounters.length-U.config.history_limit);const passes=fixedPoint(U,proposed.length>0,ids);if(!e.resolution)e.resolution=resolveParts(U,p,ids);e.hint_signature=stable(canonicalHints(U,ids));U.current={step:U.step,contact,proposed_relations:ids,resolution:e.resolution,discrepancies:e.resolution.unresolved_dimensions,metrics:U.metrics};U.audit.push({step:U.step,proposed_relations:ids,canonical:ids.map(id=>U.canonical[id]||id),unknown_mass:round(e.resolution.unknown_mass),progress:U.metrics.progress,fixed_point_passes:passes});if(U.audit.length>U.config.history_limit)U.audit.splice(0,U.audit.length-U.config.history_limit);return U;
}

module.exports={one,F,save,load,oracleView};
