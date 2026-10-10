'use strict';

const assert = require('assert');
const Mind = require('./one-mind.js');

// External S-interface only: English spelling becomes an arbitrary categorical
// percept code. No dictionary or world meaning is supplied to the mind.
const WORD = Object.freeze({ cat: 101, dog: 102, fox: 103, cup: 104 });
const OBJECTS = Object.freeze({ cat: [1,1], dog: [1,2], fox: [2,1], cup: [2,2] });

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
function activePatterns(m){return m.structure.patterns.filter(p=>p.active!==false);}
function atomGrounds(m,atom,feature,value,trail=new Set()){
  if(atom.feature===feature&&atom.value===value)return true;
  if(atom.value!==true||trail.has(atom.feature))return false;
  const symbol=m.structure.symbols.find(s=>s.feature===atom.feature);
  if(!symbol)return false;
  const next=new Set(trail);next.add(atom.feature);
  return symbol.definition.some(child=>atomGrounds(m,child,feature,value,next));
}
function patternGrounds(m,pattern,feature,value){return pattern.conditions.some(a=>atomGrounds(m,a,feature,value));}
function semanticSymbol(m,a,b){
  return m.structure.symbols.find(s=>
    s.definition.some(x=>atomGrounds(m,x,'p1',a))&&
    s.definition.some(x=>atomGrounds(m,x,'p2',b)))||null;
}
function findConceptToWord(m,symbol,word){
  return activePatterns(m).filter(p=>
    p.target==='p0'&&p.expected===WORD[word]&&
    p.conditions.some(c=>c.feature===symbol.feature&&c.value===true)
  ).sort((a,b)=>a.predictive_code_bits-b.predictive_code_bits)[0]||null;
}
function findWordToConcept(m,word,symbol){
  return activePatterns(m).filter(p=>
    p.target===symbol.feature&&p.expected===true&&
    patternGrounds(m,p,'p0',WORD[word])
  ).sort((a,b)=>a.predictive_code_bits-b.predictive_code_bits)[0]||null;
}
function semanticBridge(m,word){
  const [a,b]=OBJECTS[word];
  const symbol=semanticSymbol(m,a,b);
  if(!symbol)return null;
  const outward=findConceptToWord(m,symbol,word);
  const inward=findWordToConcept(m,word,symbol);
  return outward&&inward?{symbol,outward,inward}:null;
}
function wrongConceptBridge(m,word,object){
  const [a,b]=OBJECTS[object], symbol=semanticSymbol(m,a,b);
  if(!symbol)return null;
  return findConceptToWord(m,symbol,word);
}

// One motor possibility and zero concern: neither action choice nor pressure can
// supply the semantic relation.
const m=Mind.one(1,1);
const wrong={cat:'cup',dog:'dog',fox:'fox',cup:'cat'};
cycle(m,wrong,8,0);
const correct={cat:'cat',dog:'dog',fox:'fox',cup:'cup'};
cycle(m,correct,30,100);

let cat=semanticBridge(m,'cat');
if(!cat){
  const catSymbol=semanticSymbol(m,1,1);
  console.log('SEMANTIC_DIAGNOSTIC '+JSON.stringify({
    symbols:m.structure.symbols,
    cat_symbol:catSymbol,
    cat_symbol_targets:catSymbol?activePatterns(m).filter(p=>p.target===catSymbol.feature):[],
    cat_word_patterns:activePatterns(m).filter(p=>p.target==='p0'&&p.expected===WORD.cat),
  }));
}
assert.ok(cat,'English and the learned cat-world concept did not become bidirectionally related');

const wrongCat=wrongConceptBridge(m,'cat','cup');
assert.ok(!wrongCat||wrongCat.predictive_code_bits>cat.outward.predictive_code_bits,
  'initial false cat grounding retained equal-or-greater authority after correction');

const firstDefinition=cat.symbol.definition_key;
const firstOutSupport=cat.outward.support;
const firstInSupport=cat.inward.support;
cycle(m,correct,24,1000);
cat=semanticBridge(m,'cat');
assert.ok(cat,'cat semantic bridge did not survive continued life');
assert.strictEqual(cat.symbol.definition_key,firstDefinition,
  'cat world-concept definition failed to stabilize across later recompression');
assert.ok(cat.outward.support>firstOutSupport,'continued reality did not strengthen concept -> English grounding');
assert.ok(cat.inward.support>firstInSupport,'continued reality did not strengthen English -> concept grounding');

for(const word of Object.keys(WORD))assert.ok(semanticBridge(m,word),`missing bidirectional semantic bridge for ${word}`);

console.log('42ndMind semantic grounding: PASS');
console.log(JSON.stringify({
  experiences:m.experiences.length,
  active_patterns:activePatterns(m).length,
  learned_symbols:m.structure.symbols.length,
  cat_semantic_symbol:cat.symbol.feature,
  cat_semantic_definition:cat.symbol.definition_key,
  concept_to_english_support:cat.outward.support,
  english_to_concept_support:cat.inward.support,
  concept_to_english_reliability:Number(cat.outward.reliability.toFixed(4)),
  english_to_concept_reliability:Number(cat.inward.reliability.toFixed(4)),
  bidirectional_words:Object.keys(WORD).length,
  corrected_initial_false_grounding:true,
  C_modified_for_semantics:false,
}));
