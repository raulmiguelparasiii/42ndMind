'use strict';

// 42ndMind Universal Relational Language
// One state, one live update law: U(t+1) = F(U(t) ⊕ X(t+1)).
// U.whole is always 1. Arbitrary relations may enter. F grounds, compares,
// stabilizes, merges, propagates, resolves, and recursively closes them.
//
// Intent-math extension: grounded relations can now carry an inspectable,
// order-invariant mathematical anatomy. This does not make anatomy a second
// cognitive authority: it is derived from the same reality-contact already
// supplied to F and is attached to the stabilized relation as an explanation.

const fs = require('fs');
const { canonicalGraph } = require('./relational-normal-form');
const EPS = 1e-12;
const VERSION = 2;
const INTENT_MATH_VERSION = 1;

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
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
function vAdd(out,v,s=1){ for(const [k,x] of Object.entries(v||{})){ const n=(out[k]||0)+x*s; if(Math.abs(n)<=EPS) delete out[k]; else out[k]=n; } return out; }
function vScale(v,s){ const out={}; for(const [k,x] of Object.entries(v||{})) if(Math.abs(x*s)>EPS) out[k]=x*s; return out; }
const vNorm = v => Math.sqrt(Object.values(v||{}).reduce((s,x)=>s+x*x,0));
function vUnit(v){ const n=vNorm(v); return n>EPS?vScale(v,1/n):{}; }
function vDot(a,b){ const [s,l]=Object.keys(a||{}).length<=Object.keys(b||{}).length?[a||{},b||{}]:[b||{},a||{}]; let z=0; for(const [k,x] of Object.entries(s)) if(has(l,k)) z+=x*l[k]; return z; }
function vCos(a,b){ const d=vNorm(a)*vNorm(b); return d>EPS?clamp(vDot(a,b)/d,-1,1):0; }
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
  for(const k of keys){
    const b=has(before,k),a=has(after,k);
    if(b&&a){ if(stable(before[k])===stable(after[k])) out[`exec:${k}:same:${atom(before[k])}`]=0.7; else out[`exec:${k}:${atom(before[k])}>${atom(after[k])}`]=1.4; }
    else if(b) out[`exec:${k}:present>absent`]=1.4;
    else out[`exec:${k}:absent>present`]=1.4;
  }
  if(ex.action!==undefined) out[`exec:action:${atom(ex.action)}`]=0.55;
  return vUnit(out);
}
function factFeatures(facts){ const out={}; for(const f of facts||[]) out[`rel:${Array.isArray(f)&&f.length===3?stable(f[0])+'|'+stable(f[1])+'|'+stable(f[2]):stable(f)}`]=1; return vUnit(out); }

// A mathematical graph is another grounding surface, like an execution trace or
// structured fact contact. We deliberately do NOT use its whole-graph signature
// as one categorical fingerprint. Instead we expose name-invariant structural
// features: operator/edge counts and many local neighbourhood motifs. Arbitrary
// vertex names therefore cannot create meaning, and two graphs can partially
// overlap because they share actual mathematical substructure.
function mathGraphFeatures(graph){
  const out={};
  if(!graph)return out;
  if(!Array.isArray(graph.edges))throw new Error('math_graph requires an edges array');
  const canonical=canonicalGraph({edges:graph.edges.map(e=>e.slice())},{maxStates:250000});
  const edges=canonical.edges||[];
  const add=(k,w=1)=>{out[k]=(out[k]||0)+w;};
  add('math:vertices',Math.sqrt(Math.max(1,canonical.vertex_count||0)));
  add('math:edges',Math.sqrt(Math.max(1,edges.length)));

  const vertices=[...new Set(edges.flatMap(e=>[String(e[1]),String(e[2])]))];
  const self=new Map(vertices.map(v=>[v,[]]));
  for(const [label,a,b] of edges){
    const l=stable(label),aa=String(a),bb=String(b);
    add(`math:label:${l}`,1);
    if(aa===bb)self.get(aa)?.push(l);
  }
  let colors=new Map(vertices.map(v=>[v,stable((self.get(v)||[]).sort())]));
  for(const c of colors.values())add(`math:node0:${hash32(c)}`,1);

  const nonself=edges.filter(e=>String(e[1])!==String(e[2]));
  for(const [label,a,b] of nonself){
    const l=stable(label),aa=String(a),bb=String(b);
    add(`math:edge0:${hash32(stable([colors.get(aa),l,colors.get(bb)]))}`,1);
  }

  // Two rounds of Weisfeiler-Lehman-like local refinement yield many local
  // structural motifs, not one whole-object address.
  for(let roundIndex=1;roundIndex<=2;roundIndex++){
    const next=new Map();
    for(const v of vertices){
      const outgoing=nonself.filter(e=>String(e[1])===v).map(e=>['o',stable(e[0]),colors.get(String(e[2]))]).sort((a,b)=>stable(a).localeCompare(stable(b)));
      const incoming=nonself.filter(e=>String(e[2])===v).map(e=>['i',stable(e[0]),colors.get(String(e[1]))]).sort((a,b)=>stable(a).localeCompare(stable(b)));
      const sig=stable([colors.get(v),outgoing,incoming]);
      next.set(v,hash32(sig));
      add(`math:node${roundIndex}:${hash32(sig)}`,1);
    }
    colors=next;
  }

  // Labeled two-edge walks retain argument/order structure while dropping all
  // vertex identities.
  for(const e1 of nonself){
    const mid=String(e1[2]);
    for(const e2 of nonself){
      if(String(e2[1])!==mid)continue;
      add(`math:path2:${hash32(stable([e1[0],e2[0]]))}`,0.5);
    }
  }
  return vUnit(out);
}

