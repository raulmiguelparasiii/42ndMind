'use strict';

// Zero-state dialogue over the same canonical M.
//
// This module owns no parser, lexicon, response table, world model, or dialogue
// memory. It reads retained lived surface episodes and canonical facts. Meaning
// is induced from stable relations in experience: an ungrounded utterance is
// followed by a grounded utterance; recurrent surface spans that uniquely predict
// the grounded relation become useful intent evidence, while generic spans that
// occur across different relations remain ambiguous. Grounded INPUT constructions
// are also available for later expression, so understanding and speaking share
// one learned surface substrate. No surface.output answer fixture is required.

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
function lexical(token) { return /[\p{L}\p{N}]/u.test(String(token)); }
function spans(tokens, maxLength = 3) {
  const compact = Surface.compactTokens(tokens || []);
  const out=[];
  for(let start=0;start<compact.length;start++) {
    if(!lexical(compact[start])) continue;
    for(let length=1;length<=maxLength&&start+length<=compact.length;length++) {
      const part=compact.slice(start,start+length);
      if(part.some(x=>!lexical(x))) break;
      const key=stable(part);
      if(!out.some(x=>x.key===key)) out.push({key,tokens:part,text:Surface.renderTokens(part),length});
    }
  }
  return out;
}
function containsSpan(tokens, phrase) {
  const input=Surface.compactTokens(tokens||[]), p=Surface.compactTokens(phrase||[]);
  if(!p.length||p.length>input.length) return false;
  outer: for(let i=0;i+p.length<=input.length;i++) {
    for(let j=0;j<p.length;j++) if(!same(input[i+j],p[j])) continue outer;
    return true;
  }
  return false;
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

function questionAnswerRows(es) {
  const rows=[];
  for(let i=0;i+1<es.length;i++) {
    const q=es[i], a=es[i+1];
    const qr=contactRelations(q), ar=contactRelations(a);
    if(!Array.isArray(q.input_tokens)||qr.length!==0||ar.length!==1) continue;
    const r=ar[0];
    rows.push({q,a,subject:r.subject,relation:r.relation,object:r.object});
  }
  return rows;
}

// Contrastive intent induction uses both sides of lived dialogue. A span may be
// informative because people use it in questions ("where") or because it is the
// stable relational wording in grounded assertions ("likes"). It is accepted only
// when recurrence across independent subjects points to exactly one relation.
function intentCues(rows) {
  const evidence=new Map();
  function add(row,tokens,side) {
    for(const span of spans(tokens)) {
      if(!evidence.has(span.key)) evidence.set(span.key,{tokens:span.tokens,text:span.text,length:span.length,rows:[],sides:new Set()});
      const e=evidence.get(span.key);
      e.rows.push(row); e.sides.add(side);
    }
  }
  for(const row of rows) {
    add(row,row.q.input_tokens,'question');
    add(row,row.a.input_tokens,'grounded_assertion');
  }
  const cues=[];
  for(const e of evidence.values()) {
    // One Q/A pair contributes the same relation twice when a span occurs on both
    // sides; count unique dialogue rows rather than raw span occurrences.
    const uniqueRows=unique(e.rows.map(r=>({q:r.q.id,a:r.a.id,subject:r.subject,relation:r.relation,object:r.object})))
      .map(key=>e.rows.find(r=>r.q.id===key.q&&r.a.id===key.a));
    const relations=unique(uniqueRows.map(x=>x.relation));
    const subjects=unique(uniqueRows.map(x=>x.subject));
    if(relations.length!==1||uniqueRows.length<3||subjects.length<3) continue;
    cues.push({...e,rows:uniqueRows,relation:relations[0],support:uniqueRows.length,subject_diversity:subjects.length,sides:[...e.sides].sort()});
  }
  cues.sort((a,b)=>b.length-a.length||b.subject_diversity-a.subject_diversity||b.support-a.support||a.text.localeCompare(b.text));
  return cues;
}

function subjectFromQuery(state, rows, relation, tokens) {
  const candidates=[];
  const relationSubjects=new Set(rows.filter(r=>same(r.relation,relation)).map(r=>stable(r.subject)));
  for(const f of state.knowledge?.facts||[]) {
    if(f.relation!=='ρ:surface_expression'||!f.object||!Array.isArray(f.object.tokens)) continue;
    if(!containsSpan(tokens,f.object.tokens)) continue;
    candidates.push({value:f.subject,known:relationSubjects.has(stable(f.subject)),length:f.object.tokens.length});
  }
  for(const row of rows.filter(r=>same(r.relation,relation))) {
    const phrase=attachedPhrase(state,row.subject) || [String(row.subject)];
    if(containsSpan(tokens,phrase)) candidates.push({value:row.subject,known:true,length:phrase.length});
  }
  if(!candidates.length) return undefined;
  candidates.sort((a,b)=>Number(b.known)-Number(a.known)||b.length-a.length||stable(a.value).localeCompare(stable(b.value)));
  const top=candidates.filter(x=>x.known===candidates[0].known&&x.length===candidates[0].length);
  const values=unique(top.map(x=>x.value));
  return values.length===1?values[0]:undefined;
}

function resolveQuestion(state, es, seq) {
  const historical=es.slice(0,-1);
  const rows=questionAnswerRows(historical);
  const matches=intentCues(rows).filter(c=>containsSpan(seq.input_tokens,c.tokens));
  if(matches.length) {
    const topLength=matches[0].length;
    const strongest=matches.filter(x=>x.length===topLength);
    const relations=unique(strongest.map(x=>x.relation));
    if(relations.length===1) {
      const relation=relations[0];
      const subject=subjectFromQuery(state,rows,relation,seq.input_tokens);
      if(subject!==undefined) return {subject,relation,cues:strongest.filter(x=>same(x.relation,relation)),rows};
    }
  }

  const byRelation=new Map();
  for(const row of rows) {
    const key=stable(row.relation);
    if(!byRelation.has(key)) byRelation.set(key,[]);
    byRelation.get(key).push(row);
  }
  for(const rs of byRelation.values()) {
    if(rs.length<3||unique(rs.map(x=>x.subject)).length<3) continue;
    const projected=rs.map(x=>({id:x.q.id,output_tokens:Surface.compactTokens(x.q.input_tokens),channels:new Map([[0,x.subject],[1,x.relation]])}));
    const template=Surface.buildTemplate(projected.map(e=>e.output_tokens));
    const match=template&&Surface.matchTemplate(Surface.compactTokens(seq.input_tokens||[]),template);
    if(!template||!match) continue;
    const role=Surface.inferOutputRoles(projected,template).find(r=>r.channel===0);
    if(!role||!match.has(role.slot)) continue;
    const subject=Surface.renderTokens(match.get(role.slot));
    if(subject) return {subject,relation:rs[0].relation,cues:[],rows};
  }
  return null;
}

// Speak using only answer-turn constructions for this relation. Other grounded
// sentences may express the same relation in different syntax, but mixing those
// unrelated construction families destroys variable identity. Dialogue adjacency
// itself tells M which observed assertions functioned as answers.
function renderCanonicalFact(state, es, subject, relation, object) {
  const qa=questionAnswerRows(es);
  const rows=[];
  for(const row of qa) {
    if(!same(row.relation,relation)||!Array.isArray(row.a.input_tokens)) continue;
    rows.push({
      ...row.a,
      channels:new Map([[0,row.subject],[1,row.relation],[2,row.object]]),
      output_tokens:Surface.compactTokens(row.a.input_tokens),
    });
  }
  if(rows.length<3) return null;
  const template=Surface.buildTemplate(rows.map(e=>e.output_tokens));
  if(!template) return null;
  const roles=Surface.inferOutputRoles(rows,template);
  const channels=new Map([[0,subject],[1,relation],[2,object]]);
  const filled=Surface.fillTemplate(template,rows,rows,channels,roles,(_c,v)=>attachedPhrase(state,v));
  if(!filled.tokens||filled.unresolved.length) return null;
  return {tokens:filled.tokens,expression:Surface.renderTokens(filled.tokens),template,roles};
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
  seq.intent_evidence=(resolved.cues||[]).map(c=>({surface:c.text,support:c.support,subject_diversity:c.subject_diversity,sides:c.sides}));
  seq.output_template=rendered.template;
  seq.output_roles=rendered.roles;
  seq.canonical_grounding={subject:resolved.subject,relation:resolved.relation,object:objects[0],source:'M.knowledge.current.facts',authority:'canonical_M',status:'grounded_from_lived_dialogue'};
  return true;
}

module.exports={respond};
