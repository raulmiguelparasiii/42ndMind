'use strict';

const assert = require('assert');
const Mind = require('./one-mind.js');

// External S-interface only: English spelling becomes an arbitrary categorical
// percept code. No dictionary or world meaning is supplied to the mind.
const WORD = Object.freeze({ cat: 101, dog: 102, fox: 103, cup: 104 });
const OBJECTS = Object.freeze({ cat: [1,1], dog: [1,2], fox: [2,1], cup: [2,2] });
const CORRECT = Object.freeze({ cat:'cat', dog:'dog', fox:'fox', cup:'cup' });
const WRONG = Object.freeze({ cat:'cup', dog:'dog', fox:'fox', cup:'cat' });

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
  const [a,b]=OBJECTS[word], symbol=semanticSymbol(m,a,b);
  if(!symbol)return null;
  const outward=findConceptToWord(m,symbol,word), inward=findWordToConcept(m,word,symbol);
  return outward&&inward?{symbol,outward,inward}:null;
}
function conceptToWordForObject(m,word,object){
  const [a,b]=OBJECTS[object], symbol=semanticSymbol(m,a,b);
  return symbol?findConceptToWord(m,symbol,word):null;
}
function assertBehavioralTranslation(m,word){
  const [a,b]=OBJECTS[word];
  const fromEnglish=structuredClone(m);
  Mind.C(fromEnglish,[WORD[word],null,null,null,0]);
  assert.strictEqual(fromEnglish.current.completed.p1,a,
    `English ${word} did not reconstruct its first grounded world term`);
  assert.strictEqual(fromEnglish.current.completed.p2,b,
    `English ${word} did not reconstruct its second grounded world term`);

  const fromReality=structuredClone(m);
  Mind.C(fromReality,[null,a,b,null,0]);
  assert.strictEqual(fromReality.current.completed.p0,WORD[word],
    `grounded ${word} world relation did not reconstruct its English label`);
}

// PROOF A: clean acquisition + stabilization. One motor possibility and zero
// concern remove action-selection and pressure as explanations. Presentation order
// and context vary independently, so only the recurring word/world relation is
// stable across the life. The bounded horizon still crosses many independent
// global recompressions; indefinite life is not simulated by wasteful rescanning.
const learner=Mind.one(1,1);
cycle(learner,CORRECT,16,100);
let cat=semanticBridge(learner,'cat');
if(!cat)console.log('SEMANTIC_DIAGNOSTIC '+JSON.stringify({
  symbols:learner.structure.symbols,
  cat_symbol:semanticSymbol(learner,1,1),
  cat_word_patterns:activePatterns(learner).filter(p=>p.target==='p0'&&p.expected===WORD.cat),
}));
assert.ok(cat,'clean English <-> learned cat-world concept bridge did not form');
for(const word of Object.keys(WORD))assertBehavioralTranslation(learner,word);

const firstDefinition=cat.symbol.definition_key;
const firstOutSupport=cat.outward.support, firstInSupport=cat.inward.support;
cycle(learner,CORRECT,8,1000);
cat=semanticBridge(learner,'cat');
assert.ok(cat,'cat semantic bridge did not survive continued life');
assert.strictEqual(cat.symbol.definition_key,firstDefinition,'cat concept definition failed to stabilize');
assert.ok(cat.outward.support>firstOutSupport,'continued reality did not strengthen concept -> English grounding');
assert.ok(cat.inward.support>firstInSupport,'continued reality did not strengthen English -> concept grounding');
for(const word of Object.keys(WORD))assertBehavioralTranslation(learner,word);

// PROOF B: actual relational translation from partial contact. `null` means that
// a perceptual channel was not contacted, not false. The same learned M must fill
// only what its grounded relations warrant. These queries run on independent
// clones so the probes do not train one another. The cat-specific checks retain
// the historical internal-stabilization proof; all four words are tested above by
// behavior so alternate warranted internal routes are not mistaken for failure.
const fromEnglish=structuredClone(learner);
Mind.C(fromEnglish,[WORD.cat,null,null,null,0]);
assert.strictEqual(fromEnglish.current.completed[cat.symbol.feature],true,
  'English contact did not reconstruct the stabilized internal cat relation');
assert.strictEqual(fromEnglish.current.completed.p1,1,
  'English contact did not unfold the first grounded cat-world term');
assert.strictEqual(fromEnglish.current.completed.p2,1,
  'English contact did not unfold the second grounded cat-world term');

const fromReality=structuredClone(learner);
Mind.C(fromReality,[null,1,1,null,0]);
assert.strictEqual(fromReality.current.completed.p0,WORD.cat,
  'grounded cat-world relation did not reconstruct the English label');

const ambiguous=structuredClone(learner);
Mind.C(ambiguous,[null,1,null,null,0]);
assert.ok(!Object.prototype.hasOwnProperty.call(ambiguous.current.completed,'p0'),
  'ambiguous partial reality was converted into an unsupported English label');

// PROOF C: correction is tested in a separate continuous life. A false cat<->cup
// teaching is first grounded, then sustained correct contact must make the actual
// cat-world concept the stronger active source for the English token.
const corrector=Mind.one(1,1);
cycle(corrector,WRONG,4,0);
cycle(corrector,CORRECT,16,200);
const correctedCat=conceptToWordForObject(corrector,'cat','cat');
const staleCat=conceptToWordForObject(corrector,'cat','cup');
assert.ok(correctedCat,'corrected cat concept -> English relation did not form');
assert.ok(!staleCat||staleCat.predictive_code_bits>correctedCat.predictive_code_bits,
  'initial false cat grounding retained equal-or-greater authority');

console.log('42ndMind semantic grounding: PASS');
console.log(JSON.stringify({
  stabilization_experiences:learner.experiences.length,
  correction_experiences:corrector.experiences.length,
  active_patterns:activePatterns(learner).length,
  learned_symbols:learner.structure.symbols.length,
  cat_semantic_symbol:cat.symbol.feature,
  cat_semantic_definition:cat.symbol.definition_key,
  concept_to_english_support:cat.outward.support,
  english_to_concept_support:cat.inward.support,
  concept_to_english_reliability:Number(cat.outward.reliability.toFixed(4)),
  english_to_concept_reliability:Number(cat.inward.reliability.toFixed(4)),
  bidirectional_words:Object.keys(WORD).length,
  english_to_internal_translation:true,
  internal_to_english_translation:true,
  ambiguous_partial_contact_suspended:true,
  corrected_initial_false_grounding:true,
  semantic_specific_C_logic:false,
}));