function parts(contact){
  const ground={};
  vAdd(ground,executionFeatures(contact?.execution));
  vAdd(ground,factFeatures(contact?.facts));
  vAdd(ground,mathGraphFeatures(contact?.math_graph));
  return {lexical:textFeatures(contact?.utterance||contact?.text||''),context:contextFeatures(contact?.context),ground:vUnit(ground)};
}
function evidenceParts(evidence){
  const out={lexical:{},context:{},ground:{}}; const list=Array.isArray(evidence)?evidence:evidence?[evidence]:[];
  for(const e of list){ const k=typeof e==='string'?e:e?.dimension; if(!k) continue; const w=typeof e==='object'?Math.max(EPS,Number(e.weight)||1):1; const dst=k.startsWith('txt:')||k.startsWith('form:')?out.lexical:k.startsWith('ctx:')?out.context:out.ground; dst[k]=(dst[k]||0)+w; }
  out.lexical=vUnit(out.lexical); out.context=vUnit(out.context); out.ground=vUnit(out.ground); return out;
}

// ---------- Mathematical anatomy of grounded intent ----------
// An anatomy is a predicate over observed pre/post state coordinates plus stable
// contextual conditions. Its constraints are conjunctive, not probability slices.
// whole=1 means the admissible realization set defined by that predicate is the
// local whole. Unresolved coordinates stay explicit instead of being guessed.

