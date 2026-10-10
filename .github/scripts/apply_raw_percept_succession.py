from pathlib import Path

p = Path('one-mind.js')
s = p.read_text()


def replace_once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    s = s.replace(old, new, 1)


replace_once(
    'function learnPatterns(samplesInput, symbols, maxConditions = 2) {',
    'function learnPatterns(samplesInput, symbols, maxConditions = 2, knownDomains = null) {',
    'learnPatterns signature',
)

replace_once(
'''  const domainCache = new Map();
  function domain(feature) {
    if (domainCache.has(feature)) return domainCache.get(feature);
    const basis = byFeature.has(feature) ? [...dependencies(feature)] : [feature];
    const set = new Set(intersectionValues(basis.map(dep => featureIndex.get(dep))));
    domainCache.set(feature, set);
    return set;
  }
''',
'''  const domainCache = new Map();
  function domain(feature) {
    if (domainCache.has(feature)) return domainCache.get(feature);
    // Some learned relations are sparse positive handles whose falsity is still
    // evaluable wherever their complete grounded definition has been observed.
    // `knownDomains` supplies those warranted evaluation positions without
    // materializing authored false values into every remembered sample.
    if (knownDomains && knownDomains.has(feature)) {
      const set = new Set(knownDomains.get(feature));
      domainCache.set(feature, set);
      return set;
    }
    const basis = byFeature.has(feature) ? [...dependencies(feature)] : [feature];
    const set = new Set(intersectionValues(basis.map(dep => featureIndex.get(dep))));
    domainCache.set(feature, set);
    return set;
  }
''',
    'generic sparse evaluation domain',
)

replace_once(
    'function recompressRelations(rawSamples, seedSymbols = [], maxNewSymbols = 8) {',
    'function recompressRelations(rawSamples, seedSymbols = [], maxNewSymbols = 8, knownDomains = null) {',
    'recompressRelations signature',
)

replace_once(
    '    patterns = learnPatterns(samples, symbols, 2);',
    '    patterns = learnPatterns(samples, symbols, 2, knownDomains);',
    'iterative relation learning domain',
)

replace_once(
    '  patterns = learnPatterns(augment(rawSamples, symbols), symbols, 2).map(pattern => {',
    '  patterns = learnPatterns(augment(rawSamples, symbols), symbols, 2, knownDomains).map(pattern => {',
    'final relation learning domain',
)

anchor = 'function baseDependencies(feature, byFeature, trail = new Set()) {'
if s.count(anchor) != 1:
    raise SystemExit(f'temporal helper anchor: expected one match, found {s.count(anchor)}')

