from pathlib import Path

p = Path('one-mind.js')
s = p.read_text()


def replace_once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    s = s.replace(old, new, 1)


# Sparse temporal relations are ordinary relation features. Their complete
# observation windows define where they are evaluable even when absent.
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
    '  patterns = learnPatterns(augment(rawSamples, symbols), symbols, 2).map((p, i) => ({ ...p, id: `r${i + 1}` }));',
    '  patterns = learnPatterns(augment(rawSamples, symbols), symbols, 2, knownDomains).map((p, i) => ({ ...p, id: `r${i + 1}` }));',
    'final relation learning domain',
)

anchor = 'function baseDependencies(feature, byFeature, trail = new Set()) {'
if s.count(anchor) != 1:
    raise SystemExit(f'temporal helper anchor: expected one match, found {s.count(anchor)}')

helpers = r'''function temporalDefinitionKey(channel, expansion) {
  return `${channel}:${stable(expansion)}`;
}
function cloneTemporalSymbol(symbol) {
  return { ...symbol, expansion: (symbol.expansion || []).slice() };
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
function pairSupports(values) {
  const pairs = new Map();
  for (let i = 0; i + 1 < values.length; i++) {
    const pair = [values[i], values[i + 1]];
    const key = stable(pair);
    if (!pairs.has(key)) pairs.set(key, pair);
  }
  const out = [];
  for (const pair of pairs.values()) {
    const support = nonOverlappingOccurrences(values, pair);
    // Same MDL warrant as the existing sequence compressor: replacing one
    // repeated pair saves one stream term per occurrence and costs three terms
    // to retain its reusable description. No world or language semantics enter.
    const savings = support - 3;
    if (savings > 0) out.push({ pair, support, savings });
  }
  return out;
}
function learnPerceptTemporalVocabulary(state, seedSymbols = []) {
  const symbols = seedSymbols.map(cloneTemporalSymbol);
  const existing = new Map(symbols.map(symbol => [
    symbol.definition_key || temporalDefinitionKey(symbol.channel, symbol.expansion), symbol,
  ]));
  let nextNumber = nextTemporalSymbolNumber(symbols);
  const streams = observedPerceptStreams(state);
  const order = {};

  // Raw succession needs no second global grammar search. A recurrent adjacent
  // relation is itself the first reusable temporal relation. Higher structure can
  // then be learned by the same ordinary relation substrate from these handles.
  for (const channel of Object.keys(streams).sort()) {
    const stream = streams[channel];
    const retained = pairSupports(stream.values);
    order[channel] = { retained_pairs: retained.map(x => ({ expansion: x.pair.slice(), support: x.support, savings: x.savings })) };
    for (const candidate of retained) {
      const key = temporalDefinitionKey(channel, candidate.pair);
      let symbol = existing.get(key);
      if (!symbol) {
        symbol = {
          feature: `§t${nextNumber++}`,
          channel,
          expansion: candidate.pair.slice(),
          definition_key: key,
          depth: 1,
          support: candidate.support,
          savings: candidate.savings,
        };
        symbols.push(symbol);
        existing.set(key, symbol);
      } else {
        symbol.support = candidate.support;
        symbol.savings = candidate.savings;
      }
    }
  }

  // Existing identities remain the same relation. Recalculate their warrant from
  // exact lived contact so correction remains possible when later reality changes.
  for (const symbol of symbols) {
    const stream = streams[symbol.channel];
    if (!stream || !symbol.expansion.length) { symbol.support = 0; symbol.savings = -3; continue; }
    let support = 0;
    for (let start = 0; start + symbol.expansion.length <= stream.values.length; start++) {
      if (occurrenceAt(stream.values, start, symbol.expansion)) support++;
    }
    symbol.support = support;
    symbol.savings = support - 3;
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
    if (!stream || !symbol.expansion.length) { domains.set(symbol.feature, domain); continue; }
    for (let end = symbol.expansion.length - 1; end < stream.values.length; end++) {
      const start = end - symbol.expansion.length + 1;
      const sampleIndex = stream.sample_indices[end];
      domain.push(sampleIndex);
      if (occurrenceAt(stream.values, start, symbol.expansion)) samples[sampleIndex].values[symbol.feature] = true;
    }
    domains.set(symbol.feature, domain);
  }
  return { ...learned, samples, domains };
}
function recentPerceptWindow(state, channelIndex, length, useContacts = false) {
  const recent = [];
  if (useContacts) {
    for (let i = state.contacts.length - 1; i >= 0 && recent.length < length; i--) {
      const value = splitContact(state, state.contacts[i]).percept[channelIndex];
      if (value === null || value === undefined) continue;
      recent.push(value);
    }
  } else {
    for (let i = state.experiences.length - 1; i >= 0 && recent.length < length; i--) {
      const value = splitContact(state, state.experiences[i].before).percept[channelIndex];
      if (value === null || value === undefined) continue;
      recent.push(value);
    }
  }
  recent.reverse();
  return recent;
}
function annotateIncrementalPerceptTemporal(state, sample) {
  const values = { ...sample.values };
  for (const symbol of state.structure?.temporal_symbols || []) {
    const match = /^p(\d+)$/.exec(symbol.channel || '');
    if (!match || !symbol.expansion?.length) continue;
    const recent = recentPerceptWindow(state, Number(match[1]), symbol.expansion.length, false);
    if (recent.length === symbol.expansion.length && same(recent, symbol.expansion)) {
      values[symbol.feature] = true;
      symbol.support = (symbol.support || 0) + 1;
      symbol.savings = symbol.support - 3;
    }
  }
  return { id: sample.id, values };
}
function currentPerceptTemporalValues(state) {
  const out = {};
  for (const symbol of state.structure?.temporal_symbols || []) {
    const match = /^p(\d+)$/.exec(symbol.channel || '');
    if (!match || !symbol.expansion?.length) continue;
    const recent = recentPerceptWindow(state, Number(match[1]), symbol.expansion.length, true);
    if (recent.length === symbol.expansion.length && same(recent, symbol.expansion)) out[symbol.feature] = true;
  }
  return out;
}

'''
helpers = helpers.replace('\\\\d', '\\d')
s = s.replace(anchor, helpers + anchor, 1)

