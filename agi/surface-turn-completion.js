'use strict';

// Zero-state completion of recurrent social turn structure.
//
// Some communicative acts are first learned procedurally: one utterance is
// repeatedly followed by another between reversed speaker/addressee roles before
// either utterance has a propositional meaning.  This helper reads that lived
// recurrence from M and may reproduce a uniquely stable reply.  It owns no phrase
// table or dialogue memory and contains no English-specific cue.

const Surface = require('./surface-template.js');
const Dialogue = require('./surface-dialogue.js');

function stable(v){
  if(Array.isArray(v)) return '['+v.map(stable).join(',')+']';
  if(v&&typeof v==='object') return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
  return JSON.stringify(v);
}
function same(a,b){ return stable(a)===stable(b); }
function unique(xs){ const m=new Map(); for(const x of xs||[]) m.set(stable(x),x); return [...m.values()]; }
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
function respond(state,contact){
  if(!contact?.surface||state.current?.sequence?.expression) return false;
  const es=Dialogue.episodes(state); if(es.length<3) return false;
  const current=es.at(-1); if(!current||!Array.isArray(current.input_tokens)) return false;
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

module.exports={respond};