function mathValue(v){
  if(v===true) return '1';
  if(v===false) return '0';
  if(typeof v==='number' && Number.isFinite(v)) return Number.isInteger(v)?String(v):String(round(v,9));
  if(v===null) return '∅';
  return `σ_${hash32(stable(v))}`;
}
function sameStable(xs){ return xs.length>0 && xs.every(x=>stable(x)===stable(xs[0])); }
function anatomyConstraint(channel, coordinate, pairs){
  const complete=pairs.every(p=>p.beforePresent&&p.afterPresent);
  if(!complete) return {unresolved:{coordinate,source:channel,reason:'partial-contact',observed:pairs}};
  const bs=pairs.map(p=>p.before),as=pairs.map(p=>p.after);
  if(pairs.every(p=>stable(p.before)===stable(p.after))){
    return {constraint:{coordinate,source:channel,kind:'identity',equation:`${coordinate}(t+1)=${coordinate}(t)`}};
  }
  if(bs.every(Number.isFinite)&&as.every(Number.isFinite)){
    const ds=pairs.map(p=>p.after-p.before);
    if(sameStable(ds)) return {constraint:{coordinate,source:channel,kind:'affine-delta',delta:ds[0],equation:`${coordinate}(t+1)=${coordinate}(t)+(${mathValue(ds[0])})`}};
    if(pairs.every(p=>p.after>p.before)) return {constraint:{coordinate,source:channel,kind:'order',order:'>',equation:`${coordinate}(t+1)>${coordinate}(t)`}};
    if(pairs.every(p=>p.after<p.before)) return {constraint:{coordinate,source:channel,kind:'order',order:'<',equation:`${coordinate}(t+1)<${coordinate}(t)`}};
  }
  if(sameStable(bs)&&sameStable(as)){
    return {constraint:{coordinate,source:channel,kind:'transition',before:clone(bs[0]),after:clone(as[0]),equation:`${coordinate}(t)=${mathValue(bs[0])} ∧ ${coordinate}(t+1)=${mathValue(as[0])}`}};
  }
  if(sameStable(as)) return {constraint:{coordinate,source:channel,kind:'post-constant',after:clone(as[0]),equation:`${coordinate}(t+1)=${mathValue(as[0])}`}};
  if(sameStable(bs)) return {constraint:{coordinate,source:channel,kind:'pre-constant',before:clone(bs[0]),equation:`${coordinate}(t)=${mathValue(bs[0])}`}};
  const map=new Map(); let deterministic=true;
  for(const p of pairs){const b=stable(p.before),a=stable(p.after);if(map.has(b)&&map.get(b)!==a){deterministic=false;break;}map.set(b,a);}
  if(deterministic&&map.size<=12){
    const mappings=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([b,a])=>({before:JSON.parse(b),after:JSON.parse(a)}));
    const equation=mappings.map(m=>`(${coordinate}(t)=${mathValue(m.before)} ⇒ ${coordinate}(t+1)=${mathValue(m.after)})`).join(' ∧ ');
    return {constraint:{coordinate,source:channel,kind:'finite-map',mappings,equation}};
  }
  return {unresolved:{coordinate,source:channel,reason:'non-single-relation',observed:pairs}};
}
function deriveAnatomy(observations=[]){
  const obs=(observations||[]).filter(o=>o&&o.execution&&typeof o.execution==='object');
  if(!obs.length) return {version:INTENT_MATH_VERSION,whole:1,status:'insufficient-grounding',support:0,constraints:[],scope:[],unresolved:[],formula:'⊤',signature:null};
  const flats=obs.map(o=>({before:flatten(o.execution.before||{}),after:flatten(o.execution.after||{}),context:flatten(o.context||{})}));
  const channels=[...new Set(flats.flatMap(x=>[...Object.keys(x.before),...Object.keys(x.after)]))].sort();
  const constraints=[],unresolved=[],coordinates={};
  channels.forEach((channel,i)=>{
    const coordinate=`x${i+1}`;coordinates[coordinate]={source:channel,source_id:`d_${hash32(channel)}`};
    const pairs=flats.map(x=>({beforePresent:has(x.before,channel),afterPresent:has(x.after,channel),before:x.before[channel],after:x.after[channel]}));
    const r=anatomyConstraint(channel,coordinate,pairs);if(r.constraint)constraints.push(r.constraint);else unresolved.push(r.unresolved);
  });
  const contextKeys=[...new Set(flats.flatMap(x=>Object.keys(x.context)))].sort();
  const scope=[],context_coordinates={};
  let ci=0;
  for(const key of contextKeys){
    const vals=flats.map(x=>has(x.context,key)?x.context[key]:undefined);
    if(vals.every(v=>v!==undefined)&&sameStable(vals)){
      ci++;const coordinate=`c${ci}`;context_coordinates[coordinate]={source:key,source_id:`c_${hash32(key)}`};
      scope.push({coordinate,source:key,value:clone(vals[0]),equation:`${coordinate}=${mathValue(vals[0])}`});
    }
  }
  const structuralConstraints=constraints.map(c=>({source_id:coordinates[c.coordinate].source_id,kind:c.kind,delta:c.delta,order:c.order,before:c.before,after:c.after,mappings:c.mappings}));
  const structuralScope=scope.map(s=>({source_id:context_coordinates[s.coordinate].source_id,value:s.value}));
  const structural={version:INTENT_MATH_VERSION,constraints:structuralConstraints,scope:structuralScope,unresolved:unresolved.map(u=>({source_id:coordinates[u.coordinate]?.source_id||`d_${hash32(u.source)}`,reason:u.reason}))};
  const formulaParts=[...scope.map(s=>s.equation),...constraints.map(c=>c.equation)];
  const status=constraints.length?(obs.length<2?'grounded-hypothesis':(unresolved.length?'grounded-partial-equivalent':'grounded-mathematical-equivalent')):'insufficient-grounding';
  return {
    version:INTENT_MATH_VERSION,
    whole:1,
    status,
    support:obs.length,
    coordinates,
    context_coordinates,
    constraints,
    scope,
    unresolved,
    formula:formulaParts.length?`P_I := ${formulaParts.join(' ∧ ')}`:'⊤',
    signature:`μ_${hash32(stable(structural))}`,
    invariant:'The admissible realization set of P_I is normalized as the local whole 1; conjunctive constraints are not mutually-exclusive probability mass.'
  };
}

