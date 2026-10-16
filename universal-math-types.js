'use strict';

// Generic sort/type inference for Universal-Language mathematical expressions.
//
// This is ordinary mathematical scaffolding, not semantic authority. It knows
// only the generic operator contracts used by universal-math-graph.js. It can
// therefore reject internally ill-typed candidate anatomy without knowing that
// a graph is about belief, empathy, a command, or anything else.

const {MOP,validateExpr,stable}=require('./universal-math-graph');

const NUM=Object.freeze({kind:'num'});
const BOOL=Object.freeze({kind:'bool'});
const FORMULA=Object.freeze({kind:'formula'});

function setOf(of){return{kind:'set',of};}
function tupleOf(items){return{kind:'tuple',items};}
function funcOf(args,ret){return{kind:'func',args,ret};}

class TypeEnv{
  constructor(){this.next=0;this.bindings=new Map();this.variables=new Map();this.deferred=[];this.trace=[];}
  fresh(label=null){const t={kind:'var',id:this.next++,label};return t;}
  variable(name){const k=String(name);if(!this.variables.has(k))this.variables.set(k,this.fresh(k));return this.variables.get(k);}
  resolve(t){
    if(!t||t.kind!=='var')return t;
    const b=this.bindings.get(t.id);if(!b)return t;
    const r=this.resolve(b);this.bindings.set(t.id,r);return r;
  }
  occurs(id,t){
    t=this.resolve(t);if(t.kind==='var')return t.id===id;
    if(t.kind==='set')return this.occurs(id,t.of);
    if(t.kind==='tuple')return t.items.some(x=>this.occurs(id,x));
    if(t.kind==='func')return t.args.some(x=>this.occurs(id,x))||this.occurs(id,t.ret);
    return false;
  }
  bind(v,t,why){
    t=this.resolve(t);if(t.kind==='var'&&t.id===v.id)return;
    if(this.occurs(v.id,t))throw new TypeError(`recursive/infinite type at ${why||'unification'}`);
    this.bindings.set(v.id,t);
  }
  unify(a,b,why='unification'){
    a=this.resolve(a);b=this.resolve(b);
    if(a.kind==='var')return this.bind(a,b,why);
    if(b.kind==='var')return this.bind(b,a,why);
    if(a.kind!==b.kind)throw new TypeError(`type mismatch ${showType(a)} vs ${showType(b)} at ${why}`);
    if(a.kind==='num'||a.kind==='bool'||a.kind==='formula')return;
    if(a.kind==='set')return this.unify(a.of,b.of,why);
    if(a.kind==='tuple'){
      if(a.items.length!==b.items.length)throw new TypeError(`tuple arity mismatch at ${why}`);
      a.items.forEach((x,i)=>this.unify(x,b.items[i],why));return;
    }
    if(a.kind==='func'){
      if(a.args.length!==b.args.length)throw new TypeError(`function arity mismatch at ${why}`);
      a.args.forEach((x,i)=>this.unify(x,b.args[i],why));this.unify(a.ret,b.ret,why);return;
    }
    throw new TypeError(`unknown type constructor ${String(a.kind)}`);
  }
}

function showType(t,env=null,names=null){
  if(env)t=env.resolve(t);
  names=names||new Map();
  if(t.kind==='var'){
    if(!names.has(t.id))names.set(t.id,`τ${names.size}`);
    return names.get(t.id);
  }
  if(t.kind==='num')return'Num';
  if(t.kind==='bool')return'Bool';
  if(t.kind==='formula')return'Formula';
  if(t.kind==='set')return`Set<${showType(t.of,env,names)}>`;
  if(t.kind==='tuple')return`Tuple<${t.items.map(x=>showType(x,env,names)).join(',')}>`;
  if(t.kind==='func')return`(${t.args.map(x=>showType(x,env,names)).join(',')})->${showType(t.ret,env,names)}`;
  return String(t.kind);
}

function requireArity(expr,min,max=min){
  const n=expr.args.length;if(n<min||(max!==Infinity&&n>max))throw new TypeError(`operator ${expr.op} arity ${n}; expected ${min}${max===min?'':`..${max}`}`);
}

