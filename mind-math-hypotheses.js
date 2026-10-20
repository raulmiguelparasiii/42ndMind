'use strict';

// Bounded state-authority migration for the one-live-M architecture.
//
// Fundamental candidate/evidence/alternative/proposal content is retained as
// ordinary first-class structured relations inside canonical M. The existing
// math-hypotheses.js machinery is reused only as a disposable derived evaluator
// over that M-owned content. No ledger object is stored on M and no support,
// defeat, status, or usable flag is persisted as independent truth.
//
// This is intentionally a narrow connection experiment. Candidate revision and
// automatic structural-ablation persistence are not migrated here yet; those
// require versioned relational definitions rather than silently copying the old
// mutable ledger model into M.

const Mind=require('./one-mind.js');
const {
  asCompiledMath,oneMathHypothesisLedger,proposeMath,addMathAlternative,
  contactMath,currentMathHypothesis,currentMathSpace
}=require('./math-hypotheses');

const REL=Object.freeze({
  kind:'mind:kind',
  definition:'mind:definition',
  sourceExpressions:'mind:source_expressions',
  composition:'mind:composition_interface',
  proposes:'mind:proposes',
  source:'mind:source',
  confidence:'mind:confidence',
  note:'mind:note',
  alternative:'mind:alternative',
  evidenceStructure:'mind:evidence_structure',
  metadata:'mind:metadata'
});

const KIND=Object.freeze({candidate:'math-candidate',proposal:'proposal',space:'alternative-space',evidence:'evidence-occurrence'});

function ref(id){return{ref:String(id)};}
function refName(x){return x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===1&&typeof x.ref==='string'?x.ref:null;}
function clone(x){return x===undefined?undefined:JSON.parse(JSON.stringify(x));}
function stable(x){
  if(Array.isArray(x))return'['+x.map(stable).join(',')+']';
  if(x&&typeof x==='object')return'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}';
  return JSON.stringify(x);
}
function same(a,b){return stable(a)===stable(b);}

const candidateRef=id=>ref(`math-candidate:${String(id)}`);
const spaceRef=id=>ref(`math-space:${String(id)}`);
const evidenceRef=id=>ref(`math-evidence:${String(id)}`);
const proposalRef=id=>ref(`math-proposal:${String(id)}`);
function strip(prefix,x){
  const s=refName(x);
  return s&&s.startsWith(prefix)?s.slice(prefix.length):null;
}

function assertMind(M){
  if(!M||M.whole!==1||!M.knowledge||!Array.isArray(M.knowledge.facts))throw new Error('canonical M with relational knowledge required');
}
function facts(M){assertMind(M);return M.knowledge.facts;}
function factsFor(M,subject,relation=null){
  return facts(M).filter(f=>same(f.subject,subject)&&(relation===null||same(f.relation,relation)));
}
function objects(M,subject,relation){return factsFor(M,subject,relation).map(f=>clone(f.object));}
function oneObject(M,subject,relation,{required=false}={}){
  const xs=objects(M,subject,relation);
  const unique=[];
  for(const x of xs)if(!unique.some(y=>same(x,y)))unique.push(x);
  if(unique.length>1)throw new Error(`multiple current values for ${String(relation)} on ${stable(subject)}; versioned migration required`);
  if(required&&unique.length!==1)throw new Error(`missing ${String(relation)} on ${stable(subject)}`);
  return unique[0];
}
function subjectsOfKind(M,kind){
  const out=[];
  for(const f of facts(M))if(same(f.relation,REL.kind)&&same(f.object,kind)&&refName(f.subject)&&!out.some(x=>same(x,f.subject)))out.push(clone(f.subject));
  return out;
}
function relationExists(M,subject,relation,object){return factsFor(M,subject,relation).some(f=>same(f.object,object));}
function ingest(M,rawFacts){
  if(!rawFacts.length)return M;
  Mind.C(M,{relations:{facts:rawFacts}});
  return M;
}