function config(overrides={}){ return {equivalence_threshold:0.82,overlap_threshold:0.52,min_equivalence_support:2,candidate_floor:0.055,max_components:12,relation_learning_rate:0.3,fixed_point_passes:3,history_limit:10000,...overrides}; }
function one(options={}){ return {whole:1,version:VERSION,intent_math_version:INTENT_MATH_VERSION,step:0,config:config(options.config||{}),relations:{},relation_order:[],canonical:{},canonical_signature:'',canonical_revision:0,equivalence_sets:[],overlaps:[],contradictions:[],encounters:[],current:null,audit:[],metrics:{progress:0,coverage:0,resolution:0,grounding:0,consistency:1,stability:0,unknown_mass:1,relations:0,canonical_relations:0,encounters:0,fixed_point_passes:0,bar:'[------------------------------]   0.00%'}}; }
function assertState(U){ if(!U||U.whole!==1||U.version!==VERSION) throw new Error('F requires one v2 universal relational state'); }
function save(U,file){ assertState(U); fs.writeFileSync(file,JSON.stringify(U)); return file; }
function load(file){ const U=JSON.parse(fs.readFileSync(file,'utf8')); assertState(U); if(!U.intent_math_version)U.intent_math_version=INTENT_MATH_VERSION; return U; }

