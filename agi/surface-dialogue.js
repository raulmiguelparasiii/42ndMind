'use strict';

// Zero-state dialogue over the same canonical M.
//
// This module owns no parser, lexicon, response table, world model, or dialogue
// memory. It reads retained lived surface episodes, agency facts, canonical facts,
// and sourced claims. Meaning is induced from stable relations in experience.
// Question intent, reference, and answer expression are all recovered from that
// same lived structure; no surface.output answer fixture is required.

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
  const out=[], seen=new Set();
  for(let start=0;start<compact.length;start++) {
    if(!lexical(compact[start])) continue;
    for(let length=1;length<=maxLength&&start+length<=compact.length;length++) {
      const part=compact.slice(start,start+length);
      if(part.some(x=>!lexical(x))) break;
      const key=stable(part); if(seen.has(key)) continue; seen.add(key);
      out.push({key,tokens:part,text:Surface.renderTokens(part),length});
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
function tokenSimilarity(a0,b0) {
  const a=new Set(Surface.compactTokens(a0||[]).map(stable));
  const b=new Set(Surface.compactTokens(b0||[]).map(stable));
  if(!a.size&&!b.size) return 1;
  let hit=0; for(const x of a) if(b.has(x)) hit++;
  return hit/Math.max(1,a.size+b.size-hit);
}
function claimObjects(state, subject, relation) {
  const by=new Map();
  for(const f of state.knowledge?.facts||[]) {
    const id=String(f.subject);
    if(!by.has(id)) by.set(id,{});
    const row=by.get(id);
    if(f.relation==='ρ:kind'&&f.object==='sourced_claim_occurrence') row.kind=true;
    else if(f.relation==='ρ:epistemic_status') row.status=f.object;
    else if(f.relation==='ρ:claim_subject') row.subject=f.object;
    else if(f.relation==='ρ:claim_relation') row.relation=f.object;
    else if(f.relation==='ρ:claim_object') row.object=f.object;
  }
  return unique([...by.values()].filter(x=>x.kind&&x.status==='claim_with_provenance'&&same(x.subject,subject)&&same(x.relation,relation)).map(x=>x.object));
}
function currentObjects(state, subject, relation) {
  const actual=unique((state.knowledge?.current?.facts || [])
    .filter(f => same(f.subject,subject) && same(f.relation,relation)).map(f=>f.object));
  if(actual.length) return {objects:actual, epistemic_status:'current_fact'};
  const claimed=claimObjects(state,subject,relation);
  return {objects:claimed, epistemic_status:claimed.length?'remembered_claim':'unknown'};
}
function attachedPhrase(state, value) {
  const rows=(state.knowledge?.facts||[])
    .filter(f=>same(f.subject,value)&&f.relation==='ρ:surface_expression'&&f.object&&Array.isArray(f.object.tokens))
    .sort((a,b)=>episodeNumber(a.object.source_episode)-episodeNumber(b.object.source_episode));
  if (!rows.length) return undefined;
  const variants=unique(rows.map(f=>f.object.tokens));
  return variants.length===1 ? variants[0] : rows.at(-1).object.tokens;
}
function conversationalReply(q,a) {
  if(q.source===undefined||q.target===undefined||a.source===undefined||a.target===undefined) return false;
  return same(q.source,a.target)&&same(q.target,a.source);
}
function questionAnswerRows(es) {
  const rows=[];
  for(let i=0;i+1<es.length;i++) {
    const q=es[i], a=es[i+1];
    const qr=contactRelations(q), ar=contactRelations(a);
    if(!Array.isArray(q.input_tokens)||qr.length!==0||ar.length!==1||!conversationalReply(q,a)) continue;
    const r=ar[0];
    rows.push({q,a,subject:r.subject,relation:r.relation,object:r.object});
  }
  return rows;
}
function intentCues(rows) {
  const evidence=new Map();
  function add(row,tokens,side) {
    for(const span of spans(tokens)) {
      if(!evidence.has(span.key)) evidence.set(span.key,{tokens:span.tokens,text:span.text,length:span.length,rows:new Map(),sides:new Set()});
      const e=evidence.get(span.key);
      e.rows.set(`${row.q.id}|${row.a.id}`,row); e.sides.add(side);
    }
  }
  for(const row of rows) { add(row,row.q.input_tokens,'question'); add(row,row.a.input_tokens,'grounded_assertion'); }
  const cues=[];
  for(const e of evidence.values()) {
    const rs=[...e.rows.values()], relations=unique(rs.map(x=>x.relation)), subjects=unique(rs.map(x=>x.subject));
    // Two independent subjects are sufficient when the phrase is contrastively
    // unique across every observed dialogue relation. More exposure strengthens it.
    if(relations.length!==1||rs.length<2||subjects.length<2) continue;
    cues.push({...e,rows:rs,relation:relations[0],support:rs.length,subject_diversity:subjects.length,sides:[...e.sides].sort()});
  }
  cues.sort((a,b)=>b.length-a.length||b.subject_diversity-a.subject_diversity||b.support-a.support||a.text.localeCompare(b.text));
  return cues;
}
function deicticCues(rows) {
  const evidence=new Map();
  for(const row of rows) {
    let role=null;
    if(row.q.source!==undefined&&same(row.subject,row.q.source)) role='source';
    else if(row.q.target!==undefined&&same(row.subject,row.q.target)) role='target';
    if(!role) continue;
    for(const span of spans(row.q.input_tokens)) {
      if(!evidence.has(span.key)) evidence.set(span.key,{tokens:span.tokens,text:span.text,length:span.length,rows:[]});
      evidence.get(span.key).rows.push({row,role});
    }
  }
  const out=[];
  for(const e of evidence.values()) {
    const roles=unique(e.rows.map(x=>x.role)), subjects=unique(e.rows.map(x=>x.row.subject));
    if(roles.length!==1||e.rows.length<3||subjects.length<3) continue;
    out.push({...e,role:roles[0],support:e.rows.length,subject_diversity:subjects.length});
  }
  return out.sort((a,b)=>b.length-a.length||b.subject_diversity-a.subject_diversity||b.support-a.support);
}
function deicticSubject(rows,currentEpisode,tokens) {
  const matches=deicticCues(rows).filter(c=>containsSpan(tokens,c.tokens));
  if(!matches.length) return undefined;
  const max=matches[0].length, strongest=matches.filter(x=>x.length===max);
  const roles=unique(strongest.map(x=>x.role)); if(roles.length!==1) return undefined;
  const role=roles[0];
  return role==='source'?currentEpisode?.source:role==='target'?currentEpisode?.target:undefined;
}
function explicitSubject(state, rows, relation, tokens) {
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
  candidates.sort((a,b)=>b.length-a.length||Number(b.known)-Number(a.known)||stable(a.value).localeCompare(stable(b.value)));
  const top=candidates.filter(x=>x.length===candidates[0].length);
  const values=unique(top.map(x=>x.value));
  return values.length===1?values[0]:undefined;
}
function subjectFromQuery(state, rows, relation, tokens, currentEpisode) {
  const explicit=explicitSubject(state,rows,relation,tokens);
  if(explicit!==undefined) return explicit;
  return deicticSubject(rows,currentEpisode,tokens);
}
function resolveQuestion(state, es, seq) {
  const currentEpisode=es.at(-1), historical=es.slice(0,-1), rows=questionAnswerRows(historical);
  const matches=intentCues(rows).filter(c=>containsSpan(seq.input_tokens,c.tokens));
  if(matches.length) {
    const topLength=matches[0].length, strongest=matches.filter(x=>x.length===topLength), relations=unique(strongest.map(x=>x.relation));
    if(relations.length===1) {
      const relation=relations[0], subject=subjectFromQuery(state,rows,relation,seq.input_tokens,currentEpisode);
      if(subject!==undefined) return {subject,relation,cues:strongest.filter(x=>same(x.relation,relation)),rows,currentEpisode};
    }
  }

  const byRelation=new Map();
  for(const row of rows) { const key=stable(row.relation); if(!byRelation.has(key)) byRelation.set(key,[]); byRelation.get(key).push(row); }
  for(const rs of byRelation.values()) {
    if(rs.length<3||unique(rs.map(x=>x.subject)).length<3) continue;
    const projected=rs.map(x=>({id:x.q.id,output_tokens:Surface.compactTokens(x.q.input_tokens),channels:new Map([[0,x.subject],[1,x.relation]])}));
    const template=Surface.buildTemplate(projected.map(e=>e.output_tokens));
    const match=template&&Surface.matchTemplate(Surface.compactTokens(seq.input_tokens||[]),template);
    if(!template||!match) continue;
    const role=Surface.inferOutputRoles(projected,template).find(r=>r.channel===0);
    if(!role||!match.has(role.slot)) continue;
    const subject=Surface.renderTokens(match.get(role.slot));
    if(subject) return {subject,relation:rs[0].relation,cues:[],rows,currentEpisode};
  }
  return null;
}
function implicitArgumentRole(rows, key) {
  if(rows.every(row=>row.a.target!==undefined&&same(row[key],row.a.target))) return 'answer_target';
  if(rows.every(row=>row.a.source!==undefined&&same(row[key],row.a.source))) return 'answer_source';
  return null;
}
function coherentAnswerFamilies(rows) {
  const families=[];
  for(const seed of rows) {
    const ranked=rows.map(row=>({row,score:tokenSimilarity(seed.a.input_tokens,row.a.input_tokens)}))
      .sort((a,b)=>b.score-a.score||episodeNumber(b.row.a.id)-episodeNumber(a.row.a.id));
    const family=ranked.filter(x=>x.score>=0.45).map(x=>x.row);
    const key=family.map(x=>x.a.id).sort().join('|');
    if(family.length>=2&&!families.some(x=>x.key===key)) families.push({key,rows:family});
  }
  return families.sort((a,b)=>b.rows.length-a.rows.length);
}
function renderCanonicalFact(state, es, subject, relation, object, currentEpisode) {
  const qa=questionAnswerRows(es), relationRows=qa.filter(row=>same(row.relation,relation)&&Array.isArray(row.a.input_tokens));
  if(relationRows.length<2) return null;
  const candidates=[];
  for(const family of coherentAnswerFamilies(relationRows)) {
    const rows=family.rows;
    const implicitSubject=implicitArgumentRole(rows,'subject');
    const implicitObject=implicitArgumentRole(rows,'object');
    if(implicitSubject&&currentEpisode) {
      const expected=implicitSubject==='answer_target'?currentEpisode.source:currentEpisode.target;
      if(expected===undefined||!same(subject,expected)) continue;
    }
    if(implicitObject&&currentEpisode) {
      const expected=implicitObject==='answer_target'?currentEpisode.source:currentEpisode.target;
      if(expected===undefined||!same(object,expected)) continue;
    }
    const projected=rows.map(row=>{
      const channels=new Map();
      if(!implicitSubject) channels.set(0,row.subject);
      if(!implicitObject) channels.set(2,row.object);
      return {...row.a,channels,output_tokens:Surface.compactTokens(row.a.input_tokens)};
    });
    const template=Surface.buildTemplate(projected.map(e=>e.output_tokens)); if(!template) continue;
    const roles=Surface.inferOutputRoles(projected,template);
    const channels=new Map([[0,subject],[2,object]]);
    const filled=Surface.fillTemplate(template,projected,projected,channels,roles,(_c,v)=>attachedPhrase(state,v));
    if(!filled.tokens||filled.unresolved.length) continue;
    candidates.push({tokens:filled.tokens,expression:Surface.renderTokens(filled.tokens),template,roles,support:rows.length,implicit_subject:implicitSubject,implicit_object:implicitObject});
  }
  candidates.sort((a,b)=>b.support-a.support||a.expression.length-b.expression.length);
  return candidates[0]||null;
}

// Expression transport may use one uniquely current canonical relation already
// selected by the live relational calculation. It does not choose what the mind
// is about: query matches and referential cues were derived upstream from M and
// the present contact. Ambiguity remains unexpressed rather than being resolved
// here by another dialogue authority.
function liveFieldFact(field) {
  if(!field||field.authority!=='derived_zero_state') return null;
  const candidates=unique([...(field.query_matches||[]),...(field.referential_cues||[])]
    .filter(f=>f&&Object.prototype.hasOwnProperty.call(f,'subject')&&
      Object.prototype.hasOwnProperty.call(f,'relation')&&Object.prototype.hasOwnProperty.call(f,'object'))
    .map(f=>({subject:f.subject,relation:f.relation,object:f.object})));
  return candidates.length===1?candidates[0]:null;
}
function applyRendered(seq, rendered, grounding, extras={}) {
  seq.output_tokens=rendered.tokens;
  seq.expression=rendered.expression;
  seq.unresolved_output_positions=[];
  seq.output_template=rendered.template;
  seq.output_roles=rendered.roles;
  seq.canonical_grounding=grounding;
  Object.assign(seq,extras);
}
function respond(state, originalContact, field=null) {
  if(!originalContact||typeof originalContact!=='object'||!originalContact.surface) return false;
  if(originalContact.surface.output!==undefined&&originalContact.surface.output!==null) return false;
  const seq=state.current?.sequence; if(!seq||!Array.isArray(seq.input_tokens)||seq.expression) return false;
  const es=episodes(state); if(es.length<2) return false;
  const currentEpisode=es.at(-1);

  const live=liveFieldFact(field);
  if(live) {
    const rendered=renderCanonicalFact(state,es,live.subject,live.relation,live.object,currentEpisode);
    if(rendered) {
      applyRendered(seq,rendered,{
        subject:live.subject,relation:live.relation,object:live.object,
        source:'live_relational_field',authority:'canonical_M',status:'current_fact',
      },{live_relational_expression:true});
      return true;
    }
  }

  // Transitional fallback for contacts whose live relational interpretation is
  // not yet available. This preserves learned language ability while keeping it
  // downstream of the live-field route whenever that route is determinate.
  const resolved=resolveQuestion(state,es,seq); if(!resolved) return false;
  const found=currentObjects(state,resolved.subject,resolved.relation); if(found.objects.length!==1) return false;
  const rendered=renderCanonicalFact(state,es,resolved.subject,resolved.relation,found.objects[0],resolved.currentEpisode); if(!rendered) return false;
  applyRendered(seq,rendered,{
    subject:resolved.subject,relation:resolved.relation,object:found.objects[0],
    source:found.epistemic_status==='current_fact'?'M.knowledge.current.facts':'M.sourced_claims',
    authority:'canonical_M',status:found.epistemic_status,
  },{
    dialogue_induction:true,
    intent_evidence:(resolved.cues||[]).map(c=>({surface:c.text,support:c.support,subject_diversity:c.subject_diversity,sides:c.sides})),
  });
  return true;
}

module.exports={respond,episodes,questionAnswerRows,resolveQuestion,renderCanonicalFact,currentObjects,intentCues,deicticCues,liveFieldFact};
