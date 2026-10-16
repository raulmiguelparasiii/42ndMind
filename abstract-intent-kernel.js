'use strict';

// Candidate mathematical anatomy for richer intention / propositional-attitude
// families in the Universal Language Track.
//
// These structures are proposals, not semantic authority. They are deliberately
// built only from generic mathematical/set/state relations. English family
// names live in the audit legend; the compiled pure object contains anonymous
// canonical graphs. Later contact or better decomposition may correct, split,
// merge, or replace any candidate.

const {
  MOP, variable, constant, app, compileMathGraph, equivalentMathSystems
} = require('./universal-math-graph');

const C = constant;
const A = app;

const eq=(a,b)=>A(MOP.EQ,a,b);
const neq=(a,b)=>A(MOP.NEQ,a,b);
const lt=(a,b)=>A(MOP.LT,a,b);
const neg=a=>A(MOP.NEG,a);
const and=(...xs)=>A(MOP.AND,...xs);
const inSet=(a,S)=>A(MOP.IN,a,S);
const subset=(a,b)=>A(MOP.SUBSET,a,b);
const card=S=>A(MOP.CARD,S);
const tuple=(...xs)=>A(MOP.TUPLE,...xs);
const apply=(f,...xs)=>A(MOP.APPLY,f,...xs);
const transition=(s,e,t)=>A(MOP.TRANSITION,s,e,t);
const intersect=(a,b)=>A(MOP.INTERSECT,a,b);
const union=(a,b)=>A(MOP.UNION,a,b);
const complement=(a,U)=>A(MOP.COMPLEMENT,a,U);
const nonempty=S=>lt(C(0),card(S));

function scope(tag='') {
  return name=>variable(`${tag}${name}`);
}

function propositionBase(V) {
  const U=V('U'), P=V('P'), NP=V('NP');
  return {
    U,P,NP,
    expressions:[
      subset(P,U),
      eq(NP,complement(P,U))
    ]
  };
}

function uncertaintyCore(V) {
  const b=propositionBase(V);
  const K=V('K'), H=V('H'), KP=V('KP'), KN=V('KN');
  return {
    ...b,K,H,KP,KN,
    expressions:[
      ...b.expressions,
      subset(K,b.U), nonempty(K),
      eq(KP,intersect(K,b.P)),
      eq(KN,intersect(K,b.NP)),
      nonempty(KP), nonempty(KN),
      neg(inSet(b.P,H)), neg(inSet(b.NP,H))
    ]
  };
}

function futureRankingCore(V,b,agent) {
  const F=V('F'), FP=V('FP'), FN=V('FN');
  const rankOf=V('rankOf'), rankProfile=V('rankProfile');
  const vP=V('vP'), vN=V('vN');
  return {
    F,FP,FN,rankOf,rankProfile,vP,vN,
    expressions:[
      subset(F,b.U),
      eq(FP,intersect(F,b.P)),
      eq(FN,intersect(F,b.NP)),
      nonempty(FP), nonempty(FN),
      eq(rankProfile,apply(rankOf,agent)),
      eq(vP,apply(rankProfile,FP)),
      eq(vN,apply(rankProfile,FN)),
      lt(vN,vP)
    ]
  };
}

function actionRealizationCore(V,b,agent) {
  const A0=V('A0'), AS=V('AS'), O=V('O');
  const ownerOf=V('ownerOf'), outcomeOf=V('outcomeOf');
  return {
    A0,AS,O,ownerOf,outcomeOf,
    expressions:[
      eq(agent,apply(ownerOf,A0)),
      subset(AS,A0), nonempty(AS),
      eq(O,apply(outcomeOf,AS)),
      subset(O,b.P), nonempty(O)
    ]
  };
}

function communicationCore(V,b) {
  const speaker=V('speaker'), addressee=V('addressee'), event=V('event');
  return {
    speaker,addressee,event,
    expressions:[eq(event,tuple(speaker,addressee,b.P))]
  };
}

