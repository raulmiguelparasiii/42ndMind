'use strict';

// Zero-state expression attachment for endpoints already proposed by the existing
// raw surface learner. This helper does not infer a relation or warrant a claim.
// It only preserves that the exact subject/object span used by an M-owned proposal
// physically occurred in the same surface episode, so later expression can reuse
// that observed surface form. All durable attachments remain ordinary M facts.

const Surface = require('./surface-template.js');

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
  const episode = latestSurfaceEpisode(state);
  if (!episode) return null;
  const proposals = (state.knowledge?.facts || []).filter(f =>
    f.subject === episode.id && f.relation === 'ρ:proposes_relation' && f.object && typeof f.object === 'object' &&
    Object.prototype.hasOwnProperty.call(f.object, 'subject') &&
    Object.prototype.hasOwnProperty.call(f.object, 'relation') &&
    Object.prototype.hasOwnProperty.call(f.object, 'object'));
  if (!proposals.length) return null;

  const existing = state.knowledge?.facts || [];
  const facts = [];
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
  return facts.length ? { relations: { facts } } : null;
}

module.exports = { relationalUpdate };
