'use strict';

// Generic recursive reduction + canonical normal form for the Universal
// Language Track.
//
// Relation symbols are not assumed to be fundamental. A relation may have a
// corrigible definition in terms of other relations; definitions may nest.
// Fully reducible structures are compared after expansion and graph
// canonicalization, so arbitrary relation names, vertex names, and edge order
// do not determine identity. Cycles and undefined relations remain explicit
// terminals/unresolved structure rather than being guessed away.

const stable = v => {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
};

const relKey = r => stable(r);
const nodeKey = n => stable(n);

function validatePattern(pattern) {
  if (!pattern || !Array.isArray(pattern.edges)) throw new Error('pattern.edges must be an array');
  for (const e of pattern.edges) {
    if (!Array.isArray(e) || e.length !== 3) throw new Error('each edge must be [relation,from,to]');
    if (e[0] === undefined || e[1] === undefined || e[2] === undefined) throw new Error('edge terms must be defined');
  }
  return true;
}

function normalizeDefinitions(definitions={}) {
  const out = new Map();
  const entries = definitions instanceof Map ? [...definitions.entries()] : Object.entries(definitions);
  for (const [rawName, rawDef] of entries) {
    const name = rawDef && Object.prototype.hasOwnProperty.call(rawDef,'relation') ? rawDef.relation : rawName;
    const def = rawDef || {};
    const params = Array.isArray(def.params) ? def.params.slice() : ['from','to'];
    if (params.length !== 2) throw new Error(`definition ${String(name)} requires exactly two endpoint params`);
    if (nodeKey(params[0]) === nodeKey(params[1])) throw new Error(`definition ${String(name)} endpoint params must differ`);
    const pattern = {edges:(def.edges || def.pattern?.edges || []).map(e=>e.slice())};
    validatePattern(pattern);
    out.set(relKey(name), {relation:name, params, pattern});
  }
  return out;
}

function expandPattern(pattern, definitions={}, options={}) {
  validatePattern(pattern);
  const defs = normalizeDefinitions(definitions);
  const maxDepth = options.maxDepth ?? 64;
  let fresh = 0;
  let expansionCount = 0;
  const unresolved = new Set();
  const terminal = [];

  const instantiate = (def, from, to) => {
    const bindings = new Map([
      [nodeKey(def.params[0]), from],
      [nodeKey(def.params[1]), to]
    ]);
    const locals = new Map();
    const resolveNode = n => {
      const k=nodeKey(n);
      if (bindings.has(k)) return bindings.get(k);
      if (!locals.has(k)) locals.set(k,{__ul_internal__:++fresh});
      return locals.get(k);
    };
    return def.pattern.edges.map(([r,a,b])=>[r,resolveNode(a),resolveNode(b)]);
  };

  function walk(edge, stack, depth) {
    const [relation,from,to] = edge;
    const k=relKey(relation);
    const def=defs.get(k);
    if (!def) {
      terminal.push([relation,from,to]);
      return;
    }
    if (depth >= maxDepth || stack.includes(k)) {
      unresolved.add(k);
      terminal.push([relation,from,to]);
      return;
    }
    expansionCount++;
    const nextStack=stack.concat(k);
    for (const inner of instantiate(def,from,to)) walk(inner,nextStack,depth+1);
  }

  for (const edge of pattern.edges) walk(edge,[],0);
  return {
    edges:terminal,
    expansion_count:expansionCount,
    unresolved_relations:[...unresolved].sort()
  };
}

function graphData(pattern) {
  validatePattern(pattern);
  const vertices=[];
  const seen=new Set();
  const add=v=>{const k=nodeKey(v);if(!seen.has(k)){seen.add(k);vertices.push(k);}};
  const edges=pattern.edges.map(([op,a,b])=>{
    const aa=nodeKey(a), bb=nodeKey(b);
    add(a); add(b);
    return {op:relKey(op),a:aa,b:bb};
  });
  return {vertices,edges};
}

