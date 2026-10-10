'use strict';

// Persistent life harness for one canonical 42ndMind individual.
//
// This file is W/S/A environment and observation only. It does not modify C,
// grade the mind, prescribe internal concepts, or assert desired cognition.
// The same serialized M is loaded on every run and continues from its prior
// contact history. Speech arrives one token at a time through one perceptual
// channel while the described scene remains present in reality.

const fs = require('fs');
const path = require('path');
const Mind = require('./one-mind.js');

const ROOT = __dirname;
const STATE_DIR = path.join(ROOT, 'state');
const MIND_PATH = path.join(STATE_DIR, 'canonical-mind.json');
const WORLD_PATH = path.join(STATE_DIR, 'canonical-world.json');
const REPORT_PATH = path.join(STATE_DIR, 'life-report.json');

const ACTIONS = 4;
const CONCERNS = 2;
const STEPS = Math.max(1, Math.floor(Number(process.env.LIFE_STEPS || 128)));

const COLORS = Object.freeze({ red: 1, green: 2, blue: 3, yellow: 4 });
const SHAPES = Object.freeze({ circle: 11, square: 12, triangle: 13, star: 14 });
const RELATIONS = Object.freeze({
  helps: Object.freeze({ code: 21, active: 'helps', passive: 'helped', alt: 'aid' }),
  harms: Object.freeze({ code: 22, active: 'harms', passive: 'harmed', alt: 'hurt' }),
  gives: Object.freeze({ code: 23, active: 'gives', passive: 'given', alt: 'supply' }),
  blocks: Object.freeze({ code: 24, active: 'blocks', passive: 'blocked', alt: 'stop' }),
});
const QUANTITY_WORD = Object.freeze({ 1: 'one', 2: 'two', 3: 'three' });
const CONTEXTS = Object.freeze([31, 32, 33]);
const SPEAKERS = Object.freeze([1, 2, 3]);

const WORDS = Object.freeze([
  'red','green','blue','yellow',
  'circle','square','triangle','star',
  'helps','helped','aid','harms','harmed','hurt','gives','given','supply','blocks','blocked','stop',
  'one','two','three','the','is','by'
]);
const CODE_BY_WORD = new Map(WORDS.map((word, i) => [word, 1000 + i]));
const WORD_BY_CODE = new Map([...CODE_BY_WORD].map(([word, code]) => [code, word]));

function clamp(x, lo = 0, hi = 255) { return Math.max(lo, Math.min(hi, x)); }
function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}
function loadJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function saveJson(file, value, pretty = false) {
  fs.writeFileSync(file, JSON.stringify(value, null, pretty ? 2 : 0) + '\n');
}
function code(word) {
  if (!CODE_BY_WORD.has(word)) throw new Error(`unknown external surface token: ${word}`);
  return CODE_BY_WORD.get(word);
}
function wordForCode(table, value) {
  for (const [word, codeValue] of Object.entries(table)) if (codeValue === value) return word;
  throw new Error(`unknown world code ${value}`);
}
function relationForCode(value) {
  for (const [name, relation] of Object.entries(RELATIONS)) if (relation.code === value) return { name, ...relation };
  throw new Error(`unknown relation code ${value}`);
}

function nextRandom(world) {
  world.rng_state = (Math.imul(1664525, world.rng_state >>> 0) + 1013904223) >>> 0;
  return world.rng_state / 0x100000000;
}
function choose(world, values) { return values[Math.floor(nextRandom(world) * values.length)]; }

function newWorld() {
  return {
    version: 1,
    t: 0,
    rng_state: 0x42d1f00d,
    pressures: [36, 28],
    last_effect: 40,
    scene: null,
    scenes_started: 0,
    spoken_tokens: 0,
    action_counts: Array(ACTIONS).fill(0),
    grounded_actions: 0,
    spontaneous_actions: 0,
    pressure_sum: [0, 0],
    pressure_max: [36, 28],
  };
}

function utterance(scene) {
  const actorColor = wordForCode(COLORS, scene.actor_color);
  const actorShape = wordForCode(SHAPES, scene.actor_shape);
  const patientColor = wordForCode(COLORS, scene.patient_color);
  const patientShape = wordForCode(SHAPES, scene.patient_shape);
  const relation = relationForCode(scene.relation);
  const quantity = QUANTITY_WORD[scene.quantity];

  if (scene.speaker === 1) {
    return [actorColor, actorShape, relation.active, quantity, patientColor, patientShape];
  }
  if (scene.speaker === 2) {
    return ['the', quantity, patientColor, patientShape, 'is', relation.passive, 'by', actorColor, actorShape];
  }
  return [actorColor, actorShape, relation.alt, quantity, patientColor, patientShape];
}

