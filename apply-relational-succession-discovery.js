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
function relationSearchFeature(side, relation) {
  return side + '|' + stable(relation);
}
function relationFromSearchFeature(feature) {
  const cut = feature.indexOf('|');
  if (cut < 0) return undefined;
  return JSON.parse(feature.slice(cut + 1));
}

// Build a search index from M's actual first-class succession graph. The
// temporary now| / then| names never enter M and never become cognitive terms;
// a winning description is compiled back into ordinary relational premises.
function successionSearchIndex(state) {
  const facts = state.knowledge?.facts || [];
  const subjectKeys = new Set(facts.map(f => stable(f.subject)));
  const bySubject = new Map();
  for (const fact of facts) {
    const key = stable(fact.subject);
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key).push(fact);
  }

  const predecessors = new Map();
  const chainSubjects = new Map();
  for (const fact of facts) {
    if (!same(fact.relation, 'next')) continue;
    const a = stable(fact.subject), b = stable(fact.object);
    if (!subjectKeys.has(b)) continue;
    chainSubjects.set(a, fact.subject);
    chainSubjects.set(b, fact.object);
    if (!predecessors.has(b)) predecessors.set(b, []);
    const list = predecessors.get(b);
    if (!list.some(x => same(x, fact.subject))) list.push(fact.subject);
  }

  function literalValues(subject) {
    const rows = new Map();
    for (const fact of bySubject.get(stable(subject)) || []) {
      if (same(fact.relation, 'next')) continue;
      if (subjectKeys.has(stable(fact.object))) continue;
      const key = stable(fact.relation);
      if (!rows.has(key)) rows.set(key, []);
      const values = rows.get(key);
      if (!values.some(v => same(v, fact.object))) values.push(fact.object);
    }
    const out = [];
    for (const [relationKey, values] of rows) {
      if (values.length !== 1) continue;
      out.push({ relation: JSON.parse(relationKey), value: cloneRelTerm(values[0]) });
    }
    return out;
  }

  function predecessor(subject) {
    const list = predecessors.get(stable(subject)) || [];
    return list.length === 1 ? list[0] : null;
  }

  function rowsAtDepth(depth) {
    const rows = [];
    for (const current of chainSubjects.values()) {
      let earlier = current;
      let ok = true;
      for (let i = 0; i < depth; i++) {
        earlier = predecessor(earlier);
        if (earlier === null) { ok = false; break; }
      }
      if (!ok) continue;
      const values = {};
      for (const atom of literalValues(current)) values[relationSearchFeature('now', atom.relation)] = atom.value;
      for (const atom of literalValues(earlier)) values[relationSearchFeature('then', atom.relation)] = atom.value;
      if (Object.keys(values).length >= 2) rows.push({ id: 'succession:' + depth + ':' + stable(current), values });
    }
    return rows;
  }

  return { rowsAtDepth, chain_size: chainSubjects.size };
}

function successionPatternRule(pattern, depth) {
  const current = relVar('succession_current');
  const earlier = relVar('succession_' + depth);
  const nodes = [current];
  for (let i = 1; i <= depth; i++) nodes.push(i === depth ? earlier : relVar('succession_' + i));
  const premises = [];
  for (let i = depth; i > 0; i--) premises.push(normalizeRelPattern([nodes[i], 'next', nodes[i - 1]]));

  for (const atom of pattern.conditions) {
    const cut = atom.feature.indexOf('|');
    const side = atom.feature.slice(0, cut);
    const relation = relationFromSearchFeature(atom.feature);
    premises.push(normalizeRelPattern([side === 'then' ? earlier : current, relation, cloneRelTerm(atom.value)]));
  }
  const targetRelation = relationFromSearchFeature(pattern.target);
  const temporalCost = Math.log2(depth + 1);
  const bitsSaved = pattern.bits_saved - temporalCost;
  if (!(bitsSaved > 0)) return null;
  const authority = pattern.predictive_code_bits + temporalCost / Math.max(1, pattern.eligible);
  return {
    id: 'learned:succession:' + depth + ':' + stable([pattern.conditions, targetRelation, pattern.expected]),
    premises,
    conclusion: normalizeRelPattern([current, targetRelation, cloneRelTerm(pattern.expected)]),
    kind: 'succession_relation',
    active: true,
    authority,
    bits_saved: bitsSaved,
    covered: pattern.covered,
    anchor_var: 'succession_current',
    source: {
      depth,
      support: pattern.support,
      exceptions: pattern.exceptions,
      reliability: pattern.reliability,
    },
  };
}

