'use strict';

// 42ndMind: one state, one update, one developmental authority.
//
//   M(t+1) = C(M(t) ⊕ R(t+1))
//
// Reality-contact is retained exactly. C keeps reusable relations it has found,
// assimilates each new contact directly into them, and reopens the accumulated
// record when unresolved residual reality has grown enough to justify another
// global description search. Learned concept definitions remain part of M across
// later recompressions; predictive relations to those concepts remain corrigible.

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

function directSample(state, experience, index) {
  const start = presentFeatures(state, experience.before);
  const end = splitContact(state, experience.after);
  const values = {
    ...start.values,
    action: experience.action,
    relation_depth: 0,
    relation_extent: 1,
    relation_symbol: null,
  };
  for (let i = 0; i < state.concern_count; i++) {
    const order = magnitudeOrder(end.concern[i], start.contact.concern[i]);
    values[`immediate_c${i}_order`] = order;
    values[`relation_c${i}_order`] = order;
  }
  return { id: `e${index}`, values };
}
function directSamples(state) {
  return state.experiences.map((experience, index) => directSample(state, experience, index));
}

// ---------- the one description search over simultaneous relations ----------

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
      // A learned symbol is a positive compressed chunk. It is present when its
      // entire grounded definition is present; non-occurrence is not materialized
      // as a second feature-value on every sample. This keeps the learned language
      // sparse while raw grounding remains exact underneath it.
      if (!symbol.definition.every(atom => Object.prototype.hasOwnProperty.call(sample.values, atom.feature))) continue;
      if (symbol.definition.every(atom => sampleHas(sample.values, atom))) sample.values[symbol.feature] = true;
    }
  }
  return samples;
}

