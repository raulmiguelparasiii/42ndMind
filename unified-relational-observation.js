'use strict';

const fs = require('fs');
const path = require('path');
const mindPath = process.env.MIND_MODULE ? path.resolve(process.env.MIND_MODULE) : path.join(__dirname, 'one-mind.js');
const Mind = require(mindPath);
const canonical = JSON.parse(fs.readFileSync(path.join(__dirname, 'state', 'canonical-mind.json'), 'utf8'));
const STEPS = Math.max(1, Number(process.env.SOCIAL_STEPS || 64));
const REPORT = process.env.REPORT_PATH ? path.resolve(process.env.REPORT_PATH) : null;

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

const probe = Mind.one(2, 1);
Mind.C(probe, { relations: { rules: [
  {
    id: 'probe:percept',
    premises: [[{ var: 's' }, 'p0', 7]],
    conclusion: [{ var: 's' }, 'p1', 9],
    provenance: 'probe',
  },
  {
    id: 'probe:action',
    premises: [[{ var: 's' }, 'p0', 7], [{ var: 's' }, 'relation_c0_order', 'less']],
    conclusion: [{ var: 's' }, 'action', 1],
    provenance: 'probe',
  },
] } });
Mind.C(probe, [7, null, 10]);
const perceptCrossesSubstrate = probe.current?.completed?.p1 === 9;
const actionCrossesSubstrate = probe.motor === 1;

const TARGETS = Object.freeze([
  { word: 'red', action: 0 }, { word: 'green', action: 1 },
  { word: 'blue', action: 2 }, { word: 'yellow', action: 3 },
]);
const WORDS = Object.freeze([
  'red','green','blue','yellow','circle','square','triangle','star',
  'helps','helped','aid','harms','harmed','hurt','gives','given','supply','blocks','blocked','stop',
  'one','two','three','the','is','by'
]);
const CODE = new Map(WORDS.map((w, i) => [w, 1000 + i]));
const WORD = new Map([...CODE].map(([w, c]) => [c, w]));
const TEMPLATES = Object.freeze([t => ['the', t.word, 'one'], t => [t.word], t => ['the', t.word]]);
function rng(w) { w.rng = (Math.imul(w.rng >>> 0, 1664525) + 1013904223) >>> 0; return w.rng / 0x100000000; }
function choose(w, xs) { return xs[Math.floor(rng(w) * xs.length)]; }

const mind = clone(canonical);
const world = {
  rng: 0x51c1a11, pressure: [30, 8], request: null, utterance: [], tokenIndex: 0,
  speaker: 1, lastEffect: 70, interactions: 0, correct: 0, wrong: 0,
};
function startRequest() {
  const target = choose(world, TARGETS);
  world.request = target;
  world.utterance = choose(world, TEMPLATES)(target);
  world.tokenIndex = 0;
  world.speaker = 1 + Math.floor(rng(world) * 3);
  world.interactions++;
}
function sense() {
  if (!world.request) startRequest();
  return [11,12,13,14,31,41,51,CODE.get(world.utterance[world.tokenIndex]),world.speaker,world.lastEffect,...world.pressure];
}
function act(action) {
  const target = world.request;
  const targetWord = world.utterance[world.tokenIndex] === target.word;
  if (action === target.action) {
    world.correct++;
    world.pressure[0] = Math.max(0, Number((world.pressure[0] - 3).toFixed(3)));
    world.pressure[1] = Math.max(0, Number((world.pressure[1] - 0.4).toFixed(3)));
    world.lastEffect = 71;
    world.request = null;
    world.utterance = [];
    world.tokenIndex = 0;
  } else {
    world.wrong++;
    world.pressure[0] = Math.min(255, Number((world.pressure[0] + (targetWord ? 1 : 0.7)).toFixed(3)));
    world.pressure[1] = Math.min(255, Number((world.pressure[1] + 0.2).toFixed(3)));
    world.lastEffect = 72;
    world.tokenIndex = (world.tokenIndex + 1) % world.utterance.length;
  }
}

const before = mind.experiences.length;
for (let i = 0; i < STEPS; i++) { Mind.C(mind, sense()); act(mind.motor); }

const legacyPatterns = (mind.structure?.patterns || []).filter(p => p.active !== false);
const firstClassPatterns = (mind.knowledge?.relational_patterns || []).filter(p => p.active !== false);
const concepts = mind.knowledge?.relational_concepts || [];
function atomSpeech(a) { return a?.feature === 'p7'; }
function patternSpeech(p) { return p.target === 'p7' || (p.conditions || []).some(atomSpeech); }
function premiseSpeech(p) { return String(p?.relation) === 'p7'; }
const firstClassEnglish = firstClassPatterns.filter(patternSpeech);
const firstClassEnglishAction = firstClassEnglish.filter(p => p.target === 'action' || (p.conditions || []).some(a => a.feature === 'action'));
const firstClassEnglishConsequence = firstClassEnglish.filter(p =>
  /^relation_c\d+_order$/.test(p.target) || p.target === 'p9' ||
  (p.conditions || []).some(a => /^relation_c\d+_order$/.test(a.feature) || a.feature === 'p9'));
const englishConcepts = concepts.filter(c => (c.premises || []).some(premiseSpeech));
const recursiveConcepts = concepts.filter(c => (c.depth || 1) > 1);

const knowledgeFacts = mind.knowledge?.facts || [];
const livedContactsInKnowledge = new Set(knowledgeFacts.filter(f => typeof f.subject === 'string' && f.subject.startsWith('contact:')).map(f => f.subject)).size;
const nextLinks = knowledgeFacts.filter(f => f.relation === 'next').length;

const report = {
  kind: '42ndMind first-class relational-growth observation',
  mind_module: path.basename(mindPath),
  direct_unification: {
    structured_relation_completes_perception: perceptCrossesSubstrate,
    structured_relation_completes_action: actionCrossesSubstrate,
  },
  life: {
    steps: STEPS,
    experiences_before: before,
    experiences_after: mind.experiences.length,
    interactions: world.interactions,
    correct: world.correct,
    wrong: world.wrong,
    accuracy: Number((world.correct / Math.max(1, world.correct + world.wrong)).toFixed(4)),
    final_pressure: world.pressure,
  },
  first_class_growth: {
    knowledge_facts: knowledgeFacts.length,
    lived_contact_subjects: livedContactsInKnowledge,
    next_links: nextLinks,
    experience_relations_through: mind.knowledge?.experience_relations_through ?? null,
    relational_patterns: firstClassPatterns.length,
    relational_concepts: concepts.length,
    recursive_concepts: recursiveConcepts.length,
    maximum_concept_depth: concepts.reduce((m, c) => Math.max(m, c.depth || 1), 0),
    legacy_patterns_not_counted_as_authority: legacyPatterns.length,
  },
  english: {
    first_class_patterns_touching_english: firstClassEnglish.length,
    first_class_english_action_relations: firstClassEnglishAction.length,
    first_class_english_consequence_relations: firstClassEnglishConsequence.length,
    first_class_concepts_touching_english: englishConcepts.length,
    pattern_examples: firstClassEnglish.slice(0, 8),
    concept_examples: englishConcepts.slice(0, 8),
  },
};
if (REPORT) { fs.mkdirSync(path.dirname(REPORT), { recursive: true }); fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report, null, 2));
