'use strict';

// Branch-only observation harness. It does not modify C, one-mind.js, or the
// canonical state. It starts from a copy of the canonical M and puts that same
// individual in a world where another agent's English requests are causally
// necessary: the requested target is not otherwise perceptually available.

const fs = require('fs');
const path = require('path');
const Mind = require('./one-mind.js');

const ROOT = __dirname;
const STATE = path.join(ROOT, 'state');
const CANONICAL_MIND = path.join(STATE, 'canonical-mind.json');
const REPORT = path.join(STATE, 'social-life-report.json');
const SNAPSHOT = path.join(STATE, 'social-life-mind.json');
const STEPS = Math.max(1, Math.floor(Number(process.env.SOCIAL_STEPS || 64)));

const TARGETS = Object.freeze([
  { word: 'red', action: 0, code: 1 },
  { word: 'green', action: 1, code: 2 },
  { word: 'blue', action: 2, code: 3 },
  { word: 'yellow', action: 3, code: 4 },
]);
// Exact token identities already used by canonical continuous-life.js.
const WORDS = Object.freeze([
  'red','green','blue','yellow',
  'circle','square','triangle','star',
  'helps','helped','aid','harms','harmed','hurt','gives','given','supply','blocks','blocked','stop',
  'one','two','three','the','is','by'
]);
const CODE = new Map(WORDS.map((w, i) => [w, 1000 + i]));
const WORD = new Map([...CODE].map(([w, c]) => [c, w]));
const TEMPLATES = Object.freeze([
  t => ['the', t.word, 'one'],
  t => [t.word],
  t => ['the', t.word],
]);

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function rng(world) {
  world.rng = (Math.imul(world.rng >>> 0, 1664525) + 1013904223) >>> 0;
  return world.rng / 0x100000000;
}
function choose(world, xs) { return xs[Math.floor(rng(world) * xs.length)]; }
function activePatterns(m) { return (m.structure?.patterns || []).filter(p => p.active !== false); }
function atomTouchesSpeech(a) { return a?.feature === 'p7'; }
function speechPattern(p) { return p.target === 'p7' || (p.conditions || []).some(atomTouchesSpeech); }
function compact(p) {
  return {
    conditions: (p.conditions || []).map(a => ({
      feature: a.feature,
      value: a.value,
      ...(a.feature === 'p7' && WORD.has(a.value) ? { word: WORD.get(a.value) } : {}),
    })),
    target: p.target,
    expected: p.expected,
    ...(p.target === 'p7' && WORD.has(p.expected) ? { expected_word: WORD.get(p.expected) } : {}),
    support: p.support,
    exceptions: p.exceptions,
    reliability: Number((p.reliability || 0).toFixed(4)),
    bits_saved: Number((p.bits_saved || 0).toFixed(4)),
  };
}
function symbolDeps(mind, symbol, seen = new Set()) {
  if (!symbol || seen.has(symbol.feature)) return new Set();
  const next = new Set(seen); next.add(symbol.feature);
  const by = new Map((mind.structure?.symbols || []).map(s => [s.feature, s]));
  const out = new Set();
  for (const atom of symbol.definition || []) {
    const child = by.get(atom.feature);
    if (child && atom.value === true) for (const x of symbolDeps(mind, child, next)) out.add(x);
    else out.add(atom.feature);
  }
  return out;
}

if (!fs.existsSync(CANONICAL_MIND)) throw new Error('canonical M is required');
const mind = clone(JSON.parse(fs.readFileSync(CANONICAL_MIND, 'utf8')));
if (mind.action_count !== 4 || mind.concern_count !== 2) throw new Error('unexpected canonical embodiment');

const world = {
  rng: 0x51c1a11,
  pressure: [30, 8],
  request: null,
  utterance: [],
  tokenIndex: 0,
  speaker: 1,
  lastEffect: 70,
  interactions: 0,
  correct: 0,
  wrong: 0,
  perTarget: Object.fromEntries(TARGETS.map(t => [t.word, { asked: 0, correct: 0, wrong: 0 }])),
};

