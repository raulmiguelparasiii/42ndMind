'use strict';

// Zero-state completion of recurrent social turn structure.
//
// Some communicative acts are first learned procedurally: one utterance is
// repeatedly followed by another between reversed speaker/addressee roles before
// either utterance has a propositional meaning. This helper reads that lived
// recurrence from M and may reproduce a uniquely stable reply. It owns no phrase
// table or dialogue memory and contains no English-specific cue.
//
// A second form of recurrence is contextual rather than constant: a surface cue
// can repeatedly ask for the relation that grounded the immediately preceding
// self-action even when that relation differs from case to case. The cue is not
// predeclared. It is induced only after the same surface span and terminal surface
// form recur across at least two different relation types and the observed reply
// re-expresses the preceding action's actual M-owned grounding each time. Answered
// counterexamples remain ordinary evidence too.

const Surface = require('./surface-template.js');
const Dialogue = require('./surface-dialogue.js');

function stable(v){
  if(Array.isArray(v)) return '['+v.map(stable).join(',')+']';
  if(v&&typeof v==='object') return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
  return JSON.stringify(v);
}
function same(a,b){ return stable(a)===stable(b); }
function unique(xs){ const m=new Map(); for(const x of xs||[]) m.set(stable(x),x); return [...m.values()]; }
function semanticRelations(e){
  return (e?.relations||[]).filter(r=>r.source==='simultaneous_relational_contact'||r.source==='self_surface_action_grounding');
}
function direct(e){ return (e?.relations||[]).some(r=>r.source==='simultaneous_relational_contact'); }
function tokenSet(xs){ return new Set(Surface.compactTokens(xs||[]).map(stable)); }
function similarity(a0,b0){
  const a=tokenSet(a0),b=tokenSet(b0); if(!a.size&&!b.size) return 1;
  let hit=0; for(const x of a) if(b.has(x)) hit++;
  return hit/Math.max(1,a.size+b.size-hit);
}
function reversed(a,b){
  return a.source!==undefined&&a.target!==undefined&&b.source!==undefined&&b.target!==undefined&&
    same(a.source,b.target)&&same(a.target,b.source);
}
function lexical(token){ return /[\p{L}\p{N}]/u.test(String(token)); }
function spans(tokens,maxLength=3){
  const compact=Surface.compactTokens(tokens||[]),out=[],seen=new Set();
  for(let start=0;start<compact.length;start++){
    if(!lexical(compact[start])) continue;
    for(let length=1;length<=maxLength&&start+length<=compact.length;length++){
      const part=compact.slice(start,start+length); if(part.some(x=>!lexical(x))) break;
      const key=stable(part); if(seen.has(key)) continue; seen.add(key);
      out.push({key,tokens:part,length});
    }
  }
  return out;
}
function compact(tokens){ return Surface.compactTokens(tokens||[]); }
function terminalSurface(tokens){
  const xs=compact(tokens);
  return xs.length ? xs.at(-1) : undefined;
}
function containsSpan(tokens,phrase){
  const input=compact(tokens),p=compact(phrase);
  if(!p.length||p.length>input.length) return false;
  outer: for(let i=0;i+p.length<=input.length;i++){
    for(let j=0;j<p.length;j++) if(!same(input[i+j],p[j])) continue outer;
    return true;
  }
  return false;
}
function sameRelation(a,b){
  return !!a&&!!b&&same(a.subject,b.subject)&&same(a.relation,b.relation)&&same(a.object,b.object);
}
function rowKey(row){ return `${String(row.q.id)}|${String(row.a.id)}`; }

// Learn a deictic/contextual surface role from ordinary lived conversation. The
// relation itself is deliberately allowed to vary. What must recur is structural:
// a question follows one of this individual's grounded utterances, contains the
// same surface span, has the same terminal surface form, and the observed answer
// re-expresses the relation that had actually grounded that preceding utterance.
// Requiring relation-type diversity prevents an ordinary fixed-predicate question
// from being misread as contextual.
//
// The terminal form is learned as part of the recurrence rather than interpreted.
// In a text modality punctuation can therefore become discriminative because life
// made it discriminative; no token is assigned a built-in "question" meaning.
// Positive recurrence alone is still insufficient: an answered exchange with the
// same span AND terminal but a different structure is direct counterevidence.
function contextualRelationCues(es){
  const rows=Dialogue.questionAnswerRows(es);
  const positions=new Map(es.map((e,i)=>[String(e.id),i]));
  const evidence=new Map();
  for(const row of rows){
    const at=positions.get(String(row.q.id));
    if(!Number.isInteger(at)||at<=0) continue;
    const prior=es[at-1];
    if(!prior?.lived_self_action||!reversed(prior,row.q)) continue;
    const priorRelations=semanticRelations(prior);
    if(priorRelations.length!==1) continue;
    const previous=priorRelations[0];
    const answered={subject:row.subject,relation:row.relation,object:row.object};
    if(!sameRelation(previous,answered)) continue;
    const terminal=terminalSurface(row.q.input_tokens);
    for(const span of spans(row.q.input_tokens)){
      const key=stable([span.tokens,terminal]);
      if(!evidence.has(key)) evidence.set(key,{tokens:span.tokens,length:span.length,terminal,examples:[]});
      evidence.get(key).examples.push({row,previous});
    }
  }

  const cues=[];
  for(const e of evidence.values()){
    const examples=e.examples;
    const triples=unique(examples.map(x=>[x.previous.subject,x.previous.relation,x.previous.object]));
    const predicates=unique(examples.map(x=>x.previous.relation));
    if(examples.length<2||triples.length<2||predicates.length<2) continue;

    const positive=new Set(examples.map(x=>rowKey(x.row)));
    const answeredExposures=rows.filter(row=>same(terminalSurface(row.q.input_tokens),e.terminal)&&containsSpan(row.q.input_tokens,e.tokens));
    const counterexamples=answeredExposures.filter(row=>!positive.has(rowKey(row)));
    if(counterexamples.length) continue;

    cues.push({
      ...e,
      support:examples.length,
      triple_diversity:triples.length,
      predicate_diversity:predicates.length,
      answered_exposures:answeredExposures.length,
    });
  }
  return cues.sort((a,b)=>b.length-a.length||b.predicate_diversity-a.predicate_diversity||b.support-a.support||stable(a.tokens).localeCompare(stable(b.tokens)));
}