function belief(tag='') {
  const V=scope(tag), b=propositionBase(V);
  const K=V('K'), H=V('H');
  return [
    ...b.expressions,
    subset(K,b.U), nonempty(K),
    subset(K,b.P),
    inSet(b.P,H)
  ];
}

function doubt(tag='') {
  return uncertaintyCore(scope(tag)).expressions;
}

function consider(tag='') {
  const V=scope(tag), u=uncertaintyCore(V);
  const branches=V('branches'), scratch=V('scratch');
  return [
    ...u.expressions,
    eq(branches,tuple(u.KP,u.KN)),
    inSet(branches,scratch)
  ];
}

function imagine(tag='') {
  const V=scope(tag), b=propositionBase(V);
  const K=V('K'), HYP=V('HYP'), scratch=V('scratch');
  return [
    ...b.expressions,
    subset(K,b.U), nonempty(K),
    subset(HYP,b.U), subset(HYP,b.P), nonempty(HYP),
    neq(HYP,K),
    inSet(HYP,scratch)
  ];
}

function remember(tag='') {
  const V=scope(tag), b=propositionBase(V);
  const t0=V('t0'), t1=V('t1'), K0=V('K0');
  const contact=V('contact'), history=V('history'), held=V('held');
  const trace=V('trace');
  return [
    ...b.expressions,
    lt(t0,t1),
    subset(K0,b.U), subset(K0,b.P), nonempty(K0),
    eq(contact,tuple(t0,K0)),
    inSet(contact,history),
    eq(b.P,apply(trace,contact)),
    inSet(b.P,held)
  ];
}

function infer(tag='') {
  const V=scope(tag);
  const U=V('U'), premise=V('premise'), conclusion=V('conclusion');
  const H0=V('H0'), H1=V('H1'), singleton=V('singleton');
  return [
    subset(premise,U), subset(conclusion,U),
    subset(premise,conclusion),
    inSet(premise,H0),
    inSet(conclusion,singleton), eq(card(singleton),C(1)),
    eq(H1,union(H0,singleton)),
    transition(H0,premise,H1),
    inSet(conclusion,H1)
  ];
}

function desire(tag='') {
  const V=scope(tag), b=propositionBase(V), agent=V('agent');
  const r=futureRankingCore(V,b,agent);
  return [...b.expressions,...r.expressions];
}

function intend(tag='') {
  const V=scope(tag), b=propositionBase(V), agent=V('agent');
  const r=futureRankingCore(V,b,agent);
  const a=actionRealizationCore(V,b,agent);
  return [...b.expressions,...r.expressions,...a.expressions];
}

function question(tag='') {
  const V=scope(tag), u=uncertaintyCore(V);
  const c=communicationCore(V,u);
  const response=V('response'), reply=V('reply'), route=V('route'), K1=V('K1');
  return [
    ...u.expressions,
    ...c.expressions,
    eq(response,apply(reply,c.event,c.addressee)),
    eq(route,tuple(c.addressee,c.speaker,response)),
    transition(u.K,response,K1),
    subset(K1,u.K),
    lt(card(K1),card(u.K))
  ];
}

function assertProposition(tag='') {
  const V=scope(tag), b=propositionBase(V), c=communicationCore(V,b);
  const H0=V('H0'), H1=V('H1'), singleton=V('singleton');
  return [
    ...b.expressions,
    ...c.expressions,
    inSet(b.P,singleton), eq(card(singleton),C(1)),
    eq(H1,union(H0,singleton)),
    transition(H0,c.event,H1),
    inSet(b.P,H1)
  ];
}

function command(tag='') {
  const V=scope(tag), b=propositionBase(V), c=communicationCore(V,b);
  const a=actionRealizationCore(V,b,c.addressee);
  const target=V('target'), targets=V('targets');
  return [
    ...b.expressions,
    ...c.expressions,
    ...a.expressions,
    eq(target,tuple(c.addressee,a.AS,a.O,b.P)),
    eq(target,apply(targets,c.event))
  ];
}