const relationId = c => String(c.id||`r:${hash32(stable(c.label||c))}`);
function ensureRelation(U,c){
  const id=relationId(c);
  if(!U.relations[id]){
    U.relations[id]={id,labels:c.label?[String(c.label)]:[],created_at:U.step,updated_at:U.step,support:0,grounded_support:0,observations:0,contradiction_support:0,lexical:{},context:{},ground:{},previous:{lexical:{},context:{},ground:{}},drift:1,stability:0,active:c.active!==false,parents:[],children:[],explicit_equivalents:[],explicit_contradictions:[],provenance:[],grounding_examples:[],anatomy:null};
    U.relation_order.push(id);
  }
  const r=U.relations[id];
  if(!Array.isArray(r.grounding_examples))r.grounding_examples=[];
  if(c.label&&!r.labels.includes(String(c.label))) r.labels.push(String(c.label));
  return r;
}
function blend(oldV,newV,a){ if(!Object.keys(oldV||{}).length) return vUnit(newV); const out=vScale(oldV,1-a);vAdd(out,newV,a);return vUnit(out); }
function rememberGrounding(r,provenance){
  if(!provenance?.execution)return;
  const sample={utterance:provenance.utterance||null,execution:clone(provenance.execution),context:clone(provenance.context||{})};
  r.grounding_examples.push(sample);
  if(r.grounding_examples.length>128)r.grounding_examples.splice(0,r.grounding_examples.length-128);
  r.anatomy=deriveAnatomy(r.grounding_examples);
}
function updateRelation(U,c,p,provenance){
  const r=ensureRelation(U,c),ev=evidenceParts(c.evidence),obs={lexical:vUnit(vAdd(vAdd({},p.lexical),ev.lexical,1.2)),context:vUnit(vAdd(vAdd({},p.context),ev.context,1.2)),ground:vUnit(vAdd(vAdd({},p.ground),ev.ground,1.3))};
  if(c.facts) obs.ground=vUnit(vAdd(obs.ground,factFeatures(c.facts),1.3)); if(c.execution) obs.ground=vUnit(vAdd(obs.ground,executionFeatures(c.execution),1.3));
  r.previous={lexical:{...r.lexical},context:{...r.context},ground:{...r.ground}}; const a=clamp(U.config.relation_learning_rate/Math.sqrt(1+0.15*r.observations),0.055,0.42);
  r.lexical=blend(r.lexical,obs.lexical,a);r.context=blend(r.context,obs.context,a);r.ground=blend(r.ground,obs.ground,a);r.observations++;r.support+=Math.max(0.1,Number(c.support)||1);if(vNorm(obs.ground)>EPS)r.grounded_support++;r.drift=mean([vDistance(r.previous.lexical,r.lexical),vDistance(r.previous.context,r.context),vDistance(r.previous.ground,r.ground)]);r.updated_at=U.step;
  if(c.active===false)r.active=false;r.parents=uniq([...r.parents,...(c.parents||[]).map(String)]);r.children=uniq([...r.children,...(c.children||[]).map(String)]);r.explicit_equivalents=uniq([...r.explicit_equivalents,...(c.equivalent_to||c.equivalents||[]).map(String)]);r.explicit_contradictions=uniq([...r.explicit_contradictions,...(c.contradicts||[]).map(String)]);if(provenance)r.provenance.push(provenance);if(r.provenance.length>96)r.provenance.splice(0,r.provenance.length-96);rememberGrounding(r,provenance);return r.id;
}
function resolveRef(U,ref){ const s=String(ref); if(U.relations[s])return s; return U.relation_order.find(id=>U.relations[id]?.labels?.includes(s))||null; }
function syncHierarchy(U){ for(const id of U.relation_order){const r=U.relations[id];if(!r)continue;for(const x of r.children.slice()){const c=resolveRef(U,x);if(c&&c!==id)U.relations[c].parents=uniq([...U.relations[c].parents,id]);}for(const x of r.parents.slice()){const p=resolveRef(U,x);if(p&&p!==id)U.relations[p].children=uniq([...U.relations[p].children,id]);}} }
const explicitEq=(a,b)=>a.explicit_equivalents.includes(b.id)||b.explicit_equivalents.includes(a.id)||a.labels.some(x=>b.explicit_equivalents.includes(x))||b.labels.some(x=>a.explicit_equivalents.includes(x));
const explicitContra=(a,b)=>a.explicit_contradictions.includes(b.id)||b.explicit_contradictions.includes(a.id)||a.labels.some(x=>b.explicit_contradictions.includes(x))||b.labels.some(x=>a.explicit_contradictions.includes(x));
function relationSimilarity(a,b){ const gs=vCos(a.ground,b.ground),cs=vCos(a.context,b.context),ls=vCos(a.lexical,b.lexical),g=vNorm(a.ground)>EPS&&vNorm(b.ground)>EPS,c=vNorm(a.context)>EPS&&vNorm(b.context)>EPS; return g?clamp(.82*gs+.11*cs+.07*ls):c?clamp(.6*cs+.4*ls):clamp(ls); }
class UF{constructor(xs){this.p=Object.fromEntries(xs.map(x=>[x,x]));}find(x){let p=this.p[x];while(p!==this.p[p])p=this.p[p];while(x!==p){const n=this.p[x];this.p[x]=p;x=n;}return p;}union(a,b){a=this.find(a);b=this.find(b);if(a!==b)this.p[a<b?b:a]=a<b?a:b;}}
function canonicalize(U){
  const active=U.relation_order.map(id=>U.relations[id]).filter(r=>r?.active),uf=new UF(active.map(r=>r.id)),overlaps=[],contradictions=[];
  for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){const a=active[i],b=active[j],sim=relationSimilarity(a,b),contra=explicitContra(a,b);if(contra)contradictions.push({a:a.id,b:b.id,similarity:round(sim)});if(!contra&&(explicitEq(a,b)||(a.support>=U.config.min_equivalence_support&&b.support>=U.config.min_equivalence_support&&sim>=U.config.equivalence_threshold)))uf.union(a.id,b.id);else if(sim>=U.config.overlap_threshold)overlaps.push({a:a.id,b:b.id,similarity:round(sim)});}
  const groups=new Map();for(const r of active){const root=uf.find(r.id);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(r.id);}U.canonical={};U.equivalence_sets=[];
  for(const ids of groups.values()){const ms=ids.map(id=>U.relations[id]).sort((a,b)=>b.grounded_support-a.grounded_support||b.support-a.support||a.id.localeCompare(b.id)),rep=ms[0].id;for(const id of ids)U.canonical[id]=rep;U.equivalence_sets.push({representative:rep,members:ids.slice().sort()});}
  U.equivalence_sets.sort((a,b)=>a.representative.localeCompare(b.representative));U.overlaps=overlaps.sort((a,b)=>b.similarity-a.similarity);U.contradictions=contradictions;const sig=stable(U.equivalence_sets),changed=sig!==U.canonical_signature;if(changed){U.canonical_signature=sig;U.canonical_revision++;}return changed;
}
function canonicalRelations(U){
  const out=[];
  for(const set of U.equivalence_sets){
    const ms=set.members.map(id=>U.relations[id]).filter(Boolean),v={lexical:{},context:{},ground:{}};let total=0,support=0,grounded=0,stability=0;const labels=[],children=[],parents=[],grounding=[];
    for(const r of ms){const w=Math.max(EPS,r.support);total+=w;support+=r.support;grounded+=r.grounded_support;stability+=r.stability*w;vAdd(v.lexical,r.lexical,w);vAdd(v.context,r.context,w);vAdd(v.ground,r.ground,w);labels.push(...r.labels);children.push(...r.children);parents.push(...r.parents);grounding.push(...(r.grounding_examples||[]));}
    out.push({id:set.representative,members:set.members.slice(),labels:uniq(labels),lexical:vUnit(v.lexical),context:vUnit(v.context),ground:vUnit(v.ground),support,grounded_support:grounded,stability:total?stability/total:0,children:uniq(children),parents:uniq(parents),anatomy:deriveAnatomy(grounding)});
  }
  return out;
}
function refreshStability(U){ for(const id of U.relation_order){const r=U.relations[id];if(!r)continue;r.stability=clamp((r.support/(r.support+2))*Math.exp(-4*r.drift)/(1+r.contradiction_support));} }
function refreshContradiction(U){for(const id of U.relation_order)if(U.relations[id])U.relations[id].contradiction_support=0;for(const c of U.contradictions){const a=U.relations[c.a],b=U.relations[c.b];if(!a||!b)continue;const p=.07*Math.min(a.support,b.support)*Math.max(.1,c.similarity);a.contradiction_support+=p;b.contradiction_support+=p;}}
function contactSimilarity(r,p){const terms=[];if(vNorm(p.lexical)>EPS&&vNorm(r.lexical)>EPS)terms.push([.62,vCos(p.lexical,r.lexical)]);if(vNorm(p.context)>EPS&&vNorm(r.context)>EPS)terms.push([.25,vCos(p.context,r.context)]);if(vNorm(p.ground)>EPS&&vNorm(r.ground)>EPS)terms.push([.85,vCos(p.ground,r.ground)]);if(!terms.length)return 0;const z=terms.reduce((s,[w])=>s+w,0);return clamp(terms.reduce((s,[w,x])=>s+w*Math.max(0,x),0)/z);}
function canonicalHints(U,hints){let x=null;return uniq((hints||[]).map(h=>U.canonical[h]||((x=resolveRef(U,h))&&(U.canonical[x]||x))).filter(Boolean));}
function resolveInside(U,map,r,trail=new Set()){
  if(trail.has(r.id))return{whole:1,components:[],self_mass:1,cycle:true};const next=new Set(trail);next.add(r.id);const ids=canonicalHints(U,r.children).filter(id=>id!==r.id&&map.has(id));if(!ids.length)return null;const scored=ids.map(id=>{const c=map.get(id),score=clamp(.55*vCos(r.ground,c.ground)+.25*vCos(r.context,c.context)+.2*vCos(r.lexical,c.lexical));return{relation:id,labels:c.labels,score,inside:resolveInside(U,map,c,next)};}).filter(x=>x.score>.01).sort((a,b)=>b.score-a.score);if(!scored.length)return{whole:1,components:[],self_mass:1};const covered=clamp(.2+.7*mean(scored.map(x=>x.score)),.05,.95),z=scored.reduce((s,x)=>s+x.score,0)||1;for(const x of scored)x.mass=covered*x.score/z;return{whole:1,components:scored,self_mass:1-covered};
}
function resolveParts(U,p,hints=[]){
  const canon=canonicalRelations(U),map=new Map(canon.map(r=>[r.id,r])),hintSet=new Set(canonicalHints(U,hints));let scored=canon.map(r=>{let score=contactSimilarity(r,p);if(hintSet.has(r.id))score=clamp(score+.22);return{relation:r.id,members:r.members,labels:r.labels,score,stability:r.stability,inside:resolveInside(U,map,r),anatomy:r.anatomy};}).filter(x=>x.score>=U.config.candidate_floor||hintSet.has(x.relation)).sort((a,b)=>b.score-a.score||b.stability-a.stability||a.relation.localeCompare(b.relation));if(!scored.length)return{components:[],matches:[],unknown_mass:1,unresolved_dimensions:topUnresolved(p)};scored=scored.slice(0,Math.max(U.config.max_components,16));const best=scored[0].score,second=scored[1]?.score||0,margin=Math.max(0,best-second),known=clamp(.72*best+.28*Math.min(1,margin*3),0,.985),selected=scored.filter(x=>x.score>=Math.max(U.config.candidate_floor,best*.42)).slice(0,U.config.max_components),z=selected.reduce((s,x)=>s+Math.pow(x.score,2),0)||1,components=selected.map(x=>({...x,mass:known*Math.pow(x.score,2)/z}));return{components,matches:scored.map(x=>({relation:x.relation,labels:x.labels,score:round(x.score),members:x.members,anatomy_signature:x.anatomy?.signature||null})),unknown_mass:1-known,unresolved_dimensions:topUnresolved(p)};
}
function topUnresolved(p){const all={};vAdd(all,p.lexical);vAdd(all,p.context);vAdd(all,p.ground);return topVector(all,10);}
function reResolve(U,fieldChanged){
  for(const e of U.encounters){const grounded=(e.hints||[]).length>0,hSig=grounded?stable(canonicalHints(U,e.hints)):'',hintChanged=grounded&&hSig!==(e.hint_signature||''),must=!e.resolution||hintChanged||(!grounded&&fieldChanged);if(!must)continue;e.resolution=resolveParts(U,e.parts,e.hints);e.hint_signature=hSig;e.resolved_revision=U.canonical_revision;}
}
function refreshMetrics(U,passes){const active=U.relation_order.map(id=>U.relations[id]).filter(r=>r?.active),rs=U.encounters.map(e=>e.resolution).filter(Boolean),unknown=mean(rs.map(r=>r.unknown_mass)),resolution=mean(rs.map(r=>r.matches?.[0]?.score||0)),grounding=active.length?mean(active.map(r=>clamp(r.grounded_support/Math.max(1,r.observations)))):0,stability=active.length?mean(active.map(r=>r.stability)):0,consistency=active.length?clamp(1-mean(active.map(r=>clamp(r.contradiction_support/Math.max(1,r.support))))):1,coverage=1-unknown,vals=[coverage,resolution,grounding,stability,consistency].map(x=>Math.max(EPS,x)),progress=Math.exp(vals.reduce((s,x)=>s+Math.log(x),0)/vals.length),w=30,n=Math.round(w*progress);U.metrics={progress:round(progress),coverage:round(coverage),resolution:round(resolution),grounding:round(grounding),consistency:round(consistency),stability:round(stability),unknown_mass:round(unknown),relations:active.length,canonical_relations:U.equivalence_sets.length,encounters:U.encounters.length,fixed_point_passes:passes,bar:`[${'#'.repeat(n)}${'-'.repeat(w-n)}] ${(100*progress).toFixed(2).padStart(6)}%`};}
function fixedPoint(U,fieldChanged){let passes=0;for(let i=0;i<U.config.fixed_point_passes;i++){refreshStability(U);const changed=canonicalize(U);refreshContradiction(U);reResolve(U,fieldChanged);passes=i+1;if(!changed)break;}refreshMetrics(U,passes);return passes;}
function candidates(contact,signal){const out=[];for(const [src,name] of [[contact?.relations,contact?.source||'contact'],[contact?.candidates,contact?.source||'contact'],[signal?.relations,'semantic_signal'],[signal?.candidates,'semantic_signal']])if(Array.isArray(src))for(const c of src)if(c&&typeof c==='object')out.push({candidate:c,source:name});return out;}
function oracleView(U,contact,p){return{law:'U(t+1)=F(U(t)⊕X(t+1)); whole=1',step:U.step,contact:{utterance:contact.utterance||contact.text||null,context:contact.context||null,execution:contact.execution||null,facts:contact.facts||null,math_graph:contact.math_graph?{vertex_count:contact.math_graph.vertex_count??null,edge_count:Array.isArray(contact.math_graph.edges)?contact.math_graph.edges.length:0}:null},relations:canonicalRelations(U).sort((a,b)=>b.support-a.support).slice(0,128).map(r=>({id:r.id,labels:r.labels,members:r.members,support:round(r.support),stability:round(r.stability),lexical:topVector(r.lexical,5),context:topVector(r.context,5),ground:topVector(r.ground,5),anatomy:r.anatomy?.signature?{status:r.anatomy.status,signature:r.anatomy.signature,formula:r.anatomy.formula}:null})),observed:{lexical:topVector(p.lexical),context:topVector(p.context),ground:topVector(p.ground)},signal_contract:{candidates:[{id:'optional',label:'optional',evidence:['optional dimensions'],parents:['optional'],children:['optional'],equivalent_to:['optional'],contradicts:['optional']}]}};}
function mathematicalEquivalent(U,ref=null){
  assertState(U);let id=ref?resolveRef(U,ref):U.current?.resolution?.components?.[0]?.relation||null;if(!id&&ref&&U.canonical[String(ref)])id=String(ref);if(!id)return null;const canonical=U.canonical[id]||id;const r=canonicalRelations(U).find(x=>x.id===canonical);return r?{canonical_relation:canonical,...r.anatomy}:null;
}
async function F(U,contact,oracle=null){
  assertState(U);if(!contact||typeof contact!=='object')throw new Error('X must be a contact object');U.step++;const p=parts(contact);let signal=null;if(oracle){if(typeof oracle!=='function')throw new Error('oracle must be a function');signal=await oracle(oracleView(U,contact,p));if(signal!=null&&typeof signal!=='object')throw new Error('oracle signal must be object or null');}
  const proposed=candidates(contact,signal),ids=[];const provenanceBase={step:U.step,utterance:contact.utterance||contact.text||null,execution:clone(contact.execution||null),context:clone(contact.context||{}),facts:clone(contact.facts||null),math_graph:clone(contact.math_graph||null)};for(const {candidate,source} of proposed)ids.push(updateRelation(U,candidate,p,{...provenanceBase,source}));syncHierarchy(U);if((contact.facts||[]).length&&!proposed.length)ids.push(updateRelation(U,{label:`§relation-${U.step}`,facts:contact.facts,support:.35},p,{...provenanceBase,source:'structured_contact'}));
  const e={id:`i:${U.step}:${hash32(stable({u:contact.utterance||contact.text||null,c:contact.context||null,e:contact.execution||null,m:contact.math_graph?mathGraphFeatures(contact.math_graph):null}))}`,step:U.step,utterance:contact.utterance||contact.text||null,parts:p,hints:ids.slice(),resolution:null,hint_signature:'',resolved_revision:-1};U.encounters.push(e);if(U.encounters.length>U.config.history_limit)U.encounters.splice(0,U.encounters.length-U.config.history_limit);const passes=fixedPoint(U,proposed.length>0);e.resolution=resolveParts(U,p,ids);e.hint_signature=stable(canonicalHints(U,ids));U.current={step:U.step,contact,proposed_relations:ids,resolution:e.resolution,mathematical_equivalent:e.resolution.components?.[0]?.anatomy||null,discrepancies:e.resolution.unresolved_dimensions,metrics:U.metrics};U.audit.push({step:U.step,proposed_relations:ids,canonical:ids.map(id=>U.canonical[id]||id),unknown_mass:round(e.resolution.unknown_mass),progress:U.metrics.progress,fixed_point_passes:passes,anatomy_signature:e.resolution.components?.[0]?.anatomy?.signature||null});if(U.audit.length>U.config.history_limit)U.audit.splice(0,U.audit.length-U.config.history_limit);return U;
}

module.exports={one,F,save,load,oracleView,deriveAnatomy,mathematicalEquivalent,mathGraphFeatures};