function proposalSequence(M){return subjectsOfKind(M,KIND.proposal);}
function nextProposalId(M){return `p${proposalSequence(M).length+1}`;}
function evidenceSequence(M){return subjectsOfKind(M,KIND.evidence);}
function nextEvidenceId(M){return `e${evidenceSequence(M).length+1}`;}

function candidateIds(M){return subjectsOfKind(M,KIND.candidate).map(x=>strip('math-candidate:',x)).filter(Boolean).sort();}
function spaceIds(M){return subjectsOfKind(M,KIND.space).map(x=>strip('math-space:',x)).filter(Boolean).sort();}

function proposalRecords(M,cid){
  const target=candidateRef(cid),out=[];
  for(const p of proposalSequence(M)){
    if(!relationExists(M,p,REL.proposes,target))continue;
    out.push({
      source:oneObject(M,p,REL.source)??'unknown',
      confidence:oneObject(M,p,REL.confidence)??null,
      note:oneObject(M,p,REL.note)??null
    });
  }
  return out;
}

function mathLedgerFromMind(M,options={}){
  assertMind(M);
  const L=oneMathHypothesisLedger();

  // Definitions and proposal provenance are fundamental M content. Rebuild the
  // derived candidate registry/signature index from them rather than storing a
  // second live registry on the individual.
  for(const id of candidateIds(M)){
    const s=candidateRef(id);
    const graph=oneObject(M,s,REL.definition,{required:true});
    const expressions=oneObject(M,s,REL.sourceExpressions)??null;
    const composition=oneObject(M,s,REL.composition)??null;
    const ps=proposalRecords(M,id);
    const first=ps[0]||{source:'M',confidence:null,note:null};
    const input={id,graph:clone(graph),source:first.source,confidence:first.confidence,note:first.note};
    if(expressions)input.expressions=clone(expressions);
    if(composition)input.composition=clone(composition);
    const c=proposeMath(L,input,options);
    if(c.id!==id)throw new Error(`M contains duplicate candidate identity for ${id}; explicit relational merge required`);
    for(const p of ps.slice(1))proposeMath(L,{graph:clone(graph),source:p.source,confidence:p.confidence,note:p.note},options);
  }

  for(const sid of spaceIds(M)){
    const s=spaceRef(sid);
    for(const f of factsFor(M,s,REL.alternative)){
      const cid=strip('math-candidate:',f.object);
      if(!cid)throw new Error(`invalid candidate reference in space ${sid}`);
      addMathAlternative(L,sid,cid,options);
    }
  }

  // Evidence occurrences are replayed from M after candidate/space structure is
  // present. Candidate status/support/defeat is therefore freshly derived every
  // time this view is built.
  for(const e of evidenceSequence(M)){
    const id=strip('math-evidence:',e);
    if(!id)continue;
    const graph=oneObject(M,e,REL.evidenceStructure,{required:true});
    const metadata=oneObject(M,e,REL.metadata)??{};
    contactMath(L,clone(graph),{...clone(metadata),id},options);
  }
  return L;
}

function persistCandidateAndProposal(M,L,c,proposal){
  const s=candidateRef(c.id),out=[];
  if(!relationExists(M,s,REL.kind,KIND.candidate)){
    out.push([s,REL.kind,KIND.candidate]);
    out.push([s,REL.definition,clone(c.graph)]);
    if(c.expressions)out.push([s,REL.sourceExpressions,clone(c.expressions)]);
    if(c.composition)out.push([s,REL.composition,clone(c.composition)]);
  }else{
    const existing=oneObject(M,s,REL.definition,{required:true});
    if(!same(existing,c.graph))throw new Error('candidate revision requires versioned relational definition migration');
    if(c.expressions&&!objects(M,s,REL.sourceExpressions).length)out.push([s,REL.sourceExpressions,clone(c.expressions)]);
    if(c.composition&&!objects(M,s,REL.composition).length)out.push([s,REL.composition,clone(c.composition)]);
  }
  const p=proposalRef(nextProposalId(M));
  out.push([p,REL.kind,KIND.proposal]);
  out.push([p,REL.proposes,s]);
  out.push([p,REL.source,proposal?.source??'unknown']);
  out.push([p,REL.confidence,proposal?.confidence??null]);
  out.push([p,REL.note,proposal?.note??null]);
  ingest(M,out);
  return currentMathHypothesis(mathLedgerFromMind(M),c.id);
}

