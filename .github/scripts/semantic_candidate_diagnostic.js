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
function symbolMap(m){return new Map(m.structure.symbols.map(s=>[s.feature,s]));}
function expandDefinition(feature, byFeature, trail=new Set()){
  const symbol=byFeature.get(feature);
  if(!symbol||trail.has(feature)) return [{feature}];
  const next=new Set(trail);next.add(feature);
  return symbol.definition.flatMap(atom=>{
    if(atom.value===true&&byFeature.has(atom.feature)) return expandDefinition(atom.feature,byFeature,next);
    return [atom];
  });
}

const learner=Mind.one(1,1);
cycle(learner,CORRECT,16,100);
const dog=structuredClone(learner);
Mind.C(dog,[WORD.dog,null,null,null,0]);
const byFeature=symbolMap(dog);
const inferred=new Set(dog.current.inferred);

const routes=dog.structure.patterns
  .filter(p=>p.active!==false && p.target==='p2')
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
    satisfied_final:p.conditions.every(a=>atomSatisfied(dog.current.completed,a)),
    conditions:p.conditions.map(a=>({
      ...a,
      observed:Object.prototype.hasOwnProperty.call(dog.current.observed,a.feature),
      inferred:inferred.has(a.feature),
      primitive_definition:expandDefinition(a.feature,byFeature),
    })),
  }))
  .filter(r=>r.satisfied_final)
  .sort((a,b)=>a.predictive_code_bits-b.predictive_code_bits);

const inferredSymbols=dog.current.inferred
  .filter(f=>byFeature.has(f))
  .map(f=>({
    feature:f,
    definition:byFeature.get(f).definition,
    primitive_definition:expandDefinition(f,byFeature),
  }));

const temporalTrue=Object.entries(dog.current.completed)
  .filter(([f,v])=>f.startsWith('§t')&&v===true)
  .map(([feature])=>{
    const s=dog.structure.temporal_symbols.find(x=>x.feature===feature);
    return s?{feature,channel:s.channel,expansion:s.expansion,support:s.support}:{feature};
  });
const temporalFalse=Object.entries(dog.current.completed)
  .filter(([f,v])=>f.startsWith('§t')&&v===false).length;

const output={
  experiences:dog.experiences.length,
  observed:dog.current.observed,
  completed:{p0:dog.current.completed.p0,p1:dog.current.completed.p1,p2:dog.current.completed.p2,p3:dog.current.completed.p3,c0:dog.current.completed.c0},
  inferred:dog.current.inferred,
  unresolved:dog.current.unresolved,
  temporal_true:temporalTrue,
  temporal_false_count:temporalFalse,
  satisfied_p2_routes:routes,
  inferred_symbols:inferredSymbols,
};
fs.mkdirSync('.github/diagnostics',{recursive:true});
fs.writeFileSync('.github/diagnostics/semantic-route.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
