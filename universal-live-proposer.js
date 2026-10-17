'use strict';

// Live orchestration between the ordinary Universal-Language F/oracle path and
// the one mathematical-hypothesis ledger.
//
// This module is intentionally only a connection:
//   * `universal-language.js` still owns surface relation learning/resolution;
//   * `math-hypotheses.js` still owns mathematical candidates/evidence/status;
//   * `english-math-bridge.js` still owns only opaque live attachments;
//   * stabilized relations are read through the existing derived field.
//
// A proposer is allowed to SEE the currently stabilized anonymous mathematical
// vocabulary and, when a mathematical cue exists, the current relational
// completion view. Its proposal is not evidence. Mathematical alternatives are
// routed through the existing relation-guided proposal path and remain open
// until the authoritative ledger receives independent/formal/reality contact.
// Once the current surface input resolves to live mathematics, that mathematics
// itself becomes the present structural cue and derives a current completion
// frontier automatically. No attention state or controller is stored.
//
// An ordinary live contact may additionally carry an explicit `math_contact`.
// That is routed after proposal handling through the EXISTING contactMath(...)
// authority. It is therefore a normal reality/formal contact entering the same
// live step, not a second history/memory store. Proposal data is never silently
// converted into contact. When source expressions are supplied, their exact
// source representation is retained as contact provenance. Cross-occurrence
// recurrence later reuses the established complete-relation boundary and remains
// proposal-only until the existing stabilization/evidence path warrants it.

const {F}=require('./universal-language');
const {contactMath}=require('./math-hypotheses');
const {
  canonicalRelation,bindEnglishMathSpace,currentEnglishMath
}=require('./english-math-bridge');
const {reusableRelationField}=require('./universal-relation-reuse');
const {
  proposeRelationGuidedAlternative,queryRelationalField
}=require('./universal-relational-completion');
const {summarizeHistoricalContacts}=require('./relational-history-resolution');
const {recurrentHistoricalRelations}=require('./relational-history-abstraction');

function assertUniversal(U){
  if(!U||U.whole!==1||!U.relations)throw new Error('invalid universal-language state');
}
function assertLedger(L){
  if(!L||L.whole!==1||!L.candidates||!L.spaces)throw new Error('invalid math hypothesis ledger');
}
function assertBridge(B){
  if(!B||B.whole!==1||!Array.isArray(B.bindings))throw new Error('invalid English-math bridge');
}

function cloneGraph(graph){
  return{
    version:graph.version??1,
    vertex_count:Number(graph.vertex_count??0),
    edges:(graph.edges||[]).map(e=>e.slice()),
    signature:String(graph.signature)
  };
}

function cloneJson(v){return v==null?v:JSON.parse(JSON.stringify(v));}

// Pure proposer-facing snapshot. Signatures identify anonymous structures only;
// they are not semantic names or a second registry. No writable status is copied.
function liveMathVocabularyView(L,options={}){
  assertLedger(L);
  const field=reusableRelationField(L,options);
  return{
    whole:1,
    kind:'stabilized-relational-vocabulary',
    relations:field.relations.map(r=>({
      signature:r.signature,
      graph:cloneGraph(r.graph),
      occurrence_count:r.occurrence_count,
      space_count:(r.spaces||[]).length
    }))
  };
}

function enrichCompletion(L,view,options={}){
  if(!view)return null;
  const historicalContacts=view.historical_contacts||[];
  return{
    ...view,
    historical_resolution:summarizeHistoricalContacts(historicalContacts),
    historical_recurrence:recurrentHistoricalRelations(L,historicalContacts,options)
  };
}

function cueView(L,contact,options={}){
  const cue=contact?.math_graph??contact?.math_cue??null;
  if(!cue)return null;
  return enrichCompletion(L,queryRelationalField(L,cue,options),options);
}

function normalizeSurfaceSignal(signal){
  if(signal==null)return null;
  if(typeof signal!=='object')throw new Error('live proposer signal must be an object or null');
  const s=signal.surface&&typeof signal.surface==='object'?signal.surface:signal;
  const out={};
  if(Array.isArray(s.relations))out.relations=s.relations;
  if(Array.isArray(s.candidates))out.candidates=s.candidates;
  return out;
}

function mathSpaceSpecs(signal){
  if(!signal||typeof signal!=='object')return[];
  const xs=signal.math_spaces??signal.mathematics??[];
  if(!Array.isArray(xs))throw new Error('math_spaces must be an array');
  return xs;
}

function nextSpaceId(L){
  let n=Object.keys(L.spaces||{}).length+1;
  while(L.spaces[`ms${n}`])n++;
  return`ms${n}`;
}

function proposedSurfaceRefs(U){
  return (U.current?.proposed_relations||[]).map(String);
}

function resolveSurfaceRef(U,spec){
  if(spec.relation_ref!==undefined&&spec.relation_ref!==null){
    const ref=String(spec.relation_ref);
    if(!canonicalRelation(U,ref))throw new Error(`unknown proposed surface relation ${ref}`);
    return ref;
  }
  const refs=proposedSurfaceRefs(U);
  if(refs.length!==1)throw new Error('math proposal must identify relation_ref unless exactly one surface relation was proposed');
  return refs[0];
}

function proposalAlternatives(spec){
  const xs=spec.alternatives??spec.candidates??[];
  if(!Array.isArray(xs)||!xs.length)throw new Error('math space proposal requires at least one alternative');
  return xs;
}

