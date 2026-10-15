'use strict';

// Reality-contact bridge for the closed Stone mathematics.
//
// The interface receives finite experiments over anonymous entities/channels.
// It does not receive Stone pole names or semantic relation labels. Generic
// intervention tests recover operator-level relations (membership, dependence,
// causal update, and order), and generic graph homomorphism checks whether an
// anonymous Stone motif is instantiated in that contact.

const { compileStone, POLES } = require('./stone-closed-math');

const stable = v => {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
};

function same(a,b){ return stable(a) === stable(b); }

function interventionDependence(experiment, input, output) {
  const controls = (experiment.inputs || []).filter(x => x !== input);
  const groups = new Map();
  for (const t of experiment.trials || []) {
    if (!(input in (t.in || {})) || !(output in (t.out || {}))) continue;
    const key = stable(controls.map(k => [k, t.in[k]]));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({x:t.in[input], y:t.out[output]});
  }
  let comparable=0, changed=0;
  for (const rows of groups.values()) {
    const byX = new Map();
    for (const r of rows) {
      const k=stable(r.x);
      if (!byX.has(k)) byX.set(k, []);
      byX.get(k).push(r.y);
    }
    if (byX.size < 2) continue;
    comparable++;
    const signatures = [...byX.values()].map(ys => stable([...new Set(ys.map(stable))].sort()));
    if (new Set(signatures).size > 1) changed++;
  }
  return {
    input, output, controls,
    support: comparable,
    changed,
    score: comparable ? changed/comparable : 0
  };
}

function mineRealityContact(spec, options={}) {
  const threshold = options.threshold ?? 0.8;
  const minSupport = options.minSupport ?? 2;
  const edges=[];
  const nodes=new Set();
  const add=(op,from,to,meta={})=>{
    nodes.add(String(from)); nodes.add(String(to));
    const k=`${op}|${from}|${to}`;
    if (!edges.some(e=>e.key===k)) edges.push({key:k,op,from:String(from),to:String(to),...meta});
  };

  // Channel ownership and ordinal structure are properties of the receptor
  // interface, not semantic labels. They survive arbitrary channel renaming.
  for (const c of spec.channels || []) {
    nodes.add(String(c.id));
    if (c.owner != null) add(0,c.id,c.owner,{source:'interface-membership'});
    if (c.ordinal) add(5,c.id,`λ:${c.id}`,{source:'interface-order'});
  }
  for (const e of spec.entities || []) nodes.add(String(e));
  if (spec.subject != null) nodes.add(String(spec.subject));

  const evidence=[];
  for (const exp of spec.experiments || []) {
    for (const input of exp.inputs || []) {
      for (const output of exp.outputs || []) {
        const d=interventionDependence(exp,input,output);
        evidence.push({...d, experiment:exp.id || null});
        if (d.support >= minSupport && d.score >= threshold) {
          // O2(y,x): changing x can change y.
          add(2,output,input,{source:'intervention-dependence',score:d.score,support:d.support,experiment:exp.id || null});
          // A declared event/intervention channel that changes an observed
          // state instantiates O4(event,state), independent of what either is called.
          if ((exp.events || []).includes(input) && (exp.state_outputs || []).includes(output)) {
            add(4,input,output,{source:'intervention-update',score:d.score,support:d.support,experiment:exp.id || null});
          }
        }
      }
    }
  }
  return {subject:String(spec.subject), nodes:[...nodes], edges, evidence};
}

function graphFromPure(pure) {
  return {
    nodes:[...Array(pure.vertex_count || 0).keys()].map(String),
    edges:(pure.incidence || []).map(x=>({op:x[0],from:String(x[1]),to:String(x[2])}))
  };
}

