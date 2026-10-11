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

// Remove the earlier search shortcut. Exact after-contact percepts already live
// in the first-class contact graph; they must not become authored next:pN features.
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

const helpers = String.raw`
function ensureRelationalGrowthState(state) {
  if (!state.knowledge) return;
  if (!Array.isArray(state.knowledge.relational_patterns)) state.knowledge.relational_patterns = [];
  if (!Array.isArray(state.knowledge.relational_concepts)) state.knowledge.relational_concepts = [];
  if (!Number.isFinite(state.knowledge.next_relation_recompression_at)) state.knowledge.next_relation_recompression_at = 0;
}

function contactNumber(subject) {
  if (typeof subject !== 'string') return null;
  const m = /^contact:(\\d+)$/.exec(subject);
  return m ? Number(m[1]) : null;
}

function factsForRelationalSearch(state) {
  refreshRelationalKnowledge(state);
  return state.knowledge.current?.facts || state.knowledge.facts || [];
}

function singleValuedRelationRows(facts) {
  const grouped = new Map();
  for (const fact of facts) {
    const n = contactNumber(fact.subject);
    if (n === null) continue;
    if (!grouped.has(fact.subject)) grouped.set(fact.subject, new Map());
    const byRelation = grouped.get(fact.subject);
    const relation = String(fact.relation);
    if (relation === 'next' || relation === 'experience') continue;
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

function relationalPatternKey(pattern) {
  return conditionKey(pattern.conditions || []) + '=>' + String(pattern.target) + '=' + stable(pattern.expected);
}

function discoverSameSubjectPatterns(state, rows) {
  const samples = [...rows.entries()]
    .sort((a, b) => contactNumber(a[0]) - contactNumber(b[0]))
    .map(([id, values]) => ({ id, values }));
  return learnPatterns(samples, [], 2).map(pattern => ({
    ...pattern,
    id: 'rel:' + relationalPatternKey(pattern),
    source: 'first_class_contact_relation',
  }));
}

function conceptRuleId(handle) { return 'learned:relational-concept:' + handle; }
function conceptDefinitionKey(premises, focus) {
  return stable([premises.map(normalizeRelPattern), normalizeRelPattern([focus, '__focus__', true])]);
}
function nextRelationalHandle(state) {
  let n = 1;
  const used = new Set((state.knowledge.relational_concepts || []).map(c => c.handle));
  while (used.has('§r' + n)) n++;
  return '§r' + n;
}
function conceptDepthFromPremises(state, premises) {
  const depth = new Map((state.knowledge.relational_concepts || []).map(c => [c.handle, c.depth || 1]));
  let d = 0;
  for (const premise of premises) {
    const p = normalizeRelPattern(premise);
    if (p.object === true && depth.has(String(p.relation))) d = Math.max(d, depth.get(String(p.relation)));
  }
  return d + 1;
}

function addRelationalConcept(state, premises, focus, source) {
  const normalized = premises.map(normalizeRelPattern);
  const key = conceptDefinitionKey(normalized, focus);
  const existing = (state.knowledge.relational_concepts || []).find(c => c.definition_key === key);
  if (existing) return existing;
  const handle = nextRelationalHandle(state);
  const concept = {
    handle,
    depth: conceptDepthFromPremises(state, normalized),
    definition_key: key,
    premises: normalized.map(cloneRelTerm),
    focus: cloneRelTerm(focus),
    source: cloneRelTerm(source),
  };
  state.knowledge.relational_concepts.push(concept);
  state.knowledge.rules.push(normalizeRelRule({
    id: conceptRuleId(handle),
    premises: normalized,
    conclusion: [cloneRelTerm(focus), handle, true],
    provenance: { kind: 'learned_relational_compression', source: cloneRelTerm(source) },
  }, conceptRuleId(handle), 'learned_relation'));
  return concept;
}

function discoverSameSubjectConcepts(state, patterns, maxNew = 4) {
  let added = 0;
  const S = relVar('concept_subject');
  for (const pattern of patterns) {
    if (added >= maxNew) break;
    if (!Array.isArray(pattern.conditions) || pattern.conditions.length < 2) continue;
    const premises = pattern.conditions.map(atom => [S, atom.feature, cloneRelTerm(atom.value)]);
    const before = state.knowledge.relational_concepts.length;
    addRelationalConcept(state, premises, S, {
      kind: 'same_subject',
      target: pattern.target,
      expected: cloneRelTerm(pattern.expected),
      bits_saved: pattern.bits_saved,
      authority: pattern.predictive_code_bits,
    });
    if (state.knowledge.relational_concepts.length > before) added++;
  }
  return added;
}

function successionSamples(state, rows) {
  const facts = state.knowledge.facts || [];
  const links = facts.filter(f => f.relation === 'next' && contactNumber(f.subject) !== null && contactNumber(f.object) !== null)
    .sort((a, b) => contactNumber(a.subject) - contactNumber(b.subject));
  const out = [];
  for (const link of links) {
    const before = rows.get(link.subject);
    const after = rows.get(link.object);
    if (!before || !after) continue;
    const values = {};
    for (const [relation, value] of Object.entries(before)) values['before|' + relation] = cloneRelTerm(value);
    for (const [relation, value] of Object.entries(after)) values['after|' + relation] = cloneRelTerm(value);
    out.push({ id: link.subject + '->' + link.object, values });
  }
  return out;
}

function roleAtomToPremise(atom, P, C) {
  const split = String(atom.feature).indexOf('|');
  if (split < 0) return null;
  const role = String(atom.feature).slice(0, split);
  const relation = String(atom.feature).slice(split + 1);
  if (role === 'before') return [P, relation, cloneRelTerm(atom.value)];
  if (role === 'after') return [C, relation, cloneRelTerm(atom.value)];
  return null;
}

function discoverSuccessiveConcepts(state, rows, maxNew = 4) {
  const samples = successionSamples(state, rows);
  if (samples.length < 4) return 0;
  const patterns = learnPatterns(samples, [], 2);
  const P = relVar('prior_contact');
  const C = relVar('later_contact');
  let added = 0;
  for (const pattern of patterns) {
    if (added >= maxNew) break;
    const all = [...(pattern.conditions || []), { feature: pattern.target, value: cloneRelTerm(pattern.expected) }];
    const hasBefore = all.some(a => String(a.feature).startsWith('before|'));
    const hasAfter = all.some(a => String(a.feature).startsWith('after|'));
    if (!hasBefore || !hasAfter) continue;
    const premises = [[P, 'next', C]];
    let valid = true;
    for (const atom of all) {
      const premise = roleAtomToPremise(atom, P, C);
      if (!premise) { valid = false; break; }
      premises.push(premise);
    }
    if (!valid) continue;
    const before = state.knowledge.relational_concepts.length;
    addRelationalConcept(state, premises, C, {
      kind: 'successive',
      bits_saved: pattern.bits_saved,
      authority: pattern.predictive_code_bits,
      covered: pattern.covered,
    });
    if (state.knowledge.relational_concepts.length > before) added++;
  }
  return added;
}

function recompressFirstClassRelations(state) {
  ensureRelationalGrowthState(state);
  if (state.experiences.length < 4) {
    state.knowledge.next_relation_recompression_at = 4;
    return;
  }

  // A few fixed-point passes are a finite search bound, not a temporal window.
  // Each new handle is an ordinary first-class relation and can participate in a
  // later pass or a later life update, so relational span grows recursively.
  for (let pass = 0; pass < 3; pass++) {
    const facts = factsForRelationalSearch(state);
    const rows = singleValuedRelationRows(facts);
    const patterns = discoverSameSubjectPatterns(state, rows);
    state.knowledge.relational_patterns = patterns;
    const a = discoverSameSubjectConcepts(state, patterns, 4);
    const b = discoverSuccessiveConcepts(state, rows, 4);
    if (!(a + b)) break;
    refreshRelationalKnowledge(state);
  }
  const facts = factsForRelationalSearch(state);
  state.knowledge.relational_patterns = discoverSameSubjectPatterns(state, singleValuedRelationRows(facts));
  state.knowledge.next_relation_recompression_at = nextRecompressionAt(state.experiences.length);
}

function firstClassLearnedSchemas(state) {
  const S = relVar('current_subject');
  return (state.knowledge.relational_patterns || []).filter(p => p.active !== false).map(pattern =>
    learnedSchema(S, pattern.conditions || [], pattern.target, pattern.expected, {
      id: 'learned:first-class:' + pattern.id,
      kind: 'empirical_relation',
      active: pattern.active !== false,
      authority: pattern.predictive_code_bits,
      bits_saved: pattern.bits_saved,
      covered: pattern.covered,
      source: {
        relation_source: 'first_class_M',
        support: pattern.support,
        exceptions: pattern.exceptions,
        reliability: pattern.reliability,
      },
    })
  );
}
`;

