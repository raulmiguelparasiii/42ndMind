'use strict';

// Generic support-route representation inside canonical M.
//
// This module owns no truth/status store. It only writes ordinary relational
// content and ordinary canonical rules into M:
//
//   support route premises -> target has_support
//   target has_support      -> target warranted
//
// A direct counterexample to the target is propagated, by a generic schema that
// itself lives in M, to the target's warrant rule. The already-seeded corrigible
// T10 relation then controls that categorical rule. C does not know the words
// warrant/support/counterexample as privileged source-code branches.
//
// Multiple support routes therefore behave as independent derivations. Losing
// one route removes only that route's contribution. Another live route can keep
// the target warranted. Reverse indexes/queues may later accelerate this same
// semantics without owning it.

const Mind=require('./one-mind.js');

const ACTIVE={structural:'active'};
const REL=Object.freeze({
  warrants:'support-route:warrants',
  hasSupport:'support-route:has_support',
  warranted:'support-route:warranted',
  routeFor:'support-route:for',
  routeProvenance:'support-route:provenance'
});

function ref(id){return{ref:String(id)};}
function varTerm(name){return{var:String(name)};}
function stable(value){
  if(Array.isArray(value))return'['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object')return'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
function same(a,b){return stable(a)===stable(b);}
function assertMind(M){
  if(!M||M.whole!==1||!M.knowledge||!Array.isArray(M.knowledge.rules))throw new Error('canonical M required');
}
function hasBaseFact(M,subject,relation,object){
  return M.knowledge.facts.some(f=>same(f.subject,subject)&&same(f.relation,relation)&&same(f.object,object));
}
function hasCurrentFact(M,subject,relation,object){
  return M.knowledge.current?.facts?.some(f=>same(f.subject,subject)&&same(f.relation,relation)&&same(f.object,object))||false;
}
function ruleById(M,id){return M.knowledge.rules.find(r=>r.id===String(id));}
function ingest(M,{facts=[],rules=[]}){
  if(facts.length||rules.length)Mind.C(M,{relations:{facts,rules}});
  return M;
}

const GENERIC_COUNTEREXAMPLE_ROUTE='support-route:counterexample-controls-warrant';

function ensureGenericSupportSchemas(M){
  assertMind(M);
  if(ruleById(M,GENERIC_COUNTEREXAMPLE_ROUTE))return M;
  const W=varTerm('warrant_rule'),T=varTerm('target'),E=varTerm('counterevidence');
  ingest(M,{rules:[{
    id:GENERIC_COUNTEREXAMPLE_ROUTE,
    premises:[
      [W,REL.warrants,T],
      [T,'counterexample',E]
    ],
    conclusion:[W,'counterexample',E],
    categorical:true,
    provenance:{kind:'generic-support-route-schema'}
  }]});
  return M;
}

function warrantRuleId(targetId){return`support-route:warrant:${String(targetId)}`;}

function ensureWarrantTarget(M,targetId,targetTerm=ref(targetId),provenance={kind:'warrant-target'}){
  assertMind(M);ensureGenericSupportSchemas(M);
  const id=warrantRuleId(targetId),ruleRef=ref(id);
  if(!ruleById(M,id)){
    ingest(M,{
      facts:[
        [ruleRef,REL.warrants,targetTerm],
        [targetTerm,'kind','warrant-target']
      ],
      rules:[{
        id,
        premises:[[targetTerm,REL.hasSupport,true]],
        conclusion:[targetTerm,REL.warranted,true],
        categorical:true,
        provenance
      }]
    });
  }
  return{id,target:targetTerm};
}

function normalizePremise(p){
  if(!Array.isArray(p)||p.length!==3)throw new Error('support-route premise requires [subject,relation,object]');
  return p.map(x=>JSON.parse(JSON.stringify(x)));
}

function addSupportRoute(M,targetId,routeId,premises,{targetTerm=ref(targetId),provenance={kind:'support-route'}}={}){
  assertMind(M);
  ensureWarrantTarget(M,targetId,targetTerm,provenance);
  routeId=String(routeId);
  if(ruleById(M,routeId))return ruleById(M,routeId);
  if(!Array.isArray(premises)||!premises.length)throw new Error('support route requires at least one premise');
  const normalized=premises.map(normalizePremise);
  ingest(M,{
    facts:[
      [ref(routeId),REL.routeFor,targetTerm],
      [ref(routeId),REL.routeProvenance,provenance]
    ],
    rules:[{
      id:routeId,
      premises:normalized,
      conclusion:[targetTerm,REL.hasSupport,true],
      categorical:true,
      provenance
    }]
  });
  return ruleById(M,routeId);
}

function addCounterexample(M,targetId,evidenceTerm,{targetTerm=ref(targetId)}={}){
  assertMind(M);ensureWarrantTarget(M,targetId,targetTerm);
  if(!hasBaseFact(M,targetTerm,'counterexample',evidenceTerm)){
    ingest(M,{facts:[[targetTerm,'counterexample',evidenceTerm]]});
  }
  return currentWarrant(M,targetId,targetTerm);
}

function currentWarrant(M,targetId,targetTerm=ref(targetId)){
  assertMind(M);
  const id=warrantRuleId(targetId),r=ruleById(M,id);
  return{
    whole:1,
    target:targetTerm,
    warrant_rule:id,
    warrant_rule_active:r?r.active!==false:false,
    has_support:hasCurrentFact(M,targetTerm,REL.hasSupport,true),
    warranted:hasCurrentFact(M,targetTerm,REL.warranted,true),
    counterexamples:M.knowledge.facts.filter(f=>same(f.subject,targetTerm)&&same(f.relation,'counterexample')).map(f=>f.object),
    whole_mind:M.whole
  };
}

module.exports={
  REL,ACTIVE,ref,warrantRuleId,
  ensureGenericSupportSchemas,ensureWarrantTarget,
  addSupportRoute,addCounterexample,currentWarrant
};
