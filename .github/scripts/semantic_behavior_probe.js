'use strict';
const Mind = require('../../one-mind.js');
const WORD = Object.freeze({ cat:101, dog:102, fox:103, cup:104 });
const OBJECTS = Object.freeze({ cat:[1,1], dog:[1,2], fox:[2,1], cup:[2,2] });
function frame(word, object, context) { return [WORD[word], ...OBJECTS[object], context, 0]; }
function contact(m, word, object, context) { Mind.C(m, frame(word, object, context)); }
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/0x100000000;};}
function shuffledWords(seed){const random=rng(seed),words=['cat','dog','fox','cup'];for(let i=words.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[words[i],words[j]]=[words[j],words[i]];}return words;}
function cycle(m,rounds,start=0){for(let r=0;r<rounds;r++){const words=shuffledWords((start+1)*4099+r*7919);for(let i=0;i<words.length;i++){const word=words[i];contact(m,word,word,(start*3+r*5+i*2+(r%3))%11);}}}
const learner=Mind.one(1,1); cycle(learner,16,100);
const result={experiences:learner.experiences.length,patterns:learner.structure.patterns.filter(p=>p.active!==false).length,symbols:learner.structure.symbols.length,words:{}};
for(const word of Object.keys(WORD)){
  const [a,b]=OBJECTS[word];
  const fromEnglish=structuredClone(learner); Mind.C(fromEnglish,[WORD[word],null,null,null,0]);
  const fromReality=structuredClone(learner); Mind.C(fromReality,[null,a,b,null,0]);
  result.words[word]={
    english_to_world:[fromEnglish.current.completed.p1,fromEnglish.current.completed.p2],
    world_to_english:fromReality.current.completed.p0,
    english_unresolved:fromEnglish.current.unresolved,
    reality_unresolved:fromReality.current.unresolved
  };
}
console.log('SEMANTIC_BEHAVIOR_PROBE '+JSON.stringify(result));