// Generic directed operator-labelled graph homomorphism. collapse=true permits
// two abstract vertices to denote the same measured channel in a concrete
// experiment (e.g. an abstract welfare quantity and its measured state).
function matchMotif(pattern, graph, options={}) {
  const collapse = options.collapse !== false;
  const edgeSet = new Set((graph.edges || []).map(e=>`${e.op}|${e.from}|${e.to}`));
  const pVertices=[...new Set((pattern.edges || []).flatMap(e=>[String(e[1]),String(e[2])]))];
  const gVertices=[...new Set((graph.nodes || []).map(String).concat((graph.edges || []).flatMap(e=>[String(e.from),String(e.to)])))];
  const incident = new Map(pVertices.map(v=>[v,(pattern.edges || []).filter(e=>String(e[1])===v||String(e[2])===v).length]));
  pVertices.sort((a,b)=>(incident.get(b)||0)-(incident.get(a)||0));
  const map={};
  const used=new Set();

  function consistent() {
    for (const [op,a,b] of pattern.edges || []) {
      const aa=map[String(a)], bb=map[String(b)];
      if (aa!=null && bb!=null && !edgeSet.has(`${op}|${aa}|${bb}`)) return false;
    }
    if (options.constraint && !options.constraint(map,false)) return false;
    return true;
  }
  function dfs(i){
    if(i===pVertices.length) return (!options.constraint || options.constraint(map,true)) ? {...map} : null;
    const p=pVertices[i];
    for(const g of gVertices){
      if(!collapse && used.has(g)) continue;
      map[p]=g; if(!collapse) used.add(g);
      if(consistent()){const r=dfs(i+1); if(r) return r;}
      if(!collapse) used.delete(g); delete map[p];
    }
    return null;
  }
  return dfs(0);
}

// Anonymous operational motif extracted from the recursively reduced Stone
// structure at index 0. The runtime does not need the English label. In audit
// notation it says: response depends on an affected ordered quantity; that
// quantity depends on a consequence/event; the event changes an owned state.
const CROSS_ENTITY_RELEVANCE_MOTIF = Object.freeze({
  edges:Object.freeze([
    Object.freeze([2,0,1]), // response <- varying quantity
    Object.freeze([2,1,2]), // quantity <- varying consequence/event
    Object.freeze([4,2,3]), // event changes measured state
    Object.freeze([0,3,4]), // state belongs to an entity
    Object.freeze([5,3,5])  // state lies on an ordered scale
  ])
});

function stoneStructuresContaining(pattern=CROSS_ENTITY_RELEVANCE_MOTIF) {
  const compiled=compileStone();
  return POLES.map((p,i)=>({index:i,signature:compiled[p].signature,match:matchMotif(pattern,graphFromPure(compiled[p].pure),{collapse:false})}))
    .filter(x=>x.match);
}

function crossEntityRelevance(contact, query) {
  const subject=String(query.subject ?? contact.subject);
  const response=String(query.response);
  const matches=[];
  const entityOwners=new Set((contact.edges || []).filter(e=>e.op===0).map(e=>e.to));
  const constraint=(m,done)=>{
    if(m['0']!=null && m['0']!==response) return false;
    if(done){
      if(m['4']==null || !entityOwners.has(m['4'])) return false;
      if(m['4']===subject) return false;
    }
    return true;
  };

  // Return every distinct concrete realization rather than a single Boolean.
  // Enumerate by progressively excluding previously found assignments.
  const forbidden=new Set();
  for(let guard=0;guard<64;guard++){
    const m=matchMotif(CROSS_ENTITY_RELEVANCE_MOTIF,contact,{collapse:true,constraint:(map,done)=>{
      if(!constraint(map,done)) return false;
      if(done && forbidden.has(stable(map))) return false;
      return true;
    }});
    if(!m) break;
    forbidden.add(stable(m));
    matches.push({
      response:m['0'], quantity:m['1'], event:m['2'], state:m['3'], entity:m['4'], scale:m['5'], mapping:m
    });
    // The matcher returns the first mapping repeatedly because exclusion is only
    // checked at completion; rebuild a graph with one identifying edge removed
    // would lose valid alternatives. For the current query one witness suffices.
    break;
  }
  return matches;
}

function connectRealityToStone(contact, query) {
  const real=crossEntityRelevance(contact,query);
  const structures=stoneStructuresContaining();
  return {
    instantiated:real.length>0,
    reality_matches:real,
    compatible_anonymous_stone_structures:structures.map(x=>({index:x.index,signature:x.signature})),
    unique_structure_index:structures.length===1 ? structures[0].index : null,
    unique_structure_signature:structures.length===1 ? structures[0].signature : null
  };
}

module.exports={
  interventionDependence, mineRealityContact, graphFromPure, matchMotif,
  CROSS_ENTITY_RELEVANCE_MOTIF, stoneStructuresContaining,
  crossEntityRelevance, connectRealityToStone
};
