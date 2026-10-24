'use strict';

// Zero-state dialogue over the same canonical M.
//
// This module does not own a parser, lexicon, response table, world model, or
// conversation memory.  It reads retained surface episodes and canonical facts.
// A question form is learned only from lived sequence: an ungrounded utterance
// followed by a grounded utterance about one relation.  The answer wording is
// learned from the grounded utterance's INPUT form, never from a supplied
// surface.output.  Thus language learned for comprehension is also available for
// expression; there is no separate answer-language authority.

const Surface = require('./surface-template.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }
function episodeNumber(id) {
  const n = Number(String(id).split(':').at(-1));
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}
function episodes(state) {
  const groups = new Map();
  for (const f of state.knowledge?.facts || []) {
    if (typeof f.subject !== 'string' || !f.subject.startsWith('sequence-contact:')) continue;
    if (!groups.has(f.subject)) groups.set(f.subject, { id: f.subject, relations: [] });
    const e = groups.get(f.subject);
    if (f.relation === 'ρ:input_tokens' && Array.isArray(f.object)) e.input_tokens = f.object.slice();
    else if (f.relation === 'ρ:input_raw') e.input_raw = String(f.object);
    else if (f.relation === 'ρ:surface_source') e.source = f.object;
    else if (f.relation === 'ρ:surface_target') e.target = f.object;
    else if (f.relation === 'ρ:contact_relation' && f.object && typeof f.object === 'object' &&
      Object.prototype.hasOwnProperty.call(f.object, 'subject') &&
      Object.prototype.hasOwnProperty.call(f.object, 'relation') &&
      Object.prototype.hasOwnProperty.call(f.object, 'object')) e.relations.push({ ...f.object });
  }
  for (const e of groups.values()) e.relations.sort((a,b)=>(a.order ?? 0)-(b.order ?? 0));
  return [...groups.values()].sort((a,b)=>episodeNumber(a.id)-episodeNumber(b.id));
}
function contactRelations(e) {
  return (e?.relations || []).filter(r => r.source === 'simultaneous_relational_contact');
}
function setJaccard(a, b) {
  const A = new Set((a || []).map(stable)), B = new Set((b || []).map(stable));
  if (!A.size && !B.size) return 1;
  let n = 0; for (const x of A) if (B.has(x)) n++;
  return n / Math.max(1, A.size + B.size - n);
}
function bigrams(xs) { const out=[]; for(let i=0;i+1<(xs||[]).length;i++) out.push([xs[i],xs[i+1]]); return out; }
function similarity(a,b) {
  const A=Surface.compactTokens(a||[]), B=Surface.compactTokens(b||[]);
  return 0.68*setJaccard(A,B)+0.32*setJaccard(bigrams(A),bigrams(B));
}
function currentObjects(state, subject, relation) {
  return unique((state.knowledge?.current?.facts || [])
    .filter(f => same(f.subject,subject) && same(f.relation,relation)).map(f=>f.object));
}
function attachedPhrase(state, value) {
  const rows=(state.knowledge?.facts||[])
    .filter(f=>same(f.subject,value)&&f.relation==='ρ:surface_expression'&&f.object&&Array.isArray(f.object.tokens))
    .sort((a,b)=>episodeNumber(a.object.source_episode)-episodeNumber(b.object.source_episode));
  if (!rows.length) return undefined;
  const variants=unique(rows.map(f=>f.object.tokens));
  return variants.length===1 ? variants[0] : rows.at(-1).object.tokens;
}

// A lived Q -> grounded A adjacency is evidence about communicative intent.
// No answer field is involved.  We group by the relation actually present in the
// answer contact and locally select the recurrent question construction that best
// matches the current utterance.
function dialogueFamilies(es, currentTokens) {
  const rows=[];
  for(let i=0;i+1<es.length;i++) {
    const q=es[i], a=es[i+1];
    const qr=contactRelations(q), ar=contactRelations(a);
    if (!Array.isArray(q.input_tokens) || qr.length !== 0 || ar.length !== 1) continue;
    const r=ar[0];
    rows.push({ q, a, subject:r.subject, relation:r.relation, object:r.object, score:similarity(currentTokens,q.input_tokens) });
  }
  const by=new Map();
  for(const row of rows) {
    const key=stable(row.relation);
    if(!by.has(key)) by.set(key,[]);
    by.get(key).push(row);
  }
  const out=[];
  for(const rs of by.values()) {
    rs.sort((a,b)=>b.score-a.score||episodeNumber(b.q.id)-episodeNumber(a.q.id));
    const best=rs[0]?.score ?? -Infinity;
    const near=rs.filter(x=>x.score>=Math.max(0.16,best-0.14)).slice(0,64);
    const subjects=unique(near.map(x=>x.subject));
    if(near.length<3 || subjects.length<3) continue;
    out.push({ relation:near[0].relation, rows:near, score:near.reduce((s,x)=>s+x.score,0)/near.length, support:near.length, subject_diversity:subjects.length });
  }
  return out.sort((a,b)=>b.score-a.score||b.support-a.support||b.subject_diversity-a.subject_diversity);
}
function resolveQuestion(state, es, seq) {
  const families=dialogueFamilies(es.slice(0,-1),seq.input_tokens||[]);
  for(const family of families) {
    const projected=family.rows.map(x=>({
      id:x.q.id,
      output_tokens:Surface.compactTokens(x.q.input_tokens),
      channels:new Map([[0,x.subject],[1,x.relation]]),
    }));
    const template=Surface.buildTemplate(projected.map(e=>e.output_tokens));
    const tokens=Surface.compactTokens(seq.input_tokens||[]);
    const match=template&&Surface.matchTemplate(tokens,template);
    if(!template||!match) continue;
    const roles=Surface.inferOutputRoles(projected,template);
    const subjectRole=roles.find(r=>r.channel===0);
    if(!subjectRole||!match.has(subjectRole.slot)) continue;
    const subject=Surface.renderTokens(match.get(subjectRole.slot));
    if(subject===undefined||subject===null||subject==='') continue;
    return { subject, relation:family.relation, family, template, roles };
  }
  return null;
}

// Use the same grounded INPUT construction that taught comprehension to speak a
// canonical fact. This is the key symmetry: experience of language is sufficient
// to provide a later expression route; nobody has to pre-supply the answer text.
function renderCanonicalFact(state, es, subject, relation, object) {
  const rows=[];
  for(const e of es) {
    if(!Array.isArray(e.input_tokens)) continue;
    const rs=contactRelations(e);
    if(rs.length!==1 || !same(rs[0].relation,relation)) continue;
    rows.push({ ...e, channels:new Map([[0,rs[0].subject],[1,rs[0].relation],[2,rs[0].object]]), output_tokens:Surface.compactTokens(e.input_tokens) });
  }
  if(rows.length<3) return null;
  const template=Surface.buildTemplate(rows.map(e=>e.output_tokens));
  if(!template) return null;
  const roles=Surface.inferOutputRoles(rows,template);
  const channels=new Map([[0,subject],[1,relation],[2,object]]);
  const filled=Surface.fillTemplate(template,rows,rows,channels,roles,(_c,v)=>attachedPhrase(state,v));
  if(!filled.tokens||filled.unresolved.length) return null;
  return { tokens:filled.tokens, expression:Surface.renderTokens(filled.tokens), template, roles };
}

function respond(state, originalContact) {
  if(!originalContact||typeof originalContact!=='object'||!originalContact.surface) return false;
  if(originalContact.surface.output!==undefined&&originalContact.surface.output!==null) return false;
  const seq=state.current?.sequence;
  if(!seq||!Array.isArray(seq.input_tokens)||seq.expression) return false;
  const es=episodes(state);
  if(es.length<2) return false;
  const resolved=resolveQuestion(state,es,seq);
  if(!resolved) return false;
  const objects=currentObjects(state,resolved.subject,resolved.relation);
  if(objects.length!==1) return false;
  const rendered=renderCanonicalFact(state,es,resolved.subject,resolved.relation,objects[0]);
  if(!rendered) return false;
  seq.output_tokens=rendered.tokens;
  seq.expression=rendered.expression;
  seq.unresolved_output_positions=[];
  seq.dialogue_induction=true;
  seq.output_template=rendered.template;
  seq.output_roles=rendered.roles;
  seq.canonical_grounding={
    subject:resolved.subject,
    relation:resolved.relation,
    object:objects[0],
    source:'M.knowledge.current.facts',
    authority:'canonical_M',
    status:'grounded_from_lived_dialogue',
  };
  return true;
}

module.exports={ respond };
