'use strict';

// Zero-state social grounding over canonical M.
//
// A surface assertion may omit one participant because language can refer to the
// speaker or addressee implicitly. We encode no pronoun. Across grounded lived
// examples we ask whether a relational argument repeatedly equals the actual
// source/target of the utterance or a varying surface slot. Because raw experience
// is retained, stronger later grounding may also reinterpret an earlier utterance
// that was not understood when first heard. Resulting content remains sourced
// testimony, not automatically world actuality.

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
function channelIndex(channel){ return channel==='subject'?0:2; }
function resolver(rows,template,channel){
  if(rows.every(r=>r.episode.source!==undefined&&same(r.triple[channel],r.episode.source))) return {kind:'source'};
  if(rows.every(r=>r.episode.target!==undefined&&same(r.triple[channel],r.episode.target))) return {kind:'target'};
  const index=channelIndex(channel);
  const projected=rows.map(r=>({output_tokens:compact(r.episode.input_tokens),channels:new Map([[index,r.triple[channel]]])}));
  const role=Surface.inferOutputRoles(projected,template).find(x=>x.channel===index);
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
function groundedRows(es,excludeId){
  const out=[];
  for(const e of es){
    if(e.id===excludeId) continue;
    const rs=directRelations(e);
    if(rs.length===1&&Array.isArray(e.input_tokens)) out.push({episode:e,triple:rs[0]});
  }
  return out;
}

// Do not collapse unrelated phrasings into one universal variable template.  A
// construction family must be recurrently similar in its own surface form before
// it can explain a new utterance.  This is what prevents a later "hello" from
// being treated as a one-slot instance of "I'm <name>" merely because both are
// short utterances by speakers.
function coherentFamilies(rows,currentTokens){
  const families=[];
  for(const seed of rows){
    const members=rows.map(row=>({row,score:similarity(seed.episode.input_tokens,row.episode.input_tokens)}))
      .filter(x=>x.score>=0.42)
      .sort((a,b)=>b.score-a.score||episodeNumber(b.row.episode.id)-episodeNumber(a.row.episode.id));
    const subjects=unique(members.map(x=>x.row.episode.source));
    if(members.length<2||subjects.length<2) continue;
    const key=members.map(x=>x.row.episode.id).sort().join('|');
    if(families.some(x=>x.key===key)) continue;
    const currentScore=similarity(currentTokens,seed.episode.input_tokens);
    families.push({key,rows:members.map(x=>x.row),currentScore});
  }
  return families.sort((a,b)=>b.currentScore-a.currentScore||b.rows.length-a.rows.length);
}
function inferForEpisode(es,current){
  if(!current||!Array.isArray(current.input_tokens)||current.source===undefined) return null;
  if(directRelations(current).length) return null;
  const historical=groundedRows(es,current.id), groups=new Map();
  for(const row of historical){ const key=stable(row.triple.relation); if(!groups.has(key)) groups.set(key,[]); groups.get(key).push(row); }
  const candidates=[];
  for(const rows0 of groups.values()){
    for(const family of coherentFamilies(rows0,current.input_tokens)){
      if(family.currentScore<0.42) continue;
      const rows=family.rows;
      const template=Surface.buildTemplate(rows.map(x=>compact(x.episode.input_tokens)));
      const match=template&&Surface.matchTemplate(compact(current.input_tokens),template);
      if(!template||!match) continue;
      const subjectResolver=resolver(rows,template,'subject'), objectResolver=resolver(rows,template,'object');
      if(!subjectResolver||!objectResolver) continue;
      const subject=valueFrom(subjectResolver,current,match), object=valueFrom(objectResolver,current,match);
      if(subject===undefined||object===undefined) continue;
      const rowScores=rows.map(x=>similarity(current.input_tokens,x.episode.input_tokens));
      const score=rowScores.reduce((s,x)=>s+x,0)/rowScores.length;
      candidates.push({subject,relation:rows[0].triple.relation,object,support:rows.length,score,
        subject_role:subjectResolver.kind,object_role:objectResolver.kind,support_episodes:rows.map(x=>x.episode.id)});
    }
  }
  candidates.sort((a,b)=>(b.score*b.support)-(a.score*a.support)||b.score-a.score||b.support-a.support||stable(a.relation).localeCompare(stable(b.relation)));
  if(!candidates.length) return null;
  const best=candidates[0], bestWeight=best.score*best.support;
  const peers=candidates.filter(x=>Math.abs(x.score*x.support-bestWeight)<1e-9);
  const triples=unique(peers.map(x=>({subject:x.subject,relation:x.relation,object:x.object})));
  return triples.length===1?best:null;
}
function claimedEpisodes(state){
  const ids=new Set();
  for(const f of state.knowledge?.facts||[])
    if(f.relation==='ρ:source_episode'&&f.object?.ref!==undefined&&String(f.subject).startsWith('social-claim:')) ids.add(String(f.object.ref));
  return ids;
}
function claimFacts(episode,learned){
  const claimId=`social-claim:${episode.id}`;
  return [
    [claimId,'ρ:kind','sourced_claim_occurrence'],
    [claimId,'ρ:epistemic_status','claim_with_provenance'],
    [claimId,'ρ:claim_subject',learned.subject],
    [claimId,'ρ:claim_relation',learned.relation],
    [claimId,'ρ:claim_object',learned.object],
    [claimId,'ρ:claimed_by',episode.source],
    [claimId,'ρ:source_episode',{ref:episode.id}],
    [claimId,'ρ:induction_support',{support:learned.support,score:learned.score,weight:learned.support*learned.score,subject_role:learned.subject_role,object_role:learned.object_role,support_episodes:learned.support_episodes,retrospective:true}],
    [episode.id,'ρ:expressed_claim',{ref:claimId}],
    ['self','ρ:encountered_claim',{ref:claimId}],
  ];
}
function relationalUpdate(state,contact){
  if(!contact?.surface) return null;
  const es=episodes(state); if(es.length<4) return null;
  const claimed=claimedEpisodes(state), facts=[];
  for(const episode of es.slice(-96).reverse()){
    if(claimed.has(episode.id)||episode.source===undefined||directRelations(episode).length) continue;
    const learned=inferForEpisode(es,episode); if(!learned) continue;
    facts.push(...claimFacts(episode,learned)); claimed.add(episode.id);
  }
  return facts.length?{relations:{facts}}:null;
}

module.exports={relationalUpdate};