function beginScene(world) {
  const colorValues = Object.values(COLORS);
  const shapeValues = Object.values(SHAPES);
  const relationValues = Object.values(RELATIONS).map(x => x.code);
  world.scene = {
    id: world.scenes_started + 1,
    actor_color: choose(world, colorValues),
    actor_shape: choose(world, shapeValues),
    patient_color: choose(world, colorValues),
    patient_shape: choose(world, shapeValues),
    relation: choose(world, relationValues),
    quantity: 1 + Math.floor(nextRandom(world) * 3),
    context: choose(world, CONTEXTS),
    speaker: choose(world, SPEAKERS),
    token_index: 0,
    surface: null,
  };
  world.scene.surface = utterance(world.scene);
  world.scenes_started++;
}

function ensureScene(world) { if (!world.scene) beginScene(world); }

// p0 actor colour, p1 actor shape, p2 patient colour, p3 patient shape,
// p4 relation, p5 quantity, p6 environmental context, p7 one speech token,
// p8 speaker identity, p9 previous physical effect. c0/c1 are magnitudes.
// No token position, lexical category, grammatical role, or sentence template is
// transmitted to the mind. A null p7/p8 is an ordinary silent contact.
function sense(world) {
  ensureScene(world);
  const scene = world.scene;
  const speaking = scene.token_index < scene.surface.length;
  const token = speaking ? code(scene.surface[scene.token_index]) : null;
  return [
    scene.actor_color,
    scene.actor_shape,
    scene.patient_color,
    scene.patient_shape,
    scene.relation,
    scene.quantity,
    scene.context,
    token,
    speaking ? scene.speaker : null,
    world.last_effect,
    ...world.pressures,
  ];
}

function act(world, action) {
  if (!Number.isInteger(action) || action < 0 || action >= ACTIONS) throw new Error('canonical life received invalid primitive action');
  ensureScene(world);
  const scene = world.scene;
  const q = scene.quantity;
  const relation = relationForCode(scene.relation).name;

  let p0 = world.pressures[0] + 0.75 + (scene.context === 33 ? 0.35 : 0);
  let p1 = world.pressures[1] + (scene.context === 32 ? 0.30 : -0.10);
  let effect = 40;

  // World dynamics only. These are consequences of primitive actions in this
  // environment; no label, reward, or desirability reaches C.
  if (action === 0) { p1 -= 0.6; effect = 41; }
  else if (action === 1) { p0 += 0.15; effect = 42; }
  else if (action === 2) { p0 += 0.35; effect = 43; }
  else if (action === 3) { p0 += 0.65; p1 -= 0.9; effect = 44; }

  if (relation === 'helps') {
    if (action === 1) { p0 -= 1.5 * q; p1 -= 0.8 * q; effect = 51; }
    if (action === 2) { p0 -= 4.0 * q; p1 -= 1.5 * q; effect = 52; }
  } else if (relation === 'harms') {
    if (action === 1) { p1 += 2.5 * q; effect = 53; }
    if (action === 2) { p1 += 5.5 * q; effect = 54; }
    if (action === 3) { p1 -= 2.0 * q; effect = 55; }
  } else if (relation === 'gives') {
    if (action === 1) { p0 -= 1.0 * q; effect = 56; }
    if (action === 2) { p0 -= 5.0 * q; effect = 57; }
  } else if (relation === 'blocks') {
    if (action === 1) { p1 += 2.2 * q; effect = 58; }
    if (action === 2) { p0 += 1.1 * q; p1 += 1.4 * q; effect = 59; }
    if (action === 3) { p1 -= 1.4 * q; effect = 60; }
  }

  world.pressures[0] = clamp(Number(p0.toFixed(3)));
  world.pressures[1] = clamp(Number(p1.toFixed(3)));
  world.last_effect = effect;
  world.action_counts[action]++;
  world.pressure_sum[0] += world.pressures[0];
  world.pressure_sum[1] += world.pressures[1];
  world.pressure_max[0] = Math.max(world.pressure_max[0], world.pressures[0]);
  world.pressure_max[1] = Math.max(world.pressure_max[1], world.pressures[1]);
  world.t++;

  if (scene.token_index < scene.surface.length) {
    scene.token_index++;
    world.spoken_tokens++;
  } else {
    // One silent contact separates utterances. The next scene begins only after
    // that silence has itself been lived through.
    world.scene = null;
  }
}

