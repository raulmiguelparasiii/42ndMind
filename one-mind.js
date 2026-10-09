'use strict';

// 42ndMind: one state, one update, one developmental authority.
//
//   M(t+1) = C(M(t) ⊕ R(t+1))
//
// Reality-contact is retained exactly. C repeatedly redescribes that one lived
// record with shorter reusable relations. Co-presence and succession are not
// separate faculties; both are relations already present in experience. Learned
// descriptions feed back into the same M and can disappear or reorganize when
// later reality makes another description shorter.
//
// Nothing here names food, water, danger, shelter, reward, success, curiosity,
// scenes, goals, plans, or good actions. Motor continuation is a missing term of
// the same current relation. If reality has not grounded a completion, cognition
// remains unresolved and embodiment contributes non-semantic motor variation.

const LESS = 'less';
const SAME = 'same';
const GREATER = 'greater';

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}
function same(a, b) { return stable(a) === stable(b); }
function unique(values) {
  const seen = new Map();
  for (const value of values || []) seen.set(stable(value), value);
  return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, value]) => value);
}
function entropyBinary(successes, total) {
  if (!total || successes <= 0 || successes >= total) return 0;
  const p = successes / total, q = 1 - p;
  return -p * Math.log2(p) - q * Math.log2(q);
}
function atomKey(atom) { return `${atom.feature}=${stable(atom.value)}`; }
function conditionKey(conditions) {
  return conditions.slice().sort((a, b) => atomKey(a).localeCompare(atomKey(b))).map(atomKey).join('&');
}
function combinations(items, maxSize) {
  const out = [];
  function visit(start, chosen) {
    if (chosen.length) out.push(chosen.slice());
    if (chosen.length >= maxSize) return;
    for (let i = start; i < items.length; i++) {
      chosen.push(items[i]);
      visit(i + 1, chosen);
      chosen.pop();
    }
  }
  visit(0, []);
  return out;
}
function sampleHas(values, atom) {
  return Object.prototype.hasOwnProperty.call(values, atom.feature) && same(values[atom.feature], atom.value);
}
function normalizeSamples(input) {
  return input.map((sample, i) => {
    const id = String(sample.id || `s${i + 1}`);
    const source = sample.values || sample;
    const values = {};
    for (const key of Object.keys(source).sort()) {
      if (key === 'id' || source[key] === undefined) continue;
      values[String(key)] = source[key];
    }
    return { id, values };
  });
}

function splitContact(state, frame) {
  const cut = frame.length - state.concern_count;
  return { percept: frame.slice(0, cut), concern: frame.slice(cut) };
}
function magnitudeOrder(after, before) {
  if (after < before) return LESS;
  if (after > before) return GREATER;
  return SAME;
}

// Channel boundaries are supplied by the physical interface. Exposing each
// channel separately is decomposition of contact, not a human-authored scene.
// Arbitrary percept codes are never subtracted or given metric meaning.
function presentFeatures(state, frame) {
  const contact = splitContact(state, frame);
  const values = {};
  for (let i = 0; i < contact.percept.length; i++) values[`p${i}`] = contact.percept[i];
  for (let i = 0; i < contact.concern.length; i++) {
    values[`c${i}`] = contact.concern[i];
    values[`c${i}_open`] = contact.concern[i] > 0;
  }
  return { contact, values };
}

function directSamples(state) {
  return state.experiences.map((experience, index) => {
    const start = presentFeatures(state, experience.before);
    const end = splitContact(state, experience.after);
    const values = { ...start.values, action: experience.action, relation_kind: 'direct', relation_depth: 0 };
    for (let i = 0; i < state.concern_count; i++) {
      const order = magnitudeOrder(end.concern[i], start.contact.concern[i]);
      values[`immediate_c${i}_order`] = order;
      values[`relation_c${i}_order`] = order;
    }
    return { id: `e${index}`, values };
  });
}

// ---------- one description search over simultaneous relations ----------

function symbolDependencies(symbol, byFeature, trail = new Set()) {
  if (trail.has(symbol.feature)) return new Set();
  const nextTrail = new Set(trail); nextTrail.add(symbol.feature);
  const out = new Set();
  for (const atom of symbol.definition) {
    const nested = byFeature.get(atom.feature);
    if (nested) for (const feature of symbolDependencies(nested, byFeature, nextTrail)) out.add(feature);
    else out.add(atom.feature);
  }
  return out;
}

