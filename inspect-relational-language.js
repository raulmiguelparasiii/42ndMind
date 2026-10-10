'use strict';

// Observation only. Reads the persisted canonical M and reports whether learned
// relations connect the speech channel (including learned temporal speech
// relations) to world-grounded perceptual channels. It does not alter M or C.

const fs = require('fs');

const mind = JSON.parse(fs.readFileSync('state/canonical-mind.json', 'utf8'));
const WORDS = [
  'red','green','blue','yellow',
  'circle','square','triangle','star',
  'helps','helped','aid','harms','harmed','hurt','gives','given','supply','blocks','blocked','stop',
  'one','two','three','the','is','by'
];
const WORD_BY_CODE = new Map(WORDS.map((word, i) => [1000 + i, word]));
const ordinary = new Map((mind.structure?.symbols || []).map(s => [s.feature, s]));
const temporal = new Map((mind.structure?.temporal_symbols || []).map(s => [s.feature, s]));

function dependencies(feature, trail = new Set()) {
  if (trail.has(feature)) return new Set();
  const next = new Set(trail); next.add(feature);
  if (temporal.has(feature)) return new Set([temporal.get(feature).channel]);
  const symbol = ordinary.get(feature);
  if (!symbol) return new Set([feature]);
  const out = new Set();
  for (const atom of symbol.definition || []) {
    if (atom.value === true && (ordinary.has(atom.feature) || temporal.has(atom.feature))) {
      for (const dep of dependencies(atom.feature, next)) out.add(dep);
    } else out.add(atom.feature);
  }
  return out;
}

function featureTouchesSpeech(feature) { return dependencies(feature).has('p7'); }
function featureTouchesWorld(feature) {
  for (const dep of dependencies(feature)) if (/^p[0-6]$/.test(dep)) return true;
  return false;
}
function atomTouchesSpeech(atom) { return atom.feature === 'p7' || featureTouchesSpeech(atom.feature); }
function atomTouchesWorld(atom) { return /^p[0-6]$/.test(atom.feature) || featureTouchesWorld(atom.feature); }
function phraseFor(feature) {
  const t = temporal.get(feature);
  if (!t || t.channel !== 'p7') return null;
  return (t.expansion || []).map(value => WORD_BY_CODE.get(value) || value);
}
function featureView(feature) {
  const out = { feature, dependencies: [...dependencies(feature)].sort() };
  const phrase = phraseFor(feature);
  if (phrase) out.surface_sequence = phrase;
  return out;
}

const active = (mind.structure?.patterns || []).filter(p => p.active !== false);
const joined = [];
for (const pattern of active) {
  const conditionSpeech = (pattern.conditions || []).some(atomTouchesSpeech);
  const conditionWorld = (pattern.conditions || []).some(atomTouchesWorld);
  const targetSpeech = featureTouchesSpeech(pattern.target);
  const targetWorld = featureTouchesWorld(pattern.target);
  const bridges = (conditionSpeech && targetWorld) || (conditionWorld && targetSpeech) ||
    ((conditionSpeech || targetSpeech) && (conditionWorld || targetWorld));
  if (!bridges) continue;
  joined.push({
    conditions: (pattern.conditions || []).map(atom => ({
      feature: atom.feature,
      value: atom.value,
      ...(phraseFor(atom.feature) ? { surface_sequence: phraseFor(atom.feature) } : {}),
    })),
    target: pattern.target,
    expected: pattern.expected,
    ...(phraseFor(pattern.target) ? { target_surface_sequence: phraseFor(pattern.target) } : {}),
    support: pattern.support,
    exceptions: pattern.exceptions,
    reliability: pattern.reliability,
    predictive_code_bits: pattern.predictive_code_bits,
  });
}
joined.sort((a, b) => (b.support || 0) - (a.support || 0) || (b.reliability || 0) - (a.reliability || 0));

const groundedSymbols = [];
for (const symbol of mind.structure?.symbols || []) {
  const deps = dependencies(symbol.feature);
  const speech = deps.has('p7');
  const world = [...deps].some(dep => /^p[0-6]$/.test(dep));
  if (speech && world) groundedSymbols.push(featureView(symbol.feature));
}

const speechTemporal = [...temporal.values()]
  .filter(s => s.channel === 'p7')
  .map(s => ({
    feature: s.feature,
    support: s.support,
    depth: s.depth,
    surface_sequence: (s.expansion || []).map(value => WORD_BY_CODE.get(value) || value),
  }))
  .sort((a, b) => (b.support || 0) - (a.support || 0));

const report = {
  experiences: mind.experiences?.length || 0,
  ordinary_symbols: mind.structure?.symbols?.length || 0,
  temporal_symbols: mind.structure?.temporal_symbols?.length || 0,
  speech_temporal_relations: speechTemporal.length,
  top_speech_temporal_relations: speechTemporal.slice(0, 20),
  active_speech_world_relations: joined.length,
  top_speech_world_relations: joined.slice(0, 30),
  internal_symbols_grounded_in_both_speech_and_world: groundedSymbols.length,
  grounded_symbol_examples: groundedSymbols.slice(0, 20),
};

fs.writeFileSync('state/relational-language-report.json', JSON.stringify(report, null, 2) + '\n');
console.log('RELATIONAL_LANGUAGE ' + JSON.stringify(report));
