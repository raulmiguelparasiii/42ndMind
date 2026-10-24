'use strict';

// Zero-state surface bridge after the canonical raw surface learner runs.
// Exact proposal endpoint expressions remain ordinary M facts. Separately, a raw
// construction may align with a uniquely known current M fact across diverse
// examples; that structure may later propose a new binding through the same
// surface_induction route anatomy. Neither path owns truth, grammar state, memory,
// or a semantic dictionary.

const Surface = require('./surface-template.js');
const SurfaceStructure = require('./surface-structure-grounding.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }
function episodeNumber(id) {
  const n = Number(String(id).split(':').at(-1));
  return Number.isFinite(n) ? n : -1;
}

function latestSurfaceEpisode(state) {
  let best = null;
  for (const fact of state.knowledge?.facts || []) {
    if (fact.relation !== 'ρ:input_tokens' || !Array.isArray(fact.object) ||
        typeof fact.subject !== 'string' || !fact.subject.startsWith('sequence-contact:')) continue;
    if (!best || episodeNumber(fact.subject) > episodeNumber(best.id))
      best = { id: fact.subject, tokens: fact.object.slice() };
  }
  return best;
}

function exactSpan(tokens, value) {
  if (!Array.isArray(tokens) || !['string', 'number', 'boolean'].includes(typeof value)) return undefined;
  const compact = Surface.compactTokens(tokens);
  const target = String(value);
  const hits = [];
  for (let start = 0; start < compact.length; start++) {
    for (let end = start + 1; end <= compact.length; end++) {
      const span = compact.slice(start, end);
      if (Surface.renderTokens(span) === target) hits.push(span);
    }
  }
  const variants = unique(hits);
  return variants.length === 1 ? variants[0] : undefined;
}

function relationalUpdate(state) {
  const structural = SurfaceStructure.relationalUpdate(state);
  const episode = latestSurfaceEpisode(state);
  const facts = [...(structural?.relations?.facts || [])];
  const rules = [...(structural?.relations?.rules || [])];
  if (!episode) return facts.length || rules.length ? { relations: { facts, rules } } : null;

  const proposals = (state.knowledge?.facts || []).filter(f =>
    f.subject === episode.id && f.relation === 'ρ:proposes_relation' && f.object && typeof f.object === 'object' &&
    Object.prototype.hasOwnProperty.call(f.object, 'subject') &&
    Object.prototype.hasOwnProperty.call(f.object, 'relation') &&
    Object.prototype.hasOwnProperty.call(f.object, 'object'));
  const existing = state.knowledge?.facts || [];
  for (const proposal of proposals) {
    for (const [role, value] of [['subject', proposal.object.subject], ['object', proposal.object.object]]) {
      const tokens = exactSpan(episode.tokens, value);
      if (!tokens) continue;
      const attachment = {
        tokens,
        source_episode: episode.id,
        source_role: role,
        source: 'raw_surface_proposal_endpoint',
        exact_contact: true,
        semantic_authority: 'none',
      };
      const already = existing.some(f => same(f.subject, value) && f.relation === 'ρ:surface_expression' &&
        f.object?.source_episode === episode.id && same(f.object?.tokens, tokens));
      if (!already) facts.push([value, 'ρ:surface_expression', attachment]);
    }
  }
  if (!facts.length && !rules.length) return null;
  return { relations: { facts, ...(rules.length ? { rules } : {}) } };
}

module.exports = { relationalUpdate };
