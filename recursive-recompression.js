'use strict';

// Recursive form of the same developmental law used by 42ndMind:
//
//   M(t+1) = C(M(t) ∪ R(t+1))
//
// C searches for shorter reality-preserving relational descriptions. A winning
// description is not promoted by a second "concept" rule. On the next pass it
// is simply part of M and is therefore available to C like any other relation.
// Repeated application gives C*(E), the fixed point of C over its own output.

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

function learnPatterns(samplesInput, symbols, options = {}) {
  const samples = normalizeSamples(samplesInput);
  const featureValues = {};
  for (const { values } of samples) {
    for (const [feature, value] of Object.entries(values)) {
      featureValues[feature] = unique([...(featureValues[feature] || []), value]);
    }
  }
  const features = Object.keys(featureValues).sort();
  const maxConditions = Math.min(options.maxConditions || 3, Math.max(1, features.length - 1));
  if (samples.length < 4 || features.length < 2) return [];

  const byFeature = new Map(symbols.map(s => [s.feature, s]));
  const dependencyCache = new Map();
  function dependencies(feature) {
    if (!byFeature.has(feature)) return new Set([feature]);
    if (!dependencyCache.has(feature)) dependencyCache.set(feature, symbolDependencies(byFeature.get(feature), byFeature));
    return dependencyCache.get(feature);
  }

  const atomCount = features.reduce((n, f) => n + featureValues[f].length, 0);
  const modelUnit = Math.log2(Math.max(2, atomCount + features.length));
  const candidates = new Map();

  // Evidence-equivalent candidate generation. A candidate target=value rule can
  // only have positive support if at least one lived sample contains that value
  // together with its conditions. Generate it from those supporting occurrences
  // directly instead of pairing every possible target value with every sample.
  // This changes only search cost, not the candidate set capable of surviving the
  // MDL tests below, and becomes increasingly important as a mind accumulates life.
  for (const { values } of samples) {
    for (const target of Object.keys(values).sort()) {
      const expected = values[target];
      const atoms = Object.keys(values)
        .filter(feature => feature !== target && !dependencies(feature).has(target))
        .sort()
        .map(feature => ({ feature, value: values[feature] }));
      for (const conditions of combinations(atoms, maxConditions)) {
        const key = `${target}=>${stable(expected)}|${conditionKey(conditions)}`;
        if (!candidates.has(key)) candidates.set(key, { target, expected, conditions });
      }
    }
  }

  const patterns = [];
  for (const candidate of candidates.values()) {
    const conditionFeatures = candidate.conditions.map(x => x.feature);
    const eligible = samples.filter(({ values }) =>
      Object.prototype.hasOwnProperty.call(values, candidate.target) &&
      conditionFeatures.every(feature => Object.prototype.hasOwnProperty.call(values, feature))
    );
    if (eligible.length < 4) continue;
    const matched = eligible.filter(({ values }) => candidate.conditions.every(atom => sampleHas(values, atom)));
    const unmatched = eligible.filter(({ values }) => !candidate.conditions.every(atom => sampleHas(values, atom)));
    if (matched.length < 2 || unmatched.length < 2) continue;

    const totalExpected = eligible.filter(({ values }) => same(values[candidate.target], candidate.expected)).length;
    const matchedExpected = matched.filter(({ values }) => same(values[candidate.target], candidate.expected)).length;
    const unmatchedExpected = unmatched.filter(({ values }) => same(values[candidate.target], candidate.expected)).length;
    const baseRate = totalExpected / eligible.length;
    const matchedRate = matchedExpected / matched.length;
    if (matchedRate <= baseRate) continue;

    const baseBits = eligible.length * entropyBinary(totalExpected, eligible.length);
    const residualBits =
      matched.length * entropyBinary(matchedExpected, matched.length) +
      unmatched.length * entropyBinary(unmatchedExpected, unmatched.length);
    const modelBits = (candidate.conditions.length + 1) * modelUnit;
    const bitsSaved = baseBits - residualBits - modelBits;
    if (!(bitsSaved > 0)) continue;

    const smoothed = (matchedExpected + 1) / (matched.length + 2);
    patterns.push({
      conditions: candidate.conditions.slice().sort((a, b) => atomKey(a).localeCompare(atomKey(b))),
      target: candidate.target,
      expected: candidate.expected,
      support: matchedExpected,
      exceptions: matched.length - matchedExpected,
      covered: matched.length,
      eligible: eligible.length,
      reliability: matchedRate,
      smoothed_reliability: smoothed,
      base_rate: baseRate,
      bits_saved: bitsSaved,
      predictive_code_bits: -Math.log2(smoothed) + modelBits / eligible.length,
    });
  }

  patterns.sort((a, b) =>
    a.predictive_code_bits - b.predictive_code_bits ||
    b.bits_saved - a.bits_saved ||
    a.conditions.length - b.conditions.length ||
    conditionKey(a.conditions).localeCompare(conditionKey(b.conditions)) ||
    a.target.localeCompare(b.target)
  );
  return patterns;
}