function proposeMathInMind(M,proposal,options={}){
  assertMind(M);
  const L=mathLedgerFromMind(M,options);
  const c=proposeMath(L,proposal,options);
  return persistCandidateAndProposal(M,L,c,proposal);
}

function ensureSpaceInMind(M,spaceId){
  const s=spaceRef(spaceId);
  if(!relationExists(M,s,REL.kind,KIND.space))ingest(M,[[s,REL.kind,KIND.space]]);
  return s;
}

function addMathAlternativeInMind(M,spaceId,candidateId,options={}){
  const L=mathLedgerFromMind(M,options);
  addMathAlternative(L,String(spaceId),String(candidateId),options);
  const s=ensureSpaceInMind(M,spaceId),c=candidateRef(candidateId);
  if(!relationExists(M,s,REL.alternative,c))ingest(M,[[s,REL.alternative,c]]);
  return currentMathSpace(mathLedgerFromMind(M,options),String(spaceId),options);
}

function proposeMathAlternativeInMind(M,spaceId,proposal,options={}){
  const c=proposeMathInMind(M,proposal,options);
  addMathAlternativeInMind(M,spaceId,c.id,options);
  return currentMathHypothesis(mathLedgerFromMind(M,options),c.id);
}

function contactMathInMind(M,input,metadata={},options={}){
  assertMind(M);
  const L=mathLedgerFromMind(M,options);
  const graph=asCompiledMath(input,options);
  const id=String(metadata.id??nextEvidenceId(M));
  if(subjectsOfKind(M,KIND.evidence).some(x=>strip('math-evidence:',x)===id))throw new Error(`duplicate evidence id ${id}`);

  // Evaluate first so invalid targets fail before the reality-contact is retained.
  contactMath(L,graph,{...clone(metadata),id},options);
  const e=evidenceRef(id);
  ingest(M,[
    [e,REL.kind,KIND.evidence],
    [e,REL.evidenceStructure,clone(graph)],
    [e,REL.metadata,{...clone(metadata),id}]
  ]);
  return {whole:1,evidence:id,ledger:mathLedgerFromMind(M,options)};
}

function contactMathSpaceInMind(M,spaceId,input,metadata={},options={}){
  ensureSpaceInMind(M,spaceId);
  if(Object.prototype.hasOwnProperty.call(metadata,'candidates'))throw new Error('space contact targets the space; do not supply candidate ids');
  if(options.autoRefine!==false&&metadata.complete===true){
    throw new Error('bounded M migration does not yet persist automatic structural refinements; use autoRefine:false');
  }
  const spaces=[...new Set([String(spaceId),...(Array.isArray(metadata.spaces)?metadata.spaces.map(String):[])])];
  const x=contactMathInMind(M,input,{...clone(metadata),spaces,positive_only:true},options);
  return{whole:1,space:String(spaceId),evidence:x.evidence,current:currentMathSpace(x.ledger,String(spaceId),options)};
}

function currentMathHypothesisInMind(M,id,requirements={},options={}){
  return currentMathHypothesis(mathLedgerFromMind(M,options),id,requirements);
}
function currentMathSpaceInMind(M,id,options={}){return currentMathSpace(mathLedgerFromMind(M,options),id,options);}

module.exports={
  REL,KIND,mathLedgerFromMind,
  proposeMathInMind,addMathAlternativeInMind,proposeMathAlternativeInMind,
  contactMathInMind,contactMathSpaceInMind,
  currentMathHypothesisInMind,currentMathSpaceInMind
};