function augment(rawSamples, symbols) {
  const samples = normalizeSamples(rawSamples).map(x => ({ id: x.id, values: { ...x.values } }));
  const ordered = symbols.slice().sort((a, b) => a.depth - b.depth || a.feature.localeCompare(b.feature));
  for (const symbol of ordered) {
    for (const sample of samples) {
      if (!symbol.definition.every(atom => Object.prototype.hasOwnProperty.call(sample.values, atom.feature))) continue;
      sample.values[symbol.feature] = symbol.definition.every(atom => sampleHas(sample.values, atom));
    }
  }
  return samples;
}

function addIndex(index, key, sampleIndex) {
  if (!index.has(key)) index.set(key, new Set());
  index.get(key).add(sampleIndex);
}
function intersectionValues(sets) {
  if (!sets.length || sets.some(set => !set || set.size === 0)) return [];
  const ordered = sets.slice().sort((a, b) => a.size - b.size);
  const out = [];
  outer: for (const value of ordered[0]) {
    for (let i = 1; i < ordered.length; i++) if (!ordered[i].has(value)) continue outer;
    out.push(value);
  }
  return out;
}
function intersectionCount(sets) { return intersectionValues(sets).length; }

function learnPatterns(samplesInput, symbols, maxConditions = 2) {
  const samples = normalizeSamples(samplesInput);
  const featureValues = {};
  const atomSupport = new Map();
  const featureIndex = new Map();
  const atomIndex = new Map();
  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
    const values = samples[sampleIndex].values;
    for (const [feature, value] of Object.entries(values)) {
      featureValues[feature] = unique([...(featureValues[feature] || []), value]);
      const key = atomKey({ feature, value });
      atomSupport.set(key, (atomSupport.get(key) || 0) + 1);
      addIndex(featureIndex, feature, sampleIndex);
      addIndex(atomIndex, key, sampleIndex);
    }
  }
  const features = Object.keys(featureValues).sort();
  if (samples.length < 4 || features.length < 2) return [];

  const byFeature = new Map(symbols.map(s => [s.feature, s]));
  const dependencyCache = new Map();
  function dependencies(feature) {
    if (!byFeature.has(feature)) return new Set([feature]);
    if (!dependencyCache.has(feature)) dependencyCache.set(feature, symbolDependencies(byFeature.get(feature), byFeature));
    return dependencyCache.get(feature);
  }

  // A reusable condition must occur at least twice because the unchanged learner
  // below rejects matched sets smaller than two. Build each such condition once.
  const reusableAtoms = samples.map(({ values }) => Object.keys(values).sort()
    .map(feature => ({ feature, value: values[feature] }))
    .filter(atom => (atomSupport.get(atomKey(atom)) || 0) >= 2));
  const conditions = new Map();
  for (const atoms of reusableAtoms) {
    for (const condition of combinations(atoms, Math.min(maxConditions, atoms.length))) {
      const key = conditionKey(condition);
      if (!conditions.has(key)) conditions.set(key, condition.map(atom => ({ ...atom })));
    }
  }

  const atomCount = features.reduce((n, f) => n + featureValues[f].length, 0);
  const modelUnit = Math.log2(Math.max(2, atomCount + features.length));
  const patterns = [];

  // A condition is evaluated once. Only target/value pairs actually present in
  // the experiences matched by that condition can possibly gain support from it.
  // This is exactly the candidate set of the former evidence-local generation,
  // without regenerating the same condition for every target in every sample.
  for (const condition of conditions.values()) {
    const conditionAtomSets = condition.map(atom => atomIndex.get(atomKey(atom)));
    const matchedIndices = intersectionValues(conditionAtomSets);
    if (matchedIndices.length < 2) continue;

    const possibleTargets = new Map();
    for (const sampleIndex of matchedIndices) {
      const values = samples[sampleIndex].values;
      for (const [target, expected] of Object.entries(values)) {
        if (condition.some(atom => atom.feature === target || dependencies(atom.feature).has(target))) continue;
        const key = `${target}=>${stable(expected)}`;
        if (!possibleTargets.has(key)) possibleTargets.set(key, { target, expected });
      }
    }

    const conditionFeatures = condition.map(atom => atom.feature);
    const conditionFeatureSets = conditionFeatures.map(feature => featureIndex.get(feature));
    const modelBits = (condition.length + 1) * modelUnit;

    for (const { target, expected } of possibleTargets.values()) {
      const targetPresence = featureIndex.get(target);
      const targetExpectedSet = atomIndex.get(atomKey({ feature: target, value: expected }));
      const eligible = intersectionCount([targetPresence, ...conditionFeatureSets]);
      if (eligible < 4) continue;
      const matched = intersectionCount([targetPresence, ...conditionAtomSets]);
      const unmatched = eligible - matched;
      if (matched < 2 || unmatched < 2) continue;

      const totalExpected = intersectionCount([targetExpectedSet, ...conditionFeatureSets]);
      const matchedExpected = intersectionCount([targetExpectedSet, ...conditionAtomSets]);
      const unmatchedExpected = totalExpected - matchedExpected;
      const baseRate = totalExpected / eligible;
      const matchedRate = matchedExpected / matched;
      if (matchedRate <= baseRate) continue;

      const baseBits = eligible * entropyBinary(totalExpected, eligible);
      const residualBits = matched * entropyBinary(matchedExpected, matched) + unmatched * entropyBinary(unmatchedExpected, unmatched);
      const bitsSaved = baseBits - residualBits - modelBits;
      if (!(bitsSaved > 0)) continue;

      const smoothed = (matchedExpected + 1) / (matched + 2);
      patterns.push({
        conditions: condition.slice().sort((a, b) => atomKey(a).localeCompare(atomKey(b))),
        target,
        expected,
        support: matchedExpected,
        exceptions: matched - matchedExpected,
        covered: matched,
        eligible,
        reliability: matchedRate,
        smoothed_reliability: smoothed,
        base_rate: baseRate,
        bits_saved: bitsSaved,
        predictive_code_bits: -Math.log2(smoothed) + modelBits / eligible,
      });
    }
  }

  patterns.sort((a, b) =>
    a.predictive_code_bits - b.predictive_code_bits ||
    b.bits_saved - a.bits_saved ||
    a.conditions.length - b.conditions.length ||
    conditionKey(a.conditions).localeCompare(conditionKey(b.conditions)) ||
    a.target.localeCompare(b.target)
  );
  return patterns.slice(0, 96);
}

