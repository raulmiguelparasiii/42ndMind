'use strict';

const assert = require('assert');
const Mind = require('./one-mind.js');

// This is an S/A test harness, not language knowledge in C.
// S only assigns opaque numeric codes to observed spellings and preserves token order.
// A only renders an already-completed token sequence back to the spellings it has seen.
class TextInterface {
  constructor() { this.next = 1000; this.toCode = new Map(); this.toWord = new Map(); }
  code(word) {
    word = String(word).toLowerCase();
    if (!this.toCode.has(word)) {
      const code = this.next++;
      this.toCode.set(word, code);
      this.toWord.set(code, word);
    }
    return this.toCode.get(word);
  }
  render(codes) { return codes.map(code => this.toWord.get(code) || `<?>${code}`).join(' '); }
}

const text = new TextInterface();

const BASE_COLORS = Object.freeze({ red: 1, green: 2, blue: 3 });
const BASE_NOUNS = Object.freeze({ circle: 11, square: 12, triangle: 13 });
const BASE_VERBS = Object.freeze({ moves: 21, spins: 22, rests: 23 });

const NEW = Object.freeze({
  color: ['yellow', 4],
  noun: ['star', 14],
  verb: ['jumps', 24],
});

function sentenceFrame(colorWord, nounWord, verbWord, colorCode, nounCode, verbCode, context) {
  return [
    text.code(colorWord), text.code(nounWord), text.code(verbWord),
    colorCode, nounCode, verbCode,
    context,
    0,
  ];
}

