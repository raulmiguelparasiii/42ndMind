'use strict';

// Proposer-side candidate anatomy for a small family of cognitive relations.
//
// These are NOT cognitive faculties, runtime controllers, semantic truth, or a
// second memory system. They are explicit mathematical hypotheses to be routed
// through the same Universal-Language correction/stabilization machinery as any
// other proposed meaning. English names are an external audit legend only.
//
// The split is motivated by structural distinctions that the generic substrate
// can now express:
//   retained historical availability
//   current cue-dependent retrieval
//   context-rich retrieval of a particular occurrence
//   acquisition/encoding that changes later availability
//   current selection of a live relational frontier
//   persistence of that selection across successive contact
//   target-directed restriction of the current completion frontier
//
// The current operator vocabulary is working mathematics, not claimed final.

const {MOP,variable,constant,app,compileMathGraph,equivalentMathSystems}=require('./universal-math-graph');

const V0=variable,C=constant,A=app;
const eq=(a,b)=>A(MOP.EQ,a,b);
const lt=(a,b)=>A(MOP.LT,a,b);
const neg=a=>A(MOP.NEG,a);
const inSet=(a,S)=>A(MOP.IN,a,S);
const subset=(a,b)=>A(MOP.SUBSET,a,b);
const card=S=>A(MOP.CARD,S);
const tuple=(...xs)=>A(MOP.TUPLE,...xs);
const apply=(f,...xs)=>A(MOP.APPLY,f,...xs);
const transition=(s,e,t)=>A(MOP.TRANSITION,s,e,t);
const intersect=(a,b)=>A(MOP.INTERSECT,a,b);
const nonempty=S=>lt(C(0),card(S));

function scope(tag=''){return name=>V0(`${tag}${name}`);}

// Retention/bookkeeping core: a particular occurrence is in historical contact,
// its content is structurally recoverable, and that content remains available.
// The occurrence carries context/provenance without requiring that context to be
// actively recovered now.
function retainedOccurrenceCore(V){
  const U=V('U'),P=V('P'),ctx=V('ctx'),t0=V('t0'),t1=V('t1');
  const episode=V('episode'),history=V('history'),trace=V('trace'),available=V('available');
  return{
    U,P,ctx,t0,t1,episode,history,trace,available,
    expressions:[
      subset(P,U),
      lt(t0,t1),
      eq(episode,tuple(t0,P,ctx)),
      inSet(episode,history),
      eq(P,apply(trace,episode)),
      inSet(P,available)
    ]
  };
}

// Present retrieval core: a partial present cue completes to retained content and
// places that content in the current field. This extends retention rather than
// redefining it.
function retrievalCore(V){
  const m=retainedOccurrenceCore(V);
  const cue=V('cue'),complete=V('complete'),current=V('current');
  return{
    ...m,cue,complete,current,
    expressions:[
      ...m.expressions,
      subset(cue,m.P), nonempty(cue),
      eq(m.P,apply(complete,cue,m.history)),
      inSet(m.P,current)
    ]
  };
}

// Current selection core. It contains no historical-contact premise: selection
// of what participates now is structurally separable from storage/retrieval.
function selectionCore(V,suffix=''){
  const available=V(`live${suffix}`),target=V(`target${suffix}`),active=V(`active${suffix}`),select=V('select');
  return{
    available,target,active,select,
    expressions:[
      eq(active,apply(select,target,available)),
      subset(active,available),
      nonempty(active)
    ]
  };
}

// Candidate: persistent historical relational availability/bookkeeping.
function memory(tag=''){
  return retainedOccurrenceCore(scope(tag)).expressions;
}

