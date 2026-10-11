'use strict';

const fs = require('fs');
const file = 'one-mind.js';
let source = fs.readFileSync(file, 'utf8');

function replaceFunction(name, replacement) {
  const needle = `function ${name}(`;
  const start = source.indexOf(needle);
  if (start < 0) throw new Error(`missing function ${name}`);
  const brace = source.indexOf('{', start);
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
function insertBefore(needle, text) {
  const at = source.indexOf(needle);
  if (at < 0) throw new Error(`missing insertion point: ${needle}`);
  source = source.slice(0, at) + '\n' + text.trim() + '\n' + source.slice(at);
}

// Search compatibility remains, but ordinary later perception is no longer
// authored into next:pN pseudo-features. The exact transition already exists in
// M's first-class contact graph.
replaceFunction('directSample', String.raw`
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
    values['immediate_c' + i + '_order'] = order;
    values['relation_c' + i + '_order'] = order;
  }
  return { id: 'e' + index, values };
}`);

const growth = String.raw`
function ensureFirstClassGrowth(state) {
  if (!state.knowledge) return;
  if (!Array.isArray(state.knowledge.relational_patterns)) state.knowledge.relational_patterns = [];
  if (!Array.isArray(state.knowledge.relational_concepts)) state.knowledge.relational_concepts = [];
  if (!Number.isFinite(state.knowledge.next_relation_recompression_at)) state.knowledge.next_relation_recompression_at = 0;
}
function contactNumber(subject) {
  if (typeof subject !== 'string') return null;
  const match = /^contact:(\d+)$/.exec(subject);
  return match ? Number(match[1]) : null;
}
function contactSubject(state) { return 'contact:' + state.experiences.length; }

function contactRowsFromFacts(facts) {
  const grouped = new Map();
  for (const fact of facts || []) {
    if (contactNumber(fact.subject) === null) continue;
    if (!grouped.has(fact.subject)) grouped.set(fact.subject, new Map());
    const relation = String(fact.relation);
    if (relation === 'next' || relation === 'experience') continue;
    const byRelation = grouped.get(fact.subject);
    if (!byRelation.has(relation)) byRelation.set(relation, []);
    byRelation.get(relation).push(cloneRelTerm(fact.object));
  }
  const rows = new Map();
  for (const [subject, byRelation] of grouped) {
    const values = {};
    for (const [relation, objects] of byRelation) {
      const distinct = unique(objects);
      if (distinct.length === 1) values[relation] = cloneRelTerm(distinct[0]);
    }
    rows.set(subject, values);
  }
  return rows;
}
function nextMaps(state) {
  const next = new Map(), previous = new Map();
  for (const fact of state.knowledge.facts || []) {
    if (fact.relation !== 'next' || contactNumber(fact.subject) === null || contactNumber(fact.object) === null) continue;
    next.set(fact.subject, fact.object);
    previous.set(fact.object, fact.subject);
  }
  return { next, previous };
}

function conceptKey(premises, focus) {
  return stable([premises.map(normalizeRelPattern), normalizeRelPattern([focus, '__focus__', true])]);
}
function nextConceptHandle(state) {
  const used = new Set((state.knowledge.relational_concepts || []).map(c => c.handle));
  let n = 1;
  while (used.has('§r' + n)) n++;
  return '§r' + n;
}
function conceptDepth(state, premises) {
  const depths = new Map((state.knowledge.relational_concepts || []).map(c => [c.handle, c.depth || 1]));
  let deepest = 0;
  for (const raw of premises) {
    const p = normalizeRelPattern(raw);
    if (p.object === true && depths.has(String(p.relation))) deepest = Math.max(deepest, depths.get(String(p.relation)));
  }
  return deepest + 1;
}
function addConcept(state, premises, focus, source) {
  const normalized = premises.map(normalizeRelPattern);
  const definitionKey = conceptKey(normalized, focus);
  const found = state.knowledge.relational_concepts.find(c => c.definition_key === definitionKey);
  if (found) return { concept: found, added: false };
  const concept = {
    handle: nextConceptHandle(state),
    depth: conceptDepth(state, normalized),
    definition_key: definitionKey,
    premises: normalized.map(cloneRelTerm),
    focus: cloneRelTerm(focus),
    source: cloneRelTerm(source),
  };
  state.knowledge.relational_concepts.push(concept);
  return { concept, added: true };
}

function evaluateConcept(concept, focusSubject, rows, maps) {
  const focusVar = relVariableName(concept.focus);
  if (!focusVar) return { evaluable: false, matches: false };
  const binding = { [focusVar]: focusSubject };

  for (const premise of concept.premises || []) {
    if (premise.relation !== 'next') continue;
    const sVar = relVariableName(premise.subject);
    const oVar = relVariableName(premise.object);
    if (sVar && oVar && binding[oVar] && !binding[sVar]) binding[sVar] = maps.previous.get(binding[oVar]);
    else if (sVar && oVar && binding[sVar] && !binding[oVar]) binding[oVar] = maps.next.get(binding[sVar]);
    if (sVar && !binding[sVar]) return { evaluable: false, matches: false };
    if (oVar && !binding[oVar]) return { evaluable: false, matches: false };
    const s = sVar ? binding[sVar] : premise.subject;
    const o = oVar ? binding[oVar] : premise.object;
    if (!s || !o || maps.next.get(s) !== o) return { evaluable: false, matches: false };
  }

  let matches = true;
  for (const premise of concept.premises || []) {
    if (premise.relation === 'next') continue;
    const sVar = relVariableName(premise.subject);
    const subject = sVar ? binding[sVar] : premise.subject;
    const row = subject ? rows.get(subject) : null;
    if (!row) return { evaluable: false, matches: false };
    const relation = String(premise.relation);
    if (!Object.prototype.hasOwnProperty.call(row, relation)) return { evaluable: false, matches: false };
    const actual = row[relation];
    const objectVar = relVariableName(premise.object);
    if (objectVar) {
      if (Object.prototype.hasOwnProperty.call(binding, objectVar) && !same(binding[objectVar], actual)) matches = false;
      else binding[objectVar] = cloneRelTerm(actual);
    } else if (!same(actual, premise.object)) matches = false;
  }
  return { evaluable: true, matches };
}

function materializeConceptFacts(state, subjects = null) {
  ensureFirstClassGrowth(state);
  refreshRelationalKnowledge(state);
  const rows = contactRowsFromFacts(state.knowledge.current?.facts || state.knowledge.facts);
  const maps = nextMaps(state);
  const selected = subjects ? subjects.filter(s => rows.has(s)) : [...rows.keys()];
  const existing = new Set((state.knowledge.facts || []).map(relFactKey));
  let added = 0;
  const concepts = state.knowledge.relational_concepts.slice()
    .sort((a, b) => (a.depth || 1) - (b.depth || 1) || a.handle.localeCompare(b.handle));
  for (const concept of concepts) {
    for (const subject of selected) {
      const row = rows.get(subject);
      if (row[concept.handle] === true) continue;
      const status = evaluateConcept(concept, subject, rows, maps);
      if (!status.matches) continue;
      const fact = normalizeRelFact([subject, concept.handle, true]);
      const key = relFactKey(fact);
      if (!existing.has(key)) {
        state.knowledge.facts.push(fact);
        existing.add(key);
        added++;
      }
      row[concept.handle] = true;
    }
  }
  if (added) refreshRelationalKnowledge(state);
  return added;
}

function conceptSearchRows(state) {
  refreshRelationalKnowledge(state);
  const rows = contactRowsFromFacts(state.knowledge.current?.facts || state.knowledge.facts);
  const maps = nextMaps(state);
  const concepts = state.knowledge.relational_concepts.slice()
    .sort((a, b) => (a.depth || 1) - (b.depth || 1) || a.handle.localeCompare(b.handle));
  for (const concept of concepts) {
    for (const [subject, row] of rows) {
      if (Object.prototype.hasOwnProperty.call(row, concept.handle)) continue;
      const status = evaluateConcept(concept, subject, rows, maps);
      if (status.evaluable) row[concept.handle] = status.matches;
    }
  }
  return rows;
}

function conditionSet(pattern) { return new Set((pattern.conditions || []).map(atomKey)); }
function strictPatternSubset(a, b) {
  if ((a.conditions || []).length >= (b.conditions || []).length) return false;
  const aa = conditionSet(a), bb = conditionSet(b);
  for (const key of aa) if (!bb.has(key)) return false;
  return true;
}
function nonredundantPattern(pattern, all) {
  return !all.some(other => other !== pattern && other.target === pattern.target && same(other.expected, pattern.expected) &&
    strictPatternSubset(other, pattern) && other.predictive_code_bits <= pattern.predictive_code_bits + 1e-12);
}
function relationPatternKey(pattern) {
  return conditionKey(pattern.conditions || []) + '=>' + String(pattern.target) + '=' + stable(pattern.expected);
}
function discoverContactPatterns(state, rows) {
  const samples = [...rows.entries()].sort((a, b) => contactNumber(a[0]) - contactNumber(b[0]))
    .map(([id, values]) => ({ id, values }));
  return learnPatterns(samples, [], 2).map(p => ({
    ...p,
    id: 'rel:' + relationPatternKey(p),
    source: 'first_class_M',
  }));
}
function addSameSubjectConcepts(state, patterns, budget) {
  const S = relVar('focus_contact');
  let added = 0;
  for (const pattern of patterns) {
    if (added >= budget) break;
    if ((pattern.conditions || []).length < 2 || !nonredundantPattern(pattern, patterns)) continue;
    const premises = pattern.conditions.map(atom => [S, atom.feature, cloneRelTerm(atom.value)]);
    const result = addConcept(state, premises, S, {
      kind: 'same_subject', target: pattern.target, expected: cloneRelTerm(pattern.expected),
      authority: pattern.predictive_code_bits, bits_saved: pattern.bits_saved,
    });
    if (result.added) added++;
  }
  return added;
}

function successionSamples(state, rows) {
  const out = [];
  const links = (state.knowledge.facts || []).filter(f => f.relation === 'next' && contactNumber(f.subject) !== null && contactNumber(f.object) !== null)
    .sort((a, b) => contactNumber(a.subject) - contactNumber(b.subject));
  for (const link of links) {
    const before = rows.get(link.subject), after = rows.get(link.object);
    if (!before || !after) continue;
    const values = {};
    for (const [relation, value] of Object.entries(before)) values['before|' + relation] = cloneRelTerm(value);
    for (const [relation, value] of Object.entries(after)) values['after|' + relation] = cloneRelTerm(value);
    out.push({ id: link.subject + '->' + link.object, values });
  }
  return out;
}
function rolePremise(atom, P, C) {
  const feature = String(atom.feature);
  const cut = feature.indexOf('|');
  if (cut < 0) return null;
  const role = feature.slice(0, cut), relation = feature.slice(cut + 1);
  if (role === 'before') return [P, relation, cloneRelTerm(atom.value)];
  if (role === 'after') return [C, relation, cloneRelTerm(atom.value)];
  return null;
}
function addSuccessiveConcepts(state, rows, budget) {
  const samples = successionSamples(state, rows);
  if (samples.length < 4 || budget <= 0) return 0;
  const patterns = learnPatterns(samples, [], 2);
  const P = relVar('earlier_contact'), C = relVar('focus_contact');
  let added = 0;
  for (const pattern of patterns) {
    if (added >= budget) break;
    if (!nonredundantPattern(pattern, patterns)) continue;
    const atoms = [...(pattern.conditions || []), { feature: pattern.target, value: cloneRelTerm(pattern.expected) }];
    if (!atoms.some(a => String(a.feature).startsWith('before|')) || !atoms.some(a => String(a.feature).startsWith('after|'))) continue;
    const premises = [[P, 'next', C]];
    let valid = true;
    for (const atom of atoms) {
      const premise = rolePremise(atom, P, C);
      if (!premise) { valid = false; break; }
      premises.push(premise);
    }
    if (!valid) continue;
    const result = addConcept(state, premises, C, {
      kind: 'successive', authority: pattern.predictive_code_bits, bits_saved: pattern.bits_saved, covered: pattern.covered,
    });
    if (result.added) added++;
  }
  return added;
}

function recompressFirstClassM(state) {
  ensureFirstClassGrowth(state);
  if (state.experiences.length < 4) {
    state.knowledge.next_relation_recompression_at = 4;
    return;
  }
  materializeConceptFacts(state);
  let remaining = 8;
  for (let pass = 0; pass < 3 && remaining > 0; pass++) {
    const rows = conceptSearchRows(state);
    const patterns = discoverContactPatterns(state, rows);
    state.knowledge.relational_patterns = patterns;
    const sameAdded = addSameSubjectConcepts(state, patterns, Math.min(4, remaining));
    remaining -= sameAdded;
    const successiveAdded = addSuccessiveConcepts(state, rows, Math.min(4, remaining));
    remaining -= successiveAdded;
    if (!(sameAdded + successiveAdded)) break;
    materializeConceptFacts(state);
  }
  const rows = conceptSearchRows(state);
  state.knowledge.relational_patterns = discoverContactPatterns(state, rows);
  state.knowledge.next_relation_recompression_at = nextRecompressionAt(state.experiences.length);
}

function firstClassSchemas(state) {
  const S = relVar('current_subject');
  return (state.knowledge.relational_patterns || []).filter(p => p.active !== false).map(pattern =>
    learnedSchema(S, pattern.conditions || [], pattern.target, pattern.expected, {
      id: 'learned:first-class:' + pattern.id,
      kind: 'empirical_relation', active: true,
      authority: pattern.predictive_code_bits, bits_saved: pattern.bits_saved, covered: pattern.covered,
      source: { relation_source: 'first_class_M', support: pattern.support, exceptions: pattern.exceptions, reliability: pattern.reliability },
    })
  );
}

function recognizeCurrentConcepts(state, subject, values) {
  const rows = contactRowsFromFacts(state.knowledge.current?.facts || state.knowledge.facts);
  rows.set(subject, { ...(rows.get(subject) || {}), ...values });
  const maps = nextMaps(state);
  const concepts = state.knowledge.relational_concepts.slice()
    .sort((a, b) => (a.depth || 1) - (b.depth || 1) || a.handle.localeCompare(b.handle));
  let changed = false;
  for (const concept of concepts) {
    if (Object.prototype.hasOwnProperty.call(values, concept.handle)) continue;
    const status = evaluateConcept(concept, subject, rows, maps);
    if (status.matches) {
      values[concept.handle] = true;
      rows.get(subject)[concept.handle] = true;
      changed = true;
    }
  }
  return changed;
}
`;
insertBefore('\nfunction completeCurrent(', growth);

replaceFunction('syncLearnedRelationalSchemas', String.raw`
function syncLearnedRelationalSchemas(state) {
  if (!state.knowledge) return;
  ensureFirstClassGrowth(state);
  state.knowledge.learned_rules = firstClassSchemas(state);
}`);

replaceFunction('unifiedCurrentCompletion', String.raw`
function unifiedCurrentCompletion(state, seedValues) {
  ensureFirstClassGrowth(state);
  syncLearnedRelationalSchemas(state);
  const subject = contactSubject(state);
  const values = { ...seedValues };
  const unresolved = new Set();
  const inferred = new Set();

  for (let pass = 0; pass < 16; pass++) {
    let changed = false;
    if (recognizeCurrentConcepts(state, subject, values)) changed = true;

    const currentFacts = Object.entries(values).map(([relation, object]) => normalizeRelFact([subject, relation, cloneRelTerm(object)]));
    const base = [...state.knowledge.facts, ...relRuleDescriptorFacts(state.knowledge.rules), ...currentFacts];
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

    const byTarget = new Map();
    for (const rule of state.knowledge.learned_rules || []) {
      if (rule.active === false) continue;
      for (const binding of learnedRuleBindings(rule, values, subject)) {
        const conclusion = learnedRuleConclusion(rule, binding);
        if (!conclusion || !same(conclusion.subject, subject)) continue;
        const key = String(conclusion.relation);
        if (!byTarget.has(key)) byTarget.set(key, []);
        byTarget.get(key).push({ rule, conclusion });
      }
    }
    for (const [relation, candidates] of byTarget) {
      if (Object.prototype.hasOwnProperty.call(values, relation)) continue;
      candidates.sort((a, b) =>
        (a.rule.authority ?? Infinity) - (b.rule.authority ?? Infinity) ||
        (b.rule.bits_saved ?? -Infinity) - (a.rule.bits_saved ?? -Infinity) ||
        (b.rule.covered ?? -Infinity) - (a.rule.covered ?? -Infinity) || a.rule.id.localeCompare(b.rule.id));
      const best = candidates[0];
      const rival = candidates.find(other => !same(other.conclusion.object, best.conclusion.object) &&
        Math.abs((other.rule.authority ?? Infinity) - (best.rule.authority ?? Infinity)) < 1e-9);
      if (rival) { unresolved.add(relation); continue; }
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
}`);

const initOld = "const knowledge = { facts: seed.facts, rules: seed.rules, learned_rules: [], episodes: [], current: null, experience_relations_through: 0 };";
const initNew = "const knowledge = { facts: seed.facts, rules: seed.rules, learned_rules: [], relational_patterns: [], relational_concepts: [], episodes: [], current: null, experience_relations_through: 0, next_relation_recompression_at: 0 };";
if (!source.includes(initOld)) throw new Error('unexpected knowledge initializer');
source = source.replace(initOld, initNew);

const cInit = "  ensureExperienceRelations(state);\n  syncLearnedRelationalSchemas(state);";
if (!source.includes(cInit)) throw new Error('missing C initialization');
source = source.replace(cInit,
  "  ensureExperienceRelations(state);\n  ensureFirstClassGrowth(state);\n  if (state.experiences.length >= state.knowledge.next_relation_recompression_at) recompressFirstClassM(state);\n  syncLearnedRelationalSchemas(state);");

const store = "      storeExperienceRelations(state, experience, index);\n      const sample = directSample(state, experience, index);";
if (!source.includes(store)) throw new Error('missing experience store');
source = source.replace(store,
  "      storeExperienceRelations(state, experience, index);\n      refreshRelationalKnowledge(state);\n      materializeConceptFacts(state, ['contact:' + (index + 1)]);\n      if (state.experiences.length >= state.knowledge.next_relation_recompression_at) recompressFirstClassM(state);\n      syncLearnedRelationalSchemas(state);\n      const sample = directSample(state, experience, index);");

fs.writeFileSync(file, source);
console.log('Applied incremental first-class relational growth');