function currentCompletion(L,current,options={}){
  if(!current||current.status!=='resolved-candidate-math'||!current.math)return null;
  return enrichCompletion(L,queryRelationalField(L,current.math,options),options);
}

function sourceExpressionsFromContactInput(input){
  if(Array.isArray(input))return cloneJson(input);
  if(input&&typeof input==='object'&&Array.isArray(input.expressions))return cloneJson(input.expressions);
  return null;
}

function routeMathContact(L,contact,options={}){
  const spec=contact?.math_contact;
  if(spec===undefined||spec===null)return null;
  if(typeof spec!=='object'||Array.isArray(spec))throw new Error('math_contact must be an object');
  const input=Object.prototype.hasOwnProperty.call(spec,'input')?spec.input:spec.math;
  if(input===undefined||input===null)throw new Error('math_contact requires input or math');
  const metadata={...(spec.metadata||{})};
  for(const key of ['id','complete','kind','candidates','spaces','positive_only']){
    if(Object.prototype.hasOwnProperty.call(spec,key)&&!Object.prototype.hasOwnProperty.call(metadata,key))metadata[key]=spec[key];
  }
  const sourceExpressions=sourceExpressionsFromContactInput(input);
  if(sourceExpressions&&!Object.prototype.hasOwnProperty.call(metadata,'source_expressions')){
    metadata.source_expressions=sourceExpressions;
  }
  const before=L.evidence.length;
  const candidateResults=contactMath(L,input,metadata,options);
  const evidence=L.evidence[before];
  if(!evidence)throw new Error('math_contact did not enter the authoritative evidence ledger');
  return{
    id:evidence.id,
    signature:evidence.graph.signature,
    source_backed:Boolean(sourceExpressions),
    candidate_results:candidateResults.map(x=>({id:x.id,result:x.result,status:x.status,usable:x.usable}))
  };
}

// One ordinary F step plus optional mathematical proposal/contact routing. The
// proposer receives the ordinary F oracle view augmented by a live read-only
// mathematical field. F sees only the surface portion of the returned signal.
// Proposals enter as proposals; an explicit math_contact enters later through
// contactMath(...). Keeping those paths separate preserves proposal != evidence.
async function liveUniversalStep(U,L,B,contact,proposer=null,options={}){
  assertUniversal(U);assertLedger(L);assertBridge(B);
  if(!contact||typeof contact!=='object')throw new Error('contact must be an object');
  if(proposer!==null&&typeof proposer!=='function')throw new Error('proposer must be a function or null');

  let fullSignal=null;
  const vocabulary=liveMathVocabularyView(L,options);
  const suppliedCue=cueView(L,contact,options);

  const oracle=proposer?async baseView=>{
    const view={
      ...baseView,
      universal_math:{
        whole:1,
        vocabulary,
        cue_completion:suppliedCue,
        proposal_contract:{
          surface:{candidates:'ordinary F candidates/relations'},
          math_spaces:[{
            relation_ref:'opaque surface relation id; optional only when exactly one surface relation is proposed',
            space_id:'optional opaque math-space id',
            alternatives:'one or more ordinary relation-guided mathematical proposals'
          }],
          evidence_rule:'proposal is not evidence; only explicit upstream/math_contact enters the evidence ledger'
        }
      }
    };
    fullSignal=await proposer(view);
    return normalizeSurfaceSignal(fullSignal);
  }:null;

  await F(U,contact,oracle);

  const routed=[];
  for(const spec of mathSpaceSpecs(fullSignal)){
    if(!spec||typeof spec!=='object')throw new Error('invalid math-space proposal');
    const relationRef=resolveSurfaceRef(U,spec);
    const spaceId=String(spec.space_id??nextSpaceId(L));
    const alternatives=[];
    for(const proposal of proposalAlternatives(spec)){
      alternatives.push(proposeRelationGuidedAlternative(L,spaceId,proposal,options));
    }
    const binding=bindEnglishMathSpace(B,U,L,relationRef,spaceId);
    routed.push({
      relation_ref:relationRef,
      canonical_relation:canonicalRelation(U,relationRef),
      space_id:spaceId,
      alternatives:alternatives.map(x=>({
        hypothesis_id:x.hypothesis_id,
        source_signature:x.source_signature,
        relation_uses:x.relation_uses,
        raw_constraints:x.raw_constraints,
        relation_signatures:x.relation_signatures.slice()
      })),
      binding:{relation_ref:binding.relation_ref,space_id:binding.space_id}
    });
  }

  // Explicit contact is routed only after proposal handling, so the proposer
  // cannot manufacture evidence merely by returning a candidate. If a caller
  // intentionally targets a newly proposed candidate/space in math_contact, that
  // target is evaluated by the one authoritative ledger in this same step.
  const enteredContact=routeMathContact(L,contact,options);

  const current=currentEnglishMath(B,U,L);
  const active=currentCompletion(L,current,options);

  return{
    whole:1,
    surface:{
      proposed_relations:proposedSurfaceRefs(U),
      resolution:U.current?.resolution??null
    },
    mathematical:{
      stabilized_relation_count:vocabulary.relations.length,
      supplied_cue_completion:suppliedCue,
      active_completion:active,
      routed_spaces:routed,
      entered_contact:enteredContact,
      current
    }
  };
}

module.exports={liveMathVocabularyView,liveUniversalStep};