function inferExpr(expr,env,path='root'){
  validateExpr(expr);
  if(expr.kind==='var')return env.variable(expr.name);
  if(expr.kind==='const'){
    if(typeof expr.value==='number')return NUM;
    if(typeof expr.value==='boolean')return BOOL;
    return env.fresh(`const:${stable(expr.value)}`);
  }
  const op=expr.op,args=expr.args;
  const ts=args.map((x,i)=>inferExpr(x,env,`${path}.${i}`));
  const fresh=label=>env.fresh(`${path}:${label}`);
  const allNum=why=>ts.forEach(t=>env.unify(t,NUM,why));
  const allBool=why=>ts.forEach(t=>env.unify(t,BOOL,why));

  switch(op){
    case MOP.APPLY:{
      requireArity(expr,2,Infinity);const ret=fresh('ret');env.unify(ts[0],funcOf(ts.slice(1),ret),`${path}:apply`);return ret;
    }
    case MOP.TUPLE: return tupleOf(ts);
    case MOP.ABS: requireArity(expr,1);env.unify(ts[0],NUM,`${path}:abs`);return NUM;
    case MOP.ADD: requireArity(expr,2,Infinity);allNum(`${path}:add`);return NUM;
    case MOP.SQUARE: requireArity(expr,1);env.unify(ts[0],NUM,`${path}:square`);return NUM;
    case MOP.SQRT: requireArity(expr,1);env.unify(ts[0],NUM,`${path}:sqrt`);return NUM;
    case MOP.EQ:
    case MOP.NEQ: requireArity(expr,2);env.unify(ts[0],ts[1],`${path}:equality`);return BOOL;
    case MOP.LT:
    case MOP.LE: requireArity(expr,2);allNum(`${path}:order`);return BOOL;
    case MOP.AND: requireArity(expr,1,Infinity);allBool(`${path}:and`);return BOOL;
    case MOP.IFF: requireArity(expr,2);allBool(`${path}:iff`);return BOOL;
    case MOP.IMPLIES: requireArity(expr,2);allBool(`${path}:implies`);return BOOL;
    case MOP.NEG:
      requireArity(expr,1);
      // NEG is deliberately overloaded in the existing math surface for Boolean
      // negation and numeric additive inverse. Defer the admissibility check
      // until all surrounding constraints have had a chance to infer the sort.
      env.deferred.push({kind:'negatable',type:ts[0],path});return ts[0];
    case MOP.TRANSITION:
      requireArity(expr,2,3);
      env.unify(ts[0],ts[ts.length-1],`${path}:transition endpoints`);return BOOL;
    case MOP.IN:{
      requireArity(expr,2);const item=fresh('member');env.unify(ts[0],item,`${path}:membership item`);env.unify(ts[1],setOf(item),`${path}:membership set`);return BOOL;
    }
    case MOP.SUBSET:{
      requireArity(expr,2);const item=fresh('subset-item');env.unify(ts[0],setOf(item),`${path}:subset left`);env.unify(ts[1],setOf(item),`${path}:subset right`);return BOOL;
    }
    case MOP.CARD:{
      requireArity(expr,1);const item=fresh('card-item');env.unify(ts[0],setOf(item),`${path}:cardinality`);return NUM;
    }
    case MOP.MAX: requireArity(expr,2,Infinity);allNum(`${path}:max`);return NUM;
    case MOP.DIV: requireArity(expr,2);allNum(`${path}:division`);return NUM;
    case MOP.DELTA:
      // The Stone Delta is a signed scalar relation whose arguments include
      // entity, referent, and anonymous endpoint structures. Its arguments are
      // intentionally not forced into one sort merely because its result is numeric.
      requireArity(expr,2,Infinity);return NUM;
    case MOP.INTERSECT:
    case MOP.UNION:
    case MOP.COMPLEMENT:{
      requireArity(expr,2);const item=fresh('set-item');env.unify(ts[0],setOf(item),`${path}:set left`);env.unify(ts[1],setOf(item),`${path}:set right`);return setOf(item);
    }
    case MOP.QUOTE:
      requireArity(expr,1);env.unify(ts[0],BOOL,`${path}:quote formula`);return FORMULA;
    case MOP.EXTENSION:{
      requireArity(expr,2);env.unify(ts[0],FORMULA,`${path}:extension formula`);
      const item=fresh('extension-item');env.unify(ts[1],setOf(item),`${path}:extension universe`);return setOf(item);
    }
    default: throw new TypeError(`no generic type contract for mathematical operator ${op} at ${path}`);
  }
}

function finalizeDeferred(env){
  for(const d of env.deferred){
    const t=env.resolve(d.type);
    if(t.kind==='var')continue; // still underdetermined is not a type error
    if(t.kind!=='num'&&t.kind!=='bool')throw new TypeError(`NEG requires Num or Bool, got ${showType(t,env)} at ${d.path}`);
  }
}

function canonicalTypeSummary(env,roots){
  // Do not expose source variable names as type identity. Variable names are
  // returned only in the optional audit view below.
  const names=new Map();
  const rootTypes=roots.map(t=>showType(t,env,names)).sort();
  const variableTypes=[...env.variables.values()].map(t=>showType(t,env,names)).sort();
  return {root_types:rootTypes,variable_type_multiset:variableTypes};
}

function inferMathTypes(expressions){
  if(!Array.isArray(expressions))throw new TypeError('expressions must be an array');
  const env=new TypeEnv();
  const roots=expressions.map((e,i)=>inferExpr(e,env,`e${i}`));
  roots.forEach((t,i)=>env.unify(t,BOOL,`top-level constraint e${i}`));
  finalizeDeferred(env);
  const pure=canonicalTypeSummary(env,roots);
  const audit={variables:Object.fromEntries([...env.variables.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([name,t])=>[name,showType(t,env)]))};
  return {well_typed:true,pure,audit};
}

function checkMathTypes(expressions){
  try{return inferMathTypes(expressions);}catch(error){return{well_typed:false,error:String(error.message||error)};}
}

module.exports={NUM,BOOL,FORMULA,setOf,tupleOf,funcOf,TypeEnv,showType,inferExpr,inferMathTypes,checkMathTypes};
