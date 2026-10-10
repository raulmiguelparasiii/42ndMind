'use strict';

const assert = require('assert');
const Mind = require('./one-mind.js');

// One uninterrupted language-bearing life. This file is only W/S/A test
// environment. It contains the world's linguistic convention so speakers can
// produce utterances about scenes. C receives only opaque token codes plus the
// same grounded scene channels; it contains no dictionary, grammar, lexical
// categories, sentence templates, or English-specific branch.
class TextInterface {
  constructor() {
    this.next = 1000;
    this.toCode = new Map();
    this.toWord = new Map();
  }
  code(surface) {
    surface = String(surface).toLowerCase();
    if (!this.toCode.has(surface)) {
      const code = this.next++;
      this.toCode.set(surface, code);
      this.toWord.set(code, surface);
    }
    return this.toCode.get(surface);
  }
  render(code) { return this.toWord.get(code) || `<?>${code}`; }
}

const text = new TextInterface();
const MAX_TOKENS = 10;
const SURFACE_EXTENT = 17;

const COLORS = Object.freeze({ red: 1, green: 2, blue: 3, yellow: 4 });
const SHAPES = Object.freeze({ circle: 11, square: 12, triangle: 13, star: 14 });
const VERBS = Object.freeze({
  pushes: Object.freeze({ code: 21, active: 'pushes', passive: 'pushed' }),
  follows: Object.freeze({ code: 22, active: 'follows', passive: 'followed' }),
  sees: Object.freeze({ code: 23, active: 'sees', passive: 'seen' }),
  helps: Object.freeze({ code: 24, active: 'helps', passive: 'helped' }),
});

const EARLY_COLORS = ['red', 'green', 'blue'];
const EARLY_SHAPES = ['circle', 'square', 'triangle'];
const EARLY_VERBS = ['pushes', 'follows', 'sees'];
const SPEAKERS = [1, 2, 3];

function wordForCode(table, code) {
  for (const [word, value] of Object.entries(table)) if (value === code) return word;
  throw new Error(`unknown world code ${code}`);
}
function verbForCode(code) {
  for (const verb of Object.values(VERBS)) if (verb.code === code) return verb;
  throw new Error(`unknown verb code ${code}`);
}

// Speaker identity is ordinary social/context contact. Different speakers have
// different stable expression habits, so the world itself supplies a reason for
// more than one valid surface form of the same scene.
function utterance(scene, speaker) {
  const ac = wordForCode(COLORS, scene.actorColor);
  const as = wordForCode(SHAPES, scene.actorShape);
  const pc = wordForCode(COLORS, scene.patientColor);
  const ps = wordForCode(SHAPES, scene.patientShape);
  const verb = verbForCode(scene.verb);

  if (speaker === 1) return [ac, as, verb.active, pc, ps];
  if (speaker === 2) return ['the', ac, as, verb.active, 'the', pc, ps];
  if (speaker === 3) return ['the', pc, ps, 'is', verb.passive, 'by', 'the', ac, as];
  throw new Error(`unknown speaker ${speaker}`);
}

function tokenSlots(words) {
  assert.ok(words.length <= MAX_TOKENS);
  const slots = Array(MAX_TOKENS).fill(null);
  for (let i = 0; i < words.length; i++) slots[i] = text.code(words[i]);
  return slots;
}

// p0..p9 are merely ordered surface-token positions. No position means a
// lexical or grammatical category. p10..p14 are one grounded description of
// the scene; p15 is speaker; p16 unrelated context. p17 is the physically
// observable extent of this surface sequence. S supplies extent just as it
// supplies token order/boundaries; it does not tell C what any word or role means.
function frame(scene, speaker, context) {
  const words = utterance(scene, speaker);
  return [
    ...tokenSlots(words),
    scene.actorColor,
    scene.actorShape,
    scene.patientColor,
    scene.patientShape,
    scene.verb,
    speaker,
    context,
    words.length,
    0,
  ];
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

function scene(actorColor, actorShape, patientColor, patientShape, verb) {
  return {
    actorColor: COLORS[actorColor],
    actorShape: SHAPES[actorShape],
    patientColor: COLORS[patientColor],
    patientShape: SHAPES[patientShape],
    verb: VERBS[verb].code,
  };
}

// The early world is a balanced 3x3x3 design. Patient properties are deterministic
// only as orthogonal combinations of all three varying actor/relation dimensions;
// no one old feature predicts another. This removes accidental scene shortcuts
// while keeping the world finite and exactly reproducible.
function earlyLifeContacts() {
  const out = [];
  for (const speaker of SPEAKERS) {
    for (let ci = 0; ci < EARLY_COLORS.length; ci++) {
      for (let ni = 0; ni < EARLY_SHAPES.length; ni++) {
        for (let vi = 0; vi < EARLY_VERBS.length; vi++) {
          const patientColor = EARLY_COLORS[(ci + ni + vi) % EARLY_COLORS.length];
          const patientShape = EARLY_SHAPES[(ci + 2 * ni + vi) % EARLY_SHAPES.length];
          out.push({
            scene: scene(
              EARLY_COLORS[ci],
              EARLY_SHAPES[ni],
              patientColor,
              patientShape,
              EARLY_VERBS[vi]
            ),
            speaker,
          });
        }
      }
    }
  }
  return shuffle(out, 420072);
}

// New vocabulary appears later as part of ordinary life, not category lessons.
// Each new term receives a balanced 3x3 spread over the two old dimensions that
// remain free in its scene. Each contact contains at most one of yellow/star/helps,
// so the strong final combination and every pair among those three remain absent.
function laterLifeContacts() {
  const out = [];
  for (const speaker of SPEAKERS) {
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) {
        const patientColor = EARLY_COLORS[(a + b) % 3];
        const patientShape = EARLY_SHAPES[(a + 2 * b) % 3];

        out.push({
          scene: scene('yellow', EARLY_SHAPES[a], patientColor, patientShape, EARLY_VERBS[b]),
          speaker,
        });
        out.push({
          scene: scene(EARLY_COLORS[a], 'star', patientColor, patientShape, EARLY_VERBS[b]),
          speaker,
        });
        out.push({
          scene: scene(EARLY_COLORS[a], EARLY_SHAPES[b], patientColor, patientShape, 'helps'),
          speaker,
        });
      }
    }
  }
  return shuffle(out, 990072);
}

