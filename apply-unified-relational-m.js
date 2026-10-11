'use strict';

const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'one-mind.js');
let source = fs.readFileSync(file, 'utf8');

function replaceFunction(name, replacement) {
  const needle = `function ${name}(`;
  const start = source.indexOf(needle);
  if (start < 0) throw new Error(`missing function ${name}`);
  const brace = source.indexOf('{', start);
  if (brace < 0) throw new Error(`missing body ${name}`);
  let depth = 0, quote = null, escape = false, end = -1;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end < 0) throw new Error(`unterminated function ${name}`);
  source = source.slice(0, start) + replacement.trim() + source.slice(end);
}

replaceFunction('directSample', String.raw`
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

  // The empirical search index is a lossless view of the contacted transition,
  // not a second cognitive representation. Ordinary later percepts remain terms
  // of the same experienced relation instead of disappearing behind concern-only
  // consequence summaries. `next:` is only the structural path through the exact
  // before -> action -> after episode already retained in M.
  for (let i = 0; i < end.contact.percept.length; i++) {
    if (end.contact.percept[i] !== null) values[`next:p${i}`] = end.contact.percept[i];
  }
  for (let i = 0; i < state.concern_count; i++) {
    const order = magnitudeOrder(end.contact.concern[i], start.contact.concern[i]);
    values[`immediate_c${i}_order`] = order;
    values[`relation_c${i}_order`] = order;
  }
  return { id: `e${index}`, values };
}`);

const insertionPoint = source.indexOf('\nfunction symbolDependencies(');
if (insertionPoint < 0) throw new Error('missing symbolDependencies insertion point');
const relationalExperienceHelpers = String.raw`

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
`;
source = source.slice(0, insertionPoint) + relationalExperienceHelpers + source.slice(insertionPoint);

const completionInsertion = source.indexOf('\nfunction completeCurrent(');
if (completionInsertion < 0) throw new Error('missing completeCurrent insertion point');
const completionHelper = String.raw`

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
`;
source = source.slice(0, completionInsertion) + completionHelper + source.slice(completionInsertion);

replaceFunction('completeCurrent', String.raw`
function completeCurrent(state, frame) {
  const present = presentFeatures(state, frame);
  let completed = { ...present.values };
  const inferred = new Set();
  const unresolved = new Set();
  const byFeature = new Map(state.structure.symbols.map(s => [s.feature, s]));

  for (let pass = 0; pass < 12; pass++) {
    let changed = false;

    // Structured knowledge and empirical contact now meet on the same current
    // subject. A relation learned/taught in M.knowledge can therefore complete
    // ordinary perception, and its conclusion immediately becomes empirical
    // relational material on the next pass (and vice versa).
    const fromKnowledge = knowledgeCompleteValues(state, completed);
    for (const feature of fromKnowledge.unresolved) unresolved.add(feature);
    for (const [feature, value] of Object.entries(fromKnowledge.values)) {
      if (Object.prototype.hasOwnProperty.call(completed, feature)) continue;
      completed[feature] = value;
      inferred.add(feature);
      changed = true;
    }

    const expanded = expandPartial(completed, state.structure.symbols);
    for (const [feature, value] of Object.entries(expanded)) {
      if (Object.prototype.hasOwnProperty.call(completed, feature)) continue;
      completed[feature] = value;
      inferred.add(feature);
      changed = true;
    }

    const orderedSymbols = state.structure.symbols.slice().sort((a, b) => b.depth - a.depth || a.feature.localeCompare(b.feature));
    for (const symbol of orderedSymbols) {
      if (completed[symbol.feature] !== true) continue;
      if (!symbolCompatible(symbol, true, completed, byFeature)) {
        unresolved.add(symbol.feature);
        continue;
      }
      for (const atom of symbol.definition) {
        if (Object.prototype.hasOwnProperty.call(completed, atom.feature)) continue;
        completed[atom.feature] = atom.value;
        inferred.add(atom.feature);
        changed = true;
      }
    }

    const prediction = predict(state.structure, completed);
    for (const [target, relation] of Object.entries(prediction.best_by_target)) {
      if (Object.prototype.hasOwnProperty.call(completed, target)) continue;
      const rival = prediction.active.find(other =>
        other.target === target && !same(other.expected, relation.expected) &&
        Math.abs(other.predictive_code_bits - relation.predictive_code_bits) < 1e-9
      );
      if (rival) {
        unresolved.add(target);
        continue;
      }
      const symbol = byFeature.get(target);
      if (!symbolCompatible(symbol, relation.expected, completed, byFeature)) {
        unresolved.add(target);
        continue;
      }
      completed[target] = relation.expected;
      inferred.add(target);
      changed = true;
    }
    if (!changed) break;
  }

  return {
    observed: { ...present.values },
    completed,
    inferred: [...inferred].sort(),
    unresolved: [...unresolved].filter(feature => !Object.prototype.hasOwnProperty.call(completed, feature)).sort(),
  };
}`);

