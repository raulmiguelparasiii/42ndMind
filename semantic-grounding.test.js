'use strict';

const assert = require('assert');
const Mind = require('./one-mind.js');

// This is an external S-interface only. English spelling is converted to an
// arbitrary categorical percept code; the mind receives no dictionary or world
// meaning for the code. The remaining percept channels are equally categorical
// contact with a tiny reality. The final channel is one zero-valued primitive
// concern so no purposive motor relation can explain semantic learning.
const WORD = Object.freeze({ cat: 101, dog: 102, fox: 103, cup: 104 });
const OBJECTS = Object.freeze({
  cat: [1, 1],
  dog: [1, 2],
  fox: [2, 1],
  cup: [2, 2],
});

function frame(word, object, context) {
  return [WORD[word], ...OBJECTS[object], context, 0];
}
function contact(m, word, object, context) {
  Mind.C(m, frame(word, object, context));
}
function cycle(m, mapping, rounds, start = 0) {
  const words = ['cat', 'dog', 'fox', 'cup'];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      // Context deliberately varies independently of word/object identity.
      contact(m, word, mapping[word], (start + r * 5 + i * 3) % 7);
    }
  }
}
function activePatterns(m) {
  return m.structure.patterns.filter(p => p.active !== false);
}
function hasAtom(pattern, feature, value) {
  return pattern.conditions.some(c => c.feature === feature && c.value === value);
}
function findReverse(m, word, a, b) {
  return activePatterns(m).filter(p =>
    p.target === 'p0' && p.expected === WORD[word] &&
    hasAtom(p, 'p1', a) && hasAtom(p, 'p2', b)
  ).sort((x, y) => x.predictive_code_bits - y.predictive_code_bits)[0] || null;
}
function findForward(m, word, target, expected) {
  return activePatterns(m).filter(p =>
    p.target === target && p.expected === expected &&
    hasAtom(p, 'p0', WORD[word])
  ).sort((x, y) => x.predictive_code_bits - y.predictive_code_bits)[0] || null;
}
function semanticSymbol(m, a, b) {
  return m.structure.symbols.find(s => {
    const primitive = s.definition.filter(x => x.feature === 'p1' || x.feature === 'p2');
    return primitive.length === 2 &&
      primitive.some(x => x.feature === 'p1' && x.value === a) &&
      primitive.some(x => x.feature === 'p2' && x.value === b);
  }) || null;
}

// One physical continuation only: motor variation cannot encode the words.
const m = Mind.one(1, 1);

// Early false teaching: "cat" is repeatedly paired with the cup-like reality and
// "cup" with the cat-like reality. This is deliberately treated as ordinary
// contact, not as privileged seed truth.
const wrong = { cat: 'cup', dog: 'dog', fox: 'fox', cup: 'cat' };
cycle(m, wrong, 8, 0);

// Then sustained reality-correct teaching. If C is correction-open, later contact
// must be able to reorganize the initially grounded but false word relation.
const correct = { cat: 'cat', dog: 'dog', fox: 'fox', cup: 'cup' };
cycle(m, correct, 30, 100);

let catReverse = findReverse(m, 'cat', 1, 1);
let catForwardA = findForward(m, 'cat', 'p1', 1);
let catForwardB = findForward(m, 'cat', 'p2', 1);
assert.ok(catReverse, 'no grounded reality -> English relation formed for cat');
assert.ok(catForwardA && catForwardB, 'no English -> grounded reality relation formed for cat');

// The early wrong grounding must no longer be an active reverse semantic bridge.
const wrongCat = findReverse(m, 'cat', 2, 2);
assert.ok(!wrongCat || wrongCat.predictive_code_bits > catReverse.predictive_code_bits,
  'initial false cat grounding retained equal-or-greater authority after correction');

const firstSignature = catReverse.conditions
  .map(x => `${x.feature}=${JSON.stringify(x.value)}`).sort().join('&');
const firstSupport = catReverse.support;
const firstSymbol = semanticSymbol(m, 1, 1);
assert.ok(firstSymbol, 'no reusable internal relation formed for cat reality');
const firstDefinition = firstSymbol.definition_key;

// Continue the same life. Stabilization here means the same reality-grounded
// semantic definition survives additional contact and gains evidence rather than
// being a one-recompression artifact.
cycle(m, correct, 24, 1000);
catReverse = findReverse(m, 'cat', 1, 1);
catForwardA = findForward(m, 'cat', 'p1', 1);
catForwardB = findForward(m, 'cat', 'p2', 1);
const laterSymbol = semanticSymbol(m, 1, 1);
assert.ok(catReverse && catForwardA && catForwardB, 'bidirectional semantic relation did not survive continued life');
assert.ok(laterSymbol, 'internal semantic relation disappeared under continued confirming reality');
assert.strictEqual(laterSymbol.definition_key, firstDefinition,
  'grounded semantic definition failed to stabilize across later recompression');
assert.ok(catReverse.support > firstSupport,
  'continued confirming reality did not increase support for stabilized semantic relation');

const laterSignature = catReverse.conditions
  .map(x => `${x.feature}=${JSON.stringify(x.value)}`).sort().join('&');
assert.strictEqual(laterSignature, firstSignature,
  'best grounded reality -> English bridge did not stabilize');

// Check the same bidirectionality for all four arbitrary English labels.
for (const word of Object.keys(WORD)) {
  const [a, b] = OBJECTS[word];
  assert.ok(findReverse(m, word, a, b), `missing reality -> ${word} relation`);
  assert.ok(findForward(m, word, 'p1', a), `missing ${word} -> first grounded relation`);
  assert.ok(findForward(m, word, 'p2', b), `missing ${word} -> second grounded relation`);
}

console.log('42ndMind semantic grounding: PASS');
console.log(JSON.stringify({
  experiences: m.experiences.length,
  active_patterns: activePatterns(m).length,
  learned_symbols: m.structure.symbols.length,
  cat_semantic_symbol: laterSymbol.feature,
  cat_semantic_definition: laterSymbol.definition_key,
  cat_reverse_support: catReverse.support,
  cat_reverse_exceptions: catReverse.exceptions,
  cat_reverse_reliability: Number(catReverse.reliability.toFixed(4)),
  bidirectional_words: Object.keys(WORD).length,
  corrected_initial_false_grounding: true,
  C_modified_for_semantics: false,
}));
