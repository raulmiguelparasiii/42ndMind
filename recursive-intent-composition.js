'use strict';

// Recursive mathematical composition for the Universal Language Track.
//
// This file does not parse English and does not assign semantic truth. It gives
// already-proposed intent anatomies a recursively compositional mathematical
// surface: a clause may take the full quoted mathematical formula of another
// clause as its content. The nested formula is embedded structurally, not by a
// string, family label, hash, or frozen signature.
//
// Definitions are live and corrigible. A node stores only which anonymous
// definition it instantiates plus references to its subject/content. Recompiling
// a root always follows the current definition graph, so revising an inner
// definition automatically changes every outer mathematical object that embeds
// it without editing those outer nodes.

const {
  MOP, variable, constant, app, validateExpr, compileMathGraph
}=require('./universal-math-graph');

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

const SLOT=Object.freeze({CONTENT:'@content',UNIVERSE:'@universe',SUBJECT:'@subject'});
const DEF=Object.freeze({BELIEF:0,DOUBT:1});

function beliefTemplate(){
  const P=V(SLOT.CONTENT), U=V(SLOT.UNIVERSE), subject=V(SLOT.SUBJECT);
  const NP=V('NP'), K=V('K'), H=V('H'), frame=V('frame');
  return [
    subset(P,U),
    eq(NP,complement(P,U)),
    subset(K,U), nonempty(K),
    subset(K,P),
    inSet(P,H),
    eq(frame,tuple(subject,K,H,P))
  ];
}

function doubtTemplate(){
  const P=V(SLOT.CONTENT), U=V(SLOT.UNIVERSE), subject=V(SLOT.SUBJECT);
  const NP=V('NP'), K=V('K'), H=V('H'), KP=V('KP'), KN=V('KN'), frame=V('frame');
  return [
    subset(P,U),
    eq(NP,complement(P,U)),
    subset(K,U), nonempty(K),
    eq(KP,intersect(K,P)),
    eq(KN,intersect(K,NP)),
    nonempty(KP), nonempty(KN),
    neg(inSet(P,H)), neg(inSet(NP,H)),
    eq(frame,tuple(subject,K,H,P))
  ];
}

function defaultDefinitionTemplate(id){
  id=Number(id);
  if(id===DEF.BELIEF)return beliefTemplate();
  if(id===DEF.DOUBT)return doubtTemplate();
  throw new Error(`unknown recursive definition ${String(id)}`);
}

function recursiveIntentLegend(){
  return Object.freeze({[DEF.BELIEF]:'belief',[DEF.DOUBT]:'doubt'});
}

function oneRecursiveIntentState(){
  return {
    whole:1,
    version:1,
    step:0,
    definitions:{
      [DEF.BELIEF]:{id:DEF.BELIEF,revision:1,template:beliefTemplate()},
      [DEF.DOUBT]:{id:DEF.DOUBT,revision:1,template:doubtTemplate()}
    },
    nodes:{},
    audit:[]
  };
}

function assertState(S){
  if(!S||S.whole!==1||!S.definitions||!S.nodes)throw new Error('invalid recursive intent state');
}

function addAtom(S,id,token=id){
  assertState(S);id=String(id);
  if(S.nodes[id])throw new Error(`duplicate recursive node ${id}`);
  S.nodes[id]={id,type:0,token:String(token),revision:1};
  S.audit.push({step:++S.step,kind:'node-added',id,type:0});
  return S.nodes[id];
}

function addClause(S,id,{definition,subject,content}){
  assertState(S);id=String(id);definition=Number(definition);
  if(S.nodes[id])throw new Error(`duplicate recursive node ${id}`);
  if(!S.definitions[definition])throw new Error(`unknown recursive definition ${definition}`);
  if(content===undefined||content===null)throw new Error('recursive clause requires content node');
  S.nodes[id]={id,type:1,definition,subject:String(subject),content:String(content),revision:1};
  S.audit.push({step:++S.step,kind:'node-added',id,type:1,definition});
  return S.nodes[id];
}

function reviseDefinition(S,id,template,note=null){
  assertState(S);id=Number(id);
  const d=S.definitions[id];if(!d)throw new Error(`unknown recursive definition ${id}`);
  if(!Array.isArray(template)||!template.length)throw new Error('definition template must be a nonempty expression array');
  template.forEach(validateExpr);
  d.template=template.slice();d.revision++;
  S.audit.push({step:++S.step,kind:'definition-revised',id,revision:d.revision,note});
  return d;
}

function instantiate(expr,bindings,prefix){
  validateExpr(expr);
  if(expr.kind==='const')return expr;
  if(expr.kind==='var'){
    if(Object.prototype.hasOwnProperty.call(bindings,expr.name))return bindings[expr.name];
    if(expr.name.startsWith('@'))throw new Error(`unbound recursive template slot ${expr.name}`);
    return V(`${prefix}${expr.name}`);
  }
  return A(expr.op,...expr.args.map(x=>instantiate(x,bindings,prefix)));
}

function buildRecursiveSource(S,rootId,options={}){
  assertState(S);rootId=String(rootId);
  if(!S.nodes[rootId])throw new Error(`unknown recursive root ${rootId}`);
  const ns=String(options.namespace??'');
  const U=V(`${ns}universe`);
  const agents=new Map(), atoms=new Map(), cache=new Map(), visiting=new Set();
  const nodeFormulas={};

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
      const d=S.definitions[node.definition];
      if(!d)throw new Error(`missing recursive definition ${node.definition}`);
      const child=build(node.content);
      // Atomic content is already a proposition-set. Clause content is the
      // extension, in the shared universe, of the child's quoted full formula.
      // QUOTE preserves the actual child anatomy as a subexpression.
      const content=child.formula?extension(quote(child.formula),U):child.proposition;
      const bindings={
        [SLOT.CONTENT]:content,
        [SLOT.UNIVERSE]:U,
        [SLOT.SUBJECT]:subjectTerm(node.subject)
      };
      const prefix=`${ns}node:${id}:`;
      const constraints=d.template.map(e=>instantiate(e,bindings,prefix));
      const formula=and(...constraints);
      out={
        id,type:1,definition:node.definition,definition_revision:d.revision,
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
    definition_revisions:Object.fromEntries(Object.entries(S.definitions).map(([k,d])=>[k,d.revision]))
  };
}

function compileRecursiveIntent(S,rootId,options={}){
  const source=buildRecursiveSource(S,rootId,options);
  const graph=compileMathGraph(source.expressions,options);
  return {whole:1,version:1,graph,source};
}

function anonymousRecursiveIntent(S,rootId,options={}){
  const x=compileRecursiveIntent(S,rootId,options);
  return {whole:1,version:1,graph:x.graph};
}

module.exports={
  DEF,SLOT,oneRecursiveIntentState,addAtom,addClause,reviseDefinition,
  defaultDefinitionTemplate,recursiveIntentLegend,buildRecursiveSource,
  compileRecursiveIntent,anonymousRecursiveIntent,
  helpers:{eq,neq,neg,and,inSet,subset,card,lt,tuple,intersect,complement,quote,extension,nonempty,V,C,A}
};