function recompressRelations(rawSamples) {
  let symbols = [];
  let patterns = [];
  const existingDefinitions = new Set();
  for (let pass = 0; pass < 2; pass++) {
    const samples = augment(rawSamples, symbols);
    patterns = learnPatterns(samples, symbols, 2);
    const winners = [];
    const seenTargets = new Set();
    for (const pattern of patterns) {
      const key = `${pattern.target}=>${stable(pattern.expected)}`;
      if (seenTargets.has(key)) continue;
      seenTargets.add(key);
      winners.push(pattern);
    }

    const byFeature = new Map(symbols.map(s => [s.feature, s]));
    const additions = [];
    for (const pattern of winners) {
      if (pattern.conditions.length < 2) continue;
      if (pattern.conditions.some(atom => byFeature.has(atom.feature) && atom.value !== true)) continue;
      const definitionKey = conditionKey(pattern.conditions);
      if (existingDefinitions.has(definitionKey)) continue;
      const depth = 1 + pattern.conditions.reduce((m, atom) => Math.max(m, byFeature.get(atom.feature)?.depth || 0), 0);
      additions.push({
        feature: `§${symbols.length + additions.length + 1}`,
        depth,
        definition: pattern.conditions.map(a => ({ ...a })),
        definition_key: definitionKey,
        source: { target: pattern.target, expected: pattern.expected, bits_saved: pattern.bits_saved },
      });
      existingDefinitions.add(definitionKey);
      if (additions.length >= 8) break;
    }
    if (!additions.length) break;
    symbols = [...symbols, ...additions];
  }

  patterns = learnPatterns(augment(rawSamples, symbols), symbols, 2).map((p, i) => ({ ...p, id: `r${i + 1}` }));
  return { symbols, patterns };
}