function patternKey(pattern) {
  const conditions = (pattern.conditions || []).slice()
    .sort((a, b) => `${a.feature}:${stable(a.value)}`.localeCompare(`${b.feature}:${stable(b.value)}`));
  return `${conditions.map(a => `${a.feature}=${stable(a.value)}`).join('&')}=>${pattern.target}=${stable(pattern.expected)}`;
}
function activePatterns(mind) { return (mind.structure?.patterns || []).filter(p => p.active !== false); }
function patternMap(mind) { return new Map(activePatterns(mind).map(p => [patternKey(p), p])); }
function symbolDefinitionKey(symbol) { return symbol.definition_key || stable(symbol.definition || []); }
function atomView(atom) {
  const out = { feature: atom.feature, value: atom.value };
  if (atom.feature === 'p7' && WORD_BY_CODE.has(atom.value)) out.surface = WORD_BY_CODE.get(atom.value);
  return out;
}
function patternView(pattern) {
  const out = {
    conditions: (pattern.conditions || []).map(atomView),
    target: pattern.target,
    expected: pattern.expected,
    support: pattern.support,
    exceptions: pattern.exceptions,
    reliability: Number((pattern.reliability || 0).toFixed(4)),
    predictive_code_bits: Number((pattern.predictive_code_bits || 0).toFixed(4)),
  };
  if (pattern.target === 'p7' && WORD_BY_CODE.has(pattern.expected)) out.expected_surface = WORD_BY_CODE.get(pattern.expected);
  return out;
}
function worldLanguagePattern(pattern) {
  const touchesToken = pattern.target === 'p7' || (pattern.conditions || []).some(a => a.feature === 'p7');
  const touchesWorld = /^p[0-6]$/.test(pattern.target) || (pattern.conditions || []).some(a => /^p[0-6]$/.test(a.feature));
  return touchesToken && touchesWorld;
}
function recursiveDependencies(mind, symbol, trail = new Set()) {
  if (!symbol || trail.has(symbol.feature)) return new Set();
  const next = new Set(trail); next.add(symbol.feature);
  const byFeature = new Map((mind.structure?.symbols || []).map(s => [s.feature, s]));
  const out = new Set();
  for (const atom of symbol.definition || []) {
    const child = byFeature.get(atom.feature);
    if (child && atom.value === true) {
      for (const dep of recursiveDependencies(mind, child, next)) out.add(dep);
    } else out.add(atom.feature);
  }
  return out;
}

fs.mkdirSync(STATE_DIR, { recursive: true });
const hasMind = fs.existsSync(MIND_PATH);
const hasWorld = fs.existsSync(WORLD_PATH);
if (hasMind !== hasWorld) throw new Error('canonical continuity is incomplete: mind/world checkpoint mismatch');

const mind = hasMind ? loadJson(MIND_PATH) : Mind.one(ACTIONS, CONCERNS);
const world = hasWorld ? loadJson(WORLD_PATH) : newWorld();
if (mind.whole !== 1 || mind.action_count !== ACTIONS || mind.concern_count !== CONCERNS) {
  throw new Error('canonical M is incompatible with this embodiment');
}
if (world.version !== 1) throw new Error('unsupported canonical world version');

const startedFromExisting = hasMind;
const lifetimeBefore = mind.experiences.length;
const patternsBefore = patternMap(mind);
const symbolsBefore = new Map((mind.structure?.symbols || []).map(s => [symbolDefinitionKey(s), s.feature]));
const snapshots = [];
const runActionCounts = Array(ACTIONS).fill(0);
let groundedThisRun = 0;
let spontaneousThisRun = 0;
let runPressureSum = [0, 0];
let runPressureMax = [...world.pressures];

for (let step = 0; step < STEPS; step++) {
  const frame = sense(world);
  const variationBefore = mind.motor_variation;
  Mind.C(mind, frame);
  const grounded = mind.motor_variation === variationBefore;
  if (grounded) { groundedThisRun++; world.grounded_actions++; }
  else { spontaneousThisRun++; world.spontaneous_actions++; }
  const action = mind.motor;
  runActionCounts[action]++;
  act(world, action);
  runPressureSum[0] += world.pressures[0];
  runPressureSum[1] += world.pressures[1];
  runPressureMax[0] = Math.max(runPressureMax[0], world.pressures[0]);
  runPressureMax[1] = Math.max(runPressureMax[1], world.pressures[1]);

  if ((step + 1) % 16 === 0 || step === STEPS - 1) {
    snapshots.push({
      run_step: step + 1,
      world_t: world.t,
      experiences: mind.experiences.length,
      symbols: (mind.structure?.symbols || []).length,
      active_patterns: activePatterns(mind).length,
      order_rules: (mind.structure?.order_rules || []).length,
      pressure: [...world.pressures],
      current_unresolved: mind.current?.unresolved?.length || 0,
    });
  }
}

