'use strict';

// Recursive mathematical composition for the Universal Language Track.
//
// This file does not parse English, assign semantic truth, own candidate
// definitions, or own candidate status. A recursive clause stores only an
// opaque math-hypothesis reference plus subject/content references. Every
// compilation dereferences the current usable candidate from math-hypotheses.js.
// Therefore revision, defeat, contestation, or restoration has one authority:
// the live mathematical-hypothesis ledger.
//
// A child clause is embedded structurally through QUOTE/EXTENSION, not by a
// family label, string, hash, frozen signature, or copied local definition.

const {
  MOP, variable, constant, app, validateExpr, compileMathGraph
}=require('./universal-math-graph');
const {currentMathHypothesis}=require('./math-hypotheses');

const V=variable, C=constant, A=app;
const eq=(a,b)=>A(MOP.EQ,a,b);
const neq=(a,b)=>A(MOP.NEQ,a,b);
const neg=a=>A(MOP.NEG,a);
const and=(...xs)=>A(MOP.AND,...xs);
const inSet=(a,S)=>A(MOP.IN,a,S);
const subset=(a,b)=>A(MOP.SUBSET,a,b);
const card=S=>A(MOP.CARD,S);
const lt=(a,b)=>A(MOP.LT,a,b);
const tuple=(...xs)=>A(MOP.TUPLE,...xs);
const intersect=(a,b)=>A(MOP.INTERSECT,a,b);
const complement=(a,U)=>A(MOP.COMPLEMENT,a,U);
const quote=f=>A(MOP.QUOTE,f);
const extension=(f,U)=>A(MOP.EXTENSION,f,U);
const nonempty=S=>lt(C(0),card(S));

function oneRecursiveIntentState(){
  return {whole:1,version:3,step:0,nodes:{},audit:[]};
}

function assertState(S){
  if(!S||S.whole!==1||!S.nodes)throw new Error('invalid recursive intent state');
}

function addAtom(S,id,token=id){
  assertState(S);id=String(id);
  if(S.nodes[id])throw new Error(`duplicate recursive node ${id}`);
  S.nodes[id]={id,type:0,token:String(token)};
  S.audit.push({step:++S.step,kind:'node-added',id,type:0});
  return S.nodes[id];
}

function addClause(S,id,{hypothesis,subject,content}){
  assertState(S);id=String(id);
  if(S.nodes[id])throw new Error(`duplicate recursive node ${id}`);
  if(hypothesis===undefined||hypothesis===null)throw new Error('recursive clause requires math hypothesis');
  if(content===undefined||content===null)throw new Error('recursive clause requires content node');
  S.nodes[id]={id,type:1,hypothesis:String(hypothesis),subject:String(subject),content:String(content)};
  S.audit.push({step:++S.step,kind:'node-added',id,type:1,hypothesis:String(hypothesis)});
  return S.nodes[id];
}

function instantiate(expr,bindings,prefix){
  validateExpr(expr);
  if(expr.kind==='const')return expr;
  if(expr.kind==='var'){
    if(Object.prototype.hasOwnProperty.call(bindings,expr.name))return bindings[expr.name];
    return V(`${prefix}${expr.name}`);
  }
  return A(expr.op,...expr.args.map(x=>instantiate(x,bindings,prefix)));
}

function sourceTerm(name,bindings,prefix){
  return Object.prototype.hasOwnProperty.call(bindings,name)
    ? bindings[name]
    : V(`${prefix}${name}`);
}

function instantiateHypothesis(h,{content,universe,subject,prefix}){
  const spec=h.composition;
  if(!h.expressions||!spec)throw new Error(`math hypothesis ${h.id} is not composition-ready`);
  const bindings={
    [spec.content]:content,
    [spec.universe]:universe
  };
  if(spec.subject)bindings[spec.subject]=subject;
  const constraints=h.expressions.map(e=>instantiate(e,bindings,prefix));

  // Some candidate anatomies do not yet contain an explicit participant
  // variable. Their proposer-side interface may supply a generic frame over
  // already-existing source variables so subject identity remains structural.
  if(spec.frame){
    const terms=spec.frame.map(name=>sourceTerm(name,bindings,prefix));
    constraints.push(eq(V(`${prefix}frame`),tuple(subject,...terms)));
  }
  return constraints;
}

