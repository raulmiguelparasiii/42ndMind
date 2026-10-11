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

function presentFeatures(state, frame) {
  const contact = splitContact(state, frame);
  const values = {};
  for (let i = 0; i < contact.percept.length; i++) {
    if (contact.percept[i] !== null) values[`p${i}`] = contact.percept[i];
  }
  for (let i = 0; i < contact.concern.length; i++) {
    values[`c${i}`] = contact.concern[i];
    values[`c${i}_open`] = contact.concern[i] > 0;
  }
  return { contact, values };
}

function directSample(state, experience, index) {
  const start = presentFeatures(state, experience.before);
  const end = presentFeatures(state, experience.after);
  const values = {
    ...start.values,
    action: experience.action,
    relation_depth: 0,
    relation_extent: 1,
    relation_symbol: null,
  };

  // This is a search index over the exact experienced transition, not a second
  // cognitive world. Ordinary later percepts remain terms of the same relation.
  // `next:` denotes the structural path already present in before-action-after.
  for (let i = 0; i < end.contact.percept.length; i++) {
    if (end.contact.percept[i] !== null) values[`next:p${i}`] = end.contact.percept[i];
  }
  for (let i = 0; i < state.concern_count; i++) {
    const order = magnitudeOrder(end.contact.concern[i], start.contact.concern[i]);
    values[`immediate_c${i}_order`] = order;
    values[`relation_c${i}_order`] = order;
  }
  return { id: `e${index}`, values };
}
function directSamples(state) {
  return state.experiences.map((experience, index) => directSample(state, experience, index));
}

function experienceRelationalFacts(state, experience, index) {
  const beforeId = `contact:${index}`;
  const afterId = `contact:${index + 1}`;
  const experienceId = `experience:${index}`;
  const before = presentFeatures(state, experience.before).values;
  const after = presentFeatures(state, experience.after).values;
  const facts = [
    normalizeRelFact([experienceId, 'before', beforeId]),
    normalizeRelFact([experienceId, 'action', experience.action]),
    normalizeRelFact([experienceId, 'after', afterId]),
    normalizeRelFact([beforeId, 'next', afterId]),
    normalizeRelFact([beforeId, 'action', experience.action]),
    normalizeRelFact([beforeId, 'experience', experienceId]),
  ];
  for (const [feature, value] of Object.entries(before)) facts.push(normalizeRelFact([beforeId, feature, cloneRelTerm(value)]));
  for (const [feature, value] of Object.entries(after)) facts.push(normalizeRelFact([afterId, feature, cloneRelTerm(value)]));
  for (let i = 0; i < state.concern_count; i++) {
    const a = splitContact(state, experience.before).concern[i];
    const b = splitContact(state, experience.after).concern[i];
    facts.push(normalizeRelFact([beforeId, `relation_c${i}_order`, magnitudeOrder(b, a)]));
  }
  return facts;
}

function storeExperienceRelations(state, experience, index) {
  if (!state.knowledge) return;
  const existing = new Set((state.knowledge.facts || []).map(relFactKey));
  for (const fact of experienceRelationalFacts(state, experience, index)) {
    const key = relFactKey(fact);
    if (existing.has(key)) continue;
    state.knowledge.facts.push(fact);
    existing.add(key);
  }
  state.knowledge.experience_relations_through = Math.max(
    Number(state.knowledge.experience_relations_through || 0), index + 1
  );
}