function expandPartial(values, symbols) {
  return augment([{ id: 'query', values }], symbols)[0].values;
}
function predict(structure, partialValues) {
  const values = expandPartial(partialValues, structure.symbols);
  const active = structure.patterns.filter(pattern =>
    !Object.prototype.hasOwnProperty.call(values, pattern.target) &&
    pattern.conditions.every(atom => sampleHas(values, atom))
  ).sort((a, b) =>
    a.predictive_code_bits - b.predictive_code_bits ||
    b.bits_saved - a.bits_saved ||
    b.covered - a.covered ||
    a.id.localeCompare(b.id)
  );
  const best = {};
  for (const pattern of active) if (!(pattern.target in best)) best[pattern.target] = pattern;
  return { expanded: values, active, best_by_target: best };
}

// ---------- the same description search over succession ----------

function baseToken(event) { return `e:${stable(event)}`; }
function nonOverlappingOccurrences(sequence, pair) {
  let count = 0;
  for (let i = 0; i < sequence.length - 1;) {
    if (sequence[i] === pair[0] && sequence[i + 1] === pair[1]) { count++; i += 2; }
    else i++;
  }
  return count;
}
function replacePair(sequence, pair, symbol) {
  const out = [];
  for (let i = 0; i < sequence.length;) {
    if (i + 1 < sequence.length && sequence[i] === pair[0] && sequence[i + 1] === pair[1]) { out.push(symbol); i += 2; }
    else out.push(sequence[i++]);
  }
  return out;
}
function expandToken(token, bySymbol, trail = new Set()) {
  const rule = bySymbol.get(token);
  if (!rule) return [token];
  if (trail.has(token)) throw new Error(`cyclic learned description: ${token}`);
  const next = new Set(trail); next.add(token);
  return rule.expansion.flatMap(part => expandToken(part, bySymbol, next));
}
function sequenceDescriptionLength(encodedLength, ruleCount) { return encodedLength + ruleCount * 3; }
function bestPair(sequence, ruleCount) {
  const pairs = new Map();
  for (let i = 0; i < sequence.length - 1; i++) {
    const pair = [sequence[i], sequence[i + 1]];
    const key = stable(pair);
    if (!pairs.has(key)) pairs.set(key, pair);
  }
  let best = null;
  for (const pair of pairs.values()) {
    const occurrences = nonOverlappingOccurrences(sequence, pair);
    if (occurrences < 2) continue;
    const savings = sequenceDescriptionLength(sequence.length, ruleCount) - sequenceDescriptionLength(sequence.length - occurrences, ruleCount + 1);
    if (!(savings > 0)) continue;
    const candidate = { pair, occurrences, savings };
    if (!best || candidate.savings > best.savings ||
        (candidate.savings === best.savings && candidate.occurrences > best.occurrences) ||
        (candidate.savings === best.savings && candidate.occurrences === best.occurrences && stable(candidate.pair) < stable(best.pair))) best = candidate;
  }
  return best;
}
function recompressSequence(events) {
  const rawTokens = events.map(baseToken);
  let sequence = rawTokens.slice();
  const rules = [];
  for (let i = 0; i < 64; i++) {
    const winner = bestPair(sequence, rules.length);
    if (!winner) break;
    const symbol = `§q${rules.length + 1}`;
    const bySymbol = new Map(rules.map(rule => [rule.symbol, rule]));
    const depth = 1 + winner.pair.reduce((m, token) => Math.max(m, bySymbol.get(token)?.depth || 0), 0);
    rules.push({ symbol, expansion: winner.pair.slice(), depth, occurrences_at_birth: winner.occurrences, savings: winner.savings });
    sequence = replacePair(sequence, winner.pair, symbol);
  }
  const bySymbol = new Map(rules.map(rule => [rule.symbol, rule]));
  const decoded = sequence.flatMap(token => expandToken(token, bySymbol));
  if (!same(decoded, rawTokens)) throw new Error('recompression changed experienced order');
  return { raw_tokens: rawTokens, encoded_stream: sequence, rules };
}
function learnedExpansions(sequenceStructure) {
  const bySymbol = new Map(sequenceStructure.rules.map(r => [r.symbol, r]));
  return sequenceStructure.rules.map(rule => ({
    symbol: rule.symbol,
    depth: rule.depth,
    expansion: rule.expansion.flatMap(token => expandToken(token, bySymbol)).map(token => JSON.parse(token.slice(2))),
    savings: rule.savings,
  }));
}