function live(m, contacts, contextOffset) {
  for (let i = 0; i < contacts.length; i++) {
    const episode = contacts[i];
    const context = (contextOffset + i * 17 + (i % 7) * 11) % 97;
    Mind.C(m, frame(episode.scene, episode.speaker, context));
  }
}

function worldValues(scene) {
  return [scene.actorColor, scene.actorShape, scene.patientColor, scene.patientShape, scene.verb];
}

function readingProbe(m, sceneValue, speaker) {
  const q = structuredClone(m);
  const words = utterance(sceneValue, speaker);
  Mind.C(q, [
    ...tokenSlots(words),
    null, null, null, null, null,
    speaker,
    null,
    words.length,
    0,
  ]);
  const actual = [10, 11, 12, 13, 14].map(i => q.current.completed[`p${i}`]);
  assert.deepStrictEqual(actual, worldValues(sceneValue),
    `variable-length reading failed for: ${words.join(' ')}`);
  return { q, words };
}

function expressionProbe(m, sceneValue, speaker) {
  const q = structuredClone(m);
  Mind.C(q, [
    ...Array(MAX_TOKENS).fill(null),
    ...worldValues(sceneValue),
    speaker,
    null,
    null,
    0,
  ]);
  const expected = utterance(sceneValue, speaker);
  const extent = q.current.completed[`p${SURFACE_EXTENT}`];
  assert.strictEqual(extent, expected.length,
    `expression did not reconstruct surface extent for speaker ${speaker}`);
  const actual = [];
  for (let i = 0; i < extent; i++) {
    const code = q.current.completed[`p${i}`];
    assert.ok(Number.isFinite(code), `expression left token ${i} unresolved for speaker ${speaker}`);
    actual.push(text.render(code));
  }
  assert.deepStrictEqual(actual, expected,
    `world relation did not reconstruct speaker ${speaker}'s learned expression`);
  return { q, actual, extent };
}

const learner = Mind.one(1, 1);
const early = earlyLifeContacts();
const later = laterLifeContacts();

// One life, no resets. Language is mixed into the same stream of scene contact.
live(learner, early, 1000);
live(learner, later, 5000);
// Flush the preceding final episode into experience without introducing any new
// vocabulary or privileged target combination.
live(learner, [early[0]], 9000);

const novel = scene('yellow', 'star', 'blue', 'square', 'helps');

// Same never-experienced scene must be understood through three genuinely
// different variable-length/order conventions learned from the ongoing life.
const reads = SPEAKERS.map(speaker => readingProbe(learner, novel, speaker));
const expressions = SPEAKERS.map(speaker => expressionProbe(learner, novel, speaker));

// A prefix may warrant its own grounded terms but must not force an unseen verb
// or patient. Speaker 2 says: "the yellow star ...".
const partial = structuredClone(learner);
const prefix = ['the', 'yellow', 'star'];
const partialTokens = Array(MAX_TOKENS).fill(null);
for (let i = 0; i < prefix.length; i++) partialTokens[i] = text.code(prefix[i]);
Mind.C(partial, [
  ...partialTokens,
  null, null, null, null, null,
  2,
  null,
  null,
  0,
]);
assert.strictEqual(partial.current.completed.p10, COLORS.yellow,
  'partial utterance did not ground known actor color');
assert.strictEqual(partial.current.completed.p11, SHAPES.star,
  'partial utterance did not ground known actor shape');
for (const feature of ['p12', 'p13', 'p14']) {
  assert.ok(!Object.prototype.hasOwnProperty.call(partial.current.completed, feature),
    `partial utterance hallucinated unsupported ${feature}`);
}

const experiencedSurface = new Set([...early, ...later].map(x => utterance(x.scene, x.speaker).join('|')));
for (const speaker of SPEAKERS) {
  assert.ok(!experiencedSurface.has(utterance(novel, speaker).join('|')),
    `strong holdout accidentally appeared in life for speaker ${speaker}`);
}

console.log('42ndMind continuous language-bearing life: PASS');
console.log(JSON.stringify({
  experiences: learner.experiences.length,
  early_contacts: early.length,
  later_contacts: later.length,
  learned_symbols: learner.structure.symbols.length,
  active_patterns: learner.structure.patterns.filter(p => p.active !== false).length,
  observed_surface_vocabulary: text.toCode.size,
  utterance_lengths: SPEAKERS.map(s => utterance(novel, s).length),
  semantic_token_slots: false,
  fixed_adjective_noun_verb_slots: false,
  balanced_scene_design: true,
  sequence_extent_is_structural_contact: true,
  one_continuous_M: true,
  later_vocabulary_appeared_during_life: true,
  new_terms_never_pairwise_cooccurred: true,
  never_seen_scene_read_across_three_forms: reads.length === 3,
  never_seen_scene_expressed_across_three_forms: expressions.length === 3,
  surface_extent_reconstructed_across_three_forms: expressions.every(x => x.extent === x.actual.length),
  unsupported_partial_terms_withheld: true,
  C_language_specific_changes: false,
}));