function ensureExperienceRelations(state) {
  if (!state.knowledge) return;
  let through = Math.max(0, Math.floor(Number(state.knowledge.experience_relations_through || 0)));
  through = Math.min(through, state.experiences.length);
  for (let i = through; i < state.experiences.length; i++) storeExperienceRelations(state, state.experiences[i], i);
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
  const patternDependencies = new Map();

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
    const conditionDependencies = new Set();
    for (const atom of condition) {
      for (const dependency of dependencies(atom.feature)) conditionDependencies.add(dependency);
    }
    // A learned handle may compress several prerequisites. That is legitimate
    // abstraction and is not penalized. But when two candidate relations have
    // equal predictive warrant, finite retention prefers the one whose antecedent
    // can be reconstructed from fewer independent base features. This prevents a
    // context-dependent alias from crowding out an equally warranted direct route.
    const dependencyCount = conditionDependencies.size;
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
      const pattern = {
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
        dependency_count: dependencyCount,
        model_bits: modelBits,
        active: true,
      };
      patterns.push(pattern);
      patternDependencies.set(pattern, new Set(conditionDependencies));
    }
  }

  patterns.sort((a, b) =>
    a.predictive_code_bits - b.predictive_code_bits ||
    a.dependency_count - b.dependency_count ||
    b.bits_saved - a.bits_saved ||
    a.conditions.length - b.conditions.length ||
    conditionKey(a.conditions).localeCompare(conditionKey(b.conditions)) ||
    a.target.localeCompare(b.target)
  );

  // Finite retention is conclusion-relative. Distinct warranted conclusions must
  // not erase one another merely because they occupy the same target channel.
  // Within one conclusion, first preserve the accessibility frontier: a route is
  // redundant only when an equally good-or-better route reaches the same result
  // from a strict subset of its underlying base evidence. Incomparable evidence
  // routes remain available even when one surface/context is more common.
  const perConclusion = Math.max(8, Math.ceil(Math.sqrt(samples.length)));
  const groups = new Map();
  for (const pattern of patterns) {
    const key = `${pattern.target}=>${stable(pattern.expected)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pattern);
  }
  function strictDependencySubset(a, b) {
    if (!a || !b || a.size >= b.size) return false;
    for (const feature of a) if (!b.has(feature)) return false;
    return true;
  }
  const kept = [];
  for (const key of [...groups.keys()].sort()) {
    const group = groups.get(key);
    const frontier = group.filter(pattern => !group.some(other =>
      other !== pattern &&
      other.predictive_code_bits <= pattern.predictive_code_bits + 1e-12 &&
      strictDependencySubset(patternDependencies.get(other), patternDependencies.get(pattern))
    ));
    const frontierSet = new Set(frontier);
    kept.push(...[...frontier, ...group.filter(pattern => !frontierSet.has(pattern))].slice(0, perConclusion));
  }
  kept.sort((a, b) =>
    a.predictive_code_bits - b.predictive_code_bits ||
    a.dependency_count - b.dependency_count ||
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

function symbolCompatible(symbol, expected, values, byFeature, trail = new Set()) {
  if (expected !== true || !symbol) return true;
  if (trail.has(symbol.feature)) return false;
  const nextTrail = new Set(trail); nextTrail.add(symbol.feature);
  for (const atom of symbol.definition) {
    if (Object.prototype.hasOwnProperty.call(values, atom.feature)) {
      if (!same(values[atom.feature], atom.value)) return false;
      continue;
    }
    const nested = byFeature.get(atom.feature);
    if (nested && atom.value === true && !symbolCompatible(nested, true, values, byFeature, nextTrail)) return false;
  }
  return true;
}

function knowledgeCompleteValues(state, seedValues) {
  if (!state.knowledge) return { values: { ...seedValues }, unresolved: [] };
  const subject = '@current';
  const currentFacts = Object.entries(seedValues).map(([feature, value]) =>
    normalizeRelFact([subject, feature, cloneRelTerm(value)]));
  const base = [
    ...state.knowledge.facts,
    ...relRuleDescriptorFacts(state.knowledge.rules),
    ...empiricalRelationDescriptorFacts(state.structure),
    ...currentFacts,
  ];
  const closure = relationalClosure(base, state.knowledge.rules);
  const grouped = new Map();
  for (const fact of closure.facts) {
    if (!same(fact.subject, subject)) continue;
    if (!grouped.has(fact.relation)) grouped.set(fact.relation, []);
    grouped.get(fact.relation).push(fact.object);
  }
  const values = { ...seedValues };
  const unresolved = [];
  for (const [relation, objects] of grouped) {
    if (Object.prototype.hasOwnProperty.call(values, relation)) continue;
    const distinct = unique(objects);
    if (distinct.length === 1) values[relation] = cloneRelTerm(distinct[0]);
    else if (distinct.length > 1) unresolved.push(relation);
  }
  return { values, unresolved: unique(unresolved) };
}

function learnedSchema(subjectVar, premises, target, expected, meta) {
  return {
    id: meta.id,
    premises: premises.map(atom => normalizeRelPattern([subjectVar, atom.feature, cloneRelTerm(atom.value)])),
    conclusion: normalizeRelPattern([subjectVar, target, cloneRelTerm(expected)]),
    kind: meta.kind,
    active: meta.active !== false,
    authority: meta.authority ?? null,
    bits_saved: meta.bits_saved ?? null,
    covered: meta.covered ?? null,
    source: cloneRelTerm(meta.source ?? null),
  };
}

function compileLearnedRelationalSchemas(structure) {
  const schemas = [];
  const S = relVar('current_subject');

  // A learned definition is a description, not independent evidence that its
  // constituents currently obtain. Constituent actuality may warrant recognizing
  // the handle; an inferred handle may not categorically manufacture actuality in
  // the opposite direction. Reverse completion must be warranted by an empirical
  // or explicit relation of its own.
  for (const symbol of structure?.symbols || []) {
    schemas.push(learnedSchema(S, symbol.definition || [], symbol.feature, true, {
      id: 'learned:symbol:recognition:' + symbol.feature,
      kind: 'structural_definition',
      source: { handle: symbol.feature, depth: symbol.depth },
    }));
  }

  for (const pattern of structure?.patterns || []) {
    if (pattern.active === false) continue;
    schemas.push(learnedSchema(S, pattern.conditions || [], pattern.target, pattern.expected, {
      id: 'learned:empirical:' + pattern.id,
      kind: 'empirical_relation',
      active: pattern.active !== false,
      authority: pattern.predictive_code_bits,
      bits_saved: pattern.bits_saved,
      covered: pattern.covered,
      source: {
        pattern_id: pattern.id,
        support: pattern.support,
        exceptions: pattern.exceptions,
        reliability: pattern.reliability,
      },
    }));
  }
  return schemas;
}

function syncLearnedRelationalSchemas(state) {
  if (!state.knowledge) return;
  state.knowledge.learned_rules = compileLearnedRelationalSchemas(state.structure);
}

function currentFactValues(facts, subject) {
  const grouped = new Map();
  for (const fact of facts) {
    if (!same(fact.subject, subject)) continue;
    if (!grouped.has(fact.relation)) grouped.set(fact.relation, []);
    grouped.get(fact.relation).push(fact.object);
  }
  return grouped;
}

function learnedRuleBindings(rule, values, subject) {
  const facts = Object.entries(values).map(([relation, object]) => normalizeRelFact([subject, relation, cloneRelTerm(object)]));
  return relPremiseBindings(rule.premises, facts);
}

function learnedRuleConclusion(rule, binding) {
  return instantiateRelPattern(rule.conclusion, binding);
}

function unifiedCurrentCompletion(state, seedValues) {
  syncLearnedRelationalSchemas(state);
  const subject = '@current';
  const values = { ...seedValues };
  const unresolved = new Set();
  const inferred = new Set();

  for (let pass = 0; pass < 16; pass++) {
    let changed = false;

    const currentFacts = Object.entries(values).map(([relation, object]) =>
      normalizeRelFact([subject, relation, cloneRelTerm(object)]));
    const base = [
      ...state.knowledge.facts,
      ...relRuleDescriptorFacts(state.knowledge.rules),
      ...currentFacts,
    ];
    const closure = relationalClosure(base, state.knowledge.rules);
    const grouped = currentFactValues(closure.facts, subject);
    for (const [relation, objects] of grouped) {
      if (Object.prototype.hasOwnProperty.call(values, relation)) continue;
      const distinct = unique(objects);
      if (distinct.length === 1) {
        values[relation] = cloneRelTerm(distinct[0]);
        inferred.add(relation);
        changed = true;
      } else if (distinct.length > 1) unresolved.add(relation);
    }

    const structural = [];
    const empiricalByTarget = new Map();
    for (const rule of state.knowledge.learned_rules || []) {
      if (rule.active === false) continue;
      const bindings = learnedRuleBindings(rule, values, subject);
      if (!bindings.length) continue;
      for (const binding of bindings) {
        const conclusion = learnedRuleConclusion(rule, binding);
        if (!conclusion || !same(conclusion.subject, subject)) continue;
        if (rule.kind === 'structural_definition') structural.push({ rule, conclusion });
        else {
          const key = String(conclusion.relation);
          if (!empiricalByTarget.has(key)) empiricalByTarget.set(key, []);
          empiricalByTarget.get(key).push({ rule, conclusion });
        }
      }
    }

    for (const { conclusion } of structural) {
      const relation = conclusion.relation;
      if (Object.prototype.hasOwnProperty.call(values, relation)) {
        if (!same(values[relation], conclusion.object)) unresolved.add(relation);
        continue;
      }
      values[relation] = cloneRelTerm(conclusion.object);
      inferred.add(relation);
      changed = true;
    }

    for (const [relation, candidates] of empiricalByTarget) {
      if (Object.prototype.hasOwnProperty.call(values, relation)) continue;
      candidates.sort((a, b) =>
        (a.rule.authority ?? Infinity) - (b.rule.authority ?? Infinity) ||
        (b.rule.bits_saved ?? -Infinity) - (a.rule.bits_saved ?? -Infinity) ||
        (b.rule.covered ?? -Infinity) - (a.rule.covered ?? -Infinity) ||
        a.rule.id.localeCompare(b.rule.id)
      );
      const best = candidates[0];
      const rival = candidates.find(other =>
        !same(other.conclusion.object, best.conclusion.object) &&
        Math.abs((other.rule.authority ?? Infinity) - (best.rule.authority ?? Infinity)) < 1e-9
      );
      if (rival) {
        unresolved.add(relation);
        continue;
      }
      values[relation] = cloneRelTerm(best.conclusion.object);
      inferred.add(relation);
      changed = true;
    }

    if (!changed) break;
  }

  return {
    values,
    inferred: [...inferred].sort(),
    unresolved: [...unresolved].filter(feature => !Object.prototype.hasOwnProperty.call(values, feature)).sort(),
  };
}

function completeCurrent(state, frame) {
  const present = presentFeatures(state, frame);
  const result = unifiedCurrentCompletion(state, present.values);
  return {
    observed: { ...present.values },
    completed: result.values,
    inferred: result.inferred,
    unresolved: result.unresolved,
  };
}

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
  return {
    terms: Object.keys(expanded).sort().map(feature => ({
      feature,
      value: cloneRelTerm(expanded[feature]),
    })),
  };
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
    (a.dependency_count || 1) - (b.dependency_count || 1) ||
    b.bits_saved - a.bits_saved ||
    b.covered - a.covered ||
    a.id.localeCompare(b.id)
  );
  const token = eventToken(state, structure, sample);
  structure.tokens.push(token);
  structure.encoded_order.push(baseToken(token));
  structure.compiled_experiences = state.experiences.length;
}

function groundedContinuation(state, frame) {
  const present = presentFeatures(state, frame);
  const purpose = { ...present.values };
  let open = 0;
  for (let i = 0; i < state.concern_count; i++) {
    if (present.contact.concern[i] > 0) {
      purpose['relation_c' + i + '_order'] = LESS;
      open++;
    }
  }
  if (!open) return null;

  const completion = unifiedCurrentCompletion(state, purpose);
  const action = completion.values.action;
  if (!Number.isInteger(action) || action < 0 || action >= state.action_count) return null;

  const consequence = unifiedCurrentCompletion(state, { ...present.values, action });
  for (let i = 0; i < state.concern_count; i++) {
    if (consequence.values['relation_c' + i + '_order'] === GREATER) return null;
  }
  return {
    seed: purpose,
    completed: completion.values,
    inferred: completion.inferred,
    unresolved: completion.unresolved,
    action,
  };
}

function spontaneousMotor(state) {
  state.motor_variation = (Math.imul(state.motor_variation, 1664525) + 1013904223) >>> 0;
  return state.motor_variation % state.action_count;
}

// C only supplies generic relational representation mechanics. It does not know
// what OneLogic, Stone, counterexample, maturity, etc. mean.
const REL_ACTIVE = Object.freeze({ structural: 'active' });

function cloneRelTerm(value) {
  return value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
}
function relVar(name) { return { var: String(name) }; }
function relRef(id) { return { ref: String(id) }; }
function relRefName(term) {
  return term && typeof term === 'object' && !Array.isArray(term) &&
    Object.keys(term).length === 1 && typeof term.ref === 'string' ? term.ref : null;
}
function relVariableName(term) {
  return term && typeof term === 'object' && !Array.isArray(term) &&
    Object.keys(term).length === 1 && typeof term.var === 'string' ? term.var : null;
}
function normalizeRelFact(raw, fallbackId = null) {
  let id, subject, relation, object;
  if (Array.isArray(raw)) {
    if (raw.length !== 3) throw new Error('relational fact arrays require [subject, relation, object]');
    [subject, relation, object] = raw;
  } else if (raw && typeof raw === 'object') {
    ({ id, subject, relation, object } = raw);
  } else throw new Error('invalid relational fact');
  if (subject === undefined || relation === undefined || object === undefined) {
    throw new Error('relational fact requires subject/relation/object');
  }
  const triple = {
    subject: cloneRelTerm(subject),
    relation: cloneRelTerm(relation),
    object: cloneRelTerm(object),
  };
  return {
    id: String(id || fallbackId || `rho:${stable([triple.subject, triple.relation, triple.object])}`),
    ...triple,
  };
}
function normalizeRelPattern(raw) {
  const fact = normalizeRelFact(raw, 'pattern');
  return { subject: fact.subject, relation: fact.relation, object: fact.object };
}
function normalizeRelRule(raw, fallbackId = null, defaultProvenance = 'contact') {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.premises) ||
      !raw.premises.length || !raw.conclusion) {
    throw new Error('relational rule requires premises and conclusion');
  }
  const premises = raw.premises.map(normalizeRelPattern);
  const conclusion = normalizeRelPattern(raw.conclusion);
  return {
    id: String(raw.id || fallbackId || `kappa:${stable([premises, conclusion])}`),
    premises,
    conclusion,
    categorical: raw.categorical === true,
    provenance: cloneRelTerm(raw.provenance ?? defaultProvenance),
    active: raw.active !== false,
    state_history: Array.isArray(raw.state_history) ? raw.state_history.map(cloneRelTerm) : [],
  };
}
function relFactKey(fact) { return stable([fact.subject, fact.relation, fact.object]); }
function uniqueRelFacts(facts) {
  const seen = new Map();
  for (const raw of facts) {
    const fact = normalizeRelFact(raw);
    if (!seen.has(relFactKey(fact))) seen.set(relFactKey(fact), fact);
  }
  return [...seen.values()];
}
function bindRelTerm(pattern, value, binding) {
  const name = relVariableName(pattern);
  if (!name) return same(pattern, value);
  if (Object.prototype.hasOwnProperty.call(binding, name)) return same(binding[name], value);
  binding[name] = cloneRelTerm(value);
  return true;
}
function matchRelPattern(pattern, fact, binding = {}) {
  const next = { ...binding };
  if (!bindRelTerm(pattern.subject, fact.subject, next)) return null;
  if (!bindRelTerm(pattern.relation, fact.relation, next)) return null;
  if (!bindRelTerm(pattern.object, fact.object, next)) return null;
  return next;
}
function relPremiseBindings(premises, facts) {
  // Pure index: it changes neither matching nor authority. Literal relations are
  // used to avoid scanning facts that cannot possibly satisfy the premise.
  const byRelation = new Map();
  for (const fact of facts) {
    const key = stable(fact.relation);
    if (!byRelation.has(key)) byRelation.set(key, []);
    byRelation.get(key).push(fact);
  }

  let bindings = [{}];
  for (const premise of premises) {
    const relationVariable = relVariableName(premise.relation);
    const candidates = relationVariable ? facts : (byRelation.get(stable(premise.relation)) || []);
    const next = [];
    for (const binding of bindings) {
      for (const fact of candidates) {
        const matched = matchRelPattern(premise, fact, binding);
        if (matched) next.push(matched);
      }
    }
    const uniqueBindings = new Map();
    for (const binding of next) uniqueBindings.set(stable(binding), binding);
    bindings = [...uniqueBindings.values()];
    if (!bindings.length) break;
  }
  return bindings;
}
function instantiateRelTerm(term, binding) {
  const name = relVariableName(term);
  if (!name) return cloneRelTerm(term);
  return Object.prototype.hasOwnProperty.call(binding, name) ? cloneRelTerm(binding[name]) : undefined;
}
function instantiateRelPattern(pattern, binding) {
  const subject = instantiateRelTerm(pattern.subject, binding);
  const relation = instantiateRelTerm(pattern.relation, binding);
  const object = instantiateRelTerm(pattern.object, binding);
  if (subject === undefined || relation === undefined || object === undefined) return null;
  return normalizeRelFact([subject, relation, object]);
}
function relationalClosure(baseFacts, rules) {
  const facts = uniqueRelFacts(baseFacts);
  const seen = new Set(facts.map(relFactKey));
  const derived = [];
  for (let pass = 0; pass < 16; pass++) {
    let changed = false;
    for (const rule of rules) {
      if (rule.active === false) continue;
      for (const binding of relPremiseBindings(rule.premises, facts)) {
        const fact = instantiateRelPattern(rule.conclusion, binding);
        if (!fact) continue;
        const key = relFactKey(fact);
        if (seen.has(key)) continue;
        fact.id = `derived:${rule.id}:${key}`;
        fact.derived_from = rule.id;
        facts.push(fact);
        derived.push(fact);
        seen.add(key);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return { facts, derived };
}
function relRuleDescriptorFacts(rules) {
  const facts = [];
  for (const rule of rules) {
    const ref = relRef(rule.id);
    facts.push(normalizeRelFact([ref, 'kind', rule.categorical ? 'categorical_bridge' : 'relation_schema']));
    facts.push(normalizeRelFact([ref, REL_ACTIVE, rule.active !== false]));
    facts.push(normalizeRelFact([ref, 'provenance', rule.provenance]));
  }
  return facts;
}
function empiricalRelationDescriptorFacts(structure) {
  const facts = [];
  for (const pattern of structure?.patterns || []) {
    const ref = relRef(`empirical:${pattern.id}`);
    facts.push(normalizeRelFact([ref, 'kind', 'empirical_relation']));
    facts.push(normalizeRelFact([ref, 'target', pattern.target]));
    facts.push(normalizeRelFact([ref, 'expected', pattern.expected]));
    facts.push(normalizeRelFact([ref, REL_ACTIVE, pattern.active !== false]));
    for (const atom of pattern.conditions) {
      facts.push(normalizeRelFact([ref, 'condition', { feature: atom.feature, value: cloneRelTerm(atom.value) }]));
    }
  }
  for (const symbol of structure?.symbols || []) {
    const ref = relRef(`concept:${symbol.feature}`);
    facts.push(normalizeRelFact([ref, 'kind', 'learned_relation']));
    facts.push(normalizeRelFact([ref, 'handle', symbol.feature]));
    facts.push(normalizeRelFact([ref, 'depth', symbol.depth]));
    for (const atom of symbol.definition || []) {
      facts.push(normalizeRelFact([ref, 'condition', { feature: atom.feature, value: cloneRelTerm(atom.value) }]));
    }
  }
  for (const rule of structure?.order_rules || []) {
    const ref = relRef(`ordered:${rule.symbol}`);
    facts.push(normalizeRelFact([ref, 'kind', 'ordered_relation']));
    facts.push(normalizeRelFact([ref, 'handle', rule.symbol]));
    facts.push(normalizeRelFact([ref, 'depth', rule.depth]));
    facts.push(normalizeRelFact([ref, 'expansion', cloneRelTerm(rule.expansion)]));
  }
  return facts;
}
function isRelationalControlFact(fact) {
  return relRefName(fact.subject) !== null && same(fact.relation, REL_ACTIVE) && typeof fact.object === 'boolean';
}
function applyRelationalControlFacts(state, facts, provenance = 'derived') {
  let changed = false;
  for (const fact of facts) {
    if (!isRelationalControlFact(fact)) continue;
    const id = relRefName(fact.subject);
    const rule = state.knowledge.rules.find(candidate => candidate.id === id);
    if (!rule || rule.active === fact.object) continue;
    rule.active = fact.object;
    rule.state_history.push({ active: fact.object, provenance, source_fact: fact.id });
    changed = true;
  }
  return changed;
}

function foundationalRelationalSeed() {
  const V = relVar;
  const facts = [
    { id: 'stone:x:+', subject: 'stone:axis:x:+', relation: 'names', object: 'empathy' },
    { id: 'stone:x:-', subject: 'stone:axis:x:-', relation: 'names', object: 'practicality' },
    { id: 'stone:z:+', subject: 'stone:axis:z:+', relation: 'names', object: 'wisdom' },
    { id: 'stone:z:-', subject: 'stone:axis:z:-', relation: 'names', object: 'knowledge' },
    { id: 'stone:y:+', subject: 'stone:axis:y:+', relation: 'names', object: 'answerability' },
    { id: 'stone:y:-', subject: 'stone:axis:y:-', relation: 'names', object: 'insulation' },
    { id: 'stone:maturity', subject: 'stone:maturity', relation: 'answerability', object: 'full' },
    { id: 'stone:collapse', subject: 'stone:collapse', relation: 'insulation', object: 'full' },
    { id: 'stone:equator', subject: 'stone:equator', relation: 'answerability', object: 'zero' },
    { id: 'stone:sign', subject: 'stone:sign', relation: 'describes', object: 'cognitive_orientation_to_reality' },
    { id: 'stone:not-valence', subject: 'stone:sign', relation: 'not', object: 'outcome_valence' },
    { id: 'onelogic:T1', subject: 'onelogic:T1', relation: 'claim', object: { operator: 'categorical_consequence', property: 'greatest_sound', condition: 'nonempty_live_set' } },
    { id: 'onelogic:T2', subject: 'onelogic:T2', relation: 'claim', object: { operator: 'sharp_update', property: 'unique_smallest_sound_posterior' } },
    { id: 'onelogic:T3', subject: 'onelogic:T3', relation: 'claim', object: { principle: 'reality_preservation', condition: 'actuality_live_and_transition_represented' } },
    { id: 'onelogic:T4', subject: 'onelogic:T4', relation: 'claim', object: { principle: 'sound_pooling', operation: 'intersection', preserves: 'actuality' } },
    { id: 'onelogic:T5', subject: 'onelogic:T5', relation: 'claim', object: { principle: 'contraction_cannot_restore_excluded_actuality' } },
    { id: 'onelogic:T6', subject: 'onelogic:T6', relation: 'claim', object: { principle: 'query_relative_representation', forbids: 'merging_query_distinguished_possibilities' } },
    { id: 'onelogic:T7', subject: 'onelogic:T7', relation: 'claim', object: { principle: 'model_class_failure_forces_expansion' } },
    { id: 'onelogic:T8', subject: 'onelogic:T8', relation: 'claim', object: { principle: 'objective_deviation', dimensions: ['unsupported_exclusion', 'unsupported_retention'] } },
    { id: 'onelogic:T9', subject: 'onelogic:T9', relation: 'claim', object: { principle: 'sound_categorical_rules_do_not_overreach' } },
    { id: 'onelogic:T10', subject: 'onelogic:T10', relation: 'claim', object: { principle: 'counterexample_defeats_categorical_bridge' } },
  ];
  const rules = [
    {
      id: 'seed:onelogic:T10',
      premises: [[V('bridge'), 'kind', 'categorical_bridge'], [V('bridge'), 'counterexample', V('case')]],
      conclusion: [V('bridge'), REL_ACTIVE, false],
      categorical: true,
      provenance: { system: 'OneLogic', theorem: 'T10', source: '42ndLogic/formal/THEOREMS.md' },
    },
    {
      id: 'seed:onelogic:undefined',
      premises: [[V('query'), 'status', 'undefined']],
      conclusion: [V('query'), 'assertion', 'withhold'],
      categorical: true,
      provenance: { system: 'OneLogic', principle: 'undefined_is_not_false' },
    },
    {
      id: 'seed:onelogic:T7',
      premises: [[V('model'), 'actuality_relation', 'outside_model_class']],
      conclusion: [V('model'), 'required_revision', 'expand_representation'],
      categorical: true,
      provenance: { system: 'OneLogic', theorem: 'T7', source: '42ndLogic/formal/THEOREMS.md' },
    },
    {
      id: 'seed:stone:maturity',
      premises: [[V('judgment'), 'horizontal_integration', 'full'], [V('judgment'), 'answerability', 'full']],
      conclusion: [V('judgment'), 'stone_state', 'maturity'],
      categorical: true,
      provenance: { system: 'Stone', principle: 'full_integration_under_full_answerability' },
    },
    {
      id: 'seed:stone:collapse',
      premises: [[V('judgment'), 'insulation', 'full']],
      conclusion: [V('judgment'), 'stone_state', 'collapse'],
      categorical: true,
      provenance: { system: 'Stone', principle: 'full_insulation' },
    },
  ];
  return {
    facts: facts.map((fact, i) => normalizeRelFact(fact, `seed:fact:${i + 1}`)),
    rules: rules.map((rule, i) => normalizeRelRule(rule, `seed:rule:${i + 1}`, 'seed')),
  };
}
function initializeRelationalKnowledge() {
  const seed = foundationalRelationalSeed();
  const knowledge = { facts: seed.facts, rules: seed.rules, learned_rules: [], episodes: [], current: null, experience_relations_through: 0 };
  const pseudoState = { knowledge, structure: { patterns: [], symbols: [], order_rules: [] } };
  refreshRelationalKnowledge(pseudoState);
  return knowledge;
}
function refreshRelationalKnowledge(state) {
  for (let pass = 0; pass < 8; pass++) {
    const base = [
      ...state.knowledge.facts,
      ...relRuleDescriptorFacts(state.knowledge.rules),
      ...empiricalRelationDescriptorFacts(state.structure),
    ];
    const closure = relationalClosure(base, state.knowledge.rules);
    if (!applyRelationalControlFacts(state, closure.derived, 'relation_completion')) {
      state.knowledge.current = closure;
      return;
    }
  }
  const base = [
    ...state.knowledge.facts,
    ...relRuleDescriptorFacts(state.knowledge.rules),
    ...empiricalRelationDescriptorFacts(state.structure),
  ];
  state.knowledge.current = relationalClosure(base, state.knowledge.rules);
}
function ingestRelationalContact(state, contact) {
  if (!contact || typeof contact !== 'object') throw new Error('invalid relational contact');
  const rawFacts = Array.isArray(contact.facts) ? contact.facts : [];
  const rawRules = Array.isArray(contact.rules) ? contact.rules : [];
  const episodeNumber = state.knowledge.episodes.length + 1;
  const episodeFacts = rawFacts.map((raw, i) => normalizeRelFact(raw, `contact:${episodeNumber}:fact:${i + 1}`));
  const incomingRules = rawRules.map((raw, i) => normalizeRelRule(raw, `contact:${episodeNumber}:rule:${i + 1}`, 'contact'));
  const existingRuleIds = new Set(state.knowledge.rules.map(rule => rule.id));
  for (const rule of incomingRules) {
    if (existingRuleIds.has(rule.id)) throw new Error(`duplicate relational rule id: ${rule.id}`);
    state.knowledge.rules.push(rule);
    existingRuleIds.add(rule.id);
  }

  const controlFacts = episodeFacts.filter(isRelationalControlFact);
  const ordinaryFacts = episodeFacts.filter(fact => !isRelationalControlFact(fact));
  applyRelationalControlFacts(state, controlFacts, 'direct_contact');

  const existingFactKeys = new Set(state.knowledge.facts.map(relFactKey));
  for (const fact of ordinaryFacts) {
    const key = relFactKey(fact);
    if (existingFactKeys.has(key)) continue;
    state.knowledge.facts.push(fact);
    existingFactKeys.add(key);
  }
  state.knowledge.episodes.push({ facts: episodeFacts.map(fact => ({ ...fact })), rules: incomingRules.map(rule => rule.id) });
  refreshRelationalKnowledge(state);
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
    current: null,
    motor: null,
    motor_variation: (0x9e3779b9 ^ actionCount ^ (concernCount << 8)) >>> 0,
    structure: {
      samples: [], symbols: [], patterns: [], tokens: [], order_rules: [], encoded_order: [],
      fixed_point_passes: 0, compiled_experiences: 0, next_recompression_at: 4,
    },
    knowledge: initializeRelationalKnowledge(),
    prior: {
      stone: 'summary only; structured Stone claims and schemas live in M.knowledge and remain corrigible',
      onelogic: 'summary only; structured OneLogic claims and schemas live in M.knowledge and remain corrigible',
      embodiment: 'distinct perceptual channels, motor possibilities, and interoceptive pressure magnitudes are primitive physical interfaces, not learned world semantics',
      law: 'M(t+1)=C(M(t)⊕R(t+1)); C preserves exact contact, incrementally updates reusable descriptions, and reopens them under accumulating reality',
    },
  };
}

function C(state, realityContact) {
  if (!state || state.whole !== 1) throw new Error('C requires one whole mind');
  ensureExperienceRelations(state);
  syncLearnedRelationalSchemas(state);

  let frame = null;
  let relationalContact = null;
  if (Array.isArray(realityContact)) {
    frame = realityContact.slice();
  } else if (realityContact && typeof realityContact === 'object') {
    if (realityContact.frame !== undefined && realityContact.frame !== null) {
      if (!Array.isArray(realityContact.frame)) throw new Error('reality-contact frame must be an array');
      frame = realityContact.frame.slice();
    }
    if (realityContact.relations !== undefined && realityContact.relations !== null) relationalContact = realityContact.relations;
    if (!frame && !relationalContact) throw new Error('invalid reality-contact');
  } else throw new Error('invalid reality-contact');

  if (frame) {
    if (frame.length <= state.concern_count) throw new Error('invalid reality-contact');
    const cut = frame.length - state.concern_count;
    const percept = frame.slice(0, cut);
    const concern = frame.slice(cut);
    if (!percept.every(value => value === null || Number.isFinite(value))) {
      throw new Error('perceptual contact must be finite numeric values or null for unobserved channels');
    }
    if (!concern.every(Number.isFinite)) throw new Error('concern contact must be finite numeric magnitudes');

    if (state.previous_contact && state.motor != null) {
      const index = state.experiences.length;
      const experience = { before: state.previous_contact.slice(), action: state.motor, after: frame.slice() };
      state.experiences.push(experience);
      storeExperienceRelations(state, experience, index);
      const sample = directSample(state, experience, index);

      if (state.experiences.length >= state.structure.next_recompression_at) state.structure = recompressWhole(state);
      else assimilateExperience(state, sample);
    }

    state.contacts.push(frame.slice());
    state.previous_contact = frame;
    state.current = completeCurrent(state, frame);
    const continuation = groundedContinuation(state, frame);
    if (continuation) {
      state.current.continuation = {
        grounded: true,
        seed: continuation.seed,
        completed: continuation.completed,
        inferred: continuation.inferred,
        unresolved: continuation.unresolved,
      };
      state.motor = continuation.action;
    } else {
      state.motor = spontaneousMotor(state);
      state.current.continuation = {
        grounded: false,
        seed: null,
        completed: { action: state.motor },
        inferred: [],
        unresolved: [],
        source: 'physical_variation',
      };
    }
  }

  if (relationalContact) ingestRelationalContact(state, relationalContact);
  return state;
}

module.exports = { one, C };
