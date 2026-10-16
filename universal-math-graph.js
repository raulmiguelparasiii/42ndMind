'use strict';

// Generic mathematical-expression -> anonymous relational-graph compiler for
// the Universal Language Track.
//
// Surface variable names are scaffolding only. The compiled object is a finite
// directed labelled graph in which mathematical operators/argument positions
// are relation labels and all expression nodes are anonymous. Canonical graph
// labelling therefore removes variable names, construction order, and node
// identities. This is a serialization substrate, not a claim that the current
// math operator vocabulary is metaphysically final.

const { canonicalGraph, stable } = require('./relational-normal-form');

const MOP = Object.freeze({
  APPLY:0,
  TUPLE:1,
  ABS:2,
  ADD:3,
  SQUARE:4,
  SQRT:5,
  EQ:6,
  LT:7,
  LE:8,
  AND:9,
  IFF:10,
  NEG:11,
  TRANSITION:12,
  IN:13,
  SUBSET:14,
  CARD:15,
  MAX:16,
  DIV:17,
  IMPLIES:18,
  DELTA:19
});

const COMMUTATIVE = new Set([MOP.ADD,MOP.EQ,MOP.AND]);

const variable = name => Object.freeze({kind:'var',name:String(name)});
const constant = value => Object.freeze({kind:'const',value});
const app = (op,...args) => Object.freeze({kind:'app',op:Number(op),args:Object.freeze(args.slice())});

function validateExpr(expr){
  if(!expr || typeof expr!=='object') throw new Error('math expression must be an object');
  if(expr.kind==='var') return true;
  if(expr.kind==='const') return true;
  if(expr.kind==='app'){
    if(!Number.isInteger(expr.op) || expr.op<0) throw new Error('application requires nonnegative integer op');
    if(!Array.isArray(expr.args)) throw new Error('application args must be an array');
    expr.args.forEach(validateExpr);
    return true;
  }
  throw new Error(`unknown math expression kind ${String(expr.kind)}`);
}

function canonicalSourceExpr(expr){
  validateExpr(expr);
  if(expr.kind!=='app') return expr;
  let args=expr.args.map(canonicalSourceExpr);
  if(COMMUTATIVE.has(expr.op)) args=args.slice().sort((a,b)=>stable(a).localeCompare(stable(b)));
  return {kind:'app',op:expr.op,args};
}

function compileMathGraph(expressions,options={}){
  if(!Array.isArray(expressions)) throw new Error('expressions must be an array');
  const exprs=expressions.map(canonicalSourceExpr);
  const graph={edges:[]};
  const variableNodes=new Map();
  const constantNodes=new Map();
  let next=0;
  const node=()=>`n${next++}`;
  const self=(label,n)=>graph.edges.push([label,n,n]);

  function walk(expr){
    validateExpr(expr);
    if(expr.kind==='var'){
      // Identity is shared within one source system, but the name itself never
      // enters the graph. Canonical labelling later removes this temporary id.
      if(!variableNodes.has(expr.name)){
        const n=node(); variableNodes.set(expr.name,n); self(['k',0],n);
      }
      return variableNodes.get(expr.name);
    }
    if(expr.kind==='const'){
      const k=stable(expr.value);
      if(!constantNodes.has(k)){
        const n=node(); constantNodes.set(k,n); self(['c',expr.value],n);
      }
      return constantNodes.get(k);
    }
    const n=node();
    self(['o',expr.op],n);
    expr.args.forEach((arg,i)=>graph.edges.push([['a',i],n,walk(arg)]));
    return n;
  }

  // Root markers preserve the fact that these are asserted constraints while
  // still allowing the constraint order itself to disappear.
  for(const expr of exprs){
    const root=walk(expr);
    self(['r',1],root);
  }

  const canonical=canonicalGraph(graph,{maxStates:options.maxStates ?? 250000});
  return {
    version:1,
    vertex_count:canonical.vertex_count,
    edges:canonical.edges,
    signature:canonical.signature,
    canonicalization_states:canonical.states
  };
}

function equivalentMathSystems(a,b,options={}){
  const A=compileMathGraph(a,options), B=compileMathGraph(b,options);
  return {equivalent:A.signature===B.signature,A,B};
}

module.exports={MOP,variable,constant,app,validateExpr,canonicalSourceExpr,compileMathGraph,equivalentMathSystems};