helpers = r'''function temporalDefinitionKey(channel, expansion) {
  return `${channel}:${stable(expansion)}`;
}
function cloneTemporalSymbol(symbol) {
  return {
    ...symbol,
    expansion: (symbol.expansion || []).map(value => value),
  };
}
function nextTemporalSymbolNumber(symbols) {
  let next = 1;
  for (const symbol of symbols) {
    const match = /^§t(\d+)$/.exec(symbol.feature);
    if (match) next = Math.max(next, Number(match[1]) + 1);
  }
  return next;
}
function observedPerceptStreams(state) {
  const streams = {};
  for (let sampleIndex = 0; sampleIndex < state.experiences.length; sampleIndex++) {
    const percept = splitContact(state, state.experiences[sampleIndex].before).percept;
    for (let channelIndex = 0; channelIndex < percept.length; channelIndex++) {
      const value = percept[channelIndex];
      if (value === null || value === undefined) continue;
      const channel = `p${channelIndex}`;
      if (!streams[channel]) streams[channel] = { values: [], sample_indices: [] };
      streams[channel].values.push(value);
      streams[channel].sample_indices.push(sampleIndex);
    }
  }
  return streams;
}
function learnPerceptTemporalVocabulary(state, seedSymbols = []) {
  const symbols = seedSymbols.map(cloneTemporalSymbol);
  const existing = new Map(symbols.map(symbol => [
    symbol.definition_key || temporalDefinitionKey(symbol.channel, symbol.expansion), symbol,
  ]));
  let nextNumber = nextTemporalSymbolNumber(symbols);
  const streams = observedPerceptStreams(state);
  const order = {};

  for (const channel of Object.keys(streams).sort()) {
    const stream = streams[channel];
    const sequence = recompressSequence(stream.values);
    order[channel] = {
      raw_values: stream.values.slice(),
      encoded_order: sequence.encoded_stream.slice(),
      rules: sequence.rules.map(rule => ({
        ...rule,
        expansion: rule.expansion.slice(),
      })),
    };
    for (const learned of learnedExpansions(sequence)) {
      if (!Array.isArray(learned.expansion) || learned.expansion.length < 2) continue;
      const key = temporalDefinitionKey(channel, learned.expansion);
      if (existing.has(key)) continue;
      const symbol = {
        feature: `§t${nextNumber++}`,
        channel,
        expansion: learned.expansion.slice(),
        definition_key: key,
        depth: learned.depth,
        support: 0,
      };
      symbols.push(symbol);
      existing.set(key, symbol);
    }
  }

  // Persistent identity belongs to the grounded expansion, not to whatever
  // local §q name a later recompression happens to assign it.
  for (const symbol of symbols) {
    const stream = streams[symbol.channel];
    let support = 0;
    if (stream) {
      for (let start = 0; start + symbol.expansion.length <= stream.values.length; start++) {
        if (occurrenceAt(stream.values, start, symbol.expansion)) support++;
      }
    }
    symbol.support = support;
  }

  symbols.sort((a, b) => a.feature.localeCompare(b.feature, undefined, { numeric: true }));
  return { symbols, streams, order };
}
function annotatePerceptTemporalRelations(state, baseSamples, seedSymbols = []) {
  const learned = learnPerceptTemporalVocabulary(state, seedSymbols);
  const samples = baseSamples.map(sample => ({ id: sample.id, values: { ...sample.values } }));
  const domains = new Map();

  for (const symbol of learned.symbols) {
    const stream = learned.streams[symbol.channel];
    const domain = [];
    if (!stream || !symbol.expansion.length) {
      domains.set(symbol.feature, domain);
      continue;
    }
    for (let end = symbol.expansion.length - 1; end < stream.values.length; end++) {
      const start = end - symbol.expansion.length + 1;
      const sampleIndex = stream.sample_indices[end];
      domain.push(sampleIndex);
      if (occurrenceAt(stream.values, start, symbol.expansion)) {
        samples[sampleIndex].values[symbol.feature] = true;
      }
    }
    domains.set(symbol.feature, domain);
  }

  return { ...learned, samples, domains };
}
function currentPerceptTemporalValues(state) {
  const out = {};
  for (const symbol of state.structure?.temporal_symbols || []) {
    const match = /^p(\d+)$/.exec(symbol.channel || '');
    if (!match || !Array.isArray(symbol.expansion) || !symbol.expansion.length) continue;
    const channelIndex = Number(match[1]);
    const recent = [];
    for (let i = state.contacts.length - 1; i >= 0 && recent.length < symbol.expansion.length; i--) {
      const percept = splitContact(state, state.contacts[i]).percept;
      const value = percept[channelIndex];
      if (value === null || value === undefined) continue;
      recent.push(value);
    }
    recent.reverse();
    if (recent.length === symbol.expansion.length && same(recent, symbol.expansion)) {
      out[symbol.feature] = true;
    }
  }
  return out;
}

'''
s = s.replace(anchor, helpers + anchor, 1)

