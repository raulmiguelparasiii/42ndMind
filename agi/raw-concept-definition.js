'use strict';

// Zero-state bridge from grounded rule/surface contacts to a new relational rule.
// It owns no concept dictionary, parser, grammar state, truth store, or memory.
// Grounded schooling rules remain canonical M content. This helper only discovers
// a recurrent correspondence between their raw surface form and their relational
// rule anatomy, then instantiates that same anatomy for a later raw definition.

const Surface = require('./surface-template.js');
const SurfaceStructure = require('./surface-structure-grounding.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }
function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function isVariable(v) {
  return !!(v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && typeof v.var === 'string');
}
function isSurfaceConstant(v) { return ['string', 'number', 'boolean'].includes(typeof v); }
function normalizeSurfaceValue(v) { return String(v).toLowerCase(); }

function normalizedRuleShape(rule) {
  if (!rule || !Array.isArray(rule.premises) || !Array.isArray(rule.conclusion) || rule.conclusion.length !== 3) return null;
  const variables = new Map();
  let nextVariable = 1;
  function termShape(value, relationPosition) {
    if (relationPosition) return { relation: clone(value) };
    if (isVariable(value)) {
      if (!variables.has(value.var)) variables.set(value.var, `v${nextVariable++}`);
      return { variable: variables.get(value.var) };
    }
    return { surface_constant: true };
  }
  function tripleShape(triple) {
    if (!Array.isArray(triple) || triple.length !== 3) return null;
    return [termShape(triple[0], false), termShape(triple[1], true), termShape(triple[2], false)];
  }
  const premises = rule.premises.map(tripleShape);
  if (premises.some(x => !x)) return null;
  const conclusion = tripleShape(rule.conclusion);
  if (!conclusion) return null;
  return stable({ premises, conclusion, categorical: rule.categorical === true });
}

function surfaceFieldPaths(rule) {
  const paths = [];
  function inspect(prefix, triple) {
    if (!Array.isArray(triple) || triple.length !== 3) return;
    for (const at of [0, 2]) {
      const value = triple[at];
      if (!isVariable(value) && isSurfaceConstant(value)) paths.push([...prefix, at]);
    }
  }
  for (let i = 0; i < (rule.premises || []).length; i++) inspect(['premises', i], rule.premises[i]);
  inspect(['conclusion'], rule.conclusion);
  return paths;
}
function getAt(root, path) { let v = root; for (const key of path) v = v?.[key]; return v; }
function setAt(root, path, value) {
  let v = root;
  for (let i = 0; i + 1 < path.length; i++) v = v[path[i]];
  v[path.at(-1)] = value;
}
function coerceLike(raw, example) {
  if (typeof example === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  if (typeof example === 'boolean') {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  }
  return raw;
}

function recordGroundedRules(state, originalContact) {
  const rules = originalContact?.relations?.rules;
  if (!Array.isArray(rules) || !rules.length) return null;
  const episode = SurfaceStructure.latestSurfaceEpisode(state);
  if (!episode) return null;
  const facts = rules.map((rule, order) => [episode.id, 'ρ:contact_rule', {
    order,
    rule: clone(rule),
    source: 'simultaneous_relational_contact',
    authority: 'direct_contact',
  }]);
  return { relations: { facts } };
}

function groundedRuleRows(state) {
  const index = SurfaceStructure.surfaceStructureIndex(state);
  const rows = [];
  for (const fact of state.knowledge?.facts || []) {
    if (fact.relation !== 'ρ:contact_rule' || !fact.object?.rule) continue;
    const episode = index.episodes?.[String(fact.subject)];
    if (!episode || !Array.isArray(episode.input_tokens)) continue;
    const shape = normalizedRuleShape(fact.object.rule);
    if (!shape) continue;
    rows.push({
      episode: String(fact.subject),
      tokens: Surface.compactTokens(episode.input_tokens),
      rule: fact.object.rule,
      shape,
    });
  }
  return rows;
}

function slotIds(template) {
  return unique((template || [])
    .filter(part => Object.prototype.hasOwnProperty.call(part, 'variable_slot'))
    .map(part => part.variable_slot));
}

function learnSurfaceRuleFamily(rows) {
  if (rows.length < 4) return null;
  const template = Surface.buildTemplate(rows.map(row => row.tokens));
  if (!template) return null;
  const parsed = rows.map(row => Surface.matchTemplate(row.tokens, template));
  if (parsed.some(x => !x)) return null;
  const paths = surfaceFieldPaths(rows[0].rule);
  const slots = slotIds(template);
  if (!paths.length || !slots.length) return null;

  const mapping = new Map();
  for (const slot of slots) {
    const candidates = [];
    for (const path of paths) {
      const values = [];
      let valid = true;
      for (let i = 0; i < rows.length; i++) {
        const span = parsed[i].get(slot);
        const value = getAt(rows[i].rule, path);
        if (!span || !isSurfaceConstant(value) ||
            normalizeSurfaceValue(Surface.renderTokens(span)) !== normalizeSurfaceValue(value)) {
          valid = false;
          break;
        }
        values.push(value);
      }
      if (valid && unique(values).length >= 2) candidates.push(path);
    }
    if (candidates.length !== 1) return null;
    mapping.set(slot, candidates[0]);
  }
  const pathKeys = [...mapping.values()].map(stable);
  if (unique(pathKeys).length !== pathKeys.length) return null;
  return { template, mapping, rows };
}

function nextRuleId(state) {
  let max = 0;
  for (const rule of state.knowledge?.rules || []) {
    const m = /^surface-definition:(\d+)$/.exec(String(rule.id));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `surface-definition:${max + 1}`;
}

function inferRawDefinition(state) {
  const episode = SurfaceStructure.latestSurfaceEpisode(state);
  if (!episode || !Array.isArray(episode.input_tokens)) return null;
  const allRows = groundedRuleRows(state);
  const groups = new Map();
  for (const row of allRows) {
    if (!groups.has(row.shape)) groups.set(row.shape, []);
    groups.get(row.shape).push(row);
  }

  const currentTokens = Surface.compactTokens(episode.input_tokens);
  const candidates = [];
  for (const rows of groups.values()) {
    const learned = learnSurfaceRuleFamily(rows);
    if (!learned) continue;
    const match = Surface.matchTemplate(currentTokens, learned.template);
    if (!match) continue;

    const rule = clone(rows[0].rule);
    const attachments = [];
    for (const [slot, path] of learned.mapping) {
      if (!match.has(slot)) continue;
      const span = match.get(slot);
      const raw = Surface.renderTokens(span);
      const example = getAt(rule, path);
      const value = coerceLike(raw, example);
      setAt(rule, path, value);
      attachments.push({
        value,
        tokens: Surface.compactTokens(span),
        path: clone(path),
      });
    }
    rule.id = nextRuleId(state);
    rule.provenance = {
      kind: 'surface_definition_induction',
      source: 'recurrent_grounded_rule_surface',
      source_episodes: rows.map(row => row.episode),
      definition_episode: episode.id,
      authority: 'canonical_M_rule',
    };
    candidates.push({ rule, attachments });
  }

  const distinct = unique(candidates.map(candidate => ({
    premises: candidate.rule.premises,
    conclusion: candidate.rule.conclusion,
    categorical: candidate.rule.categorical === true,
  })));
  if (distinct.length !== 1 || candidates.length !== 1) return null;

  const chosen = candidates[0];
  const expressionFacts = [];
  const seen = new Set();
  for (const attachment of chosen.attachments) {
    if (!isSurfaceConstant(attachment.value) || !attachment.tokens.length) continue;
    const key = stable([attachment.value, attachment.tokens]);
    if (seen.has(key)) continue;
    seen.add(key);
    expressionFacts.push([attachment.value, 'ρ:surface_expression', {
      tokens: attachment.tokens,
      source_episode: episode.id,
      source_role: 'learned_rule_surface_constant',
      rule_path: attachment.path,
      source: 'raw_surface_rule_slot',
      exact_contact: true,
      semantic_authority: 'none',
    }]);
  }

  return { relations: {
    facts: [
      [episode.id, 'ρ:defines_rule', { ref: chosen.rule.id }],
      ...expressionFacts,
    ],
    rules: [chosen.rule],
  } };
}

function relationalUpdate(state, originalContact) {
  if (!originalContact || typeof originalContact !== 'object' || !originalContact.surface) return null;
  const recorded = recordGroundedRules(state, originalContact);
  if (recorded) return recorded;
  if (originalContact.relations || Array.isArray(originalContact.surface.channels)) return null;
  return inferRawDefinition(state);
}

module.exports = { relationalUpdate };