// Temporal output may guide later judgment but cannot ground its own existence.
function baseDependencies(feature, byFeature, trail = new Set()) {
  const symbol = byFeature.get(feature);
  if (!symbol) return new Set([feature]);
  if (trail.has(feature)) return new Set();
  const nextTrail = new Set(trail); nextTrail.add(feature);
  const out = new Set();
  for (const atom of symbol.definition) {
    for (const dependency of baseDependencies(atom.feature, byFeature, nextTrail)) out.add(dependency);
  }
  return out;
}
function groundedSymbols(structure) {
  const byFeature = new Map(structure.symbols.map(symbol => [symbol.feature, symbol]));
  const safe = new Set();
  for (const symbol of structure.symbols) {
    const dependencies = baseDependencies(symbol.feature, byFeature);
    if ([...dependencies].every(feature => !feature.startsWith('relation_'))) safe.add(symbol.feature);
  }
  return safe;
}
function eventToken(state, structure, sample) {
  const expanded = expandPartial(sample.values, structure.symbols);
  const grounded = groundedSymbols(structure);
  const learned = Object.keys(expanded).filter(key => key.startsWith('§') && expanded[key] === true && grounded.has(key)).sort();
  const orders = [];
  for (let i = 0; i < state.concern_count; i++) orders.push(sample.values[`immediate_c${i}_order`]);
  return { action: sample.values.action, orders, learned };
}
function occurrenceAt(tokens, start, expansion) {
  if (start + expansion.length > tokens.length) return false;
  for (let j = 0; j < expansion.length; j++) if (!same(tokens[start + j], expansion[j])) return false;
  return true;
}
function temporalDescriptions(samples, tokens, sequenceStructure) {
  const descriptions = Array(samples.length).fill(null);
  for (const learned of learnedExpansions(sequenceStructure)) {
    const length = learned.expansion.length;
    if (length < 2) continue;
    for (let i = 0; i + length <= tokens.length; i++) {
      if (!occurrenceAt(tokens, i, learned.expansion)) continue;
      const candidate = { symbol: learned.symbol, depth: learned.depth, length, savings: learned.savings };
      const old = descriptions[i];
      if (!old || candidate.savings > old.savings ||
          (candidate.savings === old.savings && candidate.depth > old.depth) ||
          (candidate.savings === old.savings && candidate.depth === old.depth && candidate.length > old.length)) descriptions[i] = candidate;
    }
  }
  return descriptions;
}
function annotateTemporalRelations(state, baseSamples, descriptions) {
  return baseSamples.map((sample, index) => {
    const values = { ...sample.values };
    const description = descriptions[index];
    if (!description) return { id: sample.id, values };
    const first = state.experiences[index];
    const last = state.experiences[index + description.length - 1];
    if (!first || !last) return { id: sample.id, values };
    const before = splitContact(state, first.before).concern;
    const after = splitContact(state, last.after).concern;
    values.relation_kind = 'ordered';
    values.relation_depth = description.depth;
    values.relation_symbol = description.symbol;
    values.relation_extent = description.length;
    for (let i = 0; i < state.concern_count; i++) values[`relation_c${i}_order`] = magnitudeOrder(after[i], before[i]);
    return { id: sample.id, values };
  });
}

function recompressWhole(state) {
  const base = directSamples(state);
  if (base.length < 4) return { samples: base, symbols: [], patterns: [], tokens: [], order_rules: [], encoded_order: [], fixed_point_passes: 0 };

  let samples = base;
  let learned = { symbols: [], patterns: [] };
  let tokens = [];
  let sequence = { encoded_stream: [], rules: [] };
  let previousKey = '';
  let passes = 0;
  for (let pass = 0; pass < 3; pass++) {
    learned = recompressRelations(samples);
    tokens = samples.map(sample => eventToken(state, learned, sample));
    sequence = recompressSequence(tokens);
    const next = annotateTemporalRelations(state, base, temporalDescriptions(samples, tokens, sequence));
    const key = stable(next.map(x => x.values));
    samples = next;
    passes = pass + 1;
    if (key === previousKey) break;
    previousKey = key;
  }
  learned = recompressRelations(samples);
  return { samples, symbols: learned.symbols, patterns: learned.patterns, tokens, order_rules: sequence.rules, encoded_order: sequence.encoded_stream, fixed_point_passes: passes };
}

