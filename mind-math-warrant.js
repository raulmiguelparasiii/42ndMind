'use strict';

// Compatibility connection from the bounded M-owned math hypothesis state to
// generic support routes already expressible by canonical M/C.
//
// Structural matching still reuses math-hypotheses.js as a disposable evaluator.
// Its verdict is not stored as a status flag. Instead each supporting evidence
// occurrence becomes an ordinary first-class support route in M, optionally
// dependent on other already-warranted relations. Complete assignment-level
// counterevidence becomes an ordinary counterexample relation on the assignment.
// Canonical relational closure then decides what remains warranted.

const {
  mathLedgerFromMind,proposeMathAlternativeInMind,contactMathSpaceInMind,
  currentMathSpaceInMind,REL:MHREL,KIND:MHKIND
}=require('./mind-math-hypotheses');
const {evaluateMathSpaceAlternative}=require('./math-hypotheses');
const {
  REL:SUPPORT_REL,ref,ensureWarrantTarget,addSupportRoute,addCounterexample,currentWarrant
}=require('./relational-support-routes');

function stable(value){
  if(Array.isArray(value))return'['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object')return'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
function same(a,b){return stable(a)===stable(b);}
function candidateRef(id){return ref(`math-candidate:${String(id)}`);}
function spaceRef(id){return ref(`math-space:${String(id)}`);}
function evidenceRef(id){return ref(`math-evidence:${String(id)}`);}
function assignmentId(spaceId,candidateId){return`math-assignment:${String(spaceId)}:${String(candidateId)}`;}
function assignmentRef(spaceId,candidateId){return ref(assignmentId(spaceId,candidateId));}
function routeId(spaceId,candidateId,evidenceId){return`math-support:${String(spaceId)}:${String(candidateId)}:${String(evidenceId)}`;}

function hasBaseFact(M,subject,relation,object){
  return M.knowledge.facts.some(f=>same(f.subject,subject)&&same(f.relation,relation)&&same(f.object,object));
}
function ingestFacts(M,facts){
  if(facts.length)require('./one-mind.js').C(M,{relations:{facts}});
}

function ensureAssignment(M,spaceId,candidateId){
  const a=assignmentRef(spaceId,candidateId),facts=[];
  if(!hasBaseFact(M,a,'kind','candidate-assignment'))facts.push([a,'kind','candidate-assignment']);
  if(!hasBaseFact(M,a,'assignment:candidate',candidateRef(candidateId)))facts.push([a,'assignment:candidate',candidateRef(candidateId)]);
  if(!hasBaseFact(M,a,'assignment:referent',spaceRef(spaceId)))facts.push([a,'assignment:referent',spaceRef(spaceId)]);
  ingestFacts(M,facts);
  ensureWarrantTarget(M,assignmentId(spaceId,candidateId),a,{kind:'candidate-assignment-warrant',space:String(spaceId),candidate:String(candidateId)});
  return a;
}

function proposeMathAlternativeWithWarrant(M,spaceId,proposal,options={}){
  const c=proposeMathAlternativeInMind(M,spaceId,proposal,options);
  ensureAssignment(M,spaceId,c.id);
  return c;
}

function normalizeSupportDependencies(raw){
  if(raw===undefined||raw===null)return[];
  if(!Array.isArray(raw))throw new Error('support_dependencies must be an array of relational premises');
  return raw.map(p=>{
    if(!Array.isArray(p)||p.length!==3)throw new Error('support dependency requires [subject,relation,object]');
    return JSON.parse(JSON.stringify(p));
  });
}

function candidateIdsForSpace(M,spaceId){
  const s=spaceRef(spaceId),ids=[];
  for(const f of M.knowledge.facts){
    if(!same(f.subject,s)||!same(f.relation,MHREL.alternative))continue;
    const x=f.object&&typeof f.object==='object'&&typeof f.object.ref==='string'?f.object.ref:null;
    if(x&&x.startsWith('math-candidate:'))ids.push(x.slice('math-candidate:'.length));
  }
  return [...new Set(ids)].sort();
}

function contactMathSpaceWithWarrant(M,spaceId,input,metadata={},options={}){
  const supportDependencies=normalizeSupportDependencies(metadata.support_dependencies);
  const cleanMetadata={...metadata};
  delete cleanMetadata.support_dependencies;

  // Existing bounded migration persists candidate/evidence/space content in M
  // and derives the current compatibility ledger from that state.
  const contact=contactMathSpaceInMind(M,spaceId,input,cleanMetadata,{...options,autoRefine:false});
  const L=mathLedgerFromMind(M,options);
  const e=evidenceRef(contact.evidence);

  // Evidence occurrence existence is itself first-class M content. Support-route
  // rules use it as an explicit premise so provenance remains inspectable.
  if(!hasBaseFact(M,e,'evidence:present',true))ingestFacts(M,[[e,'evidence:present',true]]);

  for(const cid of candidateIdsForSpace(M,spaceId)){
    const a=ensureAssignment(M,spaceId,cid);
    const verdict=evaluateMathSpaceAlternative(L,String(spaceId),String(cid),options);
    const supported=verdict.support.some(x=>String(x.evidence)===String(contact.evidence));
    const defeated=verdict.defeat.some(x=>String(x.evidence)===String(contact.evidence));

    if(supported){
      addSupportRoute(
        M,
        assignmentId(spaceId,cid),
        routeId(spaceId,cid,contact.evidence),
        [[e,'evidence:present',true],...supportDependencies],
        {targetTerm:a,provenance:{
          kind:'structural-evidence-support-route',
          space:String(spaceId),candidate:String(cid),evidence:String(contact.evidence)
        }}
      );
    }
    if(defeated){
      addCounterexample(M,assignmentId(spaceId,cid),e,{targetTerm:a});
    }
  }

  return{
    whole:1,
    space:String(spaceId),
    evidence:String(contact.evidence),
    current_math_space:currentMathSpaceInMind(M,spaceId,options),
    assignments:candidateIdsForSpace(M,spaceId).map(cid=>({
      candidate:cid,
      warrant:currentAssignmentWarrant(M,spaceId,cid)
    }))
  };
}

function currentAssignmentWarrant(M,spaceId,candidateId){
  return currentWarrant(M,assignmentId(spaceId,candidateId),assignmentRef(spaceId,candidateId));
}

module.exports={
  SUPPORT_REL,assignmentId,assignmentRef,
  ensureAssignment,proposeMathAlternativeWithWarrant,
  contactMathSpaceWithWarrant,currentAssignmentWarrant
};
