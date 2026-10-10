'use strict';
const Mind = require('../../one-mind.js');
const WORD = Object.freeze({ cat:101, dog:102, fox:103, cup:104 });
const OBJECTS = Object.freeze({ cat:[1,1], dog:[1,2], fox:[2,1], cup:[2,2] });
const CORRECT = Object.freeze({ cat:'cat', dog:'dog', fox:'fox', cup:'cup' });
const WRONG = Object.freeze({ cat:'cup', dog:'dog', fox:'fox', cup:'cat' });
function frame(word, object, context) { return [WORD[word], ...OBJECTS[object], context, 0]; }
function contact(m, word, object, context) { Mind.C(m, frame(word, object, context)); }
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/0x100000000;};}
function shuffledWords(seed){const random=rng(seed),words=['cat','dog','fox','cup'];for(let i=words.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[words[i],words[j]]=[words[j],words[i]];}return words;}
function cycle(m,mapping,rounds,start=0){for(let r=0;r<rounds;r++){const words=shuffledWords((start+1)*4099+r*7919);for(let i=0;i<words.length;i++){const word=words[i];contact(m,word,mapping[word],(start*3+r*5+i*2+(r%3))%11);}}}
function queryWord(m,word){const q=structuredClone(m);Mind.C(q,[WORD[word],null,null,null,0]);return [q.current.completed.p1,q.current.completed.p2];}
function queryObject(m,object){const [a,b]=OBJECTS[object],q=structuredClone(m);Mind.C(q,[null,a,b,null,0]);return q.current.completed.p0;}
const m=Mind.one(1,1);
cycle(m,WRONG,4,0);
const before={cat_to_world:queryWord(m,'cat'),cup_world_to_word:queryObject(m,'cup'),cat_world_to_word:queryObject(m,'cat')};
cycle(m,CORRECT,16,200);
const after={cat_to_world:queryWord(m,'cat'),cat_world_to_word:queryObject(m,'cat'),cup_to_world:queryWord(m,'cup'),cup_world_to_word:queryObject(m,'cup')};
console.log('SEMANTIC_CORRECTION_BEHAVIOR '+JSON.stringify({experiences:m.experiences.length,before,after}));