// Candidate: acquisition/encoding that changes what is retained later. It reuses
// the retention core but adds a before->after history transition. It does not
// require current retrieval, keeping encoding distinct from remembering.
function memorize(tag=''){
  const V=scope(tag),m=retainedOccurrenceCore(V);
  const tBefore=V('tBefore'),history0=V('history0'),encode=V('encode');
  return[
    ...m.expressions,
    lt(tBefore,m.t0),
    neg(inSet(m.episode,history0)),
    eq(encode,tuple(m.t0,m.P,m.ctx)),
    transition(history0,encode,m.history),
    inSet(m.episode,m.history)
  ];
}

// Candidate: present cue-dependent retrieval from retained history.
function remember(tag=''){
  return retrievalCore(scope(tag)).expressions;
}

// Candidate: retrieval plus recovery of context bound to the particular earlier
// occurrence. This is stronger than generic remembering and corresponds to the
// context-rich distinction typically associated with episodic recollection.
function recollect(tag=''){
  const V=scope(tag),r=retrievalCore(V);
  const contextOf=V('contextOf'),recoveredContext=V('recoveredContext'),currentContext=V('currentContext');
  return[
    ...r.expressions,
    eq(recoveredContext,apply(contextOf,r.episode)),
    eq(recoveredContext,r.ctx),
    inSet(recoveredContext,currentContext)
  ];
}

// Candidate: present target-dependent selection of a nonempty subset of the live
// relational field. The selector is a relation in the math, not a controller in
// the runtime.
function attention(tag=''){
  return selectionCore(scope(tag)).expressions;
}

// Candidate: selection remains organized around the same target across two
// ordered moments, with nonempty structural continuity between the active sets.
// Focus therefore preserves one attention slice and adds persistence.
function focus(tag=''){
  const V=scope(tag),a0=selectionCore(V,'0');
  const live1=V('live1'),active1=V('active1'),t0=V('t0'),t1=V('t1');
  const overlap=V('overlap');
  return[
    ...a0.expressions,
    lt(t0,t1),
    eq(active1,apply(a0.select,a0.target,live1)),
    subset(active1,live1),
    nonempty(active1),
    eq(overlap,intersect(a0.active,active1)),
    nonempty(overlap)
  ];
}

// Candidate: broad intent as target-directed constraint on the present completion
// frontier, without assuming action intention. It preserves current selection and
// adds an admissible target region that narrows what counts as a live completion.
function broadIntent(tag=''){
  const V=scope(tag),s=selectionCore(V);
  const admissible=V('admissible'),directed=V('directed');
  return[
    ...s.expressions,
    subset(admissible,s.available),
    eq(directed,intersect(s.active,admissible)),
    nonempty(directed)
  ];
}

const COGNITIVE_ORDER=Object.freeze([
  'memory','memorize','remember','recollect','attention','focus','broad_intent'
]);

const BUILDERS=Object.freeze({
  memory,memorize,remember,recollect,attention,focus,broad_intent:broadIntent
});

function candidateExpressions(name,tag=''){
  const f=BUILDERS[name];
  if(!f)throw new Error(`unknown cognitive candidate ${String(name)}`);
  return f(tag);
}

function compileCognitiveCandidates(options={}){
  return COGNITIVE_ORDER.map((name,index)=>({index,graph:compileMathGraph(candidateExpressions(name),options)}));
}

// Pure object has no English relation names; order is decoded only by audit legend.
function anonymousCognitiveBasis(options={}){
  return{
    version:1,
    status:'candidate-not-ground-truth',
    structures:compileCognitiveCandidates(options).map(x=>x.graph)
  };
}

function cognitiveLegend(){return Object.fromEntries(COGNITIVE_ORDER.map((name,i)=>[i,name]));}

function equivalentCandidateUnderRename(name,a='A:',b='B:',options={}){
  return equivalentMathSystems(candidateExpressions(name,a),candidateExpressions(name,b),options);
}

module.exports={
  COGNITIVE_ORDER,BUILDERS,candidateExpressions,compileCognitiveCandidates,
  anonymousCognitiveBasis,cognitiveLegend,equivalentCandidateUnderRename,
  cores:{retainedOccurrenceCore,retrievalCore,selectionCore}
};
