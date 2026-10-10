'use strict';

const fs = require('fs');
const Mind = require('../../one-mind.js');

const WORD = Object.freeze({ cat: 101, dog: 102, fox: 103, cup: 104 });
const OBJECTS = Object.freeze({ cat: [1,1], dog: [1,2], fox: [2,1], cup: [2,2] });
const CORRECT = Object.freeze({ cat:'cat', dog:'dog', fox:'fox', cup:'cup' });
function frame(word, object, context) { return [WORD[word], ...OBJECTS[object], context, 0]; }
function contact(m, word, object, context) { Mind.C(m, frame(word, object, context)); }
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/0x100000000;};}
function shuffledWords(seed){
  const random=rng(seed), words=['cat','dog','fox','cup'];
  for(let i=words.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[words[i],words[j]]=[words[j],words[i]];}
  return words;
}
function cycle(m,mapping,rounds,start=0){
  for(let r=0;r<rounds;r++){
    const words=shuffledWords((start+1)*4099+r*7919);
    for(let i=0;i<words.length;i++){
      const word=words[i];
      contact(m,word,mapping[word],(start*3+r*5+i*2+(r%3))%11);
    }
  }
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function atomSatisfied(values, atom){
  return Object.prototype.hasOwnProperty.call(values, atom.feature) && same(values[atom.feature], atom.value);
}

const learner=Mind.one(1,1);
cycle(learner,CORRECT,16,100);
const ambiguous=structuredClone(learner);
Mind.C(ambiguous,[null,1,null,null,0]);
const inferred=new Set(ambiguous.current.inferred);

function routesFor(target) {
  return ambiguous.structure.patterns
    .filter(p=>p.active!==false && p.target===target)
    .map(p=>({
      id:p.id,
      expected:p.expected,
      support:p.support,
      exceptions:p.exceptions,
      covered:p.covered,
      eligible:p.eligible,
      reliability:p.reliability,
      predictive_code_bits:p.predictive_code_bits,
      dependency_count:p.dependency_count,
      conditions:p.conditions.map(a=>({
        ...a,
        observed:Object.prototype.hasOwnProperty.call(ambiguous.current.observed,a.feature),
        inferred:inferred.has(a.feature),
        final_value:Object.prototype.hasOwnProperty.call(ambiguous.current.completed,a.feature)
          ? ambiguous.current.completed[a.feature] : '__undefined__',
      })),
      satisfied_final:p.conditions.every(a=>atomSatisfied(ambiguous.current.completed,a)),
    }))
    .filter(r=>r.satisfied_final)
    .sort((a,b)=>a.predictive_code_bits-b.predictive_code_bits || String(a.expected).localeCompare(String(b.expected)));
}

const temporalCurrent=Object.entries(ambiguous.current.completed)
  .filter(([feature])=>feature.startsWith('§t'))
  .map(([feature,value])=>{
    const s=ambiguous.structure.temporal_symbols.find(x=>x.feature===feature);
    return {feature,value,channel:s?.channel,expansion:s?.expansion,support:s?.support};
  });
const inferredTemporalTrue=temporalCurrent
  .filter(x=>x.value===true && inferred.has(x.feature))
  .map(x=>({...x,routes:routesFor(x.feature)}));

const out={
  observed:ambiguous.current.observed,
  completed:ambiguous.current.completed,
  inferred:ambiguous.current.inferred,
  unresolved:ambiguous.current.unresolved,
  temporal_current:temporalCurrent,
  inferred_temporal_true:inferredTemporalTrue,
  satisfied_p2_routes:routesFor('p2'),
  satisfied_p0_routes:routesFor('p0'),
};
fs.mkdirSync('.github/diagnostics',{recursive:true});
fs.writeFileSync('.github/diagnostics/semantic-ambiguous-route.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({
  completed_p2:ambiguous.current.completed.p2 ?? null,
  completed_p0:ambiguous.current.completed.p0 ?? null,
  inferred_temporal_true:inferredTemporalTrue.map(x=>x.feature),
}));