function buildRecursiveSource(S,L,rootId,options={}){
  assertState(S);rootId=String(rootId);
  if(!L||L.whole!==1||!L.candidates)throw new Error('recursive composition requires live math hypothesis ledger');
  if(!S.nodes[rootId])throw new Error(`unknown recursive root ${rootId}`);
  const ns=String(options.namespace??'');
  const U=V(`${ns}universe`);
  const agents=new Map(), atoms=new Map(), cache=new Map(), visiting=new Set();
  const nodeFormulas={};
  const usedHypotheses=new Map();

  const subjectTerm=token=>{
    token=String(token);
    if(!agents.has(token))agents.set(token,V(`${ns}subject:${token}`));
    return agents.get(token);
  };
  const atomTerm=token=>{
    token=String(token);
    if(!atoms.has(token))atoms.set(token,V(`${ns}atom:${token}`));
    return atoms.get(token);
  };

  function build(id){
    id=String(id);
    if(cache.has(id))return cache.get(id);
    if(visiting.has(id))throw new Error(`recursive intent cycle at ${id}`);
    const node=S.nodes[id];if(!node)throw new Error(`unknown recursive node ${id}`);
    visiting.add(id);
    let out;
    if(node.type===0){
      out={id,type:0,proposition:atomTerm(node.token),formula:null,depth:0};
    }else if(node.type===1){
      const h=currentMathHypothesis(L,node.hypothesis,{usable:true,expressions:true,composition:true});
      usedHypotheses.set(h.id,h.revision);
      const child=build(node.content);
      const prefix=`${ns}node:${id}:`;

      // Keep the recursively embedded child formula single-copy. The local
      // content proposition is bound once to the extension of the quoted child,
      // then the current live candidate anatomy reuses that proposition term.
      let content=child.proposition;
      const bridge=[];
      if(child.formula){
        content=V(`${prefix}content`);
        bridge.push(eq(content,extension(quote(child.formula),U)));
      }

      const constraints=bridge.concat(instantiateHypothesis(h,{
        content,universe:U,subject:subjectTerm(node.subject),prefix
      }));
      const formula=and(...constraints);
      out={
        id,type:1,hypothesis:h.id,hypothesis_revision:h.revision,
        content:child,formula,proposition:extension(quote(formula),U),depth:child.depth+1
      };
      nodeFormulas[id]=formula;
    }else throw new Error(`unknown recursive node type ${String(node.type)}`);
    visiting.delete(id);cache.set(id,out);return out;
  }

  const root=build(rootId);
  const identity=[];
  const as=[...agents.values()];
  for(let i=0;i<as.length;i++)for(let j=i+1;j<as.length;j++)identity.push(neq(as[i],as[j]));

  // The complete asserted formula contains the recursively embedded root plus
  // declared identity distinctions. For an atomic root, only propositionhood is
  // asserted.
  const base=root.formula||subset(root.proposition,U);
  const rootFormula=identity.length?and(base,...identity):base;
  const expressions=[rootFormula];
  return {
    whole:1,
    root_id:rootId,
    root,
    expressions,
    root_formula:rootFormula,
    node_formulas:nodeFormulas,
    subject_count:agents.size,
    atom_count:atoms.size,
    depth:root.depth,
    hypothesis_revisions:Object.fromEntries(usedHypotheses)
  };
}

function compileRecursiveIntent(S,L,rootId,options={}){
  const source=buildRecursiveSource(S,L,rootId,options);
  const graph=compileMathGraph(source.expressions,options);
  return {whole:1,version:3,graph,source};
}

function anonymousRecursiveIntent(S,L,rootId,options={}){
  const x=compileRecursiveIntent(S,L,rootId,options);
  return {whole:1,version:3,graph:x.graph};
}

module.exports={
  oneRecursiveIntentState,addAtom,addClause,buildRecursiveSource,
  compileRecursiveIntent,anonymousRecursiveIntent,
  helpers:{eq,neq,neg,and,inSet,subset,card,lt,tuple,intersect,complement,quote,extension,nonempty,V,C,A}
};