insertBefore('\nfunction completeCurrent(', helpers);

replaceFunction('syncLearnedRelationalSchemas', String.raw`
function syncLearnedRelationalSchemas(state) {
  if (!state.knowledge) return;
  ensureRelationalGrowthState(state);
  state.knowledge.learned_rules = firstClassLearnedSchemas(state);
}`);

// Current cognition uses the actual current contact as its subject, so relations
// discovered/derived about that contact are not copied into a synthetic @current
// world before they can matter.
replaceFunction('unifiedCurrentCompletion', String.raw`
function unifiedCurrentCompletion(state, seedValues) {
  ensureRelationalGrowthState(state);
  syncLearnedRelationalSchemas(state);
  const subject = 'contact:' + state.experiences.length;
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

    const empiricalByTarget = new Map();
    for (const rule of state.knowledge.learned_rules || []) {
      if (rule.active === false) continue;
      const bindings = learnedRuleBindings(rule, values, subject);
      if (!bindings.length) continue;
      for (const binding of bindings) {
        const conclusion = learnedRuleConclusion(rule, binding);
        if (!conclusion || !same(conclusion.subject, subject)) continue;
        const key = String(conclusion.relation);
        if (!empiricalByTarget.has(key)) empiricalByTarget.set(key, []);
        empiricalByTarget.get(key).push({ rule, conclusion });
      }
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

// Initialize fresh minds directly in the first-class growth regime.
const initOld = "const knowledge = { facts: seed.facts, rules: seed.rules, learned_rules: [], episodes: [], current: null, experience_relations_through: 0 };";
const initNew = "const knowledge = { facts: seed.facts, rules: seed.rules, learned_rules: [], relational_patterns: [], relational_concepts: [], episodes: [], current: null, experience_relations_through: 0, next_relation_recompression_at: 0 };";
if (!source.includes(initOld)) throw new Error('unexpected knowledge initializer');
source = source.replace(initOld, initNew);

// Migrate/recompress old persistent M lazily, then refresh only at the same
// referent-relative cadence already used by the runtime. No fixed episode window.
const cNeedle = "  ensureExperienceRelations(state);\n  syncLearnedRelationalSchemas(state);";
if (!source.includes(cNeedle)) throw new Error('missing C relational initialization');
source = source.replace(cNeedle,
  "  ensureExperienceRelations(state);\n  ensureRelationalGrowthState(state);\n  if (state.experiences.length >= state.knowledge.next_relation_recompression_at) recompressFirstClassRelations(state);\n  syncLearnedRelationalSchemas(state);");

const storeNeedle = "      storeExperienceRelations(state, experience, index);\n      const sample = directSample(state, experience, index);";
if (!source.includes(storeNeedle)) throw new Error('missing experience store hook');
source = source.replace(storeNeedle,
  "      storeExperienceRelations(state, experience, index);\n      refreshRelationalKnowledge(state);\n      if (state.experiences.length >= state.knowledge.next_relation_recompression_at) recompressFirstClassRelations(state);\n      syncLearnedRelationalSchemas(state);\n      const sample = directSample(state, experience, index);");

fs.writeFileSync(file, source);
console.log('Applied first-class relational growth from lived M');