function contextualRelationReply(state,es,current){
  if(es.length<3||!Array.isArray(current?.input_tokens)) return false;
  const historical=es.slice(0,-1);
  const terminal=terminalSurface(current.input_tokens);
  const cues=contextualRelationCues(historical).filter(c=>same(c.terminal,terminal)&&containsSpan(current.input_tokens,c.tokens));
  if(!cues.length) return false;
  const bestLength=cues[0].length;
  const strongest=cues.filter(c=>c.length===bestLength);
  const previous=historical.at(-1);
  if(!previous?.lived_self_action||!reversed(previous,current)) return false;
  const relations=semanticRelations(previous);
  if(relations.length!==1) return false;
  const r=relations[0];

  // The historical self-action already identifies the exact support object. Check
  // that this relation remains represented in M before speaking; contextual
  // language learning never upgrades a stale or absent relation by itself.
  const present=Dialogue.currentObjects(state,r.subject,r.relation);
  if(!present.objects.some(x=>same(x,r.object))) return false;
  const rendered=Dialogue.renderCanonicalFact(state,es,r.subject,r.relation,r.object,current);
  if(!rendered) return false;

  const seq=state.current?.sequence; if(!seq||seq.expression) return false;
  seq.output_tokens=rendered.tokens;
  seq.expression=rendered.expression;
  seq.unresolved_output_positions=[];
  seq.contextual_relation_induction=true;
  seq.contextual_relation_evidence=strongest.map(c=>({surface:Surface.renderTokens(c.tokens),terminal:c.terminal,support:c.support,predicate_diversity:c.predicate_diversity,triple_diversity:c.triple_diversity,answered_exposures:c.answered_exposures}));
  seq.output_template=rendered.template;
  seq.output_roles=rendered.roles;
  seq.canonical_grounding={subject:r.subject,relation:r.relation,object:r.object,source:present.epistemic_status==='current_fact'?'M.knowledge.current.facts':'M.sourced_claims',authority:'canonical_M',status:present.epistemic_status};
  return true;
}

function respond(state,contact){
  if(!contact?.surface||state.current?.sequence?.expression) return false;
  const es=Dialogue.episodes(state); if(es.length<3) return false;
  const current=es.at(-1); if(!current||!Array.isArray(current.input_tokens)) return false;

  // Context-dependent recurrence is checked before constant turn completion, but
  // only after SurfaceDialogue has already declined the turn. Thus ordinary
  // learned fixed-predicate questions retain their existing path.
  if(contextualRelationReply(state,es,current)) return true;

  const pairs=[];
  for(let i=0;i+1<es.length-1;i++){
    const a=es[i],b=es[i+1];
    if(!Array.isArray(a.input_tokens)||!Array.isArray(b.input_tokens)||direct(a)||direct(b)||!reversed(a,b)) continue;
    const score=similarity(current.input_tokens,a.input_tokens);
    if(score>0) pairs.push({a,b,score});
  }
  if(!pairs.length) return false;
  pairs.sort((a,b)=>b.score-a.score);
  const best=pairs[0].score;
  if(best<0.45) return false;
  const near=pairs.filter(x=>x.score>=Math.max(0.45,best-0.12));
  const speakers=unique(near.map(x=>x.a.source));
  if(near.length<3||speakers.length<3) return false;
  const replies=unique(near.map(x=>Surface.compactTokens(x.b.input_tokens)));
  if(replies.length!==1) return false;
  const tokens=replies[0];
  state.current.sequence.output_tokens=tokens;
  state.current.sequence.expression=Surface.renderTokens(tokens);
  state.current.sequence.lived_turn_completion=true;
  state.current.sequence.turn_support=near.length;
  state.current.sequence.turn_speaker_diversity=speakers.length;
  return true;
}

module.exports={respond,contextualRelationCues};
