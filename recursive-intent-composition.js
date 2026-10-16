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
// a root always follows the current definition graph, so revising, suspending,
// or restoring an inner definition propagates to every outer mathematical
// object without editing those outer nodes.
//
// The thirteen default definitions below are copied from the current candidate
// anatomies in abstract-intent-kernel.js when a state is created. They remain
// proposals: every definition is mutable/suspendable inside the recursive state.

const {
  MOP, variable, constant, app, validateExpr, compileMathGraph
}=require('./universal-math-graph');
const {INTENT_ORDER,candidateExpressions}=require('./abstract-intent-kernel');

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
const DEF=Object.freeze(Object.fromEntries(INTENT_ORDER.map((name,i)=>[name.toUpperCase(),i])));

// This metadata is part of the proposer-side candidate anatomy, not generic
// recursive authority. It says which proposition variable is the clause content
// and, when the candidate already contains a participant role, which variable is
// the clause subject. Candidates without a participant role receive an explicit
// subject/frame tuple so subject identity remains mathematically represented.
const DEFINITION_META=Object.freeze({
  [DEF.BELIEF]:Object.freeze({name:'belief',content:'P',subject:null,frame:['K','H','P']}),
  [DEF.DOUBT]:Object.freeze({name:'doubt',content:'P',subject:null,frame:['K','H','P']}),
  [DEF.CONSIDER]:Object.freeze({name:'consider',content:'P',subject:null,frame:['K','branches','scratch','P']}),
  [DEF.IMAGINE]:Object.freeze({name:'imagine',content:'P',subject:null,frame:['K','HYP','scratch','P']}),
  [DEF.REMEMBER]:Object.freeze({name:'remember',content:'P',subject:null,frame:['history','held','P']}),
  [DEF.INFER]:Object.freeze({name:'infer',content:'conclusion',subject:null,frame:['premise','conclusion','H1']}),
  [DEF.DESIRE]:Object.freeze({name:'desire',content:'P',subject:'agent',frame:null}),
  [DEF.INTEND]:Object.freeze({name:'intend',content:'P',subject:'agent',frame:null}),
  [DEF.QUESTION]:Object.freeze({name:'question',content:'P',subject:'speaker',frame:null}),
  [DEF.ASSERTION]:Object.freeze({name:'assertion',content:'P',subject:'speaker',frame:null}),
  [DEF.COMMAND]:Object.freeze({name:'command',content:'P',subject:'speaker',frame:null}),
  [DEF.PROMISE]:Object.freeze({name:'promise',content:'P',subject:'speaker',frame:null}),
  [DEF.OBLIGATION]:Object.freeze({name:'obligation',content:'P',subject:'agent',frame:null})
});

function rewriteTemplateExpr(expr,mapping){
  validateExpr(expr);
  if(expr.kind==='const')return expr;
  if(expr.kind==='var')return V(Object.prototype.hasOwnProperty.call(mapping,expr.name)?mapping[expr.name]:expr.name);
  return A(expr.op,...expr.args.map(x=>rewriteTemplateExpr(x,mapping)));
}

function candidateTemplate(id){
  id=Number(id);
  const meta=DEFINITION_META[id];
  if(!meta)throw new Error(`unknown recursive definition ${String(id)}`);
  const mapping={U:SLOT.UNIVERSE,[meta.content]:SLOT.CONTENT};
  if(meta.subject)mapping[meta.subject]=SLOT.SUBJECT;
  const out=candidateExpressions(meta.name).map(e=>rewriteTemplateExpr(e,mapping));
  if(meta.frame){
    const terms=meta.frame.map(name=>V(Object.prototype.hasOwnProperty.call(mapping,name)?mapping[name]:name));
    out.push(eq(V('frame'),tuple(V(SLOT.SUBJECT),...terms)));
  }
  out.forEach(validateExpr);
  return out;
}

function defaultDefinitionTemplate(id){
  return candidateTemplate(id).slice();
}

function recursiveIntentLegend(){
  return Object.freeze(Object.fromEntries(INTENT_ORDER.map((name,i)=>[i,name])));
}

function oneRecursiveIntentState(){
  const definitions={};
  for(let i=0;i<INTENT_ORDER.length;i++){
    definitions[i]={id:i,revision:1,active:true,template:defaultDefinitionTemplate(i)};
  }
  return {
    whole:1,
    version:2,
    step:0,
    definitions,
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

function setDefinitionActive(S,id,active,note=null){
  assertState(S);id=Number(id);
  const d=S.definitions[id];if(!d)throw new Error(`unknown recursive definition ${id}`);
  active=Boolean(active);
  if(d.active===active)return d;
  d.active=active;d.revision++;
  S.audit.push({step:++S.step,kind:'definition-status',id,active,revision:d.revision,note});
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
      if(!d.active)throw new Error(`inactive recursive definition ${node.definition}`);
      const child=build(node.content);
      const prefix=`${ns}node:${id}:`;

      // Keep the recursively embedded child formula single-copy. The local
      // content proposition is bound once to the extension of the quoted child,
      // then the outer anatomy reuses that proposition variable. This preserves
      // the actual inner structure while avoiding exponential syntactic copying.
      let content=child.proposition;
      const bridge=[];
      if(child.formula){
        content=V(`${prefix}content`);
        bridge.push(eq(content,extension(quote(child.formula),U)));
      }

      const bindings={
        [SLOT.CONTENT]:content,
        [SLOT.UNIVERSE]:U,
        [SLOT.SUBJECT]:subjectTerm(node.subject)
      };
      const constraints=bridge.concat(d.template.map(e=>instantiate(e,bindings,prefix)));
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
    definition_revisions:Object.fromEntries(Object.entries(S.definitions).map(([k,d])=>[k,d.revision])),
    definition_active:Object.fromEntries(Object.entries(S.definitions).map(([k,d])=>[k,d.active]))
  };
}

function compileRecursiveIntent(S,rootId,options={}){
  const source=buildRecursiveSource(S,rootId,options);
  const graph=compileMathGraph(source.expressions,options);
  return {whole:1,version:2,graph,source};
}

function anonymousRecursiveIntent(S,rootId,options={}){
  const x=compileRecursiveIntent(S,rootId,options);
  return {whole:1,version:2,graph:x.graph};
}

module.exports={
  DEF,SLOT,DEFINITION_META,oneRecursiveIntentState,addAtom,addClause,reviseDefinition,setDefinitionActive,
  defaultDefinitionTemplate,recursiveIntentLegend,buildRecursiveSource,
  compileRecursiveIntent,anonymousRecursiveIntent,
  helpers:{eq,neq,neg,and,inSet,subset,card,lt,tuple,intersect,complement,quote,extension,nonempty,V,C,A}
};