function featureEvaluable(values, feature, byFeature) {
  const symbol = byFeature.get(feature);
  if (!symbol) return Object.prototype.hasOwnProperty.call(values, feature);
  const dependencies = symbolDependencies(symbol, byFeature);
  return dependencies.size > 0 && [...dependencies].every(dep => Object.prototype.hasOwnProperty.call(values, dep));
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
  const domainCache = new Map();
  function domain(feature) {
    if (domainCache.has(feature)) return domainCache.get(feature);
    const basis = byFeature.has(feature) ? [...dependencies(feature)] : [feature];
    const set = new Set(intersectionValues(basis.map(dep => featureIndex.get(dep))));
    domainCache.set(feature, set);
    return set;
  }

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

  // Sparse learned concepts are evaluated over the domain where their underlying
  // definition is knowable. A missing symbol there means the concept did not
  // occur; elsewhere it remains undefined. This preserves undefined != false
  // without spraying explicit false values through every remembered contact.
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

    const conditionFeatureSets = condition.map(atom => domain(atom.feature));
    const modelBits = (condition.length + 1) * modelUnit;
    for (const { target, expected } of possibleTargets.values()) {
      const targetPresence = domain(target);
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
        total_expected: totalExpected,
        reliability: matchedRate,
        smoothed_reliability: smoothed,
        base_rate: baseRate,
        bits_saved: bitsSaved,
        predictive_code_bits: -Math.log2(smoothed) + modelBits / eligible,
        model_bits: modelBits,
        active: true,
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

  // Finite storage is applied per target rather than globally. Exact contact is
  // retained underneath this working set and can reopen representation later.
  const perTarget = Math.max(8, Math.ceil(Math.sqrt(samples.length)));
  const groups = new Map();
  for (const pattern of patterns) {
    if (!groups.has(pattern.target)) groups.set(pattern.target, []);
    groups.get(pattern.target).push(pattern);
  }
  const kept = [];
  for (const target of [...groups.keys()].sort()) {
    const group = groups.get(target);
    const chosen = [];
    const expectedSeen = new Set();
    for (const pattern of group) {
      const key = stable(pattern.expected);
      if (expectedSeen.has(key)) continue;
      expectedSeen.add(key);
      chosen.push(pattern);
      if (chosen.length >= perTarget) break;
    }
    if (chosen.length < perTarget) {
      const chosenSet = new Set(chosen);
      for (const pattern of group) {
        if (chosenSet.has(pattern)) continue;
        chosen.push(pattern);
        if (chosen.length >= perTarget) break;
      }
    }
    kept.push(...chosen);
  }
  kept.sort((a, b) =>
    a.predictive_code_bits - b.predictive_code_bits ||
    b.bits_saved - a.bits_saved ||
    a.conditions.length - b.conditions.length ||
    conditionKey(a.conditions).localeCompare(conditionKey(b.conditions)) ||
    a.target.localeCompare(b.target)
  );
  return kept;
}

function cloneSymbol(symbol) {
  return {
    ...symbol,
    definition: symbol.definition.map(atom => ({ ...atom })),
    source: symbol.source ? { ...symbol.source } : undefined,
  };
}
function nextSymbolNumber(symbols) {
  let next = 1;
  for (const symbol of symbols) {
    const match = /^§(\d+)$/.exec(symbol.feature);
    if (match) next = Math.max(next, Number(match[1]) + 1);
  }
  return next;
}

// A learned symbol is representational material in M, not a temporary winner in
// one search pass. Once a grounded conjunction has earned a handle, later global
// recompression keeps that definition available while all relations involving it
// remain free to gain or lose evidential authority. This makes conceptual growth
// cumulative without making any learned claim immutable.
function recompressRelations(rawSamples, seedSymbols = [], maxNewSymbols = 8) {
  let symbols = seedSymbols.map(cloneSymbol);
  let patterns = [];
  const existingDefinitions = new Set(symbols.map(s => s.definition_key || conditionKey(s.definition)));
  let nextNumber = nextSymbolNumber(symbols);
  let remaining = Math.max(0, maxNewSymbols);

  for (let pass = 0; pass < 2 && remaining > 0; pass++) {
    const samples = augment(rawSamples, symbols);
    patterns = learnPatterns(samples, symbols, 2);
    const byFeature = new Map(symbols.map(s => [s.feature, s]));
    const additions = [];

    for (const pattern of patterns) {
      if (pattern.conditions.length < 2) continue;
      if (pattern.conditions.some(atom => byFeature.has(atom.feature) && atom.value !== true)) continue;
      const definitionKey = conditionKey(pattern.conditions);
      if (existingDefinitions.has(definitionKey)) continue;
      const depth = 1 + pattern.conditions.reduce((m, atom) => Math.max(m, byFeature.get(atom.feature)?.depth || 0), 0);
      additions.push({
        feature: `§${nextNumber++}`,
        depth,
        definition: pattern.conditions.map(a => ({ ...a })),
        definition_key: definitionKey,
        source: { target: pattern.target, expected: pattern.expected, bits_saved: pattern.bits_saved },
      });
      existingDefinitions.add(definitionKey);
      remaining--;
      if (remaining <= 0) break;
    }
    if (!additions.length) break;
    symbols = [...symbols, ...additions];
  }
  patterns = learnPatterns(augment(rawSamples, symbols), symbols, 2).map((p, i) => ({ ...p, id: `r${i + 1}` }));
  return { symbols, patterns };
}

// Between global searches, new reality changes the evidential authority of every
// already-learned relation it bears on. A counter-case is therefore effective on
// the very next C even though the whole candidate language is not regenerated.
function refreshPattern(pattern, values, symbols) {
  const byFeature = new Map(symbols.map(s => [s.feature, s]));
  const conditionFeatures = pattern.conditions.map(x => x.feature);
  if (!featureEvaluable(values, pattern.target, byFeature) ||
      !conditionFeatures.every(feature => featureEvaluable(values, feature, byFeature))) return pattern;

  pattern.eligible++;
  const targetMatches = sampleHas(values, { feature: pattern.target, value: pattern.expected });
  if (targetMatches) pattern.total_expected++;
  const matched = pattern.conditions.every(atom => sampleHas(values, atom));
  if (matched) {
    pattern.covered++;
    if (targetMatches) pattern.support++;
    else pattern.exceptions++;
  }

  const unmatched = pattern.eligible - pattern.covered;
  const unmatchedExpected = pattern.total_expected - pattern.support;
  pattern.base_rate = pattern.total_expected / pattern.eligible;
  pattern.reliability = pattern.covered ? pattern.support / pattern.covered : 0;
  pattern.smoothed_reliability = (pattern.support + 1) / (pattern.covered + 2);
  const baseBits = pattern.eligible * entropyBinary(pattern.total_expected, pattern.eligible);
  const residualBits = pattern.covered * entropyBinary(pattern.support, pattern.covered) + unmatched * entropyBinary(unmatchedExpected, unmatched);
  pattern.bits_saved = baseBits - residualBits - pattern.model_bits;
  pattern.predictive_code_bits = -Math.log2(pattern.smoothed_reliability) + pattern.model_bits / pattern.eligible;
  pattern.active = pattern.covered >= 2 && unmatched >= 2 && pattern.reliability > pattern.base_rate && pattern.bits_saved > 0;
  return pattern;
}

function expandPartial(values, symbols) {
  return augment([{ id: 'query', values }], symbols)[0].values;
}
function predict(structure, partialValues) {
  const values = expandPartial(partialValues, structure.symbols);
  const byFeature = new Map(structure.symbols.map(s => [s.feature, s]));
  const active = structure.patterns.filter(pattern =>
    pattern.active !== false &&
    !featureEvaluable(values, pattern.target, byFeature) &&
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
    values.relation_depth = description.depth;
    values.relation_symbol = description.symbol;
    values.relation_extent = description.length;
    for (let i = 0; i < state.concern_count; i++) values[`relation_c${i}_order`] = magnitudeOrder(after[i], before[i]);
    return { id: sample.id, values };
  });
}