function discoverSuccessionRelationalSchemas(state) {
  const n = state.experiences.length;
  if (n < 4) return [];
  const index = successionSearchIndex(state);
  const found = [];
  for (let depth = 1; depth < index.chain_size; depth++) {
    const rows = index.rowsAtDepth(depth);
    if (rows.length < 4) break;
    const patterns = learnPatterns(rows, [], 2);
    for (const pattern of patterns) {
      if (!pattern.target.startsWith('now|')) continue;
      if (!pattern.conditions.some(atom => atom.feature.startsWith('then|'))) continue;
      const rule = successionPatternRule(pattern, depth);
      if (rule) found.push(rule);
    }
  }

  // Same conclusion-relative finite retention used by the empirical learner.
  const groups = new Map();
  for (const rule of found) {
    const key = stable([rule.conclusion.relation, rule.conclusion.object]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rule);
  }
  const perConclusion = Math.max(8, Math.ceil(Math.sqrt(Math.max(1, n))));
  const kept = [];
  for (const group of groups.values()) {
    group.sort((a, b) =>
      a.authority - b.authority ||
      b.bits_saved - a.bits_saved ||
      b.covered - a.covered ||
      (a.source?.depth || 0) - (b.source?.depth || 0) ||
      a.id.localeCompare(b.id)
    );
    kept.push(...group.slice(0, perConclusion));
  }
  return kept;
}

function refreshSuccessionRelationalSchemas(state) {
  if (!state.knowledge) return;
  if (!Array.isArray(state.knowledge.succession_rules)) state.knowledge.succession_rules = [];
  const n = state.experiences.length;
  const through = Number(state.knowledge.succession_discovery_through || 0);
  const nextAt = Number(state.knowledge.next_succession_discovery_at || 4);
  if (n >= 4 && (through === 0 || n >= nextAt)) {
    state.knowledge.succession_rules = discoverSuccessionRelationalSchemas(state);
    state.knowledge.succession_discovery_through = n;
    state.knowledge.next_succession_discovery_at = nextRecompressionAt(n);
  }
}

function relPremiseBindingsSeeded(premises, facts, seed) {
  const byRelation = new Map();
  for (const fact of facts) {
    const key = stable(fact.relation);
    if (!byRelation.has(key)) byRelation.set(key, []);
    byRelation.get(key).push(fact);
  }
  let bindings = [{ ...seed }];
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
`;
insertBefore('\nfunction syncLearnedRelationalSchemas(', helpers);

const sync = String.raw`function syncLearnedRelationalSchemas(state) {
  if (!state.knowledge) return;
  refreshSuccessionRelationalSchemas(state);
  state.knowledge.learned_rules = [
    ...compileLearnedRelationalSchemas(state.structure),
    ...(state.knowledge.succession_rules || []),
  ];
}`;
replaceFunction('syncLearnedRelationalSchemas', sync);

const unified = String.raw`function unifiedCurrentCompletion(state, seedValues) {
  syncLearnedRelationalSchemas(state);
  // The current percept is the newest contact in the same lived graph, not a
  // detached query subject. On the first contact the transient facts establish
  // that subject; on later contacts it is already the after-node of the latest
  // exact experience.
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

    const structural = [];
    const empiricalByTarget = new Map();
    for (const rule of state.knowledge.learned_rules || []) {
      if (rule.active === false) continue;
      const bindings = rule.kind === 'succession_relation'
        ? relPremiseBindingsSeeded(rule.premises, base, { [rule.anchor_var]: subject })
        : learnedRuleBindings(rule, values, subject);
      if (!bindings.length) continue;
      for (const binding of bindings) {
        const conclusion = learnedRuleConclusion(rule, binding);
        if (!conclusion || !same(conclusion.subject, subject)) continue;
        if (rule.kind === 'structural_definition') structural.push({ rule, conclusion });
        else {
          const key = stable(conclusion.relation);
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

    for (const candidates of empiricalByTarget.values()) {
      if (!candidates.length) continue;
      const relation = candidates[0].conclusion.relation;
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
}`;
replaceFunction('unifiedCurrentCompletion', unified);

fs.writeFileSync(file, source);
console.log('Applied first-class succession discovery over relational M');