function contact(m, sample, context) {
  Mind.C(m, sentenceFrame(...sample, context));
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
function shuffle(items, seed) {
  const out = items.slice(), random = rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function triples(colors, nouns, verbs) {
  const out = [];
  for (const [cw, cc] of Object.entries(colors)) {
    for (const [nw, nc] of Object.entries(nouns)) {
      for (const [vw, vc] of Object.entries(verbs)) out.push([cw, nw, vw, cc, nc, vc]);
    }
  }
  return out;
}
function teach(m, samples, rounds, seedBase) {
  let contactIndex = 0;
  for (let round = 0; round < rounds; round++) {
    for (const sample of shuffle(samples, seedBase + round * 7919)) {
      const context = (seedBase + round * 17 + contactIndex * 7) % 29;
      contact(m, sample, context);
      contactIndex++;
    }
  }
}

function compactPattern(pattern) {
  return {
    id: pattern.id,
    conditions: pattern.conditions,
    target: pattern.target,
    expected: pattern.expected,
    active: pattern.active !== false,
    support: pattern.support,
    exceptions: pattern.exceptions,
    covered: pattern.covered,
    eligible: pattern.eligible,
    reliability: pattern.reliability,
    bits_saved: pattern.bits_saved,
    predictive_code_bits: pattern.predictive_code_bits,
  };
}

function diagnoseReadFailure(m, q, colorWord, nounWord, verbWord, expected) {
  const tokenCodes = {
    color: text.code(colorWord),
    noun: text.code(nounWord),
    verb: text.code(verbWord),
  };
  const lexicalForward = m.structure.patterns.filter(pattern =>
    pattern.target === 'p5' && pattern.expected === expected[2] &&
    pattern.conditions.some(atom => atom.feature === 'p2' && atom.value === tokenCodes.verb)
  ).map(compactPattern);
  const lexicalReverse = m.structure.patterns.filter(pattern =>
    pattern.target === 'p2' && pattern.expected === tokenCodes.verb &&
    pattern.conditions.some(atom => atom.feature === 'p5' && atom.value === expected[2])
  ).map(compactPattern);
  const allVerbWorld = m.structure.patterns.filter(pattern => pattern.target === 'p5').map(compactPattern);
  const allVerbEnglish = m.structure.patterns.filter(pattern => pattern.target === 'p2').map(compactPattern);
  console.log('LANGUAGE_SCHOOL_DIAGNOSTIC ' + JSON.stringify({
    sentence: [colorWord, nounWord, verbWord],
    token_codes: tokenCodes,
    expected_world: expected,
    current: q.current,
    lexical_forward: lexicalForward,
    lexical_reverse: lexicalReverse,
    all_p5_patterns: allVerbWorld,
    all_p2_patterns: allVerbEnglish,
    pattern_count: m.structure.patterns.length,
    active_pattern_count: m.structure.patterns.filter(p => p.active !== false).length,
    symbols: m.structure.symbols.length,
  }));
}

function readProbe(m, colorWord, nounWord, verbWord, expected) {
  const q = structuredClone(m);
  Mind.C(q, [
    text.code(colorWord), text.code(nounWord), text.code(verbWord),
    null, null, null, null,
    0,
  ]);
  if (q.current.completed.p3 !== expected[0] || q.current.completed.p4 !== expected[1] || q.current.completed.p5 !== expected[2]) {
    diagnoseReadFailure(m, q, colorWord, nounWord, verbWord, expected);
  }
  assert.strictEqual(q.current.completed.p3, expected[0], `reading failed for color in: ${colorWord} ${nounWord} ${verbWord}`);
  assert.strictEqual(q.current.completed.p4, expected[1], `reading failed for noun in: ${colorWord} ${nounWord} ${verbWord}`);
  assert.strictEqual(q.current.completed.p5, expected[2], `reading failed for verb in: ${colorWord} ${nounWord} ${verbWord}`);
  return q;
}

function expressionProbe(m, expectedWords, worldCodes) {
  const q = structuredClone(m);
  Mind.C(q, [null, null, null, ...worldCodes, null, 0]);
  const codes = [q.current.completed.p0, q.current.completed.p1, q.current.completed.p2];
  assert.ok(codes.every(Number.isFinite), `world relation did not reconstruct a complete English expression: ${expectedWords.join(' ')}`);
  const rendered = text.render(codes);
  assert.strictEqual(rendered, expectedWords.join(' '), 'A-interface rendering did not match the warranted English expression');
  return { q, rendered };
}

const learner = Mind.one(1, 1);

// PHASE 1: a small school. Every lexical item occurs across many independent
// combinations. Three complete sentences are never shown, so success on them
// requires component relations rather than sentence memorization.
const base = triples(BASE_COLORS, BASE_NOUNS, BASE_VERBS);
const heldOut = new Set([
  'red|circle|moves',
  'green|square|spins',
  'blue|triangle|rests',
]);
const baseTraining = base.filter(x => !heldOut.has(`${x[0]}|${x[1]}|${x[2]}`));
teach(learner, baseTraining, 2, 42007);

for (const sentence of base.filter(x => heldOut.has(`${x[0]}|${x[1]}|${x[2]}`))) {
  readProbe(learner, sentence[0], sentence[1], sentence[2], sentence.slice(3));
  expressionProbe(learner, sentence.slice(0, 3), sentence.slice(3));
}

// PHASE 2: continued education in the SAME M. Teach a new adjective, noun, and
// verb separately. Their pairings with one another are deliberately never shown.
// If M merely memorizes whole sentences, the final triple must fail.
const [yellow, yellowCode] = NEW.color;
const [star, starCode] = NEW.noun;
const [jumps, jumpsCode] = NEW.verb;

const teachYellow = [];
for (const [nw, nc] of Object.entries(BASE_NOUNS)) {
  for (const [vw, vc] of Object.entries(BASE_VERBS)) teachYellow.push([yellow, nw, vw, yellowCode, nc, vc]);
}
teach(learner, teachYellow, 2, 51001);

const teachStar = [];
for (const [cw, cc] of Object.entries(BASE_COLORS)) {
  for (const [vw, vc] of Object.entries(BASE_VERBS)) teachStar.push([cw, star, vw, cc, starCode, vc]);
}
teach(learner, teachStar, 2, 61001);

const teachJumps = [];
for (const [cw, cc] of Object.entries(BASE_COLORS)) {
  for (const [nw, nc] of Object.entries(BASE_NOUNS)) teachJumps.push([cw, nw, jumps, cc, nc, jumpsCode]);
}
teach(learner, teachJumps, 2, 71001);

// Strong compositional holdout: none of these three new words has ever appeared
// in a sentence with either of the other two new words.
const novel = [yellow, star, jumps];
const novelWorld = [yellowCode, starCode, jumpsCode];
const readNovel = readProbe(learner, ...novel, novelWorld);
const saidNovel = expressionProbe(learner, novel, novelWorld);

// Ambiguous/partial English must not hallucinate the missing world terms.
const partial = structuredClone(learner);
Mind.C(partial, [text.code(yellow), null, null, null, null, null, null, 0]);
assert.strictEqual(partial.current.completed.p3, yellowCode, 'known adjective did not ground its own relation');
assert.ok(!Object.prototype.hasOwnProperty.call(partial.current.completed, 'p4'), 'partial English hallucinated an unsupported noun relation');
assert.ok(!Object.prototype.hasOwnProperty.call(partial.current.completed, 'p5'), 'partial English hallucinated an unsupported verb relation');

console.log('42ndMind compositional language school: PASS');
console.log(JSON.stringify({
  experiences: learner.experiences.length,
  learned_symbols: learner.structure.symbols.length,
  active_patterns: learner.structure.patterns.filter(p => p.active !== false).length,
  base_vocabulary: Object.keys(BASE_COLORS).length + Object.keys(BASE_NOUNS).length + Object.keys(BASE_VERBS).length,
  later_taught_vocabulary: 3,
  total_tested_vocabulary: Object.keys(BASE_COLORS).length + Object.keys(BASE_NOUNS).length + Object.keys(BASE_VERBS).length + 3,
  held_out_base_sentences_read: heldOut.size,
  held_out_base_sentences_expressed: heldOut.size,
  never_seen_new_word_combination_read: readNovel.current.completed.p3 === yellowCode && readNovel.current.completed.p4 === starCode && readNovel.current.completed.p5 === jumpsCode,
  never_seen_new_word_combination_expressed: saidNovel.rendered === 'yellow star jumps',
  ambiguous_partial_contact_suspended: true,
  C_language_specific_changes: false,
}));
