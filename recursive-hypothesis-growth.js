'use strict';

// Stateless connection from recursive-recompression's learned descriptions to
// the existing Universal-Language hypothesis/corrigibility field.
//
// This file owns no truth, support, defeat, status, memory, candidate registry,
// or semantic/operator vocabulary. Discovery remains in recursive-recompression;
// evidence/status remains solely in math-hypotheses.js; live reuse remains in
// universal-relation-reuse.js. This connection only reifies an already-learned
// definition as generic anonymous mathematics and routes it through those live
// authorities.

const {MOP,variable,constant,app,compileMathGraph}=require('./universal-math-graph');
const {factorIntentExpressions,inspectFactoredIntent}=require('./universal-relation-reuse');
const {proposeRelationGuidedAlternative}=require('./universal-relational-completion');

const V=variable,C=constant,A=app;

function symbolMap(state){
  if(!state||state.whole!==1||!Array.isArray(state.symbols))throw new Error('recursive state with symbols required');
  return new Map(state.symbols.map(s=>[String(s.feature),s]));
}

function learnedSymbol(state,feature){
  const s=symbolMap(state).get(String(feature));
  if(!s)throw new Error(`unknown learned symbol ${String(feature)}`);
  if(!Array.isArray(s.definition)||!s.definition.length)throw new Error('learned symbol has no definition');
  return s;
}

function equality(feature,value){
  return A(MOP.EQ,V(String(feature)),C(value));
}

function conjunction(expressions){
  if(!expressions.length)throw new Error('empty learned definition');
  if(expressions.length===1)return expressions[0];
  return A(MOP.AND,...expressions);
}

// Reify exactly the relation the recompressor learned:
//
//   learned_handle == true  <->  conjunction(defining atoms)
//
// Feature/handle names are source scaffolding only. universal-math-graph removes
// variable names during canonicalization, so arbitrary renaming does not define
// relational identity.
function learnedDefinitionExpression(state,feature){
  const s=learnedSymbol(state,feature);
  const lhs=equality(s.feature,true);
  const rhs=conjunction(s.definition.map(atom=>equality(atom.feature,atom.value)));
  return A(MOP.IFF,lhs,rhs);
}

function learnedDefinitionSignature(state,feature,options={}){
  return compileMathGraph([learnedDefinitionExpression(state,feature)],options).signature;
}

function directLearnedDependencies(state,feature){
  const by=symbolMap(state),s=learnedSymbol(state,feature);
  return [...new Set(s.definition.map(a=>String(a.feature)).filter(f=>by.has(f)))].sort();
}

// Build the current higher-definition proposal through any already-stabilized
// learned definitions it directly references. A dependency that is not currently
// warranted stays raw; no local status is stored here.
function factorLearnedDefinition(L,state,feature,options={}){
  const deps=directLearnedDependencies(state,feature);
  const expressions=[
    ...deps.map(f=>learnedDefinitionExpression(state,f)),
    learnedDefinitionExpression(state,feature)
  ];
  return factorIntentExpressions(L,expressions,options);
}

function inspectLearnedFactorization(L,factored,options={}){
  return inspectFactoredIntent(L,factored,options);
}

// Proposal only. This function deliberately supplies no evidence. The returned
// hypothesis must remain open until independent contact reaches the existing
// math-hypotheses authority.
function proposeLearnedDefinition(L,state,feature,spaceId,proposal={},options={}){
  const factored=factorLearnedDefinition(L,state,feature,options);
  const routed=proposeRelationGuidedAlternative(L,String(spaceId),{
    id:proposal.id,
    factored,
    source:proposal.source||'recursive-recompression-connection',
    confidence:proposal.confidence??null,
    note:proposal.note??null
  },options);
  return{
    whole:1,
    feature:String(feature),
    definition_signature:learnedDefinitionSignature(state,feature,options),
    dependencies:directLearnedDependencies(state,feature),
    factored,
    routed
  };
}

module.exports={
  learnedDefinitionExpression,learnedDefinitionSignature,directLearnedDependencies,
  factorLearnedDefinition,inspectLearnedFactorization,proposeLearnedDefinition
};
