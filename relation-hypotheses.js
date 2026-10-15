'use strict';

// Corrigible hypothesis scaffold for the universal-language track.
//
// An LLM, text source, human, or any other proposer may submit arbitrary
// anonymous relational patterns. Proposal is NOT acceptance. Candidates become
// usable only when independently supported by mathematical/reality constraints;
// later counterevidence reopens them. This file has no Stone-specific semantics.

const { matchMotif } = require('./stone-reality-contact');

const stable = v => {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
};

// The currently closed mathematical substrate has O0..O10.
const OP_MIN = 0;
const OP_MAX = 10;

function validatePattern(pattern) {
  if (!pattern || !Array.isArray(pattern.edges) || !pattern.edges.length) {
    throw new Error('candidate pattern requires at least one edge');
  }
  for (const edge of pattern.edges) {
    if (!Array.isArray(edge) || edge.length !== 3) throw new Error('candidate edge must be [operator,from,to]');
    const [op, from, to] = edge;
    if (!Number.isInteger(op) || op < OP_MIN || op > OP_MAX) throw new Error(`unknown operator O${op}`);
    if (from === undefined || to === undefined) throw new Error('candidate edge endpoints must be defined');
  }
  return true;
}

// Alpha-normalize vertex names so two proposers who use different arbitrary
// variable names still submit the same mathematical hypothesis.
function canonicalPattern(pattern) {
  validatePattern(pattern);
  const ren = new Map();
  let next = 0;
  const v = x => {
    const k = stable(x);
    if (!ren.has(k)) ren.set(k, next++);
    return ren.get(k);
  };
  const edges = pattern.edges.map(([op,a,b]) => [op,v(a),v(b)]);
  edges.sort((x,y) => stable(x).localeCompare(stable(y)));
  return { edges };
}

function patternSignature(pattern) {
  return stable(canonicalPattern(pattern));
}

function oneHypothesisLedger() {
  return {
    whole: 1,
    version: 1,
    step: 0,
    candidates: {},
    signature_index: {},
    audit: []
  };
}

function propose(L, proposal) {
  if (!L || L.whole !== 1) throw new Error('invalid hypothesis ledger');
  const normalized = canonicalPattern(proposal.pattern);
  const signature = stable(normalized);
  const existing = L.signature_index[signature];
  if (existing) {
    const c = L.candidates[existing];
    c.proposals.push({source:proposal.source || 'unknown', confidence:proposal.confidence ?? null, note:proposal.note || null});
    L.audit.push({step:++L.step, kind:'proposal-merged', id:c.id, source:proposal.source || 'unknown'});
    return c;
  }
  const id = String(proposal.id || `h${Object.keys(L.candidates).length + 1}`);
  if (L.candidates[id]) throw new Error(`duplicate hypothesis id ${id}`);
  const c = {
    id,
    pattern: normalized,
    signature,
    proposals:[{source:proposal.source || 'unknown', confidence:proposal.confidence ?? null, note:proposal.note || null}],
    support:[],
    defeat:[],
    status:'open',
    usable:false
  };
  L.candidates[id]=c;
  L.signature_index[signature]=id;
  L.audit.push({step:++L.step,kind:'proposed',id,source:proposal.source || 'unknown'});
  return c;
}

function graphOps(graph) {
  return new Set((graph?.edges || []).map(e => Number(e.op)));
}

function evaluateCandidate(c, contact, metadata={}) {
  const graph = contact || {nodes:[],edges:[]};
  const match = matchMotif(c.pattern, graph, {collapse:metadata.collapse !== false});
  if (match) return {kind:'support', match};

  // Absence is a defeater only when the contact explicitly warrants that the
  // relevant operator classes were exhaustively tested. Undefined != false.
  const complete = new Set((metadata.complete_ops || graph.complete_ops || []).map(Number));
  const needed = new Set(c.pattern.edges.map(e=>Number(e[0])));
  const warrantedNegative = [...needed].every(op => complete.has(op));
  return warrantedNegative ? {kind:'defeat', reason:'complete-contact-counterexample'} : {kind:'unresolved', reason:'incomplete-contact'};
}

function recompute(c) {
  if (c.support.length && c.defeat.length) {
    c.status='contested';
    c.usable=false;
  } else if (c.support.length) {
    c.status='supported';
    c.usable=true;
  } else if (c.defeat.length) {
    c.status='defeated';
    c.usable=false;
  } else {
    c.status='open';
    c.usable=false;
  }
  return c;
}

function contact(L, graph, metadata={}) {
  if (!L || L.whole !== 1) throw new Error('invalid hypothesis ledger');
  const contactId = String(metadata.id || `contact:${L.step+1}`);
  const results=[];
  for (const c of Object.values(L.candidates)) {
    const r=evaluateCandidate(c,graph,metadata);
    if (r.kind==='support') c.support.push({contact:contactId,match:r.match});
    if (r.kind==='defeat') c.defeat.push({contact:contactId,reason:r.reason});
    recompute(c);
    results.push({id:c.id,status:c.status,usable:c.usable,result:r.kind});
  }
  L.audit.push({step:++L.step,kind:'contact',id:contactId,results});
  return results;
}

function usablePatterns(L) {
  return Object.values(L.candidates).filter(c=>c.usable).map(c=>({id:c.id,pattern:c.pattern,signature:c.signature}));
}

module.exports = {
  oneHypothesisLedger,
  validatePattern,
  canonicalPattern,
  patternSignature,
  propose,
  evaluateCandidate,
  contact,
  usablePatterns
};