old_start = '''function recompressWhole(state) {
  const base = directSamples(state);
  if (base.length < 4) return {
    samples: base,
    symbols: (state.structure?.symbols || []).map(cloneSymbol),
    patterns: [], tokens: [], order_rules: [], encoded_order: [],
    fixed_point_passes: 0, compiled_experiences: base.length, next_recompression_at: 4,
  };

  let samples = base;
'''
new_start = '''function recompressWhole(state) {
  const base = directSamples(state);
  const perceptTemporal = annotatePerceptTemporalRelations(state, base, state.structure?.temporal_symbols || []);
  if (base.length < 4) return {
    samples: perceptTemporal.samples,
    symbols: (state.structure?.symbols || []).map(cloneSymbol),
    temporal_symbols: perceptTemporal.symbols,
    percept_order: perceptTemporal.order,
    patterns: [], tokens: [], order_rules: [], encoded_order: [],
    fixed_point_passes: 0, compiled_experiences: base.length, next_recompression_at: 4,
  };

  let samples = perceptTemporal.samples;
'''
replace_once(old_start, new_start, 'recompressWhole start')
replace_once(
    '    learned = recompressRelations(samples, learned.symbols, symbolBudget);',
    '    learned = recompressRelations(samples, learned.symbols, symbolBudget, perceptTemporal.domains);',
    'recompress loop call',
)
replace_once(
    '    const next = annotateTemporalRelations(state, base, temporalDescriptions(samples, tokens, sequence));',
    '    const next = annotateTemporalRelations(state, perceptTemporal.samples, temporalDescriptions(samples, tokens, sequence));',
    'preserve raw temporal annotations across fixed-point passes',
)
replace_once(
    '  learned = recompressRelations(samples, learned.symbols, symbolBudget);',
    '  learned = recompressRelations(samples, learned.symbols, symbolBudget, perceptTemporal.domains);',
    'final relation recompression domain',
)
replace_once(
'''  return {
    samples,
    symbols: learned.symbols,
    patterns: learned.patterns,
    tokens,
''',
'''  return {
    samples,
    symbols: learned.symbols,
    temporal_symbols: perceptTemporal.symbols,
    percept_order: perceptTemporal.order,
    patterns: learned.patterns,
    tokens,
''',
    'recompressWhole return',
)

replace_once(
'''function assimilateExperience(state, sample) {
  const structure = state.structure;
  structure.samples.push(sample);
  const expanded = expandPartial(sample.values, structure.symbols);
''',
'''function assimilateExperience(state, sample) {
  const structure = state.structure;
  const temporalSample = annotateIncrementalPerceptTemporal(state, sample);
  structure.samples.push(temporalSample);
  const expanded = expandPartial(temporalSample.values, structure.symbols);
''',
    'incremental temporal assimilation',
)
replace_once(
    '  const token = eventToken(state, structure, sample);',
    '  const token = eventToken(state, structure, temporalSample);',
    'incremental event token',
)

replace_once(
'''function completeCurrent(state, frame) {
  const present = presentFeatures(state, frame);
  let completed = { ...present.values };
  const inferred = new Set();
  const unresolved = new Set();
''',
'''function completeCurrent(state, frame) {
  const present = presentFeatures(state, frame);
  const temporal = currentPerceptTemporalValues(state);
  let completed = { ...present.values, ...temporal };
  const inferred = new Set(Object.keys(temporal));
  const unresolved = new Set();
''',
    'live temporal completion',
)
replace_once(
'''      samples: [], symbols: [], patterns: [], tokens: [], order_rules: [], encoded_order: [],
      fixed_point_passes: 0, compiled_experiences: 0, next_recompression_at: 4,
''',
'''      samples: [], symbols: [], temporal_symbols: [], percept_order: {},
      patterns: [], tokens: [], order_rules: [], encoded_order: [],
      fixed_point_passes: 0, compiled_experiences: 0, next_recompression_at: 4,
''',
    'initial temporal vocabulary',
)

p.write_text(s)