replaceFunction('eventToken', String.raw`
function eventToken(state, structure, sample) {
  const expanded = expandPartial(sample.values, structure.symbols);
  // Ordered experience is no longer projected onto a special action/pressure
  // vocabulary. The temporal compressor receives the same grounded terms as the
  // relational learner, including raw perceptual contact and learned handles.
  return {
    terms: Object.keys(expanded).sort().map(feature => ({
      feature,
      value: cloneRelTerm(expanded[feature]),
    })),
  };
}`);

replaceFunction('groundedContinuation', String.raw`
function groundedContinuation(state, frame) {
  if (state.experiences.length < 4 || !state.structure.patterns.length) return null;
  const present = presentFeatures(state, frame);
  const purpose = { ...present.values };
  let open = 0;
  for (let i = 0; i < state.concern_count; i++) {
    if (present.contact.concern[i] > 0) { purpose[`relation_c${i}_order`] = LESS; open++; }
  }
  if (!open) return null;

  const completed = { ...purpose };
  const inferred = new Set();
  const unresolved = new Set();
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    const fromKnowledge = knowledgeCompleteValues(state, completed);
    for (const feature of fromKnowledge.unresolved) unresolved.add(feature);
    for (const [feature, value] of Object.entries(fromKnowledge.values)) {
      if (Object.prototype.hasOwnProperty.call(completed, feature)) continue;
      completed[feature] = value;
      inferred.add(feature);
      changed = true;
    }

    const prediction = predict(state.structure, completed);
    for (const [target, relation] of Object.entries(prediction.best_by_target)) {
      if (Object.prototype.hasOwnProperty.call(completed, target)) continue;
      const rival = prediction.active.find(other =>
        other.target === target && !same(other.expected, relation.expected) &&
        Math.abs(other.predictive_code_bits - relation.predictive_code_bits) < 1e-9
      );
      if (rival) { unresolved.add(target); continue; }
      completed[target] = relation.expected;
      inferred.add(target);
      changed = true;
    }
    if (!changed) break;
  }
  const action = completed.action;
  if (!Number.isInteger(action) || action < 0 || action >= state.action_count) return null;

  const consequenceSeed = { ...present.values, action };
  const consequenceKnowledge = knowledgeCompleteValues(state, consequenceSeed).values;
  const consequences = predict(state.structure, consequenceKnowledge).best_by_target;
  for (let i = 0; i < state.concern_count; i++) {
    const key = `relation_c${i}_order`;
    if (consequenceKnowledge[key] === GREATER) return null;
    const evidence = consequences[key];
    if (evidence && evidence.expected === GREATER) return null;
  }
  return {
    seed: purpose,
    completed,
    inferred: [...inferred].sort(),
    unresolved: [...unresolved].filter(feature => !Object.prototype.hasOwnProperty.call(completed, feature)).sort(),
    action,
  };
}`);

replaceFunction('empiricalRelationDescriptorFacts', String.raw`
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
}`);

replaceFunction('initializeRelationalKnowledge', String.raw`
function initializeRelationalKnowledge() {
  const seed = foundationalRelationalSeed();
  const knowledge = { facts: seed.facts, rules: seed.rules, episodes: [], current: null, experience_relations_through: 0 };
  const pseudoState = { knowledge, structure: { patterns: [], symbols: [], order_rules: [] } };
  refreshRelationalKnowledge(pseudoState);
  return knowledge;
}`);

// Integrate historical and newly closed embodied experience into the same
// first-class relation substrate. Existing serialized M states migrate lazily and
// deterministically from their exact retained experiences; nothing is relabeled by
// world semantics and canonical history is not discarded.
const cStart = source.indexOf('function C(state, realityContact) {');
if (cStart < 0) throw new Error('missing C');
const validateLine = "  if (!state || state.whole !== 1) throw new Error('C requires one whole mind');";
const validateAt = source.indexOf(validateLine, cStart);
if (validateAt < 0) throw new Error('missing C validation');
const afterValidate = validateAt + validateLine.length;
source = source.slice(0, afterValidate) + "\n  ensureExperienceRelations(state);" + source.slice(afterValidate);

const experienceNeedle = `      state.experiences.push(experience);\n      const sample = directSample(state, experience, index);`;
if (!source.includes(experienceNeedle)) throw new Error('missing experience assimilation block');
source = source.replace(experienceNeedle, `      state.experiences.push(experience);\n      storeExperienceRelations(state, experience, index);\n      const sample = directSample(state, experience, index);`);

const structureNeedle = `      if (state.experiences.length >= state.structure.next_recompression_at) state.structure = recompressWhole(state);\n      else assimilateExperience(state, sample);`;
if (!source.includes(structureNeedle)) throw new Error('missing structure update block');
source = source.replace(structureNeedle, `      if (state.experiences.length >= state.structure.next_recompression_at) state.structure = recompressWhole(state);\n      else assimilateExperience(state, sample);\n      refreshRelationalKnowledge(state);`);

fs.writeFileSync(file, source);
console.log('Applied unified relational M correction to one-mind.js');