function startRequest() {
  const target = choose(world, TARGETS);
  const utterance = choose(world, TEMPLATES)(target);
  world.request = target;
  world.utterance = utterance;
  world.tokenIndex = 0;
  world.speaker = 1 + Math.floor(rng(world) * 3);
  world.interactions++;
  world.perTarget[target.word].asked++;
}
function sense() {
  if (!world.request) startRequest();
  const token = CODE.get(world.utterance[world.tokenIndex]);
  // p0-p3: four physically available choices; none identifies which one the
  // other agent currently wants. p4/p5/p6 are ordinary social/context cues.
  // p7 is the currently heard English token; p8 speaker; p9 prior social effect.
  return [11, 12, 13, 14, 31, 41, 51, token, world.speaker, world.lastEffect, ...world.pressure];
}
function act(action) {
  const target = world.request;
  const wasTargetWord = world.utterance[world.tokenIndex] === target.word;
  const correct = action === target.action;

  // The request remains live until the mind acts correctly. English therefore
  // has causal relevance: no nonlinguistic channel reveals the requested choice.
  if (correct) {
    world.correct++;
    world.perTarget[target.word].correct++;
    world.pressure[0] = Math.max(0, Number((world.pressure[0] - 3.0).toFixed(3)));
    world.pressure[1] = Math.max(0, Number((world.pressure[1] - 0.4).toFixed(3)));
    world.lastEffect = 71;
    world.request = null;
    world.utterance = [];
    world.tokenIndex = 0;
  } else {
    world.wrong++;
    world.perTarget[target.word].wrong++;
    world.pressure[0] = Math.min(255, Number((world.pressure[0] + (wasTargetWord ? 1.0 : 0.7)).toFixed(3)));
    world.pressure[1] = Math.min(255, Number((world.pressure[1] + 0.2).toFixed(3)));
    world.lastEffect = 72;
    world.tokenIndex = (world.tokenIndex + 1) % world.utterance.length;
  }
}

const beforeExperiences = mind.experiences.length;
const snapshots = [];
for (let step = 0; step < STEPS; step++) {
  const frame = sense();
  Mind.C(mind, frame);
  act(mind.motor);
  if ((step + 1) % 8 === 0 || step === STEPS - 1) {
    snapshots.push({
      step: step + 1,
      experiences: mind.experiences.length,
      symbols: mind.structure?.symbols?.length || 0,
      active_patterns: activePatterns(mind).length,
      interactions: world.interactions,
      correct: world.correct,
      wrong: world.wrong,
      pressure: [...world.pressure],
    });
  }
}

const speechPatterns = activePatterns(mind).filter(speechPattern).map(compact);
const speechAction = speechPatterns.filter(p => p.target === 'action' || p.conditions.some(a => a.feature === 'action'));
const speechConsequence = speechPatterns.filter(p => /^relation_c\d+_order$/.test(p.target) || p.conditions.some(a => /^relation_c\d+_order$/.test(a.feature)));
const speechSymbols = (mind.structure?.symbols || []).map(symbol => ({
  feature: symbol.feature,
  dependencies: [...symbolDeps(mind, symbol)].sort(),
})).filter(x => x.dependencies.includes('p7'));

const report = {
  kind: '42ndMind branch-only English social-life observation',
  invariants: {
    C_modified: false,
    one_mind_js_modified: false,
    canonical_M_modified: false,
    starts_from_copy_of_canonical_M: true,
    target_not_available_outside_English: true,
    language_specific_cognition_added: false,
    canonical_english_token_ids_preserved: true,
  },
  life: {
    steps: STEPS,
    experiences_before: beforeExperiences,
    experiences_after: mind.experiences.length,
    interactions_started: world.interactions,
    correct_actions: world.correct,
    wrong_actions: world.wrong,
    accuracy: world.correct + world.wrong ? Number((world.correct / (world.correct + world.wrong)).toFixed(4)) : null,
    per_target: world.perTarget,
    final_pressure: world.pressure,
  },
  relational_result: {
    active_patterns: activePatterns(mind).length,
    learned_symbols: mind.structure?.symbols?.length || 0,
    active_patterns_touching_english: speechPatterns.length,
    english_action_relations: speechAction,
    english_consequence_relations: speechConsequence,
    learned_symbols_with_english_dependency: speechSymbols,
  },
  snapshots,
};

fs.mkdirSync(STATE, { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(SNAPSHOT, JSON.stringify(mind) + '\n');
console.log(JSON.stringify(report, null, 2));