function one() {
  return {
    whole: 1,
    raw_samples: [],
    symbols: [],
    patterns: [],
    generation: 0,
    formula: 'M(t+1)=C(M(t)∪R(t+1)); recursively reuse C output as C input',
  };
}

function recompress(prior, newExperiences, options = {}) {
  const state = prior || one();
  const incoming = normalizeSamples(Array.isArray(newExperiences) ? newExperiences : [newExperiences]);
  const rawSamples = [...state.raw_samples, ...incoming];
  let symbols = state.symbols.map(s => ({ ...s, definition: s.definition.map(a => ({ ...a })) }));
  const maxConditions = options.maxConditions || 3;
  const maxPasses = options.maxPasses || 2;
  const maxSymbolsPerPass = options.maxSymbolsPerPass || 12;
  const existingDefinitions = new Set(symbols.map(s => s.definition_key));
  const passes = [];
  let patterns = [];

  for (let pass = 1; pass <= maxPasses; pass++) {
    const samples = augment(rawSamples, symbols);
    patterns = learnPatterns(samples, symbols, { maxConditions });

    // C returns the shortest currently found description for each bounded
    // target/value referent. Feeding those descriptions into the next C pass is
    // recursion of the same operator, not a second promotion mechanism.
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
      // A positive occurrence of a learned conjunction remains conjunctive and
      // exactly expandable. Its negation would be a disjunction, so it is left
      // uncompressed rather than silently changing representation semantics.
      if (pattern.conditions.some(atom => byFeature.has(atom.feature) && atom.value !== true)) continue;
      const definitionKey = conditionKey(pattern.conditions);
      if (existingDefinitions.has(definitionKey)) continue;
      const depth = 1 + pattern.conditions.reduce((m, atom) => Math.max(m, byFeature.get(atom.feature)?.depth || 0), 0);
      const feature = `§${symbols.length + additions.length + 1}`;
      additions.push({
        feature,
        depth,
        definition: pattern.conditions.map(a => ({ ...a })),
        definition_key: definitionKey,
        source: {
          target: pattern.target,
          expected: pattern.expected,
          bits_saved: pattern.bits_saved,
          predictive_code_bits: pattern.predictive_code_bits,
        },
      });
      existingDefinitions.add(definitionKey);
      if (additions.length >= maxSymbolsPerPass) break;
    }

    passes.push({ pass, patterns: patterns.length, new_symbols: additions.map(x => x.feature) });
    if (!additions.length) break;
    symbols = [...symbols, ...additions];
  }

  const samples = augment(rawSamples, symbols);
  patterns = learnPatterns(samples, symbols, { maxConditions }).map((p, i) => ({ ...p, id: `g${state.generation + 1}p${i + 1}` }));
  return {
    whole: 1,
    raw_samples: rawSamples,
    symbols,
    patterns,
    generation: state.generation + 1,
    passes,
    formula: state.formula,
  };
}

function predict(state, partialExperience) {
  const sample = augment([{ id: 'query', ...(partialExperience || {}) }], state.symbols)[0];
  const active = state.patterns.filter(pattern =>
    !Object.prototype.hasOwnProperty.call(sample.values, pattern.target) &&
    pattern.conditions.every(atom => sampleHas(sample.values, atom))
  ).sort((a, b) =>
    a.predictive_code_bits - b.predictive_code_bits ||
    b.bits_saved - a.bits_saved
  );
  const best_by_target = {};
  for (const pattern of active) if (!(pattern.target in best_by_target)) best_by_target[pattern.target] = pattern;
  return { expanded_experience: sample.values, active_patterns: active, best_by_target, authority: 'defeasible_compression_only' };
}

module.exports = { one, recompress, predict, learnPatterns };
