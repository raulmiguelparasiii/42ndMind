'use strict';

// Zero-state social grounding over canonical M.
//
// A surface assertion may omit one participant because language can refer to the
// speaker or addressee implicitly (deixis).  We do not encode any pronoun.  Across
// grounded lived examples we ask only whether a relational argument repeatedly
// equals the actual source/target of the utterance or a varying surface slot.
// Later raw sourced utterances may therefore become claims-with-provenance.  This
// helper owns no dictionary, parser, truth ledger, or persistent state.

const Surface = require('./surface-template.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a,b){ return stable(a)===stable(b); }
function unique(xs){ const m=new Map(); for(const x of xs||[]) m.set(stable(x),x); return [...m.values()]; }
function episodeNumber(id){ const n=Number(String(id).split(':').at(-1)); return Number.isFinite(n)?n:-1; }
function compact(tokens){ return Surface.compactTokens(tokens||[]); }
function tokenSet(xs){ return new Set(compact(xs).map(stable)); }
function similarity(a0,b0){
  const a=tokenSet(a0), b=tokenSet(b0); if(!a.size&&!b.size) return 1;
  let hit=0; for(const x of a) if(b.has(x)) hit++;
  return hit/Math.max(1,a.size+b.size-hit);
}
function episodes(state){
  const groups=new Map();
  for(const f of state.knowledge?.facts||[]){
    if(typeof f.subject!=='string'||!f.subject.startsWith('sequence-contact:')) continue;
    if(!groups.has(f.subject)) groups.set(f.subject,{id:f.subject,relations:[]});
    const e=groups.get(f.subject);
    if(f.relation==='ρ:input_tokens'&&Array.isArray(f.object)) e.input_tokens=f.object.slice();
    else if(f.relation==='ρ:input_raw') e.input_raw=String(f.object);
    else if(f.relation==='ρ:surface_source') e.source=f.object;
    else if(f.relation==='ρ:surface_target') e.target=f.object;
    else if(f.relation==='ρ:contact_relation'&&f.object&&typeof f.object==='object'&&
      Object.prototype.hasOwnProperty.call(f.object,'subject')&&Object.prototype.hasOwnProperty.call(f.object,'relation')&&Object.prototype.hasOwnProperty.call(f.object,'object'))
      e.relations.push({...f.object});
  }
  return [...groups.values()].sort((a,b)=>episodeNumber(a.id)-episodeNumber(b.id));
}
function directRelations(e){ return (e?.relations||[]).filter(r=>r.source==='simultaneous_relational_contact'); }
function resolver(rows,template,channel){
  if(rows.every(r=>r.episode.source!==undefined&&same(r.triple[channel],r.episode.source))) return {kind:'source'};
  if(rows.every(r=>r.episode.target!==undefined&&same(r.triple[channel],r.episode.target))) return {kind:'target'};
  const projected=rows.map(r=>({output_tokens:compact(r.episode.input_tokens),channels:new Map([[0,r.triple.subject],[1,r.triple.relation],[2,r.triple.object]])}));
  const role=Surface.inferOutputRoles(projected,template).find(x=>x.channel===(channel==='subject'?0:2));
  return role?{kind:'slot',slot:role.slot}:null;
}
function valueFrom(resolver,current,match){
  if(!resolver) return undefined;
  if(resolver.kind==='source') return current.source;
  if(resolver.kind==='target') return current.target;
  if(resolver.kind==='slot'&&match.has(resolver.slot)) {
    const tokens=match.get(resolver.slot);
    return tokens.length===1?tokens[0]:Surface.renderTokens(tokens);
  }
  return undefined;
}
function inferredClaim(state,contact){
  const es=episodes(state); if(es.length<4) return null;
  const current=es.at(-1); if(!current||!Array.isArray(current.input_tokens)) return null;
  if(current.source===undefined&&contact?.surface?.source!==undefined) current.source=contact.surface.source;
  if(current.target===undefined&&contact?.surface?.target!==undefined) current.target=contact.surface.target;
  const historical=[];
  for(const e of es.slice(0,-1)){
    const rs=directRelations(e);
    if(rs.length===1&&Array.isArray(e.input_tokens)) historical.push({episode:e,triple:rs[0]});
  }
  const groups=new Map();
  for(const row of historical){ const key=stable(row.triple.relation); if(!groups.has(key)) groups.set(key,[]); groups.get(key).push(row); }
  const candidates=[];
  for(const rows0 of groups.values()){
    const ranked=rows0.map(row=>({...row,score:similarity(current.input_tokens,row.episode.input_tokens)}))
      .sort((a,b)=>b.score-a.score||episodeNumber(b.episode.id)-episodeNumber(a.episode.id));
    if((ranked[0]?.score??0)<0.2) continue;
    const near=ranked.filter(x=>x.score>=Math.max(0.2,ranked[0].score-0.18)).slice(0,24);
    if(near.length<3) continue;
    const template=Surface.buildTemplate(near.map(x=>compact(x.episode.input_tokens)));
    const match=template&&Surface.matchTemplate(compact(current.input_tokens),template);
    if(!template||!match) continue;
    const subjectResolver=resolver(near,template,'subject');
    const objectResolver=resolver(near,template,'object');
    if(!subjectResolver||!objectResolver) continue;
    const subject=valueFrom(subjectResolver,current,match), object=valueFrom(objectResolver,current,match);
    if(subject===undefined||object===undefined) continue;
    candidates.push({
      subject, relation:near[0].triple.relation, object,
      support:near.length,
      score:near.reduce((s,x)=>s+x.score,0)/near.length,
      subject_role:subjectResolver.kind,
      object_role:objectResolver.kind,
      support_episodes:near.map(x=>x.episode.id),
    });
  }
  candidates.sort((a,b)=>b.score-a.score||b.support-a.support||stable(a.relation).localeCompare(stable(b.relation)));
  if(!candidates.length) return null;
  const top=candidates.filter(x=>Math.abs(x.score-candidates[0].score)<1e-9&&x.support===candidates[0].support);
  const triples=unique(top.map(x=>({subject:x.subject,relation:x.relation,object:x.object})));
  if(triples.length!==1) return null;
  return top[0];
}
function relationalUpdate(state,contact){
  if(!contact?.surface||contact.surface.source===undefined||contact.surface.source===null) return null;
  const learned=inferredClaim(state,contact); if(!learned) return null;
  const es=episodes(state), episode=es.at(-1); if(!episode) return null;
  const existing=(state.knowledge?.facts||[]).some(f=>f.relation==='ρ:source_episode'&&f.object?.ref===episode.id&&String(f.subject).startsWith('social-claim:'));
  if(existing) return null;
  const claimId=`social-claim:${episode.id}`;
  return {relations:{facts:[
    [claimId,'ρ:kind','sourced_claim_occurrence'],
    [claimId,'ρ:epistemic_status','claim_with_provenance'],
    [claimId,'ρ:claim_subject',learned.subject],
    [claimId,'ρ:claim_relation',learned.relation],
    [claimId,'ρ:claim_object',learned.object],
    [claimId,'ρ:claimed_by',contact.surface.source],
    [claimId,'ρ:source_episode',{ref:episode.id}],
    [claimId,'ρ:induction_support',{support:learned.support,score:learned.score,subject_role:learned.subject_role,object_role:learned.object_role,support_episodes:learned.support_episodes}],
    [episode.id,'ρ:expressed_claim',{ref:claimId}],
    ['self','ρ:encountered_claim',{ref:claimId}],
  ]}};
}

module.exports={relationalUpdate};