function groundedCompletion(state, frame) {
  if (state.experiences.length < 4 || !state.structure.patterns.length) return null;
  const present = presentFeatures(state, frame);
  const purpose = { ...present.values };
  let open = 0;
  for (let i = 0; i < state.concern_count; i++) {
    if (present.contact.concern[i] > 0) { purpose[`relation_c${i}_order`] = LESS; open++; }
  }
  if (!open) return null;

  // Missing terms of the current relation can expose further missing terms, but
  // no candidate future is generated or scored. Equal-code rivals stay unresolved.
  const completed = { ...purpose };
  for (let pass = 0; pass < 4; pass++) {
    const prediction = predict(state.structure, completed);
    let changed = false;
    for (const [target, relation] of Object.entries(prediction.best_by_target)) {
      if (Object.prototype.hasOwnProperty.call(completed, target)) continue;
      const rival = prediction.active.find(other => other.target === target && !same(other.expected, relation.expected) && Math.abs(other.predictive_code_bits - relation.predictive_code_bits) < 1e-9);
      if (rival) continue;
      completed[target] = relation.expected;
      changed = true;
    }
    if (!changed) break;
  }
  const action = completed.action;
  if (!Number.isInteger(action) || action < 0 || action >= state.action_count) return null;

  const consequences = predict(state.structure, { ...present.values, action }).best_by_target;
  for (let i = 0; i < state.concern_count; i++) {
    const evidence = consequences[`relation_c${i}_order`];
    if (evidence && evidence.expected === GREATER) return null;
  }
  return action;
}

function spontaneousMotor(state) {
  state.motor_variation = (Math.imul(state.motor_variation, 1664525) + 1013904223) >>> 0;
  return state.motor_variation % state.action_count;
}

function one(actionCount, concernCount = 1) {
  if (!Number.isInteger(actionCount) || actionCount < 1) throw new Error('actionCount must be positive');
  if (!Number.isInteger(concernCount) || concernCount < 1) throw new Error('concernCount must be positive');
  return {
    whole: 1,
    action_count: actionCount,
    concern_count: concernCount,
    contacts: [],
    experiences: [],
    previous_contact: null,
    motor: null,
    motor_variation: (0x9e3779b9 ^ actionCount ^ (concernCount << 8)) >>> 0,
    structure: { samples: [], symbols: [], patterns: [], tokens: [], order_rules: [], encoded_order: [], fixed_point_passes: 0 },
    prior: {
      stone: 'materially relevant relations remain answerable to reality; Stone signs are cognitive orientations, never outcome valence',
      onelogic: 'preserve undefeated possibilities; complete only what grounded relations warrant; unresolved stays unresolved; counterevidence reopens descriptions',
      embodiment: 'distinct perceptual channels, motor possibilities, and interoceptive pressure magnitudes are primitive physical interfaces, not learned world semantics',
      law: 'M(t+1)=C(M(t)⊕R(t+1)); C recursively recompresses the one exact lived record and reuses its own shorter descriptions',
    },
  };
}

function C(state, realityContact) {
  if (!state || state.whole !== 1) throw new Error('C requires one whole mind');
  if (!Array.isArray(realityContact) || realityContact.length <= state.concern_count) throw new Error('invalid reality-contact');
  if (!realityContact.every(Number.isFinite)) throw new Error('reality-contact must be finite numeric perception');
  const frame = realityContact.slice();
  if (state.previous_contact && state.motor != null) {
    state.experiences.push({ before: state.previous_contact.slice(), action: state.motor, after: frame.slice() });
    state.structure = recompressWhole(state);
  }
  state.contacts.push(frame.slice());
  state.previous_contact = frame;
  const completion = groundedCompletion(state, frame);
  state.motor = completion == null ? spontaneousMotor(state) : completion;
  return state;
}

module.exports = { one, C };