old_start = '''function recompressWhole(state) {
  const base = directSamples(state);
  if (base.length < 4) return {
    samples: base,
    symbols: (state.structure?.symbols || []).map(cloneSymbol),
    patterns: [], tokens: [], order_rules: [], encoded_order: [],
    fixed_point_passes: 0, compiled_experiences: base.length,
    next_recompression_at: Math.max(4, base.length + 4),
  };

  let samples = base;
'''
new_start = '''function recompressWhole(state) {
  const base = directSamples(state);
  // Apply the existing generic sequence compressor to each physical percept
  // channel itself. A value therefore keeps one sensory identity across time;
  // temporal position is represented by the learned succession relation.
  const perceptTemporal = annotatePerceptTemporalRelations(
    state, base, state.structure?.temporal_symbols || []
  );
  if (base.length < 4) return {
    samples: perceptTemporal.samples,
    symbols: (state.structure?.symbols || []).map(cloneSymbol),
    temporal_symbols: perceptTemporal.symbols,
    percept_order: perceptTemporal.order,
    patterns: [], tokens: [], order_rules: [], encoded_order: [],
    fixed_point_passes: 0, compiled_experiences: base.length,
    next_recompression_at: Math.max(4, base.length + 4),
  };

  let samples = perceptTemporal.samples;
'''
replace_once(old_start, new_start, 'recompressWhole start')

# The relation learner now knows where a sparse temporal relation was fully
# evaluable, so absence in those positions can legitimately count as false.
old_call = '    const learned = recompressRelations(samples, symbols, symbolBudget);'
new_call = '    const learned = recompressRelations(samples, symbols, symbolBudget, perceptTemporal.domains);'
if s.count(old_call) != 1:
    raise SystemExit(f'recompress loop call: expected one match, found {s.count(old_call)}')
s = s.replace(old_call, new_call, 1)

replace_once(
    '    const next = annotateTemporalRelations(state, base, descriptions);',
    '    const next = annotateTemporalRelations(state, perceptTemporal.samples, descriptions);',
    'preserve raw temporal annotations across fixed-point passes',
)

replace_once(
    '  const finalLearned = recompressRelations(samples, symbols, symbolBudget);',
    '  const finalLearned = recompressRelations(samples, symbols, symbolBudget, perceptTemporal.domains);',
    'final relation recompression domain',
)

old_return = '''  return {
    samples, symbols, patterns,
    tokens: sequence.raw_tokens,
    order_rules: sequence.rules,
    encoded_order: sequence.encoded_stream,
    fixed_point_passes: passes,
    compiled_experiences: base.length,
    next_recompression_at: nextRecompressionAt(base.length),
  };
}'''
new_return = '''  return {
    samples, symbols, patterns,
    temporal_symbols: perceptTemporal.symbols,
    percept_order: perceptTemporal.order,
    tokens: sequence.raw_tokens,
    order_rules: sequence.rules,
    encoded_order: sequence.encoded_stream,
    fixed_point_passes: passes,
    compiled_experiences: base.length,
    next_recompression_at: nextRecompressionAt(base.length),
  };
}'''
replace_once(old_return, new_return, 'recompressWhole return')

old_current = '''function completeCurrent(state, frame) {
  const present = presentFeatures(state, frame);
  let completed = { ...present.values };
  const inferred = new Set();
  const unresolved = [];
'''
new_current = '''function completeCurrent(state, frame) {
  const present = presentFeatures(state, frame);
  const temporal = currentPerceptTemporalValues(state);
  let completed = { ...present.values, ...temporal };
  const inferred = new Set(Object.keys(temporal));
  const unresolved = [];
'''
replace_once(old_current, new_current, 'live temporal completion')

old_structure = '''      samples: [], symbols: [], patterns: [], tokens: [], order_rules: [], encoded_order: [],
      fixed_point_passes: 0, compiled_experiences: 0, next_recompression_at: 4,
'''
new_structure = '''      samples: [], symbols: [], temporal_symbols: [], percept_order: {},
      patterns: [], tokens: [], order_rules: [], encoded_order: [],
      fixed_point_passes: 0, compiled_experiences: 0, next_recompression_at: 4,
'''
replace_once(old_structure, new_structure, 'initial temporal vocabulary')

p.write_text(s)
