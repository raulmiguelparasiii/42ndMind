// ---------- first-class relational knowledge inside M ----------
// These operations are content-neutral. The Stone/OneLogic material below is
// initialization data placed in M; none of the generic matching/closure code
// branches on those names or meanings.

function cloneRelTerm(value) {
  return value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
}
function relVar(name) { return { var: String(name) }; }
function relRef(id) { return { ref: String(id) }; }
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
    categorical: raw.categorical !== false,
    exclusive_conclusion: raw.exclusive_conclusion === true,
    provenance: cloneRelTerm(raw.provenance ?? defaultProvenance),
    support: Number(raw.support || 0),
    exceptions: Number(raw.exceptions || 0),
    active: raw.active !== false,
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
  let bindings = [{}];
  for (const premise of premises) {
    const next = [];
    for (const binding of bindings) {
      for (const fact of facts) {
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

// A categorical schema is data in M. Direct relational contact can support it or
// supply an explicit incompatible conclusion. `exclusive_conclusion` belongs to
// the schema itself rather than being assumed for every relation in the world.
function refreshRelRule(rule, episodeFacts) {
  for (const binding of relPremiseBindings(rule.premises, episodeFacts)) {
    const expected = instantiateRelPattern(rule.conclusion, binding);
    if (!expected) continue;
    if (episodeFacts.some(fact => relFactKey(fact) === relFactKey(expected))) rule.support++;
    else if (rule.exclusive_conclusion && episodeFacts.some(fact =>
      same(fact.subject, expected.subject) && same(fact.relation, expected.relation) &&
      !same(fact.object, expected.object))) rule.exceptions++;
  }
  // "Categorical" means the relation itself claims no counter-instance. This is
  // generic schema semantics, not a OneLogic-specific branch.
  if (rule.categorical && rule.exceptions > 0) rule.active = false;
  return rule;
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
    facts.push(normalizeRelFact([ref, 'kind', 'relation_schema']));
    facts.push(normalizeRelFact([ref, 'active', rule.active !== false]));
    facts.push(normalizeRelFact([ref, 'provenance', rule.provenance]));
    facts.push(normalizeRelFact([ref, 'support', rule.support]));
    facts.push(normalizeRelFact([ref, 'exceptions', rule.exceptions]));
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
    facts.push(normalizeRelFact([ref, 'active', pattern.active !== false]));
    for (const atom of pattern.conditions) {
      facts.push(normalizeRelFact([ref, 'condition', {
        feature: atom.feature,
        value: cloneRelTerm(atom.value),
      }]));
    }
  }
  return facts;
}

// Foundational education. This is deliberately M-content, not C-logic. Claims
// are finite, inspectable, referencable, and correction-open like later taught
// relational knowledge. The formal theorem descriptions come from 42ndLogic.
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

    { id: 'onelogic:T1', subject: 'onelogic:T1', relation: 'claim', object: {
      operator: 'categorical_consequence', property: 'greatest_sound', condition: 'nonempty_live_set' } },
    { id: 'onelogic:T2', subject: 'onelogic:T2', relation: 'claim', object: {
      operator: 'sharp_update', property: 'unique_smallest_sound_posterior' } },
    { id: 'onelogic:T3', subject: 'onelogic:T3', relation: 'claim', object: {
      principle: 'reality_preservation', condition: 'actuality_live_and_transition_represented' } },
    { id: 'onelogic:T4', subject: 'onelogic:T4', relation: 'claim', object: {
      principle: 'sound_pooling', operation: 'intersection', preserves: 'actuality' } },
    { id: 'onelogic:T5', subject: 'onelogic:T5', relation: 'claim', object: {
      principle: 'contraction_cannot_restore_excluded_actuality' } },
    { id: 'onelogic:T6', subject: 'onelogic:T6', relation: 'claim', object: {
      principle: 'query_relative_representation', forbids: 'merging_query_distinguished_possibilities' } },
    { id: 'onelogic:T7', subject: 'onelogic:T7', relation: 'claim', object: {
      principle: 'model_class_failure_forces_expansion' } },
    { id: 'onelogic:T8', subject: 'onelogic:T8', relation: 'claim', object: {
      principle: 'objective_deviation', dimensions: ['unsupported_exclusion', 'unsupported_retention'] } },
    { id: 'onelogic:T9', subject: 'onelogic:T9', relation: 'claim', object: {
      principle: 'sound_categorical_rules_do_not_overreach' } },
    { id: 'onelogic:T10', subject: 'onelogic:T10', relation: 'claim', object: {
      principle: 'counterexample_defeats_categorical_bridge' } },
  ];
  const rules = [
    {
      id: 'seed:onelogic:T10',
      premises: [
        [V('bridge'), 'kind', 'categorical_bridge'],
        [V('bridge'), 'counterexample', V('case')],
      ],
      conclusion: [V('bridge'), 'status', 'defeated'],
      categorical: true,
      exclusive_conclusion: true,
      provenance: { system: 'OneLogic', theorem: 'T10', source: '42ndLogic/formal/THEOREMS.md' },
    },
    {
      id: 'seed:onelogic:undefined',
      premises: [[V('query'), 'status', 'undefined']],
      conclusion: [V('query'), 'assertion', 'withhold'],
      categorical: true,
      exclusive_conclusion: true,
      provenance: { system: 'OneLogic', principle: 'undefined_is_not_false' },
    },
    {
      id: 'seed:onelogic:T7',
      premises: [[V('model'), 'actuality_relation', 'outside_model_class']],
      conclusion: [V('model'), 'required_revision', 'expand_representation'],
      categorical: true,
      exclusive_conclusion: true,
      provenance: { system: 'OneLogic', theorem: 'T7', source: '42ndLogic/formal/THEOREMS.md' },
    },
    {
      id: 'seed:stone:maturity',
      premises: [
        [V('judgment'), 'horizontal_integration', 'full'],
        [V('judgment'), 'answerability', 'full'],
      ],
      conclusion: [V('judgment'), 'stone_state', 'maturity'],
      categorical: true,
      exclusive_conclusion: true,
      provenance: { system: 'Stone', principle: 'full_integration_under_full_answerability' },
    },
    {
      id: 'seed:stone:collapse',
      premises: [[V('judgment'), 'insulation', 'full']],
      conclusion: [V('judgment'), 'stone_state', 'collapse'],
      categorical: true,
      exclusive_conclusion: true,
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
  const knowledge = { facts: seed.facts, rules: seed.rules, episodes: [], current: null };
  knowledge.current = relationalClosure(
    [...knowledge.facts, ...relRuleDescriptorFacts(knowledge.rules)], knowledge.rules);
  return knowledge;
}
function refreshRelationalKnowledge(state) {
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
  const episodeFacts = rawFacts.map((raw, i) =>
    normalizeRelFact(raw, `contact:${episodeNumber}:fact:${i + 1}`));
  const incomingRules = rawRules.map((raw, i) =>
    normalizeRelRule(raw, `contact:${episodeNumber}:rule:${i + 1}`, 'contact'));

  const existingRuleIds = new Set(state.knowledge.rules.map(rule => rule.id));
  for (const rule of incomingRules) {
    if (existingRuleIds.has(rule.id)) throw new Error(`duplicate relational rule id: ${rule.id}`);
    state.knowledge.rules.push(rule);
    existingRuleIds.add(rule.id);
  }
  for (const rule of state.knowledge.rules) refreshRelRule(rule, episodeFacts);

  const existingFactKeys = new Set(state.knowledge.facts.map(relFactKey));
  for (const fact of episodeFacts) {
    const key = relFactKey(fact);
    if (existingFactKeys.has(key)) continue;
    state.knowledge.facts.push(fact);
    existingFactKeys.add(key);
  }
  state.knowledge.episodes.push({
    facts: episodeFacts.map(fact => ({ ...fact })),
    rules: incomingRules.map(rule => rule.id),
  });
  refreshRelationalKnowledge(state);
}