function nextRecompressionAt(n) {
  return n + Math.max(4, Math.ceil(Math.sqrt(Math.max(1, n))));
}

function recompressWhole(state) {
  const base = directSamples(state);
  if (base.length < 4) return {
    samples: base,
    symbols: (state.structure?.symbols || []).map(cloneSymbol),
    patterns: [], tokens: [], order_rules: [], encoded_order: [],
    fixed_point_passes: 0, compiled_experiences: base.length, next_recompression_at: 4,
  };

  let samples = base;
  let learned = { symbols: (state.structure?.symbols || []).map(cloneSymbol), patterns: [] };
  let tokens = [];
  let sequence = { encoded_stream: [], rules: [] };
  let previousKey = '';
  let passes = 0;
  let symbolBudget = 8;
  for (let pass = 0; pass < 3; pass++) {
    const beforeSymbols = learned.symbols.length;
    learned = recompressRelations(samples, learned.symbols, symbolBudget);
    symbolBudget = Math.max(0, symbolBudget - (learned.symbols.length - beforeSymbols));
    tokens = samples.map(sample => eventToken(state, learned, sample));
    sequence = recompressSequence(tokens);
    const next = annotateTemporalRelations(state, base, temporalDescriptions(samples, tokens, sequence));
    const key = stable(next.map(x => x.values));
    samples = next;
    passes = pass + 1;
    if (key === previousKey) break;
    previousKey = key;
  }
  learned = recompressRelations(samples, learned.symbols, symbolBudget);
  return {
    samples,
    symbols: learned.symbols,
    patterns: learned.patterns,
    tokens,
    order_rules: sequence.rules,
    encoded_order: sequence.encoded_stream,
    fixed_point_passes: passes,
    compiled_experiences: base.length,
    next_recompression_at: nextRecompressionAt(base.length),
  };
}

function assimilateExperience(state, sample) {
  const structure = state.structure;
  structure.samples.push(sample);
  const expanded = expandPartial(sample.values, structure.symbols);
  for (const pattern of structure.patterns) refreshPattern(pattern, expanded, structure.symbols);
  structure.patterns.sort((a, b) =>
    (a.active === false) - (b.active === false) ||
    a.predictive_code_bits - b.predictive_code_bits ||
    b.bits_saved - a.bits_saved ||
    b.covered - a.covered ||
    a.id.localeCompare(b.id)
  );
  const token = eventToken(state, structure, sample);
  structure.tokens.push(token);
  structure.encoded_order.push(baseToken(token));
  structure.compiled_experiences = state.experiences.length;
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

  const completed = { ...purpose };
  for (let pass = 0; pass < 4; pass++) {
    const prediction = predict(state.structure, completed);
    let changed = false;
    for (const [target, relation] of Object.entries(prediction.best_by_target)) {
      if (Object.prototype.hasOwnProperty.call(completed, target)) continue;
      const rival = prediction.active.find(other =>
        other.target === target && !same(other.expected, relation.expected) &&
        Math.abs(other.predictive_code_bits - relation.predictive_code_bits) < 1e-9
      );
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
    structure: {
      samples: [], symbols: [], patterns: [], tokens: [], order_rules: [], encoded_order: [],
      fixed_point_passes: 0, compiled_experiences: 0, next_recompression_at: 4,
    },
    prior: {
      stone: 'materially relevant relations remain answerable to reality; Stone signs are cognitive orientations, never outcome valence',
      onelogic: 'preserve undefeated possibilities; complete only what grounded relations warrant; unresolved stays unresolved; counterevidence reopens descriptions',
      embodiment: 'distinct perceptual channels, motor possibilities, and interoceptive pressure magnitudes are primitive physical interfaces, not learned world semantics',
      law: 'M(t+1)=C(M(t)⊕R(t+1)); C preserves exact contact, incrementally updates reusable descriptions, and reopens them under accumulating reality',
    },
  };
}

function C(state, realityContact) {
  if (!state || state.whole !== 1) throw new Error('C requires one whole mind');
  if (!Array.isArray(realityContact) || realityContact.length <= state.concern_count) throw new Error('invalid reality-contact');
  if (!realityContact.every(Number.isFinite)) throw new Error('reality-contact must be finite numeric perception');

  const frame = realityContact.slice();
  if (state.previous_contact && state.motor != null) {
    const index = state.experiences.length;
    const experience = { before: state.previous_contact.slice(), action: state.motor, after: frame.slice() };
    state.experiences.push(experience);
    const sample = directSample(state, experience, index);

    if (state.experiences.length >= state.structure.next_recompression_at) state.structure = recompressWhole(state);
    else assimilateExperience(state, sample);
  }

  state.contacts.push(frame.slice());
  state.previous_contact = frame;
  const completion = groundedCompletion(state, frame);
  state.motor = completion == null ? spontaneousMotor(state) : completion;
  return state;
}

module.exports = { one, C };