function refineColors(data, seed) {
  let colors = new Map(data.vertices.map(v=>[v,seed?.get(v) ?? '0']));
  for (let round=0;round<=data.vertices.length+2;round++) {
    const sigs=new Map();
    for (const v of data.vertices) {
      const out=data.edges.filter(e=>e.a===v).map(e=>['o',e.op,colors.get(e.b)]).sort((a,b)=>stable(a).localeCompare(stable(b)));
      const inc=data.edges.filter(e=>e.b===v).map(e=>['i',e.op,colors.get(e.a)]).sort((a,b)=>stable(a).localeCompare(stable(b)));
      sigs.set(v,stable([colors.get(v),out,inc]));
    }
    const uniq=[...new Set(sigs.values())].sort();
    const index=new Map(uniq.map((s,i)=>[s,String(i)]));
    const next=new Map(data.vertices.map(v=>[v,index.get(sigs.get(v))]));
    let same=true;
    for (const v of data.vertices) if(next.get(v)!==colors.get(v)){same=false;break;}
    colors=next;
    if(same) break;
  }
  return colors;
}

function serializeWithOrder(data, order) {
  const idx=new Map(order.map((v,i)=>[v,i]));
  const edges=data.edges.map(e=>[e.op,idx.get(e.a),idx.get(e.b)]);
  edges.sort((a,b)=>stable(a).localeCompare(stable(b)));
  return stable({vertex_count:order.length,edges});
}

// Exact canonical labelling via color refinement + individualization. It is
// intentionally bounded: if a highly symmetric graph exceeds the search
// budget, fail rather than silently return a name-dependent pseudo-canonical
// form.
function canonicalGraph(pattern, options={}) {
  const data=graphData(pattern);
  const maxStates=options.maxStates ?? 50000;
  let states=0;

  function search(seed) {
    if (++states > maxStates) throw new Error('canonicalization state limit exceeded');
    const colors=refineColors(data,seed);
    const classes=new Map();
    for(const v of data.vertices){const c=colors.get(v);if(!classes.has(c))classes.set(c,[]);classes.get(c).push(v);}
    const orderedClasses=[...classes.entries()].sort((a,b)=>Number(a[0])-Number(b[0]));
    if(orderedClasses.every(([,vs])=>vs.length===1)) {
      return serializeWithOrder(data,orderedClasses.map(([,vs])=>vs[0]));
    }

    const [chosenColor,chosen]=orderedClasses.find(([,vs])=>vs.length>1);
    let best=null;
    // Each candidate individualization is explored; choosing the lexical
    // minimum result removes dependence on original vertex names/order.
    for(const v of chosen) {
      const next=new Map(colors);
      next.set(v,`${chosenColor}:*`);
      const s=search(next);
      if(best===null || s<best) best=s;
    }
    return best;
  }

  // Empty structures have one deterministic normal form.
  if(!data.vertices.length) return {vertex_count:0,edges:[],signature:stable({vertex_count:0,edges:[]}),states:0};
  const signature=search(null);
  const parsed=JSON.parse(signature);
  return {...parsed,signature,states};
}

function recursiveNormalForm(pattern, definitions={}, options={}) {
  const expanded=expandPattern(pattern,definitions,options);
  const canonical=canonicalGraph({edges:expanded.edges},options);
  return {
    version:1,
    vertex_count:canonical.vertex_count,
    edges:canonical.edges,
    signature:canonical.signature,
    expansion_count:expanded.expansion_count,
    unresolved_relations:expanded.unresolved_relations,
    canonicalization_states:canonical.states
  };
}

function equivalentUnderReduction(a,b,definitionsA={},definitionsB=definitionsA,options={}) {
  const A=recursiveNormalForm(a,definitionsA,options);
  const B=recursiveNormalForm(b,definitionsB,options);
  return {equivalent:A.signature===B.signature,A,B};
}

module.exports={
  stable, validatePattern, normalizeDefinitions, expandPattern,
  canonicalGraph, recursiveNormalForm, equivalentUnderReduction
};