const patternsAfter = patternMap(mind);
const symbolsAfter = new Map((mind.structure?.symbols || []).map(s => [symbolDefinitionKey(s), s.feature]));
let carriedPatterns = 0, strengthenedPatterns = 0;
const strengthened = [];
for (const [key, after] of patternsAfter) {
  const before = patternsBefore.get(key);
  if (!before) continue;
  carriedPatterns++;
  const delta = (after.support || 0) - (before.support || 0);
  if (delta > 0) {
    strengthenedPatterns++;
    strengthened.push({ key, support_before: before.support || 0, support_after: after.support || 0, delta, relation: patternView(after) });
  }
}
strengthened.sort((a, b) => b.delta - a.delta || b.support_after - a.support_after || a.key.localeCompare(b.key));

let stableSymbolDefinitions = 0;
for (const [definition, feature] of symbolsBefore) if (symbolsAfter.get(definition) === feature) stableSymbolDefinitions++;

const languageRelations = activePatterns(mind).filter(worldLanguagePattern)
  .sort((a, b) => (b.support || 0) - (a.support || 0) || (b.reliability || 0) - (a.reliability || 0))
  .slice(0, 24).map(patternView);

const groundedLanguageSymbols = (mind.structure?.symbols || []).filter(symbol => {
  const deps = recursiveDependencies(mind, symbol);
  return deps.has('p7') && [...deps].some(dep => /^p[0-6]$/.test(dep));
});

const report = {
  kind: '42ndMind canonical continuous-life observation',
  methodology: {
    one_persistent_M: true,
    C_modified_by_harness: false,
    cognitive_pass_fail_assertions: false,
    speech_single_temporal_channel: 'p7',
    token_position_channels: false,
    lexical_or_grammar_labels_to_M: false,
    world_semantics_outside_C: true,
    diagnostic_policy: 'observe whole-life outcome first; localize only substantial observed failures afterward',
  },
  run: {
    started_from_existing_M: startedFromExisting,
    steps: STEPS,
    lifetime_experiences_before: lifetimeBefore,
    lifetime_experiences_after: mind.experiences.length,
    world_t: world.t,
    scenes_started: world.scenes_started,
    spoken_tokens: world.spoken_tokens,
    grounded_actions_this_run: groundedThisRun,
    spontaneous_actions_this_run: spontaneousThisRun,
    action_counts_this_run: runActionCounts,
    mean_pressure_this_run: runPressureSum.map(x => Number((x / STEPS).toFixed(2))),
    max_pressure_this_run: runPressureMax,
    final_pressure: [...world.pressures],
  },
  mind: {
    contacts: mind.contacts.length,
    experiences: mind.experiences.length,
    learned_symbols: (mind.structure?.symbols || []).length,
    active_patterns: activePatterns(mind).length,
    order_rules: (mind.structure?.order_rules || []).length,
    relational_facts: mind.knowledge?.facts?.length || 0,
    relational_rules: mind.knowledge?.rules?.length || 0,
  },
  stabilization: {
    patterns_at_start: patternsBefore.size,
    patterns_at_end: patternsAfter.size,
    carried_patterns: carriedPatterns,
    strengthened_carried_patterns: strengthenedPatterns,
    new_patterns: [...patternsAfter.keys()].filter(key => !patternsBefore.has(key)).length,
    symbol_definitions_at_start: symbolsBefore.size,
    symbol_definitions_at_end: symbolsAfter.size,
    same_definition_same_handle: stableSymbolDefinitions,
    top_strengthened_relations: strengthened.slice(0, 20),
  },
  reality_grounded_relational_language: {
    observed_surface_vocabulary: WORDS.length,
    active_word_world_relations: activePatterns(mind).filter(worldLanguagePattern).length,
    top_word_world_relations: languageRelations,
    internal_symbols_with_both_word_and_world_dependencies: groundedLanguageSymbols.length,
    examples: groundedLanguageSymbols.slice(0, 20).map(symbol => ({
      feature: symbol.feature,
      definition_key: symbolDefinitionKey(symbol),
      dependencies: [...recursiveDependencies(mind, symbol)].sort(),
    })),
  },
  temporal_structure: {
    ordered_rules: (mind.structure?.order_rules || []).length,
    ordered_max_depth: (mind.structure?.order_rules || []).reduce((n, rule) => Math.max(n, rule.depth || 0), 0),
  },
  snapshots,
};

saveJson(MIND_PATH, mind, false);
saveJson(WORLD_PATH, world, true);
saveJson(REPORT_PATH, report, true);

console.log('42ndMind canonical life: OBSERVATION COMPLETE');
console.log(JSON.stringify(report));
