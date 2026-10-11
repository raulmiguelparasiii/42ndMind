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
  source = source.slice(0, start) + replacement + source.slice(end);
}
function insertBefore(needle, text) {
  const at = source.indexOf(needle);
  if (at < 0) throw new Error(`missing insertion point ${needle}`);
  source = source.slice(0, at) + '\n' + text.trim() + '\n' + source.slice(at);
}

const helpers = String.raw`
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

  for (const symbol of structure?.symbols || []) {
    schemas.push(learnedSchema(S, symbol.definition || [], symbol.feature, true, {
      id: 'learned:symbol:forward:' + symbol.feature,
      kind: 'structural_definition',
      source: { handle: symbol.feature, depth: symbol.depth },
    }));
    for (let i = 0; i < (symbol.definition || []).length; i++) {
      const atom = symbol.definition[i];
      schemas.push(learnedSchema(S, [{ feature: symbol.feature, value: true }], atom.feature, atom.value, {
        id: 'learned:symbol:backward:' + symbol.feature + ':' + i,
        kind: 'structural_definition',
        source: { handle: symbol.feature, depth: symbol.depth },
      }));
    }
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
`;
insertBefore('\nfunction completeCurrent(', helpers);

const completeCurrent = String.raw`function completeCurrent(state, frame) {
  const present = presentFeatures(state, frame);
  const result = unifiedCurrentCompletion(state, present.values);
  return {
    observed: { ...present.values },
    completed: result.values,
    inferred: result.inferred,
    unresolved: result.unresolved,
  };
}`;
replaceFunction('completeCurrent', completeCurrent);

const groundedContinuation = String.raw`function groundedContinuation(state, frame) {
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
}`;
replaceFunction('groundedContinuation', groundedContinuation);

const initNeedle = "const knowledge = { facts: seed.facts, rules: seed.rules, episodes: [], current: null, experience_relations_through: 0 };";
if (source.includes(initNeedle)) {
  source = source.replace(initNeedle,
    "const knowledge = { facts: seed.facts, rules: seed.rules, learned_rules: [], episodes: [], current: null, experience_relations_through: 0 };");
}

const ensureNeedle = '  ensureExperienceRelations(state);';
if (!source.includes(ensureNeedle)) throw new Error('unified experience migration hook missing');
source = source.replace(ensureNeedle, ensureNeedle + '\n  syncLearnedRelationalSchemas(state);');

fs.writeFileSync(file, source);
console.log('Applied one first-class learned relational authority for current cognition');