function promise(tag='') {
  const V=scope(tag), b=propositionBase(V), c=communicationCore(V,b);
  const A0=V('A0'), A1=V('A1'), O=V('O');
  const ownerOf=V('ownerOf'), outcomeOf=V('outcomeOf');
  return [
    ...b.expressions,
    ...c.expressions,
    eq(c.speaker,apply(ownerOf,A0)),
    subset(A1,A0), nonempty(A1),
    eq(O,apply(outcomeOf,A1)), subset(O,b.P), nonempty(O),
    transition(A0,c.event,A1)
  ];
}

function obligation(tag='') {
  const V=scope(tag), b=propositionBase(V);
  const source=V('source'), agent=V('agent'), constraint=V('constraint');
  const A0=V('A0'), A1=V('A1'), O=V('O');
  const ownerOf=V('ownerOf'), outcomeOf=V('outcomeOf');
  return [
    ...b.expressions,
    eq(constraint,tuple(source,agent,b.P)),
    eq(agent,apply(ownerOf,A0)),
    subset(A1,A0), nonempty(A1),
    eq(O,apply(outcomeOf,A1)), subset(O,b.P), nonempty(O),
    transition(A0,constraint,A1)
  ];
}

const INTENT_ORDER = Object.freeze([
  'belief','doubt','consider','imagine','remember','infer','desire','intend',
  'question','assertion','command','promise','obligation'
]);

const BUILDERS = Object.freeze({
  belief,doubt,consider,imagine,remember,infer,desire,intend,question,
  assertion:assertProposition,command,promise,obligation
});

function candidateExpressions(name,tag='') {
  const f=BUILDERS[name];
  if(!f) throw new Error(`unknown candidate family ${String(name)}`);
  return f(tag);
}

function compileIntentCandidates(options={}) {
  return INTENT_ORDER.map((name,index)=>{
    const graph=compileMathGraph(candidateExpressions(name),options);
    return {index,graph};
  });
}

// Pure object: no English family names. Array position is interpreted only by
// an external audit legend. The graph itself is the candidate mathematical
// anatomy.
function anonymousIntentBasis(options={}) {
  return {
    version:1,
    status:'candidate-not-ground-truth',
    structures:compileIntentCandidates(options).map(x=>x.graph),
    recurring_constraint_motifs:recurringConstraintMotifs(2,options).map(x=>({
      signature:x.signature,
      family_indices:x.family_indices,
      family_count:x.family_count,
      occurrences:x.occurrences
    }))
  };
}

function intentLegend() {
  return Object.fromEntries(INTENT_ORDER.map((name,i)=>[i,name]));
}

// Mine recurring top-level mathematical constraints after canonicalizing each
// constraint independently. This is intentionally name-blind: recurrence is
// discovered from mathematical structure, not from family labels.
function recurringConstraintMotifs(minFamilies=2,options={}) {
  const motifs=new Map();
  INTENT_ORDER.forEach((name,index)=>{
    for(const expr of candidateExpressions(name)) {
      const graph=compileMathGraph([expr],options);
      let m=motifs.get(graph.signature);
      if(!m){m={signature:graph.signature,families:new Set(),occurrences:0};motifs.set(graph.signature,m);}
      m.families.add(index); m.occurrences++;
    }
  });
  return [...motifs.values()]
    .filter(m=>m.families.size>=minFamilies)
    .map(m=>({signature:m.signature,family_indices:[...m.families].sort((a,b)=>a-b),family_count:m.families.size,occurrences:m.occurrences}))
    .sort((a,b)=>b.family_count-a.family_count || b.occurrences-a.occurrences || a.signature.localeCompare(b.signature));
}

function equivalentCandidateUnderRename(name,a='A:',b='B:',options={}) {
  return equivalentMathSystems(candidateExpressions(name,a),candidateExpressions(name,b),options);
}

module.exports={
  INTENT_ORDER, BUILDERS, candidateExpressions, compileIntentCandidates,
  anonymousIntentBasis, intentLegend, recurringConstraintMotifs,
  equivalentCandidateUnderRename,
  helpers:{eq,neq,lt,neg,and,inSet,subset,card,tuple,apply,transition,intersect,union,complement,nonempty}
};
